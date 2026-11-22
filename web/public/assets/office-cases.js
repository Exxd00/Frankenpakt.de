import {summarizeJobScope} from './job-scope-model.js';
import {evaluateActualJob,formatStartingPrice} from './actual-job.js';

const serviceNames = {
  entruempelung:'Entrümpelung', entsorgung:'Entsorgung', umzug:'Umzug', seniorenumzug:'Seniorenumzug',
  moebeltaxi:'Möbeltaxi', transport:'Möbeltransport', rueckruf:'Rückruf'
};
const mailStates = {queued:'Wartet auf Versand',sending:'Wird versendet',sent:'Versendet',review:'Versand prüfen',test:'Testvorgang'};
const caseNumber = /^AN-[0-9A-F]{16}$/;
const dateFormat = new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'});
const el = (tag,text,cls) => {const n=document.createElement(tag); if(text!=null)n.textContent=text; if(cls)n.className=cls;return n;};

export function mountOfficeCases({api,action,editor,onQuote,download}){
  const panel=document.querySelector('#case-card'),list=document.querySelector('#cases-list'),query=document.querySelector('#lookup');
  let version=0;
  function clear(){
    version++;
    query.value='';
    panel.replaceChildren();list.replaceChildren();panel.hidden=true;
  }
  function addField(label,value){
    if(value){panel.append(el('h4',label),el('p',value,'pre'));}
  }
  async function show(reference){
    if(!caseNumber.test(reference))throw Error('Bitte die vollständige Vorgangsnummer eingeben.');
    const request=++version;
    const record=await api('case/'+reference);
    if(request!==version||!editor())return;
    const {lead,attachments}=record;
    panel.replaceChildren();panel.hidden=false;query.value=reference;
    const title=el('h3',serviceNames[lead.service]||'Anfrage');
    panel.append(title,el('p',record.reference+' · '+dateFormat.format(new Date(record.created))));
    if(record.review&&!record.closed){
      const review=el('section',null,'case-review');review.append(el('h4',record.review.title));
      const reasons=el('ul');for(const reason of record.review.reasons)reasons.append(el('li',reason));
      review.append(reasons);panel.append(review);
    }
    addField('Kontakt',[lead.name,lead.contact].filter(Boolean).join('\n'));
    if(lead.contactMethod==='phone'&&/^\+?[0-9 ()/.-]{7,24}$/.test(lead.contact)){
      const phone=el('a','Anrufen');phone.href='tel:'+lead.contact.replace(/[ ()/.-]/g,'');panel.append(phone);
    }else if(lead.contactMethod==='email'&&/^[^@\s?,;:<>]+@[^@\s?,;:<>]+$/.test(lead.contact)){
      const [user,domain]=lead.contact.split('@'),mail=el('a','E-Mail schreiben');mail.href='mailto:'+encodeURIComponent(user)+'@'+encodeURIComponent(domain);panel.append(mail);
    }
    addField('Gewünschte Leistung',serviceNames[lead.requestedService]);
    addField(lead.service==='rueckruf'?'Rückrufzeit':'Wunschtermin',lead.timeframe);
    if(!lead.jobScope)addField('Einsatzort',[lead.zipFrom,lead.zipTo].filter(Boolean).join(' → '));
    addField('Nachricht',lead.details);
    if(lead.estimateFacts){
      const estimate=evaluateActualJob(lead.estimateFacts,lead.requestedService||lead.service);
      if(estimate)addField('Orientierung zu den angegebenen Mengen',[estimate.summary,formatStartingPrice(estimate.estimatedCents)].filter(Boolean).join('\n'));
    }
    if(lead.jobScope){
      const full=el('details');
      full.append(el('summary','Alle Auftragsangaben anzeigen'),el('p',summarizeJobScope(lead.jobScope),'pre'));panel.append(full);
    }
    addField('Benachrichtigung ans Büro',mailStates[record.mail_status]||record.mail_status);
    if(attachments?.length){
      panel.append(el('h4','Dateien'));const files=el('div',null,'downloads');
      for(const file of attachments){
        const b=el('button',file.name+' · '+Math.max(1,Math.ceil(file.size/1024))+' KB');b.type='button';
        action(b,'click',()=>download(reference,file.id));files.append(b);
      }
      panel.append(files);
    }
    const quote=el('button','Angebot vorbereiten','primary');quote.type='button';
    action(quote,'click',()=>onQuote(record));panel.append(quote);
    if(record.closed){
      addField('Vorgang geschlossen',dateFormat.format(new Date(record.closed))+' · Der Vorgang und seine Anlagen werden 90 Tage nach dem Abschluss gelöscht.');
    }else{
      const end=el('details');end.append(el('summary','Vorgang abschließen'),el('p','90 Tage nach dem Abschluss werden diese Anfrage und ihre Anlagen aus dem Auftragssystem gelöscht.'));
      const confirm=el('button','Vorgang jetzt schließen');confirm.type='button';
      action(confirm,'click',async()=>{
        await api('case/'+reference+'/close',{confirm:true});
        await load();await show(reference);
      });
      end.append(confirm);panel.append(end);
    }
    panel.scrollIntoView({block:'start'});
  }
  async function load(){
    const request=++version;list.textContent='Anfragen werden geladen …';
    const cases=await api('cases');if(request!==version||!editor())return;
    list.replaceChildren();if(!cases.length){list.textContent='Noch keine Anfragen eingegangen.';return;}
    for(const row of cases){
      const b=el('button',null,'history-row');b.type='button';
      b.append(el('span',row.name+' · '+(serviceNames[row.service]||'Anfrage')),el('small',[dateFormat.format(new Date(row.created)),row.file_count+' Anlagen',row.closed&&'Geschlossen'].filter(Boolean).join(' · ')));
      action(b,'click',()=>show(row.reference));list.append(b);
    }
  }
  action(document.querySelector('#find-case'),'submit',()=>show(query.value.trim().toUpperCase()));
  return {load,show,clear};
}
