// Both the inquiry and the office use the latest facts in the detailed form.
function rows(value) {
  try {
    const list = JSON.parse(value || '[]');
    return Array.isArray(list) && list.every(r => r && typeof r==='object') ? list : [];
  } catch { return []; }
}
const nameKey = name => String(name || '').trim().toLocaleLowerCase('de');
const displayMetric = value => value==='unknown'?'unbekannt':value || '';
const estimateMetric = value => /^(unknown|unbekannt)$/i.test(value || '')?'unknown':value || '';

export function scopeWithEstimateFacts(scope,facts) {
  if (!facts || (scope && scope.service !== facts.service)) return scope;
  const fields = {...scope?.fields};
  if (facts.service === 'entsorgung' && Array.isArray(facts.items)) {
    const existing = rows(fields.items);
    const items = facts.items.filter(r=>r && (r.name || r.quantity)).map(row=>{
      const index = existing.findIndex(r=>nameKey(r.name)===nameKey(row.name) && (!r.destination || r.destination==='discard'));
      const previous = index<0 ? {} : existing.splice(index,1)[0];
      return {...previous,name:row.name || '',quantity:row.quantity || '',destination:'discard'};
    });
    // Keep separately listed goods that will remain or be reused.
    items.push(...existing.filter(r=>r.destination && r.destination!=='discard'));
    fields.items=JSON.stringify(items);
    if (!fields.extent) fields.extent='items';
  } else if (facts.service === 'entruempelung' && Array.isArray(facts.rooms)) {
    fields.extent='rooms';
    fields.roomBreakdown=JSON.stringify(facts.rooms);
    for (const name of ['areas','areaSqm','fill']) delete fields[name];
  } else if (facts.service === 'umzug') {
    fields.moveRooms=displayMetric(facts.rooms);
    fields.moveArea=displayMetric(facts.area);
    fields.moveDistance=displayMetric(facts.distance);
    fields.loadVolumeMode=facts.volume==='unknown'?'unknown':facts.volume ? (fields.loadVolumeMode==='known'?'known':'estimated') : '';
    fields.loadVolume=facts.volume==='unknown'?'':facts.volume || '';
  }
  return {version:1,service:facts.service,fields};
}

export function factsFromEditedScope(facts,scope) {
  if (!scope?.fields) return facts || null;
  const {service,fields}=scope;
  if (facts && facts.service!==service) return null;
  if (service==='entsorgung') {
    const items=rows(fields.items).filter(r=>r.destination==='discard' || !r.destination)
      .map(r=>({name:r.name || '',quantity:r.quantity || ''}));
    return items.length ? {service,items} : null;
  }
  if (service==='entruempelung') {
    if (fields.extent==='items') return null;
    if (fields.roomBreakdown) return {service,rooms:rows(fields.roomBreakdown)};
    if (fields.extent==='rooms' && fields.areas) return {service,rooms:[{name:fields.areas,area:fields.areaSqm || '',fill:fields.fill || ''}]};
    return null;
  }
  if (service==='umzug') {
    if (!fields.moveRooms && !fields.moveArea && !fields.moveDistance) return null;
    return {service,rooms:estimateMetric(fields.moveRooms),area:estimateMetric(fields.moveArea),distance:estimateMetric(fields.moveDistance),
      volume:fields.loadVolumeMode==='unknown'?'unknown':fields.loadVolume || ''};
  }
  return null;
}
