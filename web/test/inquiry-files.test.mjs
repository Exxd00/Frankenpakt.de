import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {gzipSync,inflateRawSync} from 'node:zlib';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../lib/leads.mjs';
import {mailAttachment} from '../lib/attachments.mjs';
import {startServer} from '../server.mjs';
import {deliverOfficeEvents} from '../lib/office-events.mjs';

test('accepted web submissions queue only anonymous operational events with stable retry IDs',async()=>{
  const db=openStore(':memory:');
  try{
    const lead={requestId:randomUUID(),service:'rueckruf',requestedService:'umzug',source:'direkt',name:'privat',
      contactMethod:'phone',contact:'+491713920012'};
    db.submit(lead,0,false,'web',null,[],true);db.submit(lead,1,false,'web',null,[],true);
    const requests=[];let now=100;
    const send=async(url,init)=>{
      assert.ok(url.endsWith('/functions/v1/office-events'));assert.equal(init.headers.Authorization,'Bearer test');
      const payload=JSON.parse(init.body);requests.push(payload);assert.deepEqual(Object.keys(payload).sort(),['count','event','id','service','source']);
      return new Response(null,{status:requests.length===1?503:201});
    };
    await deliverOfficeEvents(db.officeEvents,'test',{send,clock:()=>now});now+=31000;
    await deliverOfficeEvents(db.officeEvents,'test',{send,clock:()=>now});
    assert.equal(requests.length,3);assert.equal(requests[0].id,requests[2].id);
    assert.deepEqual(new Set(requests.map(r=>r.event)),new Set(['inquiry_received','callback_requested']));
  }finally{db.close();}
});

test('file inquiry stores private originals atomically, deduplicates retries, attaches compact files, and erases with lead',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fp-test-attachments-'));
  const env={SITE_MODE:'live',PUBLIC_ORIGIN:'https://test.invalid',LEAD_DATA_DIR:dir,
    OPERATOR_NAME:'Beispiel',LEGAL_ADDRESS:'Beispielweg 1',CONTACT_PHONE:'09110000000',CONTACT_EMAIL:'desk@example.invalid',
    OPS_MAIL_FROM:'noreply@example.invalid',OPS_MAIL_TO:'desk@example.invalid',OPS_MAIL_API_KEY:'synthetic',OPS_OFFICE_FILE_TOKEN:'T'.repeat(40)};
  let received;const outgoing=new Promise(r=>{received=r;});
  const server=startServer({port:0,env,sendStaffMail:async(_url,init)=>{received(JSON.parse(init.body));return Response.json({id:'test'});}});
  await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  const store=openStore(path.join(dir,'leads.sqlite'));
  t.after(async()=>{const closed=once(server,'close');server.close();server.closeAllConnections();await closed;store.close();await rm(dir,{recursive:true,force:true});});
  const refId=randomUUID(),pdf=Buffer.from('%PDF-1.4\n'+'A'.repeat(8000)+'\n%%EOF\n');
  const fields={requestId:refId,service:'umzug',contactMethod:'email',email:'test@example.invalid',name:'Beispiel',zipFrom:'90453'};
  const submit=(file,name='Inventar.pdf',origin=env.PUBLIC_ORIGIN,body=fields)=>{
    const form=new FormData();form.append('inquiry',JSON.stringify(body));form.append('attachment',new Blob([gzipSync(file)],{type:'application/gzip'}),name);
    return fetch(base+'/api/leads',{method:'POST',headers:{origin},body:form});
  };
  const accepted=await submit(pdf);assert.equal(accepted.status,201);const {reference}=await accepted.json();
  const stored=store.get(reference);assert.equal(stored.attachments[0].name,'Inventar.pdf');
  const lookup='/api/office-file/'+reference+'/1';
  assert.equal((await fetch(base+lookup)).status,403);
  const get=()=>fetch(base+lookup,{headers:{Authorization:'Bearer '+env.OPS_OFFICE_FILE_TOKEN}});
  const raw=await get();assert.equal(raw.status,200);assert.match(raw.headers.get('content-disposition'),/^attachment/);assert.deepEqual(Buffer.from(await raw.arrayBuffer()),pdf);
  const mail=await outgoing;assert.equal(mail.attachments.length,1);assert.equal(mail.attachments[0].filename,'Inventar.pdf.zip');
  const zip=Buffer.from(mail.attachments[0].content,'base64');assert.ok(zip.length<pdf.length);
  const start=30+zip.readUInt16LE(26);assert.deepEqual(inflateRawSync(zip.subarray(start,start+zip.readUInt32LE(18))),pdf);
  assert.equal((await submit(pdf)).status,200);
  assert.equal((await submit(Buffer.concat([pdf,Buffer.from(' ')]))).status,409);
  assert.equal((await submit(pdf,'Inventar.pdf','https://outside.invalid')).status,403);
  assert.equal((await submit(Buffer.from('not PDF'))).status,400);
  assert.equal((await submit(pdf,'Inventar.exe')).status,400);
  assert.equal((await submit(Buffer.from('%PDF-1.4\n'+'x'.repeat(9*1024*1024)+'\n%%EOF'))).status,400);
  store.erase(reference);assert.equal((await get()).status,404);
  const jpeg=Buffer.from([255,216,255,217]);assert.equal(mailAttachment({name:'Bild.jpg',mime:'image/jpeg',content:jpeg}).filename,'Bild.jpg');
});
