import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLeadMail} from '../lib/lead-mail.mjs';
import {exampleJobScope} from '../test-support/job-scope.mjs';

const ref = 'AN-0123456789ABCDEF';
const received = '2026-11-21T18:00:00.000Z';

test('colored accessible headings and escaped attachment names appear in the office copies',()=>{
  const mail=renderLeadMail({ref,created:received,service:'entsorgung',attachments:[{name:'Grundriss <A>.pdf',size:23340},{name:'Foto.webp',size:1024000}]});
  assert.match(mail.html,/<h1[^>]*color:#943529/);
  assert.match(mail.html,/<h2[^>]*color:#365437[^>]*>Anhänge \(2\)/);
  assert.match(mail.html,/Grundriss &lt;A&gt;\.pdf · 24 kB/);
  assert.match(mail.text,/Grundriss <A>\.pdf · 24 kB\nFoto\.webp · 1,02 MB/);
  assert.doesNotMatch(mail.subject+' '+mail.preheader,/Grundriss|Foto/);
});

test('callback mail puts a safe phone action in HTML and keeps private data out of the inbox preview',()=>{
  const phone = '+491713920012';
  const window = 'Dienstag nach 14 Uhr';
  const mail = renderLeadMail({ref,created:received,service:'rueckruf',
    person:{name:'Erika Muster',contactMethod:'phone',contact:phone,timeframe:window,requestedService:'umzug'}});
  assert.match(mail.html, /href="tel:\+491713920012"/);
  for(const content of [mail.html,mail.text]) {
    assert.ok(content.includes(window));
    assert.ok(content.includes(ref));
  }
  const inboxPreview = mail.subject + ' ' + mail.preheader;
  assert.doesNotMatch(inboxPreview, /Erika|Muster|491713920012|Dienstag/);
  assert.doesNotMatch(mail.html, /<(?:script|iframe|img)\b|@import|url\(https?:/i);
});

test('offer mail escapes customer text, preserves the contact address in plain text and contains no remote content',()=>{
  const mail = renderLeadMail({ref,created:received,service:'umzug',
    person:{name:'Ina <Test>',contactMethod:'email',contact:'ina@example.invalid',timeframe:'Anfang März',
      details:'Bitte Tisch & Regal mitnehmen.',jobScope:exampleJobScope('umzug')}});
  assert.match(mail.html,/href="mailto:ina@example\.invalid(?:[?"][^<>]*)/i);
  assert.match(mail.text,/ina@example\.invalid/i);
  assert.doesNotMatch(mail.html, /Ina <Test>|<script|<iframe|<img\b/i);
  assert.match(mail.html,/Ina &lt;Test&gt;/);
  assert.doesNotMatch(mail.subject + ' ' + mail.preheader,/ina@example|Beispielweg/i);
});

test('an invalid stored contact cannot inject additional mail recipients or links',()=>{
  for(const [contactMethod,contact] of [['email','test@example.invalid?bcc=other@example.invalid'],['phone','javascript:bad']]){
    const mail = renderLeadMail({ref,created:received,service:'umzug',person:{name:'Test',contactMethod,contact}});
    assert.doesNotMatch(mail.html,/href="(?:javascript:|mailto:[^"]*bcc=|tel:[^"]*javascript)/i);
  }
});
