export function inquiry(crumb, ic) {
  const details = '<p>Für einen Rückruf genügen Ihr Name und Ihre Telefonnummer. Auf Wunsch kann eine Vertrauensperson die Anfrage übernehmen.</p>';
  const agreement = '<p>Sie erhalten ein persönliches Angebot mit den einzelnen Arbeiten und dem Preis. Wenn Sie es annehmen, vereinbaren wir den Termin mit Ihnen.</p>';
  const livePhone = '<p data-live-phone hidden></p>';
  return `<section class="subhead inquiry-heading"><div class="wrap narrowhero">
    ${crumb('Anfrage')}<h1 id="inquiry-title">Wobei brauchen<br><em>Sie Hilfe?</em></h1>
    <p class="lead" id="inquiry-lead">Wählen Sie Ihre Leistung. Anhand Ihrer Angaben zu Inventar, Zugang und Termin erstellen wir Ihr persönliches Angebot.</p>
    <a class="inquiry-switch" id="inquiry-switch" href="/anfrage/?kontakt=telefon">Nur einen Rückruf anfragen</a>
  </div></section>
  <section class="wrap section form-layout"><div>
    <div id="form-mode" class="note compact" role="status">Vorschau: Bitte verwenden Sie nur Beispieldaten. Ihre Angaben bleiben in diesem Browser.</div>
    <noscript><p>Das Onlineformular benötigt JavaScript. Unsere Kontaktangaben finden Sie im <a href="/impressum/">Impressum</a>.</p></noscript>
    <form id="lead-form" method="post" action="/api/leads" class="lead-form" autocomplete="off" novalidate>
      <fieldset id="project-fields"><legend>Ihr Vorhaben</legend>
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
          <label for="job-files">Dateien auswählen</label>
          <input id="job-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif,.pdf,.txt" aria-describedby="job-file-hint">
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
        <div id="phone-field"><label for="phone">Ihre Telefonnummer <span>*</span></label><input name="phone" id="phone" type="tel" required minlength="6" maxlength="40" autocomplete="tel"></div>
        <div id="email-field" hidden><label for="email">Ihre E-Mail-Adresse <span>*</span></label><input name="email" id="email" type="email" maxlength="200" autocomplete="email"></div>
        <div id="callback-window" hidden><label for="callback-time">Wann erreichen wir Sie gut? (optional)</label>
          <input name="callbackTime" id="callback-time" maxlength="80" placeholder="Zum Beispiel werktags ab 14 Uhr" disabled>
        </div>
        <div class="honeypot" aria-hidden="true"><label for="website">Website</label><input name="website" id="website" tabindex="-1" autocomplete="off"></div>
      </fieldset>
      <p class="fine">Mit * markierte Angaben werden benötigt. Ihre Kontaktdaten dienen der Bearbeitung Ihrer Anfrage. Hinweise dazu im <a href="/datenschutz/">Datenschutz</a>.</p>
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

export const legal=(crumb,privacy)=>'<div class="subhead"><div class="wrap narrowhero">'+crumb(privacy?'Datenschutz':'Impressum')+'<h1>'+(privacy?'Datenschutz':'Impressum')+'</h1></div></div><section class="wrap section legal" id="'+(privacy?'privacy':'imprint')+'"><div id="operator-data"><h2>'+(privacy?'Verantwortliche Stelle':'Anbieterangaben')+'</h2><p>Diese Ansicht dient der Erprobung. Die freigegebenen Anbieter- und Kontaktdaten werden beim Start des Geschäftsbetriebs hier angezeigt.</p></div>'+(privacy?'<h2>Anfrage und Rückmeldung</h2><p>Im Produktivbetrieb verarbeiten wir die von Ihnen übermittelten Angaben, um Ihr Anliegen zu beantworten und auf Ihren Wunsch ein Angebot vorzubereiten. Grundlage sind vorvertragliche Maßnahmen auf Ihre Anfrage (Art. 6 Abs. 1 Buchst. b DSGVO).</p><p>Für ein Angebot erfassen wir Ihre Kontaktdaten, Einsatzadressen, Zugänge, Inventar, gewünschte Arbeiten und den Termin. Während der Eingabe bleiben die Auftragsdetails in diesem Browser-Tab, damit Sie sie vom Rechner in die Anfrage übernehmen können. Sie können den Entwurf im Formular löschen. Nach dem Absenden der vollständigen Anfrage löschen wir den übernommenen Entwurf aus dem Tabspeicher. Für einen kurzen Rückruf genügen Name und Telefonnummer. Ausgefüllte Auftragsdetails können Sie dabei freiwillig mitsenden. Die Eingangsbestätigung im Browserverlauf enthält die Vorgangsnummer und den gewählten Rückmeldeweg. Optional ausgewählte Fotos werden auf Ihrem Gerät für den Versand verkleinert. Bilder, PDFs und Textdateien gehen erst beim Absenden zusammen mit Ihrer Anfrage an den Betrieb und können dem zuständigen Team per E-Mail zugestellt werden. Die Löschung des Vorgangs im Auftragssystem umfasst dort auch seine Dateien. Die offene Beschreibung ist freiwillig. Bitte geben Sie keine Gesundheitsdaten oder Angaben über Dritte ein.</p><h2>Technischer Betrieb</h2><p>Die Website verwendet lokal bereitgestellte Schriften und Bilder. Der Linkparameter für die Anzeigenquelle kann bei der Anfrage als Kanal mitübermittelt werden. Namen oder Kontaktdaten werden dazu nicht an Werbeplattformen übermittelt.</p><h2 id="statistik">Freiwillige Nutzungsstatistik</h2><p>Über „Statistik einschalten“ im Fußbereich können Sie der Auswertung mit Google Analytics 4 (Google Ireland Limited) und unserem Ereignisblatt zustimmen. Wir zählen die gewählte Dienstleistung, angezeigte Preisorientierungen, vorbereitete Anhänge und bestätigte Wechsel zur Telefon-App oder zu WhatsApp. Google Analytics erfasst nach Ihrer Einwilligung außerdem den Kanal des Kontaktklicks und den Eingang einer Angebots- oder Rückrufanfrage beim Aufruf der zugehörigen Bestätigung. Eine Kontaktaktion belegt weder ein geführtes Gespräch noch eine versendete Nachricht. Übertragen werden Ereignisart, Dienstleistungs- und Quellenkategorie. Google erhält zusätzlich die allgemeine Seitenrubrik und eine zufällige Kennung für diese Seite. Für die Statistik können technisch begrenzte Sitzungscookies gesetzt werden. Beim Ausschalten entfernen wir diese Cookies. Formularinhalte, konkrete Preise und Dateinamen gehören nicht zu den Statistikdaten. Beim Verbindungsaufbau sehen die beteiligten Dienste Ihre IP-Adresse. Für das Ereignisblatt speichert Supabase Zeitpunkt, zufällige Ereignisnummer und Kategorien. Diese Angaben erscheinen in unserer internen Google-Tabelle.</p><p>Ihre Entscheidung wird lokal in diesem Browser gespeichert. Sie können sie jederzeit im Fußbereich ändern. Grundlage ist Ihre Einwilligung (Art. 6 Abs. 1 Buchst. a DSGVO). Sie können den gesamten Service auch mit ausgeschalteter Statistik nutzen. Informationen zur Datenverarbeitung und zu möglichen Übermittlungen in die USA finden Sie in der <a href="https://policies.google.com/privacy?hl=de" rel="noreferrer">Datenschutzerklärung von Google</a>.</p><div id="privacy-extra"></div><h2>Ihre Rechte</h2><p>Je nach den gesetzlichen Voraussetzungen können Sie Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen und sich bei einer Datenschutzaufsichtsbehörde beschweren. Wenden Sie sich dafür an die verantwortliche Stelle.</p><p><a href="https://www.lda.bayern.de/de/beschwerde.html">Bayerisches Landesamt für Datenschutzaufsicht</a></p>':'')+'</section>';

