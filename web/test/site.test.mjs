import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.mjs';

test('generated website serves all routes and assets, live legal copy before JavaScript',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'frankenpackt-pages-'));
  const env={SITE_MODE:'live',PUBLIC_ORIGIN:'https://example.invalid',LEAD_DATA_DIR:dir,
    OPERATOR_NAME:'Probe & Partner <Test>',LEGAL_ADDRESS:'Musterweg 1',CONTACT_PHONE:'+49 911 1234567',
    CONTACT_EMAIL:'probe@example.invalid',PRIVACY_EXTRA:'Hosting in der Testumgebung.'};
  const app=startServer({env,port:0});await once(app,'listening');
  t.after(async()=>{const done=once(app,'close');app.close();app.closeAllConnections();await done;await rm(dir,{recursive:true,force:true,maxRetries:5});});
  const base='http://127.0.0.1:'+app.address().port;
  const assets=new Set();
  for(const route of ['/','/umzug/','/moebeltaxi/','/seniorenumzug/','/raeumung/','/entsorgung/','/preise/','/anfrage/','/impressum/','/datenschutz/']){
    const res=await fetch(base+route);assert.equal(res.status,200,route);
    const html=await res.text();
    assert.doesNotMatch(html,/\bFestpreis(?:e|en)?\b/i,route);
    if(route==='/preise/'){
      const mobileAmounts = Array.from(html.matchAll(/class="tile-price">([^<]+)</g), m => m[1]);
      const desktopAmounts = Array.from(html.matchAll(/class="amount"><strong>([^<]+)</g), m => m[1]);
      assert.equal(mobileAmounts.length, 5);
      assert.deepEqual(desktopAmounts, mobileAmounts);
      for(const amount of mobileAmounts) assert.match(amount, /^ab [\d.]+\s€$/);
    }
    assert.match(html,/<link rel="canonical"/);assert.doesNotMatch(html,/content="noindex,follow"/);
    for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g))assets.add(m[1]);
    if(route==='/impressum/'){assert.match(html,/Probe &amp; Partner &lt;Test&gt;/);assert.match(html,/mailto:probe@example.invalid/);}
    if(route==='/datenschutz/'){assert.match(html,/90 Tage/);assert.match(html,/Hosting in der Testumgebung/);}
    if(route==='/anfrage/'){assert.match(html,/href="tel:\+499111234567"/);assert.match(html,/Anfrage senden/);assert.doesNotMatch(html,/Musteranfrage prüfen/);}
  }
  for(const asset of assets){const res=await fetch(base+asset);assert.equal(res.status,200,asset);await res.arrayBuffer();}
  const missing=await fetch(base+'/nicht-vorhanden/',{headers:{Accept:'text/html'}});
  assert.equal(missing.status,404);assert.match(await missing.text(),/<html/);
});
