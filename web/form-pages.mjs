export function inquiry(crumb, ic) {
  const details = '<p>Für einen Rückruf genügen Name und Telefonnummer. Auch eine Vertrauensperson kann die Anfrage übernehmen.</p>';
  const agreement = '<p>Wir prüfen Umfang und Zugang. Unser Angebot nennt die Arbeiten und den Preis. Nach Ihrer Zusage vereinbaren wir den Einsatztermin.</p>';
  const livePhone = '<p data-live-phone hidden></p>';
  return `<section class="subhead inquiry-heading"><div class="wrap narrowhero">
    ${crumb('Anfrage')}<h1 id="inquiry-title">Wobei brauchen<br><em>Sie Hilfe?</em></h1>
    <p class="lead" id="inquiry-lead">Beschreiben Sie Ihr Vorhaben und wählen Sie, wie wir Sie erreichen. Sie entscheiden über den Auftrag, sobald Ihnen unser Angebot vorliegt.</p>
    <a class="inquiry-switch" id="inquiry-switch" hidden>Nur einen Rückruf anfragen</a>
  </div></section>
  <section class="wrap section form-layout"><div>
    <div id="form-mode" class="note compact" role="status">Vorschau: Bitte verwenden Sie nur Beispieldaten. Ihre Angaben bleiben in diesem Browser.</div>
    <noscript><p>Das Onlineformular benötigt JavaScript. Unsere Kontaktangaben finden Sie im <a href="/impressum/">Impressum</a>.</p></noscript>
    <form id="lead-form" method="post" action="/api/leads" class="lead-form" autocomplete="off" novalidate>
      <label class="business-toggle"><input id="business-mode" type="checkbox"> Ich frage für eine Firma oder Hausverwaltung an</label>
      <fieldset id="business-fields" disabled hidden><legend>Firmenanfrage</legend>
        <label for="business-company">Unternehmen oder Hausverwaltung <span id="business-name-rule">*</span></label>
        <input id="business-company" maxlength="140" autocomplete="organization">
        <details id="business-options" class="inquiry-files"><summary>Angaben für Einkauf und Objektleitung <small>(optional)</small></summary>
          <div class="fields">
            <div><label for="business-reference">Projekt- oder Objektnummer</label><input id="business-reference" data-business="reference" maxlength="80"></div>
            <div><label for="business-offer-by">Bis wann benötigen Sie das Angebot?</label><input id="business-offer-by" data-business="offerBy" type="date"></div>
          </div>
          <label for="business-logistics">Was muss das Team im laufenden Betrieb beachten?</label>
          <textarea id="business-logistics" data-business="logistics" rows="2" maxlength="420" placeholder="Zum Beispiel Anmeldung am Empfang, reservierte Laderampe oder Arbeiten erst nach Geschäftsschluss"></textarea>
          <label for="business-recipient">Abweichender Angebotsempfänger mit Anschrift</label>
          <textarea id="business-recipient" data-business="recipient" rows="2" maxlength="160"></textarea>
        </details>
      </fieldset>
      <fieldset id="project-fields" disabled><legend>Ihr Vorhaben</legend>
        <div class="fields">
          <div><label for="service">Welche Hilfe wünschen Sie? <span>*</span></label>
            <select id="service" name="service" required>
              <option value="" disabled selected>Bitte auswählen</option>
              <option value="entruempelung">Entrümpelung planen</option><option value="entsorgung">Entsorgung anfragen</option>
              <option value="umzug">Privatumzug</option><option value="seniorenumzug">Seniorenumzug</option>
              <option value="moebeltaxi">Möbeltaxi</option><option value="transport">Transportanteil bei Wohnungsauflösung</option>
            </select></div>
        </div>
        <p id="service-scope" class="fine" hidden></p>
        <div id="inquiry-job-scope" hidden></div>
        <label for="details">Zusätzliche Hinweise (optional)</label>
        <textarea name="details" id="details" rows="2" maxlength="1400" placeholder="Was möchten Sie uns zusätzlich mitteilen?"></textarea>
        <details id="inquiry-files" class="inquiry-files">
          <summary>Fotos oder Dateien hinzufügen <small>(optional)</small></summary>
          <p id="job-photo-guide">Hilfreich sind eine Gesamtansicht und ein Foto vom engsten Durchgang auf dem Weg nach draußen.</p>
          <p id="job-photo-privacy" class="fine">Bitte lassen Sie Personen, persönliche Unterlagen und Bildschirme aus dem Bild.</p>
          <label for="job-files">Dateien auswählen</label>
          <input id="job-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif,.pdf,.txt" aria-describedby="job-photo-guide job-photo-privacy job-file-hint">
          <p id="job-file-hint" class="fine">Bis zu fünf Fotos, PDFs oder Textdateien. Fotos werden auf Ihrem Gerät verkleinert. Die Dateien werden erst mit der Anfrage gesendet. Gesamtgröße für den Versand: bis zu 3 MB.</p>
          <ul></ul><progress max="1" hidden></progress><p role="status" aria-live="polite"></p><small data-file-time aria-hidden="true" hidden></small>
        </details>
      </fieldset>
      <fieldset><legend>So erreichen wir Sie</legend>
        <p id="callback-context" class="fine" hidden></p>
        <label id="callback-draft-choice" hidden><input type="checkbox" id="callback-draft"> Meine ausgefüllten Auftragsdetails für diesen Rückruf mitschicken</label>
        <label for="name">Ihr Name <span>*</span></label><input id="name" name="name" required maxlength="90" autocomplete="name">
        <div id="method-field">
          <div class="radiotitle" id="pref-label">Gewünschte Rückmeldung <span>*</span></div>
          <div class="radio-row" role="radiogroup" aria-labelledby="pref-label">
            <label><input type="radio" name="contactMethod" value="phone" checked> Telefon</label>
            <label><input type="radio" name="contactMethod" value="email"> E-Mail</label>
          </div>
        </div>
        <div class="fields">
          <div><label for="phone">Ihre Telefonnummer <span id="phone-rule">*</span></label><input name="phone" id="phone" type="tel" required minlength="6" maxlength="40" autocomplete="tel"></div>
          <div><label for="email">Ihre E-Mail-Adresse <span id="email-rule">(optional)</span></label><input name="email" id="email" type="email" maxlength="200" autocomplete="email"></div>
        </div>
        <div id="callback-window" hidden><label for="callback-time">Wann erreichen wir Sie gut? (optional)</label>
          <input name="callbackTime" id="callback-time" maxlength="80" placeholder="Zum Beispiel werktags ab 14 Uhr" disabled>
        </div>
        <div class="honeypot" aria-hidden="true"><label for="website">Website</label><input name="website" id="website" tabindex="-1" autocomplete="off"></div>
      </fieldset>
      <p class="fine">Mit * markierte Felder sind erforderlich. Wir verwenden Ihre Kontaktdaten für diese Anfrage. <a href="/datenschutz/">Datenschutz</a></p>
      <button class="button js-only" type="submit" id="send-lead" disabled>Musteranfrage prüfen</button>
      <p id="form-result" role="status" aria-live="polite" tabindex="-1"></p>
    </form>
  </div>
  <aside class="form-aside"><span class="large-icon">${ic('chat',27)}</span><h2>Persönlicher Kontakt</h2>${details}${livePhone}<hr><h3>Terminvereinbarung</h3>${agreement}</aside>
  <aside class="mobile-form-help">${livePhone}<details><summary>Rückruf und Terminvereinbarung</summary>${details}${agreement}</details></aside>
  </section>`;
}

export function thankYou(crumb, ic) {
  return `<section class="wrap section receipt-section"><div class="receipt-card" id="receipt">
    ${crumb('Eingangsbestätigung')}
    <h1 id="receipt-title">Ihre Anfrage</h1>
    <p class="lead" id="receipt-description">Hier sehen Sie Ihre Bestätigung, sobald Sie das Anfrageformular abgesendet haben.</p>
    <div class="receipt-reference" hidden><span>${ic('list',20)} Vorgangsnummer</span><strong id="receipt-reference"></strong></div>
    <p class="receipt-next" id="receipt-next" hidden></p>
    <div class="actions"><a class="button" id="receipt-primary" href="/anfrage/">Zur Anfrage</a><a class="button secondary" href="/">Zur Startseite</a></div>
  </div></section>`;
}

export const legal=(crumb,privacy)=>'<div class="subhead"><div class="wrap narrowhero">'+crumb(privacy?'Datenschutz':'Impressum')+'<h1>'+(privacy?'Datenschutz':'Impressum')+'</h1></div></div><section class="wrap section legal" id="'+(privacy?'privacy':'imprint')+'"><div id="operator-data"><h2>'+(privacy?'Verantwortliche Stelle':'Anbieterangaben')+'</h2><p>Diese Ansicht dient der Erprobung. Die freigegebenen Anbieter- und Kontaktdaten werden beim Start des Geschäftsbetriebs hier angezeigt.</p></div>'+(privacy?'<h2>Anfrage und Rückmeldung</h2><p>Im Produktivbetrieb verarbeiten wir die von Ihnen übermittelten Angaben, um Ihr Anliegen zu beantworten und auf Ihren Wunsch ein Angebot vorzubereiten. Grundlage sind vorvertragliche Maßnahmen auf Ihre Anfrage (Art. 6 Abs. 1 Buchst. b DSGVO).</p><p>Für ein Angebot erfassen wir Ihre Kontaktdaten, Einsatzadressen, Zugänge, Inventar, gewünschte Arbeiten und den Termin. Während der Eingabe bleiben die Auftragsdetails in diesem Browser-Tab, damit Sie sie vom Rechner in die Anfrage übernehmen können. Sie können den Entwurf im Formular löschen. Nach dem Absenden der vollständigen Anfrage löschen wir den übernommenen Entwurf aus dem Tabspeicher. Für einen kurzen Rückruf genügen Name und Telefonnummer. Ausgefüllte Auftragsdetails können Sie dabei freiwillig mitsenden. Die Eingangsbestätigung im Browserverlauf enthält die Vorgangsnummer und den gewählten Rückmeldeweg. Optional ausgewählte Fotos werden auf Ihrem Gerät für den Versand verkleinert. Bilder, PDFs und Textdateien gehen erst beim Absenden zusammen mit Ihrer Anfrage an den Betrieb und können dem zuständigen Team per E-Mail zugestellt werden. Die Löschung des Vorgangs im Auftragssystem umfasst dort auch seine Dateien. Die offene Beschreibung ist freiwillig. Bitte geben Sie keine Gesundheitsdaten oder Angaben über Dritte ein.</p><h2>Technischer Betrieb</h2><p>Die Website verwendet lokal bereitgestellte Schriften und Bilder. Der Linkparameter für die Anzeigenquelle kann bei der Anfrage als Kanal mitübermittelt werden. Namen oder Kontaktdaten werden dazu nicht an Werbeplattformen übermittelt.</p><h2 id="statistik">Freiwillige Nutzungsstatistik</h2><p>Über „Statistik einschalten“ im Fußbereich können Sie der Auswertung mit Google Analytics 4 (Google Ireland Limited) und unserem Ereignisblatt zustimmen. Wir zählen die gewählte Dienstleistung, angezeigte Preisorientierungen, vorbereitete Anhänge und bestätigte Wechsel zur Telefon-App oder zu WhatsApp. Google Analytics erfasst nach Ihrer Einwilligung, über welchen Button Sie zur Telefon-App oder zu WhatsApp wechseln. Bei Angebots- und Rückrufanfragen zählen wir die erste Eingabe im Formular, fehlgeschlagene Sendeversuche mit allgemeiner Fehlerkategorie sowie den Eingang beim Aufruf der zugehörigen Bestätigung. Eine Kontaktaktion belegt weder ein geführtes Gespräch noch eine versendete Nachricht. Übertragen werden Ereignisart, Dienstleistungs- und Quellenkategorie. Google erhält die allgemeine Seitenrubrik, eine zufällige Kennung für diese Seite und bei zuordenbarer Herkunft das Zugriffsmedium, etwa eine Suchanzeige. Damit ein erneuter Versand desselben Vorgangs nicht doppelt zählt, merkt sich dieser Tab zuletzt gezählte Vorgangsnummern bis zum Ausschalten oder Schließen des Tabs. Für die Statistik können technisch begrenzte Sitzungscookies gesetzt werden. Beim Ausschalten entfernen wir diese Cookies. Formularinhalte, konkrete Preise und Dateinamen gehören nicht zu den Statistikdaten. Beim Verbindungsaufbau sehen die beteiligten Dienste Ihre IP-Adresse. Für das Ereignisblatt speichert Supabase Zeitpunkt, zufällige Ereignisnummer und Kategorien. Diese Angaben erscheinen in unserer internen Google-Tabelle.</p><p>Ihre Entscheidung wird lokal in diesem Browser gespeichert. Sie können sie jederzeit im Fußbereich ändern. Grundlage ist Ihre Einwilligung (Art. 6 Abs. 1 Buchst. a DSGVO). Sie können den gesamten Service auch mit ausgeschalteter Statistik nutzen. Informationen zur Datenverarbeitung und zu möglichen Übermittlungen in die USA finden Sie in der <a href="https://policies.google.com/privacy?hl=de" rel="noreferrer">Datenschutzerklärung von Google</a>.</p><div id="privacy-extra"></div><h2>Ihre Rechte</h2><p>Je nach den gesetzlichen Voraussetzungen können Sie Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen und sich bei einer Datenschutzaufsichtsbehörde beschweren. Wenden Sie sich dafür an die verantwortliche Stelle.</p><p><a href="https://www.lda.bayern.de/de/beschwerde.html">Bayerisches Landesamt für Datenschutzaufsicht</a></p>':'')+'</section>';

