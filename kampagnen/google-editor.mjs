import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(here, 'anzeigen.json'), 'utf8'));
const [command = 'check', origin] = process.argv.slice(2);
if (!['check', 'draft', 'build'].includes(command)) throw Error('Use check, draft, or build PUBLIC_HTTPS_ORIGIN');
const liveUrls = command === 'build';
let publicOrigin;
if (liveUrls) {
  const t = new URL(origin);
  if (t.protocol !== 'https:' || t.origin !== origin || t.username || t.password ||
      t.port || !t.hostname.includes('.') || /^(localhost|127\.)|\.(test|example|local|invalid)$/i.test(t.hostname)) {
    throw Error('Enter only the verified public HTTPS origin, without a trailing slash.');
  }
  publicOrigin = t.origin;
}
const files = new Map();
const {campaign} = plan;
const landingColumn = liveUrls ? 'Final URL' : 'Relative landing path';
const variants = new Set(['entruempelung-nuernberg','entsorgung-nuernberg','privatumzug-team','seniorenumzug-team']);
const sections = {
  '/preise/': ['preisfinder'],
  '/raeumung/': ['ablauf'],
  '/entsorgung/': ['entsorgungswege', 'kosten']
};
const destinations = new Set();
function dest(relative,variant) {
  const base = publicOrigin || 'https://frankenpackt.invalid';
  const url = new URL(relative,base);
  if (!relative.startsWith('/') || url.origin !== base || !['/umzug/','/seniorenumzug/','/preise/','/anfrage/','/raeumung/','/entsorgung/'].includes(url.pathname)) throw Error('Invalid landing: '+relative);
  const allowed = {service:['umzug','seniorenumzug'],leistung:['entruempelung','entsorgung'],paket:['sieben','drei'],kontakt:['telefon']};
  for(const [key,value] of url.searchParams) {
    if(!Object.hasOwn(allowed,key)||!allowed[key].includes(value)||url.searchParams.getAll(key).length!==1) throw Error('Invalid landing parameter: '+relative);
  }
  if(url.hash && !sections[url.pathname]?.includes(url.hash.slice(1))) throw Error('Invalid section: '+relative);
  if(!variants.has(variant)) throw Error('Unknown ad variant: '+variant);
  url.searchParams.set('src','google');
  url.searchParams.set('anzeige',variant);
  destinations.add(url.href);
  return liveUrls ? url.href : url.pathname+url.search+url.hash;
}
function unique(items) {
  if (new Set(items).size !== items.length) throw Error('Duplicate entries');
}
function lengths(items, max) {
  unique(items);
  for (const item of items) {
    if (!item.trim() || [...item].length > max) throw Error('Invalid text length: ' + item);
  }
}
const titles = Array.from({length: 8}, (_, i) => 'Headline ' + (i + 1));
const descriptions = Array.from({length: 3}, (_, i) => 'Description ' + (i + 1));
const ads = [['Campaign','Ad group','Ad type','Status',...titles,...descriptions,'Path 1','Path 2',landingColumn]];
const keywords = [['Campaign','Ad group','Keyword','Match type','Status']];
const groups = [['Campaign','Ad group','Ad group status','Max CPC','Final URL suffix']];
const searchUrlSuffix = 'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}';
const campaignNegatives = [['Campaign','Keyword','Match type']];
const groupNegatives = [['Campaign','Ad group','Keyword','Match type']];
const links = [['Campaign','Ad group','Link text',landingColumn]];
const release = [['Startstufe','Kampagne','Anzeigengruppe','Keyword','Zielseite']];
const opening = new Set(plan.openingKeywords);
const allKeywords = plan.groups.flatMap(group => group.keywords);
if (opening.size !== 2 || ![...opening].every(keyword => allKeywords.includes(keyword))) {
  throw Error('The first test needs exactly two planned keywords.');
}
unique(plan.groups.map(group=>group.adVariant));
unique(plan.groups.map(group=>group.name));
unique(allKeywords);
unique([...plan.negativePhrases, ...campaign.negativeExact]);
for (const keyword of plan.negativePhrases) campaignNegatives.push([campaign.name,keyword,'Negative phrase']);
for (const keyword of campaign.negativeExact) campaignNegatives.push([campaign.name,keyword,'Negative exact']);
for (const group of plan.groups) {
  const familyNegatives = plan.familyNegativeExact[group.family];
  if (!familyNegatives) throw Error('Unknown service family: '+group.family);
  unique([...familyNegatives, ...campaign.negativeExact]);
  for (const keyword of group.keywords) {
    const blocked = familyNegatives.includes(keyword) || campaign.negativeExact.includes(keyword) ||
      plan.negativePhrases.some(phrase => (' '+keyword+' ').includes(' '+phrase+' '));
    if (blocked) throw Error('Targeted keyword excluded in '+group.name+': '+keyword);
  }
  for (const keyword of familyNegatives) groupNegatives.push([campaign.name,group.name,keyword,'Negative exact']);
  if (group.headlines.length !== titles.length || group.descriptions.length !== descriptions.length) throw Error('Missing RSA assets');
  lengths(group.headlines, 30);
  lengths(group.descriptions, 90);
  lengths([group.path,'nuernberg'], 15);
  unique(group.keywords);
  groups.push([campaign.name,group.name,'Paused',campaign.maxCpcEur.toFixed(2),searchUrlSuffix]);
  const landing = dest(group.landing,group.adVariant);
  ads.push([campaign.name,group.name,'Responsive search ad','Paused',...group.headlines,...group.descriptions,group.path,'nuernberg',landing]);
  for (const keyword of group.keywords) {
    keywords.push([campaign.name, group.name, keyword, 'Exact','Paused']);
    const stage=group.hold || (opening.has(keyword) ? 'Erster Test nach Freigabe' : 'Reserve');
    release.push([stage, campaign.name, group.name, keyword, landing]);
  }
  lengths(group.sitelinks.map(link=>link.title),25);
  unique(group.sitelinks.map(link=>link.landing));
  for (const link of group.sitelinks) links.push([campaign.name,group.name,link.title,dest(link.landing,group.adVariant)]);
}
files.set('00-kampagne.csv',[
  ['Campaign','Campaign type','Campaign status','Daily budget','Bid strategy type','Networks','Languages','Targeting method'],
  [campaign.name,'Search','Paused',campaign.dailyBudgetEur.toFixed(2),'Manual CPC','Google Search',campaign.language,'Location of presence']
]);
files.set('00b-standort.csv',[
  ['Campaign','Location','Location ID'],
  [campaign.name,campaign.location,String(campaign.locationId)]
]);
files.set('01-gruppen.csv',groups);
files.set('02-suchwoerter.csv',keywords);
files.set('03-anzeigen.csv',ads);
files.set('04-ausschluesse.csv',campaignNegatives);
files.set('04b-gruppenausschluesse.csv',groupNegatives);
files.set('05-sitelinks-zur-zuordnung.csv',links);
files.set('06-freigabestufen-intern.csv',release);
const pack = rows => '\uFEFF' + rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
if (liveUrls) {
  for (const u of destinations) {
    const resp = await fetch(u, {redirect:'manual',signal:AbortSignal.timeout(12000)});
    if (resp.status !== 200 || !/text\/html/i.test(resp.headers.get('content-type') || '')) throw Error('Landing not available: ' + u);
    const html = await resp.text();
    if (!/<title[^>]*>[^<]*FrankenPackt[^<]*<\/title>/i.test(html)) throw Error('Check landing identity: ' + u);
    const fragment = new URL(u).hash.slice(1);
    if (fragment && !html.includes('id="' + fragment + '"')) throw Error('Missing landing section: ' + u);
  }
}
if (command !== 'check') {
  const output = path.join(here, liveUrls ? 'editor' : 'entwurf');
  mkdirSync(output,{recursive:true});
  for (const [name,rows] of files) writeFileSync(path.join(output,name),pack(rows), 'utf8');
}
console.log(campaign.name+' (paused): '+plan.groups.length+' ad groups, '+(ads.length-1)+' RSAs, '+(keywords.length-1)+' keywords, '+(campaignNegatives.length-1)+' campaign negatives, '+(groupNegatives.length-1)+' group negatives, '+(links.length-1)+' sitelinks. Mode: '+command);
