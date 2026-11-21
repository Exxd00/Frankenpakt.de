import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {inquiry,legal,thankYou} from './form-pages.mjs';
import {clearanceCalculator} from './clearance-calculator.mjs';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
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
 {url:'/raeumung/',title:'Entrümpelung',caption:'Keller oder Wohnung',label:'Räumung planen',icon:'home',short:'Wir sichten den Hausrat mit Ihnen vor Ort und tragen die vereinbarten Stücke für die Weitergabe oder den Umzug hinaus.'},
 {url:'/entsorgung/',title:'Entsorgung',caption:'Sperrmüll und Geräte',label:'Entsorgungsweg finden',icon:'layers',short:'Finden Sie für alte Möbel, Elektrogeräte und besondere Abfälle die passende Anlaufstelle in Nürnberg.'},
 {url:'/umzug/',title:'Privatumzug',caption:'Die ganze Wohnung',label:'Wohnung wechseln',icon:'home',short:'Wir bringen gepackte Kartons und vereinbarte Möbel in Ihre neue Wohnung.'},
 {url:'/seniorenumzug/',title:'Seniorenumzug',caption:'Mit Angehörigen',label:'Seniorenumzug planen',icon:'key',short:'Planen Sie den Umzug in Ruhe, auf Wunsch gemeinsam mit Ihren Angehörigen.'}
];
const prices=[
 {id:'taxi',name:'Möbeltaxi',price:78,unit:'pro Fahrt',scope:'Ein vereinbartes Möbelstück, ein Fahrer. Bis 45 Minuten an den Bordsteinen und bis 10 km Gesamtroute ab und bis 90453. Eine benötigte zweite Trageperson stellen Sie.'},
 {id:'drei',name:'Umzugsteam · 3 Stunden',price:322,unit:'pro Einsatz',scope:'Zwei Personen mit Fahrzeug, drei Stunden Arbeit vor Ort. An- und Rückfahrt bis zusammen 20 km und 30 Minuten ab und bis 90453. Das Umzugsgut ist gepackt.'},
 {id:'kompakt',name:'Kompaktumzug',price:498,ab:true,unit:'pro Auftrag',scope:'Zwei Personen, bis 20 m³ insgesamt in höchstens zwei Ladungen. Bis fünf Stunden und 35 km ab und bis 90453. Erdgeschoss zu Erdgeschoss, je bis 15 m Trageweg, alles gepackt. Vor der Buchung prüfen wir Inventar, Gewicht je Ladung und Zugang. Dann erhalten Sie den Festpreis für den vereinbarten Umfang. Packen sowie Möbelabbau und -aufbau sind nicht enthalten. Für Entsorgung beauftragen Sie selbst einen Fachbetrieb.'},
 {id:'sieben',name:'Umzugsteam · 7 Stunden',price:789,unit:'pro Einsatz',scope:'Zwei Personen mit Fahrzeug. Sieben Stunden ab und bis 90453, bis 50 km Gesamtroute. Vereinbarte Fahrten und Fahrzeit sind Teil der sieben Stunden.'},
 {id:'extra',name:'Verlängerung',price:55,unit:'je 30 Minuten',scope:'Im laufenden Auftrag nach Vereinbarung für dieselben zwei Personen und dasselbe Fahrzeug. Eine zweite Anfahrt fällt dabei nicht an.'}
];
const euro=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0,minimumFractionDigits:0}).format(n);
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
    '<div class="dialog-actions"><a class="button" data-handoff-confirm rel="noreferrer"></a>'+
    '<a class="button secondary" data-handoff-callback href="/anfrage/?kontakt=telefon">Rückruf anfragen</a></div>'+
    '<p class="handoff-demo-result" role="status" hidden></p></dialog>';
}
function header(pathname){
  const nav=[['/raeumung/','Entrümpelung'],['/entsorgung/','Entsorgung'],['/umzug/','Umzüge'],['/preise/','Preise']];
  const request=({'/raeumung/':'/anfrage/?leistung=entruempelung','/entsorgung/':'/anfrage/?leistung=entsorgung'})[pathname]||'/anfrage/';
  return '<a class="skip" href="#inhalt">Zum Inhalt springen</a><header><div class="wrap mast"><a class="wordmark" href="/" aria-label="FrankenPackt, zur Startseite"><img src="/assets/marke.svg" alt="FrankenPackt" width="188" height="54"></a><button type="button" class="menutoggle js-only" aria-controls="primary" aria-expanded="false">'+ic('menu')+' Menü</button><nav aria-label="Hauptnavigation" id="primary">'+nav.map(([p,t])=>'<a href="'+p+'"'+(p===pathname?' aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav><a class="button head-cta" href="'+request+'"'+(pathname==='/anfrage/'?' aria-current="page"':'')+'>Anfrage stellen</a></div></header>';
}
function footer(pathname){
  const includeContacts=['/anfrage/','/danke/','/datenschutz/','/impressum/','/404/'].includes(pathname);
  return '<footer><div class="wrap footer-main"><div><a class="wordmark" aria-label="FrankenPackt, zur Startseite" href="/"><img src="/assets/marke.svg" width="175" height="49" alt="FrankenPackt"></a><p>Entrümpelung planen und Möbel transportieren in Nürnberg.</p>'+(includeContacts?contactChoices():'')+'</div><div class="footlinks"><a href="/moebeltaxi/">Möbeltaxi</a><a href="/seniorenumzug/">Seniorenumzug</a><a href="/preise/">Preisübersicht</a><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><button class="text-toggle js-only" aria-pressed="false" type="button">Größere Schrift</button></div></div></footer>';}
function shell(pathname,title,desc,body){
  const priceAssets=pathname==='/preise/' ? '<link rel="stylesheet" href="/assets/clearance-calculator.css"><script type="module" src="/assets/clearance-calculator.js"></script>' : '';
  return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#F7F5EF"><meta name="robots" content="noindex,follow"><meta name="description" content="'+desc+'"><title>'+title+' · '+brand+'</title><link rel="icon" href="/assets/signet.svg" type="image/svg+xml"><link rel="preload" href="/assets/bricolage.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/mobile.css"><link rel="stylesheet" href="/assets/mobile-inner.css"><link rel="stylesheet" href="/assets/contact.css">'+(['/anfrage/','/danke/'].includes(pathname)?'<link rel="stylesheet" href="/assets/inquiry.css">':'')+priceAssets+'<script defer src="/assets/site.js"></script><script defer src="/assets/contact.js"></script></head><body>'+header(pathname)+'<main id="inhalt" tabindex="-1">'+body+'</main>'+footer(pathname)+contactDialog()+'</body></html>';}
function crumb(text){return '<nav class="crumb" aria-label="Brotkrumennavigation"><a href="/">Startseite</a><span aria-hidden="true">/</span><span>'+text+'</span></nav>';}
function endCta(service='umzug'){return '<section class="endcta"><div class="wrap end-inner"><div><h2>Was steht bei Ihnen an?</h2><p>Beschreiben Sie kurz, was mitkommen soll und wie die Räume erreichbar sind.</p></div><div class="actions">'+btn('Anfrage vorbereiten','/anfrage/?service='+service)+contactChoices(service)+'</div></div></section>';}
function serviceCards(){
  const cards=services.map(s=>
    '<a class="service-card" href="'+s.url+'"><span class="icon-tile">'+ic(s.icon,28)+'</span>'+
    '<h3>'+s.title+'</h3><p>'+s.short+'</p><span class="card-link">'+s.label+'</span>'+
    '<span class="mobile-caption">'+s.caption+'</span></a>'
  ).join('');
  return '<section class="wrap section" id="leistungen"><div class="section-head"><h2>Was haben Sie vor?</h2></div>'+
    '<div class="service-grid">'+cards+'</div></section>';
}
function faq(qas){return '<div class="faq">'+qas.map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join('')+'</div>';}
function steps(){
  const title='Wie fange ich an?';
  return '<section class="how"><div class="wrap how-inner"><div class="how-title"><h2>'+title+'</h2></div>'+
    '<details class="process-steps" open><summary><h2>'+title+'</h2></summary><ol class="steps">'+
    '<li><b>Ein Zimmer auswählen</b><p>Zeigen Sie uns den Keller, das Zimmer oder die Wohnung. Gemeinsam kennzeichnen wir, was Sie behalten oder weitergeben möchten.</p></li>'+
    '<li><b>Den Weg für jedes Stück festlegen</b><p>Wer übernimmt das Regal? Wer holt das alte Sofa ab? Für Sperrmüll finden Sie hier die <a href="/entsorgung/#entsorgungswege">Anlaufstellen in Nürnberg</a>.</p></li>'+
    '<li><b>Den Transport abstimmen</b><p>Für Möbel, die weitergenutzt werden, können Sie bei FrankenPackt einen <a href="/anfrage/?service=transport">Transport anfragen</a>. Nennen Sie die beiden Adressen, das Stockwerk und den Wunschtermin.</p></li></ol></details></div></section>';
}
const home='<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="hero-heading"><div class="location">'+ic('pin',17)+
  ' Nürnberg und Umgebung</div><h1>Entrümpeln<br><em>&amp; entsorgen.</em></h1></div><p>Wir sortieren mit Ihnen vor Ort und tragen heraus, was Sie behalten oder weitergeben möchten. Für Abfälle buchen Sie die Abholung direkt bei der Stadt oder einem Fachbetrieb.</p>'+
  '<div class="actions">'+btn('Preis berechnen','/preise/#raeumungsrechner')+btn('Entsorgungswege','/entsorgung/',true)+'</div>'+contactChoices('entruempelung')+'</div>'+
  '<div class="hero-picture"><img src="/assets/entruempelung-franken.webp" width="1200" height="800" fetchpriority="high" alt="Zwei Frauen sortieren eine Schale und weiteren Hausrat"></div></div></section>'+
  serviceCards()+steps();
const serviceContent={
 '/umzug/':{t:'Privatumzug',desc:'Privatumzug mit zwei Personen und Fahrzeug ab Nürnberg. Zeit, Zugang und Leistung vor dem Termin abstimmen.',h:'Ihre neue Wohnung.<br><em>Ihr Umzug.</em>',p:'Wir tragen und transportieren gepackte Kartons und vereinbarte Möbel. Sie wählen ein Team auf Zeit oder lassen einen kompakten Umzug kalkulieren.',s:'umzug',img:'umzug-franken',alt:'Kartons und Umzugsgut vor einem Hauseingang',which:'drei',title:'Was wir vorab klären',list:[['Umzugsgut','Welche großen Möbelstücke und wie viele Kartons wechseln die Adresse? Was bleibt zurück?'],['Zugang an beiden Orten','Stockwerk, Aufzug, enger Hausflur und die Entfernung zum Fahrzeug bestimmen den Aufwand.'],['Fahrt und Hilfe','An- und Rückfahrt gehören zur Gesamtroute ab 90453. Sagen Sie uns, was gepackt ist und wer mithilft.']],faqs:[['Was ist im 3-Stunden-Paket enthalten?','Zwei Personen und Fahrzeug für drei Stunden Arbeit vor Ort. Hin- und Rückfahrt sind bis insgesamt 20 km und 30 Minuten ab und bis 90453 enthalten.'],['Können Termine gleich online gebucht werden?','Die Anfrage ist unverbindlich. Ein Termin steht erst nach Abstimmung und schriftlicher Vereinbarung fest.']]},
 '/seniorenumzug/':{t:'Seniorenumzug',desc:'Seniorenumzüge in Nürnberg gemeinsam planen. Wünsche, Unterstützung von Angehörigen, Zugang und Ablauf persönlich abstimmen.',h:'Umziehen<br><em>in Ihrem Tempo.</em>',p:'Ein Wohnungswechsel lässt sich Schritt für Schritt planen. Wir gehen mit Ihnen oder einer Vertrauensperson durch, welche Möbel mitkommen und welche Hilfe Sie brauchen.',s:'seniorenumzug',img:'seniorenumzug',alt:'Anschauliche Szene zur Umzugsplanung für ältere Menschen',which:'drei',title:'Ein Plan, der zu Ihnen passt',list:[['Vertraute Personen einbeziehen','Auf Ihren Wunsch klären wir die Planung gemeinsam mit einem Angehörigen. Sie bestimmen, wer Ansprechperson ist.'],['Raum für Raum besprechen','Welche Lieblingsstücke sollen mit? Wo stehen sie im neuen Zuhause? Ein kurzer Zimmerplan hilft beim Einräumen.'],['Einen erreichbaren Termin finden','Nennen Sie Ihren Wunschtermin oder wählen Sie einen Rückruf. Pflege, Betreuung und Personentransport gehören nicht zum Umzug.']],faqs:[['Kann meine Tochter oder mein Sohn die Anfrage übernehmen?','Ja. Eine Vertrauensperson kann eigene Kontaktdaten angeben und in Ihrem Auftrag um Rücksprache bitten.'],['Brauche ich Fotos oder eine E-Mail-Adresse?','Für eine erste Anfrage reichen eine kurze Beschreibung und eine erreichbare Telefonnummer oder E-Mail-Adresse. Fotos sind im Formular nicht nötig.']]},
 '/moebeltaxi/':{t:'Möbeltaxi',desc:'Ein Möbelstück in Nürnberg von Bordstein zu Bordstein transportieren. Reichweite und Tragehilfe vorab prüfen.',h:'Ein Möbelstück.<br><em>Eine Fahrt.</em>',p:'Der Tisch ist gekauft, die Kommode soll umziehen. Nennen Sie die Maße sowie Abhol- und Zielort. Wir prüfen, ob die Bordsteinfahrt für Ihr Möbelstück passt.',s:'moebeltaxi',img:'umzug-franken',alt:'Umzugsgut beim Transport von einem Wohnhaus',which:'taxi',title:'So passt die Bordsteinfahrt',list:[['Am Bordstein bereitstellen','Ein Fahrer übernimmt das vereinbarte Stück am Bordstein und bringt es zum vereinbarten Bordstein am Ziel.'],['Maße und Tragehilfe','Bitte nennen Sie Maße und Gewicht. Eine erforderliche zweite Trageperson stellen Sie bei diesem Paket.'],['Reichweite','Bis 45 Minuten vor Ort und zehn Kilometer Gesamtroute ab und bis 90453 sind im Preisbeispiel enthalten.']],faqs:[['Wird das Möbelstück in die Wohnung getragen?','Für Tragen aus oder in die Wohnung fragen Sie ein Umzugsteam an. Das Möbeltaxi-Paket ist für den Übergang am Bordstein kalkuliert.'],['Nehmen Sie ein altes Sofa zur Entsorgung mit?','Für die Entsorgung vereinbaren Sie einen separaten Auftrag mit einer geeigneten Fachfirma. Informationen stehen auf der Seite Räumung.']]}
};
function detail(d) {
  const item = prices.find(p => p.id === d.which);
  const fullDay = d.s === 'umzug' ? prices.find(p => p.id === 'sieben') : null;
  const request = '/anfrage/?service=' + d.s + (fullDay ? '&amp;paket=' + fullDay.id : '');
  const priceUrl = '/preise/?service=' + d.s + '&amp;paket=';
  const leadOffer = fullDay ? '<div class="lead-offer"><strong>' + euro(fullDay.price) + ' · 2 Personen und Fahrzeug</strong><span>7 Stunden ab und bis 90453 Nürnberg · bis 50 km Gesamtroute. Endpreis inkl. 19 % USt.</span></div>' : '';
  return '<div class="subhead service-heading" data-interest-service="'+d.s+'" data-interest-package="'+(fullDay?.id||'')+'"><div class="wrap">' + crumb(d.t) +
    '<div class="detail-hero"><div><h1>' + d.h + '</h1><p class="lead">' + d.p + '</p>' + leadOffer + '<div class="actions">' +
    btn(fullDay ? '7-Stunden-Team anfragen' : 'Anfrage vorbereiten', request) +
    btn('Preis prüfen',priceUrl+(fullDay||item).id+'#preisfinder',true) + '</div>'+contactChoices(d.s,fullDay?.id)+'</div><div class="detail-img"><img src="/assets/' +
    d.img + '.webp" width="900" height="650" alt="' + d.alt + '"></div></div></div></div>' +
    '<section class="wrap section service-facts"><div class="section-head"><h2>' + d.title + '</h2></div><div class="info-grid">' +
    d.list.map(([h,p]) => '<article><h3>' + h + '</h3><p>' + p + '</p></article>').join('') +
    '</div><div class="mobile-facts">' + faq(d.list) + '</div><div class="price-callout"><div>' + ic('tag',28) + '<div><h3>' + item.name + ' · ' + euro(item.price) +
    '</h3><p>' + item.scope + ' Endpreis inkl. 19 % USt.</p></div></div>' + btn('Preise prüfen',priceUrl + item.id + '#preisfinder',true) +
    '</div></section><section class="faq-section"><div class="wrap faq-layout"><h2>Häufige Fragen</h2>' + faq(d.faqs) + '</div></section>' + endCta(d.s);
}
function planningPage(page) {
  const cards=page.steps.map(([title,copy,icon])=>'<article>'+ic(icon,28)+'<h3>'+title+'</h3><p>'+copy+'</p></article>').join('');
  return '<section class="subhead clearance-heading" data-interest-service="'+page.service+'"><div class="wrap narrowhero">'+
    crumb(page.name)+'<h1>'+page.heading+'</h1><p class="lead">'+page.intro+'</p><div class="actions">'+
    btn('Preis berechnen','/preise/?leistung='+page.service+'#raeumungsrechner')+btn(page.cta,'/anfrage/?leistung='+page.service,true)+'</div>'+contactChoices(page.service)+'</div></section>'+
    '<section id="'+page.anchor+'" class="wrap section service-facts"><h2>'+page.section+'</h2><div class="info-grid">'+cards+
    '</div><div class="mobile-facts">'+faq(page.steps)+'</div></section>'+
    '<section class="faq-section" id="kosten"><div class="wrap faq-layout"><h2>'+page.faqTitle+'</h2>'+faq(page.questions)+'</div></section>';
}
const clear=planningPage({
  service:'entruempelung',name:'Entrümpelung',heading:'Entrümpelung in<br><em>Nürnberg planen.</em>',
  intro:'Wir gehen mit Ihnen durch Keller oder Wohnung, sortieren gemeinsam den Hausrat und tragen die vereinbarten Stücke hinaus. Was Sie behalten oder verschenken, bringen wir auf Wunsch zur neuen Adresse. Für Abfälle beauftragen Sie die Stadt oder einen Fachbetrieb direkt.',
  cta:'Räumung anfragen',anchor:'ablauf',section:'Was steht in Ihren Räumen?',
  steps:[
    ['Keller und Dachboden','Notieren Sie sperrige Stücke und die Zahl der Kisten. Messen Sie bei großen Möbeln die engste Stelle im Treppenhaus aus.','box'],
    ['Wohnungsauflösung','Wir kennzeichnen mit Ihnen die Möbel zur Mitnahme oder Weitergabe. Sie bestimmen, welche Unterlagen, Fotos und Erinnerungsstücke zuerst gesichert werden sollen.','home'],
    ['Möbel mitnehmen','Für den Transport zu einer neuen Adresse brauchen wir eine Möbelliste, Stockwerk, Aufzug und Trageweg. Einzelne Stücke können Sie auch per <a href="/moebeltaxi/">Möbeltaxi</a> anfragen.','van']
  ],
  faqTitle:'Aufwand und Übergabe',
  questions:[
    ['Was bestimmt den Preis einer Entrümpelung?','Bei einer vollständigen Räumung können Menge, Demontage, Treppen, Laufwege und Abfallarten den Preis beeinflussen. Lassen Sie sich vom gewählten Räumungsbetrieb schriftlich auflisten, was er trägt, abholt und entsorgt.'],
    ['Wer übernimmt die Abholung?','Für Sperrmüll können Sie sich direkt an die Stadt oder einen geeigneten Entsorgungsbetrieb wenden. Unsere Übersicht zeigt die <a href="/entsorgung/#entsorgungswege">Entsorgungswege für Nürnberg</a>.'],
    ['Wie plane ich die Schlüsselübergabe?','Notieren Sie Ihren Übergabetermin und klären Sie, welche Einbauten bleiben. Vereinbaren Sie mit den beauftragten Betrieben, wann Möbel und Abfälle aus den Räumen sein sollen.']
  ]
});
const disposal=planningPage({
  service:'entsorgung',name:'Entsorgung',heading:'Was möchten Sie<br><em>entsorgen?</em>',
  intro:'Ein ausgedientes Sofa, ein Kühlschrank oder Reste von Lack gehören an unterschiedliche Stellen. Hier finden Sie die Anlaufstellen in Nürnberg. Die Abholung vereinbaren Sie direkt mit der Stadt oder Ihrem Entsorgungsbetrieb.',
  cta:'Entsorgungsweg klären',anchor:'entsorgungswege',section:'Wohin mit diesen Dingen?',
  steps:[
    ['Möbel und Matratzen','Ein Sofa, ein Schrank oder eine Matratze können zum Sperrmüll gehören. Nürnberger Haushalte können einmal im Kalenderjahr kostenlos eine Abholung beantragen. Geben Sie die Stücke und ihre Anzahl an. <a href="https://www.nuernberg.de/internet/abfallwirtschaft/sperrmuell.html">Sperrmüll bei der Stadt Nürnberg anmelden</a>.','home'],
    ['Elektrogeräte','Für Kühlschränke und Waschmaschinen kommen Nürnberger Wertstoffhöfe infrage. Prüfen Sie vor der Fahrt die Annahmebedingungen und Mengen. <a href="https://www.nuernberg.de/internet/abfallwirtschaft/wertstoffhoefe.html">Annahme am Wertstoffhof prüfen</a>.','layers'],
    ['Lacke und Lösungsmittel','Für solche Reste bietet die Stadt das Schadstoffmobil an. Prüfen Sie Stoff und Annahmebedingungen vor dem Transport. <a href="https://www.nuernberg.de/internet/abfallwirtschaft/schadstoffmobil.html">Standorte und Termine des Schadstoffmobils</a>.','pin']
  ],
  faqTitle:'Kosten und Abholung',
  questions:[
    ['Wann ist ein Container sinnvoll?','Wenn mehrere Räume voll sind, fragen Sie Ihren Entsorgungsbetrieb nach Containergröße, zulässigen Materialien und Stellfläche. Für den Preisvergleich zählen Anfahrt, Abholung, Standzeit, enthaltenes Gewicht und mögliche Zuschläge.'],
    ['Was kann ich mit gut erhaltenen Stücken tun?','Klären Sie mit der Person oder Einrichtung, die das Möbelstück übernehmen möchte, ob es passt und wann es ankommen soll. Für die Fahrt dorthin können Sie bei FrankenPackt einen <a href="/anfrage/?service=transport">Möbeltransport anfragen</a>.'],
    ['Was gilt außerhalb der Stadt Nürnberg?','Für Fürth, Erlangen und die Landkreise gelten die Angebote der jeweiligen kommunalen Abfallwirtschaft. Wenden Sie sich an die für die Adresse des Haushalts zuständige Stelle.']
  ]
});
function pricePage() {
  const note = 'Stand 20. November 2026. Bei Treppen, längeren Laufwegen, mehreren Fahrten, Außenaufzug, Packmaterial oder Halteverbotszone stimmen wir den Aufwand vorab mit Ihnen ab. Für Entsorgung und Spezialtransporte wählen und beauftragen Sie selbst einen geeigneten Fachbetrieb.';
  const mobileRows = prices.map(item => {
    const value = (item.ab ? '<small>ab</small> ' : '') + euro(item.price);
    return '<details><summary><span class="tile-name">' + item.name + '</span><span class="tile-price">' + value +
      '</span><span class="tile-unit">' + item.unit + '</span></summary><p>' + item.scope + '</p></details>';
  }).join('');
  const marketExamples = [
    ['1 Zimmer, bis 40 m²','400–750 €'], ['2 Zimmer, bis 65 m²','650–1.200 €'],
    ['3 Zimmer, bis 90 m²','1.000–1.800 €'], ['4 Zimmer','1.400–2.600 €'],
    ['Einfamilienhaus','1.800–5.000 €']
  ];
  const householdGuide = '<div class="wrap household-guide"><details><summary>Was kostet eine komplette Haushaltsauflösung?</summary>' +
    '<p>LV Transporte nennt für abgeschlossene Räumungen in Nürnberg und Umgebung diese Gesamtpreise einschließlich Entsorgung und Mehrwertsteuer. Diese Vergleichswerte gelten für den gesamten Auftrag beim Fremdanbieter.</p>' +
    '<table><thead><tr><th scope="col">Wohnung oder Haus</th><th scope="col">Preisspanne</th></tr></thead><tbody>' +
    marketExamples.map(([home,range])=>'<tr><th scope="row">'+home+'</th><td>'+range+'</td></tr>').join('') +
    '</tbody></table><p>Füllmenge, Treppen und verwertbare Möbel beeinflussen das Angebot. <a href="https://entrumpelungnurnberg.de/haushaltsaufloesung-nuernberg">Preisbeispiele von LV Transporte, September 2026</a></p></details></div>';
  const overview = '<section class="wrap mobile-prices"><h2>Preisbeispiele für Umzüge</h2><p class="tile-hint">Paket antippen und Bedingungen ansehen.</p>' +
    '<div class="price-tiles">' + mobileRows + '</div><details class="price-note"><summary>Stand und weitere Kosten</summary><p>' + note + '</p></details></section>';
  const desktopRows = prices.map(i=>'<article data-paket="'+i.id+'" data-euro="'+i.price+'" data-ab="'+Boolean(i.ab)+'"><div><h3>'+i.name+'</h3><p>'+i.scope+'</p></div><div class="amount"><strong>'+(i.ab?'ab ':'')+euro(i.price)+'</strong><small>'+i.unit+'</small></div></article>').join('');
  return '<div class="subhead pricing-heading" id="raeumungskosten"><div class="wrap narrowhero">'+crumb('Preise')+'<h1>Was kostet<br><em>mein Vorhaben?</em></h1><p class="lead">Schätzen Sie Tragehilfe und Entsorgung direkt hier. Für Ihren Umzug gibt es einen <a href="#preisfinder">eigenen Preisfinder</a>.</p></div></div>' + clearanceCalculator() + householdGuide + overview +
    '<section class="wrap section" id="preisfinder"><div class="estimate-layout"><div><h2>Preisfinder für Umzüge</h2><p>Alle Preisbeispiele sind Endpreise für Privatkunden inklusive 19 % Umsatzsteuer. Wir prüfen Umfang, Gewicht, Zugang und Route, bevor Sie buchen.</p><form id="estimate" class="tool-form"><label for="paket">Gewünschte Leistung</label><select id="paket" name="paket">'+prices.filter(i=>i.id!=='extra').map(c=>'<option value="'+c.id+'"'+(c.id==='drei'?' selected':'')+'>'+c.name+'</option>').join('')+'<option value="anders">Andere Leistung oder unklarer Umfang</option></select><div id="estimate-conditions"></div><div id="estimate-extra"></div><label for="fit">Passen die genannten Bedingungen?</label><select id="fit"><option value="unknown">Das möchte ich prüfen lassen</option><option value="yes">Ja, voraussichtlich</option><option value="no">Nein, der Umfang weicht ab</option></select><button class="button js-only" type="submit">Preis einschätzen</button></form><noscript><p>Alle Paketpreise und Bedingungen finden Sie in der Preisübersicht. Über die Anfrage können Sie den passenden Umfang klären.</p></noscript></div><div class="estimate-result" id="estimate-result" role="status" aria-live="polite"><span class="large-icon">'+ic('tag',32)+'</span><h3>Ihre Preisorientierung</h3><p>Nach Ihrer Auswahl sehen Sie hier den passenden Richtpreis oder den nächsten Schritt zur persönlichen Kalkulation.</p></div></div></section>' +
    '<section class="price-section desktop-prices"><div class="wrap"><h2>Preisbeispiele für Umzüge</h2><div class="tariffs">' + desktopRows +
    '</div><p class="fine">' + note + '</p></div></section>' + endCta();
}

const pages=[
 ['/', 'Entrümpeln und entsorgen in Nürnberg', 'Entrümpelung für Keller und Wohnung vorbereiten, Entsorgungswege für Sperrmüll in Nürnberg finden und den Transport brauchbarer Möbel anfragen.',home],
 ...Object.entries(serviceContent).map(([u,d])=>[u,d.t+' in Nürnberg',d.desc,detail(d)]),
 ['/raeumung/','Entrümpelung in Nürnberg planen','Kellerentrümpelung und Wohnungsauflösung vorbereiten. Hausrat sortieren, Zugang prüfen und den Transport weiter genutzter Möbel in Nürnberg anfragen.',clear],
 ['/entsorgung/','Entsorgung und Sperrmüll in Nürnberg','Alte Möbel, Elektrogeräte und Lacke in Nürnberg entsorgen. Städtische Sperrmüllabholung, Wertstoffhöfe und das Schadstoffmobil direkt finden.',disposal],
 ['/preise/','Preisrechner für Entrümpelung, Entsorgung und Umzug','Tragehilfe, Sperrmüll und Container für Nürnberg selbst einschätzen. Bruttopreise, Bedingungen und regionale Vergleichswerte direkt ansehen.',pricePage()],
 ['/anfrage/','Anfrage zu Entrümpelung, Entsorgung oder Umzug','Anliegen in Nürnberg beschreiben, Entsorgungswege klären oder einen Transport anfragen und den gewünschten Rückmeldeweg wählen.',inquiry(crumb,ic)],
 ['/danke/','Rückmeldung zu Ihrer Anfrage','Rückmeldung zu Ihrer Anfrage bei FrankenPackt.',thankYou(crumb,ic)],
 ['/impressum/','Impressum','Anbieterangaben zur Website von FrankenPackt.',legal(crumb,false)],
 ['/datenschutz/','Datenschutz','Informationen zum Umgang mit Angaben auf dieser Website.',legal(crumb,true)]
];
for(const [url,title,description,body] of pages){const out=path.join(dir,url);await mkdir(out,{recursive:true});await writeFile(path.join(out,'index.html'),shell(url,title,description,body),'utf8');}
await writeFile(path.join(dir,'404.html'),shell('/404/','Seite nicht gefunden','Diese Seite ist nicht verfügbar.','<section class="wrap section"><h1>Seite nicht gefunden</h1><p>Auf der Startseite finden Sie Entrümpelung, Entsorgungswege und Umzüge.</p>'+btn('Zur Startseite','/')+'</section>'),'utf8');
await writeFile(path.join(dir,'robots.txt'),'User-agent: *\nDisallow: /\n','utf8');
