'use strict';

document.documentElement.classList.add('js');
const params = new URLSearchParams(location.search);
const channels = new Set(['google', 'kleinanzeigen', 'empfehlung', 'direkt', 'sonstige']);
const rawSource = (params.get('src') || params.get('utm_source') || '').toLowerCase();
const source = channels.has(rawSource) ? rawSource : 'unbekannt';
const adLabels = new Set(['privatumzug-team','seniorenumzug-team','entruempelung-nuernberg','entsorgung-nuernberg']);
const rawLabel = params.get('anzeige');
const adVariant = params.getAll('src').length === 1 && params.get('src') === 'google' &&
  params.getAll('anzeige').length === 1 && adLabels.has(rawLabel) ? rawLabel : null;
let largeType = params.get('schrift') === 'gross';
const clearance = {
  entruempelung: {
    title: 'Entrümpelung planen', path: '/raeumung/',
    scope: 'Beschreiben Sie die Räume und welche Gegenstände weiterverwendet werden. Für diesen Hausrat können wir einen Transport prüfen. Für Abfälle beauftragen Sie den Entsorger direkt.',
    example: 'Zum Beispiel ein Kellerabteil und ein Schrank. Der Schrank soll zu meiner Tochter, für den Rest brauche ich einen Entsorgungsweg.'
  },
  entsorgung: {
    title: 'Entsorgungsweg klären', path: '/entsorgung/',
    scope: 'Wir können Hinweise zum Entsorgungsweg geben. Abholung und Preis vereinbaren Sie direkt mit der zuständigen Stelle oder einem Fachbetrieb.',
    example: 'Zum Beispiel eine Matratze und drei leere Regale in Nürnberg. Ich möchte wissen, wohin ich sie geben kann.'
  }
};
const projectServices = new Set(['umzug','seniorenumzug','moebeltaxi','transport',...Object.keys(clearance)]);
const pageInterest = projectServices.has(params.get('leistung')) ? params.get('leistung') : params.get('service');
const packageLabels = {
  taxi: 'Möbeltaxi', drei: 'Umzugsteam · 3 Stunden',
  kompakt: 'Kompaktumzug', sieben: 'Umzugsteam · 7 Stunden'
};
const priceContextKeys = ['hilfe','entsorgungsweg','asn','container','vergleich','vergleichcent','vergleichart'];

function serviceForPackage(pack, interest) {
  if (pack === 'taxi') return 'moebeltaxi';
  if (Object.hasOwn(packageLabels,pack) && (interest === 'moebeltaxi' || Object.hasOwn(clearance,interest))) return 'umzug';
  return projectServices.has(interest) ? interest : 'umzug';
}

function writeInterest(url, interest, pack, units) {
  for (const key of ['service','leistung','paket','zusatz']) url.searchParams.delete(key);
  if (projectServices.has(interest)) url.searchParams.set(Object.hasOwn(clearance,interest) ? 'leistung' : 'service',interest);
  if (Object.hasOwn(packageLabels,pack)) url.searchParams.set('paket',pack);
  if (['drei','sieben'].includes(pack) && /^[1-4]$/.test(units)) url.searchParams.set('zusatz',units);
}

function updateProjectLinks(interest,pack,units,writeContext) {
  const selector = '.head-cta, .mast a[href^="/preise/"], .footlinks a[href^="/preise/"], .endcta a.button, .endcta [data-contact="callback"], .footer-main [data-contact="callback"], [data-handoff-callback]';
  for (const link of document.querySelectorAll(selector)) {
    const url = new URL(link.getAttribute('href'), location.href);
    writeInterest(url,interest,pack,units);
    if (url.pathname === '/anfrage/') {
      for (const key of priceContextKeys) url.searchParams.delete(key);
      if (writeContext) writeContext(url);
    }
    link.setAttribute('href',url.pathname + url.search + url.hash);
    updateLink(link);
  }
}

function node(tag, value, className) {
  const el = document.createElement(tag);
  if (value) el.textContent = value;
  if (className) el.className = className;
  return el;
}

function updateLink(anchor) {
  const href = anchor.getAttribute('href');
  if (!href || !href.startsWith('/')) return;
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;
  if (source !== 'unbekannt') url.searchParams.set('src', source);
  if (adVariant) url.searchParams.set('anzeige',adVariant);
  else url.searchParams.delete('anzeige');
  if (largeType) url.searchParams.set('schrift', 'gross');
  else url.searchParams.delete('schrift');
  anchor.setAttribute('href', url.pathname + url.search + url.hash);
}

function applyType() {
  document.documentElement.classList.toggle('bigtype', largeType);
  const toggle = document.querySelector('.text-toggle');
  if (toggle) toggle.setAttribute('aria-pressed', String(largeType));
  document.querySelectorAll('a[href]').forEach(updateLink);
}
applyType();
const offer = document.querySelector('[data-interest-service]');
if (offer) updateProjectLinks(offer.dataset.interestService, offer.dataset.interestPackage);
const steps = document.querySelector('.process-steps');
if (steps) {
  const narrow = matchMedia('screen and (max-width: 780px)');
  const fitSteps = () => { steps.open = !narrow.matches; };
  fitSteps();
  narrow.addEventListener('change', fitSteps);
}
document.querySelector('.text-toggle')?.addEventListener('click', () => {
  largeType = !largeType;
  applyType();
  const url = new URL(location.href);
  if (largeType) url.searchParams.set('schrift', 'gross');
  else url.searchParams.delete('schrift');
  history.replaceState(history.state, '', url);
});

const menu = document.querySelector('.menutoggle');
const nav = document.querySelector('#primary');
function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
}
menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

const money = new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0});
function enableEstimate(form) {
  const selection = document.querySelector('#paket');
  const fit = document.querySelector('#fit');
  const terms = document.querySelector('#estimate-conditions');
  const extra = document.querySelector('#estimate-extra');
  const result = document.querySelector('#estimate-result');
  const initial = Array.from(result.childNodes, n => n.cloneNode(true));
  const icon = result.querySelector('.large-icon').cloneNode(true);
  const packages = new Map();
  for (const row of document.querySelectorAll('[data-paket][data-euro]')) {
    packages.set(row.dataset.paket, {
      name: row.querySelector('h3').textContent,
      scope: row.querySelector('p').textContent,
      euro: Number(row.dataset.euro), from: row.dataset.ab === 'true'
    });
  }
  const interest = pageInterest;
  const selected = Object.hasOwn(clearance,interest) ? null : params.get('paket');
  if (packages.has(selected) && selected !== 'extra') selection.value = selected;
  else if (Object.hasOwn(clearance,interest)) selection.value = 'anders';
  function useSelection() {
    const units = fit.value === 'yes' ? extra.querySelector('select')?.value : '';
    updateProjectLinks(serviceForPackage(selection.value,interest), selection.value, units);
  }
  function clearResult() {
    result.replaceChildren(...initial.map(n => n.cloneNode(true)));
  }
  function showTerms() {
    clearResult();
    extra.replaceChildren();
    const pkg = packages.get(selection.value);
    terms.replaceChildren(node('p', pkg?.scope || 'Für dieses Vorhaben besprechen wir den Umfang mit Ihnen.', 'fine'));
    fit.disabled = !pkg;
    fit.value = 'unknown';
    if (['drei', 'sieben'].includes(selection.value)) {
      const label = node('label', 'Zusätzliche Zeit für dasselbe Team');
      label.htmlFor = 'extra-units';
      const units = node('select');
      units.id = 'extra-units';
      for (let halfHours = 0; halfHours <= 4; halfHours++) {
        const text = halfHours ? halfHours * 30 + ' Minuten · +' + money.format(halfHours * packages.get('extra').euro) : 'Keine Verlängerung einrechnen';
        const option = node('option', text);
        option.value = String(halfHours);
        units.append(option);
      }
      units.addEventListener('change', () => { clearResult(); useSelection(); });
      extra.append(label, units);
    }
  }
  selection.addEventListener('change', () => { showTerms(); useSelection(); });
  fit.addEventListener('change', () => { clearResult(); useSelection(); });
  showTerms();
  if (selected && packages.has(selected) && selected !== 'extra') {
    const initialUnits = extra.querySelector('select');
    const units = params.get('zusatz');
    if (initialUnits && /^[1-4]$/.test(units)) initialUnits.value = units;
    updateProjectLinks(serviceForPackage(selected,interest),selected,units);
  } else if (projectServices.has(interest)) updateProjectLinks(interest);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const pkg = packages.get(selection.value);
    const compatible = Boolean(pkg) && fit.value === 'yes';
    const units = Number(extra.querySelector('select')?.value || 0);
    const request = node('a', compatible ? 'Dieses Paket anfragen' : 'Umfang persönlich klären', 'button');
    const service = serviceForPackage(selection.value,interest);
    const requestUrl = new URL('/anfrage/',location.href);
    writeInterest(requestUrl,service,selection.value,compatible && units ? String(units) : '');
    request.href = requestUrl.pathname + requestUrl.search;
    updateLink(request);
    result.replaceChildren(icon.cloneNode(true));
    if (compatible) {
      result.append(node('h3', pkg.name), node('p', (pkg.from ? 'ab ' : '') + money.format(pkg.euro + units * packages.get('extra').euro), 'sum'));
      result.append(node('p', units ? 'Paket ' + money.format(pkg.euro) + ' plus ' + money.format(units * packages.get('extra').euro) + ' für ' + units * 30 + ' zusätzliche Minuten nach Vereinbarung.' : pkg.scope));
      result.append(node('p', 'Preisorientierung inklusive 19 % USt. Das Angebot bestätigt den konkreten Umfang.'));
    } else if (Object.hasOwn(clearance,service)) {
      result.append(node('h3', clearance[service].title), node('p', clearance[service].scope));
    } else {
      result.append(node('h3', 'Persönliche Kalkulation'), node('p', 'Für einen passenden Preis brauchen wir Angaben zu Umzugsgut, Strecke und Zugang. Beschreiben Sie Ihr Vorhaben in der Anfrage.'));
    }
    result.append(request);
    result.setAttribute('tabindex', '-1');
    result.focus({preventScroll: false});
  });
}

const form = document.querySelector('#lead-form');
const estimate = document.querySelector('#estimate');
if (estimate) enableEstimate(estimate);

if (estimate) {
  import('/assets/scope-flow.js').then(({calculatorScopes}) => {
    function selection(kind) {
      let url;
      if (kind === 'moving') {
        const pack = document.querySelector('#paket').value;
        const fit = document.querySelector('#fit').value;
        url = new URL('/anfrage/',location.href);
        writeInterest(url,serviceForPackage(pack,pageInterest),pack,fit === 'yes' ? document.querySelector('#extra-units')?.value : '');
      } else {
        const anchor = document.querySelector(kind === 'comparison' ? '[data-comparison-inquiry]' : '[data-estimate-inquiry]');
        if (!anchor.hidden) url = new URL(anchor.href);
        else {
          let service = Object.hasOwn(clearance,pageInterest) ? pageInterest : 'entruempelung';
          if (kind === 'comparison') {
            const topic = document.querySelector('#comparison-topic').value;
            service = ({keller:'entruempelung',sofa:'entsorgung',kleinumzug:'umzug'})[topic] || topic;
          }
          url = new URL('/anfrage/',location.href);
          writeInterest(url,service);
        }
      }
      const link = document.createElement('a');
      link.setAttribute('href',url.pathname+url.search);
      updateLink(link);
      return {url:new URL(link.href),service:url.searchParams.get('leistung') || url.searchParams.get('service')};
    }
    calculatorScopes(selection,(selected,service) => {
      updateProjectLinks(service,selected.searchParams.get('paket'),selected.searchParams.get('zusatz'),url => {
        for (const key of priceContextKeys) {
          if (selected.searchParams.has(key)) url.searchParams.set(key,selected.searchParams.get(key));
          else url.searchParams.delete(key);
        }
      });
    });
  }).catch(() => {
    document.querySelectorAll('[data-scope-mount]').forEach(host => {
      const link = node('a','Auftragsdetails in der Anfrage eingeben');
      link.href = '/anfrage/';
      updateLink(link);
      host.replaceChildren(link);
    });
  });
}

function telephoneLooksValid(value) {
  if (!/^\+?[\d\s()./-]+$/.test(value)) return false;
  let number = value.replace(/[\s()./-]/g, '');
  if (number.startsWith('00')) number = '+' + number.slice(2);
  else if (number.startsWith('0')) number = '+49' + number.slice(1);
  return /^\+?[1-9]\d{6,14}$/.test(number);
}

// The confirmation belongs to this history entry. A bookmarked or shared URL opens the neutral page.
function goToReceipt(receipt) {
  const target = new URL('/danke/', location.href);
  if (source !== 'unbekannt') target.searchParams.set('src', source);
  if (adVariant) target.searchParams.set('anzeige',adVariant);
  if (largeType) target.searchParams.set('schrift', 'gross');
  history.pushState({frankenpacktReceipt: receipt}, '', target);
  location.reload();
}

// A same-document history entry can survive reload. Back/Forward must load the matching template.
if (form || document.querySelector('#receipt')) {
  const templatePath = location.pathname;
  window.addEventListener('popstate', () => {
    if (location.pathname !== templatePath) location.reload();
  });
}

function showReceipt() {
  const card = document.querySelector('#receipt');
  if (!card) return;
  const receipt = history.state?.frankenpacktReceipt;
  if (!receipt || !['phone','email'].includes(receipt.contactMethod)) return;
  const sample = receipt.mode === 'preview' && receipt.reference === null;
  const confirmed = receipt.mode === 'live' && /^AN-[A-F0-9]{16}$/.test(receipt.reference);
  if (!sample && !confirmed) return;
  const callback = receipt.callback === true;
  const topic = Object.hasOwn(clearance,receipt.service) ? clearance[receipt.service] : null;
  const title = document.querySelector('#receipt-title');
  title.textContent = sample ? 'Vorschau der Bestätigung' : callback ? 'Danke für Ihren Rückrufwunsch.' : 'Danke für Ihre Anfrage.';
  document.querySelector('#receipt-description').textContent = sample
    ? 'Sie haben den Ablauf mit Beispieldaten getestet. Es wurde keine Anfrage übermittelt und kein Rückruf ausgelöst.'
    : callback ? 'Ihr Rückrufwunsch ist bei FrankenPackt eingegangen.' : 'Ihre Anfrage ist bei FrankenPackt eingegangen.';
  if (confirmed) {
    const ref = document.querySelector('#receipt-reference');
    ref.textContent = receipt.reference;
    ref.parentElement.hidden = false;
  }
  const next = document.querySelector('#receipt-next');
  next.hidden = false;
  next.textContent = sample
    ? 'Nach einer echten Übermittlung finden Sie hier Ihre Vorgangsnummer und den nächsten Schritt.'
    : receipt.contactMethod === 'phone'
      ? 'Wir melden uns unter der angegebenen Telefonnummer.'
      : 'Wir melden uns an die angegebene E-Mail-Adresse.';
  const primary = document.querySelector('#receipt-primary');
  primary.textContent = topic ? topic.title : 'Zur Preisübersicht';
  primary.href = topic ? topic.path : '/preise/';
  updateLink(primary);
  document.title = title.textContent + ' · FrankenPackt';
}
showReceipt();

const liveDocument = document.querySelector('meta[name="robots"]')?.content === 'index,follow';
let mode = liveDocument ? 'unavailable' : 'preview';
const canConfigure = location.protocol === 'http:' || location.protocol === 'https:';
const configure = canConfigure ? fetch('/api/config', {headers: {Accept: 'application/json'}, cache: 'no-store'})
  .then(r => r.ok ? r.json() : null).then(c => {
    if (c?.mode !== 'live' || c.leadIntake !== true) return;
    mode = 'live';
    if (c.phone && /^\+?\d{7,15}$/.test(c.phone)) {
      const link = document.querySelector('[data-phone-link]');
      if (link) {
        link.href = 'tel:' + c.phone;
        link.querySelector('span').textContent = c.phoneDisplay || c.phone;
      }
    }
  }).catch(() => {}) : Promise.resolve();

function enableInquiry(form, contexts, draftTools) {
  const service = form.elements.service;
  const initialService = pageInterest;
  const pack = contexts.length || Object.hasOwn(clearance,initialService) ? null : params.get('paket');
  const requestedService = Object.hasOwn(packageLabels,pack) ? serviceForPackage(pack,initialService) : initialService;
  const serviceOption = Array.from(service.options).find(o => o.value === requestedService);
  if (serviceOption) service.value = requestedService;
  const callback = params.get('kontakt') === 'telefon' || initialService === 'rueckruf';
  const phone = form.elements.phone;
  const email = form.elements.email;
  const summary = document.querySelector('#form-result');
  const submit = document.querySelector('#send-lead');
  const details = form.elements.details;
  const scope = document.querySelector('#service-scope');
  draftTools.recoverHandoff(service.value);
  const editor = callback ? null : draftTools.inquiryScope(document.querySelector('#inquiry-job-scope'),service.value,() => new URLSearchParams(location.search));
  const savedForCallback = callback ? draftTools.completeDraft(service.value) : null;
  document.querySelector('#callback-draft-choice').hidden = !savedForCallback;
  function showServiceFields() {
    const topic = Object.hasOwn(clearance,service.value) ? clearance[service.value] : null;
    scope.hidden = !topic;
    scope.textContent = topic?.scope || '';
  }
  showServiceFields();
  let comparison = contexts.find(context => context.params.has('vergleich'));
  const estimate = contexts.find(context => context.params.has('hilfe'));
  const comparisonNote = comparison ? node('p', comparison.summary, 'note compact') : null;
  if (comparisonNote) {
    comparisonNote.id = 'comparison-context';
    details.labels[0].before(comparisonNote);
    details.setAttribute('aria-describedby', comparisonNote.id);
  }
  if (estimate) details.value = estimate.summary;
  if (Object.hasOwn(packageLabels, pack)) {
    const units = Number(params.get('zusatz'));
    const addition = ['drei', 'sieben'].includes(pack) && [1, 2, 3, 4].includes(units) ? ' mit ' + units * 30 + ' Minuten gewünschter Verlängerung' : '';
    details.value = 'Interesse am Paket ' + packageLabels[pack] + addition + '.';
  }
  const context = callback ? [serviceOption?.label, comparison?.summary, details.value].filter(Boolean).join(' · ') : '';
  const switchLink = document.querySelector('#inquiry-switch');
  const switchTarget = new URL('/anfrage/', location.href);
  if (callback) {
    document.title = 'Rückruf anfragen · FrankenPackt';
    document.querySelector('#inquiry-title').textContent = 'Rückruf anfragen';
    document.querySelector('#inquiry-lead').textContent = 'Hinterlassen Sie Ihren Namen und Ihre Telefonnummer. Wir besprechen Ihr Anliegen persönlich mit Ihnen.';
    document.querySelector('.inquiry-heading .crumb span:last-child').textContent = 'Rückruf';
    const project = document.querySelector('#project-fields');
    project.hidden = project.disabled = true;
    form.elements.contactMethod.value = 'phone';
    document.querySelector('#method-field').hidden = true;
    document.querySelector('#callback-window').hidden = false;
    form.elements.callbackTime.disabled = false;
    const hint = document.querySelector('#callback-context');
    const topic = Object.hasOwn(clearance,initialService) ? clearance[initialService] : null;
    hint.textContent = topic ? context + (context.endsWith('.') ? ' ' : '. ') + topic.scope : context;
    hint.hidden = !context;
    switchLink.textContent = 'Zur ausführlichen Anfrage';
    submit.textContent = 'Musterrückruf prüfen';
  } else {
    switchTarget.searchParams.set('kontakt', 'telefon');
  }
  let currentPack = pack;
  const presetDetails = details.value;
  const contextKeys = contexts.flatMap(context => Array.from(context.params.keys()));
  function writeContext(url) {
    for (const key of contextKeys) url.searchParams.delete(key);
    for (const context of contexts) {
      for (const [key, value] of context.params) url.searchParams.set(key, value);
    }
  }
  function updateFormLinks(interest) {
    writeInterest(switchTarget,interest,currentPack,params.get('zusatz'));
    writeContext(switchTarget);
    switchLink.setAttribute('href',switchTarget.pathname + switchTarget.search);
    updateLink(switchLink);
    updateProjectLinks(interest,currentPack,params.get('zusatz'),writeContext);
  }
  updateFormLinks(serviceOption?.value);
  service.addEventListener('change', () => {
    showServiceFields();
    if (contexts.length && service.value !== contexts[0].service) {
      if (estimate) details.value = details.value.replace(estimate.summary, '').trim();
      if (comparison) {
        comparisonNote.remove();
        details.removeAttribute('aria-describedby');
        comparison = null;
      }
      contexts = [];
    }
    if (Object.hasOwn(packageLabels,currentPack) && serviceForPackage(currentPack,service.value) !== service.value) {
      currentPack = null;
      if (details.value === presetDetails) details.value = '';
    }
    const url = new URL(location.href);
    writeInterest(url,service.value,currentPack,params.get('zusatz'));
    writeContext(url);
    history.replaceState(history.state,'',url);
    editor?.select(service.value);
    updateFormLinks(service.value);
  });
  function selectContact() {
    const telephone = form.elements.contactMethod.value === 'phone';
    document.querySelector('#phone-field').hidden = !telephone;
    document.querySelector('#email-field').hidden = telephone;
    phone.required = telephone;
    email.required = !telephone;
    phone.disabled = !telephone;
    email.disabled = telephone;
    phone.setCustomValidity('');
    email.setCustomValidity('');
  }
  form.querySelectorAll('[name="contactMethod"]').forEach(r => r.addEventListener('change', selectContact));
  selectContact();
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  email.addEventListener('input', () => email.setCustomValidity(''));
  let lastPayload = '';
  let lastId = '';
  let finished = false;
  function finish(receipt, submittedScope) {
    finished = true;
    if (submittedScope) {
      draftTools.clearDraft(submittedScope.service);
      editor?.select(submittedScope.service);
    }
    try {
      goToReceipt(receipt);
    } catch {
      summary.textContent = receipt.mode === 'live'
        ? 'Anfrage eingegangen. Ihre Vorgangsnummer: ' + receipt.reference + '. Wir melden uns über den vereinbarten Kontaktweg.'
        : 'Musteranfrage vollständig. Es wurde keine Anfrage übermittelt.';
    }
  }
  window.addEventListener('pageshow', event => {
    if (event.persisted && finished && location.pathname.startsWith('/anfrage')) {
      finished = false;
      submit.disabled = mode === 'unavailable';
      summary.textContent = '';
      selectContact();
    }
  });
  configure.then(() => {
    if (mode === 'unavailable') {
      submit.textContent = 'Übermittlung derzeit nicht verfügbar';
      submit.disabled = true;
      document.querySelector('#form-mode').textContent = 'Der Onlinekontakt ist derzeit nicht erreichbar. Bitte verwenden Sie die Kontaktdaten im Impressum.';
    } else if (mode === 'live') {
      submit.textContent = callback ? 'Rückruf anfordern' : 'Unverbindlich anfragen';
      document.querySelector('#form-mode').textContent = 'Ihre Angaben werden für die Bearbeitung dieser Anfrage an FrankenPackt übermittelt.';
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    if (!callback && (!service.reportValidity() || !editor.validate())) return;
    if (phone.required && !telephoneLooksValid(phone.value)) phone.setCustomValidity('Bitte geben Sie eine erreichbare Telefonnummer mit Vorwahl ein.');
    if (email.required && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value)) email.setCustomValidity('Bitte prüfen Sie Ihre E-Mail-Adresse.');
    if (!form.reportValidity()) return;
    summary.textContent = '';
    submit.disabled = true;
    try {
      await configure;
      if (mode === 'unavailable') {
        summary.textContent = 'Bitte verwenden Sie vorübergehend die Kontaktdaten im Impressum.';
        return;
      }
      const jobScope = callback
        ? (document.querySelector('#callback-draft').checked ? savedForCallback : null)
        : editor.getValue();
      if (mode !== 'live') {
        finish({mode:'preview', reference:null, callback, service:service.value, contactMethod: form.elements.contactMethod.value},jobScope);
        return;
      }
      const body = Object.fromEntries(new FormData(form));
      if (jobScope) {
        body.jobScope = jobScope;
        const jobContext = draftTools.offerContext(jobScope.service,new URLSearchParams(location.search));
        if (jobContext) body.jobContext = jobContext;
      }
      if (comparison && !callback) body.details = [comparison.summary,body.details].filter(Boolean).join('\n');
      if (callback) {
        body.service = 'rueckruf';
        if (serviceOption && projectServices.has(serviceOption.value)) body.requestedService = serviceOption.value;
        body.contactMethod = 'phone';
        body.timeframe = body.callbackTime;
        body.details = context;
        delete body.callbackTime;
      }
      body.source = source;
      if (adVariant) body.adVariant = adVariant;
      const fingerprint = JSON.stringify(body);
      if (lastPayload !== fingerprint || !lastId) {
        lastPayload = fingerprint;
        lastId = crypto.randomUUID();
      }
      body.requestId = lastId;
      const response = await fetch('/api/leads', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      if (!response.ok) throw new Error(String(response.status));
      const answer = await response.json();
      if (!answer.ok || answer.mode !== 'live' || !/^AN-[A-F0-9]{16}$/.test(answer.reference)) throw new Error('invalid');
      form.reset();
      lastId = '';
      finish({mode:'live', reference:answer.reference, callback, service:body.requestedService || body.service, contactMethod:body.contactMethod},jobScope);
    } catch (error) {
      summary.textContent = error.message === '429' ? 'Bitte warten Sie einen Moment und versuchen Sie es erneut. Ihre Eingaben bleiben erhalten.' : 'Der Eingang konnte nicht bestätigt werden. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut. Ihre Eingaben bleiben erhalten.';
    } finally {
      submit.disabled = finished || mode === 'unavailable';
      summary.focus();
    }
  });
}
if (form) {
  form.addEventListener('submit',event => event.preventDefault());
  const contexts = [];
  if (params.has('vergleich')) {
    contexts.push(import('/assets/price-comparison.js').then(({inquiryComparison}) => inquiryComparison(params)));
  }
  if (params.has('hilfe') && params.has('entsorgungsweg') && Object.hasOwn(clearance, pageInterest)) {
    contexts.push(import('/assets/clearance-calculator.js').then(({inquiryEstimate}) => inquiryEstimate(params)));
  }
  const submit = form.querySelector('#send-lead');
  Promise.all([import('/assets/scope-flow.js'),Promise.allSettled(contexts)]).then(([draftTools,results]) => {
    const valid = results.filter(result => result.status === 'fulfilled' && result.value?.service === pageInterest);
    enableInquiry(form,valid.map(result => result.value),draftTools);
    submit.disabled = false;
  }).catch(() => {
    submit.disabled = true;
    document.querySelector('#form-mode').textContent = 'Die Auftragsfelder konnten nicht geladen werden. Bitte laden Sie die Seite neu.';
  });
}

