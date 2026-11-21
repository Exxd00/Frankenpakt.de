import { cleanMoney, InputError } from './inputs.mjs';

const lossCodes=new Set(['price','timing','capacity','scope','outside_area','no_response','customer_cancelled','other']);
const acceptanceChannels=new Set(['email','phone','whatsapp','signed','in_person']);
const bookingKeys=new Set(['revision','serviceDate','scope','customerAccepted','acceptanceChannel','acceptanceRef','exceptionReason']);

function bookingText(value,max,label) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f\x7f]/.test(value))
    throw new InputError(label+' bitte prüfen.');
  return value.trim();
}
function bookingData(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!bookingKeys.has(k)))
    throw new InputError('Strukturierte Buchungsbestätigung angeben.');
  const {revision,serviceDate,customerAccepted,acceptanceChannel}=input;
  if(!Number.isSafeInteger(revision)||revision<1||customerAccepted!==true||!acceptanceChannels.has(acceptanceChannel))
    throw new InputError('Angebotsversion, bestätigte Kundenannahme und Kontaktweg angeben.');
  const day=typeof serviceDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)?new Date(serviceDate+'T00:00:00Z'):null;
  if(!day||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==serviceDate)
    throw new InputError('Vereinbartes Einsatzdatum als YYYY-MM-DD angeben.');
  const scope=bookingText(input.scope,400,'Vereinbarter Leistungsumfang');
  const acceptanceRef=bookingText(input.acceptanceRef,120,'Interner Belegverweis zur Annahme');
  const exceptionReason=input.exceptionReason==null?'':bookingText(input.exceptionReason,250,'Wirtschaftlicher Ausnahmegrund');
  return {revision,serviceDate,scope,customerAccepted,acceptanceChannel,acceptanceRef,exceptionReason};
}

function quoteView(row) {
  if(!row)return null;
  const result={revision:row.revision,at:row.at,quotedGrossEUR:row.gross_cents/100,
    plannedFulfillmentNetEUR:null,expectedContributionBeforeAdsEUR:null,maxAcquisitionSpendEUR:null};
  if(row.planned_cost_cents==null)return result;
  // The launch model targets a margin on net revenue after advertising and fulfillment.
  const netCents=row.gross_cents*100/119;
  result.plannedFulfillmentNetEUR=row.planned_cost_cents/100;
  result.expectedContributionBeforeAdsEUR=Math.round(netCents-row.planned_cost_cents)/100;
  result.maxAcquisitionSpendEUR=Math.max(0,Math.round(netCents*.8-row.planned_cost_cents))/100;
  result.planningAssumptions={vatPercent:19,targetMarginOnNetRevenuePercent:20};
  return result;
}

export function openOffers(db,transaction,changeStage) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quote_versions (
      ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      gross_cents INTEGER NOT NULL,
      planned_cost_cents INTEGER,
      at TEXT NOT NULL,
      PRIMARY KEY(ref,revision)
    );
    CREATE VIEW IF NOT EXISTS current_quotes AS
      SELECT q.* FROM quote_versions q
      WHERE q.revision=(SELECT MAX(v.revision) FROM quote_versions v WHERE v.ref=q.ref);
    CREATE TABLE IF NOT EXISTS loss_reasons (
      ref TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE,
      code TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS booking_evidence (
      ref TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      details TEXT NOT NULL,
      at TEXT NOT NULL,
      FOREIGN KEY(ref,revision) REFERENCES quote_versions(ref,revision) ON DELETE CASCADE
    );
  `);
  const latest=db.prepare('SELECT * FROM current_quotes WHERE ref=?');
  const reason=db.prepare('SELECT code,at FROM loss_reasons WHERE ref=?');
  const booking=db.prepare('SELECT details,at FROM booking_evidence WHERE ref=?');
  return {
    details(ref) {
      const evidence=booking.get(ref);
      return {quote:quoteView(latest.get(ref)),lossReason:reason.get(ref)||null,
        bookingEvidence:evidence?{...JSON.parse(evidence.details),recordedAt:evidence.at}:null};
    },
    book(ref,input,ms=Date.now()) {
      const evidence=bookingData(input);
      const serialized=JSON.stringify(evidence);
      return transaction(()=>{
        const old=booking.get(ref);
        if(old) {
          if(old.details!==serialized)throw new InputError('Buchung bereits mit anderen Angaben erfasst.',409);
          return {reference:ref,created:false,revision:evidence.revision};
        }
        const lead=db.prepare('SELECT status FROM leads WHERE ref=?').get(ref);
        if(!lead)throw new InputError('Anfrage unbekannt.',404);
        if(lead.status!=='quoted')throw new InputError('Für eine neue Buchung wird ein offenes Angebot benötigt.',409);
        const quote=latest.get(ref);
        if(!quote||quote.revision!==evidence.revision)
          throw new InputError('Der Kunde muss die aktuelle Angebotsversion bestätigen.',409);
        if(quote.planned_cost_cents==null)throw new InputError('Vor der Buchung geplante Nettokosten im Angebot erfassen.',409);
        const contribution=quoteView(quote).expectedContributionBeforeAdsEUR;
        if((contribution<=0||quote.planned_cost_cents===0)&&!evidence.exceptionReason)
          throw new InputError('Für diese Kalkulation wirtschaftlichen Ausnahmegrund dokumentieren.',409);
        const at=new Date(ms).toISOString();
        db.prepare('INSERT INTO booking_evidence(ref,revision,details,at) VALUES(?,?,?,?)').run(ref,quote.revision,serialized,at);
        changeStage(ref,'booked',null,null,ms);
        return {reference:ref,created:true,revision:evidence.revision};
      });
    },
    quote(ref,revision,gross,plannedCost,ms=Date.now()) {
      const version=Number(revision),grossCents=cleanMoney(gross),costCents=cleanMoney(plannedCost);
      if(!/^[1-9]\d*$/.test(String(revision)) || !Number.isSafeInteger(version))
        throw new InputError('Fortlaufende Angebotsversion ab 1 angeben.');
      if(!Number.isInteger(grossCents) || grossCents<=0 || Number.isNaN(costCents))
        throw new InputError('Positiven Bruttopreis und optional geplante Nettokosten in EUR angeben.');
      return transaction(()=>{
        const old=db.prepare('SELECT * FROM quote_versions WHERE ref=? AND revision=?').get(ref,version);
        if(old) {
          if(old.gross_cents!==grossCents || old.planned_cost_cents!==costCents)
            throw new InputError('Angebotsversion mit anderen Beträgen vorhanden.',409);
          return {reference:ref,created:false,quote:quoteView(old)};
        }
        const current=latest.get(ref);
        if(version!==(current?.revision??0)+1)throw new InputError('Die nächste fortlaufende Angebotsversion verwenden.',409);
        changeStage(ref,'quoted',null,null,ms);
        const at=new Date(ms).toISOString();
        db.prepare('INSERT INTO quote_versions(ref,revision,gross_cents,planned_cost_cents,at) VALUES(?,?,?,?,?)')
          .run(ref,version,grossCents,costCents,at);
        db.prepare('UPDATE leads SET updated=? WHERE ref=?').run(at,ref);
        return {reference:ref,created:true,quote:quoteView(latest.get(ref))};
      });
    },
    loss(ref,code,ms=Date.now()) {
      if(!lossCodes.has(code))throw new InputError('Verlustgrund angeben: '+[...lossCodes].join(', ')+'.');
      return transaction(()=>{
        const old=reason.get(ref);
        if(old) {
          if(old.code!==code)throw new InputError('Vorgang bereits mit anderem Verlustgrund geschlossen.',409);
          return {reference:ref,created:false,lossReason:old};
        }
        changeStage(ref,'lost',null,null,ms);
        const at=new Date(ms).toISOString();
        db.prepare('INSERT INTO loss_reasons(ref,code,at) VALUES(?,?,?)').run(ref,code,at);
        return {reference:ref,created:true,lossReason:reason.get(ref)};
      });
    }
  };
}
