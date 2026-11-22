import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import test from 'node:test';

const configUrl = new URL('../public/vercel.ts', import.meta.url);
function routesFor(target, origin = '', cloud = '') {
  const code = 'import {config} from ' + JSON.stringify(configUrl.href) + '; console.log(JSON.stringify(config.routes));';
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, VERCEL_ENV: target, FRANKENPACKT_INTAKE_ORIGIN: origin, FRANKENPACKT_CLOUD_INTAKE: cloud}
  });
  return JSON.parse(output);
}
function destination(routes, method, pathname) {
  for (const route of routes) {
    const regex = new RegExp(route.src);
    if (route.methods.includes(method) && regex.test(pathname)) return pathname.replace(regex, route.dest);
  }
  return null;
}

test('static production and preview builds publish their preview status without routing customer input', () => {
  for (const routes of [routesFor('production'), routesFor('preview','https://betrieb.example','1')]) {
    const entry = destination(routes, 'GET', '/api/config');
    const settings = JSON.parse(readFileSync(new URL('../public' + entry,import.meta.url),'utf8'));
    assert.deepEqual(settings, {mode:'preview',leadIntake:false});
    assert.equal(destination(routes, 'POST', '/api/leads'), null);
    assert.equal(destination(routes, 'GET', '/anfrage/'), null);
  }
});

test('configured production serves the same operator for pages, confirmed submissions and contact events', () => {
  const origin = 'https://betrieb.example';
  const routes = routesFor('production', origin);
  const publicRoot = new URL('../public/', import.meta.url);
  const pages = readdirSync(publicRoot,{withFileTypes:true})
    .filter(entry=>entry.isDirectory() && !['admin','betrieb'].includes(entry.name) && existsSync(new URL(entry.name+'/index.html',publicRoot)))
    .map(entry=>'/'+entry.name+'/');
  for (const route of ['/', ...pages, '/robots.txt','/sitemap.xml','/api/config']) {
    assert.equal(destination(routes, 'GET', route), origin + route);
  }
  assert.equal(destination(routes, 'GET', '/anfrage/index.html'), origin + '/anfrage/');
  for (const route of ['/api/leads', '/api/contact-events']) {
    assert.equal(destination(routes, 'POST', route), origin + route);
    assert.equal(destination(routes, 'GET', route), null);
  }
  for (const route of ['/ops','/api/admin','/leads.sqlite']) assert.equal(destination(routes, 'GET', route),null);
  for (const bad of ['http://betrieb.example','https://betrieb.example/pfad','https://frankenpakt.vercel.app']) {
    assert.throws(() => routesFor('production',bad));
  }
});

test('cloud production serves operator pages and sends submissions only to the private intake backend', () => {
  const routes=routesFor('production','','1');
  const read=(path)=>readFileSync(new URL('../public'+destination(routes,'GET',path),import.meta.url),'utf8');
  const legal=read('/impressum/');
  for(const value of ['Mohamad Alzaim','Einsteinring 12','90453 Nürnberg','mailto:info@frankenpakt.de','tel:+4917620126149']){
    assert.ok(legal.includes(value));
  }
  assert.ok(read('/anfrage/').includes('Anfrage senden'));
  assert.ok(read('/danke/').includes('noindex,nofollow'));
  assert.ok(read('/datenschutz/').includes('Supabase'));
  assert.match(read('/robots.txt'),/^Sitemap: https:\/\/frankenpakt\.de\/sitemap\.xml$/m);
  assert.match(read('/sitemap.xml'),/<loc>https:\/\/frankenpakt\.de\/kueche-abbauen\/<\/loc>/);
  const blocked=routes.find(route=>new RegExp(route.src).test('/betrieb/kueche-abbauen/'));
  assert.equal(blocked?.status,404);
  assert.equal(destination(routes,'POST','/api/leads'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake/leads');
  assert.equal(destination(routes,'GET','/api/config'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake/config');
  assert.equal(destination(routes,'GET','/api/leads'),null);
});

test('admin shell is static and its private API always uses the dedicated office endpoint', () => {
  for (const routes of [routesFor('production'),routesFor('production','https://betrieb.example')]) {
    assert.equal(destination(routes,'GET','/admin/'),null);
    assert.equal(destination(routes,'GET','/api/office/state'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-office/state');
    assert.equal(destination(routes,'POST','/api/office/viewer'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-office/viewer');
    assert.equal(destination(routes,'GET','/api/office-file/AN-0000000000000000/1'),null);
  }
});
