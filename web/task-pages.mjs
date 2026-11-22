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
    photoAlt:'Geöffnete Küchenunterschränke, davor eine abgenommene Tür und eine Schublade auf einer Schutzdecke.',
    intro:'Soll die Einbauküche zur Wohnungsübergabe heraus, zieht sie mit um oder übernimmt der Nachmieter einzelne Teile? Geben Sie zuerst an, was mit den Möbeln passieren soll. Danach können wir den Abbau der Küchenmöbel, das Heraustragen und einen gewünschten Transport getrennt beurteilen.',
    sections:[
      ['Was bleibt in der Wohnung?', 'Gehen Sie die Küchenzeile von links nach rechts durch. Zählen Sie Ober- und Unterschränke und nennen Sie die Länge jeder Zeile. Ein Beispiel für eine Teilräumung wäre eine Eckküche, bei der der Nachmieter zwei Hochschränke und den Kühlschrank übernimmt. Auf einem Foto der ganzen Küche lassen sich diese Stücke meist leichter markieren als auf einzelnen Detailbildern.'],
      ['Welche Teile bestimmen den Trageweg?', 'Bei einer durchgehenden Arbeitsplatte zählt das längste Stück. Eine schwere Steinplatte, eine Insel mit Sockel oder eine in die Ecke eingepasste Zeile vermerken Sie gesondert. Beschreiben Sie den Weg von der Küchentür bis zum Ladeplatz. Hilfreich sind die engste Kurve im Treppenhaus, die nutzbare Aufzugstiefe und Stufen zwischen Haustür und Straße.'],
      ['Wofür soll die Küche erhalten bleiben?', 'Bei einer Weitergabe an Dritte gehören Zieladresse, dortige Etage und der vereinbarte Annahmezeitraum in dieselbe Anfrage. Benennen Sie die Teile, die zusammenbleiben sollen. Wenn Türen, Einlegeböden und Beschläge für einen späteren Aufbau zugeordnet werden müssen, können wir den dafür nötigen Aufwand schon bei der Angebotsprüfung berücksichtigen.']
    ],
    questions:[
      ['Was kostet der Abbau einer Küchenzeile?', 'Für die Kalkulation zählen Aufbau, Befestigung und Zugang. Hängeschränke zum Abnehmen, eine lange Platte mit Ausschnitt und der Transport in ein anderes Haus ergeben drei verschiedene Arbeiten. Beschreiben Sie Ihren jeweiligen Bedarf. Im persönlichen Angebot können Sie anschließend prüfen, welche Positionen und welcher Preis für Ihre Küche gelten.'],
      ['Herd und Spüle sind noch angeschlossen. Kann ich schon anfragen?', 'Ja. Nennen Sie die noch angeschlossenen Geräte und den vorgesehenen Übergabetermin. Arbeiten an Gas-, Strom- und Wasseranschlüssen gehören nicht zum Möbelabbau. Teilen Sie uns mit, ob die nötige Facharbeit bereits vereinbart ist. So lässt sich einschätzen, ab wann die Schränke tatsächlich zugänglich sind.'],
      ['Ich möchte die Küche abbauen und entsorgen lassen. Was gebe ich an?', 'Listen Sie Küchenschränke, Arbeitsplatten und Elektrogeräte getrennt auf. Schreiben Sie zu jeder Gruppe, ob sie vor Ort abgelegt, weitergegeben oder entsorgt werden soll. Gibt es bereits einen vereinbarten Ablageort oder werden einzelne Teile von jemand anderem übernommen, nennen Sie Ort und Zeitpunkt.']
    ],
    inquiryLabel:'Küchenabbau anfragen', related:['/wohnungsaufloesung/','/elektrogeraete-entsorgen/']
  },
  {
    path:'/sofa-entsorgen/', label:'Sofa oder Couch', service:'entsorgung',
    title:'Sofa entsorgen in Nürnberg – Kosten und Trageweg',
    description:'Alte Couch aus der Wohnung tragen oder ein Sofa weitergeben? Maße, Etage und Zugang nennen und in Nürnberg ein persönliches Angebot anfragen.',
    heading:'Ein altes Sofa aus der Wohnung bekommen',
    photoAlt:'Ein rostroter Zweisitzer steht neben dem offenen Durchgang zum Wohnungsflur.',
    intro:'Ein Sofa kann ausgedient haben, vor dem Liefertermin der neuen Couch Platz machen oder an eine andere Familie gehen. Beschreiben Sie, wohin es soll. Damit wird aus derselben Ausgangslage eine Anfrage zum Heraustragen, zur Entsorgung oder zur Möbelbeförderung an eine zweite Adresse.',
    sections:[
      ['Wie groß ist das längste Sofateil?', 'Bei einem Zweisitzer helfen Breite, Tiefe und Höhe. Bei einer Wohnlandschaft nennen Sie zusätzlich die Maße des längsten zusammenhängenden Elements. Beschreiben Sie eine ausziehbare Liegefläche, einen Bettkasten oder einen elektrischen Sitz, soweit Ihnen die Bauart bekannt ist. Für eine erste Einschätzung genügt ein Foto von vorne und eines von der Seite, auf der sich das Eckelement anschließt.'],
      ['Passt die Couch durch Tür und Treppenhaus?', 'Ein Aufzug im Haus hilft nur, wenn auch das größte Sofateil durch seine Tür und in die Kabine passt. Liegt zwischen Wohnzimmer und Haustür eine enge Kurve, ist ein Bild dieses Absatzes besonders aufschlussreich. Nennen Sie die Etage sowie den ungefähren Fußweg bis zum möglichen Halteplatz. In einem Hinterhaus zählt der Weg durch den Hof mit.'],
      ['Wann muss der Stellplatz frei sein?', 'Wenn bereits ein neues Sofa geliefert wird, nennen Sie uns den letzten möglichen Abholtag. Prüfen Sie auch, wann der Raum zugänglich ist. Ein Schlüssel bei Angehörigen oder eine feste Übergabezeit kann für die Planung ebenso wichtig sein wie das Stockwerk.']
    ],
    questions:[
      ['Welchen Richtpreis zeigt der Rechner für ein Sofa?', 'Für ein einzelnes vergleichbares Sofa in Nürnberg zeigt der Rechner einen regionalen Brutto-Richtwert '+sofaReference+' für Tragen, Abholung und Entsorgung. Ein großes Schlafsofa, ein zusätzlicher Sessel oder mehrere Sofas brauchen eine eigene Einschätzung. Tragen Sie die tatsächlichen Stücke und Mengen ein. Im persönlichen Angebot sehen Sie den Preis für den vereinbarten Umfang.'],
      ['Ich habe schon einen Sperrmülltermin. Was kann ich anfragen?', 'Nennen Sie Datum und vereinbarten Abstellort. Wir prüfen dann das Heraustragen der Couch bis zu genau diesem Punkt. Soll die Couch stattdessen direkt abtransportiert und entsorgt werden, geben Sie diesen Wunsch an. So können Sie beim Lesen des Angebots erkennen, welcher Weg für Ihr Sofa eingeplant ist.'],
      ['Die Couch wird verschenkt. Welche Angaben fehlen noch?', 'Ergänzen Sie die Lieferadresse, den Zugang dort und das Zeitfenster für die Annahme. Falls das Sofa zunächst in einen Keller oder in eine Garage soll, nennen Sie diesen Raum. Die Haustür allein beschreibt das Ende des Tragewegs in diesem Fall nur unvollständig.']
    ],
    inquiryLabel:'Anfrage für mein Sofa', related:['/schrank-abbauen/','/wohnungsaufloesung/']
  },
  {
    path:'/keller-entruempeln/', label:'Keller entrümpeln', service:'entruempelung',
    title:'Keller entrümpeln in Nürnberg – Aufwand und Kosten',
    description:'Kellerabteil räumen in Nürnberg. Fläche, Füllstand und Zugang einschätzen, Stücke zum Behalten markieren und einen Richtpreis abrufen.',
    heading:'Was kostet es, einen Keller in Nürnberg zu räumen?',
    photoAlt:'Ein Regal mit sechs Kartons und ein Holzstuhl stehen am schmalen Gang zwischen Kellerabteilen.',
    intro:'Für ein einzelnes Kellerabteil bis 6 m² zeigt unser Rechner einen regionalen Brutto-Richtwert '+smallCellarReference+' einschließlich Entsorgung. Für Ihr persönliches Angebot zählen auch Füllstand, Inhalt und der Weg ins Freie. Auf derselben Grundfläche können drei Kisten stehen oder ganze Regale bis unter die Decke gefüllt sein.',
    sections:[
      ['Wie beschreibe ich einen vollen Keller?', 'Schätzen Sie die Bodenfläche und geben Sie an, wie viel davon belegt ist. Eine grobe Anzahl von Kisten oder Säcken genügt für die Übersicht. Führen Sie sperrige oder schwere Stücke einzeln auf, etwa ein Metallregal, ein Fahrrad oder eine Waschmaschine. Steht eine Truhe hinter den Regalen, erwähnen Sie auch, ob der Zugang erst freigemacht werden muss.'],
      ['Welchen Weg nehmen die Gegenstände?', 'Manche Keller haben einen direkten Ausgang zum Hof. In anderen Häusern liegen zwischen Abteil und Straße mehrere Türen, eine steile Treppe und ein langer Gang. Beschreiben Sie die Reihenfolge und die schmalste Stelle. Geben Sie an, wie weit ein Fahrzeug vom Ausgang halten kann und ob ein Schlüssel für einen Durchgang gebraucht wird.'],
      ['Was soll im Abteil bleiben?', 'Benennen Sie Regale, Koffer oder verschlossene Kisten, die Sie behalten möchten. Eine gut erkennbare Kennzeichnung vor Ort kann helfen, sobald Sie sich entschieden haben. Teilen sich mehrere Haushalte einen Kellerbereich, beschreiben Sie die Grenze Ihres Abteils und den Weg dorthin. Ein gemeinschaftlicher Fahrradraum kann beispielsweise auf dem Trageweg liegen, ohne selbst zum Auftrag zu gehören.']
    ],
    questions:[
      ['Muss ich zur Anfrage alle Kisten öffnen?', 'Sie können den bekannten Inhalt beschreiben und geschlossene Kartons als ungeklärt kennzeichnen. Bei Dokumenten, Familienfotos oder persönlichen Erinnerungen hilft eine klare Angabe, wer über den Verbleib entscheidet. Melden Sie unbekannte Gebinde oder auffällige Stoffe gesondert, damit ihr Umgang vor einer Zusage geklärt werden kann.'],
      ['Wie wird aus der Fläche ein Angebot?', 'Tragen Sie im Rechner die ungefähre Fläche jedes betroffenen Abteils ein. Bei mehreren Räumen vermerken Sie die Füllstände getrennt. Ein leicht zugängliches Abteil mit wenigen Möbeln und ein dicht gepackter zweiter Raum mit eigener Treppe lassen sich so als ein Auftrag mit unterschiedlichen Bedingungen prüfen.'],
      ['Kann ich den Keller zusammen mit der Wohnung räumen lassen?', 'Ja, beschreiben Sie Wohnung und Keller in derselben Anfrage. Nennen Sie für beide die Stücke, die bleiben oder an Angehörige gehen sollen, und den Termin der Schlüsselübergabe. Ein Übersichtsbild je Bereich macht die unterschiedliche Menge nachvollziehbar.']
    ],
    inquiryLabel:'Kellerräumung anfragen', related:['/dachboden-entruempeln/','/garage-entruempeln/']
  },
  {
    path:'/wohnungsaufloesung/', label:'Wohnung oder Haushalt auflösen', service:'entruempelung',
    title:'Wohnungsauflösung in Nürnberg planen',
    description:'Haushaltsauflösung vor der Schlüsselübergabe. Was bleibt, was geht an Angehörige und was soll heraus? Räume, Inventar und Termin zusammen anfragen.',
    heading:'Wohnungsauflösung in Nürnberg vor der Schlüsselübergabe',
    photoAlt:'Geschirr und gefaltete Wäsche liegen in offenen Kartons vor einem Sideboard und einem Sessel.',
    intro:'Bei einer Wohnungsauflösung in Nürnberg ist der Übergabetermin oft schon vereinbart, während über einzelne Möbel noch entschieden wird. Gehen Sie deshalb Raum für Raum durch, was bleiben, an Angehörige gehen oder herausgetragen werden soll. So lassen sich Räumung und mehrere mögliche Transporte gemeinsam anfragen.',
    sections:[
      ['Wie halte ich die Entscheidungen fest?', 'Eine kurze Liste je Zimmer reicht für den Anfang. Beispielsweise kann im Esszimmer der Tisch zur Tochter gehen, das Geschirr übernommen werden und das leere Sideboard für die Räumung vorgesehen sein. Nennen Sie bei Möbeln mit Zieladresse auch die dortige Etage und den Kontakt für die Übergabe. Kennzeichnen Sie ungeklärte Stücke als offen.'],
      ['Welche Räume gehören zur Übergabe?', 'Prüfen Sie neben den Wohnräumen auch Kellerabteil, Dachboden, Balkon und Abstellkammer. Beschreiben Sie ausdrücklich, ob Einbauten oder Gardinenstangen bleiben. Soll eine Küchenzeile heraus, listen Sie die Geräte einzeln auf. Fotos vom jeweiligen Raum und von besonders großen Stücken helfen mehr als allein die Anzahl der Zimmer oder die Wohnfläche.'],
      ['Was beeinflusst Termin und Preis?', 'Für die Planung macht es einen Unterschied, ob alle Möbel gleichzeitig herauskönnen oder ein Pflegebett und der benutzte Sessel bis zuletzt gebraucht werden. Teilen Sie mit, ab wann der Schlüssel verfügbar ist, ob der Aufzug benutzt werden kann und wo das Fahrzeug halten darf. Geben Sie für eine zweite Lieferung auch das Annahmezeitfenster an.']
    ],
    questions:[
      ['Wie plane ich eine Haushaltsauflösung nach einem Todesfall?', 'Benennen Sie eine Person, mit der Entscheidungen vor Ort abgestimmt werden können. Dokumente, Schlüssel, Fotoalben und persönliche Erinnerungsstücke lassen sich als eigener Bereich zum Zurücklegen beschreiben. Wenn Angehörige zu unterschiedlichen Zeiten kommen, geben Sie die bereits vereinbarten Abholtermine an. So können empfindliche oder wichtige Dinge rechtzeitig berücksichtigt werden.'],
      ['Kann ein Teil der Wohnung früher geräumt werden?', 'Geben Sie den gewünschten ersten Termin und den letzten verfügbaren Tag an. Nennen Sie die Räume, die noch bewohnt oder für Angehörige zugänglich bleiben sollen. Wir prüfen, welche Arbeiten zu welchem Zeitpunkt möglich sind, und legen die vereinbarten Etappen im Angebot fest.'],
      ['Welchen Zustand kann ich für die Schlüsselübergabe vereinbaren?', 'Schreiben Sie die konkreten Vorgaben in die Anfrage, etwa ob Dübellöcher, Teppiche oder noch montierte Regale berücksichtigt werden sollen. Räumung, Möbelabbau und eine gewünschte Reinigung haben unterschiedlichen Umfang. Unser schriftliches Angebot führt die Arbeiten auf, die wir für Ihre Übergabe übernehmen können.']
    ],
    inquiryLabel:'Wohnungsauflösung anfragen', related:['/kueche-abbauen/','/umzug-ins-pflegeheim/']
  },
  {
    path:'/schrank-abbauen/', label:'Schrank und Schrankwand abbauen', service:'entruempelung',
    title:'Schrank abbauen lassen in Nürnberg',
    description:'Kleiderschrank, Schrankwand oder Einbauschrank abbauen lassen. Befestigung, Türen, größte Teile und den geplanten Transport im Angebot klären.',
    heading:'Einen Schrank abbauen und hinaustragen lassen',
    photoAlt:'Vor einem offenen Kleiderschrank liegen die abgenommene Tür, Einlegeböden und Beschläge auf einer Decke.',
    intro:'Ein freistehender Kleiderschrank mit zwei Türen, ein Einbauschrank in einer Nische und eine Schrankwand mit Vitrine können ähnlich groß wirken. Für den Abbau brauchen wir die Bauart und das Ziel der einzelnen Teile. Soll das Möbel weitergenutzt werden, beeinflusst das bereits die Demontage.',
    sections:[
      ['Welche Teile sitzen fest?', 'Nennen Sie Höhe, Breite und Tiefe sowie die Anzahl der Elemente. Ein Bild der geschlossenen Front und ein Blick ins zugängliche Innere helfen bei der Zuordnung. Erwähnen Sie Wandbefestigungen, Eckelemente, aufgesetzte Schränke oder passgenaue Blenden. Bei einer Vitrine sind herausnehmbare Glasböden, Glastüren und fest eingesetzte Spiegel für die Planung unterschiedlich.'],
      ['Was ist beim Transport eines zerlegten Schranks wichtig?', 'Auch nach dem Abbau bleiben lange Seitenwände und breite Türen. Beschreiben Sie den Weg vom Zimmer bis zum Fahrzeug und nennen Sie enge Kurven, niedrige Decken oder Aufzüge mit kurzer Kabine. Steht der Schrank dicht zwischen Wand und Bett, geben Sie an, wie viel Platz davor zum Arbeiten frei ist.'],
      ['Welche Teile sollen wieder zusammenpassen?', 'Bleiben Türen, Einlegeböden und Beschläge zusammen, kann ihre Zuordnung beim späteren Aufbau wichtig sein. Gibt es eine Anleitung oder einen Modellnamen, vermerken Sie das in der Anfrage. Nennen Sie fehlende Beschläge, aufgequollene Böden oder lockere Rückwände, soweit diese vom normalen Standplatz aus zu erkennen sind.']
    ],
    questions:[
      ['Muss mein Schrank für die Anfrage schon leer sein?', 'Sie können bereits ein Angebot anfragen, solange noch Kleidung oder Geschirr darin liegt. Schreiben Sie dazu, ob das Möbel vor dem Termin geleert wird oder ob das Ausräumen zum gewünschten Auftrag gehört. Persönliche Unterlagen und Gegenstände, die bleiben sollen, kennzeichnen Sie gesondert.'],
      ['Ist ein Wiederaufbau an der neuen Adresse möglich?', 'Nennen Sie die Zieladresse, die Höhe des Raums und die vorgesehene Stellfläche. Bei einem Umzug unter eine Dachschräge oder in eine schmalere Nische hilft deren Maß. Wir prüfen, welche Demontage-, Transport- und Montagearbeiten wir anbieten können und welche davon Sie tatsächlich beauftragen möchten.'],
      ['Wie wird der Aufwand für eine einzelne Schrankwand ermittelt?', 'Für ein Angebot sind Anzahl und Bauart der Elemente aussagekräftiger als die Bezeichnung Schrankwand allein. Eine verschraubte Eckkombination mit Spiegeln erfordert andere Arbeitsschritte als drei lose Regale. Teilen Sie mit, ob nur der Abbau, das Heraustragen an einen bestimmten Ort oder zusätzlich Abtransport und Entsorgung gewünscht sind.']
    ],
    inquiryLabel:'Schrankabbau anfragen', related:['/kueche-abbauen/','/matratze-entsorgen/']
  },
  {
    path:'/elektrogeraete-entsorgen/', label:'Waschmaschine und Elektrogeräte', service:'entsorgung',
    title:'Waschmaschine oder Kühlschrank entsorgen in Nürnberg',
    description:'Elektrogroßgeräte in Nürnberg aus der Wohnung bringen. Anschlusszustand, Gerätetyp und Trageweg für Waschmaschine, Trockner oder Kühlschrank angeben.',
    heading:'Eine Waschmaschine oder einen Kühlschrank herausbringen',
    photoAlt:'Eine Waschmaschine und ein kompakter Kühlschrank stehen nebeneinander in einem Raum mit offener Tür.',
    intro:'Wenn Waschmaschine, Trockner oder Kühlschrank aus der Wohnung sollen, beginnt die Planung am tatsächlichen Stellplatz. Geben Sie an, ob das Gerät weitergenutzt werden soll, ausgedient hat oder bis zu einem vereinbarten Abholpunkt getragen werden muss. Auch mehrere Geräte können Sie in einer Anfrage zusammenfassen.',
    sections:[
      ['Welche Geräte stehen wo?', 'Nennen Sie jedes Gerät mit Standort und Bauart. Ein freistehender Kühlschrank im Erdgeschoss, ein Trockner über einer Waschmaschine und ein unter der Arbeitsplatte eingebauter Geschirrspüler brauchen unterschiedliche Vorbereitungen. Bei einer sehr breiten Kühlkombination helfen Höhe, Breite und Tiefe. Falls Sie den Modellnamen oder das Gewicht aus Unterlagen kennen, ergänzen Sie diese Angaben.'],
      ['Welche Angaben zum Transportweg helfen?', 'Beschreiben Sie Türen, enge Treppenkehren und Stufen vor dem Haus. Ein Aufzug kann bis ins Erdgeschoss fahren, obwohl am Ausgang noch Stufen zu überwinden sind. Befindet sich der Stellplatz in einer Waschküche im Keller, nennen Sie den Zugang dorthin. Für eine Fahrt zur Weiterverwendung erfassen Sie denselben Weg auch am Ziel.'],
      ['Was lässt sich auf einem Foto erkennen?', 'Ein Übersichtsbild zeigt, ob das Gerät untergebaut, von Möbeln eingefasst oder Teil eines Turms ist. Ein zweites Foto des Durchgangs hilft, wenn etwa die Tür zum Waschraum schmal ist. Für die Anfrage müssen Sie kein Gerät vorziehen, öffnen oder anheben. Unbekannte Maße und nicht sichtbare Anschlüsse können Sie als ungeklärt angeben.']
    ],
    questions:[
      ['Muss die Waschmaschine schon abgeklemmt sein?', 'Sie können die Anfrage vor dem Abklemmen stellen. Nennen Sie den aktuellen Anschlusszustand und teilen Sie mit, wann das Gerät voraussichtlich transportbereit ist. Arbeiten an Wasser-, Gas- und Stromanschlüssen gehören nicht zu unseren Trage- und Transportleistungen. Bei fest angeschlossenen Geräten muss die erforderliche Facharbeit vor dem vereinbarten Möbel- oder Gerätetransport geklärt sein.'],
      ['Was ist bei einem beschädigten Kühlschrank wichtig?', 'Beschreiben Sie erkennbare Schäden oder eine vorhandene Undichtigkeit bereits in der Anfrage. Lassen Sie das Gerät für die Beschreibung an seinem Platz. Wir prüfen vor einer Zusage, ob die angefragten Arbeiten in diesem Zustand übernommen werden können oder gesonderte fachliche Betreuung nötig ist.'],
      ['Erhalte ich einen Preis für alle Geräte zusammen?', 'Listen Sie Stückzahl, Etage und gewünschten Verbleib je Gerät auf. Wenn zum Beispiel die Waschmaschine an Angehörige geht und der Kühlschrank heraus soll, gehören Zieladresse und Annahmezeit nur zur Waschmaschine. So kann das Angebot die verschiedenen Tragewege und Arbeiten einzeln benennen.']
    ],
    inquiryLabel:'Geräte und Standort angeben', related:['/kueche-abbauen/','/keller-entruempeln/']
  },
  {
    path:'/dachboden-entruempeln/', label:'Dachboden und Speicher räumen', service:'entruempelung',
    title:'Dachboden entrümpeln in Nürnberg',
    description:'Dachboden oder Speicher räumen. Zugang über Treppe oder Luke, sperrige Stücke und persönliche Erinnerungsstücke für die Anfrage erfassen.',
    heading:'Einen Dachboden oder Speicher in Nürnberg räumen',
    photoAlt:'Auf einem Dachboden liegen gerollte Teppiche, daneben stehen Umzugskartons an der Treppenöffnung.',
    intro:'Beim Entrümpeln eines Dachbodens in Nürnberg ist oft die letzte Etage entscheidend. Eine Truhe kann jahrelang unter der Dachschräge stehen und heute kaum durch den Zugang passen. Beschreiben Sie deshalb den Weg zum Speicher und sagen Sie, welche Stücke Sie zurückhaben möchten.',
    sections:[
      ['Führt eine Treppe oder eine Luke zum Speicher?', 'Eine feste Treppe, eine ausklappbare Bodentreppe und eine schmale Luke sind unterschiedliche Zugänge. Nennen Sie die bekannte Breite der Öffnung und das längste sperrige Stück. Bei einer alten Bettseite zählt ihre Länge auch dann, wenn das Gestell bereits zerlegt ist. Ein vorhandenes Foto vom oberen Absatz hilft, die mögliche Drehung vor der Öffnung einzuschätzen.'],
      ['Was liegt in welchem Abteil?', 'Gehört Ihnen ein abgeteiltes Speicherstück, beschreiben Sie dessen Grenze. Eine kurze Liste kann etwa sechs Bücherkartons, eine Holztruhe und zwei sperrige Bilderrahmen umfassen. Kennzeichnen Sie ungeöffnete Kisten als solche. So können wir einen Aufwand für die sichtbaren Sachen prüfen und offene Bereiche im Angebot benennen. Die Entscheidung über persönliche Erinnerungsstücke bleibt bei Ihnen.']
    ],
    questions:[
      ['Der Aufzug endet eine Etage tiefer. Was braucht das Team für die Planung?', 'Geben Sie das letzte erreichbare Geschoss und die verbleibenden Treppenabsätze an. Ein langer Schlitten passt vielleicht durch die Speichertür, aber nicht in die Aufzugskabine. In diesem Fall gehört auch der weitere Weg durchs Treppenhaus zur Anfrage. Nennen Sie die nächste nutzbare Ladeposition am Haus.'],
      ['Wie kann ich den Dachboden beschreiben, wenn ich nicht mehr hinaufkomme?', 'Schicken Sie bereits vorhandene Bilder oder eine Skizze und schreiben Sie, welche Angaben geschätzt sind. Bleiben Sie für die Anfrage auf sicher zugänglichem Boden. Für die Einschätzung hilft auch die Information, wer das richtige Abteil am vereinbarten Termin aufschließen und zeigen kann.'],
      ['Kann die Truhe zur Familie und der übrige Hausrat heraus?', 'Ordnen Sie die Truhe der Lieferadresse zu und nennen Sie dort das Stockwerk. Familienalben, die jemand vorher abholt, kennzeichnen Sie als persönliche Stücke für die Übergabe. Wir können dann in einem Angebot ausweisen, welche Stücke getragen werden, wohin sie gehen und welcher Räumungsumfang für den restlichen Speicher vorgesehen ist.'],
      ['Woher weiß ich vorab, welchen Aufwand Sie berechnen?', 'Im Angebot können Sie prüfen, ob das Sichten von Kisten, das Heraustragen und eine gewünschte Weiterfahrt enthalten sind. Für die Kalkulation zählen auch sperrige Stücke und die Zahl der Wege zwischen Speicher und Fahrzeug. Teilen Sie uns deshalb mit, wenn einzelne Möbel bereits bis ins Erdgeschoss gebracht wurden.']
    ],
    inquiryLabel:'Speicherräumung anfragen', related:['/keller-entruempeln/','/wohnungsaufloesung/']
  },
  {
    path:'/garage-entruempeln/', label:'Garage und Werkstatt räumen', service:'entruempelung',
    title:'Garage entrümpeln in Nürnberg',
    description:'Garage oder Hobbywerkstatt räumen. Werkzeug, Regale, Fahrräder und schwere Werkbänke getrennt erfassen und die Zufahrt für das Angebot beschreiben.',
    heading:'Eine Garage oder Hobbywerkstatt in Nürnberg entrümpeln',
    photoAlt:'Fahrrad, Regal und Autoreifen stehen in einer Garage mit offenem Tor zur Einfahrt.',
    intro:'Soll wieder ein Auto in die Garage passen, reicht manchmal das Räumen einer Seitenwand. Bei der Übergabe an den nächsten Mieter soll vielleicht auch die Werkbank heraus. Nennen Sie uns für Ihre Garage in Nürnberg das gewünschte Ergebnis und die Dinge, die am Platz bleiben.',
    sections:[
      ['Welche Einrichtung soll heraus?', 'Eine lose Gartenbank lässt sich anders bewegen als eine Werkbank mit Schraubstock. Führen Sie schwere Schränke, Maschinen und breite Regalböden einzeln auf. Geben Sie an, welche Teile an Wand oder Boden befestigt sind und ob der Schrank bei Abholung noch Werkzeug enthält. Für eine Weitergabe an Angehörige helfen die Stückzahl und der vorgesehene Übergabeort.'],
      ['Wo kann das Fahrzeug laden?', 'Bei einer Garage am Haus ist der Hof oft der kürzeste Weg. Liegt Ihr Stellplatz in einer Sammelgarage, zählen die angeschriebene Einfahrtshöhe, die Rampe und der Fußweg bis zur nächsten möglichen Ladeposition. Ein Foto von Tor und Zufahrt genügt häufig, um die Wege zu verstehen. Die Möglichkeit einer Einfahrt prüfen wir für das tatsächlich eingesetzte Fahrzeug.']
    ],
    questions:[
      ['Wie melde ich alte Farben oder unbekannte Flüssigkeiten?', 'Vermerken Sie sichtbare Behälter getrennt vom übrigen Inventar. Lassen Sie die Behälter für die Anfrage geschlossen und an ihrem Platz. Farben, Lösungsmittel und unbekannte Flüssigkeiten holen wir nicht ab. Wenn eine Kiste mit solchen Gebinden neben gewöhnlichen Möbeln steht, können Sie die Möbel separat zur Räumung anfragen.'],
      ['Was beeinflusst den Preis bei einer Teilräumung?', 'Entscheidend ist, was die vereinbarte Fläche belegt. Drei Fahrräder am Tor haben einen anderen Trageweg als volle Werkzeugschränke hinter einem zweiten Regal. Beschreiben Sie auch, ob ein Schrank abgebaut werden soll oder in der Garage bleibt. Das Angebot nennt die zu räumende Fläche und die vereinbarten Arbeiten.'],
      ['Welche Angaben helfen bei einer Garage mit mehreren Nutzern?', 'Beschreiben Sie Ihr Abteil oder die Seite des Stellplatzes und kennzeichnen Sie, welche Sachen Ihnen gehören. Falls Nachbarn den Zugang mitbenutzen, nennen Sie ein Zeitfenster für die Übergabe. So lassen sich das Öffnen des Tors, der Zugang zu Ihren Gegenständen und der Ladeweg gemeinsam einplanen.'],
      ['Was passiert mit Werkzeug, das ich behalten möchte?', 'Nennen Sie den gewünschten Ablageort für das Werkzeug, etwa das frei bleibende Regal links vom Eingang. Soll eine Werkbank bleiben, während nur ihr Inhalt herauskommt, führen Sie das ausdrücklich auf. Kleine Teile können Sie im Auftrag zu einer Gruppe zusammenfassen, solange klar ist, welche Gruppe wohin geht.']
    ],
    inquiryLabel:'Garagenräumung anfragen', related:['/keller-entruempeln/','/schrank-abbauen/']
  },
  {
    path:'/matratze-entsorgen/', label:'Bett, Lattenrost und Matratze', service:'entsorgung',
    title:'Matratze oder Bett entsorgen in Nürnberg',
    description:'Matratze, Lattenrost oder ein komplettes Bett aus der Wohnung bringen. Bettbreite, Bauart und Abbau für ein persönliches Angebot nennen.',
    heading:'Matratze, Lattenrost oder ein ganzes Bett abgeben',
    photoAlt:'Eine hochkant gestellte Matratze lehnt am hölzernen Bettgestell mit freiliegendem Lattenrost.',
    intro:'Wenn ein neues Bett geliefert wird, muss manchmal nur die alte Matratze aus dem Schlafzimmer. In anderen Fällen sollen auch Rahmen, Lattenrost und Kopfteil heraus. Für eine Anfrage in Nürnberg können Sie jedes Stück einzeln aufführen und entscheiden, welche Teile Sie behalten möchten.',
    sections:[
      ['Welche Teile gehören zu Ihrem Bett?', 'Geben Sie bei einer Matratze Stückzahl, Länge und Breite an. Bei einem Doppelbett können zwei schmale Matratzen auf zwei einzelnen Rosten liegen. Bei einem Boxspringbett kommen häufig zwei Unterboxen, ein Topper und ein Kopfteil hinzu. Für die Planung hilft die Breite der größten Unterbox mehr als die Liegefläche des gesamten Bettes.'],
      ['Was muss aus dem Schlafzimmer getragen werden?', 'Ist der Rahmen noch aufgebaut, können Sie den Möbelabbau gleich mit anfragen. Nennen Sie Schubladen, Bettkasten oder eine elektrische Verstellung. Bei einem bereits zerlegten Bett sind die langen Seitenteile oft entscheidend. Beschreiben Sie, ob sich diese aus der Zimmertür in den Flur drehen lassen und ob ein enger Absatz auf dem Weg liegt.']
    ],
    questions:[
      ['Können Sie den Aufwand für eine einzelne Matratze einschätzen?', 'Teilen Sie uns zum Maß auch das Stockwerk und die mögliche Ladeposition mit. Schreiben Sie dazu, wenn die Matratze besonders dick oder steif ist. Für ein persönliches Angebot prüfen wir, ob sie sich durch Flur und Treppenhaus tragen lässt und welche Abholung Sie wünschen.'],
      ['Was muss ich angeben, wenn der Rahmen an eine zweite Adresse geht?', 'Führen Sie das Gestell als weiterzuverwendendes Möbel und die ausgediente Matratze als eigene Position auf. Für den Rahmen zählen Zieladresse, Zugang und der Ort der Übergabe. Wenn Beschläge oder Schrauben bereits getrennt verpackt sind, geben Sie das dazu. So können zusammengehörige Teile bei der Planung dem richtigen Ziel zugeordnet werden.'],
      ['Mein neues Bett kommt am selben Tag. Wie plane ich das?', 'Tragen Sie den möglichen Abholzeitraum und das angekündigte Lieferfenster getrennt ein. Ist das alte Bett bis zum Vorabend in Gebrauch, vermerken Sie auch das. Maßgeblich für die Abstimmung mit dem Möbelhaus ist ein bestätigter Termin. Das erleichtert die Planung, wenn beide Teams denselben Aufzug benötigen.'],
      ['Die Abholung ist schon organisiert. Welche Leistung frage ich dann an?', 'Wenn Sie nur Hilfe beim Heraustragen zum vereinbarten Abstellort brauchen, nennen Sie genau diesen Ort und das bereitgestellte Zeitfenster. Soll das Team die Teile auch abfahren, geben Sie das als weiteren Wunsch an. So lässt sich im Angebot ablesen, an welchem Punkt der Auftrag für Ihr Bett endet.']
    ],
    inquiryLabel:'Bett oder Matratze anfragen', related:['/schrank-abbauen/','/sofa-entsorgen/']
  },
  {
    path:'/buero-raeumen/', label:'Büro und Arbeitszimmer räumen', service:'entruempelung',
    title:'Büro oder Arbeitszimmer räumen in Nürnberg',
    description:'Arbeitszimmer und kleine Büros räumen. Schreibtische, Regale und Bücherkartons erfassen, vertrauliche Unterlagen zurücklegen und Übergabetermin nennen.',
    heading:'Ein Büro oder Arbeitszimmer in Nürnberg räumen',
    photoAlt:'Zwei Archivkartons auf einem Schreibtisch, dahinter ein zweiter Arbeitsplatz mit zwei Bildschirmen.',
    intro:'Beim Räumen eines Büros in Nürnberg hat vieles noch einen festen Platz im Arbeitsalltag. Vielleicht zieht der Schreibtisch an den neuen Standort, das Regal bleibt beim Vermieter und die Ordner übernimmt eine Kollegin. Eine Zuordnung pro Raum zeigt, welche Arbeiten Sie tatsächlich brauchen.',
    sections:[
      ['Mobiliar und Bücher nach Raum erfassen', 'Mit der Angabe „ein Tisch mit zweiteiliger Platte und acht Stühle im Besprechungsraum“ können wir den Trageaufwand besser einschätzen als allein mit der Quadratmeterzahl. Geben Sie bei hohen Schränken an, ob sie an der Wand befestigt sind. Führen Sie Bücherkartons, Ordner und leichtes Büromaterial als getrennte Gruppen auf. So lässt sich der Trageaufwand je Raum abschätzen.'],
      ['Die Übergabe mit dem Betrieb abstimmen', 'Nennen Sie den letzten Arbeitstag im Raum sowie den Termin der Schlüsselübergabe. Vielleicht muss der Empfang bis zum Nachmittag besetzt bleiben, während das Besprechungszimmer vormittags schon leer werden kann. Für die Kalkulation zählen auch die nutzbaren Aufzüge, der Zugang zum Gebäude und die Strecke von der Ladezone bis zur Bürotür.']
    ],
    questions:[
      ['Was geschieht mit Akten und Datenträgern?', 'Bestimmen Sie, welche Unterlagen, Rechner und Datenträger vor Ort bleiben oder an eine benannte Person gehen. Für die Anfrage genügen Mengen und äußere Maße. Lesbare Aktenseiten, Kundendaten oder Bildschirminhalte gehören nicht auf die Fotos. Datenlöschung und Aktenvernichtung sind kein Bestandteil unseres Räumungsangebots.'],
      ['Kann ein Teil der Möbel in ein neues Büro?', 'Ja, führen Sie diese Möbel mit Zieladresse und Raumbezeichnung auf. Bei einem großen Konferenztisch brauchen wir vor allem die Länge der Platten und die Engstellen an beiden Standorten. Nennen Sie auch, ob am Ziel ein Aufbau gewünscht ist. Im Angebot sehen Sie, welche Möbelarbeiten und Fahrten sich vereinbaren lassen.'],
      ['Was ist bei gemieteten Geräten zu beachten?', 'Markieren Sie etwa Drucker oder Kopierer, die der Anbieter selbst abholt. Für unsere Planung reicht der Hinweis, wo das Gerät steht und wann es erreichbar sein muss. Benennen Sie größere Geräte mit unbekanntem Gewicht gesondert, damit wir ihre Beförderung vor einer Zusage prüfen können.'],
      ['Was gebe ich für eine einzelne Bücherwand an?', 'Schätzen Sie die Zahl voller Regalböden und nennen Sie die Breite eines Elements. Geben Sie an, ob die Bücher bereits in Kartons liegen und ob auch das Regal heraus soll. Damit können Sie gezielt den betroffenen Teil des Arbeitszimmers anfragen.']
    ],
    inquiryLabel:'Büroräumung anfragen', related:['/schrank-abbauen/','/wohnungsaufloesung/']
  },
  {
    path:'/moebel-nach-privatkauf-abholen/', label:'Möbel nach Privatkauf abholen', service:'moebeltaxi',
    title:'Möbel nach Privatkauf in Nürnberg abholen lassen',
    description:'Ein Möbelstück aus Kleinanzeigen abholen lassen. Abholzeit beim Verkäufer, Maße, Abbau und beide Tragewege in einer Transportanfrage zusammenfassen.',
    heading:'Gebrauchte Möbel nach einem Privatkauf abholen lassen',
    photoAlt:'Vor einer Holzkommode liegen eine herausgezogene Schublade und ein Tragegurt auf einer Schutzdecke.',
    intro:'Sie haben in Nürnberg über Kleinanzeigen einen Esstisch gefunden, der genau in Ihre Wohnung passt. Für die Abholung müssen Übergabe, Fahrzeug und Tragewege zusammenpassen. Teilen Sie uns mit, welches Möbelstück Sie gekauft haben, wie es beim Verkäufer bereitsteht und wo Sie es bei sich aufstellen möchten.',
    sections:[
      ['Was übergibt der Verkäufer?', 'Für ein Sideboard zählen die Außenmaße und die Zahl der losen Teile. Für einen Tisch mit abnehmbarer Platte ist die Größe der Platte entscheidend. Nennen Sie Glas, Stein oder besonders schwere Bauteile ausdrücklich. Wenn ein Möbelabbau vor der Abholung nötig ist, sollte aus der Anfrage hervorgehen, wer ihn übernimmt und welche Teile schon einzeln bereitliegen.'],
      ['Zwei Adressen, zwei unterschiedliche Wege', 'Beschreiben Sie Abholung und Lieferung separat. Ein ebenerdiger Lagerraum beim Verkäufer und eine Wohnung im dritten Stock bei Ihnen bedeuten zwei unterschiedliche Tragewege. Nennen Sie die Etagen, den nutzbaren Aufzug und den Abstand zur nächsten Ladeposition jeweils für beide Orte. Bei einer schmalen Tür hilft das bekannte lichte Maß an der engsten Stelle.']
    ],
    questions:[
      ['Genügt der Link zum Inserat?', 'Ein Inserat kann nach dem Verkauf verschwinden. Halten Sie Stückzahl, Maße und bekannte Besonderheiten deshalb im Formular fest. Ein eigenes Foto oder ein Bild, das Sie mit Zustimmung des Verkäufers weitergeben dürfen, erleichtert die Zuordnung. Wenn ein Maß geschätzt ist, kennzeichnen Sie es als Schätzung.'],
      ['Wie plane ich einen festen Abholtermin?', 'Tragen Sie den vom Verkäufer genannten Tag und das verfügbare Zeitfenster ein. Schreiben Sie dazu, wer die Tür öffnet und wann Sie das Möbel am Ziel entgegennehmen können. Wir prüfen den Transport anhand dieser beiden Zeitfenster. Stimmen Sie die endgültige Übergabe ab, sobald ein Termin bestätigt ist.'],
      ['Wovon hängt der Preis bei einem einzelnen Möbel ab?', 'Neben der Fahrt zählt die Arbeit an beiden Adressen. Ein verpackter Tisch, der an der Tür bereitliegt, erfordert einen anderen Aufwand als ein aufgebauter Schrank mit Spiegeltüren. Im persönlichen Angebot können Sie nachsehen, ob Heraustragen, Fahrt, Hineintragen und gewünschter Abbau berücksichtigt sind.'],
      ['Kann ich auch zwei Stücke bei derselben Person abholen lassen?', 'Führen Sie beide Möbel einzeln auf und geben Sie für jedes das größte Teil an. Geht eines an eine weitere Adresse, nennen Sie diese mit Zugang und Annahmezeit. So lässt sich prüfen, ob eine gemeinsame Fahrt zu Ihren Übergabeterminen passt.']
    ],
    inquiryLabel:'Abholung beim Verkäufer anfragen', related:['/schrank-abbauen/','/sofa-entsorgen/']
  },
  {
    path:'/umzug-ins-pflegeheim/', label:'Teilumzug ins Pflegeheim', service:'seniorenumzug',
    title:'Umzug ins Pflegeheim in Nürnberg planen',
    description:'Teilumzug ins Pflegeheim oder Seniorenheim. Möbel und Erinnerungsstücke auswählen, Lieferzeit mit der Einrichtung abstimmen und beide Zugänge angeben.',
    heading:'Ein Teilumzug ins Pflegeheim in Nürnberg',
    photoAlt:'Ein grüner Ohrensessel und ein geöffneter Karton mit einer Decke stehen neben einem Pflegebett.',
    intro:'Wer in ein Pflegeheim in Nürnberg zieht, möchte im neuen Zimmer schnell etwas Vertrautes wiederfinden. Ein Lieblingssessel, die Leselampe oder eine Kommode können wichtiger sein als der übrige Hausrat. Sie entscheiden, was mitkommt. Angehörige können die Abstimmung übernehmen und die Wünsche der umziehenden Person festhalten.',
    sections:[
      ['Was passt ins neue Zimmer?', 'Fragen Sie in der Einrichtung nach den bereits vorhandenen Möbeln und dem Platz für eigene Stücke. Für einen Sessel zählen seine Außenmaße einschließlich der Armlehnen. Bei einer Kommode ist auch der Platz vor den Schubladen wichtig. Eine Skizze des Zimmers mit Tür und Fenster hilft, die Auswahl in Ruhe zu treffen.'],
      ['Was wird am ersten Tag gebraucht?', 'Halten Sie die Stücke für das Pflegezimmer getrennt von Sachen für Angehörige. Auf die Liste für den Einzug gehören auch kleine Dinge wie ein Bilderrahmen oder ein Karton Kleidung. Benennen Sie eine Person, die bei Abholung und Ankunft erreichbar ist. Für die Möbelplanung brauchen wir Zugang und Mengen. Persönliche Gesundheitsdaten können Sie für sich behalten.']
    ],
    questions:[
      ['Kann ich den Umzug als Angehöriger organisieren?', 'Ja. Geben Sie für die Abholung an, wer die bisherige Wohnung öffnet und die Auswahl kennt. Am Ziel genügt die Person, die den Weg ins richtige Zimmer zeigen kann. Wenn die umziehende Person selbst bestimmte Dinge entgegennehmen möchte, vermerken Sie das bei der geplanten Übergabe.'],
      ['Was passiert mit Möbeln, die zur Familie gehen?', 'Ordnen Sie jedes dieser Möbelstücke einer Adresse zu. Soll der Esstisch beispielsweise zum Sohn und der Sessel ins Pflegezimmer, braucht die Planung beide Ziele mit Etage und Annahmezeit. Für eine spätere Räumung der bisherigen Wohnung können Sie einen eigenen Zeitraum und den gewünschten Umfang nennen.'],
      ['Lassen sich Einzug und Lieferung zeitlich trennen?', 'Nennen Sie den Einzugstag und das von der Einrichtung mögliche Lieferfenster. Beschreiben Sie den vorgesehenen Eingang, den Aufzug und den Weg bis zum Zimmer. Wenn die Möbel bereits vor dem Einzug bereitstehen sollen, vermerken Sie den frühesten Zugang. Der Auftrag bezieht sich auf die vereinbarten Gegenstände und ihren Transport.'],
      ['Wie bekomme ich ein Angebot für wenige Stücke?', 'Listen Sie die ausgewählten Möbel und die ungefähre Kartonzahl auf. Teilen Sie uns mit, welcher Abbau in der Wohnung und welcher Aufbau im Zimmer gewünscht ist. Anhand der Tragewege und Zeitfenster können wir den Teilumzug kalkulieren. Sie können das Angebot gemeinsam mit Ihrer Vertrauensperson durchgehen.']
    ],
    inquiryLabel:'Teilumzug anfragen', related:['/wohnungsaufloesung/','/schrank-abbauen/']
  }
];
