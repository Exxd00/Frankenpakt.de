(() => {
  'use strict';
  const dialog = document.getElementById('contact-dialog');
  const floating = document.querySelector('[data-floating-contact]');
  let opener;
  if (floating && 'IntersectionObserver' in window) {
    const nearbyActions = new Set();
    const usingFloating = () => floating.contains(document.activeElement) || (dialog?.open && floating.contains(opener));
    const updateFloating = () => { floating.hidden = nearbyActions.size > 0; };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) nearbyActions.add(entry.target);
        else nearbyActions.delete(entry.target);
      }
      if (!usingFloating()) updateFloating();
    });
    for (const section of document.querySelectorAll('main form, #preisfinder, footer')) {
      observer.observe(section);
    }
    floating.addEventListener('focusout', () => {
      queueMicrotask(() => {
        if (!usingFloating()) updateFloating();
      });
    });
  }
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const preview = dialog.dataset.contactMode === 'preview';
  const metricsEnabled = !preview && dialog.dataset.metrics === '1';
  const title = dialog.querySelector('#handoff-title');
  const message = dialog.querySelector('#handoff-explanation');
  const number = dialog.querySelector('.handoff-number');
  const draft = dialog.querySelector('#whatsapp-draft');
  const previewNote = dialog.querySelector('.handoff-preview');
  const consentLabel = dialog.querySelector('.handoff-consent');
  const consent = consentLabel.querySelector('input');
  const confirm = document.createElement('a');
  confirm.className = 'button';
  confirm.dataset.handoffConfirm = '';
  confirm.rel = 'noreferrer';
  const callback = dialog.querySelector('[data-handoff-callback]');
  const demoResult = dialog.querySelector('.handoff-demo-result');
  const query = new URLSearchParams(location.search);
  let channel;
  let chatUrl;
  let placement;
  let handedOff = false;
  const viewport = window.visualViewport;
  function sizeDialog() {
    if (viewport) dialog.style.setProperty('--contact-viewport',viewport.height+'px');
  }
  if (preview) {
    document.querySelectorAll('[data-contact="phone"], [data-contact="whatsapp"]').forEach(link => {
      link.hidden = false;
      link.setAttribute('aria-haspopup', 'dialog');
    });
  } else {
    document.querySelectorAll('[data-contact="phone"]:not([hidden]), [data-contact="whatsapp"]:not([hidden])')
      .forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
  }

  function record(eventName) {
    if (!metricsEnabled || !consent.checked || !globalThis.crypto?.randomUUID) return;
    const raw = (query.get('src') || query.get('utm_source') || '').toLowerCase();
    const source = ['google', 'kleinanzeigen', 'empfehlung', 'direkt', 'sonstige'].includes(raw) ? raw : 'unbekannt';
    fetch('/api/contact-events', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event: eventName, source, consent: true, eventId: crypto.randomUUID()})
    }).catch(() => {});
  }
  function callbackPath(link) {
    const nearby = link.closest('.contact-choices')?.querySelector('[data-contact="callback"]');
    const pageCallback = nearby || document.querySelector('.guide-callback, .firm-hero [data-contact="callback"], .endcta [data-contact="callback"], .footer-main [data-contact="callback"]');
    return (pageCallback || callback).getAttribute('href');
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || dialog.contains(link) || link.hidden) return;
    const href = link.getAttribute('href') || '';
    const phone = link.dataset.contact === 'phone' || href.startsWith('tel:');
    const chat = link.dataset.contact === 'whatsapp' || /^https:\/\/wa\.me\/\d+(?:$|[/?])/.test(href);
    if (!phone && !chat) return;
    if (!preview && !(phone ? /^tel:\+?\d[\d ()./-]*$/ : /^https:\/\/wa\.me\/[1-9]\d{6,14}(?:\?text=[^&#]*)?$/).test(href)) return;
    event.preventDefault();
    opener = link;
    channel = phone ? 'phone' : 'whatsapp';
    placement = link.closest('[data-floating-contact]') ? 'floating' : link.closest('footer') ? 'footer' :
      link.closest('.hero, .firm-hero, .subhead, .detail-hero') ? 'hero' : 'page';
    handedOff = false;
    title.textContent = phone ? 'FrankenPackt anrufen?' : 'Zu WhatsApp wechseln?';
    message.textContent = phone
      ? 'Ihre Telefon-App öffnet sich. Sie können auch einen Rückruf anfragen.'
      : 'Passen Sie den Text bei Bedarf an. Mit „WhatsApp öffnen“ übergeben Sie den Text an WhatsApp. Dort senden Sie ihn selbst ab.';
    chatUrl = chat && !preview ? new URL(href) : null;
    if (draft) {
      draft.parentElement.hidden = !chat;
      draft.value = chat ? (chatUrl?.searchParams.get('text') || 'Guten Tag FrankenPackt, ich möchte ein Angebot für mein Vorhaben anfragen.') : '';
    }
    number.hidden = !phone || preview;
    number.textContent = !number.hidden ? (link.dataset.phoneDisplay || href.slice(4).replace(/^\+49911/, '+49 911 ')) : '';
    previewNote.hidden = !preview;
    previewNote.textContent = preview ? 'Vorschau. Sie können den Ablauf ohne Verbindung testen.' : '';
    demoResult.hidden = true;
    demoResult.textContent = '';
    consent.checked = false;
    consentLabel.hidden = !metricsEnabled;
    confirm.href = preview ? '#kontaktvorschau' : href;
    confirm.textContent = preview ? (phone ? 'Anruf testen' : 'WhatsApp testen') : (phone ? 'Jetzt anrufen' : 'WhatsApp öffnen');
    if (!confirm.isConnected) callback.before(confirm);
    callback.setAttribute('href', callbackPath(link));
    sizeDialog();
    viewport?.addEventListener('resize',sizeDialog);
    dialog.showModal();
    title.focus({preventScroll: true});
  });
  draft?.addEventListener('input', () => {
    if (!chatUrl) return;
    chatUrl.searchParams.set('text',draft.value.trim());
    confirm.href = chatUrl.href;
  });
  dialog.addEventListener('close', () => {
    viewport?.removeEventListener('resize',sizeDialog);
    if (draft) draft.value = '';
    chatUrl = null;
    confirm.removeAttribute('href');
    // A temporarily hidden dock cannot receive the browser's automatic focus restoration.
    const previous = opener;
    if (!handedOff && previous?.isConnected && previous !== document.activeElement) requestAnimationFrame(() => {
      if (dialog.open || !(document.activeElement===document.body || dialog.contains(document.activeElement))) return;
      if (floating?.contains(previous)) floating.hidden = false;
      previous.focus({preventScroll:true});
    });
    opener = null;
  });
  confirm.addEventListener('click', event => {
    if (preview || handedOff) event.preventDefault();
    if (handedOff) return;
    handedOff = true;
    if (preview) {
      demoResult.hidden = false;
      demoResult.textContent = channel === 'phone'
        ? 'Vorschau abgeschlossen. Mit der Geschäftsnummer öffnet sich hier die Telefon-App.'
        : 'Vorschau abgeschlossen. Mit dem Geschäftskonto öffnet sich hier der WhatsApp-Chat.';
      return;
    }
    document.dispatchEvent(new CustomEvent('fp-contact-handoff',{detail:{channel,placement}}));
    record(channel + '_click');
    dialog.close();
  });
  callback.addEventListener('click', () => record('callback_click'));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
})();
