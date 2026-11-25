import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {contactCampaign,carryContactCampaign} from '../public/assets/contact-channel.js';
import {phoneLines} from '../public/assets/phone-lines.js';
import {taskPages} from '../task-pages.mjs';
import {firmPages} from '../firmen-pages.mjs';

test('guide and business pages expose a working telephone link and keep the project on callback', () => {
  for (const page of [...taskPages,...firmPages]) {
    const html=readFileSync(new URL('../public/betrieb'+page.path+'index.html',import.meta.url),'utf8');
    const footer=html.match(/<footer>([\s\S]*?)<\/footer>/)[1];
    assert(footer.includes('data-contact="phone" href="tel:'+phoneLines.main.phone+'"'),page.path);
    const callbackPath=html.match(/data-handoff-callback href="([^"]+)"/)[1].replaceAll('&amp;', '&');
    const callback=new URL(callbackPath,'https://frankenpakt.de');
    assert.equal(callback.pathname,'/anfrage/',page.path);
    assert.equal(callback.searchParams.get('kontakt'),'telefon',page.path);
    if (page.project) {
      assert.equal(callback.searchParams.get('kundentyp'),'firma',page.path);
      assert.equal(callback.searchParams.get('projekt'),page.project,page.path);
    } else {
      assert.equal(callback.searchParams.get('thema'),page.path.split('/')[1],page.path);
    }
    assert.equal(callback.searchParams.get('leistung') || callback.searchParams.get('service') || '',page.service || '',page.path);
  }
});

test('public contact routes select a line only for the corresponding channel', () => {
  for (const [query,channel] of [
    ['', 'main'], ['src=google', 'main'], ['utm_source=google&utm_medium=organic', 'main'],
    ['src=google&utm_medium=organic&gclid=Click_A', 'main'], ['src=google&anzeige=unlisted', 'main'],
    ['utm_source=bing&utm_medium=cpc', 'main'], ['gclid=&src=google', 'main'],
    ['src=google&src=kleinanzeigen&utm_medium=cpc', 'main'], ['src=google&utm_source=bing&utm_medium=cpc','main'],
    ['src=google&anzeige=entsorgung-nuernberg', 'google'], ['utm_source=google&utm_medium=cpc','google'],
    ['utm_medium=cpc','main'], ['utm_source=google&utm_medium=ppc','google'],
    ['gclid=Click_A-14','google'], ['wbraid=AB-42','google'],
    ['utm_source=kleinanzeigen','kleinanzeigen'], ['src=kleinanzeigen&gclid=Click_A','kleinanzeigen']
  ]) {
    const campaign = contactCampaign(new URLSearchParams(query));
    assert.equal(campaign.phoneChannel,channel,query);
    const onward = new URLSearchParams('service=umzug&kontakt=telefon');
    carryContactCampaign(onward,campaign);
    assert.equal(contactCampaign(onward).phoneChannel,channel,'continuation of '+query);
    assert.equal(onward.get('service'),'umzug');
    assert.equal(onward.get('kontakt'),'telefon');
    assert.doesNotMatch(onward.toString(),/gclid|wbraid|Click_A|utm_medium/);
  }
});

test('click-only arrivals pass the contact line between pages without copying identifiers or ad attribution', () => {
  const landing = new URLSearchParams('gclid=Private_123&utm_term=private&utm_campaign=987');
  const target = new URLSearchParams();
  carryContactCampaign(target,contactCampaign(landing));
  assert.equal(target.toString(),'telefonkanal=google-ads');
  assert.equal(contactCampaign(target).source,'unbekannt');
  const tagged = new URLSearchParams('src=google&anzeige=privatumzug-team&utm_medium=cpc&gclid=Click_A');
  carryContactCampaign(target,contactCampaign(tagged));
  assert.equal(target.toString(),'src=google&anzeige=privatumzug-team');
});
