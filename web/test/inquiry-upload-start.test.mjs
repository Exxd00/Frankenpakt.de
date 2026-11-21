import test from 'node:test';
import assert from 'node:assert/strict';
import {mountInquiryFiles} from '../public/assets/inquiry-files.js';

test('files selected before the inquiry module loads are prepared exactly once and kept for submission',async t=>{
  class Control extends EventTarget {
    hidden=false;
    textContent='';
    append(){}
    replaceChildren(){}
    setAttribute(){}
    removeAttribute(){}
  }
  const controls=new Map(['input','ul','[role=status]','progress','[data-file-time]'].map(key=>[key,new Control()]));
  const input=controls.get('input');
  let files=[new File(['Früh ausgewählt'],'Packliste.txt',{type:'text/plain'})];
  Object.defineProperty(input,'files',{get:()=>files});
  Object.defineProperty(input,'value',{set:v=>{if(v==='')files=[];}});
  const host=new Control();host.querySelector=key=>controls.get(key);
  const old=globalThis.document;
  globalThis.document={createElement:()=>new Control()};
  t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
  let events=0;host.addEventListener('fp-upload-ready',()=>events++);
  const mounted=mountInquiryFiles(host);
  input.dispatchEvent(new Event('change'));
  const ready=await mounted.ready();
  assert.equal(ready.length,1);
  assert.equal(ready[0].name,'Packliste.txt');
  assert.equal(events,1);
  assert.match(controls.get('[role=status]').textContent,/1 von 1/);
});
