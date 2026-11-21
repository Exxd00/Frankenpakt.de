const VIEWER='frankenpakt.de@gmail.com', EDITOR='ixamarketing.de@gmail.com';
const origins=new Set(['https://frankenpakt.vercel.app','https://frankenpakt.de','https://www.frankenpakt.de']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex=buffer=>Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
const encode=t=>new TextEncoder().encode(t);
const hash=async t=>hex(await crypto.subtle.digest('SHA-256',encode(t)));
function reject(status,message){throw Object.assign(new Error(message),{status});}
function text(value,limit,label){
  if(typeof value!=='string'||!value.trim()||value.trim().length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))reject(400,label+' bitte prüfen.');
  return value.trim();
}
function cookie(value,seconds){return '__Host-fp-office='+value+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+seconds;}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
const reply=(body,status=200,more={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...more}});
const priceSelect='id,label,scope,unit,cents,revision';
async function verifyPass(pass,salt,verifier){
  if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{64}$/.test(verifier))return false;
  const key=await crypto.subtle.importKey('raw',encode(pass),'PBKDF2',false,['deriveBits']);
  const saltBytes=Uint8Array.from(salt.match(/../g),p=>parseInt(p,16));
  const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,hash:'SHA-256',iterations:310000},key,256));
  let mismatch=0;for(let i=0;i<actual.length;i++) mismatch|=actual.charCodeAt(i)^verifier.charCodeAt(i);
  return mismatch===0;
}
export function createOfficeHandler(env,fetcher=fetch){
  const base=env.SUPABASE_URL,secret=env.SUPABASE_SERVICE_ROLE_KEY;
  async function db(resource,method='GET',body,headers={}){
    const r=await fetcher(base+'/rest/v1/'+resource,{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',...headers},
      body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(9000)});
    if(!r.ok){let code;try{code=(await r.json()).code;}catch{}if(code==='40001')reject(409,'Daten wurden geändert. Bitte neu laden.');if(code==='22023')reject(400,'Angebotspositionen prüfen.');reject(503,'Auftragsspeicher vorübergehend nicht erreichbar.');}
    return (await r.text().then(t=>t?JSON.parse(t):null));
  }
  async function gated(action,ip,limit){
    const key=action+':'+await hash(ip);
    if(!await db('rpc/fp_office_gate','POST',{p_key:key,p_max:limit}))reject(429,'Zu viele Versuche. Bitte in zehn Minuten erneut versuchen.');
  }
  async function session(role){
    const token=hex(crypto.getRandomValues(new Uint8Array(32)));
    await db('fp_office_sessions','POST',{role,digest:await hash(token),expires:new Date(Date.now()+4*3600000).toISOString()});
    return reply({role},200,{'Set-Cookie':cookie(token,4*3600)});
  }
  async function api(req){
    const url=new URL(req.url);
    const route=url.pathname.split('/').filter(Boolean).slice(1+url.pathname.split('/').filter(Boolean).indexOf('frankenpakt-office')).join('/');
    const write=req.method==='POST';
    if(!write&&req.method!=='GET')reject(405,'Methode nicht unterstützt.');
    if(write&&!origins.has(req.headers.get('Origin')))reject(403,'Unbekannte Herkunft.');
    let body={};
    if(write){
      if(!req.headers.get('content-type')?.startsWith('application/json'))reject(415,'JSON erwartet.');
      if(Number(req.headers.get('Content-Length'))>18000)reject(413,'Eingabe zu lang.');
      const reader=req.body?.getReader();const data=[];let size=0;
      if(reader){for(;;){const {done,value}=await reader.read();if(done)break;if((size+=value.length)>18000){await reader.cancel();reject(413,'Eingabe zu lang.');}data.push(value);}}
      try{body=JSON.parse(await new Blob(data).text());}catch{reject(400,'Ungültige Eingabe.');}
      if(!body||typeof body!=='object'||Array.isArray(body))reject(400,'Ungültige Eingabe.');
    }
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'edge';
    if(route==='viewer'&&write){
      await gated('viewer',ip,12);await gated('viewer-global','all',150);
      const [{salt,verifier}={}]=await db('fp_office_settings?select=salt,verifier&singleton=eq.true');
      if(!verifier)reject(503,'Der Lesezugang wird eingerichtet.');
      if(!await verifyPass(text(body.password,256,'Passwort'),salt,verifier))reject(401,'Anmeldung nicht möglich.');
      return session('viewer');
    }
    if(route==='editor-start'&&write){
      await gated('otp',ip,3);await gated('otp-global','all',5);
      const target=req.headers.get('Origin')+'/admin/';
      const r=await fetcher(base+'/auth/v1/otp?redirect_to='+encodeURIComponent(target),{method:'POST',
        headers:{apikey:secret,'Content-Type':'application/json'},body:JSON.stringify({email:EDITOR,create_user:true}),signal:AbortSignal.timeout(9000)});
      if(!r.ok)reject(r.status===429?429:503,'IXA-Anmeldemail konnte nicht zugestellt werden. Bitte den Mailversand prüfen.');
      return reply({ok:true});
    }
    if(route==='editor-verify'&&write){
      await gated('otp-verify',ip,10);
      let token=body.accessToken;
      if(!token){
        const code=text(body.code,1700,'Anmeldecode');
        let payload;
        if(/^\d{6,10}$/.test(code))payload={email:EDITOR,token:code,type:'email'};
        else{
          let link;try{link=new URL(code);}catch{reject(400,'Code oder ursprünglichen Link aus der IXA-Mail eingeben.');}
          const tokenHash=link.searchParams.get('token')||link.searchParams.get('token_hash');
          if(link.origin!==base||link.pathname!=='/auth/v1/verify'||!tokenHash||!/^[-\w.]+$/.test(tokenHash))reject(400,'Link der IXA-Anmeldemail prüfen.');
          payload={token_hash:tokenHash,type:'email'};
        }
        const v=await fetcher(base+'/auth/v1/verify',{method:'POST',headers:{apikey:secret,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)});
        if(!v.ok)reject(401,'Anmeldelink abgelaufen oder ungültig.');
        token=(await v.json()).access_token;
      }
      if(typeof token!=='string'||token.length>8000||!/^[-\w.]+$/.test(token))reject(401,'Anmeldung nicht möglich.');
      const r=await fetcher(base+'/auth/v1/user',{headers:{apikey:secret,Authorization:'Bearer '+token},signal:AbortSignal.timeout(9000)});
      if(!r.ok)reject(401,'Anmeldung nicht möglich.');
      const user=await r.json();if(user.email?.toLowerCase()!==EDITOR||!user.email_confirmed_at)reject(403,'IXA-Zugang erforderlich.');
      return session('editor');
    }
    const cookieToken=(req.headers.get('Cookie')||'').split(';').map(p=>p.trim()).find(p=>p.startsWith('__Host-fp-office='))?.slice('__Host-fp-office='.length);
    let digest,auth;
    if(/^[a-f0-9]{64}$/.test(cookieToken||'')){digest=await hash(cookieToken);
      [auth]=await db('fp_office_sessions?select=role&digest=eq.'+digest+'&expires=gt.'+encodeURIComponent(new Date().toISOString()));}
    if(!auth)reject(401,'Bitte anmelden.');
    if(route==='logout'&&write){await db('fp_office_sessions?digest=eq.'+digest,'DELETE');return reply({ok:true},200,{'Set-Cookie':cookie('',0)});}
    if(route==='state'&&!write){
      const rates=await db('fp_office_rates?select='+priceSelect+'&order=changed.asc,id.asc');
      return reply({role:auth.role,email:auth.role==='editor'?EDITOR:VIEWER,rates});
    }
    if(auth.role!=='editor')reject(403,'Nur IXA kann Vorgänge und Preise bearbeiten.');
    if(route==='rate'&&write){
      const label=text(body.label,120,'Bezeichnung'),unit=text(body.unit,35,'Einheit'),scope=text(body.scope,500,'Umfang');
      if(!Number.isSafeInteger(body.cents)||body.cents<1||body.cents>100000000)reject(400,'Bruttopreis prüfen.');
      const fields={label,unit,scope,cents:body.cents,changed:new Date().toISOString()};
      if(!body.id){await db('fp_office_rates','POST',{...fields,id:crypto.randomUUID()});}
      else {
        if(!/^[\w-]{1,45}$/.test(body.id)||!Number.isSafeInteger(body.revision)||body.revision<1)reject(400,'Preisstand prüfen.');
        const rows=await db('fp_office_rates?id=eq.'+body.id+'&revision=eq.'+body.revision,'PATCH',{...fields,revision:body.revision+1},{Prefer:'return=representation'});
        if(!rows.length)reject(409,'Preis inzwischen geändert. Bitte neu laden.');
      }
      return reply({ok:true});
    }
    if(route==='quote'&&write){
      if(!uuid.test(body.id)||!Array.isArray(body.items)||!body.items.length||body.items.length>25)reject(400,'Angebotspositionen prüfen.');
      const items=body.items.map(i=>{
        if(!/^[\w-]{1,45}$/.test(i?.id)||!Number.isSafeInteger(i.revision)||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>999)reject(400,'Position prüfen.');
        return {id:i.id,revision:i.revision,quantity:i.quantity};
      });
      const result=await db('rpc/fp_office_quote_v2','POST',{p_issuer:text(body.issuer,400,'Anbieter'),p_id:body.id,p_customer:text(body.customer,160,'Empfänger'),p_scope:text(body.scope,1200,'Leistung'),p_items:items});
      return reply(Array.isArray(result)?result[0]:result);
    }
    if(route==='quotes'&&!write)return reply(await db('fp_office_quotes?select=id,created,customer,total_cents&order=created.desc&limit=50'));
    if(!write&&route.startsWith('quote/')&&uuid.test(route.slice(6))){
      const [quote]=await db('fp_office_quotes?select=*&id=eq.'+route.slice(6));
      if(!quote)reject(404,'Angebot nicht gefunden.');return reply(quote);
    }
    const match=/^files\/(AN-[0-9A-F]{16})\/([1-9][0-9]{0,9})$/.exec(route);
    if(!write&&match){
      const target=env.FRANKENPACKT_INTAKE_ORIGIN,token=env.OPS_OFFICE_FILE_TOKEN;
      if(!target||!token||token.length<32)reject(503,'Der private Dateispeicher ist noch nicht verbunden.');
      const r=await fetcher(new URL('/api/office-file/'+match[1]+'/'+match[2],target),{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!r.ok)reject(r.status===404?404:503,'Datei konnte nicht abgerufen werden.');
      return new Response(r.body,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':r.headers.get('Content-Disposition')||'attachment','Content-Security-Policy':"default-src 'none'; sandbox"}});
    }
    reject(404,'Unbekannter Pfad.');
  }
  return async req=>{try{return await api(req);}catch(e){return reply({error:e.status?e.message:'Anfrage derzeit nicht möglich.'},e.status||503);}};
}
