import {formatStartingPrice} from './actual-job.js';

const containerPrices = new Map([
  ['container-2', {size: '2', cents: 30107}],
  ['container-4-5', {size: '4,5', cents: 47005}],
  ['container-7', {size: '7', cents: 64260}]
]);
const helpChoices = new Set(['team', 'none']);
const disposalChoices = new Set(['none', 'asn', 'individual', ...containerPrices.keys()]);
const formatEstimate = cents => cents === 0 ? 'kostenfrei' : formatStartingPrice(cents);

export function calculateEstimate({help, disposal, asnEligible = false, containerEligible = false}) {
  const lines = [];
  if (!helpChoices.has(help) || !disposalChoices.has(disposal) || (help === 'none' && disposal === 'none')) {
    return {service: null, lines, totalCents: null, title: 'Externe Kosten einschätzen', note: 'Wählen Sie einen Entsorgungsweg, um die Anbieterpreise zu sehen.'};
  }
  const teamRequested = help === 'team';
  if (teamRequested) lines.push({label: 'Sortieren und Tragen durch das FrankenPackt-Team · individuelles Angebot', cents: null});

  if (disposal === 'asn') {
    lines.push(asnEligible
      ? {label: 'Städtische Sperrmüllabholung (ASN)', cents: 0}
      : {label: 'Städtische Sperrmüllabholung – Voraussetzungen noch offen', cents: null});
  } else if (containerPrices.has(disposal)) {
    const {size, cents} = containerPrices.get(disposal);
    lines.push(containerEligible
      ? {label: 'Sperrmüllcontainer '+size+' m³ · Schutt Karl', cents}
      : {label: 'Sperrmüllcontainer '+size+' m³ – Lieferbedingungen noch offen', cents: null});
  } else if (disposal === 'individual') {
    lines.push({label: 'Andere Entsorgung – Preis beim Anbieter erfragen', cents: null});
  }

  if (teamRequested) {
    return {service: 'entruempelung', lines, totalCents: null, title: 'Ihr persönliches Angebot',
      note: disposal === 'none' ? 'Nach Prüfung von Inventar und Zugang erhalten Sie unser Angebot für die Teamarbeiten.'
        : 'Für die Teamarbeiten erhalten Sie unser Angebot. Abholung oder Container beauftragen Sie separat beim Entsorger.'};
  }
  let note = 'Die Annahmebedingungen und den Preis klären Sie direkt mit dem Entsorger.';
  if (disposal === 'asn') note = 'Die Abholung beantragen Sie direkt beim ASN. Die Stadt prüft Ihre Anmeldung.';
  if (containerPrices.has(disposal)) note = 'Den Container buchen Sie direkt bei Schutt Karl. Für die Befüllung durch einen Fachbetrieb ist ein separates Angebot erforderlich.';
  return {service: 'entsorgung', lines, totalCents: lines[0].cents, title: 'Kosten beim Entsorger', note};
}

function selectionParams(choice) {
  const params = new URLSearchParams({hilfe: choice.help, entsorgungsweg: choice.disposal});
  if (choice.disposal === 'asn' && choice.asnEligible) params.set('asn', 'ja');
  if (containerPrices.has(choice.disposal) && choice.containerEligible) params.set('container', 'ja');
  return params;
}

export function inquiryEstimate(params) {
  for (const key of ['hilfe', 'entsorgungsweg', 'asn', 'container', 'leistung']) {
    if (params.getAll(key).length > 1) return null;
  }
  const choice = {help: params.get('hilfe'), disposal: params.get('entsorgungsweg'),
    asnEligible: params.get('asn') === 'ja', containerEligible: params.get('container') === 'ja'};
  const estimate = calculateEstimate(choice);
  if (!estimate.service || estimate.service !== params.get('leistung')) return null;
  const lines = estimate.lines.map(({label,cents}) => cents === null ? label : label+' · '+formatEstimate(cents));
  const summary = lines.join('. ')+'.';
  return {service: estimate.service, params: selectionParams(choice), summary};
}

function enableCalculator(form) {
  const output = document.querySelector('#clearance-result');
  const {help, disposal, asnEligible, containerEligible} = form.elements;
  const asnOptions = form.querySelector('[data-asn-confirm]');
  const containerOptions = form.querySelector('[data-container-confirm]');
  const inquiry = output.querySelector('[data-estimate-inquiry]');

  function update() {
    asnOptions.hidden = asnEligible.disabled = disposal.value !== 'asn';
    containerOptions.hidden = containerEligible.disabled = !containerPrices.has(disposal.value);
    if (asnEligible.disabled) asnEligible.checked = false;
    if (containerEligible.disabled) containerEligible.checked = false;
    const choice = {help: help.value, disposal: disposal.value,
      asnEligible: !asnEligible.disabled && asnEligible.checked,
      containerEligible: !containerEligible.disabled && containerEligible.checked};
    const estimate = calculateEstimate(choice);
    const amount = output.querySelector('[data-estimate-total]');
    amount.hidden = estimate.totalCents === null;
    amount.textContent = estimate.totalCents === null ? '' : formatEstimate(estimate.totalCents);
    output.querySelector('[data-estimate-title]').textContent = estimate.title;
    output.querySelector('[data-estimate-note]').textContent = estimate.note;
    output.querySelector('[data-estimate-lines]').replaceChildren(...estimate.lines.map(({label, cents}) => {
      const li = document.createElement('li');
      li.textContent = label + (cents === null ? '' : ' · '+formatEstimate(cents));
      return li;
    }));
    const url = new URL(inquiry.href);
    for (const key of ['leistung','hilfe','entsorgungsweg','asn','container']) url.searchParams.delete(key);
    if (estimate.service) {
      url.searchParams.set('leistung', estimate.service);
      for (const [key, value] of selectionParams(choice)) url.searchParams.set(key, value);
    }
    inquiry.setAttribute('href', url.pathname + url.search);
    inquiry.hidden = !estimate.service;
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', event => {
    event.preventDefault();
    update();
    output.focus();
  });
  update();
  form.closest('.calc-layout').dataset.ready = 'true';
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#clearance-calculator');
  if (form) enableCalculator(form);
}
