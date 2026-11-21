import {scenarioPrices} from './richtpreise.js';

const disposalNote = 'Abholung und Entsorgung buchen Sie direkt beim Entsorger. Er nennt Ihnen seinen Endpreis.';

export const comparisonTopics = new Map([
  ['sofa', {
    label:'Ein Sofa entsorgen', service:'entsorgung', euros:scenarioPrices.sofa,
    scope:'Regionaler Planungswert für das Heraustragen und die Entsorgung eines einzelnen Sofas in Nürnberg.',
    note:disposalNote
  }],
  ['keller', {
    label:'Kellerabteil bis 6 m² räumen', service:'entruempelung', euros:scenarioPrices.keller,
    scope:'Regionaler Planungswert für die Räumung eines Kellerabteils bis 6 m² in Nürnberg einschließlich Entsorgung.',
    note:'Eine Abfallabholung buchen Sie direkt beim Entsorger. Für vereinbarte Arbeiten vor Ort erhalten Sie von uns ein eigenes Angebot.'
  }],
  ['kleinumzug', {
    label:'Kleine Wohnung regional umziehen', service:'umzug', euros:scenarioPrices.kleinumzug,
    scope:'Für 1–2 Zimmer bis 60 m², 10–20 m³ Umzugsgut und bis zu 50 km. Laden, Fahrt und Entladen sind berücksichtigt. Packmaterial kommt bei Bedarf hinzu.',
    note:'Den Endpreis nennen wir Ihnen nach Prüfung der Adressen, des Umzugsguts und der Zugänge.'
  }],
  ['entruempelung', {
    label:'Andere Räume entrümpeln', service:'entruempelung',
    scope:'Der Aufwand hängt von der Füllmenge und den Tragewegen ab. Im Räumungsrechner wählen Sie die benötigte Hilfe und bei Bedarf einen Entsorgungsweg.',
    route:'#raeumungsrechner', action:'Räumungskosten berechnen'
  }],
  ['entsorgung', {
    label:'Andere Gegenstände entsorgen', service:'entsorgung',
    scope:'Der Entsorgungsweg richtet sich nach Material und Menge. Im Rechner sehen Sie die Bedingungen und Preise für die städtische Sperrmüllabholung und verschiedene Containergrößen.',
    route:'#raeumungsrechner', action:'Abholung oder Container einschätzen'
  }],
  ['umzug', {
    label:'Anderen Umzug planen', service:'umzug',
    scope:'Wählen Sie im Umzugsrechner das passende Paket und prüfen Sie den Leistungsumfang. Für andere Mengen oder Strecken erhalten Sie ein individuelles Angebot.',
    route:'#preisfinder', action:'Umzugspaket berechnen'
  }]
]);

export function startingPrice(topic) {
  if (topic.euros == null) return '';
  const fractionDigits = Number.isInteger(topic.euros) ? 0 : 2;
  return 'ab '+topic.euros.toLocaleString('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:fractionDigits,maximumFractionDigits:fractionDigits});
}

function queryScenario(query) {
  const canonical = query.getAll('vorhaben');
  const legacy = query.getAll('vergleich');
  if (canonical.length > 1 || legacy.length > 1 || (canonical.length && legacy.length && canonical[0] !== legacy[0])) return null;
  const key = canonical[0] ?? legacy[0];
  return comparisonTopics.has(key) ? key : null;
}

function serviceParam(topic) {
  return topic.service === 'umzug' ? 'service' : 'leistung';
}

export function inquiryComparison(query) {
  const key = queryScenario(query);
  if (!key) return null;
  const topic = comparisonTopics.get(key);
  const param = serviceParam(topic);
  if (query.getAll(param).length !== 1 || query.get(param) !== topic.service || query.has(param === 'service' ? 'leistung' : 'service')) return null;
  const estimate = startingPrice(topic);
  const summary = estimate
    ? [topic.label+'.', 'Unverbindlicher Richtwert '+estimate+' brutto.', topic.scope, topic.note].join(' ')
    : topic.label+'. Individuelles Angebot nach Prüfung der Auftragsdetails.';
  return {service:topic.service, params:new URLSearchParams({vorhaben:key}), estimatedCents:topic.euros == null ? null : Math.round(topic.euros*100), summary};
}

function enableEstimate(form) {
  const section = form.closest('#preisvergleich');
  const result = section.querySelector('.comparison-result');
  const title = result.querySelector('[data-comparison-title]');
  const amount = result.querySelector('[data-comparison-amount]');
  const scope = result.querySelector('[data-comparison-message]');
  const note = result.querySelector('[data-estimate-scope-note]');
  const nextCalculator = result.querySelector('[data-scenario-calculator]');
  const inquiry = result.querySelector('[data-comparison-inquiry]');
  const details = section.querySelector('[data-calc-scope]');
  const select = form.elements.topic;
  const query = new URLSearchParams(location.search);
  const preset = queryScenario(query);
  if (preset) select.value = preset;
  else {
    const service = query.get('leistung') || query.get('service');
    if (['entruempelung','entsorgung','umzug'].includes(service)) select.value = service;
  }

  function update() {
    const topic = comparisonTopics.get(select.value);
    result.hidden = !topic;
    inquiry.hidden = !topic;
    if (details) details.hidden = !topic;
    if (!topic) return;
    const estimate = startingPrice(topic);
    title.textContent = estimate ? 'Unverbindlicher Richtwert inkl. MwSt.' : 'Kosten für Ihr Vorhaben';
    amount.textContent = estimate;
    amount.hidden = !estimate;
    scope.textContent = topic.scope;
    note.textContent = topic.note || '';
    note.hidden = !topic.note;
    nextCalculator.hidden = !topic.route;
    if (topic.route) {
      nextCalculator.setAttribute('href', topic.route);
      nextCalculator.textContent = topic.action;
    }
    const tracking = new URL(inquiry.href).searchParams;
    const params = new URLSearchParams({[serviceParam(topic)]:topic.service, vorhaben:select.value});
    for (const name of ['src','anzeige','schrift']) {
      if (tracking.has(name)) params.set(name,tracking.get(name));
    }
    inquiry.setAttribute('href','/anfrage/?'+params);
    inquiry.textContent = estimate ? 'Endpreis anfragen' : 'Individuelles Angebot anfragen';
  }
  select.addEventListener('change', update);
  form.addEventListener('submit', event => event.preventDefault());
  update();
  section.querySelector('.comparison-layout').hidden = false;
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#comparison-form');
  if (form) enableEstimate(form);
}
