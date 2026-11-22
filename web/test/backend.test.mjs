import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validate, openStore } from '../lib/leads.mjs';
import { notificationSettings,deliverDue } from '../lib/notify.mjs';
import { configuration,startServer } from '../server.mjs';
import { saveDailyReport } from '../lib/snapshot.mjs';
import {bookTestOffer} from '../test-support/booking.mjs';
import {exampleJobScope} from '../test-support/job-scope.mjs';

const sample=()=>({service:'umzug',zipFrom:'90453',zipTo:'90402',details:'Tisch und Stuhl',contactMethod:'email',email:'test@example.invalid',name:'Testperson',source:'google',requestId:randomUUID()});
test('inquiry and callback estimate only customer-entered job facts; older links cannot set prices',t=>{
  const db=openStore(':memory:');t.after(()=>db.close());
  const jobs=[
    [{service:'entsorgung',items:[{name:'Sofa',quantity:'1'}]},7800],
    [{service:'entruempelung',rooms:[{name:'Keller',area:'5,5',fill:'half'}]},14800],
    [{service:'entruempelung',rooms:[{name:'Keller',area:'12',fill:'most'}]},34800],
    [{service:'entruempelung',rooms:[{name:'Keller',area:'19',fill:'most'}]},64800],
    [{service:'umzug',rooms:'2',area:'50',volume:'14',distance:'20'},29800],
    [{service:'entsorgung',items:[{name:'Altreifen',quantity:'8'}]},null]
  ];
  for(const [estimateFacts,cents] of jobs){
    const service=estimateFacts.service;
    const payload={...sample(),service,estimateFacts,details:'Eigener Hinweis',
      priceOrientation:{estimatedCents:5},vergleichcent:'5',gross_cents:5};
    const full=validate(payload);
    const saved=db.submit(full);
    assert.equal(db.submit(full).reference,saved.reference);
    const lead=db.get(saved.reference);
    assert.equal(lead.person.priceOrientation.estimatedCents,cents);
    assert.equal(lead.person.details,'Eigener Hinweis');
    assert.equal(lead.gross_cents,null);
    const callback=validate({...payload,requestId:randomUUID(),service:'rueckruf',requestedService:service,contactMethod:'phone',phone:'0911 123456'});
    assert.equal(db.get(db.submit(callback).reference).person.priceOrientation.estimatedCents,cents);
  }
  assert.throws(()=>validate({...sample(),vorhaben:'sofa'}));
  assert.throws(()=>validate({...sample(),vorhaben:'1.25'}));
  const ordinary=validate({...sample(),priceOrientation:{estimatedCents:5}});
  assert.equal(db.get(db.submit(ordinary).reference).person.priceOrientation,undefined);
  const old=validate({...sample(),service:'entsorgung',vorhaben:'sofa',vergleichcent:'8000'});
  assert.equal(db.get(db.submit(old).reference).person.priceOrientation,undefined);
  const jobScope=exampleJobScope('entsorgung');
  jobScope.fields.items=JSON.stringify([{type:'other',quantity:'4',name:'Altreifen',size:'',weight:'',destination:'discard'}]);
  const changed=db.get(db.submit(validate({...sample(),service:'entsorgung',zipTo:'',jobScope,estimateFacts:jobs[0][0]})).reference);
  assert.notEqual(changed.person.priceOrientation?.estimatedCents,7800);
  assert.equal(changed.person.estimateFacts?.items[0].name,'Altreifen');
});

test('required fields, spam trap and minimum disclosure',()=>{
  const data=sample();
  assert.throws(()=>validate({...data,zipFrom:'9100'}));
  assert.throws(()=>validate({...data,email:' ' }));
  assert.throws(()=>validate({...data,website:'hidden'}));
  assert.throws(()=>validate({...data,service:'other'}));
  for (const service of ['entruempelung','entsorgung']) {
    const adVariant = service + '-nuernberg';
    assert.equal(validate({...data,service,zipTo:'',adVariant}).adVariant,adVariant);
    const callback = validate({...data,service:'rueckruf',requestedService:service,contactMethod:'phone',phone:'0911 123456',zipFrom:'',adVariant});
    assert.equal(callback.requestedService,service);
    assert.equal(callback.adVariant,adVariant);
  }
  const lead=validate({...data,irrelevant:'ignore',phone:'do not store',gclid:'example',source:'untrusted'});
  assert.equal(lead.source,'unbekannt');
  assert.equal(lead.phone,undefined);assert.equal(lead.gclid,undefined);
  assert.equal(validate({...data,contactMethod:'phone',phone:'0911 1234567'}).contact,'+499111234567');
});
test('service chosen for a short callback follows the paid order, unknown legacy callbacks remain unassigned',t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  const input={requestId:randomUUID(),service:'rueckruf',name:'Test',contactMethod:'phone',phone:'0911 100000',source:'google'};
  const legacy=validate(input);
  assert.equal(Object.hasOwn(legacy,'requestedService'),false);
  store.submit(legacy);
  const lead=validate({...input,requestId:randomUUID(),requestedService:'seniorenumzug'});
  const {reference}=store.submit(lead);
  assert.equal(store.submit(lead).created,false);
  assert.equal(store.get(reference).person.requestedService,'seniorenumzug');
  bookTestOffer(store,reference,789,412.25);
  store.stage(reference,'completed','789','412.25');
  store.payment(reference,'qa-invoice','payment','789');
  const rows=store.report().channelServiceCohorts;
  assert.deepEqual(rows.map(r=>[r.source,r.service,r.inquiries,r.currentlyPaidInFull]),[
    ['google','rueckruf',1,0],['google','seniorenumzug',1,1]
  ]);
  assert.equal(store.paidOrders()[0].service,'seniorenumzug');
  assert.throws(()=>validate({...input,requestedService:'rueckruf'}));
  assert.throws(()=>validate({...input,requestedService:'unsupported'}));
});
test('receipts, contact grouping, outcomes, reporting periods and deletion',t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  const first=validate(sample()),now=Date.parse('2026-11-19T23:30:00Z');
  const receipt=store.submit(first,now);
  assert.equal(receipt.created,true);
  assert.equal(store.submit(first,now+1).created,false);
  assert.throws(()=>store.submit({...first,details:'other'},now+1),e=>e.status===409);
  const repeat=store.submit({...first,requestId:randomUUID()},now+40);
  assert.deepEqual(repeat,{reference:receipt.reference,created:false});
  const next=store.submit({...first,requestId:randomUUID(),details:'Andere Fahrt'},now+3600000);
  assert.notEqual(next.reference,receipt.reference);
  assert.throws(()=>store.stage(receipt.reference,'completed',498,100),e=>e.status===409);
  bookTestOffer(store,receipt.reference,498,300.09,now+100);
  store.stage(receipt.reference,'completed',498,300.09,now+100);
  store.stage(receipt.reference,'completed',498,300.09,now+100);
  assert.throws(()=>store.stage(receipt.reference,'completed',497,300.09),e=>e.status===409);
  store.stage(next.reference,'lost',null,null,now+100);
  store.landing('/umzug/','google',now);
  const report=store.report('2026-11-20','2026-11-20');
  assert.equal(report.summary.inquiries,2);assert.equal(report.summary.distinctContactDetails,1);
  assert.equal(report.channelCohorts[0].qualified,1);
  assert.equal(report.channelServiceCohorts[0].realizedContributionBeforeAdsEUR,118.4);
  assert.equal(report.channelServiceCohorts[0].bookings,1);
  assert.equal(report.channelServiceCohorts[0].completed,1);
  assert.equal(report.aggregatePageRequests[0].hits,1);
  assert.equal(store.report('2026-11-19','2026-11-19').summary.inquiries,0);
  assert.equal(JSON.stringify(report).includes('example.invalid'),false);
  assert.equal(store.get(receipt.reference).events.length,5);
  assert.equal(store.prune(90,now+89*86400000),0);
  assert.equal(store.prune(90,now+92*86400000),1);
  assert.equal(store.get(receipt.reference).status,'completed');
});
test('notify once with no PII, retry after temporary failure, erase cascades',async t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  assert.throws(()=>notificationSettings({OPS_NOTIFY_URL:'https://example.invalid'}));
  const configuration={url:'https://example.invalid',token:'test-value'};
  const lead=validate(sample());store.submit(lead,0,true);store.submit(lead,0,true);
  let now=1,calls=0;
  const send=async(url,options)=>{
    calls++;
    const msg=JSON.parse(options.body);
    assert.deepEqual(Object.keys(msg).sort(),['event','reference','service']);
    assert.equal(options.headers['Idempotency-Key'],msg.reference);
    return {ok:calls>1};
  };
  await deliverDue(store,configuration,{send,clock:()=>now});
  assert.equal(calls,1);
  await deliverDue(store,configuration,{send,clock:()=>now});
  assert.equal(calls,1);
  now=31000;await deliverDue(store,configuration,{send,clock:()=>now});
  assert.equal(calls,2);
  assert.equal(store.report().notificationQueue.awaitingDelivery,0);
});
test('daily snapshot is aggregate-only and stable across restarts',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'frankenpackt-aggregate-'));
  const store=openStore(':memory:');t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});
  const at=Date.parse('2026-11-19T23:10:00Z');
  const lead=validate(sample());
  const record=store.submit(lead,at-86400000);
  assert.equal(saveDailyReport(store,dir,at),true);
  assert.equal(saveDailyReport(store,dir,at+10000),false);
  const file=await readFile(path.join(dir,'berichte','2026-11-20.json'),'utf8');
  const report=JSON.parse(file);
  assert.deepEqual(report.inquiryCohortDatesBerlin,{start:'2026-10-21',end:'2026-11-19'});
  assert.equal(report.summary.inquiries,1);
  for(const val of [record.reference,lead.contact,lead.name])assert.equal(file.includes(val),false);
});
test('live and preview HTTP, canonical URL, restricted contact data, backup and restart',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'frankenpackt-check-'));
  const publicDir=path.join(dir,'public'),dataDir=path.join(dir,'data');
  await mkdir(publicDir);
  const html='<!doctype html><html><head><meta name="robots" content="noindex,follow"></head></html>';
  await writeFile(path.join(publicDir,'index.html'),html);
  t.after(()=>rm(dir,{recursive:true,force:true,maxRetries:6,retryDelay:80}));
  async function start(env){
    const server=startServer({env,publicDir,port:0});
    await once(server,'listening');
    const base='http://127.0.0.1:'+server.address().port;
    const close=async()=>{const done=once(server,'close');server.close();server.closeAllConnections();await done;};
    return {base,close,post:async(data,opts={})=>fetch(base+'/api/leads',{method:'POST',headers:{'content-type':'application/json',...opts},body:JSON.stringify(data)})};
  }
  assert.throws(()=>configuration({SITE_MODE:'live'}),/Missing live settings/);
  const preview=await start({});
  try{
    assert.equal((await (await fetch(preview.base+'/api/config')).json()).leadIntake,false);
    const res=await preview.post(sample());assert.equal(res.status,200);assert.equal((await res.json()).mode,'preview');
    assert.equal(res.headers.get('set-cookie'),null);assert.equal(res.headers.get('x-robots-tag'),'noindex, nofollow');
  }finally{await preview.close();}
  assert.deepEqual(await readdir(dir),['public']);
  const env={SITE_MODE:'live',PUBLIC_ORIGIN:'https://example.invalid',LEAD_DATA_DIR:dataDir,OPERATOR_NAME:'Testbetrieb',LEGAL_ADDRESS:'Musterweg 1',CONTACT_PHONE:'+49 911 1234567',CONTACT_EMAIL:'inbox@example.invalid'};
  const live=await start(env),data=sample();let reference;
  try{
    const config=await (await fetch(live.base+'/api/config')).json();assert.equal(config.leadIntake,true);
    for (const [requestPath,page] of [['/index.html','/'],['/anfrage','/anfrage/'],['/sofa-entsorgen/index.html','/sofa-entsorgen/']]) {
      const query='?leistung=entsorgung&thema=sofa-entsorgen';
      const redirect=await fetch(live.base+requestPath+query,{method:'HEAD',redirect:'manual'});
      assert.equal(redirect.status,308);
      assert.equal(redirect.headers.get('location'),env.PUBLIC_ORIGIN+page+query);
    }
    const landing=await fetch(live.base+'/?src=google&gclid=do-not-keep');assert.equal(landing.status,200);
    assert.match(await landing.text(),/canonical/);
    assert.equal((await live.post(data,{origin:'https://cross-site.invalid'})).status,403);
    assert.equal((await live.post(data,{'content-type':'text/plain'})).status,415);
    const res=await live.post(data,{origin:'https://example.invalid'});
    assert.equal(res.status,201);reference=(await res.json()).reference;
    assert.equal((await live.post(data)).status,200);
    assert.equal((await fetch(live.base+'/api/admin')).status,404);
    assert.equal((await fetch(live.base+'/lib/leads.mjs')).status,404);
  }finally{await live.close();}
  const restarted=await start(env);
  try{const res=await restarted.post(data);assert.equal(res.status,200);assert.equal((await res.json()).reference,reference);}
  finally{await restarted.close();}
  const sqliteFile=path.join(dataDir,'leads.sqlite'),backupFile=path.join(dir,'backup.sqlite');
  const store=openStore(sqliteFile);try{
    assert.equal(store.report().aggregatePageRequests[0].hits,1);
    await store.backup(backupFile);
    assert.equal(store.erase(reference),1);
  }finally{store.close();}
  const restored=openStore(backupFile);
  try{assert.equal(restored.get(reference).status,'new');}finally{restored.close();}
  assert.equal((await readFile(sqliteFile)).includes(Buffer.from('do-not-keep')),false);
});
