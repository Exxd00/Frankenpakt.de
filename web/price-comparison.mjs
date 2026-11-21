import {comparisonTopics} from './public/assets/price-comparison.js';

export function priceComparison() {
  const options = [...comparisonTopics].map(([key,topic]) => `<option value="${key}">${topic.label}</option>`).join('');
  const references = [...comparisonTopics].filter(([,topic]) => topic.source).map(([key,topic]) =>
    `<p class="comparison-reference" data-comparison-reference="${key}" hidden>Preisbeispiel: ${topic.reference} <a href="${topic.source}">Quelle: ${topic.sourceLabel}</a></p>`).join('');
  return `<section id="preisvergleich" class="wrap price-comparison" aria-labelledby="comparison-heading">
    <h2 id="comparison-heading">Welchen Preis möchten Sie erreichen?</h2>
    <p>Wählen Sie ein Nürnberger Preisbeispiel oder geben Sie den Bruttopreis eines anderen Anbieters ein. Der Rechner zieht für denselben Leistungsumfang 2 € ab.</p>
    <div class="comparison-layout" hidden>
      <form id="comparison-form" novalidate>
        <label for="comparison-topic">Welche Leistung vergleichen Sie?</label>
        <select id="comparison-topic" name="topic">${options}</select>
        ${references}
        <div class="comparison-fields">
          <div><label for="comparison-price">Fremdpreis inkl. MwSt. (€)</label>
            <input type="text" inputmode="decimal" id="comparison-price" name="price" maxlength="24" autocomplete="off" placeholder="z. B. 80,00" value="80"></div>
          <div><label for="comparison-kind">Art des Preises</label>
            <select id="comparison-kind" name="kind"><option value="ab">Ab-Preis</option><option value="gesamt">Gesamtpreis</option></select></div>
        </div>
        <button type="submit" class="button">Preisziel berechnen</button>
      </form>
      <div class="comparison-result" tabindex="-1">
        <div aria-live="polite" aria-atomic="true" role="status"><h3 data-comparison-title>Ihr Preisziel</h3>
          <p class="comparison-amount" data-comparison-amount></p><p data-comparison-message></p></div>
        <a href="/anfrage/?leistung=entsorgung" data-comparison-inquiry hidden>Endpreis anfragen</a>
      </div>
    </div>
    <noscript><p>Für einen Vergleich ziehen Sie 2 € vom Bruttopreis für die gleiche Leistung ab. Den konkreten Leistungsumfang und unseren Angebotspreis klären Sie über die <a href="/anfrage/">Anfrage</a>. Eine Abfallabholung beauftragen Sie direkt beim Entsorger.</p></noscript>
  </section>`;
}
