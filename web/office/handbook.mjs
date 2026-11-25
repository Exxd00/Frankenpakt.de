const consoleProperty='https://search.google.com/search-console';
const domainProperty='resource_id=sc-domain%3Afrankenpakt.de';
const projectSheet='https://docs.google.com/spreadsheets/d/1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE/edit';
const publicLinks=[
  ['Leistungen und Einsatzgebiet','/'],
  ['Leistungen für Firmen und Hausverwaltungen','/firmenkunden/'],
  ['Preisorientierung für Kunden','/preise/'],
  ['Anfrage mit Auftragsdetails','/anfrage/'],
  ['Beispiel für einen Ratgeber · Küchenabbau','/kueche-abbauen/'],
  ['Anbieter und Kontakt','/impressum/'],
  ['Datenschutz','/datenschutz/'],
  ['XML-Sitemap','/sitemap.xml'],
  ['Hinweise zum Crawling (robots.txt)','/robots.txt']
];
const officeLinks=[
  ['Kalkulation in Google Sheets','https://docs.google.com/spreadsheets/d/12qMiRi0VYbVoMkMaU13TFIUiffT72S0OxuRgUPd7A9I/edit'],
  ['Betriebsstand und Zuständigkeiten',projectSheet+'#gid=85317568'],
  ['Suchmonitoring und Prüfergebnisse',projectSheet+'#gid=367128204'],
  ['Ereignisprotokoll und Anzeigen-Keywords',projectSheet+'#gid=888767604'],
  ['Google Analytics','https://analytics.google.com/analytics/web/#/a404789720p565381204/reports/intelligenthome']
];
const searchLinks=[
  ['Search Console · Domainübersicht',consoleProperty+'?'+domainProperty],
  ['Search Console · Bericht zur Sitemap',consoleProperty+'/sitemaps/info-drilldown?'+domainProperty+'&sitemap=https%3A%2F%2Ffrankenpakt.de%2Fsitemap.xml']
];
const guidance=[
  ['Mengen und Wege abgleichen','Anfrage und Fotos gemeinsam lesen. Welche Stücke bleiben, welche sollen heraus, welche an eine zweite Adresse? Je Standort Geschoss, Aufzug, Engstellen, Trageweg, Halteplatz und Termin prüfen. Bei einem Rückruf zuerst die schon mitgesendeten Angaben öffnen.'],
  ['Angebot vorbereiten','Wenn der Umfang klar und durchführbar ist, im Vorgang „Angebot vorbereiten“ wählen. Im Kalkulator Leistungen und Mengen, Fremdleistungen und Bruttosumme prüfen. Der öffentliche Ab-Preis dient der Orientierung. Erst das persönliche Angebot beschreibt den angebotenen Umfang und Preis.'],
  ['Offenen Punkt eingrenzen','Wenn ein fehlender Wert den Einsatz oder den Preis verändert, zunächst Inventar, Fotos und vorhandene Angaben prüfen. Bleibt eine Entscheidung offen, alle dafür nötigen Fragen in einer Rückmeldung bündeln.'],
  ['Fachleistung abgrenzen','Bei angeschlossener Küchentechnik, besonderen Stoffen oder einem Stück außerhalb der Fahrzeug- oder Tragemöglichkeiten den betroffenen Teil vor der Zusage fachlich klären. Nur die tatsächlich ausführbaren Arbeiten anbieten. Die zulässige Restladung des eingesetzten Fahrzeugs und die Maße des Einzelstücks prüfen.'],
  ['Suchergebnisse einordnen','Die Sitemap enthält die öffentlichen Suchseiten. Den Abruf und die Indexierung einer bestimmten Seite in der URL-Prüfung der Search Console ansehen. Messzeitpunkt und Ergebnis im Suchmonitoring dokumentieren. Den Eingang einer Kundenanfrage im Angebotsbüro prüfen.'],
  ['Ratgeberbilder pflegen','Beim Austausch eines Bildes beide WebP-Größen und die Bildbeschreibung aktualisieren. Für Einsatzfotos die Freigabe zur Veröffentlichung prüfen. Den Ausschnitt auf dem Smartphone und am Desktop kontrollieren.'],
  ['Anzeigen-Keywords auswerten','Im Ereignisprotokoll nach Kampagne, Einstiegsseite und Keyword (Anzeige) filtern. Eine befüllte Keyword-Spalte bezeichnet das übermittelte Anzeigen-Keyword. Suchanfragen aus der organischen Google-Suche auf Seitenebene in der Search Console auswerten.'],
  ['Firmenauftrag prüfen','Unternehmen, Einsatzort und Projekt im Eingang lesen. Für eine Objektübergabe die Freigabe der Gegenstände, Übergabefrist und Zugangszeiten abgleichen. Bei einem Büroumzug Start und Ziel sowie die Zuordnung des Inventars prüfen. Eine mitgeschickte Kostenstelle oder Objektreferenz ins Angebot übernehmen. Für die Erfolgskontrolle führen die fünf Einstiegsseiten im Suchmonitoring zu den zugehörigen Messwerten.'],
  ['Eingehende Anrufe zuordnen','Website, Impressum und Angebote verwenden 0911 81672879. Für bezahlte Google-Anzeigen gilt 0911 81672882, für Kleinanzeigen 0911 81672891. Alle drei Nummern erreichen dasselbe Telefon. Zeigt die Anrufliste die gewählte Rufnummer, lässt sich der Eingang dem Kanal zuordnen. Beim Bearbeiten festhalten, ob ein Gespräch stattgefunden hat und ein Angebot gewünscht ist.']
];

export function officeHandbook(role){
  const editor=role==='editor';
  const registerStep=['Kundenanfragen bearbeiten','Im Blatt „Kundenanfragen“ den Vorgang anhand der Vorgangsnummer finden. Nach dem gewünschten Kontaktweg antworten. Status und interne Notiz in den letzten beiden Spalten pflegen. Die übrigen Angaben werden beim Abgleich aus dem Auftragssystem aktualisiert. Fotos und Dateien sind im geschützten Vorgang zugänglich.'];
  const registerLink=['Kundenanfragen · Kontaktdaten und Bearbeitung',projectSheet+'#gid=115202611'];
  return {
    steps:editor ? [registerStep,...guidance] : [guidance[0],['Ab-Preis und Bürokalkulation','Die Website gibt eine Orientierung ab einem Startpreis. Im Büro lassen sich die aktuellen Bruttopreise mit den benötigten Mengen zusammenstellen. IXA prüft den Umfang und erstellt das Angebot.'],guidance[4]],
    groups:[
      ['Kundenseite und technische Prüfung',publicLinks],
      ['Projekt und Messung',editor ? [registerLink,...officeLinks] : officeLinks],
      ['Google-Suche',searchLinks],
      ['Marke und Technik',[
        ['Öffentliche Markenbilder auf ImgBB','https://franken-pakt.imgbb.com/'],
        ...(editor ? [['Projekt auf GitHub','https://github.com/Exxd00/Frankenpakt.de']] : [])
      ]]
    ]
  };
}

// Use facts from the submitted case. Only staff assess feasibility and issue the offer.
export function caseReview(lead={}){
  const fields=lead.jobScope?.fields;
  const callback=lead.service==='rueckruf';
  const reasons=[];
  const materials=typeof fields?.materials==='string'?fields.materials.split(','):[];
  const special=fields?.wasteRoute!=='none'&&materials.includes('special');
  if(special)reasons.push('Besondere Stoffe angegeben. Übernahme und geeigneten Entsorgungsweg gesondert prüfen.');
  if(['known','estimated'].includes(fields?.loadWeightMode)&&Number(String(fields.loadWeight).replace(',','.'))>1000){
    reasons.push('Angegebenes Gesamtgewicht über der Planungsgröße von 1.000 kg je Fahrzeug. Stückgewichte und tatsächliche Zuladung abgleichen und die Zahl der Fahrten kalkulieren.');
  }
  const destination=Boolean(fields?.toFloor);
  for(const [key,name] of destination?[['from','Einsatzort'],['to','Ziel']]:[['from','Einsatzort']]){
    if(fields?.[key+'Parking']==='blocked')reasons.push(name+' · Ein legaler Haltepunkt ist noch offen.');
    if(fields?.[key+'Lift']==='unknown')reasons.push(name+' · Aufzugmaße oder eine nutzbare Tragealternative prüfen.');
  }
  if(fields?.wasteRoute==='undecided')reasons.push('Der vorgesehene Weg für die zu entsorgenden Stücke ist offen.');
  if(fields?.wasteRoute==='container'&&['unknown','public'].includes(fields.site))reasons.push('Containerstandort und Nutzbarkeit vor der Kalkulation bestätigen.');
  if(callback)return {title:'Rückruf vorbereiten',reasons:['Gewünschte Rückrufzeit und vorhandene Angaben prüfen. Die nächsten Schritte mit der anfragenden Person besprechen.',...reasons]};
  if(reasons.length)return {title:special?'Fachleistung abgrenzen':'Offene Punkte prüfen',reasons};
  if(!fields?.items||!fields.fromFloor)return {title:'Anfrage zuerst sichten',reasons:['Nachricht, vorhandene Mengen und Anlagen prüfen. Offene Angaben zum Auftrag gemeinsam klären.']};
  return {title:'Kalkulation vorbereiten',reasons:['Inventar, Freitext und Anlagen mit den verfügbaren Leistungen, Fahrzeugmaßen und der tatsächlichen Zuladung abgleichen. Mengen und Leistungsumfang im Angebot festlegen.']};
}
