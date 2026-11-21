import path from 'node:path';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const berlinDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'});
export function saveDailyReport(store,dir,now=Date.now()){
  const today=berlinDay.format(now);
  const midday=Date.parse(today+'T12:00:00Z');
  const dayBefore=offset=>new Date(midday-offset*86400000).toISOString().slice(0,10);
  const output=path.join(dir,'berichte');
  mkdirSync(output,{recursive:true,mode:0o700});
  const filename=path.join(output,today+'.json');
  if(existsSync(filename))return false;
  const tmp=path.join(output,'.'+randomUUID()+'.tmp');
  const metrics=store.report(dayBefore(30),dayBefore(1));
  try{
    writeFileSync(tmp,JSON.stringify(metrics,null,2)+'\n',{flag:'wx',mode:0o600});
    renameSync(tmp,filename);
  }finally{rmSync(tmp,{force:true});}
  return true;
}
