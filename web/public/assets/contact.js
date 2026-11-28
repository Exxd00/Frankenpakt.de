(() => {
  'use strict';
  const dialog = document.getElementById('contact-dialog');
  const floating = document.querySelector('[data-floating-contact]');
  let opener;
  if (floating && 'IntersectionObserver' in window) {
    const nearbyActions = new Set();
    let focusedAction;
    function protectFocusedAction() {
      if (!focusedAction || floating.hidden) {
        floating.removeAttribute('data-focus-overlap');
        return;
      }
      const target = focusedAction.getBoundingClientRect();
      const dock = floating.getBoundingClientRect();
      const gap = 4;
      floating.toggleAttribute('data-focus-overlap',
        target.left < dock.right + gap && target.right > dock.left - gap &&
        target.top < dock.bottom + gap && target.bottom > dock.top - gap);
    }
    const usingFloating = () => floating.contains(document.activeElement) || (dialog?.open && floating.contains(opener));
    const updateFloating = () => {
      floating.hidden = nearbyActions.size > 0;
      protectFocusedAction();
    };
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
    document.addEventListener('focusin',event => {
      focusedAction = event.target.matches('main :is(a, button, summary):focus-visible') ? event.target : null;
      protectFocusedAction();
    });
    document.addEventListener('focusout',() => {
      focusedAction = null;
      floating.removeAttribute('data-focus-overlap');
    });
    const updateOnMove = () => { if (focusedAction) protectFocusedAction(); };
    window.addEventListener('scroll',updateOnMove,{passive:true});
    window.addEventListener('resize',updateOnMove);
    floating.addEventListener('focusout', () => {
      queueMicrotask(() => {
        if (!usingFloating()) updateFloating();
      });
    });
  }
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const preview = dialog.dataset.contactMode === 'preview';
  const title = dialog.querySelector('#handoff-title');
  const message = dialog.querySelector('#handoff-explanation');
  const draft = dialog.querySelector('#whatsapp-draft');
  const previewNote = dialog.querySelector('.handoff-preview');
  const cancel = dialog.querySelector('[data-handoff-cancel]');
  const confirm = dialog.querySelector('[data-handoff-confirm]');
  const callback = dialog.querySelector('[data-handoff-callback]');
  const demoResult = dialog.querySelector('.handoff-demo-result');
  const query = new URLSearchParams(location.search);
  let channel;
  let placement;
  let handedOff = false;
  let requestToken;
  let directLinkReady = false;
  const viewport = window.visualViewport;
  function sizeDialog() {
    if (viewport) dialog.style.setProperty('--contact-viewport',viewport.height+'px');
  }
  if (preview) {
    document.querySelectorAll('[data-contact="phone"], [data-contact="whatsapp"]').forEach(link => {
      link.hidden = false;
    });
  }
  const triggers = 'a[data-contact="phone"], a[data-contact="whatsapp"], a[href^="tel:"], a[href^="https://wa.me/"]';
  for (const link of document.querySelectorAll(triggers)) {
    if (link.hidden || dialog.contains(link)) continue;
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    if (floating?.contains(link)) link.title = link.dataset.contact === 'phone' ? 'Anrufen' : 'Auf WhatsApp schreiben';
  }

  const localConsent = document.querySelector('[data-local-contact-consent]');
  if (!preview && localConsent) {
    window.addEventListener('load', () => {
      localConsent.parentElement.hidden = document.querySelector('[data-statistics]')?.hidden === false;
    }, {once:true});
  }
  function recordLocal(eventName) {
    if (!localConsent?.checked || localConsent.parentElement.hidden || !globalThis.crypto?.randomUUID) return;
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
  function emit(name) {
    if (!preview) document.dispatchEvent(new CustomEvent(name,{detail:{channel,placement}}));
  }
  async function resolveDestination(method, visibleLink) {
    async function requestDestination() {
      const response = await fetch('/api/contact-handoff', {
        method:'POST', mode:'same-origin', credentials:'omit', keepalive:true, redirect:'error',
        referrerPolicy:'origin', headers:{'Content-Type':'text/plain;charset=UTF-8'},
        body:JSON.stringify({channel:method})
      });
      if (response.status !== 200) return visibleLink;
      const {destinations} = await response.json();
      if (!Array.isArray(destinations)) return visibleLink;
      if (method === 'phone') {
        const phones = destinations.filter(value => typeof value === 'string' && /^tel:\+[1-9]\d{6,14}$/.test(value));
        return phones.find(phone => phone === visibleLink) || visibleLink;
      }
      const shown = new URL(visibleLink);
      const chat = destinations.find(value => value === shown.origin + shown.pathname);
      return chat ? chat + shown.search : visibleLink;
    }
    // A slow response must not prevent the visitor from reaching us. The single
    // keepalive request can finish after navigation; no timeout causes a resend.
    let timeout;
    const fallback = new Promise(resolve => { timeout = setTimeout(()=>resolve(visibleLink),1200); });
    try { return await Promise.race([requestDestination().catch(()=>visibleLink),fallback]); }
    finally { clearTimeout(timeout); }
  }
  function closeAfterAppSwitch() {
    if (directLinkReady && dialog.open) dialog.close();
  }
  window.addEventListener('pagehide',closeAfterAppSwitch);
  window.addEventListener('blur',closeAfterAppSwitch);
  document.addEventListener('visibilitychange',() => { if (document.hidden) closeAfterAppSwitch(); });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || dialog.contains(link) || link.hidden) return;
    const href = link.getAttribute('href') || '';
    const phone = link.dataset.contact === 'phone' || href.startsWith('tel:');
    const chat = link.dataset.contact === 'whatsapp' || /^https:\/\/wa\.me\/\d+(?:$|[/?])/.test(href);
    if ((!phone && !chat) || dialog.open) return;
    if (!preview && !(phone ? /^tel:\+?\d[\d ()./-]*$/ : /^https:\/\/wa\.me\/[1-9]\d{6,14}(?:\?text=[^&#]*)?$/).test(href)) return;
    event.preventDefault();
    opener = link;
    channel = phone ? 'phone' : 'whatsapp';
    if (floating?.contains(link)) placement = 'floating';
    else if (link.closest('footer')) placement = 'footer';
    else if (link.closest('.endcta')) placement = 'closing_cta';
    else if (location.pathname === '/anfrage/') placement = 'inquiry';
    else if (link.closest('.hero, .firm-hero, .subhead, .detail-hero')) placement = 'hero';
    else placement = 'page';
    handedOff = false;
    requestToken = null;
    directLinkReady = false;
    title.textContent = phone ? 'Anruf starten?' : 'WhatsApp öffnen?';
    const phoneDisplay = link.dataset.phoneDisplay || href.slice(4).replace(/^\+49911/, '+49 911 ');
    message.textContent = phone
      ? (preview ? 'So bestätigen Sie den Wechsel zur Telefon-App.' : 'Sie erreichen FrankenPackt unter '+phoneDisplay+'.')
      : 'In WhatsApp können Sie diesen Entwurf bearbeiten und selbst senden.';
    draft.hidden = !chat;
    draft.textContent = chat ? (!preview && new URL(href).searchParams.get('text') || 'Guten Tag FrankenPackt, ich möchte ein Angebot für mein Vorhaben anfragen.') : '';
    previewNote.hidden = !preview;
    demoResult.hidden = true;
    demoResult.textContent = '';
    confirm.href = preview ? '#kontaktvorschau' : href;
    confirm.textContent = phone ? 'Jetzt anrufen' : 'WhatsApp öffnen';
    callback.hidden = !phone || (location.pathname === '/anfrage/' && query.get('kontakt') === 'telefon');
    if (!callback.hidden) callback.setAttribute('href', callbackPath(link));
    sizeDialog();
    viewport?.addEventListener('resize',sizeDialog);
    dialog.showModal();
    cancel.focus({preventScroll:true});
    emit('fp-contact-intent');
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    requestToken = null;
    directLinkReady = false;
    viewport?.removeEventListener('resize',sizeDialog);
    draft.textContent = '';
    confirm.removeAttribute('href');
    // A temporarily hidden dock cannot receive the browser's automatic focus restoration.
    const previous = opener;
    if (previous?.isConnected && previous !== document.activeElement) requestAnimationFrame(() => {
      if (dialog.open || !(document.activeElement===document.body || dialog.contains(document.activeElement))) return;
      if (floating?.contains(previous)) floating.hidden = false;
      previous.focus({preventScroll:true});
    });
    opener = null;
  });
  confirm.addEventListener('click',event => {
    // If the browser blocked the asynchronous app switch, a second tap follows
    // the real tel:/WhatsApp link natively, without recording another action.
    if (dialog.open && directLinkReady) return;
    event.preventDefault();
    if (handedOff || !dialog.open) return;
    handedOff = true;
    if (preview) {
      demoResult.hidden = false;
      demoResult.textContent = channel === 'phone'
        ? 'Vorschau abgeschlossen. Mit der Geschäftsnummer öffnet sich hier die Telefon-App.'
        : 'Vorschau abgeschlossen. Mit dem Geschäftskonto öffnet sich hier der WhatsApp-Chat.';
      return;
    }
    const destination = confirm.href;
    recordLocal(channel + '_click');
    const confirmation = new CustomEvent('fp-contact-confirmation',{cancelable:true,detail:{channel,placement}});
    const handled = !document.dispatchEvent(confirmation);
    if (handled || !['frankenpakt.de','www.frankenpakt.de','frankenpakt.vercel.app'].includes(location.hostname)) {
      dialog.close();
      window.location.assign(destination);
      return;
    }
    const token = requestToken = {};
    resolveDestination(channel,destination).then(resolved => {
      if (!dialog.open || requestToken !== token) return;
      confirm.href = resolved;
      directLinkReady = true;
      try { window.location.assign(resolved); } catch { /* The native link remains available. */ }
      setTimeout(()=>{
        if (!dialog.open || !directLinkReady || requestToken !== token) return;
        demoResult.textContent = channel === 'phone'
          ? 'Falls sich die Telefon-App nicht öffnet, tippen Sie erneut auf „Jetzt anrufen“.'
          : 'Falls sich WhatsApp nicht öffnet, tippen Sie erneut auf „WhatsApp öffnen“.';
        demoResult.hidden = false;
      },900);
    });
  });
  function dismiss() {
    if (!dialog.open) return;
    if (!handedOff) emit('fp-contact-cancel');
    dialog.close();
  }
  callback.addEventListener('click', () => recordLocal('callback_click'));
  cancel.addEventListener('click',dismiss);
  dialog.addEventListener('cancel',event => {
    event.preventDefault();
    dismiss();
  });
})();
