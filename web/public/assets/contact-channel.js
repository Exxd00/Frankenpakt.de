const channels = new Set(['google', 'kleinanzeigen', 'empfehlung', 'direkt', 'sonstige']);
const adLabels = new Set(['privatumzug-team', 'seniorenumzug-team', 'entruempelung-nuernberg', 'entsorgung-nuernberg']);
const paidMedia = new Set(['cpc', 'ppc', 'paidsearch', 'paid_search']);

// The contact route is shared by everyone using a campaign link. Keep personal click IDs out of onward links.
export function contactCampaign(params) {
  const one = key => params.getAll(key).length === 1 ? params.get(key).trim().toLowerCase() : '';
  const channel = one('src') || one('utm_source');
  const source = channels.has(channel) ? channel : 'unbekannt';
  const label = one('anzeige');
  const adVariant = one('src') === 'google' && adLabels.has(label) ? label : null;
  const result = {source, adVariant: null, phoneChannel: 'main'};
  if (['src','utm_source','utm_medium'].some(key => params.getAll(key).length > 1) ||
      (one('src') && one('utm_source') && one('src') !== one('utm_source'))) {
    return {...result, source: 'unbekannt'};
  }
  if (channel === 'kleinanzeigen') return {...result, phoneChannel: 'kleinanzeigen'};
  if (channel && channel !== 'google') return result;
  const medium = one('utm_medium');
  if (medium && !paidMedia.has(medium)) return result;
  const paidClick = ['gclid','gbraid','wbraid'].some(key => {
    const value = params.get(key);
    return params.getAll(key).length === 1 && value.length <= 512 && /^[a-z0-9_][a-z0-9._~-]*={0,2}$/i.test(value);
  });
  if ((channel === 'google' && paidMedia.has(medium)) || adVariant || paidClick || one('telefonkanal') === 'google-ads') {
    return {...result, adVariant, phoneChannel: 'google'};
  }
  return result;
}

export function carryContactCampaign(params, campaign) {
  const {source, adVariant, phoneChannel} = campaign;
  if (source !== 'unbekannt') params.set('src', source);
  if (adVariant) params.set('anzeige', adVariant);
  else params.delete('anzeige');
  if (phoneChannel === 'google' && !adVariant) params.set('telefonkanal', 'google-ads');
  else params.delete('telefonkanal');
}
