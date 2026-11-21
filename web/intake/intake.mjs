import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {validate,addCalculatedScope} from '../lib/lead-input.mjs';
import {InputError,maxLeadBodyBytes} from '../lib/inputs.mjs';
import {parseFileRequest,maxMultipartBytes} from '../lib/file-input.mjs';
import {mailAttachment} from '../lib/attachments.mjs';
import {renderLeadMail} from '../lib/lead-mail.mjs';

const trusted=new Set(['https://frankenpakt.vercel.app','https://frankenpakt.de','https://www.frankenpakt.de']);
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers});
const digest=v=>createHash('sha256').update(v).digest('hex');
async function bytes(req,limit) {
  if(Number(req.headers.get('Content-Length'))>limit)throw new InputError('Anfrage zu groß.',413);
  const reader=req.body?.getReader();if(!reader)throw new InputError('Anfrage fehlt.');
  const parts=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;if((size+=value.length)>limit){await reader.cancel();throw new InputError('Anfrage zu groß.',413);}parts.push(value);}
  return Buffer.concat(parts,size);
}
export function createCloudIntake(env,fetcher=fetch){
  const base=env.SUPABASE_URL;
  const key=env.SUPABASE_SERVICE_ROLE_KEY || JSON.parse(env.SUPABASE_SECRET_KEYS||'{}').default;
  async function db(path,body) {
    const h={apikey:key,'Content-Type':'application/json'};if(key.startsWith('eyJ'))h.Authorization='Bearer '+key;
    const res=await fetcher(base+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    if(!res.ok){
      const error=await res.json().catch(()=>({}));
      if(error.code==='PT409'||error.code==='40001')throw new InputError('Anfrage geändert. Bitte erneut senden.',409);
      if(error.code==='22023')throw new InputError('Auftragsdaten prüfen.');
      throw new InputError('Auftragssystem vorübergehend nicht erreichbar.',503);
    }
    const s=await res.text();return s?JSON.parse(s):null;
  }
  const rpc=(name,body={})=>db('rpc/fp_intake_'+name,body);
  async function verifyEditor(req) {
    const token=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-fp-office='))?.slice('__Host-fp-office='.length);
    if(!/^[0-9a-f]{64}$/.test(token||''))return false;
    const rows=await db('fp_office_sessions?select=role&role=eq.editor&digest=eq.'+digest(token)+'&expires=gt.'+encodeURIComponent(new Date().toISOString()));
    return rows.length===1;
  }
  async function prepareMail(ref){
    const rec=await rpc('case',{p_ref:ref});
    if(!rec)throw new InputError('Anfrage unbekannt.',404);
    const {subject,text,html}=renderLeadMail({ref,created:rec.created,service:rec.lead.service,person:rec.lead,attachments:rec.attachments});
    const docs=[];
    for(const meta of rec.attachments){
      const f=await rpc('file',{p_ref:ref,p_id:meta.id});
      docs.push(mailAttachment({name:f.name,mime:f.mime,content:Buffer.from(f.content_base64,'base64')}));
    }
    return {from:'FrankenPackt <anfragen@mail.frankenpakt.de>',to:['info@frankenpakt.de'],subject,text,html,...(docs.length?{attachments:docs}:{})};
  }
  async function mail(){
    const token=await rpc('mail_key');if(!token)return;
    for(let i=0;i<4;i++){
      const job=await rpc('claim');if(!job)return;
      try{
        let payload=await rpc('payload',{p_ref:job.ref,p_attempt:job.attempt,p_payload:null});
        if(!payload){
          payload=await rpc('payload',{p_ref:job.ref,p_attempt:job.attempt,p_payload:await prepareMail(job.ref)});
          if(!payload)return;
        }
        const result=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{
          Authorization:'Bearer '+token,'Content-Type':'application/json','Idempotency-Key':'fp-intake-'+job.ref
        },body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
        const sent=result.ok&&typeof (await result.json().catch(()=>({}))).id==='string';
        await rpc('set_mail',{p_ref:job.ref,p_attempt:job.attempt,p_sent:sent,p_definite:[400,401,403,422,429].includes(result.status)});
        if(!sent)return;
      }catch{await rpc('set_mail',{p_ref:job.ref,p_attempt:job.attempt,p_sent:false,p_definite:false});return;}
    }
  }
  return async req=>{
    try{
      const route=new URL(req.url).pathname.split('/').filter(Boolean).pop();
      if(req.method==='GET'&&route==='config'){
        const live=await rpc('live');
        return response(200,live?{mode:'live',leadIntake:true,phone:'+4917620126149',phoneDisplay:'+49 176 20126149',email:'info@frankenpakt.de',whatsapp:'',contactMetrics:false}:{mode:'preview',leadIntake:false});
      }
      if(req.method==='POST'&&route==='flush'){
        const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
        if(!/^[0-9a-f]{64}$/.test(token)||!await rpc('worker_valid',{p_token:token}))throw new InputError('Kein Zugriff.',403);
        await mail();return response(200,{ok:true});
      }
      if(req.method!=='POST'||!['leads','pruefung'].includes(route))return response(404,{ok:false});
      if(!trusted.has(req.headers.get('Origin')))throw new InputError('Unbekannte Herkunft.',403);
      const test=route==='pruefung';
      if(test?!await verifyEditor(req):!await rpc('live'))throw new InputError('Anfrage nicht verfügbar.',test?403:503);
      const peer=(req.headers.get('x-forwarded-for')||'shared').split(',')[0].trim().slice(0,64);
      const bucket='intake:'+digest(key+'|'+new Date().toISOString().slice(0,10)+'|'+peer);
      if(!await db('rpc/fp_office_gate',{p_key:bucket,p_max:24}))throw new InputError('Bitte in zehn Minuten erneut versuchen.',429);
      const type=req.headers.get('Content-Type')||'';
      let fields,files=[];
      if(/^multipart\/form-data\s*;/i.test(type))({fields,files}=await parseFileRequest(await bytes(req,maxMultipartBytes),type));
      else if(/^application\/json(?:\s*;|$)/i.test(type)){
        const body=await bytes(req,maxLeadBodyBytes);
        try{fields=JSON.parse(body.toString('utf8'));}catch{throw new InputError('Ungültige Anfrage.');}
      }else throw new InputError('Unbekanntes Anfrageformat.',415);
      const lead=validate(fields);
      if(lead.service!=='rueckruf'&&!lead.jobScope)throw new InputError('Bitte die Auftragsdetails vervollständigen.');
      if(test&&(lead.name!=='FrankenPackt Systemtest'||lead.contact!=='test@example.invalid'))throw new InputError('Nur freigegebene Testdaten.');
      const fingerprint=digest(JSON.stringify([lead,files.map(f=>[f.name,f.mime,f.digest])]));
      addCalculatedScope(lead,lead.service);
      const result=await rpc('submit',{p_id:lead.requestId,p_fingerprint:fingerprint,p_lead:lead,
        p_files:files.map(f=>({name:f.name,mime:f.mime,content:f.content.toString('base64')})),p_test:test});
      if(test){
        const msg=await prepareMail(result.reference);
        return response(result.created?201:200,{ok:true,mode:'test',reference:result.reference,
          files:(msg.attachments||[]).map(a=>({name:a.filename,bytes:Buffer.from(a.content,'base64').length})),mailPrepared:true});
      }
      if(result.created&&globalThis.EdgeRuntime?.waitUntil)EdgeRuntime.waitUntil(mail().catch(()=>{}));
      return response(result.created?201:200,{ok:true,mode:test?'test':'live',reference:result.reference});
    }catch(error){return response(error instanceof InputError?error.status:503,{ok:false,message:error instanceof InputError?error.message:'Anfrage derzeit nicht möglich.'});}
  };
}
