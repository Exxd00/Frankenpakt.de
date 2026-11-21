import {movingServices} from '../public/assets/job-scope-model.js';

export function exampleJobScope(service='umzug') {
  const moving=movingServices.includes(service);
  const fields={
    fromStreet:'Beispielweg 8',fromZip:'90453',fromTown:'Nürnberg',fromFloor:'2',
    fromLift:'part',fromLiftInfo:'Der Schrank muss über die Treppe.',fromSteps:'3',fromAccess:'clear',
    fromParking:'private',fromCarry:'24',fromHelpers:'none',
    dateMode:'range',date:'2027-03-01',dateEnd:'2027-03-05',timeWindow:'morning',
    items:JSON.stringify([{type:'furniture',quantity:'1',name:'Schrank',size:'180 × 80 × 45',weight:'',...(moving?{}:{destination:'discard'})}])
  };
  if(moving) Object.assign(fields,{
    toStreet:'Musterplatz 3',toZip:'90402',toTown:'Nürnberg',toFloor:'3',toLift:'fits',
    toSteps:'0',toAccess:'clear',toParking:'reserved',toCarry:'12',toHelpers:'carry',toHelperCount:'2',
    tasks:'none',stops:'no',loadWeightMode:'estimated',loadWeight:'60',loadVolumeMode:'unknown'
  });
  else Object.assign(fields,{extent:'rooms',areas:'Kellerabteil',areaSqm:'6',fill:'half',clearanceWork:'advice',handover:'selected',wasteRoute:'provider',materials:'wood',wasteVolume:'1,5'});
  return {version:1,service,fields};
}
