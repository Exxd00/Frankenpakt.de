import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./KontaktEreignisse.gs', import.meta.url), 'utf8');
const columns = ['Event-ID','Zeitpunkt (UTC)','Ereignis','Leistung','Quelle','Anzahl','Keyword (Anzeige)',
  'Medium','Kampagne','Einstiegsseite','Ereignistyp','GCLID'];
const token = 'ab'.repeat(32);
const endpoint = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events';
const input = endpoint + '?key=' + token + '&gclid_text=1';
const fallback = '=LET(daten;IMPORTDATA("' + input + '");HSTACK(CHOOSECOLS(daten;1;2;3;4;5;6;7;8;9;10;11);ARRAYFORMULA(REGEXREPLACE(CHOOSECOLS(daten;12)&"";"^GC:";""))))';
function runtime(bindings={}) {
  const app = vm.createContext(bindings);
  vm.runInContext(source, app);
  return app;
}
function csvRow(index, name, label, gclid = '') {
  return ['46bd1026-4621-4569-9ffc-' + String(index).padStart(12,'0'),'2026-11-28T08:42:01.010Z',
    name,'entsorgung','google','1','sofa entsorgen','cpc','ID 42','/sofa-entsorgen/',label,gclid];
}

test('the minute export distinguishes both confirmations and preserves attribution and unrelated event names',()=>{
  const app = runtime();
  const phone = csvRow(1,'contact_intent','Telefon – Weiterleitung','GC:00001234567890');
  const chat = csvRow(2,'contact_intent','WhatsApp – Weiterleitung','GC:001A-25_X=');
  const other = csvRow(3,'inquiry_received','Anfrage eingegangen');
  const rows = Array.from(app.fpEventRows_([columns,phone,chat,other]), row=>Array.from(row));
  assert.deepEqual(rows[0],columns);
  for (const [i,raw,name,gclid] of [[1,phone,'phone_call','00001234567890'],[2,chat,'whatsapp','001A-25_X='],[3,other,'inquiry_received','']]) {
    assert.deepEqual(rows[i],[...raw.slice(0,2),name,...raw.slice(3,5),1,...raw.slice(6,11),gclid]);
  }
});

test('a malformed feed is rejected as a unit before it can displace a complete snapshot',()=>{
  const app = runtime();
  const good = csvRow(1,'contact_intent','WhatsApp – Weiterleitung');
  assert.throws(()=>app.fpEventRows_([columns,good,good.slice(0,-1)]));
  assert.throws(()=>app.fpEventRows_([['wrong',...columns.slice(1)],good]));
  assert.deepEqual(Array.from(app.fpEventRows_([columns])[0]),columns);
});

test('the script derives the approved feed and rejects other origins and paths without echoing secrets',()=>{
  const app = runtime();
  assert.equal(app.fpFeedFromFormula_(fallback),input);
  for (const url of [
    input.replace('.supabase.co/', '.example.invalid/'),
    input.replace('/office-events?', '/other-project?'),
    input.replace('https://','http://')
  ]) {
    assert.throws(()=>app.fpFeedFromFormula_(fallback.replace(input,url)),err=>!String(err.message).includes(token));
  }
});

function cacheGrid() {
  const cells=[], writes=[],formulas=new Map();
  const cache={
    getLastRow:()=>cells.length,
    hideSheet(){},getMaxRows:()=>5001,getMaxColumns:()=>27,
    getRange(row,col,height,width) {
      if(row==='M1:N3') return {getValues:()=>[0,1,2].map(i=>[cells[i]?.[12]||'',cells[i]?.[13]||''])};
      if(row==='N1') return {setNumberFormat(){},setValue:value=>{cells[0][13]=value;writes.push('heartbeat');}};
      if(row==='M1') return {getValue:()=>cells[0]?.[12]||'',setValue:value=>{(cells[0]||=[])[12]=value;}};
      if(row==='P1') return {getFormula:()=>formulas.get(row)||'',setFormula:value=>formulas.set(row,value)};
      if(row==='A1:E5001'||row==='G1:L5001') return {setNumberFormat(){}};
      assert.equal(row,1); assert.equal(col,1); assert.equal(width,14);
      return {setValues(values) {
        assert.equal(values.length,height);
        for (const [index,valuesRow] of values.entries()) cells[index]=Array.from(valuesRow);
        writes.push(height);
      }};
    }
  };
  return {cache,cells,writes,formulas};
}

test('the source cache writes a complete snapshot once and clears its stale tail, including when it becomes empty',()=>{
  const app=runtime();
  const {cache,cells,writes}=cacheGrid();
  const rows=app.fpEventRows_([columns,...[1,2,3,4].map(i=>csvRow(i,'contact_intent','WhatsApp – Weiterleitung'))]);
  app.fpFillEventCache_(cache,{rows,digest:'one'},true);
  assert.equal(cells[1][2],'whatsapp');
  assert.equal(cells[1][13],5);
  app.fpFillEventCache_(cache,{rows,digest:'one'},false);
  assert.deepEqual(writes,[5]);
  cells[0][13]=vm.runInContext('new Date(Date.now()-4*60000)',app);
  app.fpFillEventCache_(cache,{rows,digest:'one'},false);
  assert.deepEqual(writes,[5,'heartbeat']);
  app.fpFillEventCache_(cache,{rows:[columns],digest:'two'},false);
  assert.deepEqual(writes,[5,'heartbeat',5]);
  assert.equal(cells[1][13],1);
  assert.ok(cells.slice(1).every(row=>row.slice(0,12).every(v=>v==='')));
  assert.equal(cells[2][13],'two');
});

test('migration only switches if the displayed event rows already agree with the server',()=>{
  const app=runtime();
  const rows=app.fpEventRows_([columns,csvRow(1,'contact_intent','Telefon – Weiterleitung')]);
  const projected=Array.from(rows,r=>Array.from(r,String));
  const visible={getLastRow:()=>2,getRange:()=>({getDisplayValues:()=>projected})};
  assert.doesNotThrow(()=>app.fpComparePublished_(visible,rows));
  projected[1][2]='whatsapp';
  assert.throws(()=>app.fpComparePublished_(visible,rows));
});

test('foreign workbooks and overlapping runs cannot write any sheet or issue outbound requests',()=>{
  let locked=true;
  let released=0,fetches=0;
  const app=runtime({
    LockService:{getScriptLock:()=>({tryLock:()=>locked,releaseLock:()=>released++})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>({getId:()=>'different-workbook'})},
    UrlFetchApp:{fetch(){fetches++;throw Error('unexpected network');}}
  });
  assert.throws(()=>app.installKontaktEreignisse());
  assert.equal(released,1);
  locked=false;
  assert.doesNotThrow(()=>app.syncKontaktEreignisse());
  assert.throws(()=>app.installKontaktEreignisse());
  assert.equal(released,1);
  assert.equal(fetches,0);
});

test('denied or redirected feed reads leave no usable snapshot and expose no private URL in the error',()=>{
  let status=403;
  const calls=[];
  const app=runtime({
    UrlFetchApp:{fetch(url,opts) {
      assert.equal(url,input);
      calls.push(opts.followRedirects);
      if(status===0) throw Error('network unavailable for ' + url);
      return {getResponseCode:()=>status,getContentText(){throw Error('an error page is not CSV');}};
    }}
  });
  for(const code of [403,302,503,0]) {
    status=code;
    assert.throws(()=>app.fpFetchEvents_(fallback),err=>!String(err.message).includes(token));
  }
  assert.deepEqual(calls,[false,false,false,false]);
});

test('the visible formula selects the minute snapshot then the independent fallback after ten minutes',()=>{
  const app=runtime();
  for(const separator of [';',',']) {
    const formula=app.fpCacheFormula_(fallback.replaceAll(';',separator));
    assert.ok(formula.includes('TIME(' + ['0','10','0'].join(separator) + ')'));
    assert.ok(formula.includes("'_Ereignisquelle'!$A$1:$L$5001"));
    assert.ok(formula.includes("'_Ereignisquelle'!$P$1:$AA$5001"));
    assert.doesNotMatch(formula,/IMPORTDATA|https:/i);
  }
});

test('install creates one minute trigger; reruns reuse it and a failed install keeps the prior display',()=>{
  const grid=cacheGrid(), triggers=[];
  let cache=null, formula=fallback, interval='CHANGE', denied=true;
  const schedules=[];
  const visible={
    getSheetId:()=>888767604,getLastRow:()=>1,
    getRange:r=>r==='A1'
      ? {getFormula:()=>formula,setFormula:value=>{formula=value;}}
      : {getDisplayValues:()=>[columns]}
  };
  const workbook={
    getId:()=>'1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE',getActiveSheet:()=>visible,
    getSheetByName:name=>name==='Ereignisse'?visible:name==='_Ereignisquelle'?cache:null,
    insertSheet(){assert.equal(cache,null);cache=grid.cache;return cache;},setActiveSheet(){},
    getRecalculationInterval:()=>interval,setRecalculationInterval:setting=>{interval=setting;}
  };
  const app=runtime({
    SpreadsheetApp:{getActiveSpreadsheet:()=>workbook,RecalculationInterval:{MINUTE:'MINUTE'},flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>columns.join(',')})},
    Utilities:{parseCsv:()=>[columns],computeDigest:()=>[1,2,3],DigestAlgorithm:{SHA_256:0},Charset:{UTF_8:0},base64EncodeWebSafe:()=>'AQID'},
    ScriptApp:{
      getProjectTriggers:()=>triggers,newTrigger(name) {return {timeBased:()=>({everyMinutes:n=>({create(){
        if(denied)throw Error('trigger not authorized');
        schedules.push(n);
        triggers.push({getHandlerFunction:()=>name});
      }})})};}
    }
  });
  assert.throws(()=>app.installKontaktEreignisse(),/not authorized/);
  assert.equal(formula,fallback);
  assert.equal(grid.formulas.get('P1'),fallback);
  denied=false;
  app.installKontaktEreignisse();
  app.installKontaktEreignisse();
  app.syncKontaktEreignisse();
  assert.equal(formula,app.fpCacheFormula_(fallback));
  assert.equal(grid.formulas.get('P1'),fallback);
  assert.equal(interval,'MINUTE');
  assert.deepEqual(schedules,[1]);
  assert.equal(triggers[0].getHandlerFunction(),'syncKontaktEreignisse');
});
