import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openStore,validate} from '../lib/leads.mjs';
import {deliverStaffMail,staffMailSettings} from '../lib/mail-delivery.mjs';
import {configuration,startServer} from '../server.mjs';

const mailEnv = {OPS_MAIL_FROM:'anfrage@example.invalid',OPS_MAIL_TO:'dispo@example.invalid',OPS_MAIL_API_KEY:'test-mail-key'};
const settings=staffMailSettings(mailEnv);
const inquiry=()=>({service:'umzug',requestId:randomUUID(),name:'Beispielperson',contactMethod:'email',
  email:'privat@example.invalid',zipFrom:'90453',zipTo:'90402',details:'Kartons und ein Tisch',source:'direkt'});
const accepted=()=>Response.json({id:'test-receipt'});

test('mail is opt-in and uses exactly one configured mailbox and a header-safe token',()=>{
  assert.equal(staffMailSettings({}),null);
  assert.equal(configuration({...mailEnv,SITE_MODE:'preview'}).public.staffMailEnabled,false);
  for (const overrides of [{OPS_MAIL_TO:''},{OPS_MAIL_TO:'a@x.example,b@y.example'},
    {OPS_MAIL_FROM:'Team <team@example.invalid>'},{OPS_MAIL_TO:'team@example.invalid\n'},
    {OPS_MAIL_API_KEY:'broken\r\nheader'}]) assert.throws(()=>staffMailSettings({...mailEnv,...overrides}));
});

test('independent email queue leases and retries the same payload and key across restarts',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fp-mail-'));
  const file=path.join(dir,'leads.sqlite');
  let store=openStore(file);
  t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});
  const lead=validate(inquiry()),ref=store.submit(lead,0,true,'web',settings.route).reference;
  assert.equal(store.submit(lead,1,true,'web',settings.route).created,false);
  const attempts=[];
  async function send(url,opts) {
    attempts.push({url,id:opts.headers['Idempotency-Key'],body:opts.body});
    if(attempts.length===1) throw new Error('Connection lost');
    return accepted();
  }
  await Promise.all([1,2].map(()=>deliverStaffMail(store,settings,{send,clock:()=>100})));
  assert.equal(attempts.length,1);
  store.close();store=openStore(file);
  const different=staffMailSettings({...mailEnv,OPS_MAIL_TO:'another@example.invalid'});
  await deliverStaffMail(store,different,{send,clock:()=>31000});
  assert.equal(store.mail.list(different.route,31000)[0].state,'check_mailbox');
  assert.equal(attempts.length,1);
  await deliverStaffMail(store,settings,{send,clock:()=>31000});
  assert.deepEqual(attempts[0],attempts[1]);assert.equal(attempts[0].id,'inquiry/'+ref);
  assert.equal(attempts[0].url,'https://api.resend.com/emails');
  const body=JSON.parse(attempts[0].body);
  assert.equal(body.from,'FrankenPackt <anfrage@example.invalid>');assert.deepEqual(body.to,[mailEnv.OPS_MAIL_TO]);
  assert.match(body.html,/privat@example\.invalid/);assert.match(body.text,/privat@example\.invalid/);
  assert.doesNotMatch(body.subject,/Beispielperson|privat@example\.invalid/);
  assert.equal(store.mail.count(),0);assert.equal(store.claimNotice(31000).ref,ref);
});

test('unknown delivery after idempotency window requires review, erased leads drop pending mail',async t=>{
  const store=openStore(':memory:');t.after(()=>store.close());
  const ref=store.submit(validate(inquiry()),0,false,'web',settings.route).reference;
  let calls=0;
  const send=async()=>{calls++;return Response.json({});};
  await deliverStaffMail(store,settings,{send,clock:()=>100});
  const later=25*3600000;
  await deliverStaffMail(store,settings,{send,clock:()=>later});
  assert.equal(calls,1);
  assert.equal(store.mail.list(settings.route,later)[0].state,'check_provider');
  assert.equal(store.erase(ref),1);assert.equal(store.mail.count(),0);
});

test('live HTTP inquiry and short callback each queue one email from their stored record',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fp-mail-http-')),sent=[];
  const env={...mailEnv,SITE_MODE:'live',PUBLIC_ORIGIN:'https://example.invalid',LEAD_DATA_DIR:dir,
    OPERATOR_NAME:'Testbetrieb',LEGAL_ADDRESS:'Beispiel 1',CONTACT_PHONE:'0911123456',CONTACT_EMAIL:'public@example.invalid'};
  const server=startServer({port:0,env,sendStaffMail:async(url,opts)=>{sent.push(JSON.parse(opts.body));return accepted();}});
  await once(server,'listening');
  t.after(async()=>{const done=once(server,'close');server.close();server.closeAllConnections();await done;await rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  const post=body=>fetch(base+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json',Origin:env.PUBLIC_ORIGIN},body:JSON.stringify(body)});
  const config=JSON.stringify(await (await fetch(base+'/api/config')).json());
  assert.match(config,/"staffMailEnabled":true/);assert.doesNotMatch(config,/dispo@|test-mail-key/);
  const full=inquiry();assert.equal((await post(full)).status,201);assert.equal((await post(full)).status,200);
  const callback={service:'rueckruf',requestedService:'entruempelung',requestId:randomUUID(),name:'Beispiel',contactMethod:'phone',phone:'0911 1234567',timeframe:'Morgen vormittags'};
  assert.equal((await post(callback)).status,201);
  assert.equal(sent.length,2);assert.match(sent[1].subject,/Rückruf/i);assert.match(sent[1].text,/Morgen vormittags/);
});
