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
function matchRoute(routes, method, pathname, host = 'frankenpakt.de') {
  return routes.find(route => route.methods.includes(method) && new RegExp(route.src).test(pathname) &&
    (!route.has || route.has.every(rule => rule.type === 'host' && rule.value === host)));
}
function destination(routes, method, pathname) {
  const route=matchRoute(routes,method,pathname);
  return route?.dest ? pathname.replace(new RegExp(route.src),route.dest) : null;
}

test('WhatsApp profile, chat and status links land on the tagged service site', () => {
  const routes = routesFor('production','','1');
  for (const [entry,landing,campaign] of [['/wa','/','profil'],['/wa/chat','/anfrage/','chat'],['/wa/status','/','status']]) {
    for (const path of [entry,entry+'/']) {
      const route = matchRoute(routes,'GET',path);
      assert.equal(route.status,307);
      assert.equal(route.headers.Location,landing+'?utm_source=whatsapp&utm_medium=messenger&utm_campaign='+campaign);
      assert.equal(matchRoute(routes,'POST',path),undefined);
    }
  }
});

test('static production and preview builds publish their preview status without routing customer input', () => {
  for (const routes of [routesFor('production'), routesFor('preview','https://betrieb.example','1')]) {
    const entry = destination(routes, 'GET', '/api/config');
    const settings = JSON.parse(readFileSync(new URL('../public' + entry,import.meta.url),'utf8'));
    assert.deepEqual(settings, {mode:'preview',leadIntake:false});
    assert.equal(destination(routes, 'POST', '/api/leads'), null);
    assert.equal(destination(routes, 'POST', '/api/contact-confirmation'), null);
    assert.equal(destination(routes, 'POST', '/api/contact-handoff'), null);
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
  for (const route of ['/api/leads', '/api/contact-events']) {
    assert.equal(destination(routes, 'POST', route), origin + route);
    assert.equal(destination(routes, 'GET', route), null);
  }
  for (const route of ['/ops','/api/admin','/leads.sqlite']) assert.equal(destination(routes, 'GET', route),null);
  for (const bad of ['http://betrieb.example','https://betrieb.example/pfad','https://frankenpakt.vercel.app']) {
    assert.throws(() => routesFor('production',bad));
  }
});

test('published page aliases redirect to canonical URLs while static previews and non-HTML endpoints keep their routes', () => {
  for (const routes of [routesFor('production','','1'),routesFor('production','https://betrieb.example')]) {
    for (const method of ['GET','HEAD']) {
      for (const [path,target] of [
        ['/index.html','/'],['/kueche-abbauen','/kueche-abbauen/'],['/kueche-abbauen/index.html','/kueche-abbauen/'],
        ['/anfrage','/anfrage/'],['/anfrage/index.html','/anfrage/']
      ]) {
        for (const host of ['frankenpakt.de','frankenpakt.vercel.app']) {
          const route=matchRoute(routes,method,path,host);
          assert.equal(route?.status,308);
          assert.equal(path.replace(new RegExp(route.src),route.headers.Location),'https://frankenpakt.de'+target);
        }
      }
      for (const path of ['/','/sofa-entsorgen/','/robots.txt','/sitemap.xml']) {
        const alias=matchRoute(routes,method,path,'frankenpakt.vercel.app');
        assert.equal(alias?.status,308);
        assert.equal(path.replace(new RegExp(alias.src),alias.headers.Location),'https://frankenpakt.de'+path);
        assert.notEqual(matchRoute(routes,method,path,'frankenpakt.de')?.status,308);
      }
    }
    for(const [method,path] of [['POST','/anfrage'],['POST','/api/leads'],['GET','/admin/'],['GET','/assets/statistik.html'],['GET','/not-a-service/']]){
      assert.notEqual(matchRoute(routes,method,path,'frankenpakt.vercel.app')?.status,308);
    }
  }
  assert.equal(matchRoute(routesFor('preview','','1'),'GET','/sofa-entsorgen/index.html','frankenpakt.vercel.app'),undefined);
});

test('cloud production serves operator pages and sends submissions only to the private intake backend', () => {
  const routes=routesFor('production','','1');
  const read=(path)=>readFileSync(new URL('../public'+destination(routes,'GET',path),import.meta.url),'utf8');
  assert.equal(destination(routes,'POST','/api/contact-confirmation'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events');
  assert.equal(destination(routes,'GET','/api/contact-confirmation'),null);
  assert.equal(destination(routes,'POST','/api/contact-handoff'),'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events/handoff');
  assert.equal(destination(routes,'GET','/api/contact-handoff'),null);
  const legal=read('/impressum/');
  for(const value of ['Mohamad Alzaim','Einsteinring 12','90453 Nürnberg','mailto:info@frankenpakt.de','tel:+4991181672879']){
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
