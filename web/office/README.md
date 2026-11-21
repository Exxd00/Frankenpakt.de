# Preis- und Angebotsbüro

`/admin/` lädt die Anmeldemaske. Alle personenbezogenen Vorgänge und die aktuellen Büropreise werden erst nach Anmeldung über `/api/office/` geladen. Dieser Pfad wird auf die Supabase Edge Function `frankenpakt-office` umgeschrieben.

## Nutzung

- Mit dem vereinbarten Passwort lassen sich Preise, Mengenrechnung und Markenmaterial ansehen. Das Google-Konto frankenpakt.de@gmail.com hat im verknüpften Kalkulationsblatt Leserechte.
- Über **Mit IXA bearbeiten** einen Anmeldelink an das IXA-Postfach anfordern und den Bestätigungslink aus dieser E-Mail einfügen. Damit kann IXA Positionen anlegen, Preise pflegen und Kundenangebote erstellen.
- Für ein Angebot Mengen, Anbieter samt Anschrift, Empfänger und Arbeitsumfang eingeben. Die Ausgabe übernimmt die gespeicherten Bruttopreise. **Drucken / PDF speichern** öffnet den Druckdialog. Das Archiv zeigt die jüngsten 50 Angebote mit ihren ursprünglichen Positionen.
- Büropreise, öffentliche Ab-Preise und die separate Google-Kalkulationsdatei haben eigene Datenquellen. Eine Änderung im Büro gilt unmittelbar für neue Büroangebote. Der öffentliche Rechner verwendet weiterhin seine freigegebenen Ab-Preise.

## Betrieb

Die SQL-Migrationen sind `schema.sql` und anschließend `quote-issuer.sql`. Der Edge-Einstieg ist `index.ts`. Das Projekt stellt `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` ausschließlich dem Server bereit. Der Edge-Endpunkt nutzt eigene vierstündige Sitzungen mit Secure-HttpOnly-Cookie und serverseitig geprüften Rollen. Für diesen Endpunkt ist die Supabase-JWT-Vorprüfung deaktiviert. Die zugelassenen Ursprünge für schreibende Browserzugriffe stehen in `handler.mjs`.

`fp_office_settings` enthält den serverseitig bereitgestellten, gesalzenen PBKDF2-SHA256-Prüfwert (310.000 Iterationen, 16-Byte-Salt, 32-Byte-Ergebnis, beide hexadezimal). Zum Wechsel des Lesezugangs einen neuen Zufallssalt verwenden, den Prüfwert außerhalb von Git aktualisieren und bestehende Viewer-Sitzungen widerrufen. Nur die Service-Rolle hat Zugriff auf die Tabellen und die Angebotsfunktion.

Für den optionalen Abruf einer gespeicherten Anfrageanlage benötigt die Edge Function `FRANKENPACKT_INTAKE_ORIGIN` und `OPS_OFFICE_FILE_TOKEN`. Derselbe Token ist im privaten Node-Eingangsdienst zu hinterlegen. Die Mitarbeiter-Mail enthält die übermittelten Anlagen direkt.
