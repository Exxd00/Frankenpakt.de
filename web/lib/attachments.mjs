import {Buffer} from 'node:buffer';
import {deflateRawSync} from 'node:zlib';
export {maxMultipartBytes,parseFileRequest} from './file-input.mjs';

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

// ZIP uses the reflected IEEE CRC-32 polynomial. The deployed Deno runtime's
// node:zlib.crc32 fails on binary input, including PDFs.
const crcTable=Uint32Array.from({length:256},(_,byte)=>{
  let value=byte;
  for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);
  return value;
});
function zipChecksum(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];
  return (crc^0xffffffff)>>>0;
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
      local.writeUInt32LE(zipChecksum(content),14);local.writeUInt32LE(compressed.length,18);
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
