import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCloudIntake} from '../intake/intake.mjs';
import {exampleJobScope} from '../test-support/job-scope.mjs';
import {renderLeadMail} from '../lib/lead-mail.mjs';

const origin='https://frankenpakt.vercel.app';
test('cloud intake keeps consented campaign data on a lead without breaking retry identity',async()=>{
  const {api,submitted}=endpoint();
  const callback={service:'rueckruf',requestedService:'entsorgung',source:'google',requestId:randomUUID(),contactMethod:'phone',name:'Test',phone:'09110000001'};
  const attribution={landing:'/sofa-entsorgen/',medium:'cpc',campaign:'1234567891234567890',keyword:'sofa entsorgen nürnberg'};
  assert.equal((await api(request({...callback,attribution}))).status,201);
  assert.equal(submitted[0].p_lead.attribution,undefined);
  assert.equal((await api(request({...callback,attribution:{...attribution,q:'private'},statisticsConsent:true}))).status,201);
  assert.deepEqual(submitted[1].p_lead.attribution,attribution);
  assert.equal(submitted[0].p_fingerprint,submitted[1].p_fingerprint);
});
function request(data,path='leads') {
  return new Request('https://edge.invalid/frankenpakt-intake/'+path,{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)
  });
}
function endpoint(active=true){
  const submitted=[];
  const api=createCloudIntake({SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:'local-only'},async(url,init)=>{
    const action=new URL(url).pathname.split('/').pop();
    switch(action){
      case 'fp_intake_live':return Response.json(active);
      case 'fp_office_gate':return Response.json(true);
      case 'fp_intake_submit':submitted.push(JSON.parse(init.body));return Response.json({reference:'AN-1122334455667788',created:true});
      default:throw new Error(action);
    }
  });
  return {api,submitted};
}
test('company quote fields reach the private case and escaped staff email, separately from attribution',async()=>{
  const {api,submitted}=endpoint();
  const raw={requestId:randomUUID(),service:'umzug',contactMethod:'email',email:'einkauf@example.invalid',name:'Testperson',jobScope:exampleJobScope('umzug'),source:'google'};
  const business={project:'bueroumzug',company:'Firma <Büro>',reference:'Einkauf 23',offerBy:'2027-01-20',logistics:'Empfang ab 08 Uhr',recipient:'Muster GmbH\nEinkauf'};
  const post=async extra=>(await api(request({...raw,...extra}))).status;
  const landing='/bueroumzug-nuernberg/';
  assert.equal(await post({business,statisticsConsent:true,attribution:{landing,company:business.company}}),201);
  const lead=submitted[0].p_lead;
  assert.deepEqual(lead.business,business);
  assert.deepEqual(lead.attribution,{landing});
  const msg=renderLeadMail({service:lead.service,person:lead});
  assert.equal(msg.subject,'Firmenanfrage · Büroumzug');
  for(const phrase of ['Firma &lt;Büro&gt;','20.01.2027',business.reference,business.logistics,'Muster GmbH Einkauf'])assert.ok(msg.html.includes(phrase));
  assert.ok(!msg.html.includes('Firma <Büro>'));
  assert.equal(await post({business:{...business,company:' '}}),400);
  assert.equal(await post({business:{...business,project:'hausverwaltung'}}),400);
  assert.equal(await post({business:{...business,offerBy:'2027-02-31'}}),400);
  assert.equal(await post({business:{...business,project:'toString'}}),400);
  assert.equal(await post({}),201);
  assert.equal(submitted[1].p_lead.business,undefined);
  assert.deepEqual(lead.priceOrientation,submitted[1].p_lead.priceOrientation);
});
test('company callback allows a short contact request and discards offer-only fields',async()=>{
  const {api,submitted}=endpoint();
  const callback={service:'rueckruf',requestedService:'entsorgung',requestId:randomUUID(),contactMethod:'phone',name:'Test',phone:'09110000001',business:{project:'bueromoebel',reference:'stale'}};
  assert.equal((await api(request(callback))).status,201);
  const lead=submitted[0].p_lead;
  assert.deepEqual(lead.business,{project:'bueromoebel',company:''});
  const mail=renderLeadMail({service:lead.service,person:lead});
  assert.match(mail.subject,/Firmenrückruf/);
  assert.match(mail.text,/Büromöbel/);
  assert.equal(lead.attribution,undefined);
});
test('cloud uses edited scope to derive the starting price and ignores an injected client amount',async()=>{
  const {api,submitted}=endpoint();
  const jobScope=exampleJobScope('entruempelung');
  const base={service:'entruempelung',requestId:randomUUID(),source:'google',name:'Beispiel',contactMethod:'email',email:'a@example.invalid',jobScope,priceOrientation:{estimatedCents:1}};
  const r=await api(request(base));
  assert.equal(r.status,201);assert.equal(submitted.length,1);
  assert.equal(submitted[0].p_lead.priceOrientation.estimatedCents,14800);
  assert.equal(submitted[0].p_test,false);assert.deepEqual(submitted[0].p_files,[]);
  jobScope.fields.areaSqm='10';
  assert.equal((await api(request({...base,requestId:randomUUID()}))).status,201);
  assert.equal(submitted[1].p_lead.priceOrientation.estimatedCents,34800);
});
test('cloud gates editor-only QA and accepts only valid live callback or complete scoped inquiry',async()=>{
  const {api,submitted}=endpoint();
  const callback={service:'rueckruf',requestId:randomUUID(),contactMethod:'phone',name:'Test',phone:'09110000001'};
  assert.equal((await api(request(callback,'pruefung'))).status,403);
  assert.equal((await api(request({...callback,service:'umzug',zipFrom:'90453'}))).status,400);
  const active=await api(request(callback));assert.equal(active.status,201);assert.equal(submitted.length,1);
  assert.equal((await endpoint(false).api(request(callback))).status,503);
  assert.equal((await api(request({},'flush'))).status,403);
});
