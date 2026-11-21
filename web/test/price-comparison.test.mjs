import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonTopics, parseGrossCents, targetCents, inquiryComparison} from '../public/assets/price-comparison.js';

test('German input and ungrouped decimals are parsed to whole cents', () => {
  for (const [input,cents] of [
    ['80',8000],['80,5',8050],['80.50',8050],['2,01',201],
    [' 500,00 € ',50000],['1.234',123400],['1.234,56',123456],['999.999.999,99',99999999999]
  ]) assert.equal(parseGrossCents(input),cents,input);
  for (const input of [null,'','-3','3,123','90e3','1,202.11','1000000000','€80','not a number']) {
    assert.equal(parseGrossCents(input),null,String(input));
  }
});

test('targets subtract exactly two euros and never quote zero or negative amounts', () => {
  for (const [price,target] of [['80',7800],['500',49800],['56,50',5450],['2,01',1]]) {
    assert.equal(targetCents(parseGrossCents(price)),target);
  }
  for (const cents of [0,1,199,200,null,1.01,Infinity,100000000000]) assert.equal(targetCents(cents),null);
});

const defaultParams = {leistung:'entsorgung',vergleich:'sofa',vergleichcent:'8000',vergleichart:'ab'};
test('only validated context goes into the inquiry, with the target recalculated', () => {
  const request = new URLSearchParams({...defaultParams, endpreis:'1', preisziel:'0', src:'ads'});
  const result = inquiryComparison(request);
  assert.equal(result.service,'entsorgung');
  assert.deepEqual([...result.params.keys()],['vergleich','vergleichcent','vergleichart']);
  assert.match(result.summary,/Fremdpreis ab 80\s€ brutto/);
  assert.match(result.summary,/Unverbindliches Preisziel ab 78\s€/);
  assert.match(result.summary,/direkt beim Entsorger/);
  assert.match(result.summary,/Endpreis für unsere Leistungen nennen wir nach Prüfung/);
  const moving = inquiryComparison(new URLSearchParams({service:'umzug',vergleich:'umzug',vergleichcent:'50050',vergleichart:'gesamt'}));
  assert.equal(moving.service,'umzug');
  assert.match(moving.summary,/Preisziel 498,50\s€/);
  assert.doesNotMatch(moving.summary,/Entsorger/);
  const clearance = inquiryComparison(new URLSearchParams({...defaultParams,vergleich:'entruempelung',leistung:'entruempelung'}));
  assert.equal(clearance.service,'entruempelung');
  const basement = inquiryComparison(new URLSearchParams({...defaultParams,vergleich:'keller',leistung:'entruempelung',vergleichcent:String(comparisonTopics.get('keller').startEuros * 100)}));
  assert.equal(basement.service,'entruempelung');
  assert.match(basement.summary,/Kellerabteil bis 6 m² räumen/);
  assert.match(basement.summary,/Preisziel ab 148\s€/);
  const smallMove = inquiryComparison(new URLSearchParams({service:'umzug',vergleich:'kleinumzug',vergleichcent:String(comparisonTopics.get('kleinumzug').startEuros * 100),vergleichart:'ab'}));
  assert.equal(smallMove.service,'umzug');
  assert.match(smallMove.summary,/Preisziel ab 298\s€/);
});

test('a mismatched service, duplicate input or invalid money cannot create inquiry context', () => {
  for (const override of [
    {leistung:'umzug'},{vergleich:'unknown'},{service:'umzug'},{vergleichart:'garantiert'},
    {vergleichcent:'0'},{vergleichcent:'200'},{vergleichcent:'0008000'},
    {vergleichcent:'8000.0'},{vergleichcent:'100000000000'}
  ]) assert.equal(inquiryComparison(new URLSearchParams({...defaultParams,...override})),null);
  for (const [key,value] of Object.entries(defaultParams)) {
    const duplicate = new URLSearchParams(defaultParams);
    duplicate.append(key,value);
    assert.equal(inquiryComparison(duplicate),null);
    const incomplete = new URLSearchParams(defaultParams);
    incomplete.delete(key);
    assert.equal(inquiryComparison(incomplete),null);
  }
});
