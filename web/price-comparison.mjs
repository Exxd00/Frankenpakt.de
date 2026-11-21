import {comparisonTopics,startingPrice} from './public/assets/price-comparison.js';

export function priceComparison(scopeSlot = '') {
  const options = [...comparisonTopics].map(([key,topic]) => `<option value="${key}">${topic.label}</option>`).join('');
  const fallback = [...comparisonTopics.values()].filter(topic => topic.euros != null).map(topic =>
    `<li><strong>${topic.label} · ${startingPrice(topic)} brutto</strong><p>${topic.scope} ${topic.note}</p></li>`).join('');
  return `<section id="preisvergleich" class="wrap price-comparison" aria-labelledby="richtpreis">
    <h2 id="richtpreis">Richtpreis nach Leistung</h2>
    <p>Wählen Sie Ihre Leistung. Sie sehen sofort, welche Kosten Sie für Ihr Vorhaben einplanen können.</p>
    <div class="comparison-layout" hidden>
      <form id="comparison-form">
        <label for="comparison-topic">Was möchten Sie erledigen?</label>
        <select id="comparison-topic" name="topic"><option value="" disabled selected>Bitte Leistung wählen</option>${options}</select>
      </form>
      <div class="comparison-result">
        <div role="status" aria-live="polite" aria-atomic="true">
          <h3 data-comparison-title></h3>
          <p class="comparison-amount" data-comparison-amount></p>
          <p data-comparison-message></p>
          <p class="comparison-note" data-estimate-scope-note></p>
        </div>
        <div class="comparison-actions">
          <a href="#raeumungsrechner" data-scenario-calculator hidden></a>
          <a href="/anfrage/" data-comparison-inquiry>Endpreis anfragen</a>
        </div>
      </div>
    </div>
    ${scopeSlot}
    <noscript><ul class="comparison-static">${fallback}</ul><p>Für andere Leistungen finden Sie die <a href="#raeumungsrechner">Räumungskosten</a> und die <a href="#preisfinder">Umzugspakete</a> auf dieser Seite.</p></noscript>
  </section>`;
}
