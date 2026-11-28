import {businessServices, guideServices, publicPagePaths} from './search-routes.js';
import {campaignVisit,forgetVisit} from './campaign-attribution.js';
import {statisticsPreference} from './statistics-preference.js';

// Public GA4 web-stream ID. This is a routing identifier, never an API secret.
export const GA_MEASUREMENT_ID = 'G-QCK6H10Z49';
const endpoint = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events';
const sites = new Set(['frankenpakt.vercel.app','frankenpakt.de','www.frankenpakt.de']);
const pages = new Set(publicPagePaths);
const events = new Set(['service_chosen','estimate_viewed','upload_ready','contact_intent']);
const services = new Set(['entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf']);
const sources = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige']);
const pageServices = {...guideServices,...businessServices,'/raeumung/':'entruempelung','/entsorgung/':'entsorgung','/umzug/':'umzug','/seniorenumzug/':'seniorenumzug','/moebeltaxi/':'moebeltaxi'};
const receiptsKey = 'frankenpakt.gezaehlte-anfragen.v1';

function firstReceiptForTab(win,reference) {
  try {
    const saved=JSON.parse(win.sessionStorage.getItem(receiptsKey) || '[]');
    const recent=Array.isArray(saved)?saved.filter(value=>typeof value==='string' && /^AN-[A-F0-9]{16}$/.test(value)):[];
    if(recent.includes(reference))return false;
    win.sessionStorage.setItem(receiptsKey,JSON.stringify([...recent.slice(-63),reference]));
  } catch { /* History still excludes repeated views when session storage is unavailable. */ }
  return true;
}

function metricCategories(explicitService,location) {
  const q = new URLSearchParams(location.search);
  const category = [explicitService,q.get('leistung'),q.get('service'),q.get('vorhaben'),pageServices[location.pathname]].find(value => services.has(value)) || 'unbekannt';
  const src = (q.get('src') || q.get('utm_source') || '').toLowerCase();
  return {service:category,source:sources.has(src) ? src : 'unbekannt'};
}

export function publicMetric(name, explicitService, location, uuid, visit) {
  if (!events.has(name) || !sites.has(location.hostname) || !pages.has(location.pathname)) return null;
  const categories=metricCategories(explicitService,location);
  if(visit)Object.assign(categories,{source:visit.source,attribution:visit.attribution});
  return {id:uuid(),event:name,...categories,count:1,consent:true};
}

function analyticsFrame(id,traffic) {
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
    post({cmd:'start',id,client:crypto.randomUUID(),...traffic});
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

export function mountMetrics({doc=document,win=window,location=win.location,storage,send=(...args)=>fetch(...args),uuid=()=>crypto.randomUUID(),frameFactory=traffic=>analyticsFrame(GA_MEASUREMENT_ID,traffic)}={}) {
  const toggle = doc.querySelector('[data-statistics]');
  if (!toggle || !sites.has(location.hostname) || !pages.has(location.pathname)) return;
  let frame = null;
  let enabled = false;
  let visit = null;
  function clearCookies() {
    // These session cookies are confined to the empty tag document's path.
    const suffix=GA_MEASUREMENT_ID.slice(2);
    for (const name of ['fpstat_ga','fpstat_ga_'+suffix]) {
      doc.cookie=name+'=; Max-Age=0; Path=/assets; SameSite=Strict; Secure';
    }
  }
  function set(value) {
    if (value !== enabled || (!value && visit)) {
      enabled = value;
      if (enabled) {
        visit=campaignVisit(location,win,doc.referrer);
        frame=frameFactory({source:visit.source,medium:visit.attribution.medium});
      }
      else {
        visit=null;forgetVisit(win);
        try {win.sessionStorage.removeItem(receiptsKey);} catch {}
        frame?.close();frame=null;clearCookies();
      }
    }
  }
  function postMetric(metric,contentType) {
    return send(endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,
      headers:{'Content-Type':contentType},body:JSON.stringify(metric)});
  }
  async function deliverHandoff(metric) {
    // A CORS-safelisted body avoids an OPTIONS round trip as the browser hands off to the app.
    const post = () => postMetric(metric,'text/plain;charset=UTF-8');
    try {
      const response = await post();
      if (!response || (response.status < 500 && response.status !== 408)) return;
    } catch { /* The initial response may have been lost after acceptance. */ }
    // One immediate retry with the same ID; the event store deduplicates it.
    if (preference.accepted()) await post().catch(()=>{});
  }
  function record(name, service, parameters) {
    if (!enabled) return;
    const metric = publicMetric(name,service,location,uuid,visit);
    if (!metric) return;
    postMetric(metric,'application/json').catch(()=>{});
    frame?.send({event:metric.event,service:metric.service,source:metric.source},location.pathname,parameters);
  }
  const preference = statisticsPreference({doc,win,storage,settingsButton:toggle,onChange:set});
  doc.addEventListener('fp-inquiry-attribution',event=>{
    if(enabled && preference.accepted() && visit && typeof event.detail?.accept==='function')event.detail.accept(visit);
  });
  // History covers refresh, sharing and Back. A retry can return the same receipt in a new history entry.
  const entry=win.history?.state;
  if(location.pathname==='/danke/' && entry?.frankenpacktMeasureLead===true) {
    win.history.replaceState({...entry,frankenpacktMeasureLead:false},'');
    const receipt=entry.frankenpacktReceipt;
    if(enabled && receipt?.mode==='live' && /^AN-[A-F0-9]{16}$/.test(receipt.reference) && firstReceiptForTab(win,receipt.reference)) {
      frame?.send({event:'generate_lead',...metricCategories(receipt.service,location),source:visit.source},location.pathname,
        {leadType:receipt.callback===true?'callback':'quote'});
    }
  }
  win.addEventListener('pagehide',()=>{frame?.close();frame=null;enabled=false;});
  // Count the first real edit on a working inquiry form. Field values never enter the message.
  const inquiry = location.pathname === '/anfrage/' && doc.querySelector('#lead-form');
  if (inquiry && doc.querySelector('#contact-dialog[data-contact-mode="live"]')) {
    const measureForm = (name,callback,details={}) => {
      if (!enabled) return;
      const service = doc.querySelector('#service')?.value || (callback ? 'rueckruf' : '');
      frame?.send({event:name,...metricCategories(service,location),source:visit.source},
        location.pathname,{leadType:callback?'callback':'quote',...details});
    };
    const firstEdit = event => {
      if (!event.isTrusted || !event.target.matches?.('input:not([type="hidden"]):not(#website),select,textarea') ||
          doc.querySelector('#send-lead')?.disabled !== false) return;
      inquiry.removeEventListener('input',firstEdit);
      inquiry.removeEventListener('change',firstEdit);
      measureForm('form_start',doc.querySelector('#callback-window')?.hidden === false);
    };
    inquiry.addEventListener('input',firstEdit);
    inquiry.addEventListener('change',firstEdit);
    doc.addEventListener('fp-submit-error',event=>{
      const {reason,callback}=event.detail || {};
      if (['attachment','rate_limit','unconfirmed'].includes(reason)) measureForm('form_submit_error',callback===true,{reason});
    });
  }
  doc.addEventListener('click',event=>{
    const chosen=event.target.closest?.('[data-guide-choice],a.service-card,a.firm-card');
    if(!chosen)return;
    const url=new URL(chosen.href,location.origin);
    const service=chosen.dataset.guideChoice || (url.origin===location.origin && pageServices[url.pathname]);
    if(services.has(service))record('service_chosen',service);
  });
  doc.addEventListener('change',event=>{
    if(event.isTrusted && event.target.matches?.('#service,#comparison-topic') && services.has(event.target.value)) record('service_chosen',event.target.value);
  });
  doc.addEventListener('fp-estimate',e=>record('estimate_viewed',e.detail?.service));
  function measureContact(action,detail={}) {
    const {channel,placement} = detail;
    if (!enabled || !preference.accepted() || !['phone','whatsapp'].includes(channel)) return;
    const service = metricCategories(doc.querySelector('#service')?.value,location).service;
    if (action === 'confirmed') {
      const metric = publicMetric('contact_intent',service,location,uuid,visit);
      metric.contactChannel = channel;
      void deliverHandoff(metric);
    }
    frame?.send({event:channel+'_'+action,service,source:visit.source},location.pathname,
      {channel,placement:['floating','footer','hero','page'].includes(placement)?placement:'page'});
  }
  doc.addEventListener('fp-contact-intent',event=>measureContact('click',event.detail));
  doc.addEventListener('fp-contact-cancel',event=>measureContact('cancelled',event.detail));
  doc.addEventListener('fp-contact-handoff',event=>measureContact('confirmed',event.detail));
  doc.addEventListener('fp-upload-ready',()=>record('upload_ready',doc.querySelector('#service')?.value));
}

if (typeof document !== 'undefined') mountMetrics();
