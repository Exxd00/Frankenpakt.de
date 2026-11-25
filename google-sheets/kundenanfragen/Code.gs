/** @OnlyCurrentDoc */
const FP_BOOK = '1OuzX7yf5VhcsspSsCpjt-fPPWuzOaMTl2qIv5-u0WvE';
const FP_TAB = 115202611;
const FP_HEADERS = ['Vorgangsnummer','Eingang (Berlin)','Anfrageart','Leistung','Name','Telefon','E-Mail','Kontaktwunsch','Unternehmen','PLZ Start','PLZ Ziel','Termin / Rückrufzeit','Nachricht','Anlagen (Anzahl)','Quelle','Projekt / Objekt-Nr.','Angebotsfrist','Angebotsempfänger','Bearbeitungsstatus','Interne Notiz'];
const FP_ENDPOINT = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/kundenanfragen';
const FP_REF = /^AN-[A-F0-9]{16}$/;

function zielblatt_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== FP_BOOK) throw new Error('Die Projektdatei ist nicht geöffnet.');
  const tab = book.getSheetByName('Kundenanfragen');
  if (!tab || tab.getSheetId() !== FP_TAB) throw new Error('Register Kundenanfragen prüfen.');
  const headers = tab.getRange(1,1,1,FP_HEADERS.length).getDisplayValues()[0];
  if (headers.some((v,i)=>v!==FP_HEADERS[i])) throw new Error('Die Spaltenüberschriften haben sich geändert.');
  return tab;
}

function installKundenanfragen() {
  zielblatt_();
  const jwt = ScriptApp.getIdentityToken();
  if (!jwt) throw new Error('Identitätsfreigabe für die private Verbindung erforderlich.');
  const claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(jwt.split('.')[1])).getDataAsString());
  if (claims.email !== 'ixamarketing.de@gmail.com') throw new Error('Die Installation ist nur über das Betreiberkonto möglich.');
  console.log('OAuth-Audience: '+claims.aud);
  const existing = ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncKundenanfragen');
  if (!existing.length) ScriptApp.newTrigger('syncKundenanfragen').timeBased().everyMinutes(5).create();
}

function aktiveAnfragen_() {
  const token=ScriptApp.getIdentityToken();
  if (!token) throw new Error('Google-Identität fehlt.');
  const active=new Map();
  let cursor='';
  for (;;) {
    const response=UrlFetchApp.fetch(FP_ENDPOINT,{
      method:'post',contentType:'application/json',followRedirects:false,muteHttpExceptions:true,
      headers:{Authorization:'Bearer '+token},payload:JSON.stringify({after:cursor})
    });
    if (response.getResponseCode()!==200) throw new Error('Abruf der Kundenanfragen fehlgeschlagen (HTTP '+response.getResponseCode()+').');
    const page=JSON.parse(response.getContentText());
    if (page.schema!==1 || !Array.isArray(page.rows) || typeof page.done!=='boolean' || page.rows.length>200 ||
        (!page.done && !page.rows.length)) throw new Error('Ungültige Antwort. Bestehende Zeilen bleiben erhalten.');
    for (const row of page.rows) {
      if (!Array.isArray(row) || row.length!==18 || row.some(v=>typeof v!=='string') || !FP_REF.test(row[0]) || row[0]<=cursor)
        throw new Error('Reihenfolge oder Spalten der Kundenanfragen prüfen.');
      active.set(row[0],row);
      cursor=row[0];
    }
    if (page.done) return active;
  }
}

// RichTextValue schreibt Kundeneingaben als Text. Auch führende +, 0 und = bleiben wörtlich.
function schreibeText_(tab,start,rows) {
  if (!rows.length) return;
  const end=start+rows.length-1;
  if (end>tab.getMaxRows()) tab.insertRowsAfter(tab.getMaxRows(),end-tab.getMaxRows());
  const rich=rows.map(row=>row.map(v=>SpreadsheetApp.newRichTextValue().setText(v).build()));
  tab.getRange(start,1,rows.length,rows[0].length).setRichTextValues(rich);
}

function syncKundenanfragen() {
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const tab=zielblatt_();
    const active=aktiveAnfragen_(); // Erst nach vollständigem, autorisiertem Abruf schreiben.
    const count=Math.max(0,tab.getLastRow()-1);
    const current=count ? tab.getRange(2,1,count,18).getDisplayValues() : [];
    const seen=new Set(), expired=[], additions=[];
    current.forEach((row,i)=>{
      const ref=row[0];
      if (!FP_REF.test(ref)) return;
      if (seen.has(ref)) throw new Error('Doppelte Vorgangsnummer im Kundenregister. Bitte zuerst prüfen.');
      seen.add(ref);
      if (!active.has(ref)) expired.push([i+2,ref]);
    });
    current.forEach((row,i)=>{
      const data=active.get(row[0]);
      if (data && data.some((v,j)=>v!==row[j])) {
        if (tab.getRange(i+2,1).getDisplayValue()!==row[0]) throw new Error('Register wurde während der Aktualisierung sortiert.');
        schreibeText_(tab,i+2,[data]);
      }
    });
    for (const [ref,row] of active) if (!seen.has(ref)) additions.push(row.concat('Neu',''));
    schreibeText_(tab,tab.getLastRow()+1,additions);
    for (const [index,ref] of expired.reverse()) {
      if (tab.getRange(index,1).getDisplayValue()!==ref) throw new Error('Register wurde während der Aktualisierung sortiert.');
      tab.deleteRow(index);
    }
    SpreadsheetApp.flush();
    console.log('Kundenregister aktualisiert: '+active.size+' aktive Vorgänge.');
  } finally {lock.releaseLock();}
}
