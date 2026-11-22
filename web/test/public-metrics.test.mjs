import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicMetric,mountMetrics} from '../public/assets/metrics.js';
import {guideServices} from '../public/assets/search-routes.js';
import {adKeywords,campaignVisit,cleanAttribution} from '../public/assets/campaign-attribution.js';
import {readFileSync} from 'node:fs';

const url = new URL('https://frankenpakt.de/anfrage/?src=google&person=PRIVATE-TEST&service=umzug#PRIVATE-TEST');
const uuid = () => '469053a8-77e0-4ec7-b777-ed2482b07ffa';
test('a single Google Ads click ID keeps case and is never inferred from a different identifier',()=>{
  const visit=(query)=>campaignVisit(new URL('/?'+query,url),{sessionStorage:{getItem:()=>null,setItem(){}}}).attribution;
  for (const value of ['Ab_C-091','001234567890123456','1E23','TRUE']) {
    assert.equal(visit('gclid='+value).gclid,value);
  }
  for (const query of ['gclid=A&gclid=B','gclid=%2Bcmd','gclid=%3D1','gclid=a%0Ab','gclid=alice%40example.com',
    'gbraid=Ab_C-091','wbraid=Ab_C-091','src=kleinanzeigen&gclid=Ab_C-091','utm_medium=organic&gclid=Ab_C-091','gclid='+'A'.repeat(513)]) {
    assert.equal(visit(query).gclid,undefined,query);
  }
});
test('only bought keywords enter the sheet and a fresh arrival in a reused tab starts a new visit',()=>{
  const plan=JSON.parse(readFileSync(new URL('../../kampagnen/anzeigen.json',import.meta.url),'utf8'));
  assert.deepEqual([...adKeywords].sort(),[...new Set(plan.groups.flatMap(g=>g.keywords))].sort());
  const data=new Map();
  const win={sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},performance:{getEntriesByType:()=>[{type:'navigate'}]}};
  const paid=new URL('/sofa-entsorgen/?src=google&utm_medium=cpc&utm_campaign=1234567891234567890&utm_term=Sofa+entsorgen+N%C3%BCrnberg&gclid=Mixed_Qa-42',url);
  const ad=campaignVisit(paid,win,'https://www.google.de/search?q=private');
  assert.deepEqual(ad,{source:'google',attribution:{landing:'/sofa-entsorgen/',medium:'cpc',campaign:'1234567891234567890',keyword:'sofa entsorgen nürnberg',gclid:'Mixed_Qa-42'}});
  assert.deepEqual(campaignVisit(new URL('/anfrage/?src=google',url),win,paid.href),ad);
  win.performance.getEntriesByType=()=>[{type:'reload'}];
  assert.deepEqual(campaignVisit(new URL('/danke/',url),win,''),ad);
  win.performance.getEntriesByType=()=>[{type:'navigate'}];
  assert.deepEqual(campaignVisit(new URL('/umzug/',url),win,'https://www.google.de/search?q=private'),{source:'google',attribution:{landing:'/umzug/',medium:'organic'}});
  campaignVisit(paid,win);
  assert.deepEqual(campaignVisit(new URL('/',url),win,'https://example.org/sensitive?q=private'),{source:'sonstige',attribution:{landing:'/',medium:'referral'}});
  campaignVisit(paid,win);
  assert.deepEqual(campaignVisit(new URL('/',url),win,''),{source:'direkt',attribution:{landing:'/'}});
  assert(!JSON.stringify([...data]).includes('private'));
  for(const term of ['info@example.invalid','=IMPORTDATA(1)','{keyword}','meine persönliche Suchanfrage']){
    assert.deepEqual(cleanAttribution({landing:'/',medium:'cpc',keyword:term,campaign:'=1'},'google'),{landing:'/',medium:'cpc'});
  }
  assert.deepEqual(cleanAttribution({...ad.attribution,medium:'organic'},'google'),{landing:'/sofa-entsorgen/',medium:'organic'});
  assert.equal(cleanAttribution({landing:'/admin/?token=private'},'google'),null);
});
test('every published guide records the correct service category and excludes query text',()=>{
  assert.ok(Object.keys(guideServices).length>0);
  for(const [path,service] of Object.entries(guideServices)){
    const loc=new URL(path+'?thema=PRIVATE-TEST',url);
    const event=publicMetric('service_chosen',null,loc,uuid);
    assert.equal(event.service,service);
    assert(!JSON.stringify(event).includes('PRIVATE-TEST'));
  }
  assert.equal(publicMetric('service_chosen',null,new URL('/private-job/',url),uuid),null);
});
test('only allowlisted website routing, category and event fields can reach the provider',()=>{
  const row=publicMetric('upload_ready','PRIVATE-TEST',url,uuid);
  assert.deepEqual(row,{id:uuid(),event:'upload_ready',service:'umzug',source:'google',count:1,consent:true});
  assert.equal(publicMetric('inquiry_received','umzug',url,uuid),null);
  assert.equal(publicMetric('upload_ready','umzug',new URL('/admin/?ref=PRIVATE-TEST',url),uuid),null);
  assert.equal(publicMetric('upload_ready','umzug',new URL('https://unrelated.invalid/'),uuid),null);
  const unknown=publicMetric('service_chosen',null,new URL('https://frankenpakt.de/?src=PRIVATE-TEST'),uuid);
  assert.equal(unknown.source,'unbekannt');assert.equal(unknown.service,'unbekannt');
});

test('no outgoing requests before opt-in or after revocation, including persisted denials and another tab',()=>{
  const doc=new EventTarget();
  const win=new EventTarget();
  const toggle=new EventTarget();toggle.setAttribute=(name,value)=>{toggle[name]=value;};
  doc.querySelector=selector=>selector==='[data-statistics]'?toggle:selector==='#service'?{value:'entsorgung'}:null;
  const storage=new Map();
  const pref={getItem:key=>storage.get(key),setItem:(key,v)=>storage.set(key,v)};
  const requests=[],frames=[],sent=[];
  const send=async(url,init)=>{requests.push({url,init});};
  const frameFactory=()=>{const entry={send:(m,p)=>sent.push([m,p]),close:()=>entry.closed=true};frames.push(entry);return entry;};
  storage.set('frankenpakt.statistik.v2','no');
  mountMetrics({doc,win,location:url,storage:pref,send,uuid,frameFactory});
  const file=()=>doc.dispatchEvent(new CustomEvent('fp-upload-ready',{detail:{filename:'PRIVATE-TEST.pdf',email:'PRIVATE-TEST'}}));
  file();assert.equal(requests.length,0);assert.equal(frames.length,0);
  toggle.dispatchEvent(new Event('click'));assert.equal(frames.length,1);
  file();
  assert.equal(requests.length,1);const {init}=requests[0];const data=JSON.parse(init.body);
  assert.deepEqual(data,{id:uuid(),event:'upload_ready',service:'entsorgung',source:'google',attribution:{landing:'/anfrage/'},count:1,consent:true});
  assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');
  assert.deepEqual(sent,[[{event:data.event,source:data.source,service:data.service},'/anfrage/']]);assert.equal(JSON.stringify(requests).includes('PRIVATE-TEST'),false);
  toggle.dispatchEvent(new Event('click'));file();assert.equal(frames[0].closed,true);assert.equal(requests.length,1);
  toggle.dispatchEvent(new Event('click'));assert.equal(frames.length,2);
  storage.set('frankenpakt.statistik.v2','no');
  const otherTab=new Event('storage');otherTab.key='frankenpakt.statistik.v2';win.dispatchEvent(otherTab);
  doc.dispatchEvent(new Event('fp-contact-handoff'));assert.equal(frames[1].closed,true);assert.equal(requests.length,1);
});

test('only the first view of an opted-in live receipt measures a GA lead, without sending another event to Sheets',()=>{
  const location=new URL('https://frankenpakt.de/danke/?src=google&name=PRIVATE');
  for(const callback of [false,true]){
    const lead={mode:'live',reference:'AN-ABCDEF0123456789',service:'umzug',callback};
    const history={state:{frankenpacktReceipt:lead,frankenpacktMeasureLead:true},replaceState(next){this.state=next;}};
    const win=Object.assign(new EventTarget(),{history});
    const doc=new EventTarget(),toggle=new EventTarget();
    toggle.setAttribute=()=>{};
    doc.querySelector=()=>toggle;
    const sent=[];
    const mount=(optIn=true)=>mountMetrics({doc,win,location,storage:{getItem:()=>optIn?'yes':'no'},
      send:()=>assert.fail('Saved leads are already logged by the server.'),
      frameFactory:()=>({send:(...args)=>sent.push(args)})});
    mount(); mount();
    assert.deepEqual(sent,[[{event:'generate_lead',service:'umzug',source:'google'},'/danke/',{leadType:callback?'callback':'quote'}]]);
    assert.equal(history.state.frankenpacktReceipt,lead);
    history.state.frankenpacktMeasureLead=true;mount(false);mount();
    history.state={frankenpacktMeasureLead:true,frankenpacktReceipt:{...lead,mode:'preview'}};mount();
    assert.equal(sent.length,1);
  }
});
