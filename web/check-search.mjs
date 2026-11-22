import assert from 'node:assert/strict';
import {guideServices, searchPaths} from './public/assets/search-routes.js';

// Read the public HTML that a crawler receives. No forms, private APIs or analytics calls.
const origin = 'https://frankenpakt.de';
const urls = new Set(searchPaths);
const titles = new Set(), descriptions = new Set(), links = new Map();
const errors = [];

async function get(path) {
  const response = await fetch(origin + path, {redirect:'manual', signal:AbortSignal.timeout(15000)});
  assert.equal(response.status, 200, path + ' HTTP ' + response.status);
  return {body:await response.text(), headers:response.headers};
}

function tags(html, name) {
  return Array.from(html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi')), match =>
    Object.fromEntries(Array.from(match[0].matchAll(/([\w:-]+)="([^"]*)"/g), a => [a[1],a[2].replaceAll('&amp;','&')])));
}

async function checkPage(path) {
  const {body,headers} = await get(path);
  assert(!/noindex/i.test(headers.get('x-robots-tag') || ''), 'noindex response header');
  const metadata = tags(body,'meta');
  assert.equal(metadata.find(tag => tag.name==='robots')?.content, 'index,follow', 'robots metadata');
  assert.deepEqual(tags(body,'link').filter(tag => tag.rel==='canonical').map(tag => tag.href), [origin+path], 'canonical');
  assert.equal((body.match(/<h1\b/gi)||[]).length, 1, 'main heading');
  const title = body.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = metadata.find(tag => tag.name==='description')?.content;
  assert(title && !titles.has(title), 'missing or duplicate title');
  assert(description && !descriptions.has(description), 'missing or duplicate description');
  titles.add(title); descriptions.add(description);
  const structured = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => {
    const doc=JSON.parse(m[1]); return doc['@graph'] || [doc];
  });
  assert(structured.length, 'structured data missing');
  const targets=tags(body,'a').filter(tag=>tag.href).map(tag=>new URL(tag.href,origin+path)).filter(u=>u.origin===origin);
  links.set(path,targets.map(u=>u.pathname).filter(p=>urls.has(p)));
  if (Object.hasOwn(guideServices,path)) {
    const slug=path.split('/').filter(Boolean).at(-1);
    assert(structured.some(obj=>obj['@type']==='BreadcrumbList'), 'guide breadcrumb');
    assert(targets.some(u=>u.pathname==='/anfrage/' && u.searchParams.get('thema')===slug &&
      (u.searchParams.get('leistung')||u.searchParams.get('service'))===guideServices[path]), 'matching enquiry link');
  }
}

const robots = await get('/robots.txt');
assert(robots.body.split(/\r?\n/).some(line=>line.trim()==='Sitemap: '+origin+'/sitemap.xml'), 'robots sitemap reference');
const map = await get('/sitemap.xml');
assert(/xml/i.test(map.headers.get('content-type')||''), 'sitemap media type');
const locations=[...map.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]).sort();
assert.deepEqual(locations, searchPaths.map(p=>origin+p).sort(), 'sitemap coverage');
for (const path of searchPaths) {
  try { await checkPage(path); } catch (error) { errors.push(path+' '+error.message); }
}
const reachable = new Set(['/']);
for (const path of reachable) for (const next of links.get(path)||[]) reachable.add(next);
for (const path of urls) if (!reachable.has(path)) errors.push(path+' cannot be reached by following public links from the homepage');
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin,indexable:urls.size,taskPages:Object.keys(guideServices).length,reachable:reachable.size,errors},null,2));
if (errors.length) process.exitCode=1;
