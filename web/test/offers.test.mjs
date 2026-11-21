import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore,validate} from '../lib/leads.mjs';
import { acceptance } from '../test-support/booking.mjs';

function newInquiry(db){
  const lead=validate({requestId:randomUUID(),source:'google',service:'umzug',contactMethod:'phone',
    phone:'09110000000',name:'Lokaler Test',zipFrom:'90453'});
  return db.submit(lead).reference;
}

test('offer versions, retries, margin calculation and actual fulfillment amounts stay separate', t=>{
  const db=openStore(':memory:');t.after(()=>db.close());
  const ref=newInquiry(db);
  assert.throws(()=>db.quote(ref,1,'789.00','412.25'),e=>e.status===409);
  db.stage(ref,'qualified');
  assert.throws(()=>db.quote(ref,2,'789.00','412.25'),e=>e.status===409);
  const first=db.quote(ref,1,'789.00','412.25');
  assert.equal(first.quote.expectedContributionBeforeAdsEUR,250.78);
  assert.equal(first.quote.maxAcquisitionSpendEUR,118.17);
  assert.equal(first.quote.planningAssumptions.targetMarginOnNetRevenuePercent,20);
  assert.equal(db.get(ref).status,'quoted');
  const second=db.quote(ref,2,'498');
  assert.equal(second.quote.expectedContributionBeforeAdsEUR,null);
  assert.equal(second.quote.maxAcquisitionSpendEUR,null);
  assert.equal(db.quote(ref,1,789,412.25).created,false);
  assert.throws(()=>db.quote(ref,1,790,412.25),e=>e.status===409);
  assert.equal(db.get(ref).quote.revision,2);
  assert.equal(db.get(ref).events.filter(e=>e.status==='quoted').length,1);
  assert.equal(db.quote(ref,3,498,300.09).quote.maxAcquisitionSpendEUR,34.70);
  assert.equal(db.quote(ref,4,498,450).quote.maxAcquisitionSpendEUR,0);
  assert.equal(db.get(ref).gross_cents,null);
  db.quote(ref,5,498,300.09);
  db.book(ref,acceptance(5));
  assert.throws(()=>db.quote(ref,6,500,300),e=>e.status===409);
  db.stage(ref,'completed',480,299);
  assert.throws(()=>db.quote(ref,6,500,300),e=>e.status===409);
  assert.equal(db.quote(ref,2,498).created,false);
  assert.equal(db.get(ref).gross_cents,48000);
  assert.equal(db.get(ref).quote.quotedGrossEUR,498);
  assert.equal(db.get(ref).collected_cents,0);
});

test('loss reason validates atomically and supports a previously closed lead with unknown reason',t=>{
  const db=openStore(':memory:');t.after(()=>db.close());
  const ref=newInquiry(db);
  assert.equal(db.get(ref).lossReason,null);
  assert.throws(()=>db.loss(ref,'customer free text'),e=>e.status===400);
  assert.equal(db.get(ref).status,'new');
  db.stage(ref,'lost');
  assert.equal(db.loss(ref,'timing').created,true);
  assert.equal(db.loss(ref,'timing').created,false);
  assert.throws(()=>db.loss(ref,'scope'),e=>e.status===409);
  assert.equal(db.get(ref).lossReason.code,'timing');
  assert.equal(db.get(ref).events.filter(e=>e.status==='lost').length,1);
});

test('booking requires evidenced acceptance of the current costed quote, explicit date and scope',t=>{
  const db=openStore(':memory:');t.after(()=>db.close());
  const ref=newInquiry(db),evidence=acceptance();
  db.stage(ref,'qualified');
  assert.throws(()=>db.stage(ref,'booked'),e=>e.status===409);
  db.quote(ref,1,498);
  assert.throws(()=>db.book(ref,{...evidence,exceptionReason:'Dokumentierte Ausnahme'}),e=>e.status===409);
  db.quote(ref,2,119,120);
  assert.throws(()=>db.book(ref,evidence),e=>e.status===409);
  const latest={...evidence,revision:2};
  for(const invalid of [{scope:''},{customerAccepted:false},{acceptanceRef:' '},{serviceDate:'2026-02-30'},
    {acceptanceChannel:'unknown'},{receiptBody:'Freitext'}]){
    assert.throws(()=>db.book(ref,{...latest,...invalid}),e=>e.status===400);
  }
  assert.throws(()=>db.book(ref,latest),e=>e.status===409);
  assert.equal(db.get(ref).status,'quoted');
  assert.equal(db.get(ref).bookingEvidence,null);
  const exception={...latest,exceptionReason:'Kulanz nach dokumentierter Beschwerde'};
  assert.equal(db.book(ref,exception).created,true);
  assert.equal(db.get(ref).bookingEvidence.acceptanceRef,'TEST-ANNAHME-01');
  assert.equal(db.get(ref).bookingEvidence.exceptionReason,exception.exceptionReason);
  assert.equal(db.get(ref).quote.expectedContributionBeforeAdsEUR,-20);
  db.stage(ref,'booked');
  db.stage(ref,'completed',119,115);
  assert.equal(db.book(ref,exception).created,false);
  assert.throws(()=>db.book(ref,{...exception,scope:'Anderer Leistungsumfang'}),e=>e.status===409);
  assert.equal(db.get(ref).events.filter(e=>e.status==='booked').length,1);
});

test('a booking recorded before the evidence schema can still be fulfilled and reconciled',t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'fp-legacy-book-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true,maxRetries:4}));
  const file=path.join(dir,'legacy.sqlite');
  const seed=openStore(file),ref=newInquiry(seed);seed.close();
  const old=new DatabaseSync(file);
  old.prepare("UPDATE leads SET status='booked' WHERE ref=?").run(ref);
  old.prepare("INSERT INTO events VALUES(?,'booked',?)").run(ref,'2026-11-19T09:00:00Z');
  old.exec('DROP TABLE booking_evidence');old.close();
  const db=openStore(file);
  try{
    assert.equal(db.get(ref).bookingEvidence,null);
    db.stage(ref,'booked');
    db.stage(ref,'completed',498,299);
    db.payment(ref,'BELEG-ALT','payment',498);
    assert.equal(db.paidOrders()[0].currentlyPaidInFull,1);
    assert.throws(()=>db.book(ref,acceptance()),e=>e.status===409);
  }finally{db.close();}
});
