import {InputError,isGoogleAdVariant} from './inputs.mjs';
import {validateJobScope,summarizeJobTiming} from '../public/assets/job-scope-model.js';
import {factsFromEditedScope} from '../public/assets/estimate-scope.js';
import {scopeConditionNotes,normalizeJobContext} from '../public/assets/job-scope-conditions.js';
import {normalizeActualJob,evaluateActualJob} from '../public/assets/actual-job.js';

const services = new Set(['entruempelung','entsorgung','umzug','moebeltaxi','seniorenumzug','rueckruf','transport']);
export const sources = new Set(['direkt','google','kleinanzeigen','empfehlung','sonstige','unbekannt']);
const contactMethods = new Set(['phone','email']);
const contactClicks = new Set(['phone_click','whatsapp_click','callback_click']);
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const phonePattern = /^\+?[\d\s().\/-]+$/;
export function string(value,max,label,{required=false}={}){
  if(value==null||value===''){if(required)throw new InputError(label+' fehlt.');return '';}
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new InputError(label+' bitte prüfen.');
  const trimmed=value.trim();
  if(required&&!trimmed)throw new InputError(label+' fehlt.');
  return trimmed;
}
export function mobileNumber(phone){
  if(!phonePattern.test(phone))return '';
  const plain=phone.replace(/[\s().\/-]/g,'');
  const e164=plain.startsWith('00')?'+'+plain.slice(2):plain.startsWith('0')?'+49'+plain.slice(1):plain;
  return /^\+?[1-9][0-9]{6,14}$/.test(e164)?e164:'';
}
// Keep the service identifiers from older form submissions for receipt replays.
const formerTopics = new Map([['sofa','entsorgung'],['keller','entruempelung'],['kleinumzug','umzug']]);
export function validate(body){
  if(!body||Array.isArray(body)||typeof body!=='object')throw new InputError('Anfrage bitte prüfen.');
  if(body.website)throw new InputError('Anfrage bitte prüfen.');
  const {service,contactMethod,requestId}=body;
  if(typeof requestId!=='string'||!requestIdPattern.test(requestId))throw new InputError('Anfragenummer ungültig.');
  if(!services.has(service)||!contactMethods.has(contactMethod))throw new InputError('Leistung und Kontaktweg bitte prüfen.');
  if(service==='rueckruf'&&contactMethod!=='phone')throw new InputError('Für einen Rückruf bitte eine Telefonnummer angeben.');
  let jobScope;
  if(Object.hasOwn(body,'jobScope')){
    const scopeService=service==='rueckruf'?body.requestedService:service;
    if(!services.has(scopeService)||scopeService==='rueckruf')throw new InputError('Gewünschte Leistung für die Auftragsdetails angeben.');
    const checked=validateJobScope(body.jobScope,scopeService);
    if(!checked.ok)throw new InputError(Object.values(checked.errors)[0]||'Auftragsdetails bitte prüfen.');
    jobScope=checked.value;
    if((body.zipFrom && body.zipFrom!==jobScope.fields.fromZip)||(body.zipTo && body.zipTo!==jobScope.fields.toZip))
      throw new InputError('Die Postleitzahlen müssen mit den Einsatzadressen übereinstimmen.');
  }
  const zipFrom=string(jobScope?.fields.fromZip??body.zipFrom,5,'PLZ des Einsatzorts',{required:service!=='rueckruf'});
  const zipTo=string(jobScope?.fields.toZip??body.zipTo,5,'Ziel-PLZ');
  if((zipFrom&&!/^\d{5}$/.test(zipFrom))||(zipTo&&!/^\d{5}$/.test(zipTo)))throw new InputError('Bitte eine fünfstellige PLZ angeben.');
  const name=string(body.name,120,'Name',{required:true});
  const contact=contactMethod==='email'?string(body.email,254,'E-Mail',{required:true}).toLowerCase():mobileNumber(string(body.phone,55,'Telefon',{required:true}));
  if(!contact||(contactMethod==='email'&&!emailPattern.test(contact)))throw new InputError('Kontaktangabe bitte prüfen.');
  const details=string(body.details,2000,'Nachricht');
  const timeframe=jobScope && service!=='rueckruf' ? summarizeJobTiming(jobScope) : string(body.timeframe,120,'Zeitraum');
  const source=sources.has(body.source)?body.source:'unbekannt';
  const lead={requestId:requestId.toLowerCase(),service,name,contactMethod,contact,zipFrom,zipTo,details,timeframe,source};
  if(jobScope){
    lead.jobScope=jobScope;
    const ctx=normalizeJobContext(body.jobContext,jobScope.service);
    if(ctx)lead.jobContext=ctx;
  }
  if(source==='google' && isGoogleAdVariant(body.adVariant))lead.adVariant=body.adVariant;
  if(service==='rueckruf' && body.requestedService!=null && body.requestedService!==''){
    if(!services.has(body.requestedService)||body.requestedService==='rueckruf')throw new InputError('Gewünschte Leistung bitte prüfen.');
    lead.requestedService=body.requestedService;
  }
  const requestedService=lead.requestedService||service;
  if(body.vorhaben!=null){
    if(!['umzug','entsorgung','entruempelung'].includes(requestedService)||(formerTopics.get(body.vorhaben)||body.vorhaben)!==requestedService)throw new InputError('Das Vorhaben passt nicht zur ausgewählten Leistung.');
    lead.vorhaben=body.vorhaben;
  }
  const facts=normalizeActualJob(body.estimateFacts,requestedService);
  if(body.estimateFacts!=null&&!facts)throw new InputError('Bitte die Angaben für die Preiseinschätzung prüfen.');
  if(facts)lead.estimateFacts=facts;
  return lead;
}
export function validateContactClick(body){
  if(!body||Array.isArray(body)||typeof body!=='object'||body.consent!==true||
    !contactClicks.has(body.event)||!sources.has(body.source)||typeof body.eventId!=='string'||
    !requestIdPattern.test(body.eventId)||Object.keys(body).some(k=>!['event','source','eventId','consent'].includes(k))){
    throw new InputError('Kontaktmessung bitte prüfen.');
  }
  return {event:body.event,source:body.source,eventId:body.eventId.toLowerCase()};
}

export function addCalculatedScope(person,service){
  const effectiveService=person.requestedService||service;
  const estimateFacts=person.jobScope
    ? normalizeActualJob(factsFromEditedScope(person.estimateFacts||null,person.jobScope),effectiveService)
    : person.estimateFacts;
  if(estimateFacts){
    person.estimateFacts=estimateFacts;
    const estimate=evaluateActualJob(estimateFacts,effectiveService);
    if(estimate)person.priceOrientation={estimatedCents:estimate.estimatedCents,summary:estimate.summary};
  }else delete person.estimateFacts;
  if(person.jobContext){
    const checks=scopeConditionNotes(person.jobScope,new URLSearchParams(person.jobContext));
    if(checks.length)person.jobConditionNotes=checks;
  }
  return person;
}
