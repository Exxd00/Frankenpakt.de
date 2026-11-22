import {publicPagePaths} from './search-routes.js';

export const statisticsChoice = 'frankenpakt.statistik.v1';
const visitKey = 'frankenpakt.kampagne.v1';
const pages = new Set(publicPagePaths);
const channels = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige']);
const paid = new Set(['cpc','ppc','paidsearch','paid_search']);
const media = new Set(['cpc','organic','referral','social','email']);
// Only terms booked by the operator can enter the event sheet. The campaign export is checked in tests.
export const adKeywords = [
  'entrümpelung nürnberg', 'keller entrümpeln nürnberg', 'wohnungsauflösung nürnberg',
  'haushaltsauflösung nürnberg', 'möbel entsorgen nürnberg', 'sofa entsorgen nürnberg',
  'umzugsunternehmen nürnberg', 'umzugsfirma nürnberg', 'umzugsunternehmen nürnberg preise',
  'umzug nürnberg kosten', 'seniorenumzug nürnberg', 'seniorenumzüge nürnberg', 'umzug für senioren nürnberg'
];
const keywords = new Set(adKeywords);
const campaignSlugs = new Set(['raeumen','umziehen','entruempelung-nuernberg','entsorgung-nuernberg','privatumzug-team','seniorenumzug-team']);

export function cleanAttribution(input, source) {
  if (!input || typeof input !== 'object' || !pages.has(input.landing)) return null;
  const result = {landing:input.landing};
  if (media.has(input.medium)) result.medium = input.medium;
  if (source === 'google' && result.medium === 'cpc') {
    if (typeof input.campaign === 'string' && (/^[1-9]\d{0,18}$/.test(input.campaign) || campaignSlugs.has(input.campaign))) result.campaign = input.campaign;
    if (keywords.has(input.keyword)) result.keyword = input.keyword;
  }
  return result;
}

export function forgetVisit(win) {
  try { win.sessionStorage.removeItem(visitKey); } catch {}
}

export function campaignVisit(location, win, referrer = '') {
  if (!pages.has(location.pathname)) return null;
  const query = new URLSearchParams(location.search);
  const one = key => query.getAll(key).length === 1 ? query.get(key).trim().toLowerCase() : '';
  const channel = one('src') || one('utm_source');
  let referring;
  try { referring = new URL(referrer); } catch {}
  const internal = referring?.origin === location.origin;
  const external = referring && !internal;
  const google = external && ['google.de','www.google.de','google.com','www.google.com','google.at','www.google.at'].includes(referring.hostname);
  const adClick = ['gclid','wbraid','gbraid'].some(key=>query.has(key));
  const source = channels.has(channel) ? channel : google || adClick ? 'google' : external ? 'sonstige' : 'direkt';
  let previous;
  try { previous = JSON.parse(win.sessionStorage.getItem(visitKey)); } catch {}
  const tagged = adClick || ['utm_medium','utm_campaign','utm_term'].some(key=>query.has(key));
  const navigation = win.performance?.getEntriesByType?.('navigation')?.[0]?.type;
  const continuation = internal || navigation === 'reload' || navigation === 'back_forward';
  // Distinguish a fresh address-bar or external arrival in a reused tab from navigation within a visit.
  if (!tagged && continuation && previous && (!channel || channel === previous.source)) {
    const previousSource = channels.has(previous.source) ? previous.source : 'unbekannt';
    const attribution = cleanAttribution(previous.attribution,previousSource);
    if (attribution) return {source:previousSource,attribution};
  }
  const rawMedium = one('utm_medium');
  let medium = rawMedium;
  if (paid.has(rawMedium) || (!rawMedium && source === 'google' && (campaignSlugs.has(one('anzeige')) || adClick))) medium='cpc';
  else if (!rawMedium && external) medium=google && referring.pathname === '/search' ? 'organic' : 'referral';
  const attribution = cleanAttribution({landing:location.pathname,medium,campaign:one('utm_campaign'),
    keyword:one('utm_term').normalize('NFC').replace(/\s+/g,' ')},source);
  const visit = {source,attribution};
  try { win.sessionStorage.setItem(visitKey,JSON.stringify(visit)); } catch {}
  return visit;
}
