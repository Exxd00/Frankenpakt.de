import {cleanAttribution} from '../../../web/public/assets/campaign-attribution.js';
import {businessWhatsApp,phoneLines} from '../../../web/public/assets/phone-lines.js';

const origins = new Set(['https://frankenpakt.vercel.app','https://frankenpakt.de','https://www.frankenpakt.de']);
const clientEvents = new Set(['service_chosen','estimate_viewed','upload_ready','contact_intent','whatsapp_visit']);
const internalEvents = new Set(['inquiry_received','callback_requested','integration_test']);
const services = new Set(['entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf','unbekannt']);
const sources = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige','unbekannt','whatsapp']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const encoder = new TextEncoder();
async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
}
async function rpc(name: string, args: Record<string,unknown>) {
  const headers:Record<string,string> = {'Content-Type':'application/json',apikey:key};
  if(key.startsWith('eyJ')) headers.Authorization='Bearer '+key;
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw Error('Metrics store unavailable');
  return response.json();
}
async function payload(req:Request) {
  const reader=req.body?.getReader();if(!reader)return null;
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>1536){await reader.cancel();return null;}chunks.push(item.value);}
  const bytes=new Uint8Array(size);let pos=0;for(const part of chunks){bytes.set(part,pos);pos+=part.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{return null;}
}
Deno.serve(async req=>{
  const endpoint=new URL(req.url), origin=req.headers.get('Origin')||'';
  const headers:Record<string,string>={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origins.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'});
  const result=(code:number,data:string|null=null)=>new Response(data,{status:code,headers});
  try{
    if (endpoint.pathname === '/office-events/handoff' || endpoint.pathname === '/functions/v1/office-events/handoff') {
      if (req.method !== 'POST') return result(405);
      if (!origins.has(origin) || req.headers.get('Sec-Fetch-Site') === 'cross-site') return result(403);
      if (endpoint.search) return result(400);
      if (req.headers.get('Content-Type')?.split(';',1)[0].trim().toLowerCase() !== 'text/plain') return result(415);
      const action = await payload(req);
      if (!action || typeof action !== 'object' || Array.isArray(action) || Object.keys(action).length !== 1 ||
          !['phone','whatsapp'].includes(action.channel)) return result(400);
      // This shared per-channel minute limit is independent of the visitor and device.
      const status = await rpc('fp_record_event_detail',{
        eid:crypto.randomUUID(),kind:'contact_intent',category:'unbekannt',channel:'unbekannt',
        rate_bucket:await hash('frankenpakt/handoff/'+action.channel),access_digest:null,
        attribution:null,contact_method:action.channel
      });
      if (status !== 'ok') return result(status === 'limited' ? 429 : 403);
      const destinations = action.channel === 'phone'
        ? [phoneLines.main,phoneLines.google,phoneLines.kleinanzeigen].map(line=>'tel:'+line.phone)
        : ['https://wa.me/'+businessWhatsApp.slice(1)];
      headers['Content-Type']='application/json; charset=utf-8';
      return result(200,JSON.stringify({destinations}));
    }
    if(req.method==='OPTIONS')return result(origins.has(origin)?204:403);
    if(req.method==='GET'){
      const read=endpoint.searchParams.get('key')||'';if(!/^[a-f0-9]{64}$/.test(read))return result(403);
      const csv=await rpc('fp_sheet_events',{access_digest:await hash(read)});
      if(typeof csv!=='string')return result(403);
      // IMPORTDATA infers numbers/dates before cell formatting. The workbook strips this text marker after import.
      const output=endpoint.searchParams.get('gclid_text')==='1' ? csv.split('\n').map((line:string,i:number)=>{
        const last=line.lastIndexOf(',')+1;
        return i && last<line.length ? line.slice(0,last)+'GC:'+line.slice(last) : line;
      }).join('\n') : csv;
      headers['Content-Type']='text/csv; charset=utf-8';return result(200,output);
    }
    if(req.method!=='POST')return result(405);
    const mediaType=(req.headers.get('Content-Type')||'').split(';',1)[0].trim().toLowerCase();
    // A safelisted contact confirmation can leave the browser as the phone/chat app opens.
    const handoff=mediaType==='text/plain';
    if(!handoff && mediaType!=='application/json')return result(415);
    if(handoff && !origins.has(origin))return result(403);
    const e=await payload(req);
    if(!e||Array.isArray(e)||typeof e!=='object'||Object.keys(e).some(k=>!['id','event','service','source','count','consent','attribution','contactChannel'].includes(k))||
      (e.contactChannel!==undefined && (e.event!=='contact_intent'||!['phone','whatsapp'].includes(e.contactChannel)))||
      !uuid.test(e.id)||typeof e.id!=='string'||!services.has(e.service)||!sources.has(e.source)||e.count!==1)return result(400);
    const internal=internalEvents.has(e.event);const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
    if(handoff && (e.event!=='contact_intent'||!e.contactChannel))return result(400);
    if(internal){if(!/^[a-f0-9]{64}$/.test(bearer))return result(403);}
    else if(!clientEvents.has(e.event)||!origins.has(origin)||e.consent!==true)return result(403);
    const attribution=cleanAttribution(e.attribution,e.source);
    if (e.event==='whatsapp_visit' &&
        (e.source!=='whatsapp' || attribution?.medium!=='messenger' || !attribution.campaign ||
          Object.keys(e.attribution).some(field=>!['landing','medium','campaign'].includes(field)))) return result(400);
    const peer=(req.headers.get('x-forwarded-for')||'shared').split(',')[0].slice(0,64);
    const status=await rpc('fp_record_event_detail',{eid:e.id,kind:e.event,category:e.service,channel:e.source,attribution,contact_method:e.contactChannel||null,
      rate_bucket:internal?null:await hash(key+'|'+new Date().toISOString().slice(0,10)+'|'+peer),access_digest:internal?await hash(bearer):null});
    return result(status==='ok'?204:status==='limited'?429:403);
  }catch{return result(503);}
});
