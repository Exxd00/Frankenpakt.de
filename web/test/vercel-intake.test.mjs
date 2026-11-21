import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import test from 'node:test';

const configUrl = new URL('../public/vercel.ts', import.meta.url);
function routesFor(target, origin = '') {
  const code = 'import {config} from ' + JSON.stringify(configUrl.href) + '; console.log(JSON.stringify(config.routes));';
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, VERCEL_ENV: target, FRANKENPACKT_INTAKE_ORIGIN: origin}
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
  for (const routes of [routesFor('production'), routesFor('preview','https://betrieb.example')]) {
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
    .filter(entry=>entry.isDirectory() && existsSync(new URL(entry.name+'/index.html',publicRoot)))
    .map(entry=>'/'+entry.name+'/');
  for (const route of ['/', ...pages, '/robots.txt','/api/config']) {
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
