// Two detailed addresses and a room-by-room inventory can include multibyte text.
export const maxLeadBodyBytes=128*1024;

export class InputError extends Error {
  constructor(message, status=400) {
    super(message);
    this.status=status;
  }
}

export function cleanMoney(input) {
  if(input==null || input==='')return null;
  if(!/^\d+(?:\.\d{1,2})?$/.test(String(input)) || Number(input)>=1e8)return NaN;
  return Math.round(Number(input)*100);
}

const googleAdVariants=new Set(['privatumzug-team','seniorenumzug-team','entruempelung-nuernberg','entsorgung-nuernberg']);
export function isGoogleAdVariant(value) {
  return googleAdVariants.has(value);
}
