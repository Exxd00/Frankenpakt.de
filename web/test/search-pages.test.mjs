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
});
