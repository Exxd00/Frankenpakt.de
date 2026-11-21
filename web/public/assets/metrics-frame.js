(() => {
  'use strict';
  if (window.parent === window) return;
  const owner = new URL(location.href).origin;
  const events = new Set(['service_chosen','estimate_viewed','upload_ready','contact_intent','generate_lead']);
  const categories = new Set(['entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf','unbekannt']);
  const channels = new Set(['google','kleinanzeigen','empfehlung','direkt','sonstige','unbekannt']);
  const paths = new Set(['/','/preise/','/anfrage/','/danke/','/umzug/','/seniorenumzug/','/moebeltaxi/','/entsorgung/','/raeumung/','/datenschutz/','/impressum/']);
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
      tag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
        ignore_referrer:true,cookie_domain:'none',cookie_prefix:'fpstat',cookie_path:'/assets',cookie_expires:0,cookie_update:false,
        cookie_flags:'SameSite=Strict;Secure',client_id:d.client,page_location:'https://frankenpakt.de/',page_referrer:'',page_title:'FrankenPackt'});
      const script=document.createElement('script');
      script.async=true;
      script.referrerPolicy='no-referrer';
      script.src='https://www.googletagmanager.com/gtag/js?id='+id;
      document.head.append(script);
    } else if (d.cmd === 'event' && id && events.has(d.name) && categories.has(d.service) && channels.has(d.source) && paths.has(d.path)) {
      const parameters={};
      if(d.name==='contact_intent' && ['phone','whatsapp'].includes(d.channel))parameters.contact_channel=d.channel;
      if(d.name==='generate_lead'){
        if(d.path!=='/danke/' || !['callback','quote'].includes(d.leadType))return;
        parameters.lead_type=d.leadType;
      }
      tag('event',d.name,{send_to:id,service_category:d.service,source_category:d.source,...parameters,
        page_location:'https://frankenpakt.de'+d.path,page_referrer:'',page_title:'FrankenPackt'});
    }
  });
  window.parent.postMessage('fp-statistik-bereit',owner);
})();
