import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {publicOrigin, searchHead, searchPaths} from '../search-site.mjs';

const dir = new URL('../public/', import.meta.url);
const html = path => readFileSync(new URL('betrieb' + path + 'index.html', dir), 'utf8');
const sampleTitle = '<title>FrankenPackt</title><meta name="description" content="In Nürnberg">';

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'JPEG header');
  let pos = 2;
  while (pos < bytes.length - 9) {
    const marker = bytes.readUInt16BE(pos);
    if (marker === 0xffc0 || marker === 0xffc2) {
      return [bytes.readUInt16BE(pos + 7), bytes.readUInt16BE(pos + 5)];
    }
    pos += 2 + bytes.readUInt16BE(pos + 2);
  }
  assert.fail('Missing JPEG frame');
}

test('public landing pages and the inquiry entry provide image cards before JavaScript runs', () => {
  const checkedImages = new Set();
  for (const path of [...searchPaths, '/anfrage/']) {
    const head = html(path).split('</head>')[0];
    const fields = Object.fromEntries([...head.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)" content="([^"]+)">/g)].map(m => [m[1],m[2]]));
    assert.equal(fields['og:url'], publicOrigin + path, path);
    assert.equal(fields['og:site_name'], 'FrankenPackt');
    assert.equal(fields['og:title'], fields['twitter:title']);
    assert.equal(fields['og:description'], fields['twitter:description']);
    assert.equal(fields['twitter:card'], 'summary_large_image');
    assert.equal(fields['twitter:image'], fields['og:image']);
    assert.equal(fields['twitter:image:alt'], fields['og:image:alt']);
    assert.ok(fields['og:image:alt'].length > 15, path);
    const image = new URL(fields['og:image']);
    assert.equal(image.origin, publicOrigin);
    assert.match(image.pathname, /^\/assets\/teilen\/[\w-]+\.jpg$/);
    assert.equal(fields['og:image:type'], 'image/jpeg');
    assert.equal(fields['og:image:width'], '1200');
    assert.equal(fields['og:image:height'], '630');
    if (!checkedImages.has(image.href)) {
      const bytes = readFileSync(new URL('.' + image.pathname, dir));
      assert.deepEqual(jpegDimensions(bytes), [1200, 630], image.pathname);
      assert.ok(bytes.length < 200_000, image.pathname + ' must stay lightweight');
      checkedImages.add(image.href);
    }
  }
  assert.ok(checkedImages.size >= 17, 'guide and company pages retain their own illustrations');
});

test('share identity omits request parameters and private confirmation pages have no social card', () => {
  for (const path of ['/', '/anfrage/', '/danke/']) {
    const clean = searchHead(sampleTitle, {}, publicOrigin + path);
    const tracked = searchHead(sampleTitle, {}, publicOrigin + path + '?gclid=tracking-example&email=redacted%40example.test#private');
    assert.equal(clean, tracked);
  }
  assert.doesNotMatch(html('/danke/'), /(?:property="og:|name="twitter:)/);
});
