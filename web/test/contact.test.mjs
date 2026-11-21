import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { configuration, startServer } from '../server.mjs';
import { openStore, validate } from '../lib/leads.mjs';

const callback=()=>({requestId:randomUUID(),service:'rueckruf',contactMethod:'phone',name:'Probe',phone:'0911 1234567',source:'google'});

test('short callback, receipt and verified contact events are distinct and replay-safe',t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  const input=callback();
  assert.throws(()=>validate({...input,service:'umzug'}));
  assert.throws(()=>validate({...input,zipFrom:'123'}));
  assert.throws(()=>validate({...input,contactMethod:'email',email:'test@example.invalid'}));
  const lead=validate(input);
  const manual=store.submit({...lead,requestId:randomUUID(),details:'Erster Telefonkontakt'});
  assert.throws(()=>store.confirmContact(manual.reference,'callback_completed'),e=>e.status===409);
  assert.equal(store.confirmContact(manual.reference,'whatsapp_received').created,true);
  const web=store.submit(lead,Date.now(),false,'web');
  store.submit(lead,Date.now(),false,'web');
  store.submit({...lead,requestId:randomUUID()},Date.now(),false,'web');
  assert.deepEqual(store.get(web.reference).contactEvents.map(r=>r.event),['inquiry_received','callback_requested']);
  assert.equal(store.confirmContact(web.reference,'callback_completed').created,true);
  assert.equal(store.confirmContact(web.reference,'callback_completed').created,false);
  assert.equal(store.confirmContact(web.reference,'phone_connected').created,false);
  const outcomes=store.report().contactOutcomes;
  assert.deepEqual(outcomes.map(r=>r.event),['callback_completed','callback_requested','inquiry_received','phone_connected','whatsapp_received']);
  assert.ok(outcomes.every(r=>r.inquiries===1));
  store.erase(web.reference);
  assert.deepEqual(store.report().contactOutcomes.map(r=>r.event),['whatsapp_received']);
});

test('initial advertised offer survives repeat inquiries and is independent of the requested service',t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  const input={name:'Test',contactMethod:'phone',phone:'0911 1234567',service:'rueckruf',requestedService:'seniorenumzug',source:'google'};
  const submit=(fields)=>store.submit(validate({...input,requestId:randomUUID(),...fields}));
  const first=submit({adVariant:'privatumzug-team'});
  const reentered=submit({adVariant:'seniorenumzug-team'});
  assert.equal(reentered.created,false);assert.equal(reentered.reference,first.reference);
  assert.equal(store.get(first.reference).adVariant,'privatumzug-team');
  submit({details:'Zweiter Auftrag',adVariant:'seniorenumzug-team'});
  submit({details:'Unbekannter Link',adVariant:'unlisted'});
  submit({details:'Empfehlung',source:'empfehlung',adVariant:'privatumzug-team'});
  const report=store.report();
  assert.deepEqual(report.googleAdCohorts.map(r=>[r.adVariant,r.inquiries]),[
    ['privatumzug-team',1],['seniorenumzug-team',1],['unbekannt',1]
  ]);
  assert.equal(report.channelServiceCohorts.find(r=>r.source==='google'&&r.service==='seniorenumzug').inquiries,3);
  assert.equal(JSON.stringify(report).includes(input.phone),false);
});
test('optional handoff counters, receipt privacy and WhatsApp configuration',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'frankenpackt-contact-'));
  t.after(()=>rm(root,{recursive:true,force:true,maxRetries:6,retryDelay:80}));
  const publicDir=path.join(root,'public'),dataDir=path.join(root,'data');
  await mkdir(path.join(publicDir,'danke'),{recursive:true});
  const markup='<html><head><meta name="robots" content="noindex,follow"></head><body><div data-contact-mode="preview"></div><a data-contact="whatsapp" hidden href="/anfrage/">WhatsApp</a></body></html>';
  await writeFile(path.join(publicDir,'danke','index.html'),markup);
  const env={SITE_MODE:'live',PUBLIC_ORIGIN:'https://example.invalid',LEAD_DATA_DIR:dataDir,OPERATOR_NAME:'Testbetrieb',LEGAL_ADDRESS:'Testweg 1',CONTACT_PHONE:'+49 911 1234567',CONTACT_EMAIL:'test@example.invalid',CONTACT_WHATSAPP:'0049 151 12345678',CONTACT_METRICS:'1'};
  assert.equal(configuration({...env,SITE_MODE:'preview'}).public.whatsapp,'');
  assert.equal(configuration({...env,SITE_MODE:'preview'}).public.contactMetrics,false);
  assert.equal(configuration({...env,CONTACT_WHATSAPP:''}).public.whatsapp,'');
  assert.throws(()=>configuration({...env,CONTACT_WHATSAPP:'keine Nummer'}));
  async function run(settings,check){
    const server=startServer({env:settings,publicDir,port:0});await once(server,'listening');
    try{
      const app='http://127.0.0.1:'+server.address().port;
      const post=(body,origin=settings.PUBLIC_ORIGIN)=>fetch(app+'/api/contact-events',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
      await check(app,post);
    }finally{const closing=once(server,'close');server.close();server.closeAllConnections();await closing;}
  }
  const event={event:'whatsapp_click',source:'google',eventId:randomUUID(),consent:true};
  await run({...env,CONTACT_METRICS:''},async(_url,post)=>assert.equal((await post(event)).status,404));
  await run(env,async(url,post)=>{
    const receipt=await fetch(url+'/danke/');
    assert.equal(receipt.headers.get('x-robots-tag'),'noindex, nofollow');
    assert.equal(receipt.headers.get('cache-control'),'no-store');
    const html=await receipt.text();
    assert.match(html,/noindex,nofollow/);assert.match(html,/https:\/\/wa\.me\/4915112345678/);
    assert.match(html,/data-contact-mode="live" data-metrics="1"/);
    assert.equal((await post({...event,consent:false})).status,400);
    assert.equal((await post({...event,phone:'discard'})).status,400);
    assert.equal((await post(event,'https://other.invalid')).status,403);
    assert.equal((await post(event)).status,200);
  });
  await run(env,async(_url,post)=>assert.equal((await post(event)).status,200));
  const store=openStore(path.join(dataDir,'leads.sqlite'));
  try{
    const report=store.report();
    assert.equal(report.contactIntentClicks.length,1);
    assert.equal(report.contactIntentClicks[0].hits,1);
    assert.equal(report.contactOutcomes.length,0);
    assert.equal(report.aggregatePageRequests.length,0);
    assert.ok(!JSON.stringify(report).includes(event.eventId));
  }finally{store.close();}
});
