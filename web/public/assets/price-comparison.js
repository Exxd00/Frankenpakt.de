import {evaluateActualJob,formatStartingPrice,normalizeActualJob,serviceFromQuery,serviceNames} from './actual-job.js';
export {inquiryComparison} from './actual-job.js';
import {readEstimateFacts,writeEstimateFacts} from './estimate-draft.js';

const moves = {Rooms:'rooms',Area:'area',Volume:'volume',Distance:'distance'};
const rowTypes = {
  item:{max:50,legend:'Gegenstand',fields:{itemName:'name',itemQuantity:'quantity'}},
  room:{max:30,legend:'Raum',fields:{roomName:'name',roomArea:'area',roomFill:'fill'}}
};
const prompts = {
  entsorgung:'Nennen Sie jede Position und ihre Stückzahl (mindestens 1).',
  entruempelung:'Geben Sie je Raum die Bezeichnung, eine Fläche größer als 0 m² und den Füllstand an.',
  umzug:'Geben Sie Zimmerzahl, Fläche, Volumen und Strecke an. Was Sie noch nicht kennen, können Sie markieren.'
};

function mountEstimator(form) {
  const section = form.closest('#preisvergleich');
  const select = form.elements.topic;
  const result = section.querySelector('.comparison-result');
  const detailSlot = section.querySelector('[data-calc-scope]');
  const title = result.querySelector('[data-comparison-title]');
  const amount = result.querySelector('[data-comparison-amount]');
  const explanation = result.querySelector('[data-comparison-message]');
  const note = result.querySelector('[data-estimate-scope-note]');
  const inquiry = result.querySelector('[data-comparison-inquiry]');
  const calculator = result.querySelector('[data-scenario-calculator]');
  const panels = form.querySelectorAll('[data-job-panel]');
  function rowsContainer(type) { return form.querySelector('[data-'+type+'-rows]'); }
  function updateRows(type) {
    const rows = Array.from(rowsContainer(type).children);
    for (const [index,row] of rows.entries()) {
      row.querySelector('legend').textContent = rowTypes[type].legend+' '+(index+1);
      const remove = row.querySelector('[data-remove-row]');
      remove.hidden = rows.length === 1;
      remove.setAttribute('aria-label',rowTypes[type].legend+' '+(index+1)+' entfernen');
    }
    form.querySelector('[data-add-'+type+']').disabled = rows.length >= rowTypes[type].max;
  }
  function addRow(type,initial={}) {
    const row = form.querySelector('[data-'+type+'-template]').content.firstElementChild.cloneNode(true);
    for (const [name,key] of Object.entries(rowTypes[type].fields)) {
      row.querySelector('[name="'+name+'"]').value = typeof initial?.[key] === 'string' ? initial[key] : '';
    }
    rowsContainer(type).append(row);
    return row;
  }
  function readRows(type) {
    return Array.from(rowsContainer(type).children,row=>Object.fromEntries(Object.entries(rowTypes[type].fields).map(
      ([name,key])=>[key,row.querySelector('[name="'+name+'"]').value]
    )));
  }
  function read() {
    const service = select.value;
    if (service === 'entsorgung') return {service,items:readRows('item')};
    if (service === 'entruempelung') return {service,rooms:readRows('room')};
    if (service !== 'umzug') return null;
    const draft = {service};
    for (const [suffix,key] of Object.entries(moves)) {
      const input = form.elements['move'+suffix];
      input.disabled = form.elements['unknown'+suffix]?.checked || false;
      draft[key] = input.disabled ? 'unknown' : input.value;
    }
    return draft;
  }
  let lastAmount = null;
  function update(notify=false) {
    const draft = read();
    const service = select.value;
    const actualJob = normalizeActualJob(draft,service);
    const estimate = actualJob && evaluateActualJob(actualJob,service);
    if (notify && draft) {
      writeEstimateFacts(service,draft);
      form.dispatchEvent(new CustomEvent('actual-job-change',{bubbles:true,detail:{service,draft,facts:draft,actualJob}}));
    }
    result.hidden = !draft;
    if (detailSlot) detailSlot.hidden = !actualJob;
    inquiry.hidden = !estimate;
    const params = new URLSearchParams(new URL(inquiry.href).search);
    for (const key of [...params.keys()]) if (!['src','anzeige','schrift'].includes(key)) params.delete(key);
    if (draft) {
      params.set(service === 'umzug' ? 'service' : 'leistung',service);
      params.set('vorhaben',service);
    }
    inquiry.setAttribute('href','/anfrage/'+(params.size?'?'+params:''));
    if (!draft) {lastAmount = null;return;}
    const hasAmount = estimate?.estimatedCents != null;
    calculator.hidden = !estimate || hasAmount;
    if (estimate && !hasAmount) {
      calculator.setAttribute('href',estimate.route);
      calculator.textContent = service === 'umzug' ? 'Umzugspakete ansehen' : 'Räumung und externe Entsorgungspreise ansehen';
    }
    title.textContent = estimate?.priceLabel || 'Ihre Angaben';
    amount.textContent = hasAmount ? formatStartingPrice(estimate.estimatedCents) : '';
    amount.hidden = !hasAmount;
    const displayed = hasAmount ? service+'|'+estimate.estimatedCents : null;
    if (notify && displayed && displayed !== lastAmount) form.dispatchEvent(new CustomEvent('fp-estimate',{bubbles:true,detail:{service}}));
    lastAmount = displayed;
    explanation.textContent = estimate ? estimate.basis : prompts[service];
    note.textContent = estimate?.note || '';
    note.hidden = !note.textContent;
    if (estimate) inquiry.textContent = estimate.requestLabel;
  }
  function restore(draft) {
    const service = select.value;
    for (const panel of panels) panel.hidden = panel.dataset.jobPanel !== service;
    if (!Object.hasOwn(serviceNames,service)) { update(); return; }
    if (draft?.service !== service) draft = null;
    if (service === 'umzug') {
      for (const [suffix,key] of Object.entries(moves)) {
        const unknown = form.elements['unknown'+suffix];
        if (unknown) unknown.checked = draft?.[key] === 'unknown';
        const value = draft?.[key];
        form.elements['move'+suffix].value = typeof value === 'string' && value !== 'unknown' ? value : '';
      }
    } else {
      const type = service === 'entsorgung' ? 'item' : 'room';
      const list = draft?.[type === 'item' ? 'items' : 'rooms'];
      rowsContainer(type).replaceChildren();
      if (Array.isArray(list) && list.length) {
        for (const row of list.slice(0,rowTypes[type].max)) addRow(type,row);
      } else addRow(type);
      updateRows(type);
    }
    update();
  }
  for (const [type,config] of Object.entries(rowTypes)) {
    form.querySelector('[data-add-'+type+']').addEventListener('click',()=>{
      if (rowsContainer(type).childElementCount >= config.max) return;
      const row = addRow(type);
      updateRows(type);
      update(true);
      row.querySelector('input').focus();
    });
    rowsContainer(type).addEventListener('click',event=>{
      const remove = event.target.closest('[data-remove-row]');
      if (!remove || rowsContainer(type).childElementCount < 2) return;
      const row = remove.closest('fieldset');
      const focusTarget = row.previousElementSibling || row.nextElementSibling;
      row.remove();
      updateRows(type);
      update(true);
      focusTarget.querySelector('input').focus();
    });
  }
  form.addEventListener('input',event=>{
    if (event.target.matches('input:not([type=checkbox])')) update(true);
  });
  form.addEventListener('change',event=>{
    if (event.target === select) { restore(readEstimateFacts(select.value)); return; }
    if (event.target.matches('select,input[type=checkbox]')) update(true);
  });
  form.addEventListener('actual-job-restore',event=>{
    if (event.detail?.service === select.value) restore(event.detail.draft ?? event.detail.facts ?? null);
  });
  form.addEventListener('submit',event=>event.preventDefault());
  const initial = serviceFromQuery(new URLSearchParams(location.search));
  if (initial) select.value = initial;
  restore(initial && readEstimateFacts(initial));
  section.querySelector('.comparison-layout').hidden = false;
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#comparison-form');
  if (form) mountEstimator(form);
}
