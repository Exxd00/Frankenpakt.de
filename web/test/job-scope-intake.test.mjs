import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.mjs';
import { exampleJobScope } from '../test-support/job-scope.mjs';

test('a scoped inquiry reaches the private quote review with independent addresses and no automatic charge', async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'frankenpackt-scope-'));
  const env={SITE_MODE:'live',PUBLIC_ORIGIN:'https://example.invalid',LEAD_DATA_DIR:dataDir,
    OPERATOR_NAME:'Testbetrieb',LEGAL_ADDRESS:'Musterweg 1',CONTACT_PHONE:'+499111234567',CONTACT_EMAIL:'test@example.invalid'};
  const server=startServer({env,port:0});
  t.after(async()=>{
    const done=once(server,'close');server.close();server.closeAllConnections();await done;
    await rm(dataDir,{recursive:true,force:true,maxRetries:6,retryDelay:80});
  });
  await once(server,'listening');
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/leads';
  const post=payload=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',origin:env.PUBLIC_ORIGIN},body:JSON.stringify(payload)});
  const ops=(...args)=>JSON.parse(execFileSync(process.execPath,['--disable-warning=ExperimentalWarning',fileURLToPath(new URL('../ops.mjs',import.meta.url)),...args],{env:{...process.env,LEAD_DATA_DIR:dataDir},encoding:'utf8'}));
  const jobScope=exampleJobScope('umzug');
  const inquiry={requestId:randomUUID(),name:'Testperson',contactMethod:'email',email:'test@example.invalid',
    service:'umzug',details:'Preisziel 498 € zur Prüfung.',jobScope,jobContext:{service:'umzug',paket:'kompakt'},jobConditionNotes:['unbestätigt']};
  const sent=await post(inquiry);
  assert.equal(sent.status,201);
  const receipt=await sent.json();
  assert.deepEqual(Object.keys(receipt).sort(),['mode','ok','reference']);
  const saved=ops('show',receipt.reference);
  assert.equal(saved.person.zipFrom,jobScope.fields.fromZip);
  assert.equal(saved.person.zipTo,jobScope.fields.toZip);
  assert.equal(saved.person.jobScope.fields.fromFloor,jobScope.fields.fromFloor);
  assert.equal(saved.person.jobScope.fields.toFloor,jobScope.fields.toFloor);
  assert.deepEqual(JSON.parse(saved.person.jobScope.fields.items),JSON.parse(jobScope.fields.items));
  assert.match(saved.person.timeframe,/01\.03\.2027.*05\.03\.2027/);
  const summary=saved.jobScopeSummary.join('\n');
  assert.ok(summary.includes(jobScope.fields.fromZip));
  assert.ok(summary.includes(jobScope.fields.toZip));
  assert.equal(saved.gross_cents,null);
  assert.equal(saved.quote,null);
  assert.deepEqual(saved.person.jobContext,{service:'umzug',paket:'kompakt'});
  assert.ok(saved.person.jobConditionNotes.some(note=>note.includes('Erdgeschoss')));
  assert.ok(!saved.person.jobConditionNotes.includes('unbestätigt'));
  assert.equal((await post(inquiry)).status,200);
  assert.equal((await post({...inquiry,zipTo:'99999'})).status,400);
  assert.equal((await post({...inquiry,service:'entruempelung'})).status,400);
  assert.equal((await post({...inquiry,jobScope:null})).status,400);
  const invalidPostcode={...jobScope,fields:{...jobScope.fields,fromZip:'9'}};
  assert.equal((await post({...inquiry,jobScope:invalidPostcode})).status,400);
  const notes={...inquiry,requestId:randomUUID(),service:'rueckruf',requestedService:'umzug',contactMethod:'phone',phone:'0911 1234567',timeframe:'Morgen nach 14 Uhr'};
  const callback=await post(notes);
  assert.equal(callback.status,201);
  const callbackLead=ops('show',(await callback.json()).reference);
  assert.equal(callbackLead.person.timeframe,notes.timeframe);
  assert.deepEqual(callbackLead.jobScopeSummary,saved.jobScopeSummary);
  assert.ok(!JSON.stringify(ops('report')).includes(jobScope.fields.fromZip));
  assert.ok(!JSON.stringify(ops('list')).includes(jobScope.fields.fromZip));
  const clearance=exampleJobScope('entsorgung');
  const rows=Array.from({length:50},(_,i)=>({type:'furniture',quantity:'1',name:'Sessel '+(i+1)+' – '+'ü'.repeat(99),
    size:'90 × 70 × 80',weight:'30',destination:'discard'}));
  clearance.fields.items=JSON.stringify(rows);
  const disposal={...inquiry,requestId:randomUUID(),service:'entsorgung',jobScope:clearance,
    jobContext:{leistung:'entsorgung',hilfe:'none',entsorgungsweg:'asn',asn:'ja'}};
  assert.ok(Buffer.byteLength(JSON.stringify(disposal))>12*1024);
  const cleared=await post(disposal);
  assert.equal(cleared.status,201);
  const disposalLead=ops('show',(await cleared.json()).reference);
  assert.equal(disposalLead.person.zipTo,'');
  assert.equal(JSON.parse(disposalLead.person.jobScope.fields.items).length,50);
  assert.ok(disposalLead.jobScopeSummary.join('\n').includes('Entsorgung durch Dritte'));
  assert.equal(disposalLead.quote,null);
  assert.ok(disposalLead.person.jobConditionNotes.some(note=>note.includes('Entsorgungsweg')));
});
