import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {businessWhatsApp,phoneLines} from '../public/assets/phone-lines.js';

test('contact confirmations support a preflight-free POST while retaining the existing JSON contract',async t=>{
  let handle;
  globalThis.Deno={
    env:{get:name=>({SUPABASE_URL:'https://store.invalid',SUPABASE_SERVICE_ROLE_KEY:'mock'})[name]},
    serve:handler=>{handle=handler;}
  };
  t.after(()=>{delete globalThis.Deno;});
  const writes=[];
  t.mock.method(globalThis,'fetch',async (url,init)=>{
    assert.equal(url,'https://store.invalid/rest/v1/rpc/fp_record_event_detail');
    writes.push(JSON.parse(init.body));
    return Response.json('ok');
  });
  await import('../../supabase/functions/office-events/index.ts');
  const origin='https://frankenpakt.de';
  const body={id:randomUUID(),event:'contact_intent',service:'entsorgung',source:'direkt',count:1,consent:true};
  const plain='text/plain;charset=UTF-8';
  const post=(value,contentType=plain,source=origin)=>handle(new Request('https://events.invalid/office-events',{
    method:'POST',headers:{origin:source,'content-type':contentType},body:JSON.stringify(value)
  }));
  for(const contactChannel of ['phone','whatsapp']){
    const event={...body,id:randomUUID(),contactChannel};
    const response=await post(event);
    assert.equal(response.status,204);
    assert.equal(response.headers.get('access-control-allow-origin'),origin);
    assert.equal(writes.at(-1).contact_method,contactChannel);
    assert.equal(writes.at(-1).eid,event.id);
  }
  assert.equal((await post({...body,event:'upload_ready'},'application/json')).status,204);
  assert.equal((await post({...body,contactChannel:'phone'},'application/json')).status,204);
  const accepted=writes.length;
  assert.equal((await post(body)).status,400);
  assert.equal((await post({...body,contactChannel:'email'})).status,400);
  assert.equal((await post({...body,event:'upload_ready'})).status,400);
  assert.equal((await post({...body,event:'callback_requested'})).status,400);
  assert.equal((await post({...body,contactChannel:'phone',consent:false})).status,403);
  assert.equal((await post({...body,contactChannel:'phone'},plain,'https://foreign.invalid')).status,403);
  assert.equal((await post({...body,contactChannel:'phone'},'application/x-www-form-urlencoded')).status,415);
  assert.equal(writes.length,accepted);

  await t.test('a consented WhatsApp website visit is stored with its entry placement and never counted as an inquiry', async ()=>{
    const attribution={landing:'/entsorgung/',medium:'messenger',campaign:'katalog'};
    const visit={...body,id:randomUUID(),event:'whatsapp_visit',source:'whatsapp',attribution};
    for (const campaign of ['profil','chat','katalog','status']) {
      const tagged={...attribution,campaign};
      assert.equal((await post({...visit,attribution:tagged},'application/json')).status,204);
      const saved=writes.at(-1);
      assert.equal(saved.kind,'whatsapp_visit');
      assert.equal(saved.channel,'whatsapp');
      assert.deepEqual(saved.attribution,tagged);
    }
    const seen=writes.length;
    for(const patch of [{source:'direkt'},{attribution:null},{attribution:{...attribution,medium:'cpc'}},
        {attribution:{...attribution,campaign:'unknown'}},{attribution:{...attribution,landing:'/internal/'}},
        {attribution:{...attribution,gclid:'not-allowed'}},{contactChannel:'whatsapp'}]) {
      assert.equal((await post({...visit,...patch},'application/json')).status,400);
    }
    assert.equal((await post({...visit,consent:false},'application/json')).status,403);
    assert.equal((await post(visit,plain)).status,400);
    assert.equal(writes.length,seen);
  });

  await t.test('resolving a contact destination records only the requested channel and a server-generated ID', async ()=>{
    const endpoint='https://events.invalid/office-events/handoff';
    const invoke=(action,headers={},url=endpoint)=>handle(new Request(url,{
      method:'POST',headers:{origin,'content-type':plain,...headers},body:JSON.stringify(action)
    }));
    for (const channel of ['phone','whatsapp']) {
      const action={channel};
      const response=await invoke(action,{'x-forwarded-for':'192.0.2.1',referer:origin+'/preise/?src=private'});
      assert.equal(response.status,200);
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.deepEqual(await response.json(),{destinations:channel==='phone'
        ? [phoneLines.main,phoneLines.google,phoneLines.kleinanzeigen].map(line=>'tel:'+line.phone)
        : ['https://wa.me/'+businessWhatsApp.slice(1)]});
      const record=writes.at(-1);
      assert.match(record.rate_bucket,/^[a-f0-9]{64}$/);
      assert.match(record.eid,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.deepEqual(record,{eid:record.eid,kind:'contact_intent',category:'unbekannt',channel:'unbekannt',
        rate_bucket:record.rate_bucket,access_digest:null,attribution:null,contact_method:channel});
      assert.equal((await invoke(action,{'x-forwarded-for':'192.0.2.2'},'https://events.invalid/functions/v1/office-events/handoff')).status,200);
      assert.notEqual(writes.at(-1).eid,record.eid);
      assert.deepEqual({...writes.at(-1),eid:record.eid},record);
    }
    const before=writes.length,valid={channel:'phone'};
    for (const input of [{...valid,consent:false},{...valid,gclid:'private'},{...valid,service:'umzug'},
        {...valid,id:randomUUID()},{...valid,channel:'email'},{},null]) {
      assert.equal((await invoke(input)).status,400);
    }
    assert.equal((await invoke(valid,{},endpoint+'?utm_term=test')).status,400);
    assert.equal((await invoke(valid,{'content-type':'application/json'})).status,415);
    assert.equal((await invoke(valid,{origin:'https://foreign.invalid'})).status,403);
    assert.equal((await invoke(valid,{origin:''})).status,403);
    assert.equal((await invoke(valid,{'sec-fetch-site':'cross-site'})).status,403);
    assert.equal((await handle(new Request(endpoint,{method:'GET'}))).status,405);
    assert.equal(writes.length,before);
  });
});
