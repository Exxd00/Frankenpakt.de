const hub = '/firmenkunden/';
const clearance = '/bueroaufloesung-nuernberg/';
const furniture = '/bueromoebel-entsorgen-nuernberg/';
const move = '/bueroumzug-nuernberg/';
const property = '/entruempelung-hausverwaltung-nuernberg/';

export const firmPages = [
  {
    path: hub, project: 'firmenkunden', service: '', label: 'Firmenkunden',
    title: 'Entrümpelung und Umzug für Firmen in Nürnberg',
    description: 'Büro auflösen, Büromöbel aussortieren, einen Standort wechseln oder ein Mietobjekt übergeben. Das passende Angebot für Ihren Betrieb in Nürnberg anfragen.',
    heading: 'Entrümpelung und Umzug für Firmen in Nürnberg',
    intro: 'Was steht in Ihrem Betrieb an? Ob zwölf Bürostühle Platz machen sollen oder eine ganze Etage umzieht, entscheidend ist das Ziel. Wählen Sie das Vorhaben, für das Sie ein Angebot brauchen.',
    photoAlt: 'Zwei Personen besprechen an einem Bürotisch den Grundriss der Räume.',
    decisionHeading: 'Was soll am Ende erledigt sein?',
    cards: [
      [furniture, 'Büromöbel entsorgen', 'Einzelne Stücke sollen raus. Das Büro bleibt in Betrieb.'],
      [clearance, 'Büro auflösen', 'Räume sollen zur Rückgabe an den Vermieter leer werden.'],
      [move, 'Büro umziehen', 'Arbeitsplätze oder Möbel wechseln an eine neue Adresse.'],
      [property, 'Mietobjekt räumen', 'Sie beauftragen die Räumung als Hausverwaltung.']
    ],
    details: [
      ['Ein Auftrag mit mehreren Zielen', [
        'Eine Kanzlei verkleinert sich. Zwei Schreibtische werden am neuen Standort gebraucht, der Vermieter übernimmt die Teeküche und die alten Besucherstühle sollen heraus. Für dieses Vorhaben genügt eine gemeinsame Anfrage. Geben Sie pro Möbelgruppe an, was damit geschehen soll. So lassen sich Transport und Räumung im Angebot auseinanderhalten.',
        'Wenn der Betrieb geöffnet bleibt, nennen Sie die Räume, die wir zuerst betreten dürfen. Eine Anlieferung am Hintereingang kann ein anderes Zeitfenster haben als der Zugang über den Empfang. Für einen Transport zählt auch, wann am Ziel jemand die Möbel annehmen kann.'
      ]],
      ['Was Ihr Einkauf für die Freigabe braucht', [
        'Tragen Sie Firmenname, Einsatzadresse und den gewünschten Termin ein. Falls das Angebot eine Objektnummer, Kostenstelle oder eine abweichende Rechnungsanschrift enthalten soll, geben Sie diese mit an. Eine Inventarliste mit Stückzahlen und Fotos der größten Möbel erleichtert die Kalkulation. Ungefähre Mengen können Sie als Schätzung kennzeichnen.',
        'Für den Preis zählen auch Etage, nutzbarer Aufzug und Strecke bis zum Fahrzeug. Ein freier Lastenaufzug mit Hofzufahrt ermöglicht einen anderen Ablauf als ein Treppenhaus mit Ladeplatz an der nächsten Ecke. Wir prüfen die Angaben und nennen Ihnen die Leistungen, über die Sie entscheiden können.'
      ]]
    ],
    questions: [
      ['Kann ich nur einen Schrank oder eine kleine Möbelgruppe anfragen?', 'Ja. Bei wenigen Stücken reichen für den Einstieg Art, Anzahl und Standort. Nennen Sie bei einem hohen Schrank die Außenmaße und ob er am Stück durch die Tür passt. Wenn er in eine Filiale soll, gehört deren Adresse mit in die Anfrage.'],
      ['Was gebe ich bei mehreren Betriebsstätten an?', 'Ordnen Sie jede Möbelgruppe einem Startort und einem Ziel zu. Vermerken Sie je Adresse Zugang, Zeitfenster und Kontakt vor Ort. So können wir prüfen, welche Fahrten mit den verfügbaren Fahrzeugen und Ihrer Übergabe zusammenpassen.']
    ],
    nextHeading: 'Was braucht Ihr Betrieb?', nextText: 'Beschreiben Sie den Auftrag mit Einsatzort und Wunschtermin. Wir prüfen den Umfang und erstellen Ihr persönliches Angebot.',
    cta: 'Firmenangebot anfragen'
  },
  {
    path: clearance, project: 'bueroaufloesung', service: 'entruempelung', label: 'Büroauflösung',
    title: 'Büroauflösung und Büroentrümpelung in Nürnberg',
    description: 'Gewerbliche Büroräume in Nürnberg bis zur Übergabe räumen. Inventar, letzte Nutzung und vorhandene Einbauten für Ihr Angebot zur Büroauflösung festhalten.',
    heading: 'Büroauflösung in Nürnberg',
    intro: 'Der Mietvertrag endet und die Schlüsselübergabe steht fest. Für Ihre Büroräumung planen wir vom letzten Nutzungstag aus. Welche Räume müssen leer sein, welche Einbauten bleiben und welche Möbel gehen an einen anderen Standort?',
    photoAlt: 'Gestapelte Stühle, geschützte Tischplatten und ein leerer Stahlschrank in einem Büroraum.',
    details: [
      ['Welchen Zustand haben Sie für die Rückgabe vereinbart?', [
        'Gehen Sie Ihre Räume in der Reihenfolge der Übergabe durch. Im Empfang bleiben vielleicht der fest eingebaute Tresen und die Beleuchtung, während aus den Büros alle freistehenden Schränke heraus sollen. Nennen Sie auch Nebenflächen wie Teeküche, Abstellkammer und Kellerarchiv. Damit lässt sich schon beim Angebot erkennen, welche Arbeiten zur vereinbarten Übergabe gehören.',
        'Tragen Sie für jede Fläche den frühesten Zugang und den spätesten Räumtermin ein. Wird in einzelnen Zimmern noch gearbeitet, vermerken Sie diese gesondert. So können wir prüfen, ob sich eine Räumung in Abschnitten mit Ihrem Auszug vereinbaren lässt.'
      ]],
      ['Was kostet die Büroentrümpelung?', [
        'Eine fast leere Etage und ein gleich großes Büro mit vollen Schrankwänden erfordern unterschiedlich viel Arbeit. Für eine Kalkulation helfen Stückzahlen, Maße der größten Teile und Fotos der Laufwege. Entscheidend sind auch der Abbau der Möbel, der Platz im Aufzug und die Entfernung vom Ausgang zum Ladeplatz.',
        'Unterscheiden Sie Mobiliar zur weiteren Nutzung von Gegenständen zur Entsorgung. Benennen Sie Geräte und ungewöhnlich schwere Stücke einzeln. Falls Möbel an einen anderen Standort sollen, geben Sie die Zieladresse mit an. Im persönlichen Angebot steht, welche Arbeiten, Fahrten und Entsorgungsleistungen für Ihren Auftrag berücksichtigt sind.'
      ]]
    ],
    questions: [
      ['Was passiert mit Akten, Datenträgern und geleasten Geräten?', 'Kennzeichnen Sie Unterlagen und Datenträger, die Ihr Unternehmen sichert, und Geräte, die ein Vertragspartner abholt. Fotografieren Sie nur das Möbel oder Gerät von außen. Aktenvernichtung und Datenlöschung gehören ebenso wie die Rückgabe eines Leasinggeräts in die Hände der dafür beauftragten Stelle.'],
      ['Können die Büroküche und fest angeschlossene Geräte heraus?', 'Geben Sie Küchenzeile, Maße und gewünschte Möbelarbeiten an. Fest angeschlossene Elektro-, Gas- oder Wasserinstallationen müssen vor einem Möbelabbau durch zuständige Fachkräfte getrennt und freigegeben sein. Wir prüfen anschließend, welche zugänglichen Teile sich im vereinbarten Umfang abbauen und tragen lassen.'],
      ['Wie gebe ich die Rückgabe von Schlüsseln an?', 'Benennen Sie, wer Zugang gewährt, wer Räume freigibt und bis wann die Arbeit beendet sein muss. Wenn Ihr Vermieter einzelne Möbel übernimmt, halten Sie diese vor der Räumung eindeutig fest.']
    ],
    decisionHeading: 'Bleibt ein Teil des Büros in Nutzung?',
    cards: [[furniture, 'Nur Altmöbel entfernen', 'Für einzelne Serien, Schränke oder Stühle im laufenden Betrieb.'], [move, 'Mobiliar mitnehmen', 'Arbeitsplätze und Möbel an einen neuen Standort bringen.']],
    nextHeading: 'Wann ist Ihre Büroübergabe?', nextText: 'Mit Räumen, Inventar und Rückgabetermin können wir den Umfang Ihrer Büroauflösung prüfen.',
    cta: 'Büroauflösung anfragen'
  },
  {
    path: furniture, project: 'bueromoebel', service: 'entsorgung', label: 'Büromöbel entsorgen',
    title: 'Büromöbel in Nürnberg entsorgen lassen',
    description: 'Alte Schreibtische, Bürostühle und Aktenschränke in Nürnberg aus dem laufenden Betrieb entfernen. Stückzahlen, Abbau, Zugänge und Zeitfenster angeben.',
    heading: 'Büromöbel in Nürnberg entsorgen lassen',
    intro: 'Die neuen Schreibtische sind bestellt, die alten stehen noch im Büro. Wenn nur ein Teil der Einrichtung heraus soll, können Sie gezielt diese Möbel anfragen. Der Rest des Arbeitsplatzes bleibt in Nutzung.',
    photoAlt: 'Drei ausgediente Bürostühle und ein zerlegter Schreibtisch stehen an der Tür zur Abholung bereit.',
    details: [
      ['Welche Büromöbel machen Platz?', [
        'Fassen Sie gleiche Stücke zusammen. Bei zwölf Drehstühlen genügen Anzahl und ein Foto eines typischen Stuhls. Bei Schreibtischen mit Gestell nennen Sie die Länge der Platte. Bei einem hohen Aktenschrank interessieren Material, Außenmaße und die Frage, ob er leer ist. Bei Sitzgruppen führen Sie breite Sofas und lose Sessel getrennt auf.',
        'Einige Möbel sollen in ein anderes Stockwerk, der Rest soll weg? Markieren Sie die Stücke nach Ziel. Benennen Sie Elektrogeräte, Akkus und fremdes Inventar gesondert. Menge und Material entscheiden mit darüber, welcher Entsorgungsweg sich anbieten lässt. Die übernommenen Positionen stehen im persönlichen Angebot.'
      ]],
      ['Wie passt die Abholung in den Arbeitstag?', [
        'Wenn die neue Möbellieferung am Dienstag kommt, brauchen Sie den Raum womöglich schon am Montag frei. Nennen Sie beide Termine und wann ein Zutritt zum Büro möglich ist. Bei gemeinsam genutzten Gebäuden helfen die Zeiten für Lastenaufzug, Rolltor oder Lieferhof. Ist ein Platz nur für die Anlieferung reserviert, nennen Sie die tatsächlich verfügbare Ladeposition.',
        'Für die Kalkulation macht es einen Unterschied, ob zehn Stühle in einem Raum stehen oder aus fünf Etagen zusammenkommen. Tragen Sie je Gruppe Standort, Etage und Weg zum Fahrzeug ein. Vermerken Sie außerdem, ob wir Tischplatten oder Schrankelemente zum Heraustragen lösen sollen.'
      ]]
    ],
    questions: [
      ['Kann ich einen einzigen Schreibtisch entsorgen lassen?', 'Ja, auch ein Einzelstück können Sie anfragen. Geben Sie Breite und Tiefe der Platte sowie den Zugang an. Nennen Sie lose Kabelwannen, Glasaufsätze oder elektrische Antriebe. Dann können wir prüfen, welche Möbelarbeiten und welche Übernahme für dieses Stück möglich sind.'],
      ['Was ist bei gefüllten Aktenschränken zu beachten?', 'Nennen Sie die Schrankmaße und ob noch Unterlagen darin liegen. Über vertrauliche Ordner und Datenträger entscheidet Ihr Betrieb vor der Freigabe des Schranks. Für die Anfrage reichen Außenansichten. Der Inhalt von Akten oder beschrifteten Ordnern muss auf Fotos nicht lesbar sein.'],
      ['Kann brauchbares Mobiliar an eine andere Adresse?', 'Geben Sie Empfänger, Adresse, Etage und die betreffenden Stücke an. Für den Transport zur Weiternutzung lässt sich dann ein eigener Umfang prüfen. Das hilft Ihrem Einkauf, Transport und Aussortieren im Angebot zuzuordnen.']
    ],
    decisionHeading: 'Wohin geht das übrige Inventar?',
    cards: [[move, 'Möbel weiterverwenden', 'Für die Lieferung in ein anderes Büro oder eine Filiale.'], [clearance, 'Ganzes Büro räumen', 'Für die Rückgabe aller Räume an den Vermieter.']],
    nextHeading: 'Welche Büromöbel sollen raus?', nextText: 'Teilen Sie uns Möbelart, Stückzahl und Standort mit. Wenn eine Neulieferung ansteht, geben Sie deren Termin gleich mit an.',
    cta: 'Büromöbel anfragen'
  },
  {
    path: move, project: 'bueroumzug', service: 'umzug', label: 'Büroumzug',
    title: 'Büroumzug und Möbeltransport für Firmen in Nürnberg',
    description: 'Büroumzüge und gewerbliche Möbeltransporte in Nürnberg. Arbeitsplätze, Filialbelieferung und Umzugsetappen mit beiden Adressen und Zugängen anfragen.',
    heading: 'Büroumzug in Nürnberg',
    intro: 'Zieht ein Team innerhalb des Gebäudes um, wechseln Möbel die Filiale oder bezieht Ihre Firma ein neues Büro? Für die Planung zählt, welcher Arbeitsplatz wann am Ziel gebraucht wird.',
    photoAlt: 'Ein Mann schiebt gesicherte Transportkisten auf einem Rollwagen durch eine Bürotür.',
    details: [
      ['Welcher Arbeitsplatz zieht wohin?', [
        'Eine Liste nach Zielraum ist bei einem Firmenumzug besonders hilfreich. Ordnen Sie beispielsweise die sechs Schreibtische dem Großraumbüro zu und den langen Tisch dem Besprechungsraum. Nennen Sie bei mehrteiligen Möbeln das größte Einzelteil. Kennzeichnen Sie, wo ein Möbelabbau oder ein Wiederaufbau gewünscht ist. Anzahl und ungefähres Gewicht der Kartons ergänzen das Bild.',
        'Wenn zwei Abteilungen zu unterschiedlichen Zeiten wechseln, geben Sie die Umzugsabschnitte einzeln an. So können wir prüfen, welche Möbel am ersten Tag gebraucht werden und wann die übrigen folgen können. Ein gebuchter Aufzug oder ein eingeschränktes Lieferfenster am neuen Sitz sollte schon in der Anfrage stehen.'
      ]],
      ['Was bestimmt den Aufwand für Ihren Firmenumzug?', [
        'Die Strecke zwischen den Adressen ist nur ein Teil. Im alten Büro muss der Schrank vielleicht über eine Treppe, während am Ziel ein Lastenaufzug bis zur Etage fährt. Beschreiben Sie beide Wege einzeln, einschließlich Türbreiten bei sperrigen Möbeln, Entfernung zum Ladeplatz und verfügbarer Zufahrtshöhe.',
        'Wir planen mit 3,5-Tonnen-Transportern. Für schwere oder raumgreifende Stücke brauchen wir deshalb Maße und bekannte Gewichte, etwa bei großen Metallregalen oder einem Konferenztisch mit Steinplatte. Fahrzeug, Zahl der Fahrten und Team lassen sich daraus für Ihr Angebot ableiten. Ergänzen Sie bei mehreren Lieferorten die jeweilige Annahmezeit.'
      ]]
    ],
    questions: [
      ['Kann ich nur einen Möbeltransport zwischen zwei Filialen buchen?', 'Ja. Beschreiben Sie die Stücke und geben Sie für beide Filialen Adresse, Zugang und Zeitfenster an. Wenn der Empfänger nur vormittags erreichbar ist oder ein Tor öffnen muss, sollte das bei der Terminplanung bereits berücksichtigt sein.'],
      ['Was geschieht mit Computern und Servern?', 'Ihr IT-Verantwortlicher legt fest, wer Geräte vom Netz trennt, sichert und wieder anschließt. Führen Sie verpackte Geräte, die transportiert werden sollen, mit Stückzahl und Übergabekontakt separat auf. Wir prüfen, welche davon im Möbeltransport vereinbart werden können.'],
      ['Wie frage ich einen internen Umzug im selben Gebäude an?', 'Nennen Sie Ausgangsraum, Zielraum, die Etagen und den Weg dazwischen. Teilen sich zwei Aufgänge eine Hausnummer, beschreiben Sie, ob das Mobiliar durch einen Verbindungsgang oder über den Hof getragen wird.']
    ],
    decisionHeading: 'Was bleibt am bisherigen Standort zurück?',
    cards: [[furniture, 'Altmöbel aussortieren', 'Für ausgediente Stücke zusätzlich zum Umzug.'], [clearance, 'Bisheriges Büro räumen', 'Wenn die bisherigen Räume leer zurückgegeben werden.']],
    nextHeading: 'Wohin zieht Ihr Team?', nextText: 'Geben Sie Start, Ziel und den gewünschten Wechseltermin an. Damit können wir die benötigten Fahrten und Möbelarbeiten prüfen.',
    cta: 'Büroumzug anfragen'
  },
  {
    path: property, project: 'hausverwaltung', service: 'entruempelung', label: 'Räumung für Hausverwaltungen',
    title: 'Entrümpelung für Hausverwaltungen in Nürnberg',
    description: 'Freigegebene Wohnungen, Kellerabteile und Gemeinschaftsflächen in Nürnberg räumen. Objektbezug, Zugänge und Übergabetermin für Ihre Verwaltung angeben.',
    heading: 'Entrümpelung für Hausverwaltungen in Nürnberg',
    intro: 'Ein Kellerabteil soll neu vergeben werden, eine Wohnung ist zur Räumung freigegeben oder Mobiliar blockiert den nächsten Handwerkertermin. Als Hausverwaltung können Sie den Auftrag einem konkreten Objekt und einem Übergabetermin zuordnen.',
    photoAlt: 'Ein Mann mit Schlüsseln blickt in einen geräumten Nebenraum mit leerem Holzregal.',
    details: [
      ['Welche Flächen gibt die Verwaltung frei?', [
        'Nennen Sie Hausnummer, Aufgang und die genaue Einheit. Bei Kellern helfen Abteilnummer oder Lage neben einem eindeutigen Orientierungspunkt. Markieren Sie, welche Gegenstände entfernt werden dürfen und welche im Haus verbleiben. Gerade im Gemeinschaftskeller lässt sich aus einem Foto allein oft nicht erkennen, welche Fahrräder, Regale oder Kartons wem gehören.',
        'Für die Planung brauchen wir eine benannte Person, die über die betroffenen Gegenstände und Flächen verfügen darf. Ungeklärte Stücke bleiben bis zu einer eindeutigen Freigabe am Platz. Auf den Fotos reichen die räumliche Situation und der Umfang. Persönliche Dokumente, Namen an Briefkästen und Angaben aus Mietakten sind dafür entbehrlich.'
      ]],
      ['Schlüssel, Zugänge und Folgetermine koordinieren', [
        'Vermerken Sie, wer das Objekt öffnet und wann Schlüssel übergeben werden können. Beschreiben Sie den tatsächlichen Weg von der Fläche zum Fahrzeug. Ein rückwärtiges Kellerabteil mit Außentreppe erfordert eine andere Planung als ein ebenerdiger Lagerraum am Hof. Nennen Sie schmale Durchgänge, nutzbare Aufzüge und freizuhaltende Wege.',
        'Steht danach ein Malertermin oder eine Abnahme an, geben Sie den Zeitpunkt mit an. Für getrennt abzurechnende Einheiten helfen Objektkennzeichen und eine Zuordnung der Mengen. Im Angebot lässt sich so erkennen, welche Leistungen für welche Einheit vorgesehen sind und welche Ansprechperson die Ausführung abstimmt.'
      ]]
    ],
    questions: [
      ['Kann ich nur ein Kellerabteil beauftragen?', 'Ja. Nennen Sie das Abteil, die ungefähre Menge und die Etage. Wenn der Zugang zunächst durch die Tiefgarage und dann über Stufen führt, beschreiben Sie beide Abschnitte. Auch Angaben zu Durchfahrtshöhe und Entfernung zum Ladeplatz helfen bei der Kalkulation.'],
      ['Wie gehe ich mit zurückgelassenen Sachen im Treppenhaus um?', 'Halten Sie fest, welche Stücke eindeutig freigegeben sind. Bei ungeklärter Zuordnung klärt die Verwaltung zunächst die Berechtigung. Für freigegebene Gegenstände können Sie Stückzahl, Standort und den Zeitpunkt nennen, zu dem der Weg zugänglich ist.'],
      ['Sind Wiedervermietung und Räumung in einer Anfrage planbar?', 'Für unsere Einsatzplanung genügt der Termin, zu dem die Fläche für die nächste Nutzung frei sein soll. Halten Sie den gewünschten Endzustand fest, etwa „Abteil leer, eingebautes Regal bleibt“. Dann sehen Sie im Angebot, welche Arbeiten zur Vorbereitung Ihres Folgetermins enthalten sind.']
    ],
    decisionHeading: 'Geht es um einen Gewerbemieter?',
    cards: [[clearance, 'Bürofläche zurückgeben', 'Für geräumte Büroeinheiten vor der Schlüsselübergabe.'], [furniture, 'Büromöbel entfernen', 'Wenn nur einzelne freigegebene Möbel heraus sollen.']],
    nextHeading: 'Welches Objekt soll übergeben werden?', nextText: 'Mit Einsatzadresse, Einheit, Freigabe und Zeitfenster können wir den Auftrag Ihrer Verwaltung zuordnen.',
    cta: 'Objekträumung anfragen'
  }
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function firmRequest(page, callback = false) {
  const params = new URLSearchParams({kundentyp: 'firma', projekt: page.project});
  if (page.service) params.set(page.service === 'umzug' ? 'service' : 'leistung', page.service);
  if (callback) params.set('kontakt', 'telefon');
  return '/anfrage/?' + params.toString();
}

function actions(page) {
  return '<div class="actions">' +
    '<a class="button" href="' + escapeHtml(firmRequest(page)) + '">' + escapeHtml(page.cta) + '</a>' +
    '<a class="button secondary" data-contact="callback" href="' + escapeHtml(firmRequest(page, true)) + '">Rückruf anfragen</a></div>';
}

function decisionCards(page) {
  const cards = page.cards.map(([href, title, detail]) =>
    '<a class="firm-card" href="' + href + '"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(detail) + '</span></a>'
  ).join('');
  return '<section class="firm-decisions"><h2>' + escapeHtml(page.decisionHeading) + '</h2><div class="firm-card-grid">' + cards + '</div></section>';
}

export function renderFirmPage(page) {
  const isHub = page.path === hub;
  const sep = '<span aria-hidden="true">/</span>';
  const crumb = '<nav class="crumb wrap" aria-label="Brotkrumennavigation"><a href="/">Startseite</a>' + sep +
    (isHub ? '' : '<a href="' + hub + '">Firmenkunden</a>' + sep) +
    '<span aria-current="page">' + escapeHtml(page.label) + '</span></nav>';
  const image = '/assets/firmen/' + page.project;
  const picture = '<picture class="firm-photo"><img src="' + image + '-960.webp" srcset="' + image + '-480.webp 480w, ' +
    image + '-960.webp 960w" sizes="(max-width: 740px) 30vw, (min-width: 1510px) 600px, 44vw" width="960" height="640" ' +
    'fetchpriority="high" alt="' + escapeHtml(page.photoAlt) + '"></picture>';
  const hero = '<section class="firm-hero"><div class="wrap firm-hero-grid"><div class="firm-hero-copy"><h1>' +
    escapeHtml(page.heading) + '</h1><p class="lead">' + escapeHtml(page.intro) + '</p>' + actions(page) +
    '</div>' + picture + '</div></section>';
  const details = '<div class="firm-detail-grid">' + page.details.map(([title, paragraphs]) =>
    '<section class="firm-detail"><h2>' + escapeHtml(title) + '</h2>' +
    paragraphs.map(p => '<p>' + escapeHtml(p) + '</p>').join('') + '</section>'
  ).join('') + '</div>';
  const faq = '<section class="firm-faq"><h2>Häufige Fragen</h2><div class="faq-layout">' +
    page.questions.map(([q, a]) => '<details class="faq"><summary>' + escapeHtml(q) + '</summary><p>' + escapeHtml(a) + '</p></details>').join('') +
    '</div></section>';
  const next = '<section class="firm-next"><h2>' + escapeHtml(page.nextHeading) + '</h2><p>' +
    escapeHtml(page.nextText) + '</p>' + actions(page) + '</section>';
  const chooser = decisionCards(page);
  return crumb + hero + '<div class="wrap firm-body">' + (isHub ? chooser + details : details + chooser) + faq + next + '</div>';
}
