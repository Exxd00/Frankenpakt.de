const consoleProperty='https://search.google.com/search-console';
const domainProperty='resource_id=sc-domain%3Afrankenpakt.de';
const projectSheet='https://docs.google.com/spreadsheets/d/1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE/edit';
const publicLinks=[
  ['Leistungen und Einsatzgebiet','/'],
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
  ['Ereignisprotokoll',projectSheet],
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
  ['Ratgeberbilder pflegen','Die zwölf Ratgeber zeigen eigens erstellte und als KI-Beispielbilder gekennzeichnete Motive. Für ein eigenes Einsatzfoto zuerst die Freigabe zur Veröffentlichung prüfen. Beide WebP-Größen, Bildbeschreibung und Kennzeichnung an die Aufnahme anpassen und die Seite auf dem Smartphone kontrollieren.']
];

export function officeHandbook(role){
  const editor=role==='editor';
  return {
    steps:editor ? guidance : [guidance[0],['Ab-Preis und Bürokalkulation','Die Website gibt eine Orientierung ab einem Startpreis. Im Büro lassen sich die aktuellen Bruttopreise mit den benötigten Mengen zusammenstellen. IXA prüft den Umfang und erstellt das Angebot.'],guidance[4]],
    groups:[
      ['Kundenseite und technische Prüfung',publicLinks],
      ['Projekt und Messung',officeLinks],
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
