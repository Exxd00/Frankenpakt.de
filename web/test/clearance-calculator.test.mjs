import test from 'node:test';
import assert from 'node:assert/strict';
import {clearanceCalculator} from '../clearance-calculator.mjs';
import {calculateEstimate, inquiryEstimate} from '../public/assets/clearance-calculator.js';

test('external prices stand on their own and never serve as a price for team work', () => {
  for (const [disposal, cents] of [['container-2',30107],['container-4-5',47005],['container-7',64260]]) {
    const external = calculateEstimate({help:'none',disposal,containerEligible:true});
    assert.equal(external.totalCents,cents);
    assert.equal(external.service,'entsorgung');
    const withTeam = calculateEstimate({help:'team',disposal,containerEligible:true});
    assert.equal(withTeam.totalCents,null);
    assert.deepEqual(withTeam.lines.map(line => line.cents),[null,cents]);
    assert.equal(calculateEstimate({help:'team',disposal,containerEligible:false}).lines.at(-1).cents,null);
    assert.equal(calculateEstimate({help:'none',disposal,containerEligible:false}).totalCents,null);
  }
  assert.equal(calculateEstimate({help:'team',disposal:'none'}).service,'entruempelung');
  assert.equal(calculateEstimate({help:'none',disposal:'asn',asnEligible:true}).totalCents,0);
  for (const [help,disposal] of [['none','asn'],['none','none'],['team','individual'],['unknown','none']]) {
    assert.equal(calculateEstimate({help,disposal}).totalCents,null);
  }
});

test('inquiry receives only the selected service and recomputed calculator context', () => {
  const params = new URLSearchParams({leistung:'entruempelung',hilfe:'team',entsorgungsweg:'container-4-5',container:'ja',preis:'1',name:'irrelevant'});
  const estimate = inquiryEstimate(params);
  assert.deepEqual([...estimate.summary.matchAll(/ab ([\d,]+)\s*€/g)].map(match => match[1]), ['470,05']);
  assert.match(estimate.summary,/FrankenPackt-Team.*individuelles Angebot.*Schutt Karl/);
  assert.equal(estimate.params.toString(),'hilfe=team&entsorgungsweg=container-4-5&container=ja');
  params.set('leistung','entsorgung');
  assert.equal(inquiryEstimate(params),null);
  params.set('hilfe','none');
  params.append('container','ja');
  assert.equal(inquiryEstimate(params),null);
});

test('eligible municipal pickup stays free and unpriced work keeps its price open', () => {
  const params = new URLSearchParams({leistung:'entsorgung',hilfe:'none',entsorgungsweg:'asn',asn:'ja'});
  assert.match(inquiryEstimate(params).summary,/ASN\).*kostenfrei/);
  assert.doesNotMatch(inquiryEstimate(params).summary,/€/);
  params.set('leistung','entruempelung');
  params.set('hilfe','team');
  const mixed = inquiryEstimate(params).summary;
  assert.match(mixed,/individuelles Angebot/);
  assert.match(mixed,/kostenfrei/);
  assert.doesNotMatch(mixed,/€/);
});

test('price information available without JavaScript labels all paid services with ab', () => {
  const html = clearanceCalculator();
  assert.deepEqual([...html.matchAll(/ab ([\d,]+) €/g)].map(match => match[1]), ['301,07','470,05','642,60']);
  assert.equal([...html.matchAll(/€/g)].length,3);
  assert.match(html,/einmal pro Kalenderjahr kostenfrei/);
  assert.doesNotMatch(html,/one-helper|Tragehelfer|fülle selbst|Sie befüllen|Fahrzeug stellen Sie/i);
});

test('old helper links cannot recreate an offer for partial help', () => {
  for (const help of ['one-helper','individual']) {
    const query = new URLSearchParams({leistung:'entruempelung',hilfe:help,entsorgungsweg:'container-7',container:'ja'});
    assert.equal(inquiryEstimate(query),null);
  }
});
