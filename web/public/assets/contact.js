(() => {
  'use strict';
  const dialog = document.getElementById('contact-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const preview = dialog.dataset.contactMode === 'preview';
  const metricsEnabled = !preview && dialog.dataset.metrics === '1';
  const title = dialog.querySelector('#handoff-title');
  const message = dialog.querySelector('#handoff-explanation');
  const number = dialog.querySelector('.handoff-number');
  const previewNote = dialog.querySelector('.handoff-preview');
  const consentLabel = dialog.querySelector('.handoff-consent');
  const consent = consentLabel.querySelector('input');
  const confirm = dialog.querySelector('[data-handoff-confirm]');
  const callback = dialog.querySelector('[data-handoff-callback]');
  const demoResult = dialog.querySelector('.handoff-demo-result');
  const query = new URLSearchParams(location.search);
  let channel;
  let handedOff = false;
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
    const pageCallback = nearby || document.querySelector('.footer-main [data-contact="callback"], .endcta [data-contact="callback"]');
    return pageCallback?.getAttribute('href') || '/anfrage/?kontakt=telefon';
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link || event.defaultPrevented || dialog.contains(link) || link.hidden) return;
    const href = link.getAttribute('href') || '';
    const phone = link.dataset.contact === 'phone' || href.startsWith('tel:');
    const chat = link.dataset.contact === 'whatsapp' || /^https:\/\/wa\.me\/\d+(?:$|[/?])/.test(href);
    if (!phone && !chat) return;
    if (!preview && !(phone ? /^tel:\+?\d[\d ()./-]*$/ : /^https:\/\/wa\.me\/\d+$/).test(href)) return;
    event.preventDefault();
    channel = phone ? 'phone' : 'whatsapp';
    handedOff = false;
    title.textContent = phone ? 'FrankenPackt anrufen?' : 'Zu WhatsApp wechseln?';
    message.textContent = phone
      ? 'Ihre Telefon-App öffnet sich. Sie können auch einen Rückruf anfragen.'
      : 'Sie wechseln zu WhatsApp. Dort können Sie Ihre Nachricht schreiben und selbst absenden.';
    number.hidden = !phone || preview;
    number.textContent = !number.hidden ? href.slice(4) : '';
    previewNote.hidden = !preview;
    previewNote.textContent = preview ? 'Vorschau. Sie können den Ablauf ohne Verbindung testen.' : '';
    demoResult.hidden = true;
    demoResult.textContent = '';
    consent.checked = false;
    consentLabel.hidden = !metricsEnabled;
    confirm.href = preview ? '#kontaktvorschau' : href;
    confirm.textContent = preview ? (phone ? 'Anruf testen' : 'WhatsApp testen') : (phone ? 'Jetzt anrufen' : 'WhatsApp öffnen');
    callback.setAttribute('href', callbackPath(link));
    dialog.showModal();
    title.focus({preventScroll: true});
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
    record(channel + '_click');
    dialog.close();
  });
  callback.addEventListener('click', () => record('callback_click'));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
})();
