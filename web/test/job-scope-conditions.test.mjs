import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeJobContext,scopeConditionNotes} from '../public/assets/job-scope-conditions.js';
const notes=(service,raw,fields)=>scopeConditionNotes({service,fields},new URLSearchParams(raw)).join('\n');

test('retires the old curbside package and reviews team-package exceptions',()=>{
  const taxi={service:'moebeltaxi',paket:'taxi'};
  assert.equal(normalizeJobContext(taxi,'moebeltaxi'),null);
  assert.equal(notes('moebeltaxi',taxi,{fromFloor:'3',toFloor:'curb',fromHelpers:'none',items:'[{"type":"bulky","quantity":"2"}]'}),'');
  const compact=notes('umzug',{service:'umzug',paket:'kompakt'},
    {fromFloor:'ground',toFloor:'2',fromCarry:'15',toCarry:'16',tasks:'assemble,pack',loadVolumeMode:'estimated',loadVolume:'20,1'});
  for(const term of ['Geschoss bei Ziel','Trageweg bei Ziel','über den 20','Möbelmontage','gepacktes'])assert.ok(compact.includes(term));
  assert.doesNotMatch(compact,/€|EUR/);
  assert.equal(notes('seniorenumzug',{service:'seniorenumzug',paket:'sieben'},{fromFloor:'3',tasks:'pack'}),'');
});

test('compares exact disposal route, selected size, material and private placement',()=>{
  const selected={leistung:'entsorgung',hilfe:'none',entsorgungsweg:'container-4-5',container:'ja'};
  assert.equal(notes('entsorgung',selected,{wasteRoute:'container',site:'private',wasteVolume:'4,5',materials:'bulky'}),'');
  const questionable=notes('entsorgung',selected,{wasteRoute:'container',site:'public',wasteVolume:'5',materials:'electrical'});
  for(const term of ['Privatgrund','Containergröße','Annahme'])assert.ok(questionable.includes(term));
  assert.match(notes('entsorgung',selected,{wasteRoute:'city'}),/abweicht|weicht/);
  assert.deepEqual(normalizeJobContext({leistung:'entsorgung',hilfe:'none',entsorgungsweg:'asn',asn:'ja'},'entsorgung'),
    {leistung:'entsorgung',hilfe:'none',entsorgungsweg:'individual'});
  assert.match(notes('entruempelung',{leistung:'entruempelung',hilfe:'team',entsorgungsweg:'none'},{retainedTransport:'destination'}),/Transport zur Zieladresse/);
  assert.equal(normalizeJobContext({leistung:'entruempelung',hilfe:'one-helper',entsorgungsweg:'none'},'entruempelung'),null);
});

test('untrusted extra values, stale services and incompatible terms do not become calculation context',()=>{
  const clean={service:'umzug',paket:'drei',zusatz:'2'};
  assert.deepEqual(normalizeJobContext(clean,'umzug'),clean);
  for(const invalid of [{...clean,gemeinde:'Test'}, {...clean,zusatz:'6'}, {...clean,paket:'taxi'}, {service:'umzug',paket:'arbitrary'},
    {leistung:'entsorgung',hilfe:'none',entsorgungsweg:'asn',container:'ja'}])assert.equal(normalizeJobContext(invalid,invalid.service||invalid.leistung),null);
  assert.equal(notes('moebeltaxi',clean,{fromFloor:'3'}),'');
  assert.equal(notes('umzug','service=umzug&paket=kompakt&paket=drei',{fromFloor:'3'}),'');
});
