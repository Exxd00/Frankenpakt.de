import {scopePlanningLines,itemWeightKg} from './job-scope-planning.js';
import {normalizeActualJob} from './actual-job.js';

export const movingServices = ['umzug','seniorenumzug','moebeltaxi','transport'];
export const clearanceServices = ['entruempelung','entsorgung'];
const services = [...movingServices,...clearanceServices];
const field = (key,label,type='text',extra={}) => ({key,label,type,required:true,...extra});
const select = (key,label,options,extra={}) => field(key,label,'select',{options,...extra});
const integer = (key,label,min,max,extra={}) => field(key,label,'integer',{min,max,...extra});
const textField = (key,label,maxLength,extra={}) => field(key,label,'text',{maxLength,...extra});
const paragraph = (key,label,maxLength,extra={}) => field(key,label,'textarea',{maxLength,...extra});
const yesNo = [['no','Nein'],['yes','Ja']];
const floors = [
  ['curb','Bordstein / bereits am Fahrzeug'],['basement','Kellergeschoss'],['ground','Erdgeschoss'],
  ['raised','Hochparterre'],['mezzanine','Zwischengeschoss'],
  ...Array.from({length:10},(_,i)=>[String(i+1),(i+1)+'. Obergeschoss']),['higher','Anderes Geschoss'],['multi','Mehrere Geschosse']
];
const checkboxes = (key,label,options,extra={}) => field(key,label,'multiple',{options,...extra});
const timeLabels = [['any','Ganztägig'],['morning','Vormittags'],['afternoon','Nachmittags'],['evening','Abends'],['specific','Eigenes Zeitfenster']];
const schedule = [
  select('dateMode','Wie fest steht der Termin?',[['fixed','Fester Wunschtag'],['range','Zeitraum zwischen zwei Tagen'],['flexible','Termin frei vereinbar']]),
  field('date','Wunschtag / frühester Tag','date',{when:f=>['fixed','range'].includes(f.dateMode)}),
  field('dateEnd','Spätester Tag','date',{when:f=>f.dateMode==='range'}),
  select('timeWindow','Möglicher Einsatzbeginn',timeLabels),
  textField('exactTime','Zeitfenster (von–bis)',45,{when:f=>f.timeWindow==='specific',placeholder:'Zum Beispiel 9 bis 11 Uhr'})
];
function addressFields(p) {
  const elsewhere = f=>f[p+'Floor'] && f[p+'Floor'] !== 'curb';
  const building = (key,label,options,extra={})=>select(p+key,label,options,{when:elsewhere,...extra});
  return [
    textField(p+'Street','Straße und Hausnummer',150,{placeholder:'Musterstraße 3',hint:'Ohne Hausnummer bitte die Zufahrt oder einen eindeutigen Treffpunkt ergänzen.'}),
    field(p+'Zip','PLZ','zip'),textField(p+'Town','Ort',65,{placeholder:'Nürnberg'}),
    select(p+'Floor','Wo befinden sich die Stücke?',floors),
    textField(p+'Level','Genaue Geschossbezeichnung',40,{when:f=>['basement','mezzanine','higher'].includes(f[p+'Floor']),placeholder:'z. B. 2. UG, zwischen 2. und 3. OG, 14. OG'}),
    paragraph(p+'FloorItems','Welche Stücke befinden sich wo? Welche Geschosse sind mit dem Aufzug erreichbar?',450,{when:f=>f[p+'Floor']==='multi',placeholder:'z. B. 8 Kartons im EG, Bett im 2. OG ohne Aufzug, Schrank im 3. OG mit Aufzug'}),
    building('Lift','Aufzug und Größe',[['none','Kein nutzbarer Aufzug'],['fits','Aufzug nutzbar, alle Stücke passen'],['part','Aufzug nutzbar, nur ein Teil passt'],['unknown','Aufzug vorhanden, Größe unklar']]),
    textField(p+'LiftInfo','Welche Stücke müssen über die Treppe? Maße des Aufzugs, soweit bekannt',180,{when:f=>f[p+'Lift']==='part'&&elsewhere(f)}),
    integer(p+'Steps','Einzelstufen außerhalb der Geschosstreppe',0,1000,{when:elsewhere,hint:'Vom Fahrzeug bis zum Raum, z. B. Eingang oder Absatz. Ohne Einzelstufen bitte 0 eintragen.'}),
    building('Access','Engstellen auf dem Weg',[['clear','Freier Zugang'],['narrow','Enge Tür, Wendeltreppe oder niedriger Durchgang'],['other','Andere Zugangshürde']]),
    textField(p+'AccessInfo','Engstelle und freie Breite, soweit bekannt',180,{when:f=>['narrow','other'].includes(f[p+'Access'])&&elsewhere(f)}),
    select(p+'Parking','Wo kann ein 3,5-t-Transporter halten?',[
      ['private','Privater Stellplatz / Hof mit Zufahrt'],['street','Öffentlicher Platz am Straßenrand'],['reserved','Halteverbotszone bereits reserviert'],
      ['needed','Halteverbotszone gewünscht'],['blocked','Keine Zufahrt / kein legaler Halteplatz bekannt']
    ]),
    integer(p+'Carry','Trageweg vom möglichen Haltepunkt bis zur Übergabe (m)',0,99999,{hint:'Eine Strecke, einschließlich Hof und Flur, ohne Treppen. Eine Schätzung genügt.'}),
    select(p+'Helpers','Wer hilft an dieser Adresse?',[
      ['none','Keine privaten Helfer'],['carry','Private Helfer tragen mit'],['load','Private Helfer laden nur am Fahrzeug'],['all','Privates Team trägt und verlädt vollständig']
    ]),
    integer(p+'HelperCount','Anzahl der privaten Helfer',1,99,{when:f=>['carry','load','all'].includes(f[p+'Helpers'])})
  ];
}
export const itemTypes = [['box','Kartons / Kisten'],['furniture','Möbel'],['appliance','Elektrogerät'],['bulky','Besonders schwer / sperrig'],['loose','Säcke / loses Material'],['other','Sonstiges']];
export const destinations = [['stay','Bleibt im Raum'],['keep','Behalten / weiterverwenden'],['give','Weitergeben / spenden'],['discard','Entsorgung durch Dritte']];
const movingTasks = [['none','Alles gepackt und demontiert'],['pack','Einpacken'],['unpack','Auspacken'],['disassemble','Möbel abbauen'],['assemble','Möbel aufbauen'],['supplies','Packmaterial bereitstellen']];
const wasteRoutes = [['none','Keine Abfälle'],['city','Kommunale Abholung selbst buchen'],['provider','Fachbetrieb selbst beauftragen'],['container','Container selbst bestellen'],['self','Selbst entsorgen'],['undecided','Beratung zum Entsorgungsweg gewünscht']];
const wasteTypes = [['bulky','Sperrmüll / Möbel'],['wood','Holz'],['metal','Metall'],['electrical','Elektrogeräte'],['rubble','Bauschutt'],['mixed','Gemischte Abfälle'],['special','Farben, Batterien oder unbekannte Gefahrstoffe'],['other','Andere Materialien']];
const measurementModes=[['known','Gemessen / laut Unterlagen'],['estimated','Grob geschätzt'],['unknown','Unbekannt']];
const hasRetained = f=>readItems(f.items).some(r=>['give','keep'].includes(r.destination));
const inventoryFields = (isMove,service)=>{
 const haveLoad=f=>isMove||hasRetained(f);
 return [
  field('items','Gegenstände und Mengen','items',{hint:isMove?'Gleiche Stücke können Sie in einer Position zusammenfassen.':'Geben Sie je Position Menge und vorgesehenen Verbleib an.'}),
  ...(isMove?[
    ...(service==='umzug'?[
      field('moveRooms','Anzahl der Zimmer','moveMetric',{required:false,metric:'rooms',hint:'Zum Beispiel 2 oder 2,5.'}),
      field('moveArea','Wohnfläche (m²)','moveMetric',{required:false,hint:'Schätzwert oder „unbekannt“.'}),
      field('moveDistance','Strecke von der Abholung zum Ziel (km)','moveMetric',{required:false,hint:'Schätzwert oder „unbekannt“.'})
    ]:[]),
    checkboxes('tasks','Gewünschte Zusatzarbeiten',movingTasks),
    paragraph('taskDetails','Welche Möbel, Kartons oder Räume betrifft das?',400,{when:f=>Boolean(f.tasks)&&f.tasks!=='none',placeholder:'z. B. Schrank 250 cm abbauen und am Ziel aufbauen'}),
    select('stops','Weitere Lade- oder Entladeadresse?',yesNo),
    paragraph('stopDetails','Adresse und Zugang jedes Zwischenstopps',700,{when:f=>f.stops==='yes',hint:'Je Stopp Straße, PLZ, Ort, Geschoss, Aufzug, Parken, Trageweg, Helfer und die dortigen Stücke aufführen.'})
  ]:[
    select('extent','Was soll bearbeitet werden?',[['items','Einzelne Gegenstände'],['rooms','Einzelne Räume / Kellerabteil'],['unit','Ganze Wohnung / ganzes Haus'],['other','Mehrere Teilflächen']]),
    field('roomBreakdown','Räume, Fläche und Füllstand','rooms',{required:false,when:f=>f.extent==='rooms'}),
    textField('areas','Betroffene Räume oder Flächen',150,{placeholder:'z. B. Kellerabteil und Garage',when:f=>f.extent!=='rooms'||!f.roomBreakdown}),
    field('areaSqm','Betroffene Fläche insgesamt (m²)','decimal',{min:0.01,max:99999,when:f=>Boolean(f.extent)&&f.extent!=='items'&&!(f.extent==='rooms'&&f.roomBreakdown)}),
    select('fill','Wie voll sind die Räume ungefähr?',[
      ['little','Leicht gefüllt (bis etwa ¼)'],['half','Etwa zur Hälfte gefüllt'],['most','Überwiegend gefüllt (bis etwa ¾)'],['full','Voll oder dicht zugestellt']
    ],{when:f=>Boolean(f.extent)&&f.extent!=='items'&&!(f.extent==='rooms'&&f.roomBreakdown)}),
    select('clearanceWork','Gewünschter Umfang vor Ort',[
      ['advice','Nur Entsorgungsweg klären'],['sorting','Sichten und sortieren'],['carry','Weiterverwendbare Stücke hinaustragen'],
      ['both','Sortieren und weiterverwendbare Stücke tragen']
    ]),
    select('handover','Gewünschter Zustand bei Übergabe',[['selected','Nur vereinbarte Stücke bearbeiten'],['empty','Vereinbarten Raum leer übergeben'],['swept','Leer und besenrein gewünscht']]),
    select('retainedTransport','Was geschieht mit weiterverwendbaren Stücken?',[
      ['onsite','Am Einsatzort belassen / zur Abholung bereitstellen'],['destination','Zu einer Zieladresse transportieren']
    ],{when:hasRetained}),
    select('wasteRoute','Wie ist die Abholung von Abfällen geplant?',wasteRoutes,{hint:'Abfallabholung und Entsorgung vereinbaren Sie direkt mit der zuständigen Stelle.'}),
    checkboxes('materials','Welche Abfallarten sind enthalten?',wasteTypes,{when:f=>Boolean(f.wasteRoute)&&f.wasteRoute!=='none'}),
    textField('specialMaterials','Art, geschätzte Menge und Behälter',260,{when:f=>f.wasteRoute!=='none'&&f.materials?.split(',').some(v=>['special','other'].includes(v))}),
    field('wasteVolume','Geschätztes Abfallvolumen (m³)','decimal',{min:0.01,max:99999,when:f=>Boolean(f.wasteRoute)&&f.wasteRoute!=='none',hint:'Die Außenmaße der bereitgestellten Menge genügen als Schätzung.'}),
    select('site','Wo kann der Container stehen?',[['private','Auf Privatgrund'],['public','Auf öffentlicher Fläche'],['unknown','Stellfläche noch zu klären']],{when:f=>f.wasteRoute==='container'}),
    textField('containerAccess','Freie Zufahrtsbreite, Boden und bekannte Höhenbeschränkung',180,{when:f=>f.wasteRoute==='container',placeholder:'z. B. 3 m, gepflasterte Einfahrt, nach oben offen'})
  ]),
  select('loadWeightMode',isMove?'Gesamtgewicht des Transportguts':'Gewicht der weiterzugebenden oder weiterzuverwendenden Stücke',measurementModes,{when:haveLoad}),
  field('loadWeight','Gesamtgewicht (kg)','decimal',{min:0.01,max:999999,when:f=>haveLoad(f)&&['known','estimated'].includes(f.loadWeightMode)}),
  select('loadVolumeMode',isMove?'Gesamtvolumen des Transportguts':'Volumen der weiterzugebenden oder weiterzuverwendenden Stücke',measurementModes,{when:haveLoad}),
  field('loadVolume','Gesamtvolumen (m³)','decimal',{min:0.01,max:99999,when:f=>haveLoad(f)&&['known','estimated'].includes(f.loadVolumeMode)})
 ];
};
export function jobSections(service) {
  if(!services.includes(service)) return [];
  const moving=movingServices.includes(service);
  const inventory={key:'inventory',title:moving?'Transportgut und Arbeiten':'Hausrat und Entsorgungsweg',fields:inventoryFields(moving,service)};
  const destination={key:'to',title:'Zieladresse und Zugang',fields:addressFields('to')};
  return [
    {key:'from',title:moving?'Abholadresse und Zugang':'Einsatzadresse und Zugang',fields:addressFields('from')},
    ...(moving?[destination,inventory]:[inventory,{...destination,when:f=>f.retainedTransport==='destination'&&hasRetained(f)}]),
    {key:'timing',title:'Termin und Zeitfenster',fields:schedule}
  ];
}
function validDate(v) {
  if(!/^\d{4}-\d\d-\d\d$/.test(v))return false;
  const date=new Date(v+'T12:00:00Z');
  return Number.isFinite(date.valueOf())&&date.toISOString().startsWith(v+'T');
}
function hasStreetAddress(value) {
  if(!/\p{L}{2}/u.test(value))return false;
  const withoutNumber=/\b(?:ohne\s+(?:Hausnummer|Hausnr\.?|Nummer)|o\.\s*(?:H\.?\s*)?Nr\.?)\b/i.exec(value);
  if(withoutNumber){
    const after=value.slice(withoutNumber.index+withoutNumber[0].length).trim();
    const before=value.slice(0,withoutNumber.index).trim();
    const landmark=/\b(?:Einfahrt|Eingang|Tor|Treffpunkt|Parkplatz|Ecke|gegenüber|neben|hinter|vor|Zufahrt|gegenueber)\b/i;
    return (after.match(/\p{L}/gu)?.length||0)>=6 || (landmark.test(before)&&(before.match(/\p{L}/gu)?.length||0)>=10);
  }
  // Also allow numbers before the street, ranges, rear buildings and German house-number suffixes.
  return /(?:^|[\s.,])\d{1,6}(?:\s*[a-z])?(?:\s*[-–/]+\s*\d{1,6}[a-z]?)?(?=$|[\s,;/)])/i.test(value);
}
const plain = v=>v!==null && typeof v==='object' && !Array.isArray(v);
export function readItems(encoded) {
  if(typeof encoded!=='string' || encoded.length>24000)return [];
  try{const rows=JSON.parse(encoded);return Array.isArray(rows)&&rows.length<=50&&rows.every(plain)?rows:[];}catch{return [];}
}
export function itemError(rows,moving) {
  if(!rows.length)return 'Bitte mindestens eine Position mit Menge und Gegenstand eintragen.';
  for(const [idx,row] of rows.entries()){
    const fail=msg=>'Position '+(idx+1)+' – '+msg;
    const allowed=['type','quantity','name','size','weight',...(moving?[]:['destination'])];
    if(Object.keys(row).some(k=>!allowed.includes(k))||Object.values(row).some(v=>typeof v!=='string'||/[\u0000-\u001f]/.test(v)))return fail('Ungültige Angaben.');
    if(!itemTypes.some(([v])=>v===row.type))return fail('Bitte Art auswählen.');
    if(!/^[1-9]\d{0,3}$/.test(row.quantity||''))return fail('Bitte Anzahl zwischen 1 und 9999 eingeben.');
    if(!row.name?.trim()||row.name.length>120)return fail('Bitte den Gegenstand benennen (bis 120 Zeichen).');
    if(!moving&&!destinations.some(([v])=>v===row.destination))return fail('Bitte den Verbleib auswählen.');
    if(row.size?.length>80||row.weight?.length>40)return fail('Maße oder Gewicht bitte kürzer angeben.');
    const needsSize=['furniture','bulky','appliance'].includes(row.type);
    if(needsSize&&!row.size?.trim())return fail('Bitte ungefähre Maße angeben. Falls nicht ermittelbar, „unbekannt“ eintragen.');
    if(row.type==='bulky'&&!row.weight?.trim())return fail('Bitte Gewicht schätzen oder „unbekannt“ eintragen.');
    if(row.size&&!/^unbekannt$/i.test(row.size.trim())){
      const dims=row.size.trim().replace(/^(?:ca\.?\s*|~\s*)/i,'').replace(/\s*cm$/i,'').split(/\s*[x×*]\s*/i);
      if(dims.length!==3||dims.some(n=>!/^\d+(?:[.,]\d+)?$/.test(n)||Number(n.replace(',','.'))<=0))return fail('Maße in cm eingeben, z. B. 180 × 80 × 45, oder „unbekannt“.');
    }
    if(row.weight&&!/^unbekannt$/i.test(row.weight.trim())){
      if(itemWeightKg(row.weight) === null)return fail('Gewicht in kg eingeben, z. B. 85, oder „unbekannt“.');
    }
  }
  return '';
}
function fieldError(d,value,fields,moving) {
  if(!value)return d.required?'Bitte ausfüllen.':'';
  if(d.type==='items')return itemError(readItems(value),moving);
  if(d.type==='rooms'){
    if(value.length>24000)return 'Bitte die Raumliste kürzen.';
    let rooms;
    try{rooms=JSON.parse(value);}catch{return 'Bitte die Raumliste prüfen.';}
    return normalizeActualJob({service:'entruempelung',rooms},'entruempelung')?'':'Je Raum Bezeichnung, Fläche und Füllstand prüfen.';
  }
  if(d.type==='moveMetric'&&value.toLowerCase()!=='unbekannt'&&value!=='unknown'){
    const n=Number(value.replace(',','.')),min=d.metric==='rooms'?0.5:d.key==='moveDistance'?0:0.01;
    if(!/^\d{1,5}(?:[.,]\d{1,2})?$/.test(value)||n<min||n>(d.metric==='rooms'?999:99999))return 'Bitte eine gültige Zahl eingeben.';
  }
  if(d.type==='select'&&!d.options.some(([key])=>key===value))return 'Bitte eine der angebotenen Antworten auswählen.';
  if(d.type==='multiple'){
    const keys=value.split(',');
    if(new Set(keys).size!==keys.length||keys.some(k=>!d.options.some(([key])=>key===k))||(keys.includes('none')&&keys.length>1))return 'Bitte die passenden Antworten auswählen.';
  }
  if(d.type==='zip'&&!/^\d{5}$/.test(value))return 'Bitte eine fünfstellige PLZ eingeben.';
  if(d.key.endsWith('Street')&&!hasStreetAddress(value))return 'Bitte Straße und Hausnummer angeben. Ohne Hausnummer bitte ausdrücklich „ohne Hausnummer“ und einen eindeutigen Treffpunkt ergänzen.';
  if(d.type==='integer'||d.type==='decimal'){
    const n=Number(value.replace(',','.'));
    const pattern=d.type==='integer'?/^\d{1,5}$/:/^\d{1,6}(?:[.,]\d{1,2})?$/;
    if(!pattern.test(value)||n<d.min||n>d.max)return 'Bitte einen Wert von '+String(d.min).replace('.',',')+' bis '+d.max+' eingeben.';
  }
  if(d.type==='date'&&!validDate(value))return 'Bitte ein gültiges Datum eingeben.';
  if(d.key==='dateEnd'&&fields.date&&value<fields.date)return 'Das Ende muss am oder nach dem ersten Tag liegen.';
  if(d.maxLength&&value.length>d.maxLength)return 'Maximal '+d.maxLength+' Zeichen.';
  return '';
}
export function validateJobScope(input,expectedService) {
  const service=expectedService ?? input?.service;
  const errors=Object.create(null),fields=Object.create(null);
  const value={version:1,service,fields};
  if(!plain(input)||input.version!==1||!services.includes(service)||input.service!==service||!plain(input.fields)||
    Object.keys(input).some(k=>!['version','service','fields'].includes(k)))return {ok:false,value,errors:{scope:'Bitte die Auftragsdetails prüfen.'}};
  const moving=movingServices.includes(service);
  const sections=jobSections(service);
  const defs=sections.flatMap(s=>s.fields);
  const source=input.fields;
  if(Object.keys(source).some(k=>!defs.some(d=>d.key===k))){
    errors.scope='Unbekannte Felder in den Auftragsdetails.';
  }
  for(const section of sections){
   if(section.when&&!section.when(fields))continue;
   for(const d of section.fields){
    if(d.when&&!d.when(fields))continue;
    const raw=Object.hasOwn(source,d.key)?source[d.key]:'';
    if(typeof raw!=='string'||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw)){
      errors[d.key]='Ungültiger Inhalt.';continue;
    }
    fields[d.key]=raw.trim();
    const error=fieldError(d,fields[d.key],fields,moving);
    if(error)errors[d.key]=error;
   }
  }
  if (!moving&&!errors.items&&fields.wasteRoute) {
    const discard=readItems(fields.items).some(row=>row.destination==='discard');
    if(discard === (fields.wasteRoute==='none')) errors.wasteRoute=discard?'Für die zur Entsorgung markierten Stücke bitte einen Entsorgungsweg angeben.':'Bitte die zu entsorgende Menge als Position ergänzen oder „Keine Abfälle“ wählen.';
  }
  return {ok:Object.keys(errors).length===0,value,errors};
}
function formatDate(s){return validDate(s)?s.split('-').reverse().join('.'):'';}
export function summarizeJobTiming(scope){
  const f=scope?.fields||{};
  const date=f.dateMode==='fixed'?formatDate(f.date):f.dateMode==='range'?[formatDate(f.date),formatDate(f.dateEnd)].filter(Boolean).join(' bis '):f.dateMode==='flexible'?'Termin frei vereinbar':'';
  const time=f.timeWindow==='specific'?f.exactTime:timeLabels.find(([k])=>k===f.timeWindow)?.[1];
  return [date,time].filter(Boolean).join(', ');
}
function optionLabel(options,key){return options?.find(([k])=>k===key)?.[1]||key;}
export function summarizeJobScope(scope){
  const {value}=validateJobScope(scope,scope?.service);
  const f=value.fields;
  const groups=jobSections(value.service).filter(s=>!s.when||s.when(f)).map(s=>{
    if(s.key==='timing')return s.title+'\n'+summarizeJobTiming(value);
    const lines=[];
    for(const d of s.fields){
      if(!f[d.key])continue;
      if(d.type==='items'){
        for(const r of readItems(f.items))lines.push([r.quantity+' × '+r.name,optionLabel(itemTypes,r.type),r.size&&'Maße (cm) '+r.size,r.weight&&'Gewicht/Stück (kg) '+r.weight,r.destination&&optionLabel(destinations,r.destination)].filter(Boolean).join(' · '));
      }else if(d.type==='rooms'){
        for(const r of JSON.parse(f.roomBreakdown)) lines.push(r.name+' · '+r.area+' m² · '+({little:'leicht gefüllt',half:'halb gefüllt',most:'überwiegend gefüllt',full:'voll'}[r.fill] || r.fill));
      }else{
        const display=d.type==='multiple'?f[d.key].split(',').map(k=>optionLabel(d.options,k)).join(', '):optionLabel(d.options,f[d.key]);
        lines.push(d.label+' – '+display);
      }
    }
    return s.title+'\n'+lines.join('\n');
  });
  const planning=scopePlanningLines(value,readItems(f.items));
  if(planning.length)groups.push('Einsatzplanung\n'+planning.join('\n'));
  return groups.join('\n\n');
}
