import {jobSections,movingServices,itemTypes,destinations,readItems,validateJobScope} from './job-scope-model.js';
import {scopePlanningLines} from './job-scope-planning.js';

let instance=0;
function element(tag,className,text) {
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text)el.textContent=text;
  return el;
}
function options(select,list) {
  select.add(new Option('Bitte auswählen',''));
  for(const [value,label] of list)select.add(new Option(label,value));
}
function button(label,cls) {
  const el=element('button',cls,label);
  el.type='button';return el;
}
export function mountJobScope(container,{service='',initial=null,onChange=()=>{}}={}) {
  const prefix='job-scope-'+(++instance)+'-';
  let fields={},groups=[],controls=new Map(),attempted=new Set();
  let planning;
  container.classList.add('job-scope');
  const active=(rule)=>!rule||rule(fields);
  function getValue() {
    const values={};
    for(const group of groups)if(active(group.when))for(const d of group.fields){
      if(active(d.when)&&typeof fields[d.key]==='string'&&fields[d.key].trim())values[d.key]=fields[d.key].trim();
    }
    return {version:1,service,fields:values};
  }
  function currentErrors(scope) {
    const {errors}=validateJobScope(scope,service);
    const f=scope.fields;
    const now=new Date();
    const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const lastDay=f.dateMode==='range'?'dateEnd':f.dateMode==='fixed'?'date':'';
    if(lastDay&&f[lastDay]&&!errors[lastDay]&&f[lastDay]<today)errors[lastDay]='Bitte einen Termin ab heute auswählen.';
    return errors;
  }
  function refresh() {
    const scope=getValue();
    const errors=currentErrors(scope);
    for(const group of groups){
      group.el.hidden=!active(group.when);
      if(group.el.hidden)continue;
      let completed=0,total=0;
      for(const d of group.fields){
        const view=controls.get(d.key);
        const visible=active(d.when);
        view.wrap.hidden=!visible;
        if(!visible)continue;
        if(d.required){total++;if(!errors[d.key])completed++;}
        const message=attempted.has(group.key)?errors[d.key]:'';
        view.err.textContent=message||'';
        view.err.hidden=!message;
        view.input.setAttribute('aria-invalid',message?'true':'false');
      }
      group.badge.textContent=completed===total?'Vollständig':completed+' / '+total;
      group.badge.setAttribute('aria-label',completed+' von '+total+' Pflichtangaben ausgefüllt');
    }
    if(planning){
      const lines=scopePlanningLines(scope,readItems(scope.fields.items));
      planning.hidden=!lines.length;
      const ul=planning.querySelector('ul');
      ul.replaceChildren(...lines.map(s=>element('li','',s)));
    }
  }
  function change(key,value) {
    fields[key]=value;
    refresh();
    onChange(getValue());
  }
  function groupErrors(which,focus=true) {
    const errors=currentErrors(getValue());
    const list=which.filter(g=>active(g.when));
    for(const g of list)attempted.add(g.key);
    refresh();
    for(const group of list){
      const d=group.fields.find(d=>errors[d.key]&&active(d.when));
      if(d){
        if(focus){
          group.el.open=true;
          const {wrap,input}=controls.get(d.key);
          const first=['items','rooms'].includes(d.type)?wrap.querySelector('select, input, button'):d.type==='multiple'?wrap.querySelector('input'):input;
          first?.focus();
        }
        return false;
      }
    }
    return !errors.scope;
  }
  function inventory(d,id) {
    const wrap=element('div','job-scope-field job-scope-wide');
    const head=element('div','job-scope-label',d.label+' *');head.id=id+'-label';
    const input=element('div','job-scope-inventory');input.setAttribute('role','group');
    input.setAttribute('aria-labelledby',head.id);
    let rows=readItems(fields[d.key]).map(r=>({...r}));
    if(rows.length===0)rows=[{}];
    wrap.append(head,element('p','job-scope-hint',d.hint),input);
    const add=button('Weitere Position hinzufügen','job-scope-link');
    const err=element('p','job-scope-error');err.id=id+'-error';err.hidden=true;
    input.setAttribute('aria-describedby',err.id);
    wrap.append(add,err);
    function store(){change(d.key,JSON.stringify(rows));}
    function draw(){
      input.replaceChildren();
      for(const [index,row] of rows.entries()){
        const line=element('fieldset','job-scope-item');
        line.append(element('legend','', 'Position '+(index+1)));
        const grid=element('div','job-scope-item-grid');
        function part(key,label,choices,max=120){
          const holder=element('label','job-scope-item-field');
          const title=element('span','',label);
          const el=element(choices?'select':'input');
          el.id=id+'-'+index+'-'+key;
          if(choices)options(el,choices);
          else{el.type='text';el.maxLength=max;if(key==='quantity')el.inputMode='numeric';}
          el.value=row[key]||'';
          el.addEventListener(choices?'change':'input',()=>{
            row[key]=el.value;
            if(key==='type'){
              grid.querySelector('[data-size] span').textContent='Maße L × B × H (cm)'+(['bulky','furniture','appliance'].includes(row.type)?' *':' (optional)');
              grid.querySelector('[data-weight] span').textContent='Gewicht je Stück (kg)'+(row.type==='bulky'?' *':' (optional)');
            }
            store();
          });
          if(key==='size')el.placeholder='180 × 80 × 45';
          if(key==='weight')el.placeholder='z. B. 85';
          holder.setAttribute('data-'+key,'');
          holder.append(title,el);grid.append(holder);
        }
        part('type','Art *',itemTypes);part('quantity','Anzahl *',null,4);part('name','Bezeichnung *',null);
        if(!movingServices.includes(service))part('destination','Verbleib *',destinations);
        part('size','Maße L × B × H (cm)'+(['bulky','furniture','appliance'].includes(row.type)?' *':' (optional)'),null,80);
        part('weight','Gewicht je Stück (kg)'+(row.type==='bulky'?' *':' (optional)'),null,40);
        const note=element('p','job-scope-hint','Maße und Gewicht dürfen geschätzt werden. Falls nicht ermittelbar, „unbekannt“ eintragen.');
        line.append(grid);
        line.append(note);
        if(rows.length>1){
          const remove=button('Position entfernen','job-scope-link');
          remove.setAttribute('aria-label','Position '+(index+1)+' entfernen');
          remove.addEventListener('click',()=>{rows.splice(index,1);draw();store();input.querySelector('select')?.focus();});
          line.append(remove);
        }
        input.append(line);
      }
      add.hidden=rows.length>=50;
    }
    add.addEventListener('click',()=>{
      if(rows.length>=50)return;
      rows.push({});draw();store();input.lastElementChild.querySelector('select').focus();
    });
    draw();
    return {wrap,input,err};
  }
  function roomList(d,id) {
    const wrap=element('div','job-scope-field job-scope-wide');
    const head=element('div','job-scope-label',d.label);head.id=id+'-label';
    const input=element('div','job-scope-inventory');input.id=id;
    input.setAttribute('role','group');input.setAttribute('aria-labelledby',head.id);
    const add=button('Raum hinzufügen','job-scope-link');
    const err=element('p','job-scope-error');err.id=id+'-error';input.setAttribute('aria-describedby',err.id);
    let rows=readItems(fields[d.key]).map(r=>({...r}));
    const store=()=>change(d.key,rows.length?JSON.stringify(rows):'');
    function render(){
      input.replaceChildren();
      for(const [i,row] of rows.entries()){
        const line=element('fieldset','job-scope-item');
        line.append(element('legend','', 'Raum '+(i+1)));
        const grid=element('div','job-scope-item-grid');
        for(const [key,label] of [['name','Raumbezeichnung'],['area','Fläche (m²)'],['fill','Füllstand']]){
          const holder=element('label','job-scope-item-field');
          const control=element(key==='fill'?'select':'input');
          control.id=id+'-'+i+'-'+key;
          if(key==='fill')options(control,[['little','Leicht gefüllt'],['half','Etwa zur Hälfte'],['most','Überwiegend gefüllt'],['full','Voll oder dicht zugestellt']]);
          else {control.type='text';control.maxLength=key==='name'?120:12;if(key==='area')control.inputMode='decimal';}
          control.value=row[key]||'';
          control.addEventListener(key==='fill'?'change':'input',()=>{row[key]=control.value;store();});
          holder.append(element('span','',label),control);grid.append(holder);
        }
        const remove=button('Raum entfernen','job-scope-link');remove.setAttribute('aria-label','Raum '+(i+1)+' entfernen');
        remove.addEventListener('click',()=>{rows.splice(i,1);render();store();add.focus();});
        line.append(grid,remove);input.append(line);
      }
      add.hidden=rows.length>=30;
    }
    add.addEventListener('click',()=>{if(rows.length>=30)return;rows.push({});render();store();input.lastElementChild.querySelector('input').focus();});
    wrap.append(head,input,add,err);render();
    return {wrap,input,err};
  }
  function buildField(d) {
    const id=prefix+d.key;
    if(d.type==='items')return inventory(d,id);
    if(d.type==='rooms')return roomList(d,id);
    const wrap=element('div','job-scope-field'+(['multiple','textarea'].includes(d.type)?' job-scope-wide':''));
    const multiple=d.type==='multiple';
    const label=element(multiple?'div':'label','job-scope-label',d.label+(d.required?' *':''));
    const el=element(multiple?'div':d.type==='select'?'select':d.type==='textarea'?'textarea':'input');
    el.id=id;wrap.append(label,el);
    if(multiple){
      label.id=id+'-label';
      el.className='job-scope-checks';el.setAttribute('role','group');el.setAttribute('aria-labelledby',label.id);
      for(const [value,text] of d.options){
        const box=element('label','job-scope-check');
        const input=element('input');input.type='checkbox';input.value=value;
        input.checked=(fields[d.key]||'').split(',').includes(value);
        input.addEventListener('change',()=>{
          const choices=[...el.querySelectorAll('input')];
          if(input.checked)for(const ch of choices){
            if((value==='none'&&ch!==input)||(value!=='none'&&ch.value==='none'))ch.checked=false;
          }
          change(d.key,choices.filter(ch=>ch.checked).map(ch=>ch.value).join(','));
        });
        box.append(input,element('span','',text));el.append(box);
      }
    }else{
      label.htmlFor=id;
      el.setAttribute('aria-required',String(d.required));
      if(d.type==='select')options(el,d.options);
      else if(d.type==='textarea')el.rows=2;
      else{el.type=d.type==='date'?'date':'text';if(['integer','zip'].includes(d.type))el.inputMode='numeric';if(d.type==='decimal')el.inputMode='decimal';}
      if(d.maxLength)el.maxLength=d.maxLength;
      if(d.type==='zip')el.maxLength=5;
      if(d.type==='integer'||d.type==='decimal')el.maxLength=12;
      if(d.placeholder)el.placeholder=d.placeholder;
      el.value=fields[d.key]||'';
      el.addEventListener(d.type==='select'?'change':'input',()=>change(d.key,el.value));
    }
    const err=element('p','job-scope-error');err.id=id+'-error';err.hidden=true;
    if(d.hint){const hint=element('p','job-scope-hint',d.hint);hint.id=id+'-hint';wrap.append(hint);el.setAttribute('aria-describedby',hint.id+' '+err.id);}
    else el.setAttribute('aria-describedby',err.id);
    wrap.append(err);return {wrap,input:el,err};
  }
  function setService(next,draft=null){
    service=next;
    fields=Object.create(null);
    if(draft?.version===1&&draft.service===service&&draft.fields&&typeof draft.fields==='object')
      for(const [k,v] of Object.entries(draft.fields))if(typeof v==='string')fields[k]=v;
    attempted=new Set();controls=new Map();
    const sections=jobSections(service);
    groups=[...sections.filter(s=>s.key==='inventory'),...sections.filter(s=>s.key!=='inventory')];
    if(service==='entruempelung'){
      const inventory=groups[0];
      const roomKeys=['extent','roomBreakdown','areas','areaSqm','fill'];
      inventory.fields=[...inventory.fields.filter(d=>roomKeys.includes(d.key)),...inventory.fields.filter(d=>!roomKeys.includes(d.key))];
    }
    container.replaceChildren();planning=null;
    for(const [idx,g] of groups.entries()){
      const details=element('details','job-scope-part');details.open=idx===0;
      const summary=element('summary');
      summary.append(element('span','job-scope-part-title',g.title));
      const badge=element('span','job-scope-badge');summary.append(badge);g.badge=badge;g.el=details;details.append(summary);
      const grid=element('div','job-scope-grid');
      for(const d of g.fields){
        const view=buildField(d);controls.set(d.key,view);grid.append(view.wrap);
      }
      details.append(grid);
      if(idx<groups.length-1){
        const next=button('Weiter','job-scope-next');
        next.addEventListener('click',()=>{
          if(!groupErrors([g]))return;
          const following=groups.slice(idx+1).find(x=>active(x.when));
          if(following){details.open=false;following.el.open=true;following.el.querySelector('summary').focus();}
        });
        details.append(next);
      }
      container.append(details);
    }
    if(groups.length){
      planning=element('details','job-scope-plan');
      planning.append(element('summary','','Angaben für die Einsatzplanung'),element('ul'));
      container.append(planning);
    }
    refresh();
  }
  setService(service,initial);
  return {getValue,setService,validate:()=>groups.length>0&&groupErrors(groups)};
}
