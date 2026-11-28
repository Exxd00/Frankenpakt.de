/** @OnlyCurrentDoc */
const FP_EVENT_CACHE = '_Ereignisquelle';
const FP_EVENT_MARK = 'FrankenPackt Ereignisquelle v1';
const FP_EVENT_HEADERS = ['Event-ID','Zeitpunkt (UTC)','Ereignis','Leistung','Quelle','Anzahl','Keyword (Anzeige)','Medium','Kampagne','Einstiegsseite','Ereignistyp','GCLID'];

function fpFeedFromFormula_(formula) {
  const found = String(formula).match(/IMPORTDATA\("(https:\/\/rjcmfkupgngfxteeupql\.supabase\.co\/functions\/v1\/office-events\?[^"#\s]+)"\)/i);
  if (!found) throw Error('Ereignisquelle im Projektblatt prüfen.');
  const query = found[1].split('?')[1].split('&');
  if (query.filter(v=>/^key=[a-f0-9]{64}$/.test(v)).length !== 1 ||
      query.filter(v=>v==='gclid_text=1').length !== 1 ||
      query.some(v=>! /^(?:key=[a-f0-9]{64}|gclid_text=1|schema=[0-9]+|refresh=[a-zA-Z0-9_-]+)$/.test(v)))
    throw Error('Die registrierte Ereignisquelle hat sich geändert.');
  return found[1];
}

function fpEventRows_(parsed) {
  if (!Array.isArray(parsed) || !parsed.length || parsed.length > 5001 ||
      JSON.stringify(parsed[0]) !== JSON.stringify(FP_EVENT_HEADERS)) throw Error('Ungültiger Ereignisexport.');
  const seen = new Set();
  const rows = [FP_EVENT_HEADERS.slice()];
  for (const values of parsed.slice(1)) {
    if (!Array.isArray(values) || values.length !== 12 || values.some(v=>typeof v !== 'string' || v.startsWith('=')) ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(values[0]) || seen.has(values[0]) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(values[1]) || values[5] !== '1')
      throw Error('Unvollständige oder doppelte Ereigniszeile.');
    seen.add(values[0]);
    const row = values.slice();
    if (row[2] === 'contact_intent') {
      if (row[10] === 'Telefon – Weiterleitung') row[2] = 'phone_call';
      if (row[10] === 'WhatsApp – Weiterleitung') row[2] = 'whatsapp';
    }
    if (row[11] && !/^GC:[A-Za-z0-9][A-Za-z0-9._~-]*={0,2}$/.test(row[11])) throw Error('Ungültiges Klick-ID-Format.');
    row[11] = row[11].replace(/^GC:/,'');
    row[5] = 1;
    rows.push(row);
  }
  return rows;
}

function fpCacheFormula_(formula) {
  fpFeedFromFormula_(formula);
  if (!/^=LET\(/i.test(formula)) throw Error('Importformel wurde verändert.');
  const sep = formula.match(/^=LET\([^;,]+([;,])/i)[1];
  const ref = "'"+FP_EVENT_CACHE+"'!";
  const good = 'IFERROR(AND(ISNUMBER('+ref+'$N$1)'+sep+'NOW()-'+ref+'$N$1<TIME(0'+sep+'10'+sep+'0)'+sep+ref+'$N$2>=1)'+sep+'FALSE)';
  const backupRows='MAX(1'+sep+'COUNTA('+ref+'$P$1:$P$5001))';
  return '=IF('+good+sep+'ARRAY_CONSTRAIN('+ref+'$A$1:$L$5001'+sep+ref+'$N$2'+sep+'12)'+sep+'ARRAY_CONSTRAIN('+ref+'$P$1:$AA$5001'+sep+backupRows+sep+'12))';
}

function fpFetchEvents_(formula) {
  const url = fpFeedFromFormula_(formula);
  let response;
  try { response=UrlFetchApp.fetch(url,{followRedirects:false,muteHttpExceptions:true}); }
  catch (_) { throw Error('Ereignisquelle momentan nicht erreichbar.'); }
  if (response.getResponseCode()!==200) throw Error('Ereignisquelle antwortet mit HTTP '+response.getResponseCode()+'.');
  const csv = response.getContentText();
  if (!csv || csv.length>8000000) throw Error('Unerwartete Exportgröße.');
  return {
    rows:fpEventRows_(Utilities.parseCsv(csv)),
    digest: Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,csv,Utilities.Charset.UTF_8))
  };
}

function fpComparePublished_(visible,rows) {
  const count=Math.min(5001,visible.getLastRow());
  if (!count) throw Error('Überschriften im Ereignisblatt fehlen.');
  const existing=visible.getRange(1,1,count,12).getDisplayValues();
  if (JSON.stringify(existing[0])!==JSON.stringify(FP_EVENT_HEADERS)) throw Error('Überschriften im Ereignisblatt prüfen.');
  const byId=new Map(rows.slice(1).map(row=>[row[0],row]));
  for (const old of existing.slice(1)) {
    if (old.every(v=>!v)) continue;
    const next=byId.get(old[0]);
    if (!next && rows.length===5001 && old[1]<rows[rows.length-1][1]) continue;
    if (!next || old.some((v,i)=>v!==String(next[i]))) throw Error('Der bestehende Datenstand stimmt mit der Quelle nicht überein.');
  }
}

function fpFillEventCache_(cache,snapshot,install) {
  const state=cache.getRange('M1:N3').getValues();
  if (state[0][0]!==FP_EVENT_MARK && !(install&&cache.getLastRow()===0)) throw Error('Unbekanntes Quellenblatt.');
  const now=new Date();
  if (state[2][1]===snapshot.digest && state[1][1]===snapshot.rows.length) {
    if (!(state[0][1] instanceof Date) || now-state[0][1]>=3*60000) cache.getRange('N1').setValue(now);
    return;
  }
  const prior=state[1][1]||0;
  if (!Number.isInteger(prior)||prior<0||prior>5001) throw Error('Ungültiger Quellenumfang.');
  const total=Math.max(prior,snapshot.rows.length,3);
  const output=Array.from({length:total},(_,i)=>(snapshot.rows[i]||Array(12).fill('')).concat(['','']));
  output[0][12]=FP_EVENT_MARK;
  output[0][13]=now;
  output[1][13]=snapshot.rows.length;
  output[2][13]=snapshot.digest;
  cache.getRange(1,1,total,14).setValues(output);
}

function fpEventJob_(install) {
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    if (install) throw Error('Eine Aktualisierung läuft. Installation erneut ausführen.');
    return;
  }
  try {
    const book=SpreadsheetApp.getActiveSpreadsheet();
    if (!book || book.getId()!=='1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE') throw Error('Falsche Projektdatei.');
    const visible=book.getSheetByName('Ereignisse');
    if (!visible||visible.getSheetId()!==888767604) throw Error('Ereignisblatt wurde verändert.');
    const anchor=visible.getRange('A1');
    let cache=book.getSheetByName(FP_EVENT_CACHE);
    if (cache && cache.getRange('M1').getValue()!==FP_EVENT_MARK) throw Error('Vorhandenes Quellenblatt gehört nicht zum Ereignisabgleich.');
    const current=anchor.getFormula();
    const fallback=cache&&cache.getRange('P1').getFormula();
    const formula=fallback||current;
    const wrapped=fpCacheFormula_(formula);
    if (current!==formula && current!==wrapped) throw Error('Anzeigeformel wurde außerhalb des Ereignisabgleichs geändert.');
    const snapshot=fpFetchEvents_(formula);
    if (install) {
      fpComparePublished_(visible,snapshot.rows);
      if (!cache) {
        const previous=book.getActiveSheet();
        cache=book.insertSheet(FP_EVENT_CACHE);
        cache.getRange('M1').setValue(FP_EVENT_MARK);
        book.setActiveSheet(previous);
        cache.hideSheet();
      }
      if (!fallback) {
        if (cache.getMaxRows()<5001) cache.insertRowsAfter(cache.getMaxRows(),5001-cache.getMaxRows());
        if (cache.getMaxColumns()<27) cache.insertColumnsAfter(cache.getMaxColumns(),27-cache.getMaxColumns());
        cache.getRange('A1:E5001').setNumberFormat('@');
        cache.getRange('G1:L5001').setNumberFormat('@');
        cache.getRange('N1').setNumberFormat('yyyy-mm-dd hh:mm:ss');
        cache.getRange('P1').setFormula(formula);
      }
    }
    if (!cache) throw Error('Ereignisabgleich zuerst installieren.');
    fpFillEventCache_(cache,snapshot,install);
    if (install) {
      if (!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='syncKontaktEreignisse')) {
        ScriptApp.newTrigger('syncKontaktEreignisse').timeBased().everyMinutes(1).create();
      }
      if (book.getRecalculationInterval()!==SpreadsheetApp.RecalculationInterval.MINUTE)
        book.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.MINUTE);
      if (wrapped!==current) anchor.setFormula(wrapped);
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}

function installKontaktEreignisse() { fpEventJob_(true); }
function syncKontaktEreignisse() { fpEventJob_(false); }
