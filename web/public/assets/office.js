import {scenarioPrices} from './richtpreise.js';
import {mountOfficeCases} from './office-cases.js';

const $=selector=>document.querySelector(selector);
const money=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
const shortDate=d=>new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'Europe/Berlin'}).format(new Date(d));
const nodes=(tag,content,css)=>{const n=document.createElement(tag);if(content!=null)n.textContent=content;if(css)n.className=css;return n;};
const show=(msg='')=>{$('#notice').textContent=msg;};
const quantities=new Map();
const args=new URLSearchParams(location.search);
let state=null,documentId=crypto.randomUUID(),activeTab='calc';
async function api(action,body){
  const r=await fetch('/api/office/'+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
    headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  let data={};try{data=await r.json();}catch{}
  if(!r.ok){if(r.status===401&&state)reset();throw Error(data.error||'Das Angebotsbüro ist vorübergehend nicht erreichbar.');}return data;
}
function action(el,event,work){
  el.addEventListener(event,async e=>{e.preventDefault();const b=event==='submit'?el.querySelector('button[type=submit],button'):el;
    if(b?.disabled)return; if(b)b.disabled=true;show();
    try{await work(e);}catch(err){show(err.message||'Bitte erneut versuchen.');}finally{if(b)b.disabled=false;}});
}
function reset(){
  state=null;quantities.clear();caseInbox.clear();documentId=crypto.randomUUID();document.body.removeAttribute('data-role');
  $('#login').hidden=false;$('#office').hidden=true;$('#logout').hidden=true;$('#document').hidden=true;
  $('#who').textContent='Angebotsbüro';$('#paper').replaceChildren();$('#history').replaceChildren();$('#rates').replaceChildren();$('#office-handbook').replaceChildren();
  $('#customer').value='';$('#scope').value='';$('#issuer').value=$('#issuer').defaultValue;$('#code').value='';$('#pass').value='';
}
function units(rate){return quantities.get(rate.id)||0;}
function drawBasket(){
  const basket=$('#basket');basket.replaceChildren();let total=0;
  for(const rate of state.rates){const qty=units(rate);if(!qty)continue;total+=rate.cents*qty;basket.append(nodes('li',qty+' × '+rate.label+' · '+money(qty*rate.cents)));}
  if(!total)basket.append(nodes('li','Leistung und Menge auswählen.'));
  $('#total').textContent=money(total);$('#save-quote').disabled=!total||Boolean($('#rates input[aria-invalid="true"]'));
}
function field(form,caption,value,inputTag='input'){
  const id='f-'+crypto.randomUUID();const l=nodes('label',caption);l.htmlFor=id;
  const input=nodes(inputTag);input.id=id;input.value=value||'';input.required=true;form.append(l,input);return input;
}
function rateForm(parent,rate){
  const form=nodes('form',null,'edit-form');const l=field(form,'Bezeichnung',rate?.label),u=field(form,'Einheit',rate?.unit),s=field(form,'Leistungsumfang',rate?.scope,'textarea'),p=field(form,'Bruttopreis (€)',rate?money(rate.cents).replace(/[^\d,]/g,''):'');
  p.inputMode='decimal';l.maxLength=120;u.maxLength=35;s.maxLength=500;p.maxLength=13;
  form.append(nodes('button','Preis speichern','primary'));parent.append(form);
  action(form,'submit',async()=>{
    if(!/^\d{1,7}(?:[,.]\d{1,2})?$/.test(p.value.trim()))throw Error('Bruttopreis mit höchstens zwei Nachkommastellen eingeben.');
    const [eur,cent='']=p.value.trim().replace(',','.').split('.');
    await api('rate',{id:rate?.id,revision:rate?.revision,label:l.value,unit:u.value,scope:s.value,cents:Number(eur)*100+Number(cent.padEnd(2,'0'))});
    documentId=crypto.randomUUID();await loadState();$('#add-rate').open=false;show('Preis gespeichert. Bereits erstellte Angebote behalten ihren Preisstand.');
  });
}
function drawRates(){
  const container=$('#rates');container.replaceChildren();
  for(const rate of state.rates){
    const card=nodes('article',null,'card');card.append(nodes('h3',rate.label),nodes('p',rate.scope));
    const row=nodes('div',null,'rate-row');row.append(nodes('strong',money(rate.cents)+' / '+rate.unit));
    const label=nodes('label','Menge');const q=nodes('input');q.type='number';q.min='0';q.max='999';q.step='1';q.value=String(units(rate));q.inputMode='numeric';
    label.append(q);row.append(label);card.append(row);q.addEventListener('input',()=>{const n=Number(q.value);quantities.set(rate.id,q.value&&q.validity.valid&&Number.isInteger(n)?n:0);q.setAttribute('aria-invalid',String(!q.validity.valid));documentId=crypto.randomUUID();drawBasket();});
    if(state.role==='editor'){const more=nodes('details');more.append(nodes('summary','Preis bearbeiten'));rateForm(more,rate);card.append(more);}
    container.append(card);
  }
  const add=$('#new-rate');add.replaceChildren();if(state.role==='editor')rateForm(add);
  drawBasket();
}
async function loadState(){
  state=await api('state');document.body.dataset.role=state.role;$('#login').hidden=true;$('#office').hidden=false;$('#logout').hidden=false;
  $('#who').textContent=state.role==='editor'?'IXA · Bearbeiten':'FrankenPackt · Leserechte';
  $('#role-copy').textContent=state.role==='editor'?'Preise pflegen, Leistungen zusammenstellen und Angebote ausgeben.':'Preise einsehen und Mengen zur Orientierung berechnen.';
  drawRates();drawHandbook();
}
async function openTab(tab,loadList=true){
  if(['archive','cases'].includes(tab)&&state?.role!=='editor')return;activeTab=tab;
  for(const t of ['calc','cases','archive','brand','handbuch'])$('#'+t).hidden=t!==tab;
  document.querySelectorAll('[data-open]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.open===tab)));
  if(tab==='cases'&&loadList)await caseInbox.load();
  if(tab==='archive'){const list=$('#history');list.textContent='Angebote werden geladen …';const docs=await api('quotes');if(state?.role!=='editor')return;list.replaceChildren();
    if(!docs.length)list.textContent='Noch keine Angebote gespeichert.';
    for(const quote of docs){const b=nodes('button',null,'history-row');b.append(nodes('span',quote.customer+' · '+shortDate(quote.created)),nodes('strong',money(quote.total_cents)));list.append(b);action(b,'click',async()=>showDoc(await api('quote/'+quote.id)));}
  }
}
async function startTab(){
  const requested=location.hash.slice(1);
  if(['calc','brand','handbuch'].includes(requested)||state.role==='editor'&&['cases','archive'].includes(requested)){
    await openTab(requested);return;
  }
  const reference=args.get('vorgang');
  if(state.role==='editor'&&/^AN-[0-9A-F]{16}$/.test(reference||'')){
    await openTab('cases',false);await caseInbox.show(reference);
    return;
  }
  await openTab('calc');
}
function showDoc(quote){
  if(state?.role!=='editor')return;
  const paper=$('#paper');paper.replaceChildren();
  const logo=nodes('img');logo.src='/assets/marke.svg';logo.width=205;logo.alt='FrankenPackt';paper.append(logo,nodes('p',quote.issuer,'pre'),nodes('h1','Angebot'),nodes('p','Angebotsnummer '+quote.id+' · '+shortDate(quote.created)),nodes('h3','Angebot für'),nodes('p',quote.customer,'pre'),nodes('h3','Leistungsumfang'),nodes('p',quote.scope,'pre'));
  for(const item of quote.lines){const row=nodes('div',null,'doc-row');const left=nodes('div');left.append(nodes('strong',item.label),nodes('p',item.quantity+' × '+money(item.cents)+' / '+item.unit),nodes('p',item.scope));row.append(left,nodes('strong',money(item.quantity*item.cents)));paper.append(row);}
  const total=nodes('p',null,'total');total.append(nodes('span','Gesamt brutto'),nodes('strong',money(quote.total_cents)));paper.append(total);
  $('#document').hidden=false;$('#office').hidden=true;window.scrollTo(0,0);
}
function link(parent,name,url,download){
  const a=nodes('a',name);a.href=url;if(download)a.download=download;parent.append(a);return a;
}
function drawHandbook(){
  const host=$('#office-handbook');host.replaceChildren();
  if(!state.handbook){host.append(nodes('p','Das Handbuch wird gerade bereitgestellt. Bitte die Seite erneut laden.'));return;}
  const guide=nodes('div',null,'handbook-guide');
  for(const [title,copy] of state.handbook.steps){
    const block=nodes('details');block.append(nodes('summary',title),nodes('p',copy));guide.append(block);
  }
  host.append(guide,nodes('h3','Arbeitslinks'),nodes('p','Projektdateien und Google-Berichte öffnen sich mit den Rechten des dort angemeldeten Kontos.','hint'));
  const groups=nodes('div',null,'handbook-links');
  for(const [title,items] of state.handbook.groups){
    const group=nodes('section');group.append(nodes('h4',title));
    const list=nodes('ul');
    for(const [label,href] of items){
      const dest=new URL(href,location.origin);
      if(dest.protocol!=='https:'&&dest.origin!==location.origin)continue;
      const li=nodes('li'),a=link(li,label,href);a.target='_blank';a.rel='noopener noreferrer';
      list.append(li);
    }
    group.append(list);groups.append(group);
  }
  host.append(groups);
}
function resources(){
  const logos=$('#logos');link(logos,'SVG','/assets/marke.svg','FrankenPackt.svg');link(logos,'Signet (SVG)','/assets/signet.svg','FrankenPackt-Signet.svg');
  for(const ext of ['png','webp','jpg','pdf','ico'])link(logos,ext.toUpperCase(),'/assets/office/FrankenPackt.'+ext,'FrankenPackt.'+ext);
  for(const [name,color] of [['Salbei','#9CAF88'],['Off-White','#F7F5EF'],['Tomatenrot','#E8412C'],['Text','#202A22']]){
    const row=nodes('div',null,'swatch'),chip=nodes('i'),b=nodes('button',color);chip.style.backgroundColor=color;b.title='Farbcode kopieren';
    row.append(chip,nodes('span',name),b);$('#swatches').append(row);action(b,'click',async()=>{await navigator.clipboard.writeText(color);show(color+' kopiert.');});}
  for(const [caption,key] of [['Entrümpelung','entruempelung-franken'],['Umzug','umzug-franken'],['Seniorenumzug','seniorenumzug']]){
    const block=nodes('div'),im=nodes('img');im.src='/assets/'+key+'.webp';im.alt=caption;im.loading='lazy';block.append(im);link(block,caption+' · WebP',im.src,key+'.webp');$('#pictures').append(block);}
  const reg=$('#regional');for(const [k,caption] of Object.entries({sofa:'Einzelmöbel',keller:'Keller bis 6 m²',kellerMittel:'Keller über 6 bis 12 m²',kellerGross:'Keller über 12 bis 25 m²',kleinumzug:'Kleinumzug (Marktvergleich)'})){reg.append(nodes('p',caption+' · ab '+money(scenarioPrices[k]*100)));}
}
action($('#viewer'),'submit',async()=>{await api('viewer',{password:$('#pass').value});$('#pass').value='';await loadState();await startTab();});
action($('#otp'),'click',async()=>{await api('editor-start',{});show('E-Mail angefordert. Kopieren Sie den ursprünglichen Bestätigungslink aus der IXA-Mail in das Feld.');});
action($('#editor'),'submit',async()=>{await api('editor-verify',{code:$('#code').value});$('#code').value='';await loadState();await startTab();});
action($('#logout'),'click',async()=>{await api('logout',{});reset();});
action($('#quote-form'),'submit',async()=>{
  const items=state.rates.filter(r=>units(r)>0).map(r=>({id:r.id,revision:r.revision,quantity:units(r)}));if(!items.length)throw Error('Bitte mindestens eine Leistung auswählen.');
  const quote=await api('quote',{id:documentId,issuer:$('#issuer').value,customer:$('#customer').value,scope:$('#scope').value,items});showDoc(quote);
});
$('#quote-form').addEventListener('input',()=>{documentId=crypto.randomUUID();});
$('#print').addEventListener('click',()=>window.print());
action($('#back'),'click',async()=>{$('#document').hidden=true;$('#office').hidden=false;await openTab(activeTab);});
document.querySelectorAll('[data-open]').forEach(el=>action(el,'click',async()=>{
  await openTab(el.dataset.open);
  history.replaceState(null,'',location.pathname+location.search+'#'+activeTab);
}));
window.addEventListener('hashchange',()=>{if(state)startTab().catch(error=>show(error.message));});
async function downloadFile(ref,id){
  if(!/^AN-[0-9A-F]{16}$/.test(ref)||!/^\d{1,10}$/.test(id))throw Error('Vorgangs- und Dateinummer prüfen.');
  const r=await fetch('/api/office/files/'+ref+'/'+id,{cache:'no-store'});
  if(!r.ok){let data={};try{data=await r.json();}catch{}throw Error(data.error||'Datei konnte nicht geladen werden.');}
  const disposition=r.headers.get('Content-Disposition')||'';
  let name=disposition.match(/filename="([^"\\/]+)"/i)?.[1]||'Anlage-'+id;
  const encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if(encoded){try{name=decodeURIComponent(encoded);}catch{}}
  name=name.replace(/[\\/\u0000-\u001f]/g,'_');
  const url=URL.createObjectURL(await r.blob());const a=link(document.body,'Datei',url,name);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
action($('#file-form'),'submit',()=>downloadFile($('#case-ref').value.trim().toUpperCase(),$('#file-id').value));
const caseInbox=mountOfficeCases({api,action,editor:()=>state?.role==='editor',download:downloadFile,onQuote:async record=>{
  const fields=record.lead.jobScope?.fields||{};
  const address=[fields.fromStreet,[fields.fromZip,fields.fromTown].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const business=record.lead.business;
  $('#customer').value=business ? (business.recipient || [business.company,record.lead.name].filter(Boolean).join('\n')).slice(0,160) : [record.lead.name,address].filter(Boolean).join('\n').slice(0,160);
  $('#scope').value=[record.reference,business?.reference && 'Projekt-/Objektnummer '+business.reference,record.lead.details].filter(Boolean).join('\n').slice(0,1200);
  quantities.clear();documentId=crypto.randomUUID();drawRates();await openTab('calc');$('#calc').scrollIntoView();
}});
resources();
$('#case-ref').value=args.get('vorgang')||'';$('#file-id').value=args.get('datei')||'';
try{
  const fragment=new URLSearchParams(location.hash.slice(1));const token=fragment.get('access_token');
  if(token){history.replaceState(null,'',location.pathname+location.search);await api('editor-verify',{accessToken:token});}
  await loadState();await startTab();
}catch(err){if(!/anmelden/i.test(err.message))show(err.message);}
