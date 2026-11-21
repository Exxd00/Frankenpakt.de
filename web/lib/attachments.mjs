import {createHash} from 'node:crypto';
import {crc32,deflateRawSync,gunzipSync} from 'node:zlib';
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

export function openAttachments(db) {
  db.exec('CREATE TABLE IF NOT EXISTS lead_files(ref TEXT NOT NULL REFERENCES leads(ref) ON DELETE CASCADE, id INTEGER NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, PRIMARY KEY(ref,id))');
  const insert=db.prepare('INSERT INTO lead_files(ref,id,name,mime,content) VALUES(?,?,?,?,?)');
  return {
    save(ref,files) {files.forEach(({name,mime,content},i)=>insert.run(ref,i+1,name,mime,content));},
    list(ref) {return db.prepare('SELECT id,name,mime,length(content) AS size FROM lead_files WHERE ref=? ORDER BY id').all(ref);},
    get(ref,id) {
      const row=db.prepare('SELECT name,mime,content,length(content) AS size FROM lead_files WHERE ref=? AND id=?').get(ref,id);
      return row ? {...row,content:Buffer.from(row.content)} : null;
    }
  };
}

export function serveAttachment(res,file,head=false) {
  res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':file.size,'Cache-Control':'private, no-store',
    'Content-Security-Policy':"sandbox; default-src 'none'",'X-Content-Type-Options':'nosniff',
    'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))});
  res.end(head?undefined:file.content);
}

// Single UTF-8 file in a ZIP archive. Keep PDF signatures and text bytes intact.
export function mailAttachment({name,mime,content}) {
  if(mime!=='image/jpeg') {
    const label=Buffer.from(name);
    const compressed=deflateRawSync(content);
    const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
    const localSize=local.length+label.length+compressed.length,centralSize=central.length+label.length;
    if(localSize+centralSize+end.length<content.length) {
      local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);
      local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);
      local.writeUInt32LE(crc32(content),14);local.writeUInt32LE(compressed.length,18);
      local.writeUInt32LE(content.length,22);local.writeUInt16LE(label.length,26);
      central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);local.copy(central,6,4,30);
      end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
      end.writeUInt32LE(centralSize,12);end.writeUInt32LE(localSize,16);
      return {filename:name+'.zip',content_type:'application/zip',
        content:Buffer.concat([local,label,compressed,central,label,end]).toString('base64')};
    }
  }
  return {filename:name,content_type:mime,content:content.toString('base64')};
}
