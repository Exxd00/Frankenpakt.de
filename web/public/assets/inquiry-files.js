import {maxFiles,maxWireBytes,maxContentBytes,maxPhotoBytes} from './file-limits.js';

const amount=new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});
const size=n=>n<1048576 ? amount.format(n/1024)+' KB' : amount.format(n/1048576)+' MB';
const make=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
const invalid=message=>Object.assign(new Error(message),{fileIssue:true});
const encoded=(canvas,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(invalid('Das Foto lässt sich nicht verkleinern.')),'image/jpeg',quality));
function safeName(value,ext) {
  return (value.normalize('NFC').replace(/\.[^.]*$/u,'').replace(/[\x00-\x1f\x7f\\/:<>|"?*\u202a-\u202e\u2066-\u2069]/gu,'_')
    .replace(/^\.+/u,'').trim().slice(0,92)||'Datei')+ext;
}
async function photo(file) {
  if(file.size>maxPhotoBytes)throw invalid('Dieses Foto überschreitet 20 MB.');
  const url=URL.createObjectURL(file);
  const img=new Image();img.decoding='async';
  try {
    img.src=url;
    await img.decode();
    const ratio=Math.min(1,1920/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let blob=await encoded(canvas,.78);
    if(blob.size>700*1024)blob=await encoded(canvas,.62);
    canvas.width=canvas.height=1;
    return {blob,storedBytes:blob.size,name:safeName(file.name,'.jpg')};
  } finally {URL.revokeObjectURL(url);}
}
async function prepare(file) {
  if(!file.size)throw invalid('Diese Datei ist leer.');
  const ext=(file.name.match(/\.[^.]+$/)||[''])[0].toLowerCase();
  if(['.jpg','.jpeg','.png','.webp','.avif','.heic','.heif'].includes(ext)){
    try{return await photo(file);}
    catch(error){if(error.fileIssue)throw error;throw invalid('Dieses Gerät kann das Foto nicht lesen. Bitte als JPG oder PNG auswählen.');}
  }
  if(!['.pdf','.txt'].includes(ext))throw invalid('Bitte ein Foto, PDF oder eine TXT-Datei auswählen.');
  if(file.size>maxContentBytes)throw invalid('Dieses Dokument überschreitet 8 MB.');
  const mime=ext==='.pdf'?'application/pdf':'text/plain';
  if(ext==='.pdf' && (!(await file.slice(0,5).text()).startsWith('%PDF-') || !(await file.slice(-1024).text()).includes('%%EOF')))throw invalid('Dieses PDF ist beschädigt.');
  if(ext==='.txt'){
    try{if(/[\x00-\x08\x0b\x0e-\x1f]/u.test(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer())))throw Error();}
    catch{throw invalid('Diese Textdatei ist kein UTF-8-Text.');}
  }
  let blob=file.slice(0,file.size,mime);
  if(typeof CompressionStream==='function'){
    const zipped=await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
    if(zipped.size<blob.size)blob=zipped.slice(0,zipped.size,'application/gzip');
  }
  return {blob,storedBytes:file.size,name:safeName(file.name,ext)};
}

export function mountInquiryFiles(host) {
  const input=host.querySelector('input'),list=host.querySelector('ul'),status=host.querySelector('[role=status]'),progress=host.querySelector('progress');
  const clock=host.querySelector('[data-file-time]');
  const entries=[];
  let queue=Promise.resolve(),locked=false,generation=0;
  function meter(label,value) {
    progress.hidden=false;
    if(value==null)progress.removeAttribute('value');else progress.value=value;
    progress.setAttribute('aria-label',label);
    status.textContent=label;
  }
  function render(){
    list.replaceChildren(...entries.map(entry=>{
      const row=document.createElement('li'),info=document.createElement('div');
      info.append(make('strong',entry.file.name),make('small',entry.error || (entry.result ?
        size(entry.file.size)+' → '+size(entry.result.blob.size)+' · '+entry.elapsed : 'Wird vorbereitet…')));
      const remove=make('button','Entfernen');remove.type='button';remove.disabled=locked;
      remove.setAttribute('aria-label',entry.file.name+' entfernen');
      remove.addEventListener('click',()=>{entries.splice(entries.indexOf(entry),1);refresh();});row.append(info,remove);return row;
    }));
  }
  function refresh(){
    render();
    const working=entries.find(e=>!e.result&&!e.error);
    if(working){meter(working.file.name+' wird auf Ihrem Gerät aufbereitet…');return;}
    const failed=entries.find(e=>e.error);
    if(failed){status.textContent='Bitte entfernen oder ersetzen Sie die markierte Datei.';progress.hidden=true;return;}
    if(entries.length){meter(entries.length+' von '+entries.length+' für den Versand bereit.',1);}
    else{progress.hidden=true;status.textContent='';}
  }
  function acceptSelection(){
    const chosen=Array.from(input.files);input.value='';
    if(!chosen.length||locked)return;
    if(entries.length+chosen.length>maxFiles){status.textContent='Pro Anfrage können Sie höchstens fünf Dateien auswählen.';return;}
    const batch=chosen.map(file=>({file,id:crypto.randomUUID()})),current=generation;
    entries.push(...batch);refresh();
    for(const e of batch)queue=queue.then(async()=>{
      if(!entries.includes(e)||generation!==current)return;
      const start=performance.now();
      const tick=()=>{clock.textContent=Math.floor((performance.now()-start)/1000)+' s vergangen';clock.hidden=false;};
      tick();const timer=setInterval(tick,1000);
      try{e.result=await prepare(e.file);}
      catch(error){e.error=error.fileIssue?error.message:'Datei nicht lesbar. Bitte wählen Sie eine andere Datei.';}
      finally{clearInterval(timer);clock.hidden=true;}
      const seconds=(performance.now()-start)/1000;
      e.elapsed=seconds<1?'unter 1 s':amount.format(seconds)+' s';
      if(generation===current)refresh();
    });
    queue=queue.then(()=>{
      if(generation===current&&batch.some(e=>entries.includes(e)&&e.result)){
        host.dispatchEvent(new CustomEvent('fp-upload-ready',{bubbles:true}));
      }
    });
  }
  input.addEventListener('change',acceptSelection);
  if(input.files?.length)acceptSelection();
  return {
    async ready(){
      locked=input.disabled=true;render();await queue;
      const failed=entries.find(e=>e.error);
      if(failed)throw invalid(failed.file.name+' – '+failed.error+' Bitte entfernen oder ersetzen.');
      if(entries.reduce((n,e)=>n+e.result.blob.size,0)>maxWireBytes||entries.reduce((n,e)=>n+e.result.storedBytes,0)>maxContentBytes)
        throw invalid('Die Auswahl ist zu groß. Bitte entfernen Sie eine Datei (3 MB Versandgröße und 8 MB Dokumentinhalt insgesamt).');
      return entries.map(e=>({...e.result,id:e.id}));
    },
    unlock(){locked=input.disabled=false;render();},
    reset(){generation++;entries.length=0;locked=input.disabled=false;input.value='';refresh();},
    send(fields,files){
      const payload=new FormData();payload.append('inquiry',JSON.stringify(fields));
      for(const file of files)payload.append('attachment',file.blob,file.name);
      return new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhr.open('POST','/api/leads');xhr.responseType='text';xhr.timeout=120000;
        xhr.upload.onprogress=e=>meter(e.lengthComputable?'Dateien werden gesendet · '+Math.round(100*e.loaded/e.total)+' %':'Dateien werden gesendet…',e.lengthComputable?e.loaded/e.total:null);
        xhr.upload.onload=()=>meter('Dateien übertragen. Eingang wird bestätigt…');
        xhr.onerror=xhr.ontimeout=()=>{refresh();reject(new Error('network'));};
        xhr.onload=()=>{refresh();resolve(new Response(xhr.responseText,{status:xhr.status}));};
        meter('Dateien werden gesendet…',0);xhr.send(payload);
      });
    }
  };
}
