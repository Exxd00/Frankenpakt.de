import http from 'node:http';
import { isIP } from 'node:net';
import {createHash,timingSafeEqual} from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openStore, validate, validateContactClick, InputError, mobileNumber } from './lib/leads.mjs';
import { deliverDue, notificationSettings } from './lib/notify.mjs';
import { deliverStaffMail, staffMailSettings } from './lib/mail-delivery.mjs';
import { liveHtml } from './lib/render-live.mjs';
import {publicPagePaths,robots,searchPaths,sitemap} from './search-site.mjs';
import { maxLeadBodyBytes } from './lib/inputs.mjs';
import { parseFileRequest, maxMultipartBytes, serveAttachment } from './lib/attachments.mjs';
import {deliverOfficeEvents} from './lib/office-events.mjs';
import { saveDailyReport } from './lib/snapshot.mjs';

const webRoot=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.pdf':'application/pdf'};
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
export function configuration(env=process.env){
  const live=env.SITE_MODE==='live';
  if(env.SITE_MODE&&!['live','preview'].includes(env.SITE_MODE))throw new Error('SITE_MODE must be live or preview.');
  let origin=null;
  let whatsapp='';
  if(live){
    const needed=['PUBLIC_ORIGIN','LEAD_DATA_DIR','OPERATOR_NAME','LEGAL_ADDRESS','CONTACT_PHONE','CONTACT_EMAIL'];
    const missing=needed.filter(k=>!env[k]?.trim());
    if(missing.length)throw new Error('Missing live settings: '+missing.join(', '));
    const base=new URL(env.PUBLIC_ORIGIN);
    if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('PUBLIC_ORIGIN must be the HTTPS origin.');
    if(!mobileNumber(env.CONTACT_PHONE)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.CONTACT_EMAIL))throw new Error('Verify operator contact fields.');
    if(env.CONTACT_WHATSAPP?.trim()){
      whatsapp=mobileNumber(env.CONTACT_WHATSAPP.trim());
      if(!whatsapp.startsWith('+'))throw new Error('CONTACT_WHATSAPP requires a valid international or German national number.');
    }
    if(!path.isAbsolute(env.LEAD_DATA_DIR))throw new Error('LEAD_DATA_DIR must be absolute.');
    origin=base.origin;
  }
  return {live,origin,dataDir:env.LEAD_DATA_DIR||'',retention:Number(env.CLOSED_RETENTION_DAYS||90),public:{
    mode:live?'live':'preview',leadIntake:live,phone:live?mobileNumber(env.CONTACT_PHONE):'',phoneDisplay:live?env.CONTACT_PHONE:'',
    whatsapp,contactMetrics:live&&env.CONTACT_METRICS==='1',staffMailEnabled:live&&Boolean(staffMailSettings(env)),
    email:live?env.CONTACT_EMAIL:'',operatorName:live?env.OPERATOR_NAME:'',legalAddress:live?env.LEGAL_ADDRESS:'',
    privacyContact:live?(env.PRIVACY_CONTACT||env.CONTACT_EMAIL):'',legalExtra:live?(env.LEGAL_EXTRA||''):'',
    privacyExtra:live?(env.PRIVACY_EXTRA||''):'',retentionDays:Number(env.CLOSED_RETENTION_DAYS||90)
  }};
}
async function readBytes(req,maxBytes){
  if(Number(req.headers['content-length'])>maxBytes)throw new InputError('Anfrage zu groß.',413);
  let size=0;const parts=[];
  for await(const part of req){size+=part.length;if(size>maxBytes)throw new InputError('Anfrage zu groß.',413);parts.push(part);}
  return Buffer.concat(parts);
}
async function body(req,maxBytes){
  const bin=await readBytes(req,maxBytes);
  try{return JSON.parse(bin.toString('utf8'));}catch{throw new InputError('Ungültige Anfrage.');}
}
const controlledPages=new Set([...searchPaths,'/anfrage/','/umzuege/','/entruempelung/','/leistungen/','/umzug-nuernberg/']);
export function startServer({env=process.env,publicDir=path.join(webRoot,'public'),port=Number(env.PORT||8787),host=env.HOST||'127.0.0.1',sendStaffMail=fetch,sendOfficeEvent=fetch}={}){
  const config=configuration(env);
  const officeFileToken=env.OPS_OFFICE_FILE_TOKEN;
  if(officeFileToken && (officeFileToken.length<32||/\s/.test(officeFileToken)))throw new Error('Invalid OPS_OFFICE_FILE_TOKEN.');
  if(!Number.isInteger(config.retention)||config.retention<1)throw new Error('CLOSED_RETENTION_DAYS must be a positive integer.');
  const publicPath=path.resolve(publicDir);
  const notify=config.live?notificationSettings(env):null;
  const mail=config.live?staffMailSettings(env):null;
  const eventsKey=config.live?env.FRANKENPACKT_EVENTS_WRITE_KEY:null;
  if(eventsKey&&!/^[\x21-\x7e]+$/.test(eventsKey))throw new Error('Invalid FRANKENPACKT_EVENTS_WRITE_KEY.');
  const dataPath=path.resolve(config.dataDir||'.');
  if(config.live&&(dataPath===publicPath||dataPath.startsWith(publicPath+path.sep)))throw new Error('Data directory must be outside public/.');
  const db=config.live?openStore(path.join(dataPath,'leads.sqlite')):null;
  const maxRequests=Number(env.MAX_SUBMITS_PER_MINUTE||30);
  if(!Number.isInteger(maxRequests)||maxRequests<1)throw new Error('MAX_SUBMITS_PER_MINUTE must be positive.');
  const windowByPeer=new Map();
  const housekeeping=setInterval(()=>{
    const now=Date.now();for(const [k,v] of windowByPeer)if(v.end<=now)windowByPeer.delete(k);
    db?.expireClickReplays(now);
  },60000);housekeeping.unref();
  function snapshot(){
    if(!db)return;
    try{saveDailyReport(db,dataPath);}catch{console.error('Anonymen Tagesbericht und Speichermedium überprüfen.');}
  }
  snapshot();
  const reportTimer=setInterval(snapshot,3600000);reportTimer.unref();
  db?.prune(config.retention);
  const retentionTimer=setInterval(()=>db?.prune(config.retention),24*60*60*1000);retentionTimer.unref();
  const controller=new AbortController();
  let pending=null;
  function notifyOps(){
    if((notify||mail||eventsKey)&&!pending)pending=Promise.allSettled([
      deliverDue(db,notify,{signal:controller.signal}),
      deliverStaffMail(db,mail,{send:sendStaffMail,signal:controller.signal}),
      deliverOfficeEvents(db?.officeEvents,eventsKey,{send:sendOfficeEvent,signal:controller.signal})
    ]).then(results=>{
      if(results.some(result=>result.status==='rejected'))console.error('Notification queue unavailable. Check operator storage.');
    }).finally(()=>{pending=null;});
  }
  const noticeTimer=setInterval(notifyOps,30000);noticeTimer.unref();notifyOps();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin');
    res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(!config.live)res.setHeader('X-Robots-Tag','noindex, nofollow');
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/assets/statistik.html'){
        res.setHeader('X-Frame-Options','SAMEORIGIN');
        res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
        res.setHeader('Referrer-Policy','no-referrer');
      }
      const officeFile=/^\/api\/office-file\/(AN-[A-F0-9]{16})\/([1-5])$/.exec(url.pathname);
      if(officeFile&&config.live&&officeFileToken&&['GET','HEAD'].includes(req.method)){
        const digest=value=>createHash('sha256').update(value).digest();
        if(!timingSafeEqual(digest(req.headers.authorization||''),digest('Bearer '+officeFileToken)))throw new InputError('Kein Zugriff.',403);
        const file=db.attachments.get(officeFile[1],Number(officeFile[2]));
        if(!file)throw new InputError('Datei nicht gefunden.',404);
        serveAttachment(res,file,req.method==='HEAD');return;
      }
      if(['GET','HEAD'].includes(req.method)&&url.pathname==='/api/config'){json(res,200,config.public);return;}
      if(req.method==='GET'&&url.pathname==='/healthz'){json(res,200,{ok:true,mode:config.public.mode});return;}
      const contactEvent=url.pathname==='/api/contact-events';
      if(req.method==='POST'&&(url.pathname==='/api/leads'||contactEvent)){
        if(contactEvent&&!config.public.contactMetrics)throw new InputError('Kontaktmessung inaktiv.',404);
        const type=req.headers['content-type']||'';
        const multipart=!contactEvent&&/^multipart\/form-data\s*;/i.test(type);
        if(!multipart&&!type.toLowerCase().startsWith('application/json'))throw new InputError('Unbekanntes Anfrageformat.',415);
        if(multipart&&!config.live)throw new InputError('Dateiversand ist in der Vorschau ausgeschaltet.',403);
        const origin=req.headers.origin;
        const allowed=config.live?[config.origin]:['http://'+req.headers.host,'https://'+req.headers.host];
        if((origin||contactEvent||multipart)&&!allowed.includes(origin))throw new InputError('Unbekannte Herkunft.',403);
        const peer=req.socket.remoteAddress||'local',forwarded=req.headers['x-real-ip'];
        const fromLocalProxy=env.TRUST_LOCAL_PROXY==='1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer);
        const addr=fromLocalProxy&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:peer;
        const quotaKey=(contactEvent?'click|':'form|')+addr;
        const now=Date.now();let bucket=windowByPeer.get(quotaKey);
        if(!bucket||bucket.end<=now){bucket={count:0,end:now+60000};windowByPeer.set(quotaKey,bucket);}
        if(++bucket.count>maxRequests){res.setHeader('Retry-After','60');throw new InputError('Bitte versuchen Sie es in einer Minute erneut.',429);}
        if(contactEvent){
          const click=validateContactClick(await body(req,12*1024));
          if(click.event==='whatsapp_click'&&!config.public.whatsapp)throw new InputError('WhatsApp ist nicht eingerichtet.');
          db.contactClick(click);
          json(res,200,{ok:true});return;
        }
        const input=multipart ? await parseFileRequest(await readBytes(req,maxMultipartBytes),type) : {fields:await body(req,maxLeadBodyBytes),files:[]};
        const lead=validate(input.fields);
        if(!config.live){json(res,200,{ok:true,mode:'preview',reference:'VORSCHAU'});return;}
        const result=db.submit(lead,Date.now(),Boolean(notify),'web',mail?.route,input.files,Boolean(eventsKey));json(res,result.created?201:200,{ok:true,mode:'live',reference:result.reference});
        if(result.created)notifyOps();
        return;
      }
      if(url.pathname.startsWith('/api/')){json(res,404,{ok:false,message:'Unbekannter Endpunkt.'});return;}
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');res.writeHead(405);res.end();return;}
      if(url.pathname==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?'':robots(config.origin));return;}
      if(url.pathname==='/sitemap.xml'){
        if(!config.live)throw new InputError('Unbekannter Pfad.',404);
        res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});res.end(req.method==='HEAD'?'':sitemap(config.origin));return;
      }
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{throw new InputError('Ungültiger Pfad.');}
      if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(x=>x.startsWith('.')))throw new InputError('Unbekannter Pfad.',404);
      if(/^\/betrieb(?:\/|$)/i.test(pathname))throw new InputError('Unbekannter Pfad.',404);
      const page = pathname.replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');
      if(config.live && page !== url.pathname && publicPagePaths.includes(page)){
        res.writeHead(308, {Location:new URL(page + url.search, config.origin).href});
        res.end();return;
      }
      let target=path.resolve(publicPath,'.'+pathname);
      if(target!==publicPath&&!target.startsWith(publicPath+path.sep))throw new InputError('Unbekannter Pfad.',404);
      if((await stat(target)).isDirectory())target=path.join(target,'index.html');
      target=await realpath(target);
      const actualPublic=await realpath(publicPath);
      if(!target.startsWith(actualPublic+path.sep)||!Object.hasOwn(types,path.extname(target)))throw new InputError('Unbekannter Pfad.',404);
      let bin=await readFile(target);
      if(config.live&&target.endsWith('.html')){
        const route=path.relative(actualPublic,target).split(path.sep).join('/').replace(/index\.html$/,'');
        bin=Buffer.from(liveHtml(bin.toString('utf8'),config.public,new URL('/'+route,config.origin).href));
      }
      const receiptPage=path.relative(actualPublic,target).split(path.sep).join('/')==='danke/index.html';
      if(receiptPage){res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Referrer-Policy','no-referrer');}
      res.writeHead(200,{'Content-Type':types[path.extname(target)],'Content-Length':bin.length,'Cache-Control':receiptPage?'no-store':'no-cache'});
      res.end(req.method==='HEAD'?undefined:bin);
      if(db&&req.method==='GET'&&controlledPages.has(page)&&!(req.headers['user-agent']||'').match(/bot|crawler|spider|lighthouse|headless|preview/i)){
        const tag=(url.searchParams.get('src')||url.searchParams.get('utm_source')||'').toLowerCase();
        db.landing(page,tag||'unbekannt');
      }
    }catch(error){
      if(res.headersSent)return;
      const code=error instanceof InputError?error.status:error?.code==='ENOENT'||error?.code==='ENOTDIR'?404:500;
      if(code===404&&['GET','HEAD'].includes(req.method)&&req.headers.accept?.includes('text/html')){
        try{
          const page=await readFile(path.join(publicPath,'404.html'));
          res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Content-Length':page.length,'X-Robots-Tag':'noindex'});
          res.end(req.method==='HEAD'?undefined:page);return;
        }catch{}
      }
      json(res,code,{ok:false,error:code>=500?'Anfrage derzeit nicht möglich.':error instanceof InputError?error.message:'Seite nicht gefunden.',message:code>=500?'Anfrage derzeit nicht möglich.':error instanceof InputError?error.message:'Seite nicht gefunden.'});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.on('close',()=>{
    clearInterval(housekeeping);clearInterval(retentionTimer);clearInterval(noticeTimer);clearInterval(reportTimer);controller.abort();
    if(pending)pending.finally(()=>db?.close());else db?.close();
  });
  server.listen(port,host);
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const app=startServer();app.once('listening',()=>{const a=app.address();console.log('Site '+configuration().public.mode+' listening at '+a.address+':'+a.port);});
}

