import {publicPagePaths} from './search-routes.js';

(() => {
  'use strict';
  if (window.parent === window) return;
  const owner = new URL(location.href).origin;
  const events = new Set(['service_chosen','estimate_viewed','upload_ready','contact_intent','form_start','form_submit_error','generate_lead']);
  const categories = new Set(['entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf','unbekannt']);
  const channels = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige','unbekannt']);
  const paths = new Set(publicPagePaths);
  let id = '';
  const tag = function(){(window.dataLayer ||= []).push(arguments);};
  window.addEventListener('message',event => {
    if (event.source !== window.parent || event.origin !== owner) return;
    const d = event.data || {};
    if (d.cmd === 'start' && !id && /^G-[A-Z0-9]{6,14}$/.test(d.id) && /^[0-9a-f-]{36}$/.test(d.client)) {
      id = d.id;
      // The customer-facing page is never passed to this tag. The site supplies a new client ID for each page.
      tag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
      tag('set','ads_data_redaction',true);
      tag('set','url_passthrough',false);
      tag('set','allow_google_signals',false);
      tag('set','allow_ad_personalization_signals',false);
      tag('set','allow_enhanced_conversions',false);
      tag('js',new Date());
      // Supply only broad, approved traffic categories. Ad click IDs and booked terms stay in-house.
      const campaign = ['google','kleinanzeigen','empfehlung','sonstige'].includes(d.source) &&
        ['cpc','organic','referral','social','email'].includes(d.medium)
        ? {campaign_source:d.source,campaign_medium:d.medium} : {};
      tag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
        ...campaign,ignore_referrer:true,cookie_domain:'none',cookie_prefix:'fpstat',cookie_path:'/assets',cookie_expires:0,cookie_update:false,
        cookie_flags:'SameSite=Strict;Secure',client_id:d.client,page_location:'https://frankenpakt.de/',page_referrer:'',page_title:'FrankenPackt'});
      const script=document.createElement('script');
      script.async=true;
      script.referrerPolicy='no-referrer';
      script.src='https://www.googletagmanager.com/gtag/js?id='+id;
      document.head.append(script);
    } else if (d.cmd === 'event' && id && events.has(d.name) && categories.has(d.service) && channels.has(d.source) && paths.has(d.path)) {
      const parameters={};
      if(d.name==='contact_intent'){
        if(!['phone','whatsapp'].includes(d.channel))return;
        parameters.contact_channel=d.channel;
        if(['floating','footer','hero','page'].includes(d.placement))parameters.contact_placement=d.placement;
      }
      if(d.name==='generate_lead' || d.name==='form_start' || d.name==='form_submit_error'){
        if(d.path!==(d.name==='generate_lead'?'/danke/':'/anfrage/') || !['callback','quote'].includes(d.leadType))return;
        parameters.lead_type=d.leadType;
      }
      if(d.name==='form_submit_error'){
        if(!['attachment','rate_limit','unconfirmed'].includes(d.reason))return;
        parameters.error_category=d.reason;
      }
      tag('event',d.name,{send_to:id,service_category:d.service,source_category:d.source,...parameters,
        page_location:'https://frankenpakt.de'+d.path,page_referrer:'',page_title:'FrankenPackt'});
    }
  });
  window.parent.postMessage('fp-statistik-bereit',owner);
})();
