import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';

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
});
