import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {contactDelivery} from '../public/assets/contact-delivery.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const metric=()=>({event:'contact_intent',id:randomUUID(),contactChannel:'whatsapp',service:'entsorgung',source:'direkt',count:1,consent:true,
  attribution:{landing:'/sofa-entsorgen/'}});
function setup() {
  const calls=[], data=new Map(), service={status:503,allowed:true,time:1000};
  const session=()=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)});
  const mount=()=>contactDelivery({session,accepted:()=>service.allowed,now:()=>service.time,services:new Set(['entsorgung']),
    sources:new Set(['direkt']),collector:'https://collector.invalid/events',send:async(path,{body})=>{
      calls.push({path,metric:JSON.parse(body)});return {status:service.status};
    }});
  return {calls,data,service,mount};
}

test('an interrupted confirmation resumes in the same tab with one stable ID and drops out after acceptance',async()=>{
  const {calls,data,service,mount}=setup();
  const row=metric();mount().record(row);await tick();
  assert.equal(calls.length,2);assert.equal(data.size,1);
  service.status=204;
  const next=mount();next.resume();next.resume();await tick();next.resume();
  assert.equal(calls.length,3);assert.equal(data.size,0);
  assert.equal(calls[2].path,'/api/contact-confirmation');
  for(const call of calls)assert.deepEqual(call.metric,row);
});

test('a 200 fallback page cannot acknowledge storage',async()=>{
  const {calls,data,service,mount}=setup();
  service.status=200;mount().record(metric());await tick();
  assert.equal(calls.length,2);assert.equal(data.size,1);
  service.status=204;mount().resume();await tick();
  assert.equal(calls.length,3);assert.equal(data.size,0);
});

test('pending delivery is bounded, expires, and is removed on withdrawal or permanent rejection',async()=>{
  const {calls,data,service,mount}=setup();
  service.status=429;
  const page=mount(), rows=Array.from({length:10},metric);
  for(const row of rows)page.record(row);
  await tick();
  assert.equal(calls.length,10);
  assert.deepEqual(JSON.parse([...data.values()][0]).map(r=>r.metric.id),rows.slice(-8).map(r=>r.id));
  service.time+=30*60*1000;
  mount().resume();await tick();assert.equal(calls.length,10);assert.equal(data.size,0);
  page.record(metric());await tick();assert.equal(data.size,1);
  service.allowed=false;page.clear();mount().resume();assert.equal(data.size,0);assert.equal(calls.length,11);
  service.allowed=true;service.status=400;const fresh=mount();fresh.record(metric());await tick();fresh.resume();
  assert.equal(calls.length,12);assert.equal(data.size,0);
});
