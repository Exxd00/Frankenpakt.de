import {firmPages} from './firmen-pages.mjs';
import {taskPages} from './task-pages.mjs';

export const shareWidth = 1200;
export const shareHeight = 630;

function artwork(source, alt) {
  const name = source.split('/').at(-1).replace(/(?:-960)?\.webp$/, '');
  return {source:'/assets/' + source, image:'/assets/teilen/' + name + '.jpg', alt};
}

const overview = artwork('entruempelung-franken.webp', 'Zwei Frauen sortieren eine Schale und weiteren Hausrat.');
const guides = Object.fromEntries(taskPages.map(page => [
  page.path, artwork('ratgeber/' + page.path.slice(1, -1) + '-960.webp', page.photoAlt)
]));
const firms = Object.fromEntries(firmPages.map(page => [
  page.path, artwork('firmen/' + page.project + '-960.webp', page.photoAlt)
]));

export const shareCards = {
  '/': overview,
  '/raeumung/': guides['/wohnungsaufloesung/'],
  '/entsorgung/': guides['/sofa-entsorgen/'],
  '/umzug/': artwork('umzug-franken.webp', 'Zwei Personen tragen eine Holzkommode vor einem Hauseingang.'),
  '/moebeltaxi/': guides['/moebel-nach-privatkauf-abholen/'],
  '/seniorenumzug/': artwork('seniorenumzug.webp', 'Eine ältere Frau und ihre Begleiterin schauen sich am Tisch ein Fotoalbum an.'),
  '/preise/': overview,
  '/anfrage/': overview,
  ...guides,
  ...firms
};
