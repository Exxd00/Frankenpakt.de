import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createOfficeHandler} from '../office/handler.mjs';
import {caseReview} from '../office/handbook.mjs';
import {readFileSync} from 'node:fs';

const officeUrl = 'https://office.example/functions/v1/frankenpakt-office/';
const origin = 'https://frankenpakt.vercel.app';
const reply = value => Response.json(value);

test('upstream mail throttling preserves the retry window without requesting another email',async()=>{
  let requested=0;
  const handler=createOfficeHandler({SUPABASE_URL:'https://office.example',SUPABASE_SERVICE_ROLE_KEY:'fixture'},async url=>{
    if(new URL(url).pathname==='/rest/v1/rpc/fp_office_gate')return reply(true);
    requested++;return new Response(null,{status:429,headers:{'Retry-After':'120'}});
  });
  const response=await handler(new Request(officeUrl+'editor-start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}));
  assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'120');
  assert.match((await response.json()).error,/Versandlimit/);assert.equal(requested,1);
});

function fixtures(role) {
  const calls = [];
  const rates = [{id:'drei',label:'Umzugsteam',scope:'Drei Stunden',unit:'Einsatz',cents:32200,revision:1}];
  const fetcher = async (url,opts) => {
    const path = new URL(url).pathname;
    calls.push({path,method:opts.method});
    if (path === '/rest/v1/fp_office_sessions') return reply([{role}]);
    if (path === '/rest/v1/fp_office_rates') return reply(opts.method === 'GET' ? rates : []);
    if(path==='/rest/v1/rpc/fp_intake_list')return reply([{reference:'AN-12345678ABCDEF12',file_count:1}]);
    if(path==='/rest/v1/rpc/fp_intake_case')return reply({reference:JSON.parse(opts.body).p_ref,lead:{name:'Test'},attachments:[]});
    if(path==='/rest/v1/rpc/fp_intake_close')return reply({reference:JSON.parse(opts.body).p_ref,closed:'2026-11-22T10:00:00Z'});
    if(path==='/rest/v1/rpc/fp_intake_file')return reply({name:'Fläche.pdf',content_base64:btoa('%PDF-demo')});
    if (path === '/rest/v1/rpc/fp_office_quote_v2') {
      const args = JSON.parse(opts.body);
      assert.equal(args.p_issuer,'Beispiel GmbH, Anschrift');
      assert.deepEqual(args.p_items,[{id:'drei',quantity:2,revision:1}]);
      return reply({id:args.p_id,issuer:args.p_issuer,total_cents:64400});
    }
    throw new Error('Unexpected access '+path);
  };
  const handler = createOfficeHandler({SUPABASE_URL:'https://office.example',SUPABASE_SERVICE_ROLE_KEY:'fixture'},fetcher);
  function run(path,body,options={}) {
    return handler(new Request(officeUrl+path,{
      method:body===undefined?'GET':'POST',
      headers:{Origin:options.origin ?? origin,Cookie:options.cookie ?? '__Host-fp-office='+'a'.repeat(64),'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body)
    }));
  }
  return {run,calls};
}

test('private office accepts same-origin requests, rejects anonymous access and enforces viewer scope on the server',async()=>{
  const {run,calls}=fixtures('viewer');
  const guest=await run('state',undefined,{cookie:''});
  assert.equal(guest.status,401);assert.deepEqual(await guest.json(),{error:'Bitte anmelden.'});
  assert.equal((await run('editor-start',{},{origin:'https://other.example'})).status,403);
  const state = await run('state');
  const viewer=await state.json();assert.equal(viewer.role,'viewer');
  const links=viewer.handbook.groups.flatMap(([,items])=>items.map(([,href])=>href));
  assert(links.includes('/sitemap.xml')&&links.includes('/robots.txt'));assert(links.some(h=>h.endsWith('#gid=85317568')));
  assert(!links.some(h=>h.startsWith('https://github.com/')));
  assert.match(state.headers.get('Cache-Control'),/no-store/);
  for (const [route,body] of [['rate',{}],['quote',{}],['quotes',undefined],['cases',undefined],['case/AN-12345678ABCDEF12',undefined],['case/AN-12345678ABCDEF12/close',{confirm:true}],['files/AN-12345678ABCDEF12/1',undefined]]) {
    assert.equal((await run(route,body)).status,403,route);
  }
  assert.ok(calls.every(call=>['/rest/v1/fp_office_sessions','/rest/v1/fp_office_rates'].includes(call.path)));
});

test('IXA can open an inquiry and download a private attachment from the cloud store',async()=>{
  const {run}=fixtures('editor');
  const {handbook}=await (await run('state')).json();
  assert(handbook.groups.flatMap(([,items])=>items).some(([,href])=>href.startsWith('https://github.com/')));
  const list=await run('cases');
  const ref=(await list.json())[0].reference;
  const record=await run('case/'+ref);
  const entry=await record.json();
  assert.equal(entry.lead.name,'Test');assert.equal(entry.review.title,'Anfrage zuerst sichten');
  const file=await run('files/'+ref+'/1');
  assert.equal(file.status,200);
  assert.match(file.headers.get('Content-Disposition'),/attachment; filename\*=UTF-8''Fl%C3%A4che.pdf/);
  assert.equal(file.headers.get('Content-Type'),'application/octet-stream');
  assert.match(file.headers.get('Cache-Control'),/no-store/);
  assert.equal(await file.text(),'%PDF-demo');
  assert.equal((await run('case/'+ref+'/close',{})).status,400);
  const closed=await run('case/'+ref+'/close',{confirm:true});
  assert.equal((await closed.json()).closed,'2026-11-22T10:00:00Z');
});

test('office decisions disclose the relevant next step and private project links stay outside the public login bundle',()=>{
  const review=fields=>caseReview({jobScope:{fields:{items:'[{}]',fromFloor:'ground',...fields}}});
  assert.equal(caseReview({service:'rueckruf'}).title,'Rückruf vorbereiten');
  const callback=caseReview({service:'rueckruf',requestedService:'entsorgung',jobScope:{fields:{items:'[{}]',fromFloor:'ground',wasteRoute:'provider',materials:'special'}}});
  assert.equal(callback.title,'Rückruf vorbereiten');assert(callback.reasons.some(line=>line.includes('Besondere Stoffe')));
  assert.equal(caseReview({jobScope:{fields:{wasteRoute:'provider',materials:'special'}}}).title,'Fachleistung abgrenzen');
  assert.equal(review({}).title,'Kalkulation vorbereiten');
  assert.equal(review({fromParking:'blocked'}).title,'Offene Punkte prüfen');
  assert.equal(review({wasteRoute:'none',materials:'special'}).title,'Kalkulation vorbereiten');
  assert.equal(review({wasteRoute:'provider',materials:'wood,special'}).title,'Fachleistung abgrenzen');
  assert.match(review({loadWeightMode:'estimated',loadWeight:'1000,5'}).reasons.join(' '),/Zuladung/);
  const guestFiles=['admin/index.html','assets/office.js','assets/office-cases.js'].map(file=>
    readFileSync(new URL('../public/'+file,import.meta.url),'utf8')).join('\n');
  assert.doesNotMatch(guestFiles,/docs\.google\.com\/spreadsheets|search\.google\.com\/search-console|analytics\.google\.com/);
});

test('editor quotes derive their unit prices from the durable catalogue and stale price edits return a conflict',async()=>{
  const {run}=fixtures('editor');
  const payload={id:randomUUID(),issuer:'Beispiel GmbH, Anschrift',customer:'Muster',scope:'Testauftrag',
    items:[{id:'drei',quantity:2,revision:1,cents:7}]};
  const stored = await run('quote',payload);
  assert.equal(stored.status,200);
  assert.equal((await stored.json()).total_cents,64400);
  assert.equal((await run('rate',{id:'drei',label:'Umzug',scope:'Drei Stunden',unit:'Einsatz',revision:1,cents:32200})).status,409);
  assert.equal((await run('quote',{...payload,issuer:''})).status,400);
  assert.equal((await run('quote',{...payload,items:[{id:'drei',quantity:1000,revision:1}]})).status,400);
});
