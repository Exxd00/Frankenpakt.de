import {scenarioPrices} from './richtpreise.js';

export const serviceNames = {entsorgung:'Gegenstände entsorgen',entruempelung:'Räume entrümpeln',umzug:'Umzug planen'};
export const fillLevels = {little:'Leicht gefüllt',half:'Etwa halb voll',most:'Überwiegend gefüllt',full:'Voll oder dicht zugestellt'};
const legacyService = {sofa:'entsorgung',keller:'entruempelung',kleinumzug:'umzug'};
const amountFormat = new Intl.NumberFormat('de-DE',{maximumFractionDigits:2});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function named(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  const name = value.trim().replace(/\s+/gu,' ');
  return name && name.length <= 120 ? name : null;
}
function number(value,min,max,integer=false) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(',','.');
  if (!(integer ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/).test(normalized)) return null;
  const n = Number(normalized);
  return n >= min && n <= max ? String(n) : null;
}
function rows(input,max,parse) {
  if (!Array.isArray(input) || input.length === 0 || input.length > max) return null;
  const cleaned = input.map(row => record(row) ? parse(row) : null);
  return cleaned.every(Boolean) ? cleaned : null;
}

export function normalizeActualJob(input,expectedService) {
  if (!record(input) || typeof input.service !== 'string' || !Object.hasOwn(serviceNames,input.service) || (expectedService !== undefined && expectedService !== input.service)) return null;
  const {service} = input;
  if (service === 'entsorgung') {
    const items = rows(input.items,50,row => {
      const name = named(row.name), quantity = number(row.quantity,1,9999,true);
      return name && quantity ? {name,quantity} : null;
    });
    return items && {service,items};
  }
  if (service === 'entruempelung') {
    const rooms = rows(input.rooms,30,row => {
      const name = named(row.name), area = number(row.area,0.01,99999);
      return name && area && typeof row.fill === 'string' && Object.hasOwn(fillLevels,row.fill) ? {name,area,fill:row.fill} : null;
    });
    return rooms && {service,rooms};
  }
  const rooms = number(input.rooms,0.5,999);
  const area = input.area === 'unknown' ? 'unknown' : number(input.area,0.01,99999);
  const volume = input.volume === 'unknown' ? 'unknown' : number(input.volume,0.01,99999);
  const distance = input.distance === 'unknown' ? 'unknown' : number(input.distance,0,99999);
  return rooms && area && volume && distance ? {service,rooms,area,volume,distance} : null;
}

function comparableName(name) {
  return name.toLocaleLowerCase('de-DE').normalize('NFC').replace(/[–—]/g,'-').trim();
}
function approvedScenario(job) {
  if (job.service === 'entsorgung' && job.items.length === 1 && job.items[0].quantity === '1') {
    const name = comparableName(job.items[0].name).replace(/^(?:ein|eine|einen|mein|meine|meinen)\s+/,'').replace(/^(?:klein|normal|alt)(?:es|er|e|en)\s+/,'');
    if (/^(sofa|couch|kleiderschrank|schrank|tisch|esstisch|couchtisch|schreibtisch|stuhl|sessel|kommode|regal|bücherregal|nachttisch)$/.test(name) ||
        /^(?:(?:2|3|zwei|drei)[ -]?sitzer[ -](?:sofa|couch)|(?:sofa|couch)[ ,(-]+(?:2|3|zwei|drei)[ -]?sitzer\)?)$/.test(name)) return 'sofa';
  }
  if (job.service === 'entruempelung' && job.rooms.length === 1 && /^(keller|kellerraum|kellerabteil)$/.test(comparableName(job.rooms[0].name))) {
    const area = Number(job.rooms[0].area);
    if (area <= 6) return 'keller';
    if (area <= 12) return 'kellerMittel';
    if (area <= 25) return 'kellerGross';
  }
  if (job.service === 'umzug' && Object.values(job).every(value => value !== 'unknown') &&
      Number(job.rooms) >= 1 && Number(job.rooms) <= 2 && Number(job.area) <= 60 &&
      Number(job.volume) >= 10 && Number(job.volume) <= 20 && Number(job.distance) <= 50) return 'kleinumzug';
  return null;
}
const routes = {entsorgung:'#raeumungsrechner',entruempelung:'#raeumungsrechner',umzug:'#preisfinder'};
const offers = {
  entsorgung:{
    priceLabel:'Regionaler Richtwert inkl. Entsorgung',
    basis:'Der Bruttowert umfasst Tragen, Abholung und Entsorgung eines einzelnen Möbelstücks in Nürnberg.',
    note:'FrankenPackt hilft Ihnen, den Entsorgungsweg zu klären. Das Angebot für Abholung und Entsorgung erhalten Sie direkt vom Entsorger.',
    requestLabel:'Entsorgungsweg mit uns klären'
  },
  entruempelung:{
    priceLabel:'Regionaler Richtwert inkl. Entsorgung',
    basis:'Dieser Bruttowert richtet sich nach der Fläche des Kellerabteils. Füllstand, Etage und Trageweg berücksichtigen wir im persönlichen Angebot.',
    note:'Unser Angebot gilt für das Sortieren und Tragen vor Ort. Abholung und Entsorgung vereinbaren Sie separat mit dem Entsorger.',
    requestLabel:'Angebot für die Arbeiten vor Ort anfragen'
  },
  umzug:{
    priceLabel:'Regionaler Richtwert für den Umzug',
    basis:'Dieser Bruttowert umfasst Laden, Fahrt und Entladen. Benötigtes Packmaterial kommt hinzu.',
    note:'FrankenPackt erstellt Ihr Umzugsangebot nach Prüfung von Umzugsgut, Adressen und Zugang.',
    requestLabel:'Umzugsangebot anfragen'
  }
};
const measurement = (value,unit) => value === 'unknown' ? 'noch unbekannt' : amountFormat.format(Number(value))+' '+unit;
function factsText(job) {
  if (job.service === 'entsorgung') return job.items.map(item=>item.quantity+' × '+item.name).join(', ');
  if (job.service === 'entruempelung') return job.rooms.map(room=>room.name+' ('+measurement(room.area,'m²')+', '+fillLevels[room.fill].toLocaleLowerCase('de-DE')+')').join(', ');
  return amountFormat.format(Number(job.rooms))+' Zimmer · Fläche '+measurement(job.area,'m²')+' · Volumen '+measurement(job.volume,'m³')+' · Strecke '+measurement(job.distance,'km');
}

export function formatStartingPrice(cents) {
  if (!Number.isInteger(cents) || cents <= 0) return '';
  return 'ab '+(cents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:cents%100?2:0});
}

export function evaluateActualJob(input,expectedService) {
  const job = normalizeActualJob(input,expectedService);
  if (!job) return null;
  const scenario = approvedScenario(job);
  const euros = scenario && scenarioPrices[scenario];
  const estimatedCents = Number.isFinite(euros) ? Math.round(euros*100) : null;
  const description = factsText(job);
  const offer = offers[job.service];
  const priceLabel = estimatedCents === null ? 'Individuelle Einschätzung' : offer.priceLabel;
  const basis = estimatedCents === null ? 'Für Ihre Auswahl ist eine individuelle Einschätzung nötig.' : offer.basis;
  const price = estimatedCents === null ? '' : priceLabel+' · '+formatStartingPrice(estimatedCents)+'.';
  const summary = [serviceNames[job.service]+'.',description+'.',price,basis,offer.note].filter(Boolean).join(' ');
  return {service:job.service,scenario,estimatedCents,description,priceLabel,basis,note:offer.note,requestLabel:offer.requestLabel,
    summary,route:routes[job.service],params:new URLSearchParams({vorhaben:job.service})};
}

export function serviceFromQuery(query) {
  const keys = ['vorhaben','vergleich','leistung','service'];
  if (keys.some(key=>query.getAll(key).length > 1)) return null;
  const direct = query.get('leistung') || query.get('service');
  if (query.has('leistung') && query.has('service')) return null;
  const requested = [query.get('vorhaben'),query.get('vergleich')].filter(Boolean);
  const selected = requested.map(value=>Object.hasOwn(serviceNames,value)?value:Object.hasOwn(legacyService,value)?legacyService[value]:null);
  if (selected.some(value=>!value || (direct && direct !== value) || value !== selected[0])) return null;
  return selected[0] || (Object.hasOwn(serviceNames,direct) ? direct : null);
}

export function inquiryComparison(query,actualJob) {
  if (!query.has('vorhaben') && !query.has('vergleich')) return null;
  const service = serviceFromQuery(query);
  if (!service || query.get(service === 'umzug' ? 'service' : 'leistung') !== service) return null;
  if (actualJob != null) return evaluateActualJob(actualJob,service);
  return {service,scenario:null,estimatedCents:null,params:new URLSearchParams({vorhaben:service}),summary:serviceNames[service]+'. Der Richtpreis richtet sich nach Ihren eigenen Angaben.'};
}
