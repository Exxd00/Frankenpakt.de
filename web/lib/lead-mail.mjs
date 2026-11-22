import {jobSections, readItems, summarizeJobTiming} from '../public/assets/job-scope-model.js';
import {formatStartingPrice, normalizeActualJob, fillLevels} from '../public/assets/actual-job.js';
import {businessLines} from '../public/assets/business-projects.js';

const services = new Map(Object.entries({
  entruempelung:'Entrümpelung', entsorgung:'Entsorgung', umzug:'Umzug',
  seniorenumzug:'Seniorenumzug', moebeltaxi:'Möbeltaxi', transport:'Möbeltransport'
}));
const dateFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone:'Europe/Berlin', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
});
const numberFormat = new Intl.NumberFormat('de-DE', {maximumFractionDigits:2});
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#39;");
const ink = '#1c291f', muted = '#465447', paper = '#F7F5EF';
const heading = '#943529', section = '#365437';

function brief(value, limit = 200) {
  if (typeof value !== 'string') return '';
  const line = value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/\s+/gu,' ').trim();
  return line.length > limit ? line.slice(0,limit - 1).trimEnd() + '…' : line;
}

function contactLink(method, value) {
  if (method === 'phone' && /^\+?[\d ()/.-]+$/.test(value)) {
    const digits = value.replace(/[ ()/.-]/g,'');
    if (/^\+?\d{7,15}$/.test(digits)) return 'tel:' + digits;
  }
  if (method === 'email' && /^[^@\s<>,;:"]+@[^@\s<>,;:"/?#]+\.[^@\s<>,;:"/?#]+$/u.test(value)) {
    const [local,domain] = value.split('@');
    return 'mailto:' + encodeURIComponent(local) + '@' + encodeURIComponent(domain);
  }
  return '';
}

function locationLines(side, scope, zip) {
  const f = scope?.fields || {};
  const fields = jobSections(scope?.service).find(section => section.key === side)?.fields || [];
  const label = key => {
    const field = fields.find(field => field.key === side + key);
    return field?.options?.find(([value]) => value === f[side+key])?.[1] || '';
  };
  const place = [brief(f[side+'Zip'] || zip),brief(f[side+'Town'])].filter(Boolean).join(' ');
  const street = [brief(f[side+'Street']), place].filter(Boolean).join(', ');
  const floor = [label('Floor'),brief(f[side+'Level'])].filter(Boolean).join(' ');
  const path = [floor, label('Lift'), label('Parking'),
    /^\d+$/.test(f[side+'Carry']) ? f[side+'Carry']+' m Trageweg' : ''].filter(Boolean).join(' · ');
  return [street,path];
}

function scopeDigest(person, service) {
  const scope = person.jobScope;
  const facts = normalizeActualJob(person.estimateFacts,service);
  const f = scope?.fields || {};
  const rows = readItems(f.items);
  const items = rows.length ? rows : (facts?.items || []);
  const parts = [];
  if (facts?.service === 'entruempelung') {
    const rooms = facts.rooms.slice(0,3).map(room =>
      brief(room.name)+' · '+numberFormat.format(Number(room.area))+' m² · '+fillLevels[room.fill]);
    if (facts.rooms.length > 3) rooms.push('Weitere Räume im Vorgang: '+(facts.rooms.length-3));
    parts.push(...rooms);
  } else if (f.areas) {
    parts.push([brief(f.areas), f.areaSqm && brief(f.areaSqm)+' m²', fillLevels[f.fill]].filter(Boolean).join(' · '));
  } else if (facts?.service === 'umzug') {
    parts.push([numberFormat.format(Number(facts.rooms))+' Zimmer',
      facts.area !== 'unknown' && numberFormat.format(Number(facts.area))+' m²',
      facts.volume !== 'unknown' && numberFormat.format(Number(facts.volume))+' m³',
      facts.distance !== 'unknown' && numberFormat.format(Number(facts.distance))+' km'].filter(Boolean).join(' · '));
  }
  const inventory = items.slice(0,3).map(item => [brief(item.quantity),brief(item.name,72)].filter(Boolean).join(' × ')).filter(Boolean);
  if (inventory.length) parts.push(inventory.join(', '));
  if (items.length > 3) parts.push('Weitere Positionen im Vorgang: '+(items.length-3));
  return parts;
}

function bodyField(label, lines) {
  return '<tr><td style="padding:12px 0;border-top:1px solid #dce1d6;vertical-align:top">'+
    '<h2 style="margin:0 0 3px;font-size:15px;font-weight:bold;line-height:20px;color:'+section+'">'+escape(label)+'</h2>'+
    lines.map(line=>'<p style="margin:0;font-size:16px;line-height:24px;color:'+ink+'">'+escape(line)+'</p>').join('')+
    '</td></tr>';
}

/** Render the internal copy of a saved inquiry (the result of store.get). */
export function renderLeadMail(record) {
  const person = record?.person || {};
  const callback = record?.service === 'rueckruf';
  const service = callback ? person.requestedService : record?.service;
  const serviceLabel = services.get(service) || '';
  const business=businessLines(person.business);
  const title = business.length ? (callback?'Firmenrückruf gewünscht':'Firmenanfrage · '+(person.business.project==='firmenkunden'?serviceLabel:business[0][1])) : callback ? 'Rückruf gewünscht' : serviceLabel ? serviceLabel+' angefragt' : 'Neue Anfrage';
  const ref = /^AN-[A-Z0-9-]{1,40}$/.test(record?.ref) ? record.ref : '';
  const subject = [title,ref].filter(Boolean).join(' · ');
  const preheader = callback ? 'Kontakt und gewünschte Rückrufzeit im Überblick.' : 'Kontakt und Eckdaten für das persönliche Angebot.';
  const name = brief(person.name,120), contact = brief(person.contact,254);
  const href = contactLink(person.contactMethod,contact);
  const action = person.contactMethod === 'email' ? 'E-Mail schreiben' : callback ? 'Zurückrufen' : 'Anrufen';
  const fields = [];
  function add(label,...values) {
    const lines = values.filter(value => typeof value === 'string' && value.trim());
    if (lines.length) fields.push({label,lines});
  }
  if (callback) {
    add('Rückrufzeit',brief(person.timeframe));
    add('Anliegen',serviceLabel);
  }
  for(const [label,value] of business)add(label,brief(value,440));
  const timing = brief(summarizeJobTiming(person.jobScope)) || (!callback && brief(person.timeframe));
  add('Gewünschter Einsatztermin',timing);
  add(service === 'entruempelung' || service === 'entsorgung' ? 'Einsatzort' : 'Abholung',...locationLines('from',person.jobScope,person.zipFrom));
  add('Ziel',...locationLines('to',person.jobScope,person.zipTo));
  add('Umfang',...scopeDigest(person,service));
  const amount = formatStartingPrice(person.priceOrientation?.estimatedCents);
  if (amount && ['entsorgung','entruempelung','umzug'].includes(service)) {
    if (service === 'umzug') add('Regionaler Richtwert', amount+' brutto für Laden, Fahrt und Entladen.');
    else add('Regionaler Richtwert inkl. Entsorgung',amount+' brutto als Orientierung. Den Leistungsumfang im persönlichen Angebot aufführen.');
  }
  add('Nachricht',brief(person.details,480));
  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  const formatSize = bytes => bytes >= 1000000 ? numberFormat.format(bytes/1000000)+' MB' : Math.max(1,Math.ceil(bytes/1000))+' kB';
  const files = attachments.filter(file=>brief(file?.name,150) && Number.isSafeInteger(file.size) && file.size>0);
  if (files.length) add('Anhänge ('+files.length+')',...files.map(file=>brief(file.name,150)+' · '+formatSize(file.size)));
  const date = new Date(record?.created || '');
  const received = Number.isFinite(date.getTime()) ? 'Eingang '+dateFormat.format(date)+' Uhr (Berlin)' : '';
  const footer = [ref,received].filter(Boolean).join(' · ');
  const oneLine = value => '<p style="margin:0 0 4px;font-size:17px;line-height:25px">'+escape(value)+'</p>';
  const html = '<!doctype html><html lang="de" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+escape(title)+'</title></head><body style="margin:0;padding:0;background:'+paper+';color:'+ink+';font-family:Arial,Helvetica,sans-serif">'+
    '<div lang="de" dir="ltr" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all" aria-hidden="true">'+preheader+
    '&zwnj;&nbsp;'.repeat(96)+'</div>'+
    '<table lang="de" dir="ltr" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="'+paper+'"><tr><td align="center" style="padding:12px 8px">'+
    '<!--[if mso]><table role="presentation" width="530" cellpadding="0" cellspacing="0"><tr><td><![endif]-->'+
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:530px;table-layout:fixed;text-align:left;color:'+ink+';font-family:Arial,Helvetica,sans-serif;overflow-wrap:anywhere;word-wrap:break-word">'+
    '<tr><td bgcolor="#9CAF88" style="border-top:4px solid #E8412C;padding:12px 20px;font-size:19px;line-height:25px;font-weight:bold;color:'+ink+'">FrankenPackt</td></tr>'+
    '<tr><td bgcolor="#ffffff" style="padding:18px 20px 4px"><h1 style="margin:0 0 12px;color:'+heading+';font-size:25px;line-height:32px">'+escape(title)+'</h1>'+
    (name ? oneLine(name) : '')+(contact ? oneLine(contact) : '')+
    (href ? '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 12px"><tr><td bgcolor="#ad3022" style="border-radius:6px;mso-padding-alt:12px 18px"><a href="'+escape(href)+'" style="display:inline-block;padding:12px 18px;border-radius:6px;color:#ffffff;text-decoration:none;font-size:16px;line-height:22px;font-weight:bold">'+action+'</a></td></tr></table>' : '')+
    '</td></tr>'+(fields.length ? '<tr><td bgcolor="#ffffff" style="padding:0 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed">'+fields.map(({label,lines})=>bodyField(label,lines)).join('')+'</table></td></tr>' : '')+
    (footer ? '<tr><td style="padding:14px 20px;font-size:13px;line-height:20px;color:'+muted+'">'+escape(footer)+'</td></tr>' : '')+
    '</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
  const text = ['FrankenPackt · '+title,[name,contact].filter(Boolean).join('\n'),
    ...fields.map(({label,lines})=>[label,...lines].join('\n')),footer].filter(Boolean).join('\n\n');
  return {subject,preheader,html,text};
}
