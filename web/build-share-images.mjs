// One-off artwork export. The checked-in JPEGs are served as static assets.
// Run with Node and sharp installed, or pass the absolute path to the sharp module.
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {shareCards, shareHeight, shareWidth} from './share-cards.mjs';

const sharp = createRequire(import.meta.url)(process.argv[2] || 'sharp');
const publicDir = new URL('./public/', import.meta.url);
const asset = path => fileURLToPath(new URL('.' + path, publicDir));
await mkdir(asset('/assets/teilen/'), {recursive:true});
const logo = await readFile(asset('/assets/marke.svg'), 'utf8');
// Keep the whole wordmark inside the center square when a chat app crops the photo.
const plate = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="84" viewBox="0 0 400 84">' +
  '<rect x="1" y="1" width="398" height="82" rx="18" fill="#F7F5EF" stroke="#202A22" stroke-opacity=".15" stroke-width="2"/>' +
  logo.replace('<svg ', '<svg x="25" y="13" width="350" height="56" ') + '</svg>');

const topFramed = new Set(['bueroumzug', 'hausverwaltung', 'firmenkunden'].map(name => '/assets/firmen/' + name + '-960.webp'));
for (const {source, image} of new Map(Object.values(shareCards).map(card => [card.image, card])).values()) {
  const position = topFramed.has(source) ? 'north' : 'centre';
  await sharp(asset(source)).resize(shareWidth, shareHeight, {fit:'cover', position})
    .composite([{input:plate, left:(shareWidth - 400) / 2, top:shareHeight - 116}])
    .jpeg({quality:78, mozjpeg:true}).toFile(asset(image));
}
