import {guideServices, publicPagePaths} from './search-routes.js';

// Public GA4 web-stream ID. This is a routing identifier, never an API secret.
export const GA_MEASUREMENT_ID = 'G-QCK6H10Z49';
const endpoint = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events';
const choiceKey = 'frankenpakt.statistik.v1';
const sites = new Set(['frankenpakt.vercel.app','frankenpakt.de','www.frankenpakt.de']);
const pages = new Set(publicPagePaths);
const events = new Set(['service_chosen','estimate_viewed','upload_ready','contact_intent']);
const services = new Set(['entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf']);
const sources = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige']);
const pageServices = {...guideServices,'/raeumung/':'entruempelung','/entsorgung/':'entsorgung','/umzug/':'umzug','/seniorenumzug/':'seniorenumzug','/moebeltaxi/':'moebeltaxi'};

function metricCategories(explicitService,location) {
  const q = new URLSearchParams(location.search);
  const category = [explicitService,q.get('leistung'),q.get('service'),q.get('vorhaben'),pageServices[location.pathname]].find(value => services.has(value)) || 'unbekannt';
  const src = (q.get('src') || q.get('utm_source') || '').toLowerCase();
  return {service:category,source:sources.has(src) ? src : 'unbekannt'};
}

export function publicMetric(name, explicitService, location, uuid) {
  if (!events.has(name) || !sites.has(location.hostname) || !pages.has(location.pathname)) return null;
  return {id:uuid(),event:name,...metricCategories(explicitService,location),count:1,consent:true};
}

function analyticsFrame(id) {
  if (!/^G-[A-Z0-9]{6,14}$/.test(id)) return null;
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.title = 'Optionale Statistik';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  frame.referrerPolicy = 'no-referrer';
  frame.src = '/assets/statistik.html';
  let ready = false;
  const pending = [];
  const post = data => frame.contentWindow?.postMessage(data,location.origin);
  const listen = event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data !== 'fp-statistik-bereit' || ready) return;
    ready = true;
    post({cmd:'start',id,client:crypto.randomUUID()});
    for (const data of pending.splice(0)) post(data);
  };
  window.addEventListener('message',listen);
  document.body.append(frame);
  return {
    send(metric,path,parameters={}) {
      const data = {cmd:'event',name:metric.event,service:metric.service,source:metric.source,path,...parameters};
      if (ready) post(data); else if (pending.length < 25) pending.push(data);
    },
    close() {
      window.removeEventListener('message',listen);
      pending.length = 0;
      frame.remove();
    }
  };
}

export function mountMetrics({doc=document,win=window,location=win.location,storage,send=(...args)=>fetch(...args),uuid=()=>crypto.randomUUID(),frameFactory=()=>analyticsFrame(GA_MEASUREMENT_ID)}={}) {
  const toggle = doc.querySelector('[data-statistics]');
  if (!toggle || !sites.has(location.hostname) || !pages.has(location.pathname)) return;
  const read = () => {try{return (storage || win.localStorage).getItem(choiceKey) === 'yes';}catch{return false;}};
  let frame = null;
  let enabled = false;
  function clearCookies() {
    // These session cookies are confined to the empty tag document's path.
    const suffix=GA_MEASUREMENT_ID.slice(2);
    for (const name of ['fpstat_ga','fpstat_ga_'+suffix]) {
      doc.cookie=name+'=; Max-Age=0; Path=/assets; SameSite=Strict; Secure';
    }
  }
  function set(value) {
    if (value !== enabled) {
      enabled = value;
      if (enabled) frame = frameFactory();
      else {frame?.close();frame=null;clearCookies();}
    }
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent = enabled ? 'Statistik ausschalten' : 'Statistik einschalten';
  }
  function record(name, service, parameters) {
    if (!enabled) return;
    const metric = publicMetric(name,service,location,uuid);
    if (!metric) return;
    send(endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,
      headers:{'Content-Type':'application/json'},body:JSON.stringify(metric)}).catch(()=>{});
    frame?.send(metric,location.pathname,parameters);
  }
  toggle.hidden=false;
  set(read());
  // A real submission owns a single history entry. Refreshes and shared thank-you links do not create leads.
  const entry=win.history?.state;
  if(location.pathname==='/danke/' && entry?.frankenpacktMeasureLead===true) {
    win.history.replaceState({...entry,frankenpacktMeasureLead:false},'');
    const receipt=entry.frankenpacktReceipt;
    if(enabled && receipt?.mode==='live' && /^AN-[A-F0-9]{16}$/.test(receipt.reference)) {
      frame?.send({event:'generate_lead',...metricCategories(receipt.service,location)},location.pathname,
        {leadType:receipt.callback===true?'callback':'quote'});
    }
  }
  toggle.addEventListener('click',()=>{
    const value=!enabled;
    try{(storage || win.localStorage).setItem(choiceKey,value?'yes':'no');}catch{}
    set(value);
  });
  win.addEventListener('storage',e=>{if(e.key===choiceKey||e.key===null)set(read());});
  win.addEventListener('pagehide',()=>{frame?.close();frame=null;enabled=false;});
  win.addEventListener('pageshow',e=>{if(e.persisted)set(read());});
  doc.addEventListener('click',event=>{
    const chosen=event.target.closest?.('[data-guide-choice],a.service-card');
    if(!chosen)return;
    const url=new URL(chosen.href,location.origin);
    const service=chosen.dataset.guideChoice || (url.origin===location.origin && pageServices[url.pathname]);
    if(services.has(service))record('service_chosen',service);
  });
  doc.addEventListener('change',event=>{
    if(event.isTrusted && event.target.matches?.('#service,#comparison-topic') && services.has(event.target.value)) record('service_chosen',event.target.value);
  });
  doc.addEventListener('fp-estimate',e=>record('estimate_viewed',e.detail?.service));
  doc.addEventListener('fp-contact-handoff',e=>{
    const channel=e.detail?.channel;
    if(channel==='phone'||channel==='whatsapp')record('contact_intent',doc.querySelector('#service')?.value,{channel});
  });
  doc.addEventListener('fp-upload-ready',()=>record('upload_ready',doc.querySelector('#service')?.value));
}

if (typeof document !== 'undefined') mountMetrics();
