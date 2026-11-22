import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {publicOrigin} from '../search-site.mjs';

const files = new URL('../public/', import.meta.url);
const read = relative => readFileSync(new URL(relative, files), 'utf8');
const production = path => read('betrieb' + path + 'index.html');
const graph = html => JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];
const hrefs = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m => new URL(m[1].replaceAll('&amp;', '&'), publicOrigin));

const hub = '/firmenkunden/';
const offers = [
  [hub, 'firmenkunden', ''],
  ['/bueroaufloesung-nuernberg/', 'bueroaufloesung', 'entruempelung'],
  ['/bueromoebel-entsorgen-nuernberg/', 'bueromoebel', 'entsorgung'],
  ['/bueroumzug-nuernberg/', 'bueroumzug', 'umzug'],
  ['/entruempelung-hausverwaltung-nuernberg/', 'hausverwaltung', 'entruempelung']
];

test('the corporate hub links its four public services and represents the same selection in structured data', () => {
  const html = production(hub);
  assert(hrefs(production('/')).some(url => url.pathname === hub));
  const expected = offers.slice(1).map(([path]) => path).sort();
  const choices = html.match(/<section class="firm-decisions">([\s\S]*?)<\/section>/)[1];
  assert.deepEqual(hrefs(choices).map(url => url.pathname).sort(), expected);
  const list = graph(html).find(n => n['@type'] === 'ItemList');
  assert.deepEqual(list.itemListElement.map(item => new URL(item.url).pathname).sort(), expected);
});

test('corporate pages keep the offer and callback scoped to the visitor’s company project', () => {
  for (const [path, project, service] of offers) {
    const html = production(path);
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
    const requests = hrefs(main).filter(url => url.pathname === '/anfrage/');
    assert(requests.some(url => url.searchParams.get('kontakt') === 'telefon'), path);
    assert(requests.some(url => !url.searchParams.has('kontakt')), path);
    for (const {searchParams} of requests) {
      assert.equal(searchParams.get('kundentyp'), 'firma', path);
      assert.equal(searchParams.get('projekt'), project, path);
      assert.equal(searchParams.get('leistung') || searchParams.get('service') || '', service, path);
      assert(!searchParams.has('paket'), path + ' must not preselect a consumer package');
    }
    assert.doesNotMatch(main, /\bFestpreis\b|\d[\d,.]*\s*(?:€|Euro\b)/i);
    assert.match(main, /<details\b[^>]*><summary>[^<]+<\/summary><p>[^<]+<\/p><\/details>/);
    assert.match(html, /<meta name="viewport" content="width=device-width/);
  }
});

test('each company search result has its own local metadata, service identity and responsive photo', () => {
  const titles = new Set();
  const summaries = new Set();
  for (const [path, project, service] of offers) {
    const html = production(path);
    const nodes = graph(html);
    const canonical = publicOrigin + path;
    const page = nodes.find(n => n['@type'] === 'WebPage');
    const entity = nodes.find(n => n['@id'] === page.mainEntity['@id']);
    const imageBase = '/assets/firmen/' + project;
    const imageUrl = publicOrigin + imageBase + '-960.webp';
    assert.equal(page.url, canonical);
    assert.equal(page.inLanguage, 'de-DE');
    assert.match(page.name, /Nürnberg/);
    titles.add(page.name);
    summaries.add(page.description);
    if (service) {
      assert.equal(entity['@type'], 'Service');
      assert.equal(entity.url, canonical);
      assert.equal(entity.areaServed.name, 'Nürnberg');
      assert.equal(entity.audience['@type'], 'BusinessAudience');
      assert.equal(entity.provider['@id'], page.publisher['@id']);
    }
    assert.equal(page.primaryImageOfPage.contentUrl, imageUrl);
    assert(html.includes('property="og:image" content="' + imageUrl + '"'), path);
    const img = html.match(/<picture class="firm-photo">\s*<img\b[^>]+>/)[0];
    assert.match(img, /\balt="[^"]{20,}"/);
    assert.match(img, /\bsizes="[^"]+"/);
    assert.match(img, /width="960" height="640"/);
    for (const width of [480, 960]) {
      const src = imageBase + '-' + width + '.webp';
      assert(img.includes(src + ' ' + width + 'w'), path);
      const bytes = readFileSync(new URL('.' + src, files));
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', src);
    }
  }
  assert.equal(titles.size, offers.length);
  assert.equal(summaries.size, offers.length);
});
