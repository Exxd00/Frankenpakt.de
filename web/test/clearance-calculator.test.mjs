import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEstimate, inquiryEstimate} from '../public/assets/clearance-calculator.js';

test('known gross amounts are added in cents and external amounts require a qualifying selection', () => {
  for (const [disposal, cents] of [['container-2',30107],['container-4-5',47005],['container-7',64260]]) {
    const complete = calculateEstimate({help:'one-helper',disposal,containerEligible:true});
    assert.equal(complete.totalCents,16100+cents);
    assert.equal(complete.title,'Geschätzte Gesamtkosten');
    const unconfirmed = calculateEstimate({help:'one-helper',disposal,containerEligible:false});
    assert.equal(unconfirmed.totalCents,16100);
    assert.equal(unconfirmed.title,'Bekannter Teilbetrag');
  }
  assert.equal(calculateEstimate({help:'none',disposal:'asn',asnEligible:true}).totalCents,0);
  const halfKnown = calculateEstimate({help:'individual',disposal:'asn',asnEligible:true});
  assert.equal(halfKnown.totalCents,null);
  assert.equal(halfKnown.title,'Gesamtpreis noch offen');
  assert.equal(halfKnown.lines.find(line => line.label.includes('ASN')).cents,0);
  for (const [help,disposal] of [['none','asn'],['none','none'],['individual','individual'],['unknown','none']]) {
    assert.equal(calculateEstimate({help,disposal}).totalCents,null);
  }
});

test('inquiry receives only the selected service and recomputed calculator context', () => {
  const params = new URLSearchParams({leistung:'entruempelung',hilfe:'one-helper',entsorgungsweg:'container-4-5',container:'ja',preis:'1',name:'irrelevant'});
  const estimate = inquiryEstimate(params);
  assert.match(estimate.summary,/631,05/);
  assert.equal(estimate.params.toString(),'hilfe=one-helper&entsorgungsweg=container-4-5&container=ja');
  params.set('leistung','entsorgung');
  assert.equal(inquiryEstimate(params),null);
  params.set('hilfe','none');
  params.append('container','ja');
  assert.equal(inquiryEstimate(params),null);
});
