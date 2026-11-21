import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import {reviewAdSpend} from '../lib/ad-review.mjs';
import {openStore,validate} from '../lib/leads.mjs';
import {bookTestOffer} from '../test-support/booking.mjs';

test('ad review matches variant and Berlin inquiry date, subtracts real spend and respects refunds',t=>{
  const db=openStore(':memory:');
  t.after(()=>db.close());
  const day='2026-11-21',when=Date.parse('2026-11-20T23:30:00Z');
  const variant='privatumzug-team';
  function completed(name,adVariant,gross,cost,received,created=when){
    const input=validate({name,requestId:randomUUID(),service:'umzug',zipFrom:'90453',source:'google',
      contactMethod:'phone',phone:'09110000000',adVariant});
    const {reference}=db.submit(input,created,false,'web');
    bookTestOffer(db,reference,gross,cost,created);
    db.stage(reference,'completed',gross,cost,created);
    db.payment(reference,'payment-'+name,'payment',received,created);
    return reference;
  }
  const paid=completed('voll',variant,119,20,119);
  completed('teil',variant,238,40,119);
  completed('andere','seniorenumzug-team',119,10,119);
  completed('unbekannt',undefined,119,10,119);
  completed('vortag',variant,119,10,119,when-3600000);
  let review=reviewAdSpend(db,day,day,variant,'25.55');
  assert.equal(review.attributedInquiries,2);
  assert.equal(review.currentlyFullyPaidCompletedJobs,1);
  assert.equal(review.costPerFullyPaidCompletedJobEUR,25.55);
  assert.equal(review.fullyPaidContributionAfterAdsEUR,54.45);
  assert.equal(review.collectedContributionAfterAdsEUR,114.45);
  assert.equal(reviewAdSpend(db,day,day,variant,'0').costPerFullyPaidCompletedJobEUR,0);
  db.payment(paid,'refund-voll','refund',119,when+5000);
  review=reviewAdSpend(db,day,day,variant,'25.55');
  assert.equal(review.currentlyFullyPaidCompletedJobs,0);
  assert.equal(review.costPerFullyPaidCompletedJobEUR,null);
  assert.equal(review.fullyPaidContributionAfterAdsEUR,-25.55);
  assert.equal(review.collectedContributionAfterAdsEUR,14.45);
});

test('ad review validates real dates, exact variant and nonnegative spend, including empty cohorts',t=>{
  const db=openStore(':memory:');
  t.after(()=>db.close());
  const variant='seniorenumzug-team',leap='2028-02-29';
  for(const day of ['',undefined,'0000-01-01','2026-02-29','2026-11-31','2026-13-01','21.11.2026']){
    assert.throws(()=>reviewAdSpend(db,day,leap,variant,'0'));
  }
  assert.throws(()=>reviewAdSpend(db,'2028-03-01',leap,variant,'0'));
  assert.throws(()=>reviewAdSpend(db,leap,leap,'unbekannt','118'));
  for(const amount of [undefined,'','-1','5.123','nicht bekannt']){
    assert.throws(()=>reviewAdSpend(db,leap,leap,variant,amount));
  }
  const none=reviewAdSpend(db,leap,leap,variant,'0');
  assert.equal(none.collectedContributionAfterAdsEUR,0);
  assert.equal(none.costPerFullyPaidCompletedJobEUR,null);
  assert.equal(reviewAdSpend(db,leap,leap,variant,'118').collectedContributionAfterAdsEUR,-118);
});
