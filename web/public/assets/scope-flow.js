import {mountJobScope} from './job-scope.js';
import {validateJobScope} from './job-scope-model.js';
import {inquiryEstimate} from './clearance-calculator.js';
import {scopeConditionNotes,normalizeJobContext} from './job-scope-conditions.js';

const services = new Set(['umzug','seniorenumzug','moebeltaxi','transport','entruempelung','entsorgung']);
const memory = new Map();
const key = service => 'frankenpackt.job.v1.'+service;
const preview = document.querySelector('meta[name="robots"]')?.content !== 'index,follow';

function storageAvailable() {
  try {
    sessionStorage.setItem('frankenpackt.scope.probe','1');
    sessionStorage.removeItem('frankenpackt.scope.probe');
    return true;
  } catch { return false; }
}

function readDraft(service) {
  if (!services.has(service)) return null;
  if (memory.has(service)) return memory.get(service);
  try {
    const raw = sessionStorage.getItem(key(service));
    if (!raw || raw.length > 65536) return null;
    const draft = JSON.parse(raw);
    if (draft?.version === 1 && draft.service === service && draft.fields && typeof draft.fields === 'object') return draft;
  } catch {}
  return null;
}

function saveDraft(draft) {
  memory.set(draft.service,draft);
  try { sessionStorage.setItem(key(draft.service),JSON.stringify(draft)); return true; }
  catch { return false; }
}

export function clearDraft(service) {
  memory.delete(service);
  try { sessionStorage.removeItem(key(service)); } catch {}
}

export function completeDraft(service) {
  const value = readDraft(service);
  if (!value) return null;
  const checked = validateJobScope(value,service);
  return checked.ok ? checked.value : null;
}

export function offerContext(service,search) {
  const raw = {};
  for (const key of ['service','leistung','paket','zusatz','hilfe','entsorgungsweg','asn','container']) {
    if (search.getAll(key).length > 1) return null;
    if (search.has(key)) raw[key] = search.get(key);
  }
  return normalizeJobContext(raw,service);
}

function textElement(tag,text,className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function createEditor(host, service, isCalculator, getContext) {
  const privacy = textElement('p',(preview ? 'Vorschau: Bitte nur Beispieldaten eingeben. ' : '')+
    'Ihre Auftragsdetails bleiben bis zur Anfrage in diesem Tab.','fine');
  const status = textElement('p','','fine');
  status.setAttribute('role','status');
  const inner = document.createElement('div');
  const conditions = document.createElement('div');
  conditions.setAttribute('aria-live','polite');
  conditions.className = 'scope-condition-notes';
  const reset = textElement('button','Auftragsdetails löschen','scope-reset');
  reset.type = 'button';
  host.replaceChildren(privacy,inner,conditions,status,reset);
  let draft = readDraft(service);
  let automaticRoute;
  function withRoute(value, updateAutomatic = false) {
    const query = getContext();
    const current = value?.fields.wasteRoute;
    if (current && !(updateAutomatic && current === automaticRoute)) return value;
    const disposal = query.has('entsorgungsweg') && inquiryEstimate(query)?.service === service ? query.get('entsorgungsweg') : '';
    automaticRoute = disposal === 'asn' ? 'city' : disposal.startsWith('container-') ? 'container' : undefined;
    if (current === automaticRoute) return value;
    const fields = {...value?.fields};
    if (automaticRoute) fields.wasteRoute = automaticRoute;
    else delete fields.wasteRoute;
    return {version:1,service,fields};
  }
  function review(value) {
    const notes = scopeConditionNotes(value,getContext());
    conditions.replaceChildren();
    conditions.hidden = !notes.length;
    if (!notes.length) return;
    const list = document.createElement('ul');
    list.append(...notes.map(note => textElement('li',note)));
    conditions.append(textElement('p','Diese Punkte prüfen wir vor dem Endpreis:'),list);
  }
  const widget = mountJobScope(inner,{service,initial:withRoute(draft),onChange(value) {
    if (value.fields.wasteRoute !== automaticRoute) automaticRoute = undefined;
    draft = value;
    review(value);
    if (!saveDraft(value)) status.textContent = isCalculator
      ? 'Ihr Browser kann den Entwurf nicht zwischenspeichern. Nutzen Sie „Mit diesen Angaben zur Anfrage“, um ihn direkt zu übernehmen.'
      : 'Ihr Browser kann den Entwurf nur auf dieser Seite halten. Bitte lassen Sie die Seite bis zum Absenden geöffnet.';
    reset.hidden = false;
  }});
  function restore(nextService) {
    service = nextService;
    automaticRoute = undefined;
    draft = readDraft(service);
    widget.setService(service,withRoute(draft));
    showStatus();
    review(widget.getValue());
  }
  function showStatus() {
    status.textContent = draft ? 'Ihre bereits eingetragenen Auftragsdetails wurden übernommen.' : '';
    reset.hidden = !draft;
  }
  reset.addEventListener('click',() => {
    clearDraft(service);
    restore(service);
    status.textContent = 'Die Auftragsdetails für diese Leistung wurden gelöscht.';
  });
  showStatus();
  review(widget.getValue());
  return {restore,getValue:widget.getValue,validate:widget.validate,refreshContext() {
    const value = widget.getValue();
    const seeded = withRoute(value,true);
    if (seeded !== value) {
      widget.setService(service,seeded);
      if (draft) {
        draft = widget.getValue();
        saveDraft(draft);
      }
    }
    review(widget.getValue());
  }};
}

export function inquiryScope(host,service,getContext) {
  let editor;
  function select(next) {
    host.hidden = !services.has(next);
    if (host.hidden) return;
    if (editor) editor.restore(next);
    else editor = createEditor(host,next,false,getContext);
  }
  select(service);
  return {select,validate:() => Boolean(editor?.validate()),getValue:() => editor?.getValue()};
}

// Used only if a filled calculator draft cannot be written to tab storage.
// Remove the private handoff from the new history entry as soon as it is read.
export function recoverHandoff(service) {
  const handoff = history.state?.frankenpacktJobHandoff;
  if (!handoff) return;
  const state = {...history.state};
  delete state.frankenpacktJobHandoff;
  history.replaceState(state,'');
  if (handoff.service === service && handoff.version === 1 && handoff.fields && services.has(service)) saveDraft(handoff);
}

export function calculatorScopes(getSelection,onActivate) {
  const slots = Array.from(document.querySelectorAll('[data-calc-scope]'));
  const canCache = storageAvailable();
  for (const slot of slots) {
    const kind = slot.dataset.calcScope;
    const host = slot.querySelector('[data-scope-mount]');
    const next = textElement('a','Mit diesen Angaben zur Anfrage','button secondary');
    next.dataset.scopeContinue = kind;
    slot.append(next);
    let editor, currentService;
    function refresh(reopen = false, activate = false) {
      if (!slot.open && !activate) return;
      const {service,url} = getSelection(kind);
      onActivate(url,service);
      if (!slot.open) return;
      next.href = url.pathname+url.search;
      if (!canCache) {
        host.textContent = (preview ? 'Vorschau: Bitte nur Beispieldaten verwenden. ' : '')+'Ihr Browser erlaubt hier keine Zwischenspeicherung. Geben Sie die Auftragsdetails direkt in der vollständigen Anfrage ein.';
        next.textContent = 'Auftragsdetails in der Anfrage eingeben';
        return;
      }
      if (!editor) editor = createEditor(host,service,true,() => getSelection(kind).url.searchParams);
      else if (reopen || service !== currentService) editor.restore(service);
      else editor.refreshContext();
      currentService = service;
    }
    slot.addEventListener('toggle',() => {
      if (slot.open) {
        for (const other of slots) if (other !== slot) other.open = false;
        refresh(true);
      }
    });
    const selector = {moving:'#estimate',clearance:'#clearance-calculator',comparison:'#comparison-form'}[kind];
    const form = document.querySelector(selector);
    const changed = () => queueMicrotask(() => refresh(false,true));
    form.addEventListener('change',changed);
    form.addEventListener('input',changed);
    next.addEventListener('click',event => {
      if (!editor) return;
      const draft = editor.getValue();
      if (!saveDraft(draft)) {
        event.preventDefault();
        try {
          history.pushState({frankenpacktJobHandoff:draft},'',next.href);
          location.reload();
        } catch {
          const message = 'Die Angaben konnten in diesem Browser nicht übertragen werden. Sie bleiben auf dieser Seite erhalten.';
          host.querySelector('[role="status"]').textContent = message;
        }
      }
    });
    const query = new URLSearchParams(location.search);
    const enteredEstimate = kind === 'comparison' && (['#richtpreis','#preisvergleich'].includes(location.hash) ||
      (!location.hash && (query.has('vorhaben') || query.has('vergleich'))));
    refresh(false,enteredEstimate);
  }
}
