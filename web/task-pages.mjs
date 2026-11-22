import {formatStartingPrice} from './public/assets/actual-job.js';
import {scenarioPrices} from './public/assets/richtpreise.js';

const sofaReference = formatStartingPrice(scenarioPrices.sofa * 100);
const smallCellarReference = formatStartingPrice(scenarioPrices.keller * 100);

export const taskPages = [
  {
    path:'/kueche-abbauen/', label:'Küche abbauen', service:'entruempelung',
    title:'Küche abbauen lassen in Nürnberg',
    description:'Eine Einbauküche soll aus der Wohnung? Abbau der Küchenmöbel, Trageweg und mögliche Weiterverwendung anhand von Fotos und Maßen anfragen.',
    heading:'Eine Einbauküche in Nürnberg abbauen lassen',
    intro:'Soll die Küche zur Wohnungsübergabe heraus oder an anderer Stelle weitergenutzt werden? Für ein Angebot zum Möbelabbau brauchen wir den Aufbau der Küchenzeile und den gewünschten Umfang. Arbeiten an Gas-, Strom- und Wasseranschlüssen sind ausgenommen.',
    sections:[
      ['Welche Teile der Küche sollen heraus?', 'Nennen Sie die Länge jeder Zeile, die Zahl der Ober- und Unterschränke und die Geräte, die bleiben sollen. Ein Überblicksfoto hilft bei einer Eckküche mehr als einzelne Bilder geschlossener Schranktüren. Eine schwere Steinplatte oder fest eingebaute Kücheninsel bitte eigens erwähnen.'],
      ['Wenn die Küche umziehen soll', 'Markieren Sie, welche Schränke, Fronten und Geräte zusammenbleiben sollen. Für den Transport zählen die längste Platte, Engstellen im Treppenhaus und der Zugang an der Zieladresse. Schreiben Sie dazu, wenn die Teile für eine spätere Montage zugeordnet bleiben sollen.']
    ],
    questions:[
      ['Was kostet der Abbau einer Küchenzeile?', 'Eine freistehende Zeile mit wenigen Unterschränken verursacht anderen Aufwand als eine Küche über Eck mit Hängeschränken und durchgehender Arbeitsplatte. Anhand von Aufbau, Befestigung und Etage prüfen wir, welche Möbelarbeiten wir anbieten können.'],
      ['Herd und Spüle sind noch angeschlossen. Kann ich schon anfragen?', 'Ja. Geben Sie den Anschlusszustand und den Übergabetermin an. Die nötigen Anschlussarbeiten müssen vor dem vereinbarten Möbelabbau fachkundig geklärt sein.'],
      ['Ich möchte meine Küche abbauen und entsorgen lassen. Was gebe ich an?', 'Markieren Sie auf einem Foto, welche Schränke und Arbeitsplatten bleiben, welche weiterverwendet werden und welche entsorgt werden sollen. Listen Sie Herd, Kühlschrank und Geschirrspüler separat auf. Wenn Sie nur Möbelabbau und Heraustragen brauchen, nennen Sie den Ablageort. Wünschen Sie auch Abtransport und Entsorgung, führt unser Angebot auf, welche Teile und Leistungen wir übernehmen können.']
    ],
    inquiryLabel:'Küchenabbau anfragen', related:['/wohnungsaufloesung/','/elektrogeraete-entsorgen/']
  },
  {
    path:'/sofa-entsorgen/', label:'Sofa oder Couch', service:'entsorgung',
    title:'Sofa entsorgen in Nürnberg – Kosten und Trageweg',
    description:'Alte Couch aus der Wohnung tragen oder ein Sofa weitergeben? Maße, Etage und Zugang nennen und in Nürnberg ein persönliches Angebot anfragen.',
    heading:'Ein altes Sofa aus der Wohnung bekommen',
    intro:'Für ein Sofa in Nürnberg entscheiden Bauform und Trageweg über den Aufwand. Ein Zweisitzer am Hauseingang ist anders zu planen als ein Ecksofa im dritten Stock. Sagen Sie uns auch, ob die Couch ausgedient hat oder zu jemand anderem soll.',
    sections:[
      ['Was muss durch die Tür passen?', 'Geben Sie Breite, Tiefe und Höhe der Couch an. Bei einer Wohnlandschaft zählt besonders das längste zusammenhängende Teil. Wenn Sie wissen, ob sich Armlehnen oder Eckelemente abnehmen lassen, schreiben Sie es dazu.'],
      ['Der Weg vom Wohnzimmer bis zum Fahrzeug', 'Ein Aufzug spart Wege, wenn das Sofateil hineinpasst. Bei einem schmalen Treppenabsatz helfen dessen Maße oder ein Foto. Nennen Sie neben dem Stockwerk auch den Fußweg vom Hauseingang bis zur nächsten möglichen Ladeposition.']
    ],
    questions:[
      ['Welchen Richtpreis zeigt der Rechner für ein Sofa?', 'Für ein einzelnes vergleichbares Sofa in Nürnberg zeigt der Rechner einen regionalen Brutto-Richtwert '+sofaReference+' für Tragen, Abholung und Entsorgung. Ein großes Schlafsofa, mehrere Teile oder ein schwieriger Zugang brauchen eine eigene Einschätzung. Unser Angebot nennt die vereinbarten Arbeiten.'],
      ['Was gebe ich an, wenn mein Sofa zum Sperrmüll soll?', 'Haben Sie bereits einen Abholtermin, nennen Sie das Datum und den vereinbarten Abstellort. Dann können Sie gezielt das Heraustragen dorthin anfragen. Wünschen Sie auch Abtransport und Entsorgung, geben Sie das in der Anfrage an. Im Angebot sehen Sie, welche Leistungen für Ihre Couch enthalten sind.'],
      ['Die Couch soll verschenkt werden. Welche Angaben fehlen dann noch?', 'Nennen Sie die Zieladresse, den Zugang dort und das Zeitfenster, in dem jemand das Sofa annehmen kann. So können wir die Fahrt und beide Tragewege in einem Transportangebot berücksichtigen.']
    ],
    inquiryLabel:'Anfrage für mein Sofa', related:['/schrank-abbauen/','/wohnungsaufloesung/']
  },
  {
    path:'/keller-entruempeln/', label:'Keller entrümpeln', service:'entruempelung',
    title:'Keller entrümpeln in Nürnberg – Aufwand und Kosten',
    description:'Kellerabteil räumen in Nürnberg. Fläche, Füllstand und Zugang einschätzen, Stücke zum Behalten markieren und einen Richtpreis abrufen.',
    heading:'Was kostet es, einen Keller in Nürnberg zu räumen?',
    intro:'Für ein einzelnes Kellerabteil bis 6 m² zeigt unser Rechner einen regionalen Brutto-Richtwert '+smallCellarReference+' einschließlich Entsorgung. Für Ihr Angebot zählen zusätzlich Füllstand, Inhalt und Trageweg. Ein halb leeres Abteil und ein bis zur Decke voller Keller können dieselbe Grundfläche haben.',
    sections:[
      ['Den Inhalt ohne Einzelzählung beschreiben', 'Geben Sie die ungefähre Bodenfläche und den Füllstand an. Schätzen Sie die Zahl der Kisten und führen Sie große oder schwere Stücke einzeln auf, etwa ein Metallregal, ein Fahrrad oder eine Waschmaschine. Schreiben Sie dazu, welche Sachen bleiben.'],
      ['Gibt es einen direkten Ausgang?', 'Ein ebener Ausgang zum Hof verkürzt den Weg. Führt er durch mehrere Kellertüren oder über Stufen ins Treppenhaus, nennen Sie die engste Stelle und die Strecke bis zur Ladeposition. Ein Foto vom Eingang ergänzt das Bild des Abteils.']
    ],
    questions:[
      ['Was gebe ich bei mehreren Kellerabteilen an?', 'Erfassen Sie Fläche und Füllstand für jedes Abteil getrennt. Nennen Sie verschiedene Eingänge oder Stockwerke. Aus mehreren Abteilen ergibt sich ein eigener Aufwand.'],
      ['Müssen alle Kisten geöffnet sein?', 'Für die Anfrage genügt eine Beschreibung des bekannten Inhalts. Kennzeichnen Sie verschlossene Kisten mit unbekanntem Inhalt, persönliche Unterlagen und Dinge, über deren Verbleib noch entschieden werden muss.']
    ],
    inquiryLabel:'Kellerräumung anfragen', related:['/dachboden-entruempeln/','/garage-entruempeln/']
  },
  {
    path:'/wohnungsaufloesung/', label:'Wohnung oder Haushalt auflösen', service:'entruempelung',
    title:'Wohnungsauflösung in Nürnberg planen',
    description:'Haushaltsauflösung vor der Schlüsselübergabe. Was bleibt, was geht an Angehörige und was soll heraus? Räume, Inventar und Termin zusammen anfragen.',
    heading:'Wohnungsauflösung in Nürnberg vor der Schlüsselübergabe',
    intro:'Was bleibt in der Wohnung, was geht an eine neue Adresse und was soll heraus? Bei einer Haushaltsauflösung hilft es, das für jeden Raum festzulegen. Teilen Sie uns den Übergabetermin und die Nebenräume mit. Auf dieser Grundlage prüfen wir Sortierarbeit, Tragewege und mögliche Transporte.',
    sections:[
      ['Stücke mit Zieladresse zuerst erfassen', 'Ein Esstisch geht zur Tochter, ein Sessel ins Pflegezimmer, der Einbauschrank bleibt. Halten Sie für solche Stücke Empfänger, Adresse und verfügbares Zeitfenster fest. So lässt sich die Reihenfolge der Fahrten auf die Übergabe abstimmen.'],
      ['Den Umfang der Übergabe festlegen', 'Gehören Keller, Dachboden, Balkon oder Abstellkammer dazu? Sollen Gardinenstangen, Teppiche oder eine Einbauküche bleiben? Benennen Sie diese Punkte einzeln. Ein Foto pro Raum gibt oft einen besseren Überblick als eine Schätzung nur nach Zimmerzahl.']
    ],
    questions:[
      ['Wie plane ich eine Wohnungsauflösung nach einem Todesfall?', 'Benennen Sie eine Person, die vor Ort über die Gegenstände entscheiden kann. Dokumente, Fotoalben, Schlüssel und persönliche Erinnerungsstücke können Sie vorab als zurückzulegen kennzeichnen. Geben Sie an, wer diese Dinge übernimmt.'],
      ['Kann ein Teil der Wohnung schon vor dem Übergabetag geräumt werden?', 'Nennen Sie den Zeitraum für die ersten Räume und den letzten verfügbaren Tag für den Rest. Wir prüfen mit Ihnen, welche Etappen und Transporte in diesen Zeitraum passen.'],
      ['Ist die Endreinigung im Angebot enthalten?', 'Wenn es Vorgaben für den Zustand bei Übergabe gibt, beschreiben Sie sie konkret. Das schriftliche Angebot führt die übernommenen Arbeiten auf.']
    ],
    inquiryLabel:'Wohnungsauflösung anfragen', related:['/kueche-abbauen/','/umzug-ins-pflegeheim/']
  },
  {
    path:'/schrank-abbauen/', label:'Schrank und Schrankwand abbauen', service:'entruempelung',
    title:'Schrank abbauen lassen in Nürnberg',
    description:'Kleiderschrank, Schrankwand oder Einbauschrank abbauen lassen. Befestigung, Türen, größte Teile und den geplanten Transport im Angebot klären.',
    heading:'Einen Schrank abbauen und hinaustragen lassen',
    intro:'Für den Abbau ist wichtig, wie der Schrank gebaut ist und was danach mit ihm passieren soll. Ein freistehender Kleiderschrank mit Drehtüren stellt andere Anforderungen als eine eingepasste Schrankwand mit Spiegel-Schiebetüren.',
    sections:[
      ['Freistehendes Möbel oder Einbau?', 'Nennen Sie Höhe, Breite und Zahl der Schrankelemente. Ein Foto der vollständigen Front hilft bei der Einschätzung. Wandbefestigungen, aufgesetzte Elemente, Glastüren und eingepasste Blenden gehören als Hinweis in die Anfrage.'],
      ['Teile für die Weiterverwendung', 'Soll der Schrank später wieder aufgebaut werden, geben Sie das vor dem Abbau an. Türen, Böden und Beschläge müssen zuordenbar bleiben. Für die Fahrt zählt auch die Länge der Seitenwände, wenn der Schrank zerlegt ist.']
    ],
    questions:[
      ['Kann eine Kommode oder ein Regal am Stück getragen werden?', 'Das hängt von Gewicht, Stabilität und den Engstellen auf dem Weg ab. Geben Sie die Außenmaße und einen engen Treppenabsatz oder eine niedrige Kellertür an. Wir prüfen, ob sich der Abbau einzelner Teile einplanen lässt.'],
      ['Ist der Wiederaufbau am Ziel dabei?', 'Wenn ein Wiederaufbau gewünscht ist, nennen Sie ihn ausdrücklich und beschreiben Sie den Platz am Ziel. Im Angebot sehen Sie, welche Demontage-, Transport- und Montagearbeiten vereinbart werden.']
    ],
    inquiryLabel:'Schrankabbau anfragen', related:['/kueche-abbauen/','/matratze-entsorgen/']
  },
  {
    path:'/elektrogeraete-entsorgen/', label:'Waschmaschine und Elektrogeräte', service:'entsorgung',
    title:'Waschmaschine oder Kühlschrank entsorgen in Nürnberg',
    description:'Elektrogroßgeräte in Nürnberg aus der Wohnung bringen. Anschlusszustand, Gerätetyp und Trageweg für Waschmaschine, Trockner oder Kühlschrank angeben.',
    heading:'Eine Waschmaschine oder einen Kühlschrank herausbringen',
    intro:'Für ein ausgedientes Elektrogerät brauchen wir die Geräteart, den Standort und den Anschlusszustand. Soll ein funktionierendes Gerät weitergenutzt werden, nennen Sie die Zieladresse. Wir prüfen, welche Trage- und Transportarbeiten für Ihr Gerät möglich sind.',
    sections:[
      ['Gerätetyp und Einbausituation', 'Ist der Geschirrspüler in einer Küchenzeile eingebaut, stehen Waschmaschine und Trockner übereinander oder ist die Kühl-Gefrierkombination freistehend? Nennen Sie die Maße und, falls bekannt, das Gewicht oder Modell. Öffnen oder bewegen Sie das Gerät für die Anfrage nicht.'],
      ['Treppen, Aufzug und Stellplatz', 'Bei schweren Geräten zählt der gesamte Weg vom Aufstellort bis zum Fahrzeug. Geben Sie Podeste, enge Kurven und Stufen vor dem Eingang an. Für einen Transport zur Weiternutzung brauchen wir auch den Stellplatz und den Zugang am Ziel.']
    ],
    questions:[
      ['Muss die Waschmaschine für die Anfrage schon abgeklemmt sein?', 'Nein. Geben Sie einfach an, welche Anschlüsse noch bestehen. Anschlussarbeiten gehören nicht zu unseren Trage- und Transportleistungen.'],
      ['Wie frage ich mehrere Geräte zusammen an?', 'Listen Sie zum Beispiel einen Kühlschrank im Erdgeschoss und einen Trockner im zweiten Stock als getrennte Positionen auf. Schreiben Sie je Gerät, ob es zur Weiterverwendung transportiert werden soll oder zur Entsorgung vorgesehen ist.']
    ],
    inquiryLabel:'Geräte und Standort angeben', related:['/kueche-abbauen/','/keller-entruempeln/']
  },
  {
    path:'/dachboden-entruempeln/', label:'Dachboden und Speicher räumen', service:'entruempelung',
    title:'Dachboden entrümpeln in Nürnberg',
    description:'Dachboden oder Speicher räumen. Zugang über Treppe oder Luke, sperrige Stücke und persönliche Erinnerungsstücke für die Anfrage erfassen.',
    heading:'Einen Dachboden oder Speicher in Nürnberg räumen',
    intro:'Beim Räumen eines Dachbodens entscheidet oft die letzte Etage über den Aufwand. Führt eine feste Treppe zum Speicher, oder liegt zwischen Treppenhaus und Dachboden eine Luke? Diese Angabe hilft uns zu prüfen, welche Gegenstände wir heraustragen können.',
    sections:[
      ['Die engste Stelle über dem obersten Stockwerk', 'Beschreiben Sie den Zugang bis in den Speicher. Geben Sie bei niedriger Decke oder schmaler Öffnung die bekannten Maße an. Nennen Sie das größte Stück, etwa eine Truhe, einen Koffer oder ein langes Bettgestell. Bereits vorhandene Fotos genügen.'],
      ['Was ist unter der Dachschräge gelagert?', 'Schätzen Sie die Zahl der Kartons, Säcke und Möbel je Bereich. Wenn ein Teil des Speichers unzugänglich ist, vermerken Sie das. Kennzeichnen Sie Familienunterlagen, Bilder und Erinnerungsstücke, die zurückgelegt werden sollen.']
    ],
    questions:[
      ['Der Aufzug endet eine Etage tiefer. Wie gebe ich das an?', 'Nennen Sie das letzte vom Aufzug erreichte Geschoss und beschreiben Sie den verbleibenden Weg bis zum Dachboden. Wichtig ist auch, ob die größten Stücke in den Aufzug passen.'],
      ['Muss ich für die Anfrage selbst auf eine Leiter steigen?', 'Sie können den Zugang so beschreiben, wie er Ihnen bekannt ist. Offene Maße oder schwer zugängliche Bereiche lassen sich als unsicher kennzeichnen, damit wir sie bei der Prüfung berücksichtigen.']
    ],
    inquiryLabel:'Speicherräumung anfragen', related:['/keller-entruempeln/','/wohnungsaufloesung/']
  },
  {
    path:'/garage-entruempeln/', label:'Garage und Werkstatt räumen', service:'entruempelung',
    title:'Garage entrümpeln in Nürnberg',
    description:'Garage oder Hobbywerkstatt räumen. Werkzeug, Regale, Fahrräder und schwere Werkbänke getrennt erfassen und die Zufahrt für das Angebot beschreiben.',
    heading:'Eine Garage oder Hobbywerkstatt in Nürnberg entrümpeln',
    intro:'Für eine Garage brauchen wir den Inhalt und die Zufahrt. Einige Kartons, Fahrräder und Gartenmöbel sind anders zu planen als eine verschraubte Werkbank mit Metallregalen. Teilen Sie uns mit, was bleiben, weitergegeben oder aus dem Raum entfernt werden soll.',
    sections:[
      ['Schwere und befestigte Stücke einzeln nennen', 'Notieren Sie Werkbank, Werkzeugschrank, Regale und größere Maschinen getrennt. Sagen Sie dazu, ob sie mit Boden oder Wand verbunden sind. Für weiterzugebendes Werkzeug helfen die Zahl der Kisten und der vorgesehene Übergabeort.'],
      ['Garage am Haus oder in einer Tiefgarage?', 'Hat das Tor eine eingeschränkte Höhe, liegt die Garage an einem engen Hof oder ist eine Rampe zu überwinden? Beschreiben Sie die Strecke vom Garagentor zum möglichen Ladeplatz. In einer Sammelgarage benötigen wir die Lage Ihres Stellplatzes.']
    ],
    questions:[
      ['Wie gehe ich mit alten Farben und unbekannten Flüssigkeiten um?', 'Vermerken Sie vorhandene Gebinde, ohne sie für eine Aufnahme zu öffnen oder umzufüllen. Farben, Lösungsmittel und unbekannte Flüssigkeiten holen wir nicht ab. Die übrigen Stücke können Sie getrennt anfragen.'],
      ['Muss die ganze Garage leer werden?', 'Sie können einen Teilbereich beauftragen, etwa die Regalwand neben dem Tor. Nennen Sie die Bereiche, die zugänglich bleiben müssen, und die Gegenstände, die Sie behalten wollen.']
    ],
    inquiryLabel:'Garagenräumung anfragen', related:['/keller-entruempeln/','/schrank-abbauen/']
  },
  {
    path:'/matratze-entsorgen/', label:'Bett, Lattenrost und Matratze', service:'entsorgung',
    title:'Matratze oder Bett entsorgen in Nürnberg',
    description:'Matratze, Lattenrost oder ein komplettes Bett aus der Wohnung bringen. Bettbreite, Bauart und Abbau für ein persönliches Angebot nennen.',
    heading:'Matratze, Lattenrost oder ein ganzes Bett abgeben',
    intro:'Für die Anfrage macht es einen Unterschied, ob nur eine Matratze heraus soll oder ein komplettes Bett samt Kopfteil und Lattenrost. Geben Sie Stückzahl und Liegefläche an. Wenn einzelne Teile weiterverwendet werden sollen, können Sie das getrennt festhalten.',
    sections:[
      ['Einzelteile oder komplettes Bett', 'Bei einem Doppelbett können zwei Matratzen und zwei einzelne Lattenroste vorhanden sein. Bei einem Boxspringbett kommen oft Unterboxen und ein hohes Kopfteil hinzu. Nennen Sie beim größten Teil die Außenmaße.'],
      ['Ist das Gestell noch aufgebaut?', 'Geben Sie an, ob ein Möbelabbau gewünscht ist und ob das Bett Schubladen, Bettkasten oder elektrische Verstellung hat. Für ein bereits zerlegtes Gestell zählen die Länge der Seitenteile, das Stockwerk und die Strecke bis zur Ladeposition.']
    ],
    questions:[
      ['Kann ich nur die alte Matratze anfragen?', 'Ja. Eine einzelne Matratze lässt sich mit Breite, Länge, Standort und Zugang erfassen. Zubehör wie Topper, Lattenrost oder Bettrahmen geben Sie nur an, wenn es ebenfalls mit soll.'],
      ['Der Bettrahmen soll zu einer anderen Adresse. Geht das zusammen?', 'Führen Sie Rahmen und Matratze getrennt auf. Für das weitergenutzte Gestell nennen Sie die Zieladresse, dortige Etage und den Annahmetermin. Wir prüfen beide Teile der Anfrage.']
    ],
    inquiryLabel:'Bett oder Matratze anfragen', related:['/schrank-abbauen/','/sofa-entsorgen/']
  },
  {
    path:'/buero-raeumen/', label:'Büro und Arbeitszimmer räumen', service:'entruempelung',
    title:'Büro oder Arbeitszimmer räumen in Nürnberg',
    description:'Arbeitszimmer und kleine Büros räumen. Schreibtische, Regale und Bücherkartons erfassen, vertrauliche Unterlagen zurücklegen und Übergabetermin nennen.',
    heading:'Ein Büro oder Arbeitszimmer in Nürnberg räumen',
    intro:'Bei einer Büroräumung brauchen Schreibtische, Bücherkartons und persönliche Akten unterschiedliche Entscheidungen. Beschreiben Sie, welche Möbel an einen neuen Arbeitsplatz sollen und welche Gegenstände vor Ort bleiben. Bei mehreren Räumen hilft eine kurze Liste je Raum.',
    sections:[
      ['Mobiliar und Kartons getrennt erfassen', 'Nennen Sie die Anzahl der Schreibtische, Bürostühle und Regale. Für den Transport sind die Außenmaße langer Tischplatten wichtig. Schätzen Sie Bücher- und Ordnerkartons getrennt von Kartons mit leichtem Büromaterial.'],
      ['Übergabe im laufenden Betrieb', 'Teilen Sie uns mit, wann Räume, Flure und Ladezone zugänglich sind. Soll ein Arbeitsplatz bis zuletzt nutzbar bleiben, benennen Sie ihn. Bei einem Umzug einzelner Möbel helfen Raumbezeichnungen am bisherigen und am neuen Standort.']
    ],
    questions:[
      ['Was passiert mit Akten und Datenträgern?', 'Bestimmen Sie, welche Unterlagen und Geräte vor Ort bleiben oder an eine benannte Person gehen. Für die Anfrage genügen Mengen. Senden Sie keine Fotos lesbarer Akten. Aktenvernichtung und Datenlöschung sind kein Bestandteil unseres Räumungsangebots.'],
      ['Kann auch nur eine Bücherwand heraus?', 'Ja, Sie können ein einzelnes Regal oder eine Regalwand anfragen. Nennen Sie die Zahl der Regalelemente und ob Inhalt, Möbel oder beides transportiert werden soll. Gebundene Bücher und lose Ordner bitte getrennt schätzen.']
    ],
    inquiryLabel:'Büroräumung anfragen', related:['/schrank-abbauen/','/wohnungsaufloesung/']
  },
  {
    path:'/moebel-nach-privatkauf-abholen/', label:'Möbel nach Privatkauf abholen', service:'moebeltaxi',
    title:'Möbel nach Privatkauf in Nürnberg abholen lassen',
    description:'Ein Möbelstück aus Kleinanzeigen abholen lassen. Abholzeit beim Verkäufer, Maße, Abbau und beide Tragewege in einer Transportanfrage zusammenfassen.',
    heading:'Gebrauchte Möbel nach einem Privatkauf abholen lassen',
    intro:'Sie haben einen Esstisch, ein Sideboard oder einen Schrank gekauft und brauchen einen Transport? Für die Abholung von privat brauchen wir die Maße, den Zustand bei Übergabe und beide Adressen. Teilen Sie uns das mit dem Verkäufer vereinbarte Zeitfenster mit.',
    sections:[
      ['Was wird beim Verkäufer übergeben?', 'Ist das Stück schon zerlegt, steht es verpackt im Flur oder muss es aus dem Zimmer getragen werden? Bei einem Esstisch mit Glasplatte oder einem Sideboard mit losen Einlegeböden führen Sie diese Teile zusätzlich auf. Fotos aus dem Inserat können Sie verwenden, wenn Sie sie teilen dürfen.'],
      ['Wie kommt das Möbelstück an seinen Platz?', 'Beschreiben Sie den Weg an beiden Adressen. Ein ebenerdiger Lagerraum beim Verkäufer und ein enger Aufgang bei Ihnen ergeben zwei verschiedene Tragewege. Nennen Sie den Stock, die Aufzugsgröße und eine mögliche Ladeposition für Abholung und Lieferung.']
    ],
    questions:[
      ['Reicht der Link zur Kleinanzeige?', 'Schreiben Sie Maße, Stückzahl und die vereinbarte Abholzeit in das Formular. Ein Inserat kann nach dem Verkauf verschwinden. Ungefähre Maße oder ein vorhandenes Foto helfen, bis die genauen Angaben vorliegen.'],
      ['Der Verkäufer bietet nur einen Abholtermin an. Was nun?', 'Tragen Sie den Termin als festen Wunschtag mit Zeitfenster ein. Wir prüfen Fahrt und Tragewege. Planen Sie die Abholung verbindlich ein, sobald wir den Termin bestätigt haben.']
    ],
    inquiryLabel:'Abholung beim Verkäufer anfragen', related:['/schrank-abbauen/','/sofa-entsorgen/']
  },
  {
    path:'/umzug-ins-pflegeheim/', label:'Teilumzug ins Pflegeheim', service:'seniorenumzug',
    title:'Umzug ins Pflegeheim in Nürnberg planen',
    description:'Teilumzug ins Pflegeheim oder Seniorenheim. Möbel und Erinnerungsstücke auswählen, Lieferzeit mit der Einrichtung abstimmen und beide Zugänge angeben.',
    heading:'Ein Teilumzug ins Pflegeheim in Nürnberg',
    intro:'Beim Einzug in ein Pflegezimmer ziehen oft nur wenige vertraute Dinge mit. Halten Sie fest, welche Möbel ins Zimmer passen, was am Einzugstag gebraucht wird und wer die Lieferung annimmt. Daraus lässt sich der Transport für den vereinbarten Einzugstermin planen.',
    sections:[
      ['Was hat im neuen Zimmer Platz?', 'Listen Sie zum Beispiel den Lieblingssessel, eine kleine Kommode, Bilder und die Zahl der Kartons auf. Klären Sie mit der Einrichtung, welche eigenen Möbel ins Zimmer dürfen. Dinge für Angehörige und Möbel, die in der bisherigen Wohnung bleiben, können Sie getrennt kennzeichnen.'],
      ['Einzug und Lieferung aufeinander abstimmen', 'Nennen Sie den gewünschten Liefertag, das mögliche Zeitfenster und den vorgesehenen Eingang. Etage, Zimmerbezeichnung und Aufzug vor Ort helfen, die Lieferung richtig zuzuordnen. Als Kontakt genügt die für den Termin erreichbare Person. Medizinische Angaben sind für die Planung nicht erforderlich.']
    ],
    questions:[
      ['Kann ein Angehöriger den Möbeltransport organisieren?', 'Ja. Geben Sie die für die Abstimmung erreichbare Kontaktperson an und halten Sie fest, wer die vereinbarten Stücke bei Abholung und Ankunft übergibt oder annimmt.'],
      ['Was ist mit den Möbeln für die Familie?', 'Wenn Möbel an eine weitere Adresse gehen, geben Sie diese als Zwischenstopp an. Ordnen Sie die Stücke dem jeweiligen Ziel zu und nennen Sie dort den Zugang. Für die spätere Auflösung der Wohnung können Sie einen eigenen Zeitraum angeben.']
    ],
    inquiryLabel:'Teilumzug anfragen', related:['/wohnungsaufloesung/','/schrank-abbauen/']
  }
];
