import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonTopics, inquiryComparison} from '../public/assets/price-comparison.js';
import {priceComparison} from '../price-comparison.mjs';

test('the selected scenario supplies its own estimate and scope', () => {
  for (const [key,service,amount,scope] of [
    ['sofa','entsorgung',78,/einzelnen Sofas/],
    ['keller','entruempelung',148,/bis 6 m²/],
    ['kleinumzug','umzug',298,/10–20 m³/]
  ]) {
    const params = new URLSearchParams({[service === 'umzug' ? 'service' : 'leistung']:service, vorhaben:key});
    const estimate = inquiryComparison(params);
    assert.equal(estimate.service,service);
    assert.equal(estimate.estimatedCents,amount*100);
    assert.deepEqual([...estimate.params],[['vorhaben',key]]);
    assert.match(estimate.summary,new RegExp('ab '+amount+'\\s€ brutto'));
    assert.match(estimate.summary,scope);
    if (service !== 'umzug') assert.match(estimate.summary,/direkt beim Entsorger/);
  }
});

test('prices and kinds supplied via old or altered links cannot change the rate', () => {
  const current = inquiryComparison(new URLSearchParams({leistung:'entsorgung',vorhaben:'sofa'}));
  for (const key of ['vorhaben','vergleich']) {
    const query = new URLSearchParams({leistung:'entsorgung',[key]:'sofa',vergleichcent:'99999999',vergleichart:'gesamt',preisziel:'1',endpreis:'9'});
    query.append('vergleichcent','250');
    const actual = inquiryComparison(query);
    assert.equal(actual.summary,current.summary);
    assert.equal(actual.estimatedCents,7800);
    assert.deepEqual([...actual.params],[['vorhaben','sofa']]);
  }
  for (const raw of [
    'service=umzug&vorhaben=sofa','leistung=entsorgung&service=umzug&vorhaben=sofa',
    'leistung=entsorgung&vorhaben=sofa&vorhaben=keller','leistung=entsorgung&vorhaben=sofa&vergleich=keller',
    'leistung=entsorgung&vorhaben=other','leistung=entsorgung&vergleichcent=8000',
    'vorhaben=sofa','leistung=entsorgung&leistung=entsorgung&vorhaben=sofa'
  ]) assert.equal(inquiryComparison(new URLSearchParams(raw)),null,raw);
});

test('broader projects point to the appropriate calculator and carry no invented estimate', () => {
  for (const [service,route] of [['entsorgung','#raeumungsrechner'],['entruempelung','#raeumungsrechner'],['umzug','#preisfinder']]) {
    const params = new URLSearchParams({[service === 'umzug'?'service':'leistung']:service,vergleich:service,vergleichcent:'50000',vergleichart:'ab'});
    const result = inquiryComparison(params);
    assert.equal(result.estimatedCents,null);
    assert.equal(result.service,service);
    assert.doesNotMatch(result.summary,/€|Preisziel|Fremdpreis/);
    assert.equal(comparisonTopics.get(service).route,route);
  }
});

test('the customer can choose a service without any control for setting a price', () => {
  const html = priceComparison();
  assert.equal((html.match(/<select\b/g) || []).length,1);
  assert.match(html,/id="richtpreis"/);
  assert.match(html,/id="preisvergleich"/);
  assert.doesNotMatch(html,/<input\b|<textarea\b|Preisziel|Fremdpreis|Angebot eines anderen|Art des Preises|2\s*€|Bruttopreis eines/);
  for (const price of [78,148,298]) assert.match(html,new RegExp('ab '+price+'\\s€ brutto'));
});
