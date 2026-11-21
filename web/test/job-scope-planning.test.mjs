import test from 'node:test';
import assert from 'node:assert/strict';
import {scopePlanningLines} from '../public/assets/job-scope-planning.js';

test('two distinct access routes give a one-way figure per item, never a fee', () => {
  const notes = scopePlanningLines({service:'umzug',fields:{fromCarry:'15', toCarry:'45'}});
  assert.equal(notes.length, 1);
  assert.match(notes[0], /15 m.*45 m.*60 m/);
  assert.deepEqual(scopePlanningLines({fields:{fromCarry:'15'}}), []);
});

test('load count uses a declared transport weight and the operator’s planning payload', () => {
  for (const [input, match] of [['1000', /1 Ladung\./], ['1000,01', /2 Ladungen\./]]) {
    const [note] = scopePlanningLines({service:'umzug',fields:{loadWeightMode:'estimated', loadWeight:input}});
    assert.match(note,/Geschätztes Transportgewicht/);
    assert.match(note, match);
    assert.doesNotMatch(note,/€|EUR/);
  }
  assert.deepEqual(scopePlanningLines({service:'umzug',fields:{loadWeightMode:'unknown',loadWeight:'2000'}}), []);
  assert.deepEqual(scopePlanningLines({service:'entruempelung',fields:{retainedTransport:'onsite',loadWeightMode:'known',loadWeight:'1400',wasteVolume:'20'}}), []);
  assert.deepEqual(scopePlanningLines({service:'umzug',fields:{loadWeightMode:'known', loadWeight:'0'}}), []);
});

test('an overweight single item cannot be covered by multiple journeys in this van', () => {
  const inventory = [{type:'bulky',weight:'1250 kg',size:'unbekannt'}];
  const fields = {loadWeightMode:'known', loadWeight:'1250'};
  const lines = scopePlanningLines({service:'umzug',fields}, inventory);
  assert.ok(lines.some(line => line.includes('fehlen Maße oder Gewicht')));
  assert.ok(lines.some(line => line.includes('einzelnes Stück überschreitet')));
  assert.ok(lines.every(line => !line.includes('2 Ladungen')));
});

test('complete piece weights yield a total while partial or contradictory weights require review', () => {
  const inventory = [{quantity:'10',weight:'ca. 60,5 kg'},{quantity:'4',weight:'100'}];
  const scope = {service:'umzug',fields:{loadWeightMode:'unknown'}};
  assert.match(scopePlanningLines(scope,inventory).join(' '), /Liste 1.005 kg.*2 Ladungen/);
  assert.deepEqual(scopePlanningLines(scope,[...inventory,{quantity:'1',weight:'unbekannt'}]), []);
  const mismatch = scopePlanningLines({service:'umzug',fields:{loadWeightMode:'estimated',loadWeight:'400'}},inventory);
  assert.equal(mismatch.length,1);
  assert.match(mismatch[0],/1.005 kg.*400 kg.*abgleichen/);
});
