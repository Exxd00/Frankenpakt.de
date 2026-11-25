import {liveHtml} from './render-live.mjs';
import {phoneLines} from '../public/assets/phone-lines.js';

const cloudPrivacyHtml = '<h2>Wer Ihre Anfrage bearbeitet</h2><p>Mohamad Alzaim und die für den Auftrag berechtigten Mitarbeitenden können Ihre Anfrage und die zugehörigen Dateien einsehen. Kontaktdaten, Angaben zum Auftrag und Anlagen werden im Auftragsbereich bei Supabase in der EU gespeichert. Vercel stellt die Website bereit. Für interne Benachrichtigungen nutzen wir Resend und das betriebliche Postfach bei Hostinger. Anlagen können der Benachrichtigung beigefügt sein.</p>'+
  '<p>Zur Bearbeitung führen wir ein zugriffsbeschränktes Anfragenregister in Google Sheets. Darin stehen Ihre Vorgangsnummer, Ihr Name, Ihre angegebenen Kontaktdaten und der gewünschte Kontaktweg sowie Angaben zu Leistung, Einsatzort, Termin und Bearbeitungsstand. Bei Firmenanfragen können auch Firma, Ansprechpartner und Angebotsfrist enthalten sein. Zu Anlagen erscheint nur die Anzahl. Zugriff haben die für die Bearbeitung berechtigten Personen.</p>'+
  '<h2>Speicherdauer und Zugriffsschutz</h2><p>Offene Anfragen bleiben bis zur Bearbeitung gespeichert. Abgeschlossene Anfragen und ihre Anlagen werden im Auftragssystem nach 90 Tagen gelöscht. Beim nächsten erfolgreichen Abgleich wird auch der Eintrag im Anfragenregister entfernt. Für aufbewahrungspflichtige Geschäftsunterlagen gelten die gesetzlichen Fristen. Für eine vorübergehende Begrenzung der Zugriffshäufigkeit verwendet das Auftragssystem einen zeitlich begrenzten Prüfwert aus der Verbindungsadresse.</p>'+
  '<h2>Messung von Anfragen</h2><p>Bei Eingang einer Anfrage protokollieren wir den Zeitpunkt, die Leistungs- und Quellenkategorie, die Art des Vorgangs und eine technische Ereigniskennung. Mit Ihrer Einwilligung zur Statistik merken wir uns in diesem Browser-Tab die Einstiegsseite und übermittelte Kampagnenangaben. Im Ereignisblatt können dann das Medium, die Kampagnenkennung, das gebuchte Anzeigenkeyword und die von Google Ads übermittelte Klick-ID (GCLID) stehen. Bei Widerruf löschen wir diese Zuordnung im Tab. Das Ereignisprotokoll in Google Sheets enthält keine Kontaktdaten, Adressen, Eingaben in Suchmaschinen oder Anlagen. Für Fragen oder die Ausübung Ihrer Rechte schreiben Sie an <a href="mailto:info@frankenpakt.de">info@frankenpakt.de</a>.</p>';

export const operator = {
  operatorName:'Mohamad Alzaim', legalAddress:'Einsteinring 12\n90453 Nürnberg',
  email:'info@frankenpakt.de', privacyContact:'info@frankenpakt.de',
  ...phoneLines.main,
  cloudPrivacyHtml
};

export function cloudPage(html, pathname) {
  return liveHtml(html, operator, new URL(pathname, 'https://frankenpakt.de').href);
}
