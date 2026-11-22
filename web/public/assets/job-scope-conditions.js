import {movingServices} from './job-scope-model.js';
import {inquiryEstimate} from './clearance-calculator.js';

const containerVolumes=new Map([['container-2',2],['container-4-5',4.5],['container-7',7]]);
const addresses=[['from','Abholung'],['to','Ziel']];
const contextKeys=new Set(['service','leistung','paket','zusatz','hilfe','entsorgungsweg','asn','container']);
const movingPackages=new Set(['drei','kompakt','sieben']);

// Retain only the current calculation inputs that identify a published package or disposal estimate.
export function normalizeJobContext(raw,service) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  if(Object.entries(raw).some(([key,value])=>!contextKeys.has(key)||typeof value!=='string'||value.length>32))return null;
  const query=new URLSearchParams(raw);
  if(movingServices.includes(service)){
    const pack=query.get('paket');
    if(raw.service!==service||!movingPackages.has(pack)||service==='moebeltaxi')return null;
    if(Object.keys(raw).some(k=>!['service','paket','zusatz'].includes(k)))return null;
    const result={service,paket:pack};
    if(query.has('zusatz')){
      if(!['drei','sieben'].includes(pack)||!(/^[1-4]$/.test(raw.zusatz)))return null;
      result.zusatz=raw.zusatz;
    }
    return result;
  }
  if(raw.leistung!==service||Object.keys(raw).some(k=>!['leistung','hilfe','entsorgungsweg','asn','container'].includes(k)))return null;
  const estimate=inquiryEstimate(query);
  if(!estimate||estimate.service!==service)return null;
  const canonical={leistung:service,...Object.fromEntries(estimate.params)};
  if(raw.entsorgungsweg==='asn'&&(!query.has('asn')||raw.asn==='ja')){
    query.set('entsorgungsweg','individual');
    query.delete('asn');
  }
  for(const [key,value] of query)if(canonical[key]!==value)return null;
  return canonical;
}

function movingConditions(pack,fields) {
  const notes=[];
  const tasks=(fields.tasks||'').split(',');
  if(pack==='kompakt'){
    const upper=addresses.filter(([p])=>fields[p+'Floor']&&!['curb','ground'].includes(fields[p+'Floor']));
    if(upper.length)notes.push('Kompaktumzug ist für Erdgeschoss zu Erdgeschoss kalkuliert. Abweichendes Geschoss bei '+upper.map(([,place])=>place).join(' und ')+'.');
    const long=addresses.filter(([p])=>Number(fields[p+'Carry'])>15);
    if(long.length)notes.push('Trageweg bei '+long.map(([,place])=>place).join(' und ')+' über 15 m. Bitte den Umfang des Kompaktumzugs prüfen.');
    if(['known','estimated'].includes(fields.loadVolumeMode)&&Number((fields.loadVolume||'').replace(',','.'))>20)notes.push('Das angegebene Transportvolumen liegt über den 20 m³ des Kompaktpakets.');
    if(tasks.some(task=>['disassemble','assemble'].includes(task)))notes.push('Gewünschte Möbelmontage separat klären. Das Kompaktpaket umfasst Fahrt und Transport ohne Möbelmontage.');
  }
  if((pack==='drei'||pack==='kompakt')&&tasks.includes('pack'))notes.push('Einpacken ist gewünscht. Das gewählte Paket setzt bereits gepacktes Umzugsgut voraus.');
  return notes;
}

function disposalConditions(query,fields) {
  const notes=[];
  const disposal=query.get('entsorgungsweg'),help=query.get('hilfe');
  const size=containerVolumes.get(disposal);
  const route=size?'container':disposal==='none'?'none':null;
  if(fields.wasteRoute&&route&&route!==fields.wasteRoute){
    notes.push('Der Entsorgungsweg in den Auftragsdetails weicht vom Rechner ab. Bitte den Abholweg im Angebot klären.');
  }else if(size){
    if(fields.site&&fields.site!=='private')notes.push('Der Container-Richtwert setzt Privatgrund voraus. Die angegebene Stellfläche muss für das Angebot geprüft werden.');
    if(Number((fields.wasteVolume||'').replace(',','.'))>size)notes.push('Das angegebene Abfallvolumen übersteigt die gewählte Containergröße. Im Angebot ist eine andere Größe zu berücksichtigen.');
    if((fields.materials||'').split(',').some(v=>['special','electrical','rubble','mixed','other'].includes(v)))notes.push('Für die angegebenen Abfallarten die Annahme gesondert prüfen. Der Container-Richtwert gilt für zugelassenen Sperrmüll.');
  }
  if(help==='team'&&fields.retainedTransport==='destination')notes.push('Der gewünschte Transport zur Zieladresse wird bei der Angebotserstellung mit eingeplant.');
  return notes;
}

// Keep the submitted amount and rows unchanged. Only compare input facts with known package conditions.
export function scopeConditionNotes(scope,query) {
  if(!scope?.fields||!query?.getAll)return [];
  const raw={};
  for(const key of contextKeys){
    const values=query.getAll(key);
    if(values.length>1)return [];
    if(values.length)raw[key]=values[0];
  }
  const selection=normalizeJobContext(raw,scope.service);
  if(!selection)return [];
  return selection.paket?movingConditions(selection.paket,scope.fields):disposalConditions(new URLSearchParams(selection),scope.fields);
}
