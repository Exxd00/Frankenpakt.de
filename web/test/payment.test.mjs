import test from 'node:test';
import {bookTestOffer} from '../test-support/booking.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openStore,validate } from '../lib/leads.mjs';

function intake(store,details='Umzug A',source='google',method='phone'){
 return store.submit(validate({requestId:randomUUID(),name:'Testperson',phone:'0911 1234567',email:'test@example.invalid',zipFrom:'90453',service:'umzug',contactMethod:method,details,source})).reference;
}
test('operator links verified cross-channel request, same phone alone stays separate',t=>{
 const store=openStore(':memory:');t.after(()=>store.close());
 const canonical=intake(store),other=intake(store,'Andere Fahrt');
 const followUp=intake(store,'Bezug zu vorhandener Angebotsnummer','kleinanzeigen','email');
 assert.equal(store.list().length,3);
 assert.equal(store.report().summary.distinctContactDetails,2);
 assert.equal(store.link(followUp,canonical,'Gleiche Angebotsnummer bestätigt').created,true);
 assert.equal(store.link(followUp,canonical,'Wiederholung').created,false);
 assert.equal(store.get(followUp).status,'linked');
 assert.equal(store.report().channelCohorts.find(x=>x.source==='kleinanzeigen').verifiedLinkedInquiries,1);
 assert.throws(()=>store.stage(followUp,'booked'));
 assert.equal(store.get(other).status,'new');
 assert.equal(store.unlink(followUp).changed,true);
 assert.equal(store.get(followUp).status,'new');
 bookTestOffer(store,other);
 store.stage(other,'lost');
 assert.throws(()=>store.link(other,canonical,'Schon gebuchter Auftrag'),e=>e.status===409);
});
test('one fully paid event per fulfilled order with partial payments, replay and refunds',t=>{
 const store=openStore(':memory:');t.after(()=>store.close());
 const ref=intake(store);
 assert.throws(()=>store.payment(ref,'B-100','payment',100));
 bookTestOffer(store,ref);
 store.payment(ref,'B-001','payment',100);
 store.stage(ref,'completed',498,300.09);
 let row=store.report().channelCohorts[0];
 assert.equal(row.completed,1);assert.equal(row.bookings,1);
 assert.equal(row.currentlyPaidInFull,0);assert.equal(row.everPaidOrders,0);
 store.payment(ref,'B-002','payment',398);
 assert.equal(store.payment(ref,'B-002','payment',398).created,false);
 assert.throws(()=>store.payment(ref,'B-002','payment',300),e=>e.status===409);
 row=store.report().channelCohorts[0];
 assert.equal(row.currentlyPaidInFull,1);assert.equal(row.everPaidOrders,1);assert.equal(row.receivedLessRefundsEUR,498);
 assert.equal(row.fullyPaidContributionBeforeAdsEUR,118.4);
 store.payment(ref,'B-003','refund',198);
 assert.equal(store.payment(ref,'B-003','refund',198).created,false);
 assert.throws(()=>store.payment(ref,'B-004','refund',301),e=>e.status===409);
 row=store.report().channelCohorts[0];
 assert.equal(row.currentlyPaidInFull,0);assert.equal(row.everPaidOrders,1);
 assert.equal(row.refundsEUR,198);assert.equal(row.receivedLessRefundsEUR,300);
 assert.equal(row.collectedContributionBeforeAdsEUR,-47.99);
 assert.equal(store.paidOrders()[0].currentlyPaidInFull,0);
 store.payment(ref,'B-005','payment',198);
 const events=store.paidOrders();
 assert.equal(events.length,1);assert.equal(events[0].orderId,ref);assert.equal(events[0].currentlyPaidInFull,1);
 assert.equal(store.get(ref).payments.length,4);
});
test('full prepayment becomes a paid order only after the job is fulfilled',t=>{
 const store=openStore(':memory:');t.after(()=>store.close());
 const ref=intake(store);
 bookTestOffer(store,ref);
 store.payment(ref,'B-VORAB','payment',498);
 assert.equal(store.paidOrders().length,0);
 assert.equal(store.report().channelCohorts[0].currentlyPaidInFull,0);
 store.stage(ref,'completed',498,300.09);assert.equal(store.paidOrders().length,1);
});
