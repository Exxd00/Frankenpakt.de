const memory = new Map();
const services = new Set(['entsorgung','entruempelung','umzug']);
const key = service => 'frankenpackt.estimate.v1.'+service;

export function readEstimateFacts(service) {
  if (!services.has(service)) return null;
  if (memory.has(service)) return memory.get(service);
  try {
    const text = sessionStorage.getItem(key(service));
    if (!text || text.length > 65536) return null;
    const facts = JSON.parse(text);
    return facts?.service === service ? facts : null;
  } catch { return null; }
}

export function writeEstimateFacts(service,facts) {
  if (!services.has(service) || (facts && facts.service !== service)) return false;
  memory.set(service,facts || null);
  try {
    if (facts) sessionStorage.setItem(key(service),JSON.stringify(facts));
    else sessionStorage.removeItem(key(service));
    return true;
  } catch { return false; }
}
