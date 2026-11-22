import assert from 'node:assert/strict';
import {guideServices, publicPagePaths, searchPaths} from './public/assets/search-routes.js';

// Read the public HTML that a crawler receives. No forms, private APIs or analytics calls.
const origin = 'https://frankenpakt.de';
const urls = new Set(searchPaths);
const titles = new Set(), descriptions = new Set(), links = new Map();
const assets = new Set(), fragments = new Map(), linkedFragments = new Set();
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
  assert.match(headers.get('content-type') || '', /text\/html/i, 'HTML response');
  assert(!/noindex/i.test(headers.get('x-robots-tag') || ''), 'noindex response header');
  const metadata = tags(body,'meta');
  assert.match(tags(body,'html')[0]?.lang || '', /^de(?:-|$)/i, 'document language');
  assert.match(metadata.find(tag => tag.name==='viewport')?.content || '', /width=device-width/i, 'mobile viewport');
  assert(!metadata.some(tag=>tag.name?.toLowerCase()==='googlebot' && /noindex|none/i.test(tag.content)), 'Googlebot excluded');
  fragments.set(path, new Set([...body.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1])));
  for (const tag of [...tags(body,'img'), ...tags(body,'script'), ...tags(body,'link'), ...tags(body,'source')]) {
    const resources=[tag.src,tag.href,...(tag.srcset || '').split(',').map(source=>source.trim().split(/\s+/)[0])];
    for (const value of resources.filter(Boolean)) {
      const url=new URL(value,origin+path);
      if(url.origin===origin && url.pathname.startsWith('/assets/'))assets.add(url.pathname);
    }
  }
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
  const page=structured.find(obj=>obj['@type']==='WebPage');
  assert.equal(page?.url,origin+path,'structured page URL');
  if(path==='/'){
    const business=structured.find(obj=>obj['@type']==='LocalBusiness');
    assert(business?.name && business?.address?.streetAddress && business?.address?.postalCode && business?.telephone, 'local business identity and address');
    assert.equal(page.publisher?.['@id'],business['@id'],'structured publisher');
    assert.equal(page.isPartOf?.['@id'], structured.find(obj=>obj['@type']==='WebSite')?.['@id'], 'structured website');
  } else {
    const crumbs=structured.find(obj=>obj['@type']==='BreadcrumbList')?.itemListElement;
    assert(crumbs?.length >= 2,'breadcrumb trail');
    assert(crumbs.every((crumb,i)=>crumb.position===i+1 && crumb.name && searchPaths.some(path=>origin+path===crumb.item)), 'breadcrumb sequence and destinations');
    assert.equal(crumbs.at(-1).item,origin+path,'breadcrumb destination');
  }
  const targets=tags(body,'a').filter(tag=>tag.href).map(tag=>new URL(tag.href,origin+path)).filter(u=>u.origin===origin);
  for (const target of targets) if(urls.has(target.pathname) && target.hash.length>1 && !target.hash.startsWith('#:~:'))linkedFragments.add(target.pathname+target.hash);
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
for (const location of linkedFragments) {
  const target=new URL(location,origin);
  if(!fragments.get(target.pathname)?.has(decodeURIComponent(target.hash.slice(1)))) errors.push(location+' link target missing');
}

// Check static resources under their public URLs, including fonts referenced by CSS.
for(const path of assets){
  try{
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200,'HTTP '+response.status);
    const type=response.headers.get('content-type') || '';
    assert(!/text\/html/i.test(type),'HTML returned for asset');
    if(path.endsWith('.css')){
      assert(/text\/css/i.test(type),'stylesheet media type');
      for(const match of (await response.text()).matchAll(/url\(\s*['"]?([^)"'\s]+)['"]?\s*\)/gi)){
        const url=new URL(match[1],origin+path);
        if(url.origin===origin && url.pathname.startsWith('/assets/'))assets.add(url.pathname);
      }
    } else {
      await response.body?.cancel();
    }
  }catch(error){errors.push(path+' '+error.message);}
}
const excludedPages=[...publicPagePaths.filter(path=>!urls.has(path)), '/admin/'];
for(const path of excludedPages){
  try{
    const {body,headers}=await get(path);
    const robots=tags(body,'meta').filter(tag=>['robots','googlebot'].includes(tag.name?.toLowerCase())).map(tag=>tag.content);
    assert(/\bnoindex\b/i.test([headers.get('x-robots-tag'),...robots].join(',')),'missing noindex');
  }catch(error){errors.push(path+' '+error.message);}
}
for(const path of ['/frankenpakt-pruefseite-nicht-vorhanden/','/betrieb/sofa-entsorgen/']){
  try{
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    await response.body?.cancel();
    assert.equal(response.status,404,'missing URL must return 404');
  }catch(error){errors.push(path+' '+error.message);}
}
const aliases=[
  [origin+'/index.html',origin+'/'],
  [origin+'/anfrage?leistung=entsorgung&thema=sofa-entsorgen',origin+'/anfrage/?leistung=entsorgung&thema=sofa-entsorgen'],
  ['https://frankenpakt.vercel.app/kueche-abbauen/index.html?src=google',origin+'/kueche-abbauen/?src=google'],
  ['https://www.frankenpakt.de/sofa-entsorgen/',origin+'/sofa-entsorgen/'],
  ['http://frankenpakt.de/sofa-entsorgen/',origin+'/sofa-entsorgen/']
];
for(const [from,to] of aliases){
  try{
    const res=await fetch(from,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert([301,308].includes(res.status),'expected a permanent redirect, got HTTP '+res.status);
    assert.equal(new URL(res.headers.get('location') || '',from).href,to,'redirect target and query');
  }catch(error){errors.push(from+' '+error.message);}
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin,indexable:urls.size,taskPages:Object.keys(guideServices).length,reachable:reachable.size,excludedPages:excludedPages.length,resources:assets.size,linkedFragments:linkedFragments.size,aliases:aliases.length,errors},null,2));
if (errors.length) process.exitCode=1;
