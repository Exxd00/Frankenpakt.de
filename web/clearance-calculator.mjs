export function clearanceCalculator(scopeSlot = '') {
  return `<section id="raeumungsrechner" class="wrap clearance-estimator" aria-labelledby="clearance-calc-heading">
    <h2 id="clearance-calc-heading">Räumungskosten berechnen</h2>
    <p class="calc-intro">Unser Team übernimmt das vereinbarte Sortieren und Tragen von Hausrat zur Weiternutzung. Hier können Sie die Arbeiten anfragen und externe Abhol- oder Containerkosten einschätzen.</p>
    <div class="calc-layout">
      <form id="clearance-calculator" class="calc-inputs">
        <div class="calc-fields">
          <div><label for="calc-help">Was möchten Sie anfragen?</label>
            <select id="calc-help" name="help">
              <option value="team">Räumung durch das FrankenPackt-Team</option>
              <option value="none">Nur externe Abhol- und Containerpreise ansehen</option>
            </select>
          </div>
          <div><label for="calc-disposal">Welcher Entsorgungsweg kommt infrage?</label>
            <select id="calc-disposal" name="disposal">
              <option value="none">Keine Entsorgung</option>
              <option value="asn">Stadt · Sperrmüll</option>
              <optgroup label="Sperrmüllcontainer von Schutt Karl">
                <option value="container-2">2 m³ Container</option>
                <option value="container-4-5">4,5 m³ Container</option>
                <option value="container-7">7 m³ Container</option>
              </optgroup>
              <option value="individual">Andere Abfälle oder Stellplatz unklar</option>
            </select>
          </div>
        </div>
        <div class="calc-conditions" data-asn-confirm hidden>
          <p>Der Abfallwirtschaftsbetrieb Stadt Nürnberg (ASN) holt angemeldeten, zugelassenen Sperrmüll ebenerdig auf Ihrem Grundstück ab.</p>
          <label><input type="checkbox" name="asnEligible" disabled><span>Die Bedingungen treffen zu. Mein Nürnberger Privathaushalt hat die kostenlose Abholung dieses Kalenderjahr noch frei.</span></label>
        </div>
        <div class="calc-conditions" data-container-confirm hidden>
          <p>Wie groß ist der Stapel? Länge × Breite × Höhe in Metern ergibt das ungefähre Volumen. Bei 2 × 1 × 1 Metern sind es etwa 2 m³.</p>
          <label><input type="checkbox" name="containerEligible" disabled><span>Der Container steht auf Privatgrund. Es geht um zugelassenen Sperrmüll und höchstens fünf Wochentage Mietzeit.</span></label>
        </div>
        <button id="clearance-calc-submit" class="button" type="submit">Richtpreis berechnen</button>
      </form>
      <div id="clearance-result" class="calc-result" tabindex="-1">
        <div role="status" aria-live="polite" aria-atomic="true">
          <h3 data-estimate-title>Ihr Richtpreis</h3>
          <p data-estimate-total class="calc-total"></p>
          <ul data-estimate-lines class="calc-lines"></ul>
          <p data-estimate-note>Für die Teamarbeiten erhalten Sie nach Prüfung Ihrer Angaben ein persönliches Angebot.</p>
        </div>
        <a data-estimate-inquiry href="/anfrage/?leistung=entruempelung">Vorhaben anfragen</a>
      </div>
    </div>
    ${scopeSlot}
    <details class="calc-sources">
      <summary>Preise und Bedingungen nachlesen</summary>
      <p><strong>Räumung durch unser Team</strong> · Den Aufwand für das Sortieren und Tragen von Hausrat zur Weiternutzung berechnen wir anhand von Inventar, Etage, Aufzug und Trageweg.</p>
      <p><strong>Städtische Abholung</strong> · Für berechtigte Nürnberger Privathaushalte einmal pro Kalenderjahr kostenfrei. Sie melden Ihre Gegenstände vorab selbst an. <a href="https://www.nuernberg.de/internet/abfallwirtschaft/sperrmuell.html">Bedingungen der Stadt Nürnberg</a></p>
      <p><strong>Sperrmüllcontainer von Schutt Karl</strong> · 2 m³ ab 301,07 €, 4,5 m³ ab 470,05 €, 7 m³ ab 642,60 €. Diese Richtwerte enthalten 19 % MwSt., Lieferung auf Privatgrund, fünf mietfreie Wochentage, Abholung und Entsorgung. Für die Befüllung durch einen Fachbetrieb ist ein separates Angebot erforderlich. Lieferadresse, Termin und Tagespreis klären Sie direkt mit Schutt Karl. <a href="https://www.schuttkarl.de/wp-content/uploads/2026/01/Schutt-Karl-Preisliste-Neulinge-2026.pdf">Preisliste vom 1. Januar 2026 (PDF)</a></p>
    </details>
    <noscript><p>Öffnen Sie „Preise und Bedingungen nachlesen“ für die Einzelpreise. Für eine persönliche Einschätzung können Sie einen <a href="/anfrage/?kontakt=telefon&amp;leistung=entruempelung">Rückruf vorbereiten</a>.</p></noscript>
  </section>`;
}
