import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {liveHtml} from '../lib/render-live.mjs';
import {operator} from '../lib/cloud-pages.mjs';
import {searchPaths,utilityPaths} from '../search-site.mjs';

const page = pathname => readFile(new URL('../public/'+pathname.slice(1)+'index.html',import.meta.url),'utf8');
const render = (html,path,whatsapp) => liveHtml(html,{...operator,whatsapp},new URL(path,'https://example.invalid').href);
const chatHrefs = html => [...html.matchAll(/data-contact="whatsapp" rel="noreferrer" href="([^"]+)"/g)].map(m=>new URL(m[1]));

test('every marketing page offers its own callback in the floating group; forms and utility pages stay clear',async()=>{
  for(const path of [...searchPaths,...utilityPaths]){
    const html=await page(path);
    const bar=html.match(/<nav [^>]*data-floating-contact[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    if(utilityPaths.includes(path)){assert.equal(bar,undefined,path);continue;}
    assert.ok(bar,path);
    const callback=bar.match(/data-contact="callback" href="([^"]+)"/)?.[1];
    assert.equal(callback,html.match(/data-handoff-callback href="([^"]+)"/)?.[1],path);
    assert.equal(new URL(callback.replaceAll('&amp;','&'),'https://example.invalid').searchParams.get('kontakt'),'telefon',path);
  }
});

test('WhatsApp opens a prepared German message containing only the public topic',async()=>{
  const path='/kueche-abbauen/';
  const html=await page(path);
  const urls=chatHrefs(render(html,path+'?gclid=private&name=PrivatePerson','+4915112345678'));
  assert.ok(urls.length>0);
  for(const url of urls){
    assert.equal(url.origin,'https://wa.me');
    assert.equal(url.pathname,'/4915112345678');
    assert.deepEqual([...url.searchParams.keys()],['text']);
    assert.match(url.searchParams.get('text'),/Guten Tag FrankenPackt.+Küche abbauen/u);
    assert.doesNotMatch(url.searchParams.get('text'),/gclid|private|https?:/i);
  }
  for (const invalid of ['', '+4915112345678?x', '4915112345678']) {
    assert.equal(chatHrefs(render(html,path,invalid)).length,0);
  }
  const privacy=await page('/datenschutz/');
  assert.match(render(privacy,'/datenschutz/','+4915112345678'),/Kontakt über WhatsApp/);
});
