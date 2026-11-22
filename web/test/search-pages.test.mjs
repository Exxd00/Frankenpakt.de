import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {taskPages} from '../task-pages.mjs';
import {operator} from '../lib/cloud-pages.mjs';
import {publicOrigin,publicPagePaths,searchPaths} from '../search-site.mjs';
import {publicPagePaths as routed,guideServices,guideLabels} from '../public/assets/search-routes.js';

const dir=new URL('../public/',import.meta.url);
const read=path=>readFileSync(new URL(path,dir),'utf8');
const markup=path=>read('betrieb'+path+'index.html');
const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];

test('each guide serves its own responsive illustration and a substantive answer in German',()=>{
  const sources=new Set();
  for(const guide of taskPages){
    const copy=[guide.intro,...guide.sections.map(([,paragraph])=>paragraph),...guide.questions.map(([,answer])=>answer)].join(' ');
    const words=copy.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
    assert.ok(words.length>=300,guide.path+' body words: '+words.length);
    assert.ok(guide.photoAlt?.length>20,guide.path+' descriptive alt');
    const html=markup(guide.path);
    const image=html.match(/<figure class="task-photo"><img[^>]+>/)?.[0]||'';
    assert.ok(image.includes('width="960" height="640"'),guide.path);
    const base='/assets/ratgeber/'+guide.path.slice(1,-1);
    for(const width of [480,960]){
      const url=base+'-'+width+'.webp';
      assert.ok(image.includes(url+' '+width+'w'),guide.path+' srcset');
      const bytes=readFileSync(new URL('.'+url,dir));
      assert.equal(bytes.toString('ascii',0,4),'RIFF');
      assert.equal(bytes.toString('ascii',8,12),'WEBP');
    }
    const full=publicOrigin+base+'-960.webp';
    assert.ok(html.includes('<meta property="og:image" content="'+full+'">'));
    assert.equal(graph(html).find(n=>n['@type']==='WebPage').primaryImageOfPage.contentUrl,full);
    sources.add(full);
  }
  assert.equal(sources.size,taskPages.length);
});

test('sitemap includes only canonical, reachable public service and task pages',()=>{
  assert.deepEqual(routed,publicPagePaths);
  const urls=[...read('betrieb/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.deepEqual(urls,searchPaths.map(p=>publicOrigin+p));
  assert.equal(new Set(urls).size,urls.length);
  const linked=new Set(['/']);
  for(const path of linked){
    for(const [,href] of markup(path).matchAll(/href="(\/[^"?#]*)"/g)){
      if(searchPaths.includes(href))linked.add(href);
    }
  }
  for(const path of searchPaths){
    const html=markup(path);
    assert.ok(linked.has(path),path);
    assert.ok(html.includes('<meta name="robots" content="index,follow">'),path);
    assert.ok(html.includes('<link rel="canonical" href="'+publicOrigin+path+'">'),path);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,path);
    const draft=read(path.slice(1)+'index.html');
    assert.match(draft,/<meta name="robots" content="noindex,follow">/);
    assert.doesNotMatch(draft,/application\/ld\+json/);
  }
  const business=graph(markup('/')).find(n=>n['@type']==='LocalBusiness');
  assert.equal(business.legalName,operator.operatorName);
  assert.equal(business.telephone,operator.phone);
  assert.equal(business.email,operator.email);
  assert.equal(business.address.addressLocality,'Nürnberg');
  const logo=read(new URL(business.logo).pathname.slice(1));
  for(const attribute of ['width','height']) {
    assert.ok(Number(logo.match(new RegExp(attribute+'="(\\d+)"'))?.[1]) >= 112,'minimum logo '+attribute);
  }
  assert.ok(markup('/').includes(business.address.streetAddress));
  assert.deepEqual(graph(markup('/')).filter(n=>n['@type']==='WebSite').map(n=>n.url),[publicOrigin+'/']);
  for(const page of taskPages){
    const html=markup(page.path);
    const list=graph(html).find(n=>n['@type']==='BreadcrumbList').itemListElement;
    for(const [i,{position,name,item}] of list.entries()){
      assert.equal(position,i+1);assert.ok(name);assert.ok(searchPaths.includes(new URL(item).pathname));
    }
    assert.equal(list.at(-1).name,page.label);assert.equal(list.at(-1).item,publicOrigin+page.path);
    assert.equal(guideServices[page.path],page.service);assert.equal(guideLabels[page.path],page.label);
    assert.ok(html.includes('data-guide-choice="'+page.service+'"'));
    assert.ok(html.includes('thema='+page.path.slice(1,-1)+'&amp;kontakt=telefon'));
    assert.match(html,/<details><summary>[^<]+<\/summary><p>/);
  }
  assert.match(read('robots.txt'),/Disallow: \/\n/);
  assert.match(read('betrieb/robots.txt'),/Sitemap: https:\/\/frankenpakt.de\/sitemap.xml/);
  const rules=read('betrieb/robots.txt').split(/\r?\n/);
  for (const rule of ['Allow: /admin$','Allow: /admin/$','Allow: /admin/index.html$','Disallow: /api/','Disallow: /admin']) assert.ok(rules.includes(rule),rule);
  assert.match(read('admin/index.html'),/<meta name="robots" content="noindex,nofollow">/);
});

test('service selection keeps mixed jobs together and leaves package and inventory choices to the visitor',()=>{
  const home=markup('/');
  const choices=[...home.matchAll(/class="service-card" href="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(choices,['/entsorgung/','/raeumung/','/moebeltaxi/','/umzug/']);
  assert.match(home,/class="service-alternatives"[^]*?href="\/wohnungsaufloesung\/"/);
  assert.match(home,/class="service-alternatives"[^]*?href="\/seniorenumzug\/"/);
  const moving=markup('/umzug/');
  assert.match(moving,/class="button head-cta" href="\/anfrage\/\?service=umzug"/);
  assert.doesNotMatch(moving,/<a[^>]+href="\/anfrage\/\?[^"]*paket=sieben/);
  assert.match(moving,/href="\/preise\/\?service=umzug&amp;paket=sieben#preisfinder"/);
  for(const page of taskPages){
    const html=markup(page.path);
    if(['entruempelung','entsorgung','umzug'].includes(page.service)){
      const slug=page.path.split('/')[1];
      assert(html.includes('href="/preise/?vorhaben='+page.service+'&amp;thema='+slug+'#richtpreis"'),page.path);
    }else{
      assert(html.includes('href="#angaben"') && html.includes('id="angaben"'),page.path);
    }
    assert.match(html,/class="guide-offer"[^]*?<a href="\/anfrage\/\?[^"]+thema=[^"]+"/);
  }
});
