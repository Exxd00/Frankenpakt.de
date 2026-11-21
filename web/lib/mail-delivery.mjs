import {createHash} from 'node:crypto';
import {renderLeadMail} from './lead-mail.mjs';

const mailbox = /^[a-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z\d!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/i;
// Resend retains idempotency keys for 24 hours. Allow for clock skew and transit.
const retryWindow = 23 * 60 * 60 * 1000;

export function staffMailSettings(env) {
  const {OPS_MAIL_FROM:from, OPS_MAIL_TO:to, OPS_MAIL_API_KEY:token} = env;
  if (!from && !to && !token) return null;
  if (![from,to].every(value => typeof value === 'string' && value.length <= 254 && mailbox.test(value) && !/\s/.test(value)) ||
      typeof token !== 'string' || !/^[\x21-\x7e]+$/.test(token)) {
    throw new Error('Set one sender mailbox (OPS_MAIL_FROM), one staff mailbox (OPS_MAIL_TO) and OPS_MAIL_API_KEY.');
  }
  // A configuration change must not send an already queued inquiry to a different mailbox.
  const route = createHash('sha256').update(JSON.stringify([from,to])).digest('hex');
  return {from,to,token,route};
}

export function openStaffMailQueue(db, transaction) {
  db.exec(`CREATE TABLE IF NOT EXISTS staff_mail (
    ref TEXT PRIMARY KEY REFERENCES leads(ref) ON DELETE CASCADE, route TEXT NOT NULL,
    due INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, first_attempt INTEGER, payload TEXT
  )`);
  const remove = db.prepare('DELETE FROM staff_mail WHERE ref=?');
  return {
    enqueue(ref, route, ms) {
      db.prepare('INSERT INTO staff_mail(ref,route,due) VALUES(?,?,?)').run(ref,route,ms);
    },
    discard(ref) { return remove.run(ref).changes; },
    claim(route, ms) {
      return transaction(() => {
        const row = db.prepare(`SELECT ref, attempts, payload FROM staff_mail
          WHERE route=? AND due<=? AND (first_attempt IS NULL OR first_attempt>?) ORDER BY due,ref LIMIT 1`).get(route,ms,ms-retryWindow);
        if (!row) return null;
        row.attempts++;
        db.prepare('UPDATE staff_mail SET attempts=?, first_attempt=COALESCE(first_attempt,?), due=? WHERE ref=?')
          .run(row.attempts,ms,ms+60000,row.ref);
        return row;
      });
    },
    keepPayload(job, payload) {
      return db.prepare('UPDATE staff_mail SET payload=? WHERE ref=? AND attempts=?').run(payload,job.ref,job.attempts).changes;
    },
    finish(job) {
      db.prepare('DELETE FROM staff_mail WHERE ref=? AND attempts=?').run(job.ref,job.attempts);
    },
    retry(job, ms) {
      const delay = Math.min(30000 * 2 ** Math.min(job.attempts-1, 10), 6*3600000);
      db.prepare('UPDATE staff_mail SET due=? WHERE ref=? AND attempts=?').run(ms+delay,job.ref,job.attempts);
    },
    list(route, ms=Date.now()) {
      return db.prepare(`SELECT ref, attempts, CASE
        WHEN first_attempt<=? THEN 'check_provider'
        WHEN route<>? THEN 'check_mailbox'
        ELSE 'queued' END AS state FROM staff_mail ORDER BY due,ref`).all(ms-retryWindow,route || '');
    },
    count() { return db.prepare('SELECT COUNT(*) AS n FROM staff_mail').get().n; }
  };
}

export async function deliverStaffMail(store, settings, {send=fetch, clock=Date.now, signal}={}) {
  if (!settings) return;
  for (let count=0; count<12 && !signal?.aborted; count++) {
    const next = store.mail.claim(settings.route,clock());
    if (!next) return;
    try {
      let body = next.payload;
      if (!body) {
        const lead = store.get(next.ref);
        if (!lead) continue;
        const {subject,html,text} = renderLeadMail(lead);
        body = JSON.stringify({from:'FrankenPackt <'+settings.from+'>',to:[settings.to],subject,html,text});
        // Repeat exactly the same bytes on a retry, including after a template update.
        if (!store.mail.keepPayload(next,body)) continue;
      }
      const timeout = AbortSignal.timeout(5000);
      const response = await send('https://api.resend.com/emails',{
        method:'POST',redirect:'error',signal:signal ? AbortSignal.any([signal,timeout]) : timeout,
        headers:{Authorization:'Bearer '+settings.token,'Content-Type':'application/json','Idempotency-Key':'inquiry/'+next.ref},
        body
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Mail not accepted'); }
      const receipt = await response.json();
      if (typeof receipt?.id !== 'string' || !receipt.id.trim()) throw new Error('Missing mail receipt');
      store.mail.finish(next);
    } catch {
      store.mail.retry(next,clock());
    }
  }
}
