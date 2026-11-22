import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {openStaffMailQueue} from './mail-delivery.mjs';
import {openAttachments} from './attachments.mjs';
import {officeEventsQueue} from './office-events.mjs';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import path from 'node:path';
import { cleanMoney, InputError, isGoogleAdVariant } from './inputs.mjs';
import { openOffers } from './offers.mjs';
import { summarizeJobScope } from '../public/assets/job-scope-model.js';
export { InputError } from './inputs.mjs';

import {string,sources,addCalculatedScope} from './lead-input.mjs';
export {validate,mobileNumber,validateContactClick} from './lead-input.mjs';
const confirmations = new Set(['phone_connected','callback_completed','whatsapp_received']);
const berlinDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'});
const transitions={
 new:['qualified','lost'],qualified:['quoted','lost'],quoted:['booked','lost'],booked:['completed','lost'],completed:[],lost:[]
};
function iso(ms){return new Date(ms).toISOString();}
export function openStore(filename){
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename);
  db.function('berlin_day',{deterministic:true},v=>berlinDate.format(new Date(v)));
  if(filename!==':memory:'&&process.platform!=='win32')chmodSync(filename,0o600);
  db.exec("PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;PRAGMA synchronous=FULL;");
  db.exec('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);'+
    'CREATE TABLE IF NOT EXISTS leads(ref TEXT PRIMARY KEY,created TEXT NOT NULL,updated TEXT NOT NULL,status TEXT NOT NULL,service TEXT NOT NULL,source TEXT NOT NULL,person TEXT NOT NULL,identity TEXT NOT NULL,merge_key TEXT NOT NULL,gross_cents INTEGER,cost_cents INTEGER);'+
    'CREATE INDEX IF NOT EXISTS leads_merge ON leads(merge_key,created);'+
    'CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,digest TEXT NOT NULL);'+
    'CREATE TABLE IF NOT EXISTS events(ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,status TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(ref,status));'+
    'CREATE TABLE IF NOT EXISTS notices(ref TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE,due INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);'+
    'CREATE TABLE IF NOT EXISTS payments(entry TEXT PRIMARY KEY,ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,direction TEXT NOT NULL,amount INTEGER NOT NULL,at TEXT NOT NULL);'+
    'CREATE INDEX IF NOT EXISTS payments_order ON payments(ref);'+
    'CREATE TABLE IF NOT EXISTS links(secondary TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE,principal TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,reason TEXT NOT NULL,at TEXT NOT NULL);'+
    'CREATE TABLE IF NOT EXISTS landings(day TEXT NOT NULL,source TEXT NOT NULL,page TEXT NOT NULL,hits INTEGER NOT NULL,PRIMARY KEY(day,source,page));'+
    'CREATE TABLE IF NOT EXISTS contact_counts(day TEXT NOT NULL,source TEXT NOT NULL,event TEXT NOT NULL,hits INTEGER NOT NULL,PRIMARY KEY(day,source,event));'+
    'CREATE TABLE IF NOT EXISTS click_replays(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);'+
    'CREATE INDEX IF NOT EXISTS click_replay_expiry ON click_replays(expires);'+
    'CREATE TABLE IF NOT EXISTS contact_events(ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,event TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(ref,event));');
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('identity_key',?)").run(randomBytes(32).toString('hex'));
  const key=Buffer.from(db.prepare("SELECT value FROM settings WHERE key='identity_key'").get().value,'hex');
  const sign=(msg)=>createHmac('sha256',key).update(msg).digest('hex');
  function transaction(action){db.exec('BEGIN IMMEDIATE');try{const out=action();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
  const mail = openStaffMailQueue(db,transaction);
  const attachments = openAttachments(db);
  const officeEvents = officeEventsQueue(db,transaction);
  const netPaid="COALESCE((SELECT SUM(CASE WHEN p.direction='payment' THEN p.amount ELSE -p.amount END) FROM payments p WHERE p.ref=l.ref),0)";
  const settled="l.status='completed' AND l.gross_cents>0 AND "+netPaid+">=l.gross_cents";
  function updateSettlement(ref,ms){
    db.prepare("INSERT OR IGNORE INTO events(ref,status,at) SELECT l.ref,'paid',? FROM leads l WHERE l.ref=? AND "+settled).run(iso(ms),ref);
  }
  function changeStage(ref,status,gc,cc,ms){
    const lead=db.prepare('SELECT status,gross_cents,cost_cents FROM leads WHERE ref=?').get(ref);
    if(!lead)throw new InputError('Anfrage unbekannt.',404);
    if(lead.status===status){
      if(status==='completed'&&(gc!==lead.gross_cents||cc!==lead.cost_cents))throw new InputError('Abschluss bereits mit anderen Werten erfasst.',409);
      return;
    }
    if(!transitions[lead.status]?.includes(status))throw new InputError('Statuswechsel nicht möglich.',409);
    if(status==='booked'&&!db.prepare('SELECT 1 FROM booking_evidence WHERE ref=?').get(ref))
      throw new InputError('Kundenannahme des aktuellen Angebots, Termin und Umfang mit dem Buchungsbefehl erfassen.',409);
    db.prepare('UPDATE leads SET status=?,updated=?,gross_cents=COALESCE(?,gross_cents),cost_cents=COALESCE(?,cost_cents) WHERE ref=?').run(status,iso(ms),gc,cc,ref);
    db.prepare('INSERT INTO events VALUES(?,?,?)').run(ref,status,iso(ms));
    if(status==='completed')updateSettlement(ref,ms);
  }
  db.exec('CREATE TABLE IF NOT EXISTS ad_attribution(ref TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE,variant TEXT NOT NULL)');
  const adForLead='(SELECT a.variant FROM ad_attribution a WHERE a.ref=l.ref)';
  const offers=openOffers(db,transaction,changeStage);
  const logContact=db.prepare('INSERT OR IGNORE INTO contact_events(ref,event,at) VALUES(?,?,?)');
  // Historical callbacks without a selected service keep their original category.
  const effectiveService="COALESCE(json_extract(l.person,'$.requestedService'),l.service)";
  return {
    mail,
    attachments,
    officeEvents,
    close(){db.close();},
    quote:offers.quote,
    book:offers.book,
    loss:offers.loss,
    async backup(target){
      if(!target||!path.isAbsolute(target)||existsSync(target))throw new InputError('Neuen, absoluten Sicherungspfad angeben.');
      await backup(db,target);
      if(process.platform!=='win32')chmodSync(target,0o600);
    },
    submit(lead,ms=Date.now(),notify=false,entry='manual',mailRoute=null,files=[],recordOfficeEvents=false){
      const {requestId,source,adVariant,attribution,contactMethod,contact,service,...fields}=lead;
      const person={...fields,contactMethod,contact};
      const fileKey=files.length ? [files.map(f=>[f.name,f.mime,f.digest])] : [];
      const fingerprint=sign(JSON.stringify([source,service,person,...fileKey]));
      const merge=sign(JSON.stringify([service,person,...fileKey]));
      const identity=sign(contactMethod+'|'+contact);
      function receipt(ref,created){
        if(entry==='web'){
          logContact.run(ref,'inquiry_received',iso(ms));
          if(contactMethod==='phone')logContact.run(ref,'callback_requested',iso(ms));
        }
        return {reference:ref,created};
      }
      return transaction(()=>{
        const replay=db.prepare('SELECT ref,digest FROM receipts WHERE id=?').get(requestId);
        if(replay){if(replay.digest!==fingerprint)throw new InputError('Die Anfrage wurde geändert. Bitte erneut beginnen.',409);return receipt(replay.ref,false);}
        let found=db.prepare('SELECT ref FROM leads WHERE merge_key=? AND created>=? ORDER BY created DESC LIMIT 1').get(merge,iso(ms-30*60000));
        const created=!found;
        if(created){
          const ref='AN-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
          addCalculatedScope(person,service);
          db.prepare("INSERT INTO leads(ref,created,updated,status,service,source,person,identity,merge_key) VALUES(?,?,?,'new',?,?,?,?,?)").run(ref,iso(ms),iso(ms),service,source,JSON.stringify(person),identity,merge);
          attachments.save(ref,files);
          if(entry==='web' && recordOfficeEvents)officeEvents.add(ref,service,person.requestedService,source,ms,attribution);
          if(source==='google' && isGoogleAdVariant(adVariant))db.prepare('INSERT INTO ad_attribution(ref,variant) VALUES(?,?)').run(ref,adVariant);
          db.prepare("INSERT INTO events VALUES(?,'new',?)").run(ref,iso(ms));found={ref};
          if(notify)db.prepare('INSERT INTO notices(ref,due) VALUES(?,?)').run(ref,ms);
          if(entry==='web' && mailRoute)mail.enqueue(ref,mailRoute,ms);
        }
        db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(requestId,found.ref,fingerprint);
        return receipt(found.ref,created);
      });
    },
    claimNotice(ms=Date.now()){
      return transaction(()=>{
        const row=db.prepare('SELECT n.ref,n.attempts,l.service FROM notices n JOIN leads l ON l.ref=n.ref WHERE n.due<=? ORDER BY n.due LIMIT 1').get(ms);
        if(!row)return null;
        db.prepare('UPDATE notices SET attempts=attempts+1,due=? WHERE ref=?').run(ms+60000,row.ref);
        return row;
      });
    },
    finishNotice(ref){db.prepare('DELETE FROM notices WHERE ref=?').run(ref);},
    retryNotice(ref,previousAttempts,ms=Date.now()){
      const delay=30000*2**Math.min(previousAttempts,9);
      db.prepare('UPDATE notices SET due=? WHERE ref=?').run(ms+Math.min(delay,6*3600000),ref);
    },
    landing(page,source,ms=Date.now()){
      if(!sources.has(source))source='unbekannt';
      const day=berlinDate.format(ms);
      db.prepare('INSERT INTO landings VALUES(?,?,?,1) ON CONFLICT(day,source,page) DO UPDATE SET hits=hits+1').run(day,source,page);
    },
    contactClick({event,source,eventId},ms=Date.now()){
      return transaction(()=>{
        db.prepare('DELETE FROM click_replays WHERE expires<=?').run(ms);
        const added=db.prepare('INSERT OR IGNORE INTO click_replays VALUES(?,?)').run(sign('click|'+eventId),ms+86400000);
        if(added.changes)db.prepare('INSERT INTO contact_counts VALUES(?,?,?,1) ON CONFLICT(day,source,event) DO UPDATE SET hits=hits+1').run(berlinDate.format(ms),source,event);
        return Boolean(added.changes);
      });
    },
    expireClickReplays(ms=Date.now()){db.prepare('DELETE FROM click_replays WHERE expires<=?').run(ms);},
    confirmContact(ref,event,ms=Date.now()){
      if(!confirmations.has(event))throw new InputError('Bestätigtes Kontakt-Ereignis angeben.');
      return transaction(()=>{
        if(!db.prepare('SELECT 1 FROM leads WHERE ref=?').get(ref))throw new InputError('Vorgang unbekannt.',404);
        if(event==='callback_completed'){
          if(!db.prepare("SELECT 1 FROM contact_events WHERE ref=? AND event='callback_requested'").get(ref))throw new InputError('Kein Rückrufwunsch zu diesem Vorgang erfasst.',409);
          logContact.run(ref,'phone_connected',iso(ms));
        }
        const result=logContact.run(ref,event,iso(ms));
        return {reference:ref,event,created:Boolean(result.changes)};
      });
    },
    list(){return db.prepare('SELECT ref,created,updated,status,service,source FROM leads ORDER BY created DESC').all();},
    callbacks(){
      const pending=db.prepare(`
        SELECT l.ref, requested.at AS requestedAt, l.status, l.source, l.service, l.person
        FROM contact_events AS requested
        JOIN leads AS l ON l.ref=requested.ref
        WHERE requested.event='callback_requested'
          AND l.status IN ('new','qualified','quoted','booked')
          AND NOT EXISTS (
            SELECT 1 FROM contact_events AS done
            WHERE done.ref=l.ref AND done.event='callback_completed'
          )
        ORDER BY requested.at, l.ref
      `).all();
      return pending.map(({ref,requestedAt,status,source,service,person})=>{
        const {name,contact,timeframe,requestedService}=JSON.parse(person);
        const shortForm=service==='rueckruf';
        return {ref,requestedAt,status,source,service:shortForm ? (requestedService || service) : service,
          name,phone:contact,callbackWindow:shortForm ? timeframe || '' : '',moveWindow:shortForm ? '' : timeframe || ''};
      });
    },
    get(ref){const l=db.prepare('SELECT ref,created,updated,status,service,source,'+adForLead+' AS adVariant,person,gross_cents,cost_cents,'+netPaid+' AS collected_cents,('+settled+') AS currentlyPaidInFull FROM leads l WHERE l.ref=?').get(ref);
      if(!l)return null;
      const person=JSON.parse(l.person);
      const scopeDetails=person.jobScope?{jobScopeSummary:summarizeJobScope(person.jobScope).split('\n')}:{};
      return {...l,person,attachments:attachments.list(ref),...scopeDetails,...offers.details(ref),events:db.prepare('SELECT status,at FROM events WHERE ref=? ORDER BY at,rowid').all(ref),
        contactEvents:db.prepare('SELECT event,at FROM contact_events WHERE ref=? ORDER BY at,rowid').all(ref),
        payments:db.prepare('SELECT entry,direction,amount AS amount_cents,at FROM payments WHERE ref=? ORDER BY at,rowid').all(ref),
        links:db.prepare('SELECT secondary,principal,reason,at FROM links WHERE secondary=? OR principal=? ORDER BY at').all(ref,ref)};},
    link(secondary,principal,reason,ms=Date.now()){
      const evidence=string(reason,250,'Prüfvermerk',{required:true});
      return transaction(()=>{
        if(secondary===principal)throw new InputError('Zwei unterschiedliche Vorgänge angeben.');
        const old=db.prepare('SELECT principal FROM links WHERE secondary=?').get(secondary);
        if(old){if(old.principal!==principal)throw new InputError('Vorgang bereits anders zugeordnet.',409);return {created:false};}
        const a=db.prepare('SELECT status FROM leads WHERE ref=?').get(secondary);
        const b=db.prepare('SELECT status FROM leads WHERE ref=?').get(principal);
        if(!a||!b)throw new InputError('Vorgang unbekannt.',404);
        const previouslyBooked=db.prepare("SELECT 1 FROM events WHERE ref=? AND status='booked'").get(secondary);
        if(previouslyBooked||!['new','qualified','quoted','lost'].includes(a.status)||b.status==='linked'||db.prepare('SELECT 1 FROM links WHERE principal=?').get(secondary))throw new InputError('Gebuchten Auftrag und vorhandene Zuordnungen zuerst prüfen.',409);
        db.prepare('INSERT INTO links VALUES(?,?,?,?)').run(secondary,principal,evidence,iso(ms));
        db.prepare("UPDATE leads SET status='linked',updated=? WHERE ref=?").run(iso(ms),secondary);
        db.prepare("INSERT INTO events VALUES(?,'linked',?)").run(secondary,iso(ms));
        db.prepare('DELETE FROM notices WHERE ref=?').run(secondary);
        mail.discard(secondary);
        return {created:true};
      });
    },
    unlink(secondary,ms=Date.now()){
      return transaction(()=>{
        const link=db.prepare('SELECT 1 FROM links WHERE secondary=?').get(secondary);
        if(!link)return {changed:false};
        const last=db.prepare("SELECT status FROM events WHERE ref=? AND status<>'linked' ORDER BY at DESC,rowid DESC LIMIT 1").get(secondary);
        db.prepare('DELETE FROM links WHERE secondary=?').run(secondary);
        db.prepare("DELETE FROM events WHERE ref=? AND status='linked'").run(secondary);
        db.prepare('UPDATE leads SET status=?,updated=? WHERE ref=?').run(last.status,iso(ms),secondary);
        return {changed:true};
      });
    },
    paidOrders(){
      return db.prepare("SELECT l.ref AS orderId, e.at AS firstPaidAfterCompletion,l.source,"+adForLead+" AS adVariant,"+effectiveService+" AS service,l.gross_cents AS invoicedGrossCents,"+netPaid+" AS receivedLessRefundCents,("+settled+") AS currentlyPaidInFull FROM events e JOIN leads l ON l.ref=e.ref WHERE e.status='paid' ORDER BY e.at,l.ref").all();
    },
    payment(ref,entry,direction,amount,ms=Date.now()){
      const cents=cleanMoney(amount);
      if(!['payment','refund'].includes(direction)||!Number.isInteger(cents)||cents<=0)throw new InputError('Zahlung oder Erstattung mit positivem Betrag angeben.');
      if(typeof entry!=='string'||!/^[a-zA-Z0-9._-]{4,80}$/.test(entry))throw new InputError('Eindeutigen Buchungsschlüssel mit 4 bis 80 Zeichen angeben.');
      return transaction(()=>{
        const old=db.prepare('SELECT ref,direction,amount FROM payments WHERE entry=?').get(entry);
        if(old){if(old.ref!==ref||old.direction!==direction||old.amount!==cents)throw new InputError('Buchungsschlüssel mit abweichenden Daten vorhanden.',409);return {created:false};}
        const row=db.prepare('SELECT l.status,'+netPaid+' AS net FROM leads l WHERE ref=?').get(ref);
        if(!row)throw new InputError('Auftrag unbekannt.',404);
        if(!['booked','completed','lost'].includes(row.status)||row.status==='lost'&&direction!=='refund')throw new InputError('Zahlung zuerst einem bestätigten Auftrag zuordnen.',409);
        if(direction==='refund'&&cents>row.net)throw new InputError('Erstattung übersteigt erfassten Zahlungseingang.',409);
        db.prepare('INSERT INTO payments VALUES(?,?,?,?,?)').run(entry,ref,direction,cents,iso(ms));
        db.prepare('UPDATE leads SET updated=? WHERE ref=?').run(iso(ms),ref);
        updateSettlement(ref,ms);return {created:true};
      });
    },
    stage(ref,status,gross,cost,ms=Date.now()){
      const gc=cleanMoney(gross),cc=cleanMoney(cost);
      if(Number.isNaN(gc)||Number.isNaN(cc))throw new InputError('Beträge in EUR mit höchstens zwei Nachkommastellen eingeben.');
      if(status==='completed'&&(gc==null||cc==null))throw new InputError('Für den Abschluss Verkaufspreis brutto und tatsächliche Kosten netto eintragen.');
      if(status!=='completed'&&(gc!=null||cc!=null))throw new InputError('Abschlussbeträge erst nach Leistungserbringung eintragen.');
      return transaction(()=>changeStage(ref,status,gc,cc,ms));
    },
    report(start='0000-01-01',end='9999-12-31'){
      const dayFormat=/^\d{4}-\d{2}-\d{2}$/;
      if(!dayFormat.test(start)||!dayFormat.test(end)||start>end)throw new InputError('Berichtszeitraum als YYYY-MM-DD angeben.');
      const dates=' WHERE berlin_day(l.created) BETWEEN ? AND ?';
      const counts="COUNT(*) AS inquiries,COUNT(DISTINCT identity) AS distinctContactDetails,SUM(l.status='linked') AS verifiedLinkedInquiries,SUM(l.status<>'linked' AND EXISTS(SELECT 1 FROM events e WHERE e.ref=l.ref AND e.status='qualified')) AS qualified,SUM(l.status<>'linked' AND EXISTS(SELECT 1 FROM events e WHERE e.ref=l.ref AND e.status='quoted')) AS quoted,SUM(EXISTS(SELECT 1 FROM events e WHERE e.ref=l.ref AND e.status='booked')) AS bookings,SUM(l.status='booked') AS openBookings,SUM(l.status='completed') AS completed,SUM(l.status='lost') AS closedWithoutCompletion,ROUND(SUM(CASE WHEN l.status='completed' THEN l.gross_cents/1.19-l.cost_cents END)/100.0,2) AS realizedContributionBeforeAdsEUR,SUM("+settled+") AS currentlyPaidInFull,SUM(EXISTS(SELECT 1 FROM events e WHERE e.ref=l.ref AND e.status='paid')) AS everPaidOrders,SUM("+netPaid+")/100.0 AS receivedLessRefundsEUR,ROUND(SUM(CASE WHEN "+settled+" THEN l.gross_cents/1.19-l.cost_cents END)/100.0,2) AS fullyPaidContributionBeforeAdsEUR";
      const collected=",ROUND(SUM(CASE WHEN l.status='completed' THEN MIN("+netPaid+",l.gross_cents)/1.19-l.cost_cents END)/100.0,2) AS collectedContributionBeforeAdsEUR";
      const refunds=",COALESCE(SUM((SELECT SUM(p.amount) FROM payments p WHERE p.ref=l.ref AND p.direction='refund')),0)/100.0 AS refundsEUR";
      function by(columns,grouping,filter=''){return db.prepare('SELECT '+columns+','+counts+collected+refunds+' FROM leads l'+dates+filter+' GROUP BY '+grouping+' ORDER BY '+grouping).all(start,end);}
      const googleAdCohorts=by("COALESCE("+adForLead+",'unbekannt') AS adVariant",'1'," AND l.source='google'");
      const summary=db.prepare('SELECT COUNT(*) AS inquiries,COUNT(DISTINCT identity) AS distinctContactDetails FROM leads l'+dates).get(start,end);
      const notices=db.prepare('SELECT COUNT(*) AS awaitingDelivery,COALESCE(MAX(attempts),0) AS maximumAttempts FROM notices').get();
      notices.awaitingStaffMail = mail.count();
      const contactOutcomes=db.prepare('SELECT l.source,c.event,COUNT(*) AS inquiries FROM contact_events c JOIN leads l ON l.ref=c.ref'+dates+' GROUP BY l.source,c.event ORDER BY l.source,c.event').all(start,end);
      const contactIntentClicks=db.prepare('SELECT day,source,event,hits FROM contact_counts WHERE day BETWEEN ? AND ? ORDER BY day DESC,source,event').all(start,end);
      const lossReasons=db.prepare(`SELECT l.source, ${effectiveService} AS service, r.code AS reason, COUNT(*) AS cases
        FROM loss_reasons r JOIN leads l ON l.ref=r.ref ${dates} AND l.status='lost'
        GROUP BY 1,2,3 ORDER BY 1,2,3`).all(start,end);
      const offerCohorts=db.prepare(`SELECT l.source, ${effectiveService} AS service,
        COUNT(*) AS pricedOffers, COUNT(q.planned_cost_cents) AS offersWithPlannedCost,
        SUM(q.gross_cents)/100.0 AS totalOfferedGrossEUR
        FROM current_quotes q JOIN leads l ON l.ref=q.ref ${dates} AND l.status<>'linked'
        GROUP BY 1,2 ORDER BY 1,2`).all(start,end);
      return {asOf:new Date().toISOString(),inquiryCohortDatesBerlin:{start,end},summary,channelCohorts:by('l.source','1'),channelServiceCohorts:by('l.source,'+effectiveService+' AS service','1,2'),googleAdCohorts,offerCohorts,lossReasons,contactOutcomes,contactIntentClicks,notificationQueue:notices,aggregatePageRequests:db.prepare('SELECT day,source,page,hits FROM landings WHERE day BETWEEN ? AND ? ORDER BY day DESC,source,page').all(start,end)};
    },
    erase(ref){return db.prepare('DELETE FROM leads WHERE ref=?').run(ref).changes;},
    prune(days,ms=Date.now()){
      if(!Number.isInteger(days)||days<=0)throw new InputError('Aufbewahrungsfrist ungültig.');
      const cutoff=iso(ms-days*86400000);return transaction(()=>{
        db.prepare('DELETE FROM landings WHERE day<?').run(cutoff.slice(0,10));
        db.prepare('DELETE FROM contact_counts WHERE day<?').run(cutoff.slice(0,10));
        db.prepare('DELETE FROM click_replays WHERE expires<=?').run(ms);
        return db.prepare("DELETE FROM leads AS l WHERE (l.status='linked' OR (l.status='lost' AND "+netPaid+"=0) OR ("+settled+")) AND l.updated<?").run(cutoff).changes;
      });
    }
  };
}

