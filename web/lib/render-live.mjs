import {breadcrumbItems,searchHead,searchPaths} from '../search-site.mjs';
import {phoneLines} from '../public/assets/phone-lines.js';
import {whatsappDraft} from '../public/assets/contact-channel.js';

function escapeHtml(value){
  return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function lines(value){return escapeHtml(value).replace(/\r?\n/g,'<br>');}
export function liveHtml(html,settings,canonical){
  const tel='<a href="tel:'+escapeHtml(settings.phone)+'">'+escapeHtml(settings.phoneDisplay)+'</a>';
  const campaignPhones=settings.phone===phoneLines.main.phone
    ? ' data-google-phone="'+phoneLines.google.phone+'" data-kleinanzeigen-phone="'+phoneLines.kleinanzeigen.phone+'"'
    : '';
  const mail='<a href="mailto:'+escapeHtml(settings.email)+'">'+escapeHtml(settings.email)+'</a>';
  const privacy=escapeHtml(settings.privacyContact);
  const pathname=new URL(canonical).pathname;
  const topic = breadcrumbItems(pathname).at(-1)?.[0];
  const chatUrl = /^\+[1-9]\d{6,14}$/.test(settings.whatsapp || '')
    ? 'https://wa.me/'+settings.whatsapp.slice(1)+'?text='+encodeURIComponent(whatsappDraft(pathname === '/preise/' ? null : topic)) : '';
  const robots=searchPaths.includes(pathname)?'index,follow':pathname==='/danke/'?'noindex,nofollow':'noindex,follow';
  const operator='<p><strong>'+escapeHtml(settings.operatorName)+'</strong><br>'+lines(settings.legalAddress)+'</p><p>Telefon '+tel+'<br>E-Mail '+mail+'</p>';
  const adSourceInfo='<h2>Herkunft einer Anfrage</h2><p>Wenn Sie über einen gekennzeichneten Anzeigenlink anfragen, speichern wir mit der Anfrage die Quellenkategorie und die Bezeichnung der Anzeige. Diese Bezeichnung ist für alle Personen aus derselben Anzeige gleich. So können wir intern auswerten, welche Angebote zu Aufträgen führen. Wir verwenden dafür keine Werbe-Cookies oder individuellen Klickkennungen.</p>';
  const recipients=settings.privacyExtra?'<p>'+lines(settings.privacyExtra)+'</p>':'';
  const staffMailInfo=settings.staffMailEnabled?'<h2>Benachrichtigung unseres Teams</h2><p>Für die Bearbeitung Ihrer Anfrage erhält unser Team eine E-Mail im betrieblichen Postfach. Der Versanddienst Resend verarbeitet dafür Ihren Namen, Ihre Kontaktangabe und die in der Nachricht zusammengefassten Auftrags- oder Rückrufdetails.</p>':'';
  const localCounterChoice = settings.contactMetrics ? '<label hidden><input type="checkbox" data-local-contact-consent autocomplete="off"> Bestätigte Kontaktklicks auf dieser Seite für die interne Statistik mitzählen</label>' : '';
  const optionalMetrics=settings.contactMetrics?'<h2>Freiwillige Kontaktmessung</h2><p>Über das Auswahlfeld im Fußbereich dieser Seite können Sie der internen Kontaktstatistik zustimmen. Nach Ihrer Zustimmung erhöht eine bestätigte Kontaktaktion einen betriebseigenen Tageszähler für Aktion und Quellenkategorie. Eine zufällige Kennung pro Aktion wird zur Erkennung wiederholter Übertragungen für etwa 24 Stunden als Prüfwert gespeichert. Das Auswahlfeld gilt für die aktuelle Seite und lässt sich jederzeit abwählen.</p>':'';
  const whatsappInfo=chatUrl?'<h2>Kontakt über WhatsApp</h2><p>Wenn Sie WhatsApp öffnen, erhält der Dienst unter anderem Ihre Verbindungsadresse und den angezeigten Nachrichtentext. Der Entwurf verwendet das öffentliche Seitenthema oder die ausgewählte Leistung im Raum Nürnberg. Ihre freien Eingaben, Kontaktdaten und Dateianhänge werden nicht übernommen. Im Chat können Sie den Text ändern und selbst absenden. Alternativ erreichen Sie uns über das Formular oder telefonisch. <a href="https://www.whatsapp.com/legal/privacy-policy-eea" rel="noreferrer">Datenschutzhinweise von WhatsApp</a></p>':'';
  const privacyInfo='<h2>Empfänger und Aufbewahrung</h2><p>Anfragen werden im Auftragssystem des Betriebs bearbeitet. Zum Vorgang erfassen wir einen gewünschten Rückruf und, nach Prüfung durch Mitarbeitende, den tatsächlichen Kontakt. Die Löschfrist im Auftragssystem beträgt '+Number(settings.retentionDays)+' Tage ab Abschluss und Zahlungsausgleich oder ab Schließung einer erledigten Anfrage. Offene Forderungen werden bis zur Klärung weiter bearbeitet. Die Aufbewahrung von Auftrags- und Rechnungsunterlagen richtet sich nach den gesetzlichen Fristen. Seitenaufrufe werden nach Tag, Seite und Quellenkategorie zusammengezählt. Der Server begrenzt Zugriffe anhand der Verbindungsadresse vorübergehend für höchstens zwei Minuten im Arbeitsspeicher.</p>'+adSourceInfo+optionalMetrics+whatsappInfo+staffMailInfo+recipients+'<p>Datenschutzkontakt: '+privacy+'</p>';
  const extra=settings.legalExtra?'<p>'+lines(settings.legalExtra)+'</p>':'';
  return html
    .replace('<div class="stat-choice"',localCounterChoice+'<div class="stat-choice"')
    .replace('<meta name="robots" content="noindex,follow">','<meta name="robots" content="'+robots+'">')
    .replaceAll('data-contact-mode="preview"','data-contact-mode="live" data-metrics="'+(settings.contactMetrics?'1':'0')+'"'+campaignPhones)
    .replaceAll('data-contact="phone" hidden href="/anfrage/?kontakt=telefon"','data-contact="phone" href="tel:'+escapeHtml(settings.phone)+'"')
    .replaceAll('data-contact="whatsapp" hidden href="/anfrage/"',chatUrl?'data-contact="whatsapp" rel="noreferrer" href="'+escapeHtml(chatUrl)+'"':'data-contact="whatsapp" hidden href="/anfrage/"')
    .replace('</head>',()=>searchHead(html,settings,canonical)+'</head>')
    .replace('<p data-business-address hidden></p>',()=>'<p class="business-address">FrankenPackt · '+escapeHtml(settings.legalAddress).replace(/\r?\n/g,', ')+'<br>Telefon '+escapeHtml(settings.phoneDisplay)+'</p>')
    .replace(/(<div id="operator-data"><h2>[^<]+<\/h2>)<p>[^<]*<\/p>(<\/div>)/,(_m,b,e)=>b+operator+extra+e)
    .replace('<div id="privacy-extra"></div>','<div id="privacy-extra">'+(settings.cloudPrivacyHtml ? settings.cloudPrivacyHtml+whatsappInfo : privacyInfo)+'</div>')
    .replaceAll('<p data-live-phone hidden></p>','<p data-live-phone>Direkt anrufen: '+tel+'</p>')
    .replace(/(<div id="form-mode"[^>]*>)[^<]*(<\/div>)/,(_m,b,e)=>b+'Ihre Anfrage wird an unseren Betrieb übermittelt.'+e)
    .replace('>Musteranfrage prüfen</button>','>Anfrage senden</button>')
    .replaceAll('data-phone-link href="/anfrage/?kontakt=telefon"','data-phone-link href="tel:'+escapeHtml(settings.phone)+'"');
}
