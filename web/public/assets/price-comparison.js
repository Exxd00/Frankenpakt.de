export const comparisonTopics = new Map([
  ['sofa', {
    label:'Sofa abholen und entsorgen', service:'entsorgung', startEuros:80,
    reference:'Sofa in Nürnberg, inkl. Tragen und Entsorgung. Richtwert ab 80 € brutto, Stand September 2026.',
    source:'https://entrumpelungnurnberg.de/blog/moebel-entsorgen-nuernberg', sourceLabel:'LV Transporte'
  }],
  ['keller', {
    label:'Kellerabteil bis 6 m² räumen', service:'entruempelung', startEuros:150,
    reference:'Kellerabteil bis 6 m² in Nürnberg, inkl. Entsorgung. Richtwert 150–350 € brutto, Stand September 2026.',
    source:'https://entrumpelungnurnberg.de/kellerentruempelung-nuernberg', sourceLabel:'LV Transporte'
  }],
  ['kleinumzug', {
    label:'Kleiner regionaler Umzug', service:'umzug', startEuros:300,
    reference:'1–2 Zimmer bis 60 m², 10–20 m³, bis 50 km. Richtwert ab 300 € brutto für Laden, Fahren und Entladen. Packmaterial kostet extra.',
    source:'https://www.umzuege-selisch.de/preise-privatumzuege.html', sourceLabel:'Umzüge Selisch'
  }],
  ['entruempelung', {label:'Entrümpelung', service:'entruempelung'}],
  ['entsorgung', {label:'Entsorgung', service:'entsorgung'}],
  ['umzug', {label:'Umzug', service:'umzug'}]
]);
const whole = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0});
const fractional = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'});
const money = cents => (cents % 100 === 0 ? whole : fractional).format(cents / 100);
const maximumCents = 99999999999;

export function parseGrossCents(input) {
  let amount = String(input ?? '').trim().replace(/\s*€$/, '').trim();
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(amount)) amount = amount.replaceAll('.', '');
  const parts = /^(\d{1,9})(?:[,.](\d{1,2}))?$/.exec(amount);
  if (!parts) return null;
  return Number(parts[1]) * 100 + Number((parts[2] || '').padEnd(2,'0'));
}

export function targetCents(grossCents) {
  if (!Number.isSafeInteger(grossCents) || grossCents <= 200 || grossCents > maximumCents) return null;
  return grossCents - 200;
}

export function inquiryComparison(query) {
  const topicKey = query.get('vergleich');
  const topic = comparisonTopics.get(topicKey);
  if (!topic) return null;
  const serviceKey = topic.service === 'umzug' ? 'service' : 'leistung';
  const otherKey = serviceKey === 'service' ? 'leistung' : 'service';
  for (const key of [serviceKey,'vergleich','vergleichcent','vergleichart']) {
    if (query.getAll(key).length !== 1) return null;
  }
  if (query.has(otherKey) || query.get(serviceKey) !== topic.service) return null;
  const raw = query.get('vergleichcent');
  const kind = query.get('vergleichart');
  if (!/^[1-9]\d{0,10}$/.test(raw) || !['ab','gesamt'].includes(kind)) return null;
  const cents = Number(raw);
  const target = targetCents(cents);
  if (target === null) return null;
  const prefix = kind === 'ab' ? 'ab ' : '';
  const params = new URLSearchParams({vergleich:topicKey,vergleichcent:raw,vergleichart:kind});
  let summary = 'Preisvergleich für '+topic.label+'. Fremdpreis '+prefix+money(cents)+' brutto. Unverbindliches Preisziel '+prefix+money(target)+' für denselben Umfang.';
  if (kind === 'ab' && topic.startEuros * 100 === cents) summary += ' Der Vergleichswert entspricht dem veröffentlichten Beispiel von '+topic.sourceLabel+'.';
  if (topic.service !== 'umzug') summary += ' Eine Abfallabholung wird direkt beim Entsorger beauftragt.';
  summary += ' Den Endpreis für unsere Leistungen nennen wir nach Prüfung.';
  return {service:topic.service,params,summary};
}

function enableComparison(form) {
  const section = form.closest('#preisvergleich');
  const layout = section.querySelector('.comparison-layout');
  const result = section.querySelector('.comparison-result');
  const title = result.querySelector('[data-comparison-title]');
  const amount = result.querySelector('[data-comparison-amount]');
  const description = result.querySelector('[data-comparison-message]');
  const inquiry = result.querySelector('[data-comparison-inquiry]');
  const references = form.querySelectorAll('[data-comparison-reference]');
  const {topic, price, kind} = form.elements;
  const preset = new URLSearchParams(location.search).get('vergleich');
  if (comparisonTopics.has(preset)) topic.value = preset;

  function applyTopic() {
    const selected = comparisonTopics.get(topic.value);
    price.value = selected.startEuros === undefined ? '' : String(selected.startEuros);
    kind.value = 'ab';
    for (const reference of references) reference.hidden = reference.dataset.comparisonReference !== topic.value;
  }

  function update() {
    const cents = parseGrossCents(price.value);
    const target = targetCents(cents);
    const chosen = comparisonTopics.get(topic.value);
    const startingPrice = kind.value === 'ab';
    amount.textContent = '';
    inquiry.hidden = true;
    if (target === null || !chosen) {
      title.textContent = 'Ihr Preisziel';
      description.textContent = cents !== null && cents <= 200
        ? 'Bei 2 € oder weniger ergibt ein Abzug von 2 € keinen positiven Zielpreis.'
        : 'Geben Sie einen Bruttopreis in Euro mit höchstens zwei Nachkommastellen ein.';
      price.setAttribute('aria-invalid', String(Boolean(price.value.trim()) && cents === null));
      return;
    }
    price.removeAttribute('aria-invalid');
    title.textContent = 'Ihr unverbindliches Preisziel';
    amount.textContent = (startingPrice ? 'ab ' : '')+money(target);
    description.textContent = 'Vergleichen Sie Anfahrt, Tragewege und Leistungsumfang. Wir prüfen, welchen Teil wir zu welchem Endpreis übernehmen können.'
      +(chosen.service === 'umzug' ? '' : ' Für Abtransport und Entsorgung von Abfällen beauftragen Sie den Entsorger direkt.');
    const url = new URL(inquiry.href);
    for (const key of ['service','leistung','vergleich','vergleichcent','vergleichart']) url.searchParams.delete(key);
    url.searchParams.set(chosen.service === 'umzug' ? 'service' : 'leistung',chosen.service);
    url.searchParams.set('vergleich',topic.value);
    url.searchParams.set('vergleichcent', String(cents));
    url.searchParams.set('vergleichart',kind.value);
    inquiry.setAttribute('href', url.pathname+url.search);
    inquiry.hidden = false;
  }
  price.addEventListener('input', update);
  topic.addEventListener('change', applyTopic);
  form.addEventListener('change', update);
  form.addEventListener('submit', event => { event.preventDefault(); update(); result.focus(); });
  applyTopic();
  update();
  layout.hidden = false;
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#comparison-form');
  if (form) enableComparison(form);
}
