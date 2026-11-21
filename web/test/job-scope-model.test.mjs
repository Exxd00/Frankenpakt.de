import assert from 'node:assert/strict';
import test from 'node:test';
import {validateJobScope,summarizeJobScope,summarizeJobTiming,readItems,movingServices,clearanceServices} from '../public/assets/job-scope-model.js';
import {exampleJobScope} from '../test-support/job-scope.mjs';

test('each supported service normalizes a scoped example and keeps address-specific access',()=>{
  for(const service of [...movingServices,...clearanceServices]){
    const scope=exampleJobScope(service);
    const result=validateJobScope(scope,service);
    assert.equal(result.ok,true,JSON.stringify(result.errors));
    assert.equal(result.value.fields.fromCarry,'24');
    assert.equal(summarizeJobTiming(result.value),'01.03.2027 bis 05.03.2027, Vormittags');
    const summary=summarizeJobScope(result.value);
    assert.match(summary,/Schrank/);assert.match(summary,/2. Obergeschoss/);
    if(movingServices.includes(service)){assert.match(summary,/3. Obergeschoss/);assert.match(summary,/24 m.*12 m.*36 m/);}
    else assert.doesNotMatch(summary,/Zieladresse und Zugang/);
  }
});

test('retained goods can require a full destination while waste collection has its own scope',()=>{
  const scope=exampleJobScope('entruempelung');
  const rows=readItems(scope.fields.items);
  rows.push({type:'box',quantity:'8',name:'Bücherkartons',destination:'give'});scope.fields.items=JSON.stringify(rows);
  Object.assign(scope.fields,{retainedTransport:'destination',loadWeightMode:'unknown',loadVolumeMode:'unknown'});
  let result=validateJobScope(scope,scope.service);assert.ok(result.errors.toFloor);assert.ok(result.errors.toZip);
  for(const [k,v] of Object.entries(exampleJobScope('umzug').fields))if(k.startsWith('to'))scope.fields[k]=v;
  assert.equal(validateJobScope(scope,scope.service).ok,true);
  scope.fields.retainedTransport='onsite';result=validateJobScope(scope,scope.service);
  assert.equal(result.ok,true);assert.equal(result.value.fields.toZip,undefined);
  scope.fields.wasteRoute='none';assert.ok(validateJobScope(scope,scope.service).errors.wasteRoute);
});
test('conditional access and measurement fields are validated without inventing zero quantities',()=>{
  const scope=exampleJobScope();Object.assign(scope.fields,{fromFloor:'multi',fromLift:'part',toHelpers:'carry',toHelperCount:'0',fromCarry:'-1',loadWeight:'',dateEnd:'2027-02-28'});
  const result=validateJobScope(scope,scope.service);for(const k of ['fromFloorItems','toHelperCount','fromCarry','loadWeight','dateEnd'])assert.ok(result.errors[k],k);
  scope.fields.fromFloor='curb';scope.fields.loadWeightMode='unknown';scope.fields.toHelpers='none';
  const checked=validateJobScope(scope,scope.service);for(const k of ['fromLift','fromFloorItems','toHelperCount','loadWeight'])assert.equal(Object.hasOwn(checked.value.fields,k),false,k);
});
test('item counts and special handling details are bounded and invalid structured inputs are rejected',()=>{
  const scope=exampleJobScope();const row={type:'bulky',quantity:'1',name:'Massivholzschrank',size:'180 x 80 x 45',weight:'unbekannt'};
  scope.fields.items=JSON.stringify([row]);assert.equal(validateJobScope(scope,scope.service).ok,true);
  for(const changes of [{type:'unlisted'},{quantity:'0'},{size:''},{weight:'viel'},{size:'ohne Angabe'},{unknown:'value'}]){
    scope.fields.items=JSON.stringify([{...row,...changes}]);assert.ok(validateJobScope(scope,scope.service).errors.items);
  }
  scope.fields.items='{}';assert.ok(validateJobScope(scope,scope.service).errors.items);
  assert.equal(validateJobScope({...scope,service:'entruempelung'},'umzug').ok,false);
  scope.fields.offeredPrice='42';assert.ok(validateJobScope(scope,scope.service).errors.scope);
});
test('street requires a house number or a named landmark when unnumbered',()=>{
  const scope=exampleJobScope();
  for(const street of ['Musterweg 2a','Am Stadtpark 12–14','Am Bach, ohne Hausnummer, Tor neben der Brücke','Einfahrt gegenüber Schule, ohne Hausnummer']){
    scope.fields.fromStreet=street;assert.equal(validateJobScope(scope,scope.service).errors.fromStreet,undefined,street);
  }
  for(const street of ['Musterweg','X','Musterweg ohne Hausnummer','12']){
    scope.fields.fromStreet=street;assert.ok(validateJobScope(scope,scope.service).errors.fromStreet,street);
  }
});
