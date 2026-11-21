# FrankenPackt · Anfragen, Aufträge und Zahlungseingänge

## Angebot kalkulieren und Absage einordnen

`node ops.mjs show VORGANG` zeigt bei detaillierten Website-Anfragen die Einsatzdaten unter `jobScopeSummary`. Bei einem Umzug stehen Abhol- und Zieladresse mit ihrem jeweiligen Zugang getrennt im Vorgang. Für die Einsatzplanung sind die tatsächlich nutzbare Nutzlast des Fahrzeugs, Tragewege, verfügbare Helfer und der vereinbarte Umgang mit den Gegenständen maßgeblich. Bei einer Räumung prüfen Sie auch, welche Stücke der Kunde behalten will und welche Abholung er beim Entsorger beauftragt.

Ein übernommenes Preisziel bezieht sich auf den Vergleichspreis für denselben Leistungsumfang abzüglich 2 €. Etagen, Laufwege und weitere Auftragsdetails dienen der Prüfung durch das Team. Den angebotenen Endpreis dokumentiert das Team nach dieser Prüfung.

Nach der Prüfung und Qualifizierung erfasst das Team den tatsächlich angebotenen Bruttopreis. Die erste Version erhält die Nummer 1. Für eine Preisänderung vor der Buchung folgt jeweils die nächste Nummer. Jede Version enthält den vollständigen Preis und optional die geplanten Netto-Ausführungskosten.

```powershell
node ops.mjs stage VORGANG qualified
node ops.mjs quote VORGANG 1 789.00 412.25
node ops.mjs show VORGANG
```

Im Projektmodell mit 19 % Umsatzsteuer ergeben sich für dieses Beispiel 250,78 € geplanter Deckungsbeitrag vor Werbung. Bei einer Zielmarge von 20 % des Nettoumsatzes bleiben höchstens 118,17 € für die Gewinnung dieses erfüllten und vollständig bezahlten Auftrags. Die tatsächliche Werbung ist noch abzuziehen. Fehlen die geplanten Kosten einer Version, bleiben beide Schätzungen leer. Eine Buchung, Schlussrechnung oder Zahlung wird weiterhin separat dokumentiert. Gleiche Versionsnummer und identische Beträge können nach einem Verbindungsabbruch erneut eingegeben werden.

Für einen verlorenen Vorgang erfasst das Team genau einen Grund mit `node ops.mjs loss VORGANG GRUND`. Erlaubt sind `price` (Preis), `timing` (Termin), `capacity` (Kapazität), `scope` (Leistungsumfang), `outside_area` (Gebiet), `no_response` (keine Antwort), `customer_cancelled` (Absage durch den Kunden) und `other` (anderer bekannter Grund). Der bisherige Statusbefehl funktioniert weiterhin. Ein bereits geschlossener Vorgang ohne Grund kann nachträglich anhand eines bestätigten Sachverhalts eingeordnet werden. Historische Angebote ohne erfassten Betrag bleiben ohne Wert.

## Angenommenes Angebot buchen

Zum Buchen werden die aktuelle Angebotsversion mit geplanten Nettokosten, das vereinbarte Einsatzdatum, der konkrete Leistungsumfang und ein Beleg für die Kundenannahme benötigt. Der Beleg bleibt im betrieblichen Postfach oder Gesprächsprotokoll. In diesem Werkzeug genügt sein interner Verweis. Zulässige Annahmewege sind `email`, `phone`, `whatsapp`, `signed` und `in_person`. Der Betreiber gibt die Daten beispielsweise in PowerShell ein:

```powershell
'{"revision":1,"serviceDate":"2026-12-04","scope":"15 gepackte Kartons, EG zu EG, vereinbarte Fahrt innerhalb Nürnbergs","customerAccepted":true,"acceptanceChannel":"email","acceptanceRef":"POSTFACH-0412-01"}' | node ops.mjs book VORGANG
```

Wird das Angebot geändert, muss der Beleg die Annahme der neuen Version bestätigen. Fehlende Kosten oder fehlende Buchungsangaben sind nachzutragen. Bei Nullkosten oder einem geplanten Deckungsbeitrag vor Werbung von 0 € oder weniger benötigt eine bewusste Ausnahme zusätzlich das JSON-Feld `exceptionReason` mit der betrieblichen Begründung. `ops.mjs show VORGANG` zeigt die gespeicherten Angaben. Bestehende Altbuchungen bleiben bearbeitbar und abrechenbar.

## Vorschau

Im Ordner `web` mit Node.js 24 starten. Abhängigkeiten sind in Node enthalten. Die Vorschau verwirft Formulare nach der Prüfung, zeigt eine Musterquittung, setzt einen Suchmaschinen-Ausschluss und legt keine Kundendatenbank an.

```powershell
node --test
node server.mjs
```

Website im Browser über `http://127.0.0.1:8787/` öffnen. Eine vom Startskript ausgegebene abweichende Portnummer gilt für dessen Sitzung.

## In den Betrieb übernehmen

1. Betreibername und Rechtsform, ladungsfähige Anschrift, erreichbare Telefonnummer, E-Mail und gegebenenfalls Vertretung, Register und weitere einschlägige Pflichtangaben für diesen Betrieb bestätigen. Preisgrundlage und den angenommenen Umsatzsteuersatz von 19 Prozent mit dem tatsächlichen Steuerstatus abgleichen. Die Website nutzt diese Werte auch ohne JavaScript im Impressum, beim Telefonkontakt und im Datenschutztext. [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
2. Dauerhaften Node-Dienst mit HTTPS-Reverse-Proxy, automatischem Neustart und privatem Datenträger einrichten. `LEAD_DATA_DIR` muss außerhalb von `public` auf lokalem, persistentem Speicher liegen. Nur das Dienstkonto und befugte Mitarbeitende erhalten Zugriff. Datenträger und Sicherungen verschlüsseln. Beim Hoster Zugriff auf Protokolle, Löschzeit, Empfänger und Auftragsverarbeitung festlegen. Technik und tatsächliche Empfänger in den Datenschutzhinweisen abbilden. [Art. 5, 6, 13 und 28 DSGVO](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
3. Betriebswerte als Umgebungsvariablen des Dienstes setzen und `node server.mjs` starten. `GET /healthz` und `GET /api/config` müssen den gewünschten Modus liefern. Kontakt- und Rechtsseiten auf einem Mobiltelefon und ohne JavaScript prüfen. Das Formular nutzt JavaScript. Eine erste echte Auftragsanfrage im Eingang bis zum Rückruf verfolgen.
4. Im Betrieb liest ein Zuständiger den Eingang per `node ops.mjs list`. Eine Zustellautomatik ist vorbereitet. Dafür den tatsächlichen betriebseigenen HTTPS-Empfänger und dessen Token konfigurieren. Er empfängt nur Vorgangsnummer, Ereignis und Leistung und muss dieselbe Nummer wiederholt annehmen können. Fehler bleiben ohne Kundendaten in einer dauerhaften Wiederholungswarteschlange. Der Bericht zeigt Rückstand und Zahl der Versuche.

| Variable | Wert oder Wirkung |
| --- | --- |
| SITE_MODE | `preview` oder `live`. Standard ist die Vorschau. |
| PUBLIC_ORIGIN | Eigene HTTPS-Adresse des Betriebs, ohne Unterpfad. |
| OPERATOR_NAME, LEGAL_ADDRESS | Freigegebener Betreiber und vollständige Anschrift, optional mit Zeilenumbrüchen. |
| CONTACT_PHONE, CONTACT_EMAIL | Überprüfte und betreute Kontakte. |
| CONTACT_WHATSAPP | Optional. Betreute WhatsApp-Geschäftsnummer des Betriebs mit internationaler Vorwahl, z. B. im Format `+49…`. Nur bei gesetzter Nummer wird der Kontakt im Betrieb angeboten. |
| CONTACT_METRICS | Optional. `1` aktiviert die betriebseigene, freiwillige Klickmessung im Kontaktdialog. Standardmäßig aus. Eingehende Anfragen und vom Team bestätigte Gesprächsergebnisse werden unabhängig davon operativ bearbeitet. |
| LEGAL_EXTRA, PRIVACY_CONTACT, PRIVACY_EXTRA | Einschlägige weitere Anbieterangaben, Kontakt für Betroffenenrechte sowie tatsächlicher Hoster, Empfänger, Rechtsgrundlagen und einschlägige Speicherfristen. |
| LEAD_DATA_DIR | Absoluter Pfad zur betrieblichen SQLite-Datei. Für alle Verwaltungsbefehle dieselbe Variable setzen. |
| HOST, PORT | Standardmäßig `127.0.0.1` und `8787`. Hinter dem HTTPS-Proxy auf Loopback betreiben. |
| CLOSED_RETENTION_DAYS | Technischer Vorschlag von 90 Tagen für geklärte Vorgänge im Anfragewerkzeug und für Seitenaufrufzähler. Löschfrist mit tatsächlichem Zweck abstimmen. Offene Arbeit, Forderungen oder ungeklärte Erstattungen betreut schließen. |
| OPS_NOTIFY_URL, OPS_NOTIFY_TOKEN | Gemeinsam und nur für einen freigegebenen betrieblichen Empfänger setzen. Token im Secret Store des Dienstes hinterlegen. |
| TRUST_LOCAL_PROXY, MAX_SUBMITS_PER_MINUTE | Nur wenn der lokale Reverse-Proxy ein eingehendes `X-Real-IP` zuverlässig mit der Clientadresse überschreibt, `TRUST_LOCAL_PROXY=1` setzen. Standardlimit 30 Formularversuche pro Peer und Minute. |

## Tagesgeschäft

Den Arbeitstag mit `node ops.mjs callbacks` beginnen. Die interne Liste zeigt die älteste offene Rückrufbitte zuerst, dazu Referenz, Name, Telefonnummer, Leistung und das vom Kunden eingetragene Zeitfenster. Bei einer ausführlichen Umzugsanfrage bezeichnet `moveWindow` den Umzugszeitraum. Beim kurzen Rückrufformular bezeichnet `callbackWindow` die gewünschte Erreichbarkeit. Die Freitexte des Kunden stehen unter `show VORGANG`.

Nach dem geführten Rückruf `node ops.mjs contact VORGANG callback_completed` eintragen. Der Vorgang verschwindet damit sofort aus der Arbeitsliste. Bei belegter Leitung oder Mailbox bleibt er für den nächsten Versuch offen. Abgeschlossene oder verlorene Vorgänge und einem Hauptvorgang zugeordnete Nebenvorgänge werden ausgeblendet. Vor dem Zusammenführen prüfen, ob noch ein Rückruf an die Person im Nebenvorgang aussteht. Ältere manuelle Telefoneinträge ohne dokumentierte Rückrufbitte sind über `list` und `show` erreichbar. Auf die Arbeitsliste mit Kontaktdaten greifen nur die zuständigen Mitarbeitenden im geschützten Betriebsverzeichnis zu.

```text
node ops.mjs list
node ops.mjs callbacks
node ops.mjs show VORGANG
node ops.mjs contact VORGANG phone_connected
node ops.mjs contact VORGANG callback_completed
node ops.mjs contact VORGANG whatsapp_received
node ops.mjs stage VORGANG qualified
node ops.mjs quote VORGANG 1 498.00 300.09
Get-Content -Raw .\buchung.json | node ops.mjs book VORGANG
node ops.mjs stage VORGANG completed 498.00 300.09
node ops.mjs payment VORGANG BANK-1001 100.00
node ops.mjs payment VORGANG BANK-1002 398.00
node ops.mjs refund VORGANG BANK-1003 198.00
node ops.mjs paid-orders
node ops.mjs report 2026-11-01 2026-11-30
```

Beträge im Beispiel sind Testwerte. Für `qualified` müssen Einsatzort, Umfang und grundsätzliche Durchführbarkeit geklärt sein. `quoted` nach übermitteltem Angebot, `booked` nach bestätigtem Auftrag, `completed` nach Leistungserbringung mit tatsächlich abgerechnetem Bruttopreis und tatsächlichen Nettokosten erfassen. Zahlung nur nach Abgleich mit Bank, Kasse oder Zahlungsdienst melden. Jeder reale Ein- oder Ausgang erhält seinen eigenen dauerhaften Buchungsschlüssel. Ein gleicher Schlüssel lässt sich folgenlos wiederholen. Zu jedem Auftrag gehört eine stabile Vorgangsnummer.

`paid-orders` zählt den ersten vollständig gedeckten, durchgeführten Auftrag einmal. Eine bereits bezahlte Anzahlung löst dieses Ereignis bei späterer Leistungserbringung aus. Eine Erstattung senkt den aktuellen Saldo. Die Felder `everPaidOrders` und `currentlyPaidInFull` zeigen die beiden Zeitpunkte. `collectedContributionBeforeAdsEUR` setzt bei durchgeführten Aufträgen die vereinnahmte Zahlung nach Erstattungen bis höchstens zum Rechnungsbetrag, abzgl. 19 % USt. und eingetragener Nettokosten an. Werbeausgaben des passenden Zeitraums zusätzlich abziehen. Das Werkzeug dient der operativen Abstimmung. Originalrechnungen, Zahlungsbelege und vorgeschriebene Aufbewahrung führt das betriebliche Buchhaltungssystem.

## Telefon und mehrere Kontaktwege

Für ein tatsächliches Telefongespräch oder eine Kleinanzeigen-Anfrage kann `node ops.mjs record` eine einzelne JSON-Anfrage von der Standardeingabe lesen. Kontaktweg, Name, Leistung und Start-PLZ sind erforderlich. `source` stammt aus einer zuordenbaren Anzeige oder der Auskunft des Kunden. Quelle sonst `unbekannt` lassen. Personenbezogene Daten über die geschützte Eingabe am Arbeitsplatz bearbeiten. Ein Klick auf die Telefonnummer, ein verpasster Anruf ohne Zuordnung oder ein unbekannter Anschluss begründet keinen Auftrag.

Eine kurze Rückrufbitte über die Website benötigt Name und Telefonnummer. Terminwunsch, Nachricht und PLZ sind freiwillig. Eine übermittelte Telefonnummer als gewünschter Antwortweg im ausführlichen Formular erzeugt ebenfalls einen Rückrufwunsch. Die Dankeseite wird nach erfolgreicher Annahme gezeigt. Das erneute Laden dieser Seite zählt keinen zweiten Eingang.

Für ein eingehendes WhatsApp-Gespräch den passenden Vorgang öffnen oder eine echte neue Anfrage mit `record` erfassen. Nach Sichtung der eingegangenen Kundennachricht `contact VORGANG whatsapp_received` setzen. Nach einem persönlichen Telefongespräch `phone_connected` eintragen. Nach einem tatsächlich geführten angeforderten Rückruf `callback_completed` verwenden. Dieser Eintrag erfasst zugleich `phone_connected`. Mailbox und Klingeln erfüllen diese Bedingung nicht. Wiederholen desselben Befehls ändert den Erstzeitpunkt nicht. Die Ergebnisse sind über `show VORGANG` nachvollziehbar. Eigene Nachrichten oder Kontaktangaben gehören nicht in diese Ereignisbezeichnungen.

```json
{"name":"Testperson","service":"umzug","zipFrom":"90453","contactMethod":"phone","phone":"0911 1234567","details":"Musterfahrt","source":"unbekannt"}
```

Stimmen etwa Angebotsnummer und Umzugstermin nach persönlicher Rücksprache überein, `node ops.mjs link FOLGEVORGANG HAUPTVORGANG "Angebotsnummer im Rückruf bestätigt"` verwenden. Eine identische Telefonnummer kann zu mehreren Umzügen gehören. Eine Zuordnung lässt sich mit `node ops.mjs unlink FOLGEVORGANG` zurücknehmen. Der ursprüngliche Quellenkanal jeder Anfrage bleibt sichtbar. Die Auftrags- und Zahlungsergebnisse gehören zum bestätigten Hauptvorgang. [IXA-Anfragesystem](https://ixa-leads.de/) · [RRK Nürnberg](https://rohrreinigung-kraft.de/)

## Messung und Sicherung

### Lokale Auswertung der Google-Anzeige

`node ops.mjs ad-review VON BIS ANZEIGENVARIANTE BESTÄTIGTE_KOSTEN_EUR` liest die seit dem ersten und bis einschließlich zum letzten Berliner Kalendertag eingegangenen Anfragen der Variante. Für Entrümpelung und Entsorgung heißen die Varianten `entruempelung-nuernberg` und `entsorgung-nuernberg`. Die Umzugskampagne verwendet `privatumzug-team` und `seniorenumzug-team`. Den tatsächlich angefallenen Werbeaufwand genau dieser Variante und dieses Zeitraums aus der Abrechnung oder dem abgeglichenen Google-Ads-Kostenbericht übernehmen. Einen Nettobetrag verwenden, wenn die enthaltene Umsatzsteuer als Vorsteuer abziehbar ist. Kostenwert und Zeitraum müssen dieselbe wirtschaftliche Grundlage wie der Deckungsbeitrag haben. Der Auswertungsbefehl speichert den eingegebenen Betrag nicht.

Die Ausgabe zeigt den aktuellen Zahlungsstand der Eingangskohorte. `costPerFullyPaidCompletedJobEUR` teilt den eingegebenen Aufwand durch die aktuell vollständig bezahlten, ausgeführten Aufträge. Solange die Zahl null ist, bleibt der Wert `null`. `fullyPaidContributionAfterAdsEUR` zieht den gesamten Aufwand von der Marge dieser voll bezahlten Aufträge ab. `collectedContributionAfterAdsEUR` zieht ihn von der vereinnahmten Marge aller ausgeführten Aufträge derselben Kohorte ab. Dadurch werden auch Teilzahlungen, Erstattungen und deren Ausführungskosten sichtbar. Beide Werte sind alternative Sichten auf denselben Werbeaufwand. Offene Aufträge später erneut zum selben Zeitraum auswerten.

Das ist eine zugeordnete Pilotkohorte. Unzugeordnete tatsächliche Anrufe, WhatsApp-Eingänge, Quellen ohne belastbare Herkunft und Google-Anfragen ohne bestätigte Variante bleiben separat. Die ausgewiesene Marge deckt die im Auftrag erfassten Ausführungskosten und den eingegebenen Werbeaufwand ab. Die Auswertung liest ausschließlich das lokale Betriebsjournal.

`contactIntentClicks` enthält die freiwillig gemessenen Kontaktaktionen je Berliner Kalendertag und Quellenkategorie. Der Browser sendet nach Zustimmung nur Ereignis, Quellenkategorie und eine zufällige Nummer pro Aktion an `/api/contact-events`. Der Server speichert zur Wiederholungserkennung einen Prüfwert der Nummer für etwa 24 Stunden und verwirft anschließend den Prüfwert. Der Tageszähler wird nach der konfigurierten Aufbewahrungszeit bereinigt. Die Messung kann weder einen angenommenen Anruf noch eine gesendete Nachricht feststellen.

`contactOutcomes` zählt pro Quellenkategorie die Vorgänge mit dem jeweiligen Ereignis aus dem gewählten Eingangszeitraum. `inquiry_received` steht für den technisch quittierten Website-Eingang. `callback_requested` ist die darin enthaltene Bitte um telefonische Antwort. `phone_connected`, `callback_completed` und `whatsapp_received` beruhen auf Bestätigung durch den Betrieb. Ein Vorgang kann mehrere dieser Ereignisse erreichen. Die getrennten Zahlen lassen sich deshalb nicht zu einer Zahl verschiedener Kunden addieren. Alte Datensätze werden nicht nachträglich mit Gesprächsergebnissen befüllt. Vom eigenen Kontaktformular und von externen Plattformen gelangen keine personenbezogenen Daten in den aggregierten Bericht.

Jeder laufende Betriebstag erzeugt automatisch eine lokale Datei unter `LEAD_DATA_DIR/berichte/YYYY-MM-DD.json`. Sie enthält die aggregierten Kennzahlen der letzten 30 abgeschlossenen Berliner Kalendertage zum Erstellzeitpunkt. Ein Neustart bewahrt den ersten Tagesstand. Die Datei enthält weder Namen noch Kontakt-, Anfragen- oder Zahlungsreferenzen. Für eine andere Periode liefert `ops.mjs report VON BIS` den aktuellen Bearbeitungsstand der Anfragen aus genau diesem Eingangszeitraum.

Ein Seitenaufruf ist ein HTTP-Abruf und kann sich durch Neuladen wiederholen. Besuche oder Personen lassen sich daraus nicht ableiten. Es gibt keine Marketing-Cookies und keinen Export von Klick-IDs, Namen, Telefonnummern oder E-Mails an Werbeplattformen. Der Bericht gruppiert anhand des Eingangsdatums in der Zeitzone Europe/Berlin und weist den heutigen Ausgang je Quelle und Dienst aus. `distinctContactDetails` zählt unterschiedlich verwendete Kontaktangaben. Wer mehrere Kontaktwege verwendet, kann darin mehrfach vorkommen. Wiederholte Übermittlungen derselben Anfrage werden zeitnah unter derselben Referenz quittiert. Die Zahlungsverfolgung findet im lokalen Auftragsjournal statt. Ein automatischer Import in Google Ads oder IXA ist nicht eingerichtet.

Zur interoperablen Sicherung `node ops.mjs backup ABSOLUTER_NEUER_DATEIPFAD` verwenden. Einen abgestimmten Sicherungsplan des Hosters einrichten und eine Sicherung regelmäßig separat wiederherstellen. Der Server bereinigt erledigte Fälle täglich und beim Start. Für langfristige Vergleiche aggregierte Monatsberichte vor Ablauf der Aufbewahrungszeit im Betriebsarchiv aufbewahren. Nach Prüfung eines Löschbegehrens kann ein berechtigter Mitarbeiter `node ops.mjs erase VORGANG` ausführen. Dies entfernt die Anfrage samt untergeordneten Buchungseinträgen aus diesem Werkzeug. Sicherungslöschung und handels- oder steuerrechtliche Pflichten getrennt bearbeiten.

