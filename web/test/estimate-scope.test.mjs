import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateActualJob,normalizeActualJob} from '../public/assets/actual-job.js';
import {scopeWithEstimateFacts,factsFromEditedScope} from '../public/assets/estimate-scope.js';
import {validateJobScope} from '../public/assets/job-scope-model.js';
import {exampleJobScope} from '../test-support/job-scope.mjs';

test('actual disposal quantities and current destination determine the estimate',()=>{
  const facts={service:'entsorgung',items:[{name:'Schrank',quantity:'1'}]};
  const scope=scopeWithEstimateFacts(exampleJobScope('entsorgung'),facts);
  const items=JSON.parse(scope.fields.items);
  assert.equal(items[0].size,'180 × 80 × 45');
  assert.deepEqual(factsFromEditedScope(null,scope),facts);
  items[0].quantity='2';
  scope.fields.items=JSON.stringify(items);
  assert.equal(evaluateActualJob(factsFromEditedScope(facts,scope)).estimatedCents,null);
  items[0].destination='keep';
  scope.fields.items=JSON.stringify(items);
  assert.equal(factsFromEditedScope(facts,scope),null);
});

test('the named rooms survive handoff separately and edited factual fields override the initial estimate',()=>{
  const facts={service:'entruempelung',rooms:[{name:'Keller',area:'5',fill:'half'},{name:'Garage',area:'18',fill:'full'}]};
  const scope=scopeWithEstimateFacts(exampleJobScope('entruempelung'),facts);
  assert.deepEqual(factsFromEditedScope(null,scope),facts);
  assert.equal(validateJobScope(scope,scope.service).ok,true);
  scope.fields.roomBreakdown=JSON.stringify([{name:'Dachboden',area:'5',fill:'little'}]);
  assert.equal(evaluateActualJob(factsFromEditedScope(facts,scope)).estimatedCents,null);
  scope.fields.extent='items';
  assert.equal(factsFromEditedScope(facts,scope),null);
});

test('moving estimates follow current area, volume, half rooms and route in the detailed form',()=>{
  const facts={service:'umzug',rooms:'1.5',area:'48',volume:'19',distance:'0'};
  const scope=scopeWithEstimateFacts(exampleJobScope('umzug'),facts);
  assert.deepEqual(normalizeActualJob(factsFromEditedScope(null,scope)),facts);
  assert.equal(validateJobScope(scope,scope.service).ok,true);
  assert.equal(evaluateActualJob(factsFromEditedScope(null,scope)).estimatedCents,29800);
  scope.fields.loadVolumeMode='unknown';
  assert.equal(evaluateActualJob(factsFromEditedScope(facts,scope)).estimatedCents,null);
});
