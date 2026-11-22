import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {inquiry,legal,thankYou} from './form-pages.mjs';
import {clearanceCalculator} from './clearance-calculator.mjs';
import {scenarioPrices} from './scenario-prices.mjs';
import {cloudPage} from './lib/cloud-pages.mjs';
import {taskPages} from './task-pages.mjs';
import {breadcrumbItems,guideServices,publicOrigin,publicPagePaths,robots,searchPaths,sitemap} from './search-site.mjs';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
await mkdir(path.join(dir,'assets'), {recursive:true});
await writeFile(path.join(dir,'assets/richtpreise.js'), 'export const scenarioPrices = '+JSON.stringify(scenarioPrices,null,2)+';\n', 'utf8');
const {priceComparison}=await import('./price-comparison.mjs');
const brand='FrankenPackt';
const iconpaths={
 pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 home:'<path d="m3 11 9-7 9 7v9H3z"/><path d="M8 20v-7h7v7"/>',
 van:'<path d="M2 6h12v11H2zM14 9h4l4 5v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 box:'<path d="m2 7 10-5 10 5v11l-10 5-10-5Z"/><path d="m2 7 10 5 10-5M12 12v11M7 4.5l10 5"/>',
 key:'<circle cx="8" cy="9" r="5"/><path d="m12.2 12 9 9M18 18l2-2M15.5 15.5l2-2"/>',
 list:'<path d="M8 5h13M8 12h13M8 19h13"/><path d="m2 5 1 1 2-3m-3 9 1 1 2-3m-3 9 1 1 2-3"/>',
 layers:'<path d="m2 8 10-5 10 5-10 5L2 8Zm0 5 10 5 10-5M2 18l10 5 10-5"/>',
 chat:'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8Z"/><path d="M7 9h10M7 13h6"/>',
 check:'<path d="m4 12 5 5L20 6"/>', phone:'<path d="m7 3 2 5-2 2c1.5 3.2 3.5 5.2 7 7l2-2 5 2c-.3 3-1.3 5-4 4C9 19 5 15 3 7c-.7-3 1-4 4-4Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chev:'<path d="m9 5 7 7-7 7"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="m4 4 16 16M20 4 4 20"/>',
 tag:'<path d="M2 3h9l11 10-9 9L2 12z"/><circle cx="7.4" cy="8" r="1.5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>'
};
function ic(n,size=22){return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+iconpaths[n]+'</svg>';}
const services=[
 {url:'/entsorgung/',title:'Einzelnes entsorgen',caption:'Sofa, Matratze oder Gerät',label:'Zur Entsorgung',icon:'layers',short:'Sie wissen schon, welche Dinge weg sollen, etwa eine alte Couch und zwei Matratzen.'},
 {url:'/raeumung/',title:'Räume leeren',caption:'Keller, Garage oder Wohnung',label:'Zur Entrümpelung',icon:'home',short:'Ein Raum soll frei werden. Sie bestimmen, was bleibt, was weitergegeben wird und was heraus soll.'},
 {url:'/moebeltaxi/',title:'Möbel liefern',caption:'Ein Stück zur neuen Adresse',label:'Zum Möbeltaxi',icon:'van',short:'Ein Schrank, ein Tisch oder ein paar Möbel wechseln den Besitzer oder sollen an eine andere Adresse.'},
 {url:'/umzug/',title:'Umziehen',caption:'Möbel und Kartons mitnehmen',label:'Zum Privatumzug',icon:'box',short:'Ihr Hausrat zieht mit Ihnen um. Wir planen das Tragen und die Fahrt zwischen Ihren beiden Wohnungen.'}
];
const prices=[
 {id:'drei',name:'Umzugsteam · 3 Stunden',price:322,unit:'pro Einsatz',scope:'Zwei Personen mit Fahrzeug, drei Stunden Arbeit vor Ort. An- und Rückfahrt bis zusammen 20 km und 30 Minuten ab und bis 90453. Das Umzugsgut ist gepackt.'},
 {id:'kompakt',name:'Kompaktumzug',price:498,unit:'pro Auftrag',scope:'Zwei Personen, bis 20 m³ insgesamt in höchstens zwei Ladungen. Bis fünf Stunden und 35 km ab und bis 90453. Erdgeschoss zu Erdgeschoss, je bis 15 m Trageweg, alles gepackt. Vor der Buchung prüfen wir Inventar, Gewicht je Ladung und Zugang. Danach erhalten Sie Ihr persönliches Angebot. Packen sowie Möbelabbau und -aufbau sind nicht enthalten. Das Paket gilt für den Transport von Umzugsgut. Entsorgungskosten sind darin nicht enthalten.'},
 {id:'sieben',name:'Umzugsteam · 7 Stunden',price:789,unit:'pro Einsatz',scope:'Zwei Personen mit Fahrzeug. Sieben Stunden ab und bis 90453, bis 50 km Gesamtroute. Vereinbarte Fahrten und Fahrzeit sind Teil der sieben Stunden.'},
 {id:'extra',name:'Verlängerung',price:55,unit:'je 30 Minuten',scope:'Im laufenden Auftrag nach Vereinbarung für dieselben zwei Personen und dasselbe Fahrzeug. Eine zweite Anfahrt fällt dabei nicht an.'}
];
const formatEuro=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0,minimumFractionDigits:0});
const startingPrice = amount => 'ab ' + formatEuro.format(amount);
const btn=(text,url,alt=false)=>'<a class="button'+(alt?' secondary':'')+'" href="'+url+'">'+text+'</a>';
function contactChoices(service='',pack=''){
  const serviceParam=['entruempelung','entsorgung'].includes(service)?'leistung':'service';
  const callback='/anfrage/?kontakt=telefon'+(service?'&amp;'+serviceParam+'='+service:'')+(pack?'&amp;paket='+pack:'');
  const callbackIcon='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m20 3-6 6m0-5v5h5M6 3l3 5-2 2a15 15 0 0 0 7 7l2-2 5 3c-1 4-3 4-6 3A25 25 0 0 1 3 9C2 6 3 3 6 3Z"/></svg>';
  return '<div class="contact-choices" role="group" aria-label="Kontaktwege">'+
    '<a class="contact-choice" data-contact="phone" hidden href="/anfrage/?kontakt=telefon">'+ic('phone',18)+'Anrufen</a>'+
    '<a class="contact-choice" data-contact="whatsapp" hidden href="/anfrage/">'+ic('chat',18)+'WhatsApp</a>'+
    '<a class="contact-choice" data-contact="callback" href="'+callback+'">'+callbackIcon+'Rückruf</a></div>';
}
function contactDialog(){
  return '<dialog id="contact-dialog" class="contact-dialog" data-contact-mode="preview" aria-labelledby="handoff-title" aria-describedby="handoff-explanation">'+
    '<button type="button" class="dialog-close" aria-label="Schließen">'+ic('close',22)+'</button>'+
    '<h2 id="handoff-title" tabindex="-1"></h2><p id="handoff-explanation"></p><p class="handoff-number" hidden></p>'+
    '<p class="handoff-preview" hidden></p><label class="handoff-consent" hidden><input type="checkbox"> Diesen Klick für die interne Statistik mitzählen (freiwillig).</label>'+
    '<div class="dialog-actions">'+
    '<a class="button secondary" data-handoff-callback href="/anfrage/?kontakt=telefon">Rückruf anfragen</a></div>'+
    '<p class="handoff-demo-result" role="status" hidden></p></dialog>';
}
function header(pathname){
  const nav=[['/raeumung/','Entrümpelung'],['/entsorgung/','Entsorgung'],['/umzug/','Umzüge'],['/preise/','Preise']];
  const guide=taskPages.find(page=>page.path===pathname);
  const request=guide?taskRequest(guide):({
    '/raeumung/':'/anfrage/?leistung=entruempelung','/entsorgung/':'/anfrage/?leistung=entsorgung',
    '/umzug/':'/anfrage/?service=umzug','/moebeltaxi/':'/anfrage/?service=moebeltaxi','/seniorenumzug/':'/anfrage/?service=seniorenumzug'
  })[pathname]||'/anfrage/';
  return '<a class="skip" href="#inhalt">Zum Inhalt springen</a><header><div class="wrap mast"><a class="wordmark" href="/" aria-label="FrankenPackt, zur Startseite"><img src="/assets/marke.svg" alt="FrankenPackt" width="175" height="27"></a><button type="button" class="menutoggle js-only" aria-controls="primary" aria-expanded="false">'+ic('menu')+' Menü</button><nav aria-label="Hauptnavigation" id="primary">'+nav.map(([p,t])=>'<a href="'+p+'"'+(p===pathname?' aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav><a class="button head-cta" href="'+request+'"'+(pathname==='/anfrage/'?' aria-current="page"':'')+'>Anfrage stellen</a></div></header>';
}
function footer(pathname){
  const includeContacts=['/anfrage/','/danke/','/datenschutz/','/impressum/','/404/'].includes(pathname);
  return '<footer><div class="wrap footer-main"><div><a class="wordmark" aria-label="FrankenPackt, zur Startseite" href="/"><img src="/assets/marke.svg" width="175" height="27" alt="FrankenPackt"></a><p>Entrümpelung planen und Möbel transportieren in Nürnberg.</p>'+(includeContacts?contactChoices():'')+'</div><div class="footlinks"><a href="/moebeltaxi/">Möbeltaxi</a><a href="/seniorenumzug/">Seniorenumzug</a><a href="/preise/">Preisübersicht</a><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><button class="text-toggle js-only" aria-pressed="false" type="button">Größere Schrift</button><div class="stat-choice"><button type="button" class="stat-toggle" data-statistics aria-describedby="stat-details" aria-pressed="false" hidden>Statistik einschalten</button><small id="stat-details">Optionale Nutzungsstatistik mit Google Analytics und unserem Ereignisblatt. <a href="/datenschutz/#statistik">Details</a></small></div></div></div></footer>';}
function shell(pathname,title,desc,body){
  const scopeStyle = ['/preise/', '/anfrage/'].includes(pathname) ? '<link rel="stylesheet" href="/assets/job-scope.css">' : '';
  const priceAssets=scopeStyle + (pathname==='/preise/' ? '<link rel="stylesheet" href="/assets/clearance-calculator.css"><link rel="stylesheet" href="/assets/price-comparison.css"><script type="module" src="/assets/clearance-calculator.js"></script><script type="module" src="/assets/price-comparison.js"></script><script type="module" src="/assets/price-guide.js"></script>' : '');
  return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#F7F5EF"><meta name="robots" content="noindex,follow"><meta name="description" content="'+desc+'"><title>'+title+' · '+brand+'</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" sizes="any"><link rel="preload" href="/assets/bricolage.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/mobile.css"><link rel="stylesheet" href="/assets/mobile-inner.css"><link rel="stylesheet" href="/assets/contact.css">'+(['/anfrage/','/danke/'].includes(pathname)?'<link rel="stylesheet" href="/assets/inquiry.css">':'')+priceAssets+'<script defer src="/assets/site.js"></script><script defer src="/assets/contact.js"></script><script type="module" src="/assets/metrics.js"></script></head><body>'+header(pathname)+'<main id="inhalt" tabindex="-1">'+body+'</main>'+footer(pathname)+contactDialog()+'</body></html>';}
function crumb(text){return '<nav class="crumb" aria-label="Brotkrumennavigation"><a href="/">Startseite</a><span aria-hidden="true">/</span><span>'+text+'</span></nav>';}
function text(value){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function topicList(title,pages){
  if(!pages.length)return '';
  return '<section class="wrap topics"><h2>'+text(title)+'</h2><ul>'+pages.map(page=>'<li><a href="'+page.path+'">'+text(page.label)+'</a></li>').join('')+'</ul></section>';
}
function taskRequest(page){
  const serviceParam=['entruempelung','entsorgung'].includes(page.service)?'leistung':'service';
  return '/anfrage/?'+serviceParam+'='+page.service+'&amp;thema='+encodeURIComponent(page.path.split('/').filter(Boolean).at(-1));
}
function taskPage(page){
  const crumbs=breadcrumbItems(page.path).map(([label,url],i,items)=>i===items.length-1?'<span aria-current="page">'+text(label)+'</span>':'<a href="'+url+'">'+text(label)+'</a>');
  const request=taskRequest(page);
  const hasPriceGuide=['entruempelung','entsorgung','umzug'].includes(page.service);
  const secondary=hasPriceGuide
    ?btn('Richtpreis einschätzen','/preise/?vorhaben='+page.service+'&amp;thema='+encodeURIComponent(page.path.split('/')[1])+'#richtpreis',true)
    :btn('Angaben für das Angebot','#angaben',true);
  const imageBase='/assets/ratgeber/'+page.path.split('/')[1];
  const picture='<figure class="task-photo"><img src="'+imageBase+'-960.webp" srcset="'+imageBase+'-480.webp 480w, '+imageBase+'-960.webp 960w" sizes="(max-width: 780px) calc(100vw - 2rem), (max-width: 1240px) 40vw, 480px" width="960" height="640" fetchpriority="high" alt="'+text(page.photoAlt)+'"><figcaption>KI-Beispielbild</figcaption></figure>';
  const intro='<section class="subhead task-heading" data-interest-service="'+page.service+'"><div class="wrap task-hero"><nav class="crumb" aria-label="Brotkrumennavigation">'+crumbs.join('<span aria-hidden="true">/</span>')+'</nav>'+
    '<h1>'+text(page.heading)+'</h1>'+picture+'<p class="lead">'+text(page.intro)+'</p><div class="task-choices"><div class="actions"><a class="button" data-guide-choice="'+page.service+'" href="'+request+'">'+text(page.inquiryLabel||'Vorhaben anfragen')+'</a>'+
    secondary+'</div><a class="guide-callback" data-contact="callback" href="'+request+'&amp;kontakt=telefon">'+ic('phone',18)+'Rückruf anfragen</a></div></div></section>';
  const details='<div id="angaben" class="wrap task-sections">'+page.sections.map(([heading,paragraph])=>'<section><h2>'+text(heading)+'</h2><p>'+text(paragraph)+'</p></section>').join('')+'</div>';
  const answers='<section class="faq-section"><div class="wrap faq-layout"><h2>Häufige Fragen</h2><div>'+faq(page.questions.map(([q,a])=>[text(q),text(a)]))+
    '<p class="guide-offer">Wir prüfen Ihre Angaben und nennen Ihnen Umfang und Preis im persönlichen Angebot. '+
    '<a href="'+request+'">'+text(page.inquiryLabel)+'</a></p></div></div></section>';
  const related=page.related.map(url=>taskPages.find(item=>item.path===url));
  if(related.some(item=>!item))throw new Error('Unbekannte Themenseite bei '+page.path);
  return intro+details+answers+topicList('Verwandte Vorhaben',related);
}
function endCta(service='umzug'){return '<section class="endcta"><div class="wrap end-inner"><div><h2>Was steht bei Ihnen an?</h2><p>Beschreiben Sie kurz, was mitkommen soll und wie die Räume erreichbar sind.</p></div><div class="actions">'+btn('Anfrage vorbereiten','/anfrage/?service='+service)+contactChoices(service)+'</div></div></section>';}
function serviceCards(){
  const cards=services.map(s=>
    '<a class="service-card" href="'+s.url+'"><span class="icon-tile">'+ic(s.icon,28)+'</span>'+
    '<h3>'+s.title+'</h3><p>'+s.short+'</p><span class="card-link">'+s.label+'</span>'+
    '<span class="mobile-caption">'+s.caption+'</span></a>'
  ).join('');
  return '<section class="wrap section" id="leistungen" tabindex="-1"><div class="section-head"><h2>Was soll mit den Sachen passieren?</h2></div>'+
    '<div class="service-grid">'+cards+'</div><div class="service-alternatives"><p>Ein Teil geht zur Familie, der Rest soll raus? <a href="/wohnungsaufloesung/">Wohnungsauflösung planen</a></p>'+
    '<p>Sie organisieren einen Umzug für Angehörige? <a href="/seniorenumzug/">Seniorenumzug planen</a></p></div></section>';
}
function faq(qas){return '<div class="faq">'+qas.map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join('')+'</div>';}
function steps(){
  const title='Wie komme ich zum Angebot?';
  return '<section class="how"><div class="wrap how-inner"><div class="how-title"><h2>'+title+'</h2></div>'+
    '<details class="process-steps" open><summary><h2>'+title+'</h2></summary><ol class="steps">'+
    '<li><b>Vorhaben beschreiben</b><p>Geben Sie an, welche Sachen bleiben, abgeholt oder geliefert werden sollen. Für einen vollen Keller helfen Fläche und Füllstand, für ein Sofa Maße und Stückzahl.</p></li>'+
    '<li><b>Aufwand einschätzen</b><p>Stockwerk, Aufzug und Weg zum Fahrzeug beeinflussen den Preis. Im <a href="/preise/">Rechner</a> erhalten Sie für passende Vorhaben einen unverbindlichen Ab-Preis.</p></li>'+
    '<li><b>Angebot prüfen</b><p>Senden Sie uns Ihre <a href="/anfrage/">Anfrage</a>. Wir prüfen die Angaben und schicken Ihnen die vorgesehenen Arbeiten mit Preis. Sie entscheiden, ob Sie das Angebot annehmen.</p></li></ol></details></div></section>';
}
function responsivePhoto(name,alt,hero=false){
  const width=hero?1200:1280;
  const sizes=hero?'(max-width: 539px) 37vw, (max-width: 780px) 44vw, (max-width: 1020px) calc(50vw - 32px), (max-width: 1470px) 45vw, 662px':'(max-width: 780px) clamp(60px, 20vw, 120px), (max-width: 1470px) 43vw, 598px';
  const base='/assets/'+name;
  return '<img src="'+base+'.webp" srcset="'+base+'-360.webp 360w, '+base+'-720.webp 720w, '+base+'.webp '+width+'w" sizes="'+sizes+'" width="'+width+'" height="'+(hero?800:853)+'" fetchpriority="high" alt="'+text(alt)+'">';
}
const home='<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="hero-heading"><div class="location">'+ic('pin',17)+
  ' Nürnberg und Umgebung</div><h1>Entrümpeln<br><em>&amp; entsorgen.</em></h1></div><p>Eine Couch soll raus, ein Keller muss leer werden oder Möbel ziehen um? Wählen Sie Ihr Vorhaben. Wir prüfen den Aufwand und nennen Ihnen den Preis im persönlichen Angebot.</p>'+
  '<div class="actions">'+btn('Vorhaben wählen','#leistungen')+btn('Preis einschätzen','/preise/',true)+'</div>'+contactChoices()+'</div>'+
  '<div class="hero-picture">'+responsivePhoto('entruempelung-franken','Zwei Frauen sortieren eine Schale und weiteren Hausrat',true)+'</div></div></section>'+
  serviceCards()+topicList('Häufige Vorhaben',taskPages.filter(page=>['/kueche-abbauen/','/sofa-entsorgen/','/keller-entruempeln/','/wohnungsaufloesung/'].includes(page.path)))+steps()+
  '<div class="wrap"><p data-business-address hidden></p></div>';
const serviceContent={
 '/umzug/':{t:'Privatumzug',desc:'Privatumzug mit zwei Personen und Fahrzeug ab Nürnberg. Zeit, Zugang und Leistung vor dem Termin abstimmen.',h:'Ihre neue Wohnung.<br><em>Ihr Umzug.</em>',p:'Wir tragen und transportieren gepackte Kartons und vereinbarte Möbel. Sie wählen ein Team auf Zeit oder lassen einen kompakten Umzug kalkulieren.',s:'umzug',img:'umzug-franken',alt:'Kartons und Umzugsgut vor einem Hauseingang',which:'drei',title:'Was wir vorab klären',list:[['Umzugsgut','Welche großen Möbelstücke und wie viele Kartons wechseln die Adresse? Was bleibt zurück?'],['Zugang an beiden Orten','Stockwerk, Aufzug, enger Hausflur und die Entfernung zum Fahrzeug bestimmen den Aufwand.'],['Fahrt und Tragen','Unser Team trägt und verlädt Ihr Umzugsgut an beiden Adressen. Hin- und Rückfahrt zählen zur Gesamtroute ab 90453.']],faqs:[['Was ist im 3-Stunden-Paket enthalten?','Zwei Personen und Fahrzeug für drei Stunden Arbeit vor Ort. Hin- und Rückfahrt sind bis insgesamt 20 km und 30 Minuten ab und bis 90453 enthalten.'],['Können Termine gleich online gebucht werden?','Die Anfrage ist unverbindlich. Ein Termin steht erst nach Abstimmung und schriftlicher Vereinbarung fest.']]},
 '/seniorenumzug/':{t:'Seniorenumzug',desc:'Seniorenumzüge in Nürnberg gemeinsam planen. Wünsche, Ansprechperson, Zugang und Ablauf persönlich abstimmen.',h:'Umziehen<br><em>in Ihrem Tempo.</em>',p:'Ein Wohnungswechsel lässt sich Schritt für Schritt planen. Wir gehen mit Ihnen oder einer Vertrauensperson durch, welche Möbel mitkommen und welche Hilfe Sie brauchen.',s:'seniorenumzug',img:'seniorenumzug',alt:'Anschauliche Szene zur Umzugsplanung für ältere Menschen',which:'drei',title:'Ein Plan, der zu Ihnen passt',list:[['Vertraute Personen einbeziehen','Auf Ihren Wunsch klären wir die Planung gemeinsam mit einem Angehörigen. Sie bestimmen, wer Ansprechperson ist.'],['Raum für Raum besprechen','Welche Lieblingsstücke sollen mit? Wo stehen sie im neuen Zuhause? Ein kurzer Zimmerplan hilft beim Einräumen.'],['Einen erreichbaren Termin finden','Nennen Sie Ihren Wunschtermin oder wählen Sie einen Rückruf. Pflege, Betreuung und Personentransport gehören nicht zum Umzug.']],faqs:[['Kann meine Tochter oder mein Sohn die Anfrage übernehmen?','Ja. Eine Vertrauensperson kann eigene Kontaktdaten angeben und in Ihrem Auftrag um Rücksprache bitten.'],['Brauche ich Fotos oder eine E-Mail-Adresse?','Für eine erste Anfrage reichen eine kurze Beschreibung und eine erreichbare Telefonnummer oder E-Mail-Adresse. Fotos sind im Formular nicht nötig.']]},
 '/moebeltaxi/':{t:'Möbeltaxi',desc:'Möbeltransport in Nürnberg mit Abholung, Tragen und Lieferung durch unser Team. Persönliches Angebot nach Maßen, Gewicht und Zugang.',h:'Ein Möbelstück.<br><em>Von Tür zu Tür.</em>',p:'Unser Team holt Ihr Möbelstück am vereinbarten Platz ab, trägt es zum Fahrzeug und bringt es am Ziel an seinen Platz. Für Ihr Angebot brauchen wir die Maße und den Zugang an beiden Adressen.',s:'moebeltaxi',img:'umzug-franken',alt:'Umzugsgut beim Transport von einem Wohnhaus',title:'So planen wir Ihren Möbeltransport',list:[['Das Möbelstück','Nennen Sie Art, Anzahl, Maße und möglichst das Gewicht.'],['Der Weg zum Fahrzeug','Etage, Aufzug, Treppen und die Entfernung zum Stellplatz helfen uns, das passende Team zu planen.'],['Am Ziel','Unser Team übernimmt auch das Ausladen und Tragen bis zum vereinbarten Platz.']],faqs:[['Wer trägt das Möbelstück?','Unser Team übernimmt das Tragen an beiden Adressen. Geben Sie bitte an, ob das Möbelstück durch Türen, Treppenhaus und Aufzug passt.'],['Wie erfahre ich den Preis?','Nach Prüfung von Möbelstück, Strecke und Zugang erhalten Sie Ihr persönliches Angebot.'],['Was gilt für ausgediente Möbel?','Das Möbeltaxi bringt Möbel an eine neue Adresse. Für ausgediente Stücke beschreiben Sie uns Ihr Vorhaben in der <a href="/anfrage/?leistung=entsorgung">Entsorgungsanfrage</a>.']]}
};
function detail(d) {
  const item = prices.find(p => p.id === d.which);
  const fullDay = d.s === 'umzug' ? prices.find(p => p.id === 'sieben') : null;
  const request = '/anfrage/?service=' + d.s;
  const priceUrl = '/preise/?service=' + d.s + '&amp;paket=';
  const priceLink = fullDay ? '/preise/?vorhaben=umzug#richtpreis' : '#transportablauf';
  const requestLabel={umzug:'Umzug anfragen',seniorenumzug:'Seniorenumzug anfragen',moebeltaxi:'Möbeltransport anfragen'}[d.s];
  const teamChoice = fullDay ? '<p class="comparison-shortcut">Für einen längeren Einsatz: <a href="'+priceUrl+fullDay.id+'#preisfinder">7-Stunden-Team '+startingPrice(fullDay.price)+' ansehen</a></p>' : '';
  return '<div class="subhead service-heading" data-interest-service="'+d.s+'"><div class="wrap">' + crumb(d.t) +
    '<div class="detail-hero"><div><h1>' + d.h + '</h1><p class="lead">' + d.p + '</p><div class="actions">' +
    btn(requestLabel, request) +
    btn(fullDay ? 'Preis einschätzen' : 'Ablauf ansehen',priceLink,true) + '</div>'+contactChoices(d.s)+'</div><div class="detail-img">'+responsivePhoto(d.img,d.alt)+'</div></div></div></div>' +
    '<section class="wrap section service-facts" id="transportablauf"><div class="section-head"><h2>' + d.title + '</h2></div><div class="info-grid">' +
    d.list.map(([h,p]) => '<article><h3>' + h + '</h3><p>' + p + '</p></article>').join('') +
    '</div><div class="mobile-facts">' + faq(d.list) + '</div>' + (item ? '<div class="price-callout"><div>' + ic('tag',28) + '<div><h3>' + item.name + ' · ' + startingPrice(item.price) +
    '</h3><p>' + item.scope + ' Unverbindlicher Richtpreis inkl. 19 % USt.</p></div></div>' + btn('Preise prüfen',priceUrl + item.id + '#preisfinder',true) +
    '</div>' : '') + teamChoice + '</section><section class="faq-section"><div class="wrap faq-layout"><h2>Häufige Fragen</h2>' + faq(d.faqs) + '</div></section>' + endCta(d.s);
}
function planningPage(page) {
  const cards=page.steps.map(([title,copy,icon])=>'<article>'+ic(icon,28)+'<h3>'+title+'</h3><p>'+copy+'</p></article>').join('');
  return '<section class="subhead clearance-heading" data-interest-service="'+page.service+'"><div class="wrap narrowhero">'+
    crumb(page.name)+'<h1>'+page.heading+'</h1><p class="lead">'+page.intro+'</p><div class="actions">'+
    btn(page.cta,'/anfrage/?leistung='+page.service)+btn('Richtpreis einschätzen','/preise/?vorhaben='+page.service+'#richtpreis',true)+'</div>'+contactChoices(page.service)+'</div></section>'+
    '<section id="'+page.anchor+'" class="wrap section service-facts"><h2>'+page.section+'</h2><div class="info-grid">'+cards+
    '</div><div class="mobile-facts">'+faq(page.steps)+'</div></section>'+
    topicList('Ihr Vorhaben im Detail',taskPages.filter(task=>task.service===page.service))+
    '<section class="faq-section" id="kosten"><div class="wrap faq-layout"><h2>'+page.faqTitle+'</h2>'+faq(page.questions)+'</div></section>';
}
const clear=planningPage({
  service:'entruempelung',name:'Entrümpelung',heading:'Entrümpelung in<br><em>Nürnberg planen.</em>',
  intro:'Ein Raum soll frei werden? Sie bestimmen, was bleibt, was entsorgt werden soll und welche Stücke zur Familie ziehen. Beschreiben Sie das gemeinsam in einer Anfrage. Wir prüfen Umfang und Preis für die gewünschten Arbeiten.',
  cta:'Räumung anfragen',anchor:'ablauf',section:'Was steht in Ihren Räumen?',
  steps:[
    ['Keller und Dachboden','Notieren Sie sperrige Stücke und die Zahl der Kisten. Messen Sie bei großen Möbeln die engste Stelle im Treppenhaus aus.','box'],
    ['Wohnungsauflösung','Unser Team kennzeichnet die Möbel nach Ihren Vorgaben. Sie bestimmen, welche Unterlagen, Fotos und Erinnerungsstücke zuerst gesichert werden sollen.','home'],
    ['Möbel mitnehmen','Für den Transport zu einer neuen Adresse brauchen wir eine Möbelliste, Stockwerk, Aufzug und Trageweg. Einzelne Stücke können Sie auch per <a href="/moebeltaxi/">Möbeltaxi</a> anfragen.','van']
  ],
  faqTitle:'Aufwand und Übergabe',
  questions:[
    ['Was bestimmt den Preis einer Entrümpelung?','Ein gut erreichbarer Keller mit wenigen Kisten braucht weniger Zeit als eine volle Wohnung ohne Aufzug. Hilfreich sind die ungefähre Menge, große Möbelstücke und der Weg zum Fahrzeug. Im Angebot sehen Sie, welche Arbeiten und Kosten enthalten sind.'],
    ['Ich möchte nur einzelne Stücke loswerden. Was wähle ich?','Für eine Couch, eine Matratze oder einzelne Geräte passt die <a href="/anfrage/?leistung=entsorgung">Entsorgungsanfrage</a>. Geht es um einen ganzen Raum mit verschiedenen Sachen, erfassen Sie die Stücke zusammen in Ihrer Räumungsanfrage.'],
    ['Wie plane ich die Schlüsselübergabe?','Nennen Sie uns das Datum, an dem die Räume übergeben werden, und markieren Sie Einbauten, die bleiben sollen. So können wir einen passenden Termin für die vereinbarten Arbeiten anbieten.']
  ]
});
const disposal=planningPage({
  service:'entsorgung',name:'Entsorgung',heading:'Was möchten Sie<br><em>entsorgen?</em>',
  intro:'Eine alte Couch, Matratzen oder Geräte sollen weg? Nennen Sie Stückzahl, Maße, Stockwerk und Weg zum Fahrzeug. Wir prüfen, was wir übernehmen können, und nennen Ihnen Leistungen und Preis im Angebot.',
  cta:'Entsorgung anfragen',anchor:'entsorgungswege',section:'Was möchten Sie aussortieren?',
  steps:[
    ['Möbel und Matratzen','Geben Sie Anzahl und ungefähre Maße an. Bei einem Sofa oder Schrank ist wichtig, ob das Stück am Stück durch die Tür passt oder zerlegt werden muss.','home'],
    ['Elektrogeräte','Nennen Sie die Geräteart und den Standort. Bei einer Waschmaschine oder einem Kühlschrank hilft uns die Angabe, ob das Gerät bereits vom Anschluss getrennt ist.','layers'],
    ['Lacke und Lösungsmittel','Lacke, Lösungsmittel und unbekannte Flüssigkeiten holen wir nicht ab. Wenn solche Stoffe im Raum stehen, vermerken Sie das bitte in der Anfrage.','pin']
  ],
  faqTitle:'Kosten und Abholung',
  questions:[
    ['Wann ist ein Container sinnvoll?','Bei größeren Mengen helfen Materialart, geschätztes Volumen und Stellfläche bei der Planung. Im <a href="/preise/?leistung=entsorgung#raeumungsrechner">Rechner</a> können Sie die Richtwerte für verschiedene Größen ansehen.'],
    ['Ein Teil soll weg, ein Teil zur Familie. Wie frage ich das an?','Soll ein Keller oder eine Wohnung leer werden, beschreiben Sie beide Aufgaben in der <a href="/anfrage/?leistung=entruempelung">Räumungsanfrage</a>. Für ein einzelnes brauchbares Möbelstück, das nur zur neuen Adresse soll, wählen Sie das <a href="/moebeltaxi/">Möbeltaxi</a>.'],
    ['Kann ich auch für eine Adresse im Umland anfragen?','Ja. Geben Sie die Postleitzahl des Einsatzorts und Ihren Wunschtermin an. Wir prüfen, ob wir die gewünschten Arbeiten an dieser Adresse anbieten können.']
  ]
});
function scopeSlot(calculator) {
  return `<details class="calculator-scope" data-calc-scope="${calculator}" name="calculator-job-details"><summary>Auftragsdetails für mein Angebot eingeben</summary><div data-scope-mount></div></details>`;
}

function pricePage() {
  const note = 'Stand 20. November 2026. Bei Treppen, längeren Laufwegen, mehreren Fahrten, Außenaufzug, Packmaterial oder Halteverbotszone stimmen wir den Aufwand vorab mit Ihnen ab. Entsorgung und Spezialtransporte sind in den Umzugspaketen nicht enthalten.';
  const mobileRows = prices.map(item => {
    const value = startingPrice(item.price);
    return '<details><summary><span class="tile-name">' + item.name + '</span><span class="tile-price">' + value +
      '</span><span class="tile-unit">' + item.unit + '</span></summary><p>' + item.scope + '</p></details>';
  }).join('');
  const marketExamples = [
    ['1 Zimmer, bis 40 m²','400–750 €'], ['2 Zimmer, bis 65 m²','650–1.200 €'],
    ['3 Zimmer, bis 90 m²','1.000–1.800 €'], ['4 Zimmer','1.400–2.600 €'],
    ['Einfamilienhaus','1.800–5.000 €']
  ];
  const householdGuide = '<div class="wrap household-guide"><details><summary>Was kostet eine komplette Haushaltsauflösung?</summary>' +
    '<p>Die Tabelle zeigt regionale Vergleichspreise für vollständige Räumungen in Nürnberg und Umgebung, einschließlich Entsorgung und Mehrwertsteuer. Für Ihr persönliches Angebot zählen die tatsächlich vereinbarten Arbeiten.</p>' +
    '<table><thead><tr><th scope="col">Wohnung oder Haus</th><th scope="col">Preisspanne</th></tr></thead><tbody>' +
    marketExamples.map(([home,range])=>'<tr><th scope="row">'+home+'</th><td>'+range+'</td></tr>').join('') +
    '</tbody></table><p>Stand der Vergleichswerte ist September 2026. Füllmenge, Treppen und verwertbare Möbel beeinflussen den Preis.</p></details></div>';
  const overview = '<section class="wrap mobile-prices"><h2>Preisbeispiele für Umzüge</h2><p class="tile-hint">Paket antippen und Bedingungen ansehen.</p>' +
    '<div class="price-tiles">' + mobileRows + '</div><details class="price-note"><summary>Stand und weitere Kosten</summary><p>' + note + '</p></details></section>';
  const desktopRows = prices.map(i=>'<article data-paket="'+i.id+'" data-euro="'+i.price+'"><div><h3>'+i.name+'</h3><p>'+i.scope+'</p></div><div class="amount"><strong>'+startingPrice(i.price)+'</strong><small>'+i.unit+'</small></div></article>').join('');
  const choices = [
    ['entruempelung','Entrümpelung','Räume räumen','home'],
    ['entsorgung','Entsorgung','Gegenstände abgeben','layers'],
    ['umzug','Umzug','Wohnung wechseln','box']
  ];
  const navigation = '<nav class="guide-choices" aria-label="Leistung für die Preiseinschätzung">'+choices.map(([service,name,caption,icon])=>
    '<a data-guide-choice="'+service+'" href="/preise/?vorhaben='+service+'">'+ic(icon,24)+'<span><strong>'+name+'</strong><small>'+caption+'</small></span></a>'
  ).join('')+'</nav>';
  const header = '<div class="subhead pricing-heading" id="raeumungskosten"><div class="wrap narrowhero">'+crumb('Preise')+
    '<h1>Was kostet<br><em>mein Vorhaben?</em></h1>'+navigation+
    '<a class="guide-callback" data-contact="callback" href="/anfrage/?kontakt=telefon">'+ic('phone',18)+'Rückruf anfragen</a></div></div>';
  const serviceTools = '<nav class="wrap guide-tools" aria-label="Weitere Preise" hidden>'+
    '<a data-guide-more="umzug" href="#preisfinder">Umzugspakete und Teamzeiten ansehen</a>'+
    '<a data-guide-more="entruempelung entsorgung" href="#raeumungsrechner">Abholung und Containerkosten ansehen</a></nav>';
  const moving =
    '<section class="wrap section" id="preisfinder"><div class="estimate-layout"><div><h2>Preisfinder für Umzüge</h2><p>Alle Ab-Preise verstehen sich inklusive 19 % Umsatzsteuer. Ihr persönliches Angebot erhalten Sie, nachdem wir Umfang, Gewicht, Zugang und Strecke geprüft haben.</p><form id="estimate" class="tool-form"><label for="paket">Gewünschte Leistung</label><select id="paket" name="paket">'+prices.filter(i=>i.id!=='extra').map(c=>'<option value="'+c.id+'"'+(c.id==='drei'?' selected':'')+'>'+c.name+'</option>').join('')+'<option value="moebeltaxi">Möbeltaxi · persönliches Angebot</option><option value="anders">Andere Leistung oder unklarer Umfang</option></select><div id="estimate-conditions"></div><div id="estimate-extra"></div><label for="fit">Passen die genannten Bedingungen?</label><select id="fit"><option value="unknown">Das möchte ich prüfen lassen</option><option value="yes">Ja, voraussichtlich</option><option value="no">Nein, der Umfang weicht ab</option></select><button class="button js-only" type="submit">Preis einschätzen</button></form><noscript><p>Alle Paketpreise und Bedingungen finden Sie in der Preisübersicht. Über die Anfrage können Sie den passenden Umfang klären.</p></noscript></div><div class="estimate-result" id="estimate-result" role="status" aria-live="polite"><span class="large-icon">'+ic('tag',32)+'</span><h3>Ihre Preisorientierung</h3><p>Nach Ihrer Auswahl sehen Sie hier den passenden Richtpreis oder den nächsten Schritt zur persönlichen Kalkulation.</p></div></div>' + scopeSlot('moving') + '</section>';
  const tariffs = '<details class="wrap guide-tariffs"><summary>Alle Umzugspakete und Bedingungen</summary>' + overview +
    '<section class="price-section desktop-prices"><div class="wrap"><h2>Preisbeispiele für Umzüge</h2><div class="tariffs">' + desktopRows +
    '</div><p class="fine">' + note + '</p></div></section></details>';
  const fallback = '<noscript><p class="wrap guide-fallback">Für den persönlichen Richtwert benötigen Sie JavaScript. <a href="/anfrage/">Anfrage öffnen</a> oder unten Paketpreise und Richtwerte nachlesen.</p></noscript>';
  return '<div data-guided-pricing>'+header+fallback+priceComparison(scopeSlot('comparison'))+serviceTools+
    clearanceCalculator(scopeSlot('clearance'))+moving+tariffs+householdGuide+'</div>';
}

const pages=[
 ['/', 'Entrümpelung &amp; Entsorgung in Nürnberg', 'Keller oder Wohnung räumen? Wir helfen beim Sortieren, Tragen und Transportieren. Beschreiben Sie Ihr Vorhaben und erhalten Sie ein persönliches Angebot.',home],
 ...Object.entries(serviceContent).map(([u,d])=>[u,d.t+' in Nürnberg',d.desc, detail(d)+topicList('Ihr Vorhaben im Detail',taskPages.filter(page=>page.service===d.s))]),
 ['/raeumung/','Entrümpelung in Nürnberg planen','Kellerentrümpelung und Wohnungsauflösung vorbereiten. Hausrat sortieren, Zugang prüfen und den Transport weiter genutzter Möbel in Nürnberg anfragen.',clear],
 ['/entsorgung/','Entsorgung und Sperrmüll in Nürnberg','Ein Sofa, alte Geräte oder ein voller Keller in Nürnberg? Nennen Sie uns Gegenstände, Menge und Zugang. Wir prüfen Ihre Anfrage und den passenden Leistungsumfang.',disposal],
 ['/preise/','Preisrechner für Entrümpelung, Entsorgung und Umzug','Was kostet Ihr Vorhaben in Nürnberg? Berechnen Sie einen unverbindlichen Richtpreis für Entrümpelung, Entsorgung oder Umzug anhand Ihrer Angaben.',pricePage()],
 ['/anfrage/','Anfrage zu Entrümpelung, Entsorgung oder Umzug','Entrümpelung, Entsorgung oder Umzug in Nürnberg anfragen. Nennen Sie Inventar, Zugang und Termin und fügen Sie auf Wunsch Fotos bei.',inquiry(crumb,ic)],
 ['/danke/','Rückmeldung zu Ihrer Anfrage','Rückmeldung zu Ihrer Anfrage bei FrankenPackt.',thankYou(crumb,ic)],
 ['/impressum/','Impressum','Anbieterangaben zur Website von FrankenPackt.',legal(crumb,false)],
 ['/datenschutz/','Datenschutz','Informationen zum Umgang mit Angaben auf dieser Website.',legal(crumb,true)]
];
pages.push(...taskPages.map(page=>[page.path,text(page.title),text(page.description),taskPage(page)]));
const generatedRoutes=new Set(pages.map(([url])=>url));
if(generatedRoutes.size!==pages.length||publicPagePaths.length!==pages.length||publicPagePaths.some(url=>!generatedRoutes.has(url)))throw new Error('Seiten und öffentliche Routen stimmen nicht überein.');
const guideLabels=Object.fromEntries(taskPages.map(page=>[page.path,page.label]));
const manifest=Object.entries({publicOrigin,publicPagePaths,searchPaths,guideServices,guideLabels}).map(([key,value])=>'export const '+key+' = '+JSON.stringify(value,null,2)+';');
await writeFile(path.join(dir,'assets','search-routes.js'),manifest.join('\n')+'\n','utf8');
for(const [url,title,description,body] of pages){
  const html=shell(url,title,description,body);
  const preview=path.join(dir,url), production=path.join(dir,'betrieb',url);
  await Promise.all([mkdir(preview,{recursive:true}),mkdir(production,{recursive:true})]);
  await Promise.all([
    writeFile(path.join(preview,'index.html'),html,'utf8'),
    writeFile(path.join(production,'index.html'),cloudPage(html,url),'utf8')
  ]);
}
await writeFile(path.join(dir,'betrieb','robots.txt'),robots(publicOrigin),'utf8');
await writeFile(path.join(dir,'betrieb','sitemap.xml'),sitemap(publicOrigin),'utf8');
await writeFile(path.join(dir,'404.html'),shell('/404/','Seite nicht gefunden','Diese Seite ist nicht verfügbar.','<section class="wrap section"><h1>Seite nicht gefunden</h1><p>Auf der Startseite finden Sie unsere Leistungen für Entrümpelung, Entsorgung und Umzüge.</p>'+btn('Zur Startseite','/')+'</section>'),'utf8');
await writeFile(path.join(dir,'robots.txt'),robots(null),'utf8');
