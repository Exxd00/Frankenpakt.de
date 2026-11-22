import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicMetric,mountMetrics} from '../public/assets/metrics.js';
import {guideServices} from '../public/assets/search-routes.js';

const url = new URL('https://frankenpakt.de/anfrage/?src=google&person=PRIVATE-TEST&service=umzug#PRIVATE-TEST');
const uuid = () => '469053a8-77e0-4ec7-b777-ed2482b07ffa';
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
  storage.set('frankenpakt.statistik.v1','no');
  mountMetrics({doc,win,location:url,storage:pref,send,uuid,frameFactory});
  const file=()=>doc.dispatchEvent(new CustomEvent('fp-upload-ready',{detail:{filename:'PRIVATE-TEST.pdf',email:'PRIVATE-TEST'}}));
  file();assert.equal(requests.length,0);assert.equal(frames.length,0);
  toggle.dispatchEvent(new Event('click'));assert.equal(frames.length,1);
  file();
  assert.equal(requests.length,1);const {init}=requests[0];const data=JSON.parse(init.body);
  assert.deepEqual(data,{id:uuid(),event:'upload_ready',service:'entsorgung',source:'google',count:1,consent:true});
  assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');
  assert.deepEqual(sent,[[data,'/anfrage/']]);assert.equal(JSON.stringify(requests).includes('PRIVATE-TEST'),false);
  toggle.dispatchEvent(new Event('click'));file();assert.equal(frames[0].closed,true);assert.equal(requests.length,1);
  toggle.dispatchEvent(new Event('click'));assert.equal(frames.length,2);
  storage.set('frankenpakt.statistik.v1','no');
  const otherTab=new Event('storage');otherTab.key='frankenpakt.statistik.v1';win.dispatchEvent(otherTab);
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
