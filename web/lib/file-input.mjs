import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {InputError, maxLeadBodyBytes} from './inputs.mjs';
import {maxFiles, maxWireBytes, maxContentBytes} from '../public/assets/file-limits.js';

const allowed = new Map([['.jpg','image/jpeg'],['.pdf','application/pdf'],['.txt','text/plain']]);
export const maxMultipartBytes = maxWireBytes + maxLeadBodyBytes + 16 * 1024;
const invalid = () => new InputError('Die ausgewählte Datei konnte nicht gelesen werden.');

function contentMatches(mime, data) {
  if (mime === 'image/jpeg') return data.length>4 && data[0]===255 && data[1]===216 && data[2]===255 && data.at(-2)===255 && data.at(-1)===217;
  if (mime === 'application/pdf') return data.subarray(0,5).toString('ascii')==='%PDF-' && data.subarray(-1024).includes('%%EOF');
  try {return !/[\x00-\x08\x0b\x0e-\x1f]/u.test(new TextDecoder('utf-8',{fatal:true}).decode(data));}
  catch {return false;}
}

export async function parseFileRequest(bytes, type) {
  let form;
  try {form=await new Response(bytes,{headers:{'content-type':type}}).formData();}
  catch {throw invalid();}
  const inquiry=form.get('inquiry');
  const parts=form.getAll('attachment');
  if(typeof inquiry!=='string'||Buffer.byteLength(inquiry)>maxLeadBodyBytes||form.getAll('inquiry').length!==1||
    !parts.length||parts.length>maxFiles||[...form.keys()].some(k=>k!=='inquiry'&&k!=='attachment')) throw invalid();
  let fields;
  try {fields=JSON.parse(inquiry);} catch {throw invalid();}
  let contentBytes=0,wireBytes=0;
  const files=[];
  for(const part of parts) {
    if(typeof part==='string'||!part.size) throw invalid();
    wireBytes+=part.size;
    if(wireBytes>maxWireBytes) throw new InputError('Die Dateien sind zusammen zu groß.',413);
    const name=part.name.normalize('NFC');
    if(!name || name.length>120 || /[\x00-\x1f\x7f\\/:<>|"?*\u202a-\u202e\u2066-\u2069]/u.test(name) || name.startsWith('.')) throw invalid();
    const mime=allowed.get(name.slice(name.lastIndexOf('.')).toLowerCase());
    if(!mime) throw invalid();
    let content=Buffer.from(await part.arrayBuffer());
    if(part.type==='application/gzip' && mime!=='image/jpeg') {
      try {content=gunzipSync(content,{maxOutputLength:Math.max(1,maxContentBytes-contentBytes)});}
      catch {throw invalid();}
    } else if (part.type!==mime) throw invalid();
    contentBytes+=content.length;
    if(contentBytes>maxContentBytes)throw new InputError('Die Dateien sind zusammen zu groß.',413);
    if(!content.length||!contentMatches(mime,content)) throw invalid();
    files.push({name,mime,content,digest:createHash('sha256').update(content).digest('hex')});
  }
  return {fields,files};
}
