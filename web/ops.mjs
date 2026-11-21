import path from 'node:path';
import {existsSync} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { openStore, validate } from './lib/leads.mjs';
import { maxLeadBodyBytes } from './lib/inputs.mjs';
import {reviewAdSpend} from './lib/ad-review.mjs';

const [action,ref,status,gross,cost]=process.argv.slice(2);
if(!['list','callbacks','record','show','contact','quote','book','loss','stage','report','ad-review','erase','prune','backup','link','unlink','payment','refund','paid-orders'].includes(action)){
  console.log('node ops.mjs list | callbacks | record < ANFRAGE.json | show REF | contact REF phone_connected|callback_completed|whatsapp_received | quote REF VERSION BRUTTO_EUR [PLANKOSTEN_NETTO_EUR] | book REF < BUCHUNG.json | loss REF GRUND | stage REF qualified|quoted|lost | stage REF completed BRUTTO_EUR KOSTEN_NETTO_EUR | payment|refund REF BUCHUNGSSCHLÜSSEL EUR | link FOLGE HAUPTAUFTRAG PRÜFVERMERK | unlink FOLGE | paid-orders | report [VON BIS] | ad-review VON BIS ANZEIGENVARIANTE BESTÄTIGTE_KOSTEN_EUR | erase REF | prune | backup ZIELDATEI');
  process.exitCode=1;
}else if(!process.env.LEAD_DATA_DIR||!path.isAbsolute(process.env.LEAD_DATA_DIR)){
  console.error('Set LEAD_DATA_DIR to the absolute operator data directory.');process.exitCode=1;
}else if(action==='ad-review'&&!existsSync(path.join(process.env.LEAD_DATA_DIR,'leads.sqlite'))){
  console.error('Für die Auswertung das bestehende Betriebsverzeichnis mit leads.sqlite angeben.');process.exitCode=1;
}else{
  const db=openStore(path.join(process.env.LEAD_DATA_DIR,'leads.sqlite'));try{
    let output;
    if(action==='list')output=db.list();
    if(action==='callbacks')output=db.callbacks();
    if(action==='show')output=db.get(ref);
    if(action==='quote')output=db.quote(ref,status,gross,cost);
    if(action==='loss')output=db.loss(ref,status);
    if(action==='contact')output=db.confirmContact(ref,status);
    if(action==='stage'){db.stage(ref,status,gross,cost);output={reference:ref,status};}
    if(action==='report')output=db.report(ref,status);
    if(action==='ad-review')output=reviewAdSpend(db,ref,status,gross,cost);
    if(action==='payment'||action==='refund')output=db.payment(ref,status,action,gross);
    if(action==='link')output=db.link(ref,status,gross);
    if(action==='unlink')output=db.unlink(ref);
    if(action==='paid-orders')output=db.paidOrders();
    if(action==='record'||action==='book'){
      const parts=[];
      let bytes=0;
      for await(const part of process.stdin){
        bytes+=part.length;
        if(bytes>(action==='record'?maxLeadBodyBytes:12*1024))throw new Error('Anfrage zu groß.');
        parts.push(part);
      }
      const data=JSON.parse(Buffer.concat(parts).toString('utf8'));
      if(action==='book')output=db.book(ref,data);
      else {data.requestId??=randomUUID();output=db.submit(validate(data));}
    }
    if(action==='backup'){await db.backup(ref);output={backup:'completed'};}
    if(action==='erase')output={erased:db.erase(ref)};
    if(action==='prune')output={deletedClosed:db.prune(Number(process.env.CLOSED_RETENTION_DAYS||90))};
    console.log(JSON.stringify(output,null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}finally{db.close();}
}

