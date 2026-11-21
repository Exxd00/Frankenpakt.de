import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {openStore,validate} from '../lib/leads.mjs';

test('operator worklist shows only open, evidenced callback requests, oldest first',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fp-callbacks-'));
  const dbFile=path.join(dir,'leads.sqlite');
  let store=openStore(dbFile);
  t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true,maxRetries:5});});
  const start=Date.UTC(2026,10,19,10);
  function request(name,fields={},entry='web',offset=0){
    const validated=validate({name,requestId:randomUUID(),service:'rueckruf',phone:'09110000000',
      contactMethod:'phone',source:'google',...fields});
    return store.submit(validated,start+offset,false,entry).reference;
  }
  const later=request('Kurzformular',{timeframe:'Ab 15 Uhr'},'web',1000);
  const first=request('Umzugsformular',{service:'umzug',zipFrom:'90453',timeframe:'Anfang Dezember'});
  const ended=request('Geschlossen');
  store.stage(ended,'lost');
  request('E-Mail',{service:'umzug',zipFrom:'90453',contactMethod:'email',email:'probe@example.invalid'});
  request('Manuell',{},'manual');
  const duplicate=request('Folgeanfrage');
  store.link(duplicate,first,'Bestätigter Umzug');
  store.close();
  store=openStore(dbFile);
  const rows=store.callbacks();
  assert.deepEqual(rows.map(r=>r.ref),[first,later]);
  assert.equal(rows[0].name,'Umzugsformular');
  assert.equal(rows[0].phone,'+499110000000');
  assert.equal(rows[0].callbackWindow,'');
  assert.equal(rows[0].moveWindow,'Anfang Dezember');
  assert.equal(rows[1].callbackWindow,'Ab 15 Uhr');
  assert.equal(rows[1].moveWindow,'');
  assert.equal(rows[1].service,'rueckruf');
  store.confirmContact(first,'callback_completed');
  store.confirmContact(first,'callback_completed');
  assert.deepEqual(store.callbacks().map(r=>r.ref),[later]);
  assert.ok(!JSON.stringify(store.report()).includes(rows[0].phone));
});
