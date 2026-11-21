export function clearanceCalculator(scopeSlot = '') {
  return `<section id="raeumungsrechner" class="wrap clearance-estimator" aria-labelledby="clearance-calc-heading">
    <h2 id="clearance-calc-heading">Räumungskosten berechnen</h2>
    <p class="calc-intro">Wählen Sie Tragehilfe und Entsorgungsweg. Sie sehen Ihren Richtpreis direkt und ohne Kontaktdaten.</p>
    <div class="calc-layout">
      <form id="clearance-calculator" class="calc-inputs">
        <div class="calc-fields">
          <div><label for="calc-help">Welche Hilfe brauchen Sie?</label>
            <select id="calc-help" name="help">
              <option value="none">Keine Tragehilfe</option>
              <option value="one-helper">3 Std. · 1 Tragehelfer</option>
              <option value="individual">Sortieren oder mehr Hilfe</option>
            </select>
          </div>
          <div><label for="calc-disposal">Wie entsorgen Sie?</label>
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
          <label><input type="checkbox" name="containerEligible" disabled><span>Ich habe Platz auf Privatgrund, fülle selbst zugelassenen Sperrmüll ein und brauche höchstens fünf Wochentage Mietzeit.</span></label>
        </div>
        <button id="clearance-calc-submit" class="button" type="submit">Richtpreis berechnen</button>
      </form>
      <div id="clearance-result" class="calc-result" tabindex="-1">
        <div role="status" aria-live="polite" aria-atomic="true">
          <h3 data-estimate-title>Ihr Richtpreis</h3>
          <p data-estimate-total class="calc-total"></p>
          <ul data-estimate-lines class="calc-lines"></ul>
          <p data-estimate-note>Wählen Sie die gewünschte Hilfe oder einen Entsorgungsweg.</p>
        </div>
        <a data-estimate-inquiry href="/anfrage/?leistung=entruempelung">Vorhaben anfragen</a>
      </div>
    </div>
    ${scopeSlot}
    <details class="calc-sources">
      <summary>Preise und Bedingungen nachlesen</summary>
      <p><strong>Tragehilfe</strong> · ab 161 € inklusive 19 % MwSt. für eine Person und drei Stunden vor Ort zum Tragen von Hausrat, den Sie weiterverwenden. Hin- und Rückfahrt des Helfers sind bis zusammen 30 Minuten enthalten. Ein gegebenenfalls benötigtes Fahrzeug stellen Sie.</p>
      <p><strong>Städtische Abholung</strong> · Für berechtigte Nürnberger Privathaushalte einmal pro Kalenderjahr kostenfrei. Sie melden Ihre Gegenstände vorab selbst an. <a href="https://www.nuernberg.de/internet/abfallwirtschaft/sperrmuell.html">Bedingungen der Stadt Nürnberg</a></p>
      <p><strong>Sperrmüllcontainer von Schutt Karl</strong> · 2 m³ ab 301,07 €, 4,5 m³ ab 470,05 €, 7 m³ ab 642,60 €. Diese Richtwerte enthalten 19 % MwSt., Lieferung auf Privatgrund, fünf mietfreie Wochentage, Abholung und Entsorgung. Sie befüllen den Container und klären Lieferadresse, Termin und Tagespreis direkt mit dem Anbieter. <a href="https://www.schuttkarl.de/wp-content/uploads/2026/01/Schutt-Karl-Preisliste-Neulinge-2026.pdf">Preisliste vom 1. Januar 2026 (PDF)</a></p>
    </details>
    <noscript><p>Öffnen Sie „Preise und Bedingungen nachlesen“ für die Einzelpreise. Für eine persönliche Einschätzung können Sie einen <a href="/anfrage/?kontakt=telefon&amp;leistung=entruempelung">Rückruf vorbereiten</a>.</p></noscript>
  </section>`;
}
