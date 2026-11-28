import {statisticsChoice} from './campaign-attribution.js';

export function statisticsPreference({doc,win,storage,settingsButton,onChange}) {
  const prompt = doc.querySelector('[data-cookie-prompt]');
  const dialog = doc.querySelector('#statistics-settings');
  const status = doc.querySelector('[data-statistics-status]');
  let localChoice = null;
  let pageOnly = false;

  function choice() {
    if (pageOnly) return localChoice;
    try {
      const value = (storage || win.localStorage).getItem(statisticsChoice);
      return value === 'yes' || value === 'no' ? value : null;
    } catch { return localChoice; }
  }
  function sync() {
    const value = choice();
    if (prompt) prompt.hidden = value !== null;
    if (status) status.textContent = value === 'yes' ? 'aktiviert' : 'ausgeschaltet';
    settingsButton.setAttribute('data-statistics-enabled',String(value === 'yes'));
    onChange(value === 'yes');
  }
  function open() {
    if (!dialog?.open) dialog?.showModal();
  }
  function save(value) {
    localChoice = value;
    try {
      (storage || win.localStorage).setItem(statisticsChoice,value);
      pageOnly = false;
    } catch { pageOnly = true; }
    dialog?.close();
    sync();
  }
  settingsButton.hidden = false;
  settingsButton.addEventListener('click',open);
  doc.querySelector('[data-statistics-details]')?.addEventListener('click',open);
  doc.querySelector('[data-statistics-close]')?.addEventListener('click',()=>dialog.close());
  for (const button of doc.querySelectorAll('[data-statistics-choice]')) {
    button.addEventListener('click',()=>save(button.dataset.statisticsChoice));
  }
  win.addEventListener('storage',event=>{
    if (event.key === statisticsChoice || event.key === null) sync();
  });
  win.addEventListener('pageshow',event=>{if (event.persisted) sync();});
  sync();
  return {accepted:()=>choice() === 'yes'};
}
