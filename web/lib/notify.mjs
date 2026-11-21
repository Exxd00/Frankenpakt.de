// Delivery contains an internal reference and service. Contact details stay in the local queue.
export function notificationSettings(env){
  const destination=env.OPS_NOTIFY_URL,token=env.OPS_NOTIFY_TOKEN;
  if(!destination&&!token)return null;
  if(!destination||!token||/[\r\n]/.test(token))throw new Error('Set both OPS_NOTIFY_URL and OPS_NOTIFY_TOKEN.');
  const url=new URL(destination);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Use an HTTPS notification endpoint without credentials or query.');
  return {url:url.toString(),token};
}
export async function deliverDue(db,settings,{send=fetch,clock=Date.now,signal}={}){
  if(!settings)return;
  // Bounded batches share a persisted lease across restarts and processes.
  for(let count=0;count<12&&!signal?.aborted;count++){
    const next=db.claimNotice(clock());
    if(!next)return;
    try{
      const timeout=AbortSignal.timeout(5000);
      const res=await send(settings.url,{
        method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,timeout]):timeout,
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+settings.token,'Idempotency-Key':next.ref},
        body:JSON.stringify({event:'inquiry_received',reference:next.ref,service:next.service})
      });
      await res.body?.cancel();
      if(!res.ok)throw new Error('Delivery not acknowledged.');
      db.finishNotice(next.ref);
    }catch{db.retryNotice(next.ref,next.attempts,clock());}
  }
}
