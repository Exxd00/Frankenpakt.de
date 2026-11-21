import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicMetric,mountMetrics} from '../public/assets/metrics.js';

const url = new URL('https://frankenpakt.de/anfrage/?src=google&person=PRIVATE-TEST&service=umzug#PRIVATE-TEST');
const uuid = () => '469053a8-77e0-4ec7-b777-ed2482b07ffa';
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
