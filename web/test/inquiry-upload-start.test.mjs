import test from 'node:test';
import assert from 'node:assert/strict';
import {mountInquiryFiles} from '../public/assets/inquiry-files.js';

function picker(t,initialFiles=[]){
  class Control extends EventTarget {
    hidden=false;
    textContent='';
    children=[];
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(){}
    removeAttribute(){}
  }
  const controls=new Map(['input','ul','[role=status]','progress','[data-file-time]'].map(key=>[key,new Control()]));
  const input=controls.get('input');
  let files=initialFiles;
  Object.defineProperty(input,'files',{get:()=>files});
  Object.defineProperty(input,'value',{set:v=>{if(v==='')files=[];}});
  const host=new Control();host.querySelector=key=>controls.get(key);
  const old=globalThis.document;
  globalThis.document={createElement:()=>new Control()};
  t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
  let events=0;host.addEventListener('fp-upload-ready',()=>events++);
  const mounted=mountInquiryFiles(host);
  const select=chosen=>{files=chosen;input.dispatchEvent(new Event('change'));};
  const status=()=>controls.get('[role=status]').textContent;
  const button=(row)=>controls.get('ul').children[row].children.at(-1);
  return {input,mounted,select,status,button,events:()=>events};
}
const documentFile=(name,body='Test')=>new File([body],name,{type:'text/plain'});

test('files selected before the inquiry module loads are prepared exactly once and kept for submission',async t=>{
  const {input,mounted,status,events}=picker(t,[documentFile('Packliste.txt','Früh ausgewählt')]);
  input.dispatchEvent(new Event('change'));
  const ready=await mounted.ready();
  assert.equal(ready.length,1);
  assert.equal(ready[0].name,'Packliste.txt');
  assert.equal(events(),1);
  assert.match(status(),/1 von 1/);
});

test('over-limit selections block submission until replaced or explicitly discarded, preserving existing files',async t=>{
  const {mounted,select,status,button}=picker(t);
  const six=Array.from({length:6},(_,i)=>documentFile(i+'.txt'));
  select(six);
  assert.match(status(),/Maximal fünf/);
  await assert.rejects(mounted.ready(),/nicht übernommen/);
  mounted.unlock();
  assert.equal(button(0).textContent,'Ohne Anhang fortfahren');
  button(0).dispatchEvent(new Event('click'));
  assert.deepEqual(await mounted.ready(),[]);
  mounted.unlock();

  select(six.slice(0,2));
  select(six.slice(0,4));
  await assert.rejects(mounted.ready(),/nicht übernommen/);
  mounted.unlock();
  assert.equal(button(2).textContent,'Nur die vorhandenen Dateien verwenden');
  button(2).dispatchEvent(new Event('click'));
  assert.deepEqual((await mounted.ready()).map(f=>f.name),['0.txt','1.txt']);
  mounted.unlock();

  select(six);
  select([six[3]]);
  assert.deepEqual((await mounted.ready()).map(f=>f.name),['0.txt','1.txt','3.txt']);
});

test('combined size is flagged after preparation and clears after a file is removed',async t=>{
  const {mounted,select,status,button,events}=picker(t);
  const text='a'.repeat(4500000);
  select([documentFile('A.txt',text),documentFile('B.txt',text)]);
  for(let i=0;i<200&&!status().includes('zusammen zu groß');i++)await new Promise(r=>setTimeout(r,10));
  assert.match(status(),/zusammen zu groß/);
  assert.equal(events(),0);
  await assert.rejects(mounted.ready(),/zusammen zu groß/);
  mounted.unlock();
  button(1).dispatchEvent(new Event('click'));
  assert.match(status(),/1 von 1/);
  assert.equal(events(),1);
  assert.deepEqual((await mounted.ready()).map(f=>f.name),['A.txt']);
});
