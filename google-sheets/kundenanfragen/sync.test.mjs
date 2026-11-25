import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script=readFileSync(new URL('./Code.gs',import.meta.url),'utf8');
const first='AN-0000000000000001';
const second='AN-0000000000000002';
function leadRow(ref,phone='+49000000000') {
  return [ref,'25.11.2026 15:00','Angebotsanfrage','Umzug','Test',phone,'test@example.invalid',
    'Telefon','','01234','','','=1+1','0','Direkt','','',''];
}

function fixture() {
  const cells=[], writes=[], requests=[], responses=[];
  let releases=0;
  const sheet={
    getRange(row,col,height=1,width=1) {
      const read=(i,j)=>cells[row+i-1]?.[col+j-1]||'';
      return {
        getDisplayValue:()=>read(0,0),
        getDisplayValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>read(i,j))),
        setRichTextValues(values){
          for(let i=0;i<height;i++) {
            const target=cells[row+i-1] ||= [];
            for(let j=0;j<width;j++) target[col+j-1]=values[i][j].literal;
          }
          writes.push([row,height,width]);
        }
      };
    },
    getLastRow:()=>cells.length,getMaxRows:()=>1000,getSheetId:()=>115202611,
    deleteRow:n=>cells.splice(n-1,1)
  };
  const context=vm.createContext({
    console:{log(){}},ScriptApp:{getIdentityToken:()=> 'fake-for-unit-test'},
    SpreadsheetApp:{
      getActiveSpreadsheet:()=>({getId:()=>'1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE',getSheetByName:()=>sheet}),
      newRichTextValue:()=>({setText:literal=>({build:()=>({literal})})}),flush(){}
    },
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){releases++;}})},
    UrlFetchApp:{fetch(_url,options){
      requests.push(JSON.parse(options.payload).after);
      const response=responses.shift();
      assert.ok(response,'unexpected fetch');
      return {getResponseCode:()=>response.code||200,getContentText:()=>JSON.stringify(response)};
    }}
  });
  vm.runInContext(script,context);
  cells.push(Array.from(vm.runInContext('FP_HEADERS',context)));
  return {cells,writes,requests,responses,releases:()=>releases,sync:()=>context.syncKundenanfragen()};
}
function page(rows,done=true){return {schema:1,rows,done};}

test('phone, leading-zero ZIP and formula-like input stay literal; retries and refreshes preserve staff fields',()=>{
  const f=fixture();
  f.responses.push(page([leadRow(first)]));
  f.sync();
  assert.deepEqual(f.cells[1],[...leadRow(first),'Neu','']);
  f.cells[1][18]='In Bearbeitung';
  f.cells[1][19]='Termin abgestimmt';
  f.responses.push(page([leadRow(first)]));
  f.sync();
  assert.equal(f.writes.length,1);
  const updated=leadRow(first,'+49000000001');
  f.responses.push(page([updated],false),page([leadRow(second)]));
  f.sync();
  assert.deepEqual(f.cells[1],[...updated,'In Bearbeitung','Termin abgestimmt']);
  assert.deepEqual(f.cells[2],[...leadRow(second),'Neu','']);
  assert.deepEqual(f.requests,['','','',first]);
});

test('authorization failure, incomplete or invalid page never removes earlier rows',()=>{
  const f=fixture();
  f.cells.push([...leadRow(first),'Erledigt','Notiz']);
  for(const bad of [{code:403},page([],false),page([['invalid']])]) {
    f.responses.push(page([leadRow(second)],false),bad);
    assert.throws(f.sync);
    assert.equal(f.cells.length,2);
    assert.equal(f.writes.length,0);
  }
  assert.equal(f.releases(),3);
});

test('a completed reconciliation removes expired entries and retains unrelated rows',()=>{
  const f=fixture();
  f.cells.push([...leadRow(first),'Erledigt','Ablauf'],['interne Zeile'],[...leadRow(second),'Neu','']);
  f.responses.push(page([leadRow(second)]));
  f.sync();
  assert.deepEqual(f.cells.slice(1),[['interne Zeile'],[...leadRow(second),'Neu','']]);
});
