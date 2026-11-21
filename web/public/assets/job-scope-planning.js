const formatNumber = new Intl.NumberFormat('de-DE', {maximumFractionDigits:2});
// The operator's approximate available payload for one equipped 3.5 t van.
const planningPayloadKg = 1000;

function quantity(input) {
  if (typeof input !== 'string' || !/^\d{1,6}(?:[.,]\d{1,2})?$/.test(input.trim())) return null;
  return Number(input.trim().replace(',', '.'));
}

export function itemWeightKg(input) {
  if (typeof input !== 'string') return null;
  const kg = input.trim().replace(/^(?:ca\.?\s*|~\s*)/i,'').replace(/\s*kg$/i,'');
  const value = quantity(kg);
  return value > 0 ? value : null;
}

export function scopePlanningLines(scope, inventory = []) {
  const fields = scope?.fields || {};
  const lines = [];
  const includesTransport = ['umzug','seniorenumzug','transport','moebeltaxi'].includes(scope?.service) || fields.retainedTransport === 'destination';
  const pickup = quantity(fields.fromCarry);
  const dropoff = quantity(fields.toCarry);
  if (includesTransport && pickup !== null && dropoff !== null) {
    lines.push(`Trageweg je durchgehend transportierter Einheit: ${formatNumber.format(pickup)} m bei Abholung + ${formatNumber.format(dropoff)} m am Ziel = ${formatNumber.format(pickup + dropoff)} m auf dem Hinweg, ohne Treppen und Zwischenstopps.`);
  }

  const parking = [['from','am Einsatzort'], ['to','am Ziel']];
  for (const [prefix, location] of parking) {
    if (fields[prefix+'Parking'] === 'blocked') {
      lines.push(`Für den 3,5-t-Transporter ist ${location} kein legaler Halteplatz bestätigt. Zugang oder Halteverbotszone vor der Zusage prüfen.`);
    }
  }

  const items = inventory.filter(item => !['discard','stay'].includes(item.destination));
  if (items.some(item => item.type === 'bulky' && [item.size,item.weight].some(value => /^unbekannt$/i.test(String(value).trim())))) {
    lines.push('Bei einem besonders schweren oder sperrigen Stück fehlen Maße oder Gewicht. Unser Team prüft Personalbedarf, Trageausrüstung und Fahrzeug vor der Zusage.');
  }
  const weights = items.map(item => ({kg:itemWeightKg(item.weight), count:quantity(item.quantity)}));
  const exceedsPayload = includesTransport && weights.some(item => item.kg > planningPayloadKg);
  const enteredWeight = ['known','estimated'].includes(fields.loadWeightMode) ? quantity(fields.loadWeight) : null;
  const listedWeight = weights.length && weights.every(item => item.kg > 0 && Number.isInteger(item.count) && item.count > 0)
    ? weights.reduce((sum, item) => sum + Math.round(item.kg * 100) * item.count, 0) / 100 : null;
  const conflictingWeights = listedWeight > 0 && enteredWeight > 0 && listedWeight > enteredWeight;
  const weight = enteredWeight ?? listedWeight;
  if (conflictingWeights) lines.push(`Die Positionen ergeben ${formatNumber.format(listedWeight)} kg, das angegebene Gesamtgewicht beträgt ${formatNumber.format(enteredWeight)} kg. Gesamtgewicht vor der Tourenplanung abgleichen.`);
  if (exceedsPayload) {
    lines.push('Ein einzelnes Stück überschreitet die angenommene Nutzlast von 1.000 kg. Vor der Zusage ein passendes Fahrzeug und die Verladung klären.');
  } else if (includesTransport && weight > 0 && !conflictingWeights) {
    const loads = Math.ceil(weight / planningPayloadKg);
    const declared = enteredWeight === null ? 'Transportgewicht aus Mengen und Stückgewichten der Liste' : fields.loadWeightMode === 'estimated' ? 'Geschätztes Transportgewicht' : 'Angegebenes Transportgewicht';
    lines.push(`${declared} ${formatNumber.format(weight)} kg. Bei angenommenen 1.000 kg nutzbarer Zuladung ergeben sich rechnerisch mindestens ${formatNumber.format(loads)} ${loads === 1 ? 'Ladung' : 'Ladungen'}. Einzelstücke müssen in das Fahrzeug passen. Das Team prüft die tatsächliche Zuladung und den Platzbedarf.`);
  }
  return lines;
}
