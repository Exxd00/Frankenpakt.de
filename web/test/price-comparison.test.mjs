import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActualJob,evaluateActualJob,inquiryComparison,serviceFromQuery} from '../public/assets/actual-job.js';
import {priceComparison} from '../price-comparison.mjs';

const item = (name,quantity='1') => ({name,quantity});
const room = (name,area,fill='half') => ({name,area,fill});
const disposal = (...items) => ({service:'entsorgung',items});
const clearance = (...rooms) => ({service:'entruempelung',rooms});
const move = (overrides={}) => ({service:'umzug',rooms:'2',area:'50',volume:'15',distance:'20',...overrides});
const estimate = draft => evaluateActualJob(draft)?.estimatedCents;

test('each quick estimate carries a single nonbinding starting price into the inquiry', () => {
  for (const [job, expected] of [[disposal(item('Sofa')),'78'],[clearance(room('Keller','4')),'148'],[move(),'298']]) {
    const {summary} = evaluateActualJob(job);
    assert.match(summary, new RegExp('Unverbindlicher Richtwert ab '+expected+'\\s*€ brutto'));
    assert.equal([...summary.matchAll(/€/g)].length,1);
  }
});

test('customers name actual goods and quantities; only one usual furniture item triggers the single-item rate',()=>{
  for(const name of ['ein kleines Sofa','2-Sitzer-Sofa','Couch (3-Sitzer)','Kleiderschrank','Schrank','Esstisch','Bücherregal']) {
    assert.equal(estimate(disposal(item(name))),7800,name);
  }
  for(const job of [
    disposal(item('Sofa','2')),disposal(item('Sofa'),item('Schreibtisch')),
    disposal(item('Sofa und zwei Stühle')),disposal(item('Klavier')),disposal(item('Gefrierschrank')),disposal(item('Schrankwand'))
  ]) assert.equal(estimate(job),null);
  assert.equal(normalizeActualJob(disposal(item('  ','2'))),null);
  assert.equal(normalizeActualJob(disposal(item('Tisch','-1'))),null);
  assert.equal(normalizeActualJob(disposal(item('Tisch','1,5'))),null);
  assert.equal(normalizeActualJob(disposal()),null);
});

test('a self-described basement uses the matching bracket; no rate is extrapolated to other rooms or multiple areas',()=>{
  for(const [area,cents] of [['3',14800],['6',14800],['6,01',34800],['12',34800],['12.01',64800],['25',64800],['25.01',null]]){
    assert.equal(estimate(clearance(room('Kellerabteil',area))),cents,area);
  }
  assert.equal(estimate(clearance(room('Garage','5'))),null);
  assert.equal(estimate(clearance(room('Keller','4'),room('Keller','2'))),null);
  assert.equal(normalizeActualJob(clearance(room('Keller','5',''))),null);
  assert.equal(normalizeActualJob(clearance(room('Keller','0'))),null);
  const canonical=normalizeActualJob(clearance(room('  Dachboden ','18,50','full')));
  assert.equal(canonical.rooms[0].area,'18.5');
  assert.match(evaluateActualJob(canonical).description,/Dachboden.*18,5 m².*voll/i);
});

test('the move amount requires entered rooms, area, load volume and route inside the published scope',()=>{
  for(const values of [{},{rooms:'1',area:'60',volume:'10',distance:'50'},{rooms:'1,5',volume:'20',distance:'0'}]) {
    assert.equal(estimate(move(values)),29800);
  }
  for(const values of [{area:'60,1'},{rooms:'3'},{volume:'9,9'},{volume:'20,01'},{distance:'50,5'},
    {area:'unknown'},{distance:'unknown'},{volume:'unknown'}]) assert.equal(estimate(move(values)),null);
  assert.equal(normalizeActualJob(move({volume:''})),null);
});

test('links select a service, never invent dimensions, inventory, or a price',()=>{
  for (const [preset,service] of [['sofa','entsorgung'],['keller','entruempelung'],['kleinumzug','umzug']]) {
    const key=service==='umzug'?'service':'leistung';
    const legacy=new URLSearchParams({[key]:service,vergleich:preset,vergleichcent:'1',preisziel:'200'});
    assert.equal(serviceFromQuery(legacy),service);
    const empty=inquiryComparison(legacy);
    assert.equal(empty.estimatedCents,null);
    assert.equal(empty.params.get('vorhaben'),service);
    assert.doesNotMatch(empty.summary,/€/);
  }
  const params=new URLSearchParams({leistung:'entsorgung',vorhaben:'entsorgung',area:'6',preis:'7'});
  assert.equal(inquiryComparison(params,disposal(item('Kommode'))).estimatedCents,7800);
  assert.equal(inquiryComparison(params,clearance(room('Keller','5'))),null);
  assert.equal(inquiryComparison(new URLSearchParams('leistung=umzug&vorhaben=kleinumzug')),null);
  assert.equal(serviceFromQuery(new URLSearchParams('vorhaben=keller&vorhaben=sofa')),null);
});

test('only three general service choices are exposed; job facts and amounts start empty',()=>{
  const html=priceComparison();
  const choices=html.match(/<select id="comparison-topic"[\s\S]*?<\/select>/)[0];
  assert.equal((choices.match(/<option\b/g)||[]).length,4);
  assert.doesNotMatch(html,/vorhaben=sofa|>.*Sofa.*<|bis 6 m²|Fremdpreis|Preisziel|name="price"/);
  assert.match(html,/name="itemName"/);
  assert.match(html,/name="roomArea"/);
  assert.match(html,/name="moveDistance"/);
});
