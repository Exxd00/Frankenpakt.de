export function inquiry(crumb, ic) {
  const details = '<p>Für einen Rückruf genügen Ihr Name und Ihre Telefonnummer. Auf Wunsch kann eine Vertrauensperson die Anfrage übernehmen.</p>';
  const agreement = '<p>Preis, Leistungen und Termin vereinbaren wir mit Ihnen persönlich.</p>';
  const livePhone = '<p data-live-phone hidden></p>';
  return `<section class="subhead inquiry-heading"><div class="wrap narrowhero">
    ${crumb('Anfrage')}<h1 id="inquiry-title">Erzählen Sie uns<br><em>von Ihrem Umzug.</em></h1>
    <p class="lead" id="inquiry-lead">Für eine erste Einschätzung genügen die wichtigsten Eckdaten. Sie können telefonisch oder per E-Mail um Antwort bitten.</p>
    <a class="inquiry-switch" id="inquiry-switch" href="/anfrage/?kontakt=telefon">Nur einen Rückruf anfragen</a>
  </div></section>
  <section class="wrap section form-layout"><div>
    <div id="form-mode" class="note compact" role="status">Vorschau: Bitte verwenden Sie nur Beispieldaten. Ihre Angaben bleiben in diesem Browser.</div>
    <noscript><p>Das Onlineformular benötigt JavaScript. Unsere Kontaktangaben finden Sie im <a href="/impressum/">Impressum</a>.</p></noscript>
    <form id="lead-form" method="post" action="/api/leads" class="lead-form" autocomplete="off">
      <fieldset id="project-fields"><legend>Ihr Vorhaben</legend>
        <div class="fields">
          <div><label for="service">Welche Hilfe wünschen Sie? <span>*</span></label>
            <select id="service" name="service" required>
              <option value="umzug">Privatumzug</option><option value="seniorenumzug">Seniorenumzug</option>
              <option value="moebeltaxi">Möbeltaxi</option><option value="transport">Transportanteil bei Wohnungsauflösung</option>
            </select></div>
          <div><label for="timeframe">Wunschzeitraum</label><input id="timeframe" name="timeframe" maxlength="80" placeholder="Zum Beispiel Anfang Dezember"></div>
          <div><label for="zipFrom">Start-PLZ <span>*</span></label><input id="zipFrom" name="zipFrom" type="text" pattern="[0-9]{5}" inputmode="numeric" maxlength="5" required placeholder="90453"></div>
          <div><label for="zipTo">Ziel-PLZ</label><input id="zipTo" name="zipTo" type="text" pattern="[0-9]{5}" inputmode="numeric" maxlength="5" placeholder="Falls bekannt"></div>
        </div>
        <label for="details">Was soll mitkommen?</label>
        <textarea name="details" id="details" rows="4" maxlength="1400" placeholder="Zum Beispiel 15 Kartons, ein Sofa und zwei Tische. Start im 1. Stock, am Ziel gibt es einen Aufzug."></textarea>
      </fieldset>
      <fieldset><legend>So erreichen wir Sie</legend>
        <p id="callback-context" class="fine" hidden></p>
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
      <button class="button js-only" type="submit" id="send-lead">Musteranfrage prüfen</button>
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

export const legal=(crumb,privacy)=>'<div class="subhead"><div class="wrap narrowhero">'+crumb(privacy?'Datenschutz':'Impressum')+'<h1>'+(privacy?'Datenschutz':'Impressum')+'</h1></div></div><section class="wrap section legal" id="'+(privacy?'privacy':'imprint')+'"><div id="operator-data"><h2>'+(privacy?'Verantwortliche Stelle':'Anbieterangaben')+'</h2><p>Diese Ansicht dient der Erprobung. Die freigegebenen Anbieter- und Kontaktdaten werden beim Start des Geschäftsbetriebs hier angezeigt.</p></div>'+(privacy?'<h2>Anfrage und Rückmeldung</h2><p>Im Produktivbetrieb verarbeiten wir die von Ihnen übermittelten Angaben, um Ihr Anliegen zu beantworten und auf Ihren Wunsch ein Angebot vorzubereiten. Grundlage sind vorvertragliche Maßnahmen auf Ihre Anfrage (Art. 6 Abs. 1 Buchst. b DSGVO).</p><p>Bei der Anfrage werden Name, gewünschter Kontaktweg und Angaben zum Auftrag erfasst. Für den kurzen Rückrufwunsch genügen Name und Telefonnummer. Die Eingangsbestätigung im Browserverlauf enthält die Vorgangsnummer und den gewählten Rückmeldeweg. Die offene Beschreibung ist freiwillig. Bitte geben Sie keine Gesundheitsdaten oder Angaben über Dritte ein.</p><h2>Technischer Betrieb</h2><p>Die Website verwendet lokal bereitgestellte Schriften und Bilder. Der Linkparameter für die Anzeigenquelle kann bei der Anfrage als Kanal mitübermittelt werden. Namen oder Kontaktdaten werden dazu nicht an Werbeplattformen übermittelt.</p><div id="privacy-extra"></div><h2>Ihre Rechte</h2><p>Je nach den gesetzlichen Voraussetzungen können Sie Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen und sich bei einer Datenschutzaufsichtsbehörde beschweren. Wenden Sie sich dafür an die verantwortliche Stelle.</p><p><a href="https://www.lda.bayern.de/de/beschwerde.html">Bayerisches Landesamt für Datenschutzaufsicht</a></p>':'')+'</section>';

