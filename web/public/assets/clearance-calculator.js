import {formatStartingPrice} from './actual-job.js';
import {carryPriceTopic} from './guide-topic.js';

const containerPrices = new Map([
  ['container-2', {size: '2', cents: 30107}],
  ['container-4-5', {size: '4,5', cents: 47005}],
  ['container-7', {size: '7', cents: 64260}]
]);
const helpChoices = new Set(['team', 'none']);
const disposalChoices = new Set(['none', 'individual', ...containerPrices.keys()]);

export function calculateEstimate({help, disposal, containerEligible = false}) {
  const lines = [];
  if (!helpChoices.has(help) || !disposalChoices.has(disposal) || (help === 'none' && disposal === 'none')) {
    return {service: null, lines, totalCents: null, title: 'Ihr Richtpreis', note: 'Wählen Sie die gewünschten Arbeiten oder eine Containergröße.'};
  }
  const teamRequested = help === 'team';
  if (teamRequested) lines.push({label: 'Sortieren und Tragen durch das FrankenPackt-Team · individuelles Angebot', cents: null});

  if (containerPrices.has(disposal)) {
    const {size, cents} = containerPrices.get(disposal);
    lines.push(containerEligible
      ? {label: 'Sperrmüllcontainer '+size+' m³', cents}
      : {label: 'Sperrmüllcontainer '+size+' m³ – Lieferbedingungen noch offen', cents: null});
  } else if (disposal === 'individual') {
    lines.push({label: 'Entsorgung nach Art und Menge · individuelle Einschätzung', cents: null});
  }

  if (teamRequested) {
    return {service: 'entruempelung', lines, totalCents: null, title: 'Ihr persönliches Angebot',
      note: disposal === 'none' ? 'Nach Prüfung von Inventar und Zugang erhalten Sie unser Angebot für die Teamarbeiten.'
        : 'Ihr Angebot für das Sortieren und Tragen richtet sich nach Inventar und Zugang. Einen gewählten Container weisen wir im Rechner separat aus.'};
  }
  const container = containerPrices.has(disposal);
  const note = container ? 'Der Richtwert gilt für den Container. Befüllung und Tragearbeiten sind gesonderte Leistungen.'
    : 'Nennen Sie die Gegenstände, Mengen und den Standort. Nach Prüfung Ihrer Angaben erfahren Sie, welche Arbeiten wir anbieten können.';
  return {service: 'entsorgung', lines, totalCents: lines[0].cents, title: container ? 'Richtpreis für den Container' : 'Ihre Anfrage zur Entsorgung', note};
}

function selectionParams(choice) {
  const params = new URLSearchParams({hilfe: choice.help, entsorgungsweg: choice.disposal});
  if (containerPrices.has(choice.disposal) && choice.containerEligible) params.set('container', 'ja');
  return params;
}

export function inquiryEstimate(params) {
  for (const key of ['hilfe', 'entsorgungsweg', 'asn', 'container', 'leistung']) {
    if (params.getAll(key).length > 1) return null;
  }
  const route = params.get('entsorgungsweg');
  const choice = {help: params.get('hilfe'), disposal: route === 'asn' ? 'individual' : route, containerEligible: params.get('container') === 'ja'};
  const estimate = calculateEstimate(choice);
  if (!estimate.service || estimate.service !== params.get('leistung')) return null;
  const lines = estimate.lines.map(({label,cents}) => cents === null ? label : label+' · '+formatStartingPrice(cents));
  const summary = lines.join('. ')+'.';
  return {service: estimate.service, params: selectionParams(choice), summary};
}

function enableCalculator(form) {
  const output = document.querySelector('#clearance-result');
  const {help, disposal, containerEligible} = form.elements;
  const containerOptions = form.querySelector('[data-container-confirm]');
  const inquiry = output.querySelector('[data-estimate-inquiry]');

  let lastAmount = null;
  function update(notify=false) {
    containerOptions.hidden = containerEligible.disabled = !containerPrices.has(disposal.value);
    if (containerEligible.disabled) containerEligible.checked = false;
    const choice = {help: help.value, disposal: disposal.value,
      containerEligible: !containerEligible.disabled && containerEligible.checked};
    const estimate = calculateEstimate(choice);
    const amount = output.querySelector('[data-estimate-total]');
    amount.hidden = estimate.totalCents === null;
    amount.textContent = estimate.totalCents === null ? '' : formatStartingPrice(estimate.totalCents);
    output.querySelector('[data-estimate-title]').textContent = estimate.title;
    output.querySelector('[data-estimate-note]').textContent = estimate.note;
    output.querySelector('[data-estimate-lines]').replaceChildren(...estimate.lines.map(({label, cents}) => {
      const li = document.createElement('li');
      li.textContent = label + (cents === null ? '' : ' · '+formatStartingPrice(cents));
      return li;
    }));
    const url = new URL(inquiry.href);
    for (const key of ['leistung','hilfe','entsorgungsweg','asn','container']) url.searchParams.delete(key);
    if (estimate.service) {
      url.searchParams.set('leistung', estimate.service);
      for (const [key, value] of selectionParams(choice)) url.searchParams.set(key, value);
    }
    carryPriceTopic(new URL(location.href),url);
    inquiry.setAttribute('href', url.pathname + url.search);
    inquiry.hidden = !estimate.service;
    const displayed = estimate.totalCents === null ? null : estimate.service+'|'+estimate.totalCents;
    if (notify && displayed && displayed !== lastAmount) form.dispatchEvent(new CustomEvent('fp-estimate',{bubbles:true,detail:{service:estimate.service}}));
    lastAmount = displayed;
  }
  form.addEventListener('change',event=>update(event.isTrusted));
  form.addEventListener('submit', event => {
    event.preventDefault();
    update(true);
    output.focus();
  });
  update();
  form.closest('.calc-layout').dataset.ready = 'true';
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#clearance-calculator');
  if (form) enableCalculator(form);
}
