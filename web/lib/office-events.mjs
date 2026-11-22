import {randomUUID} from 'node:crypto';

const endpoint='https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events';
export function officeEventsQueue(db,transaction){
  db.exec('CREATE TABLE IF NOT EXISTS office_event_queue(id TEXT PRIMARY KEY,ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE,event TEXT NOT NULL,service TEXT NOT NULL,source TEXT NOT NULL,due INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0)');
  if(!db.prepare('PRAGMA table_info(office_event_queue)').all().some(column=>column.name==='attribution')){
    db.exec('ALTER TABLE office_event_queue ADD COLUMN attribution TEXT');
  }
  const add=db.prepare('INSERT INTO office_event_queue(id,ref,event,service,source,due,attribution) VALUES(?,?,?,?,?,?,?)');
  const next=db.prepare('SELECT id,event,service,source,attempts,attribution FROM office_event_queue WHERE due<=? ORDER BY due LIMIT 1');
  return {
    add(ref,service,requestedService,source,ms,attribution){
      const payload=attribution?JSON.stringify(attribution):null;
      add.run(randomUUID(),ref,'inquiry_received',requestedService||service,source,ms,payload);
      if(service==='rueckruf')add.run(randomUUID(),ref,'callback_requested',requestedService||service,source,ms,payload);
    },
    claim(ms){
      return transaction(()=>{
        const row=next.get(ms);if(!row)return null;
        row.attempts++;
        db.prepare('UPDATE office_event_queue SET due=?,attempts=? WHERE id=?').run(ms+60000,row.attempts,row.id);
        return row;
      });
    },
    done(row){db.prepare('DELETE FROM office_event_queue WHERE id=? AND attempts=?').run(row.id,row.attempts);},
    retry(row,ms){db.prepare('UPDATE office_event_queue SET due=? WHERE id=? AND attempts=?').run(ms+Math.min(3600000,30000*2**Math.min(row.attempts-1,8)),row.id,row.attempts);}
  };
}

export async function deliverOfficeEvents(queue,key,{send=fetch,clock=Date.now,signal}={}){
  if(!key)return;
  for(let n=0;n<12&&!signal?.aborted;n++){
    const row=queue.claim(clock());if(!row)return;
    try{
      const {id,event,service,source}=row;
      const timeout=AbortSignal.timeout(5000);
      const result=await send(endpoint,{method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,timeout]):timeout,
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({id,event,service,source,count:1,...row.attribution && {attribution:JSON.parse(row.attribution)}})});
      await result.body?.cancel();
      if(!result.ok)throw Error('Event pending');
      queue.done(row);
    }catch{queue.retry(row,clock());}
  }
}
