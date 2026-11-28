import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicMetric,mountMetrics} from '../public/assets/metrics.js';
import {businessServices,guideServices} from '../public/assets/search-routes.js';
import {adKeywords,campaignVisit,cleanAttribution} from '../public/assets/campaign-attribution.js';
import {carryContactCampaign,contactCampaign} from '../public/assets/contact-channel.js';
import {readFileSync} from 'node:fs';

const url = new URL('https://frankenpakt.de/anfrage/?src=google&person=PRIVATE-TEST&service=umzug#PRIVATE-TEST');
const uuid = () => '469053a8-77e0-4ec7-b777-ed2482b07ffa';
test('a single Google Ads click ID keeps case and is never inferred from a different identifier',()=>{
  const visit=(query)=>campaignVisit(new URL('/?'+query,url),{sessionStorage:{getItem:()=>null,setItem(){}}}).attribution;
  for (const value of ['Ab_C-091','001234567890123456','1E23','TRUE']) {
    assert.equal(visit('gclid='+value).gclid,value);
  }
  for (const query of ['gclid=A&gclid=B','gclid=%2Bcmd','gclid=%3D1','gclid=a%0Ab','gclid=alice%40example.com',
    'gbraid=Ab_C-091','wbraid=Ab_C-091','src=kleinanzeigen&gclid=Ab_C-091','utm_medium=organic&gclid=Ab_C-091','gclid='+'A'.repeat(513)]) {
    assert.equal(visit(query).gclid,undefined,query);
  }
});
test('only bought keywords enter the sheet and a fresh arrival in a reused tab starts a new visit',()=>{
  const plan=JSON.parse(readFileSync(new URL('../../kampagnen/anzeigen.json',import.meta.url),'utf8'));
  assert.deepEqual([...adKeywords].sort(),[...new Set(plan.groups.flatMap(g=>g.keywords))].sort());
  const data=new Map();
  const win={sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},performance:{getEntriesByType:()=>[{type:'navigate'}]}};
  const paid=new URL('/sofa-entsorgen/?src=google&utm_medium=cpc&utm_campaign=1234567891234567890&utm_term=Sofa+entsorgen+N%C3%BCrnberg&gclid=Mixed_Qa-42',url);
  const ad=campaignVisit(paid,win,'https://www.google.de/search?q=private');
  assert.deepEqual(ad,{source:'google',attribution:{landing:'/sofa-entsorgen/',medium:'cpc',campaign:'1234567891234567890',keyword:'sofa entsorgen nürnberg',gclid:'Mixed_Qa-42'}});
  assert.deepEqual(campaignVisit(new URL('/anfrage/?src=google',url),win,paid.href),ad);
  win.performance.getEntriesByType=()=>[{type:'reload'}];
  assert.deepEqual(campaignVisit(new URL('/danke/',url),win,''),ad);
  win.performance.getEntriesByType=()=>[{type:'navigate'}];
  assert.deepEqual(campaignVisit(new URL('/umzug/',url),win,'https://www.google.de/search?q=private'),{source:'google',attribution:{landing:'/umzug/',medium:'organic'}});
  campaignVisit(paid,win);
  assert.deepEqual(campaignVisit(new URL('/',url),win,'https://example.org/sensitive?q=private'),{source:'sonstige',attribution:{landing:'/',medium:'referral'}});
  campaignVisit(paid,win);
  assert.deepEqual(campaignVisit(new URL('/',url),win,''),{source:'direkt',attribution:{landing:'/'}});
  assert(!JSON.stringify([...data]).includes('private'));
  for(const term of ['info@example.invalid','=IMPORTDATA(1)','{keyword}','meine persönliche Suchanfrage']){
    assert.deepEqual(cleanAttribution({landing:'/',medium:'cpc',keyword:term,campaign:'=1'},'google'),{landing:'/',medium:'cpc'});
  }
  assert.deepEqual(cleanAttribution({...ad.attribution,medium:'organic'},'google'),{landing:'/sofa-entsorgen/',medium:'organic'});
  assert.equal(cleanAttribution({landing:'/admin/?token=private'},'google'),null);
});
test('malformed Google IDs and contradictory channel tags do not create paid Google visits',()=>{
  const visit = query => campaignVisit(new URL('/?'+query,url),{});
  for (const query of ['gclid=', 'gclid=%2B12', 'gclid=A&gclid=B','gbraid=', 'wbraid=%40address']) {
    assert.deepEqual(visit(query),{source:'direkt',attribution:{landing:'/'}},query);
  }
  for (const query of ['src=google&utm_source=kleinanzeigen','utm_medium=cpc&utm_medium=organic','src=google&src=google']) {
    assert.deepEqual(visit(query+'&gclid=Valid_Id'),{source:'unbekannt',attribution:{landing:'/'}},query);
  }
  assert.deepEqual(visit('src=google&utm_source=google&utm_medium=cpc&gclid=Valid_Id'),
    {source:'google',attribution:{landing:'/',medium:'cpc',gclid:'Valid_Id'}});
  assert.deepEqual(visit('utm_source=bing&utm_medium=cpc&gclid=Other'),
    {source:'sonstige',attribution:{landing:'/',medium:'cpc'}});
});
test('guide and commercial service pages record the correct category and exclude query text',()=>{
  assert.ok(Object.keys(guideServices).length>0);
  for(const [path,service] of Object.entries({...guideServices,...businessServices})){
    const loc=new URL(path+'?thema=PRIVATE-TEST',url);
    const event=publicMetric('service_chosen',null,loc,uuid);
    assert.equal(event.service,service);
    assert(!JSON.stringify(event).includes('PRIVATE-TEST'));
  }
  assert.equal(publicMetric('service_chosen',null,new URL('/private-job/',url),uuid),null);
});
test('only allowlisted website routing, category and event fields can reach the provider',()=>{
  const row=publicMetric('upload_ready','PRIVATE-TEST',url,uuid);
  assert.deepEqual(row,{id:uuid(),event:'upload_ready',service:'umzug',source:'google',count:1,consent:true});
  assert.equal(publicMetric('inquiry_received','umzug',url,uuid),null);
  assert.equal(publicMetric('upload_ready','umzug',new URL('/admin/?ref=PRIVATE-TEST',url),uuid),null);
  assert.equal(publicMetric('upload_ready','umzug',new URL('https://unrelated.invalid/'),uuid),null);
  const unknown=publicMetric('service_chosen',null,new URL('https://frankenpakt.de/?src=PRIVATE-TEST'),uuid);
  assert.equal(unknown.source,'unbekannt');assert.equal(unknown.service,'unbekannt');
});

function statisticsControls(doc) {
  const button = () => new EventTarget();
  const settings=button(), details=button(), dialog=button(), prompt={}, status={};
  const accept=button(), decline=button(), close=button();
  settings.setAttribute=(name,value)=>{settings[name]=value;};
  dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;};
  accept.dataset={statisticsChoice:'yes'};
  decline.dataset={statisticsChoice:'no'};
  const nodes={'[data-statistics]':settings,'[data-cookie-prompt]':prompt,'#statistics-settings':dialog,
    '[data-statistics-details]':details,'[data-statistics-close]':close,'[data-statistics-status]':status};
  doc.querySelector=selector=>nodes[selector];
  doc.querySelectorAll=selector=>selector==='[data-statistics-choice]'?[accept,decline]:[];
  return {accept,decline,settings,details,dialog,prompt,status,close,nodes};
}
const click=button=>button.dispatchEvent(new Event('click'));

test('an approved WhatsApp entry keeps its placement through calculator and inquiry without propagating private tags',()=>{
  for (const placement of ['profil','chat','katalog','status']) {
    const data=new Map(),win={sessionStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
    const landing=new URL('/sofa-entsorgen/?utm_source=WhatsApp&utm_medium=messenger&utm_campaign='+placement+'&gclid=Hide&utm_term=Private',url);
    const visit=campaignVisit(landing,win);
    assert.deepEqual(visit,{source:'whatsapp',attribution:{landing:'/sofa-entsorgen/',medium:'messenger',campaign:placement}});
    let previous=landing;
    for(const path of ['/preise/','/anfrage/']){
      const next=new URL(path,url);
      carryContactCampaign(next.searchParams,contactCampaign(previous.searchParams));
      assert.equal(next.search,'?src=whatsapp');
      assert.equal(contactCampaign(next.searchParams).phoneChannel,'main');
      assert.deepEqual(campaignVisit(next,win,previous.href),visit);
      previous=next;
    }
    assert.equal(campaignVisit(new URL('/',url),win,'').source,'direkt');
  }
});

test('only an explicitly tagged, consented WhatsApp landing counts, once across refresh and renewed consent',()=>{
  for(const [query,placement] of [
    ['utm_source=whatsapp&utm_medium=messenger&utm_campaign=profil','profil'],
    ['src=whatsapp',''], ['utm_source=whatsapp&utm_campaign=chat',''],
    ['utm_source=whatsapp&utm_medium=messenger&utm_campaign=arbitrary',''],
    ['utm_source=whatsapp&utm_source=google&utm_medium=messenger&utm_campaign=status',''],
    ['utm_source=whatsapp&utm_medium=messenger&utm_campaign=chat&utm_campaign=profil','']
  ]){
    const loc=new URL('/?'+query,url),doc=new EventTarget(), win=new EventTarget(),history={state:{sentinel:1},replaceState(next){this.state=next;}};
    win.history=history;
    const controls=statisticsControls(doc),received=[],ga=[],starts=[],choices=new Map();
    const mount=()=>mountMetrics({doc,win,location:loc,storage:{getItem:k=>choices.get(k),setItem:(k,v)=>choices.set(k,v)},uuid,
      send:async (_target,init)=>{received.push(JSON.parse(init.body));return {status:204};},
      frameFactory:traffic=>{starts.push(traffic);return {send:metric=>ga.push(metric),close(){}};}});
    mount();click(controls.decline);assert.equal(received.length,0);
    click(controls.accept);click(controls.decline);click(controls.accept);mount();
    assert.equal(history.state.sentinel,1);
    assert.equal(received.length,placement?1:0,query);
    assert.equal(ga.length,received.length);
    if(placement){
      assert.deepEqual(starts[0],{source:'whatsapp',medium:'messenger',campaign:placement});
      assert.deepEqual(received[0],{id:uuid(),event:'whatsapp_visit',source:'whatsapp',service:'unbekannt',
        attribution:{landing:'/',medium:'messenger',campaign:placement},count:1,consent:true});
      assert.equal(ga[0].event,'whatsapp_visit');
    }
  }
});

test('independent statistics prompt respects refusal, settings changes, and revocation from another tab',()=>{
  const doc=new EventTarget(), win=new EventTarget();
  const controls=statisticsControls(doc);
  controls.nodes['#service']={value:'entsorgung'};
  const storage=new Map(), pref={getItem:key=>storage.get(key),setItem:(key,v)=>storage.set(key,v)};
  const requests=[],frames=[],sent=[];
  const send=async(url,init)=>{requests.push({url,init});};
  const frameFactory=()=>{const entry={send:(m,p)=>sent.push([m,p]),close:()=>entry.closed=true};frames.push(entry);return entry;};
  mountMetrics({doc,win,location:url,storage:pref,send,uuid,frameFactory});
  const file=()=>doc.dispatchEvent(new CustomEvent('fp-upload-ready',{detail:{filename:'PRIVATE-TEST.pdf',email:'PRIVATE-TEST'}}));
  file();assert.equal(controls.prompt.hidden,false);assert.equal(requests.length,0);assert.equal(frames.length,0);
  click(controls.details); assert.equal(controls.dialog.open,true);
  click(controls.close); assert.equal(controls.dialog.open,false); assert.equal(controls.prompt.hidden,false);
  click(controls.decline);file();assert.equal(controls.prompt.hidden,true);assert.equal(requests.length,0);
  click(controls.settings);assert.equal(controls.dialog.open,true);assert.equal(frames.length,0);
  click(controls.accept);assert.equal(controls.dialog.open,false);assert.equal(frames.length,1);
  file();
  assert.equal(requests.length,1);const {init}=requests[0];const data=JSON.parse(init.body);
  assert.deepEqual(data,{id:uuid(),event:'upload_ready',service:'entsorgung',source:'google',attribution:{landing:'/anfrage/'},count:1,consent:true});
  assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');
  assert.deepEqual(sent,[[{event:data.event,source:data.source,service:data.service},'/anfrage/']]);assert.equal(JSON.stringify(requests).includes('PRIVATE-TEST'),false);
  click(controls.settings);click(controls.decline);file();assert.equal(frames[0].closed,true);assert.equal(requests.length,1);
  click(controls.settings);click(controls.accept);assert.equal(frames.length,2);
  storage.set('frankenpakt.statistik.v2','no');
  const otherTab=new Event('storage');otherTab.key='frankenpakt.statistik.v2';win.dispatchEvent(otherTab);
  file();assert.equal(frames[1].closed,true);assert.equal(requests.length,1);
});

test('only an opted-in attributed submission claims the handoff from the contact resolver',async()=>{
  for (const channel of ['phone','whatsapp']) {
    const doc=new EventTarget(), win=new EventTarget(), rows=[], ga=[];
    const controls=statisticsControls(doc);
    const choices=new Map(), storage={getItem:k=>choices.get(k),setItem:(k,v)=>choices.set(k,v)};
    const send=async (destination,options)=>{
      rows.push({destination,options});
      return {status:rows.length===1?503:204};
    };
    mountMetrics({doc,win,location:url,storage,send,uuid,frameFactory:()=>({send:(...args)=>ga.push(args),close(){}})});
    function action(type,detail={}) {
      const name=type==='handoff'?'fp-contact-confirmation':'fp-contact-'+type;
      return !doc.dispatchEvent(new CustomEvent(name,{cancelable:true,detail:{channel,placement:'footer',text:'PRIVATE-TEST',...detail}}));
    }
    assert.equal(action('handoff'),false);
    click(controls.decline);
    assert.equal(action('handoff',{oneTimeConsent:true}),false);
    assert.equal(rows.length,0);assert.equal(ga.length,0);
    click(controls.settings);click(controls.accept);
    action('intent');action('cancel');
    assert.deepEqual(ga.map(([metric])=>metric.event),[channel+'_click',channel+'_cancelled']);
    assert.equal(rows.length,0);
    assert.equal(action('handoff'),true);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(rows.length,2);
    assert.equal(rows[0].destination,'/api/contact-confirmation');
    assert.match(rows[1].destination,/^https:\/\/[^/]+\.supabase\.co\/functions\/v1\/office-events$/);
    assert.equal(rows[1].options.body,rows[0].options.body);
    assert.equal(rows[1].options.referrerPolicy,'no-referrer');
    const {options}=rows[0];
    assert.deepEqual(JSON.parse(options.body),{id:uuid(),event:'contact_intent',service:'umzug',source:'google',
      attribution:{landing:'/anfrage/'},count:1,consent:true,contactChannel:channel});
    assert.equal(options.credentials,'omit');assert.equal(options.keepalive,true);assert.equal(options.referrerPolicy,'origin');
    assert.equal(options.headers['Content-Type'],'text/plain;charset=UTF-8');
    assert.deepEqual(ga.map(([metric])=>metric.event),[channel+'_click',channel+'_cancelled',channel+'_confirmed']);
    click(controls.settings);click(controls.decline);assert.equal(action('handoff'),false);
    assert.equal(rows.length,2);assert.equal(ga.length,3);
    assert(!JSON.stringify({rows,ga}).includes('PRIVATE-TEST'));
  }
});

test('restoring a page from the back-forward cache restores exactly one consented contact handler',()=>{
  const doc=new EventTarget(), win=new EventTarget(), controls=statisticsControls(doc), rows=[], frames=[];
  const session=new Map();
  win.sessionStorage={getItem:key=>session.get(key),setItem:(key,value)=>session.set(key,value),removeItem:key=>session.delete(key)};
  const choices=new Map(), storage={getItem:k=>choices.get(k),setItem:(k,v)=>choices.set(k,v)};
  mountMetrics({doc,win,location:url,storage,uuid,
    send:async(_url,options)=>{rows.push(options);return {status:204};},
    frameFactory:()=>{const frame={send(){},close:()=>frame.closed=true};frames.push(frame);return frame;}});
  click(controls.accept);
  win.dispatchEvent(new Event('pagehide'));
  assert.equal(frames[0].closed,true);
  win.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));
  assert.equal(controls.prompt.hidden,true);assert.equal(frames.length,2);
  assert.equal(session.size,1);
  doc.dispatchEvent(new CustomEvent('fp-contact-handoff',{detail:{channel:'whatsapp'}}));
  assert.equal(rows.length,1);
  win.dispatchEvent(new Event('pagehide'));
  choices.set('frankenpakt.statistik.v2','no');
  win.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));
  doc.dispatchEvent(new CustomEvent('fp-contact-handoff',{detail:{channel:'phone'}}));
  assert.equal(frames.length,2);assert.equal(rows.length,1);
  assert.equal(session.size,0);
});

test('a choice applies for the page when browser storage is disabled, and refusal cancels a pending retry',async()=>{
  const doc=new EventTarget(), win=new EventTarget(), controls=statisticsControls(doc);
  const denied=()=>{throw new Error('storage disabled');};
  const recorded=[];
  let serviceResponse;
  mountMetrics({doc,win,location:url,storage:{getItem:denied,setItem:denied},uuid,
    send:(_url,options)=>{recorded.push(options);return new Promise(resolve=>{serviceResponse=resolve;});},
    frameFactory:()=>({send(){},close(){}})});
  click(controls.accept);
  doc.dispatchEvent(new CustomEvent('fp-contact-handoff',{detail:{channel:'phone'}}));
  assert.equal(recorded.length,1);
  click(controls.settings);click(controls.decline);
  serviceResponse({status:503});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(recorded.length,1);
});

test('only the first view of an opted-in live receipt measures a GA lead, without sending another event to Sheets',()=>{
  const location=new URL('https://frankenpakt.de/danke/?src=google&name=PRIVATE');
  for(const callback of [false,true]){
    const lead={mode:'live',reference:'AN-ABCDEF0123456789',service:'umzug',callback};
    const history={state:{frankenpacktReceipt:lead,frankenpacktMeasureLead:true},replaceState(next){this.state=next;}};
    const remembered=new Map();
    const win=Object.assign(new EventTarget(),{history,sessionStorage:{getItem:key=>remembered.get(key),setItem:(key,value)=>remembered.set(key,value)}});
    const doc=new EventTarget(),toggle=new EventTarget();
    toggle.setAttribute=()=>{};
    doc.querySelector=selector=>selector==='[data-statistics]'?toggle:null;doc.querySelectorAll=()=>[];
    const sent=[];
    const mount=(optIn=true)=>mountMetrics({doc,win,location,storage:{getItem:()=>optIn?'yes':'no'},
      send:()=>assert.fail('Saved leads are already logged by the server.'),
      frameFactory:()=>({send:(...args)=>sent.push(args)})});
    mount(); mount();
    history.state={frankenpacktMeasureLead:true,frankenpacktReceipt:lead};mount();
    assert.deepEqual(sent,[[{event:'generate_lead',service:'umzug',source:'google'},'/danke/',{leadType:callback?'callback':'quote'}]]);
    assert.equal(history.state.frankenpacktReceipt,lead);
    history.state.frankenpacktMeasureLead=true;mount(false);mount();
    history.state={frankenpacktMeasureLead:true,frankenpacktReceipt:{...lead,mode:'preview'}};mount();
    assert.equal(sent.length,1);
    history.state={frankenpacktMeasureLead:true,frankenpacktReceipt:{...lead,reference:'AN-ABCDEF0123456780'}};mount();
    assert.equal(sent.length,2);
    assert(!JSON.stringify(sent).includes('AN-'));
  }
});

test('the analytics frame receives consented traffic categories only',()=>{
  const doc=new EventTarget(), win=new EventTarget(), toggle=new EventTarget(), started=[];
  toggle.setAttribute=()=>{};
  doc.querySelector=selector=>selector==='[data-statistics]'?toggle:null;doc.querySelectorAll=()=>[];
  const location=new URL('https://frankenpakt.de/sofa-entsorgen/?src=google&utm_medium=cpc&utm_campaign=12345&utm_term=sofa+entsorgen+n%C3%BCrnberg&gclid=Private');
  mountMetrics({doc,win,location,storage:{getItem:()=>'yes'},frameFactory:traffic=>{started.push(traffic);return {};}});
  assert.deepEqual(started,[{source:'google',medium:'cpc'}]);
});

test('first actual inquiry edit counts once by form kind and contact placement is an enumerated GA dimension',()=>{
  for (const callback of [true,false]) {
    const controls = new Map(), doc = new EventTarget(), win = new EventTarget(), toggle = new EventTarget();
    const inquiry = {
      addEventListener:(kind,fn)=>controls.set(kind,fn),
      removeEventListener:kind=>controls.delete(kind)
    };
    toggle.setAttribute=()=>{};
    const submit={disabled:true};
    const nodes={'[data-statistics]':toggle,'#lead-form':inquiry,'#contact-dialog[data-contact-mode="live"]':{},
      '#send-lead':submit,'#callback-window':{hidden:!callback},'#service':{value:callback?'':'entsorgung'}};
    doc.querySelector=selector=>nodes[selector];doc.querySelectorAll=()=>[];
    const sent=[],rows=[];
    mountMetrics({doc,win,location:new URL('https://frankenpakt.de/anfrage/'),storage:{getItem:()=>'yes'},uuid,
      send:async (_url,init)=>rows.push(JSON.parse(init.body)),frameFactory:()=>({send:(...args)=>sent.push(args)})});
    const target={matches:()=>true,get value(){throw Error('Private field read');}};
    const edit=isTrusted=>controls.get('input')?.({isTrusted,target});
    edit(true);submit.disabled=false;edit(false);
    assert.equal(sent.length,0);
    edit(true);edit(true);
    assert.equal(controls.size,0);
    assert.deepEqual(sent,[[{event:'form_start',service:callback?'rueckruf':'entsorgung',source:'direkt'},'/anfrage/',{leadType:callback?'callback':'quote'}]]);
    doc.dispatchEvent(new CustomEvent('fp-submit-error',{detail:{callback,reason:'PRIVATE'}}));
    assert.equal(sent.length,1);
    doc.dispatchEvent(new CustomEvent('fp-submit-error',{detail:{callback,reason:'rate_limit',rawError:'PRIVATE'}}));
    assert.deepEqual(sent[1],[{event:'form_submit_error',service:callback?'rueckruf':'entsorgung',source:'direkt'},'/anfrage/',{leadType:callback?'callback':'quote',reason:'rate_limit'}]);
    assert.equal(rows.length,0);
    for (const placement of ['floating','footer','hero','closing_cta','inquiry','page','PRIVATE']) {
      doc.dispatchEvent(new CustomEvent('fp-contact-handoff',{detail:{channel:'whatsapp',placement,text:'PRIVATE'}}));
      assert.deepEqual(sent.at(-1)[2],{channel:'whatsapp',placement:placement==='PRIVATE'?'page':placement});
      assert.equal(rows.at(-1).contactChannel,'whatsapp');
      assert.equal(rows.at(-1).event,'contact_intent');
      assert(!JSON.stringify(rows.at(-1)).includes('placement'));
    }
    assert(!JSON.stringify(sent).includes('PRIVATE'));
  }
});
