import {cleanAttribution} from './campaign-attribution.js';

const queueKey = 'frankenpakt.offene-kontaktaktionen.v1';
const limit = 8;
const lifetime = 30 * 60 * 1000;
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function contactDelivery({session,accepted,send,collector,services,sources,now=Date.now}) {
  let memory = [];
  let memoryOnly = false;
  let generation = 0;
  const sending = new Set();

  function pending() {
    let rows = memory;
    try {
      if (!memoryOnly) {
        const saved = session().getItem(queueKey);
        rows = saved && saved.length < 16000 ? JSON.parse(saved) : [];
      }
    } catch { /* The current page can still deliver when storage is unavailable. */ }
    if (!Array.isArray(rows)) return [];
    const time = now();
    const result = [];
    for (const row of rows.slice(-limit)) {
      const {id,service,source,contactChannel,attribution} = row?.metric || {};
      if (!Number.isFinite(row?.at) || row.at > time || time-row.at >= lifetime || !validId.test(id) ||
          !['phone','whatsapp'].includes(contactChannel) || (!services.has(service) && service!=='unbekannt') ||
          (!sources.has(source) && source!=='unbekannt')) continue;
      const metric = {id,event:'contact_intent',service,source,count:1,consent:true,contactChannel};
      const clean = cleanAttribution(attribution,source);
      if (clean) metric.attribution = clean;
      result.push({at:row.at,metric});
    }
    return result;
  }

  function save(rows) {
    memory = rows.slice(-limit);
    try {
      if (memory.length) session().setItem(queueKey,JSON.stringify(memory));
      else session().removeItem(queueKey);
    } catch { memoryOnly = true; }
  }

  async function post(path,body,local) {
    try {
      // An origin-only referrer keeps the path and query private and permits the
      // browser's Origin on same-origin POSTs. The collector checks that origin.
      const response = await send(path,{method:'POST',mode:local?'same-origin':'cors',credentials:'omit',
        redirect:'error',referrerPolicy:local?'origin':'no-referrer',keepalive:true,
        headers:{'Content-Type':'text/plain;charset=UTF-8'},body});
      const status = response?.status || 0;
      // A static fallback page may return 200. Only 204 acknowledges storage.
      return status>=200 && status<300 && status!==204 ? 502 : status;
    } catch { return 0; }
  }
  const temporary = status => status===0 || status===408 || status===429 || status>=500;
  async function deliver({metric}) {
    if (!accepted() || sending.has(metric.id)) return;
    sending.add(metric.id);
    const version = generation;
    try {
      const body = JSON.stringify(metric);
      let status = await post('/api/contact-confirmation',body,true);
      // The direct collector provides compatibility with clients/proxies that
      // omit Origin on same-origin requests and with an interrupted handoff.
      if (([403,404,405].includes(status) || (temporary(status) && status!==429)) && version===generation && accepted()) {
        status = await post(collector,body,false);
      }
      if (version===generation && !temporary(status)) save(pending().filter(row=>row.metric.id!==metric.id));
    } finally { sending.delete(metric.id); }
  }

  return {
    record(metric) {
      if (!accepted()) return;
      const row = {at:now(),metric};
      save([...pending().filter(entry=>entry.metric.id!==metric.id),row]);
      void deliver(row);
    },
    resume() {
      if (!accepted()) return;
      const rows = pending();
      save(rows);
      rows.forEach(row=>void deliver(row));
    },
    clear() { generation++;save([]); }
  };
}
