import {serviceFromQuery} from './actual-job.js';
import {carryPriceTopic,inquiryTopic} from './guide-topic.js';
export {carryPriceTopic} from './guide-topic.js';

const moveServices = new Set(['umzug','seniorenumzug','moebeltaxi','transport']);

export function priceGuideRoute(url) {
  const query = url.searchParams;
  const selected = serviceFromQuery(query);
  const service = query.get('service');
  const moving = moveServices.has(service);
  const scoped = ['vorhaben','vergleich','leistung','service'].some(key => query.has(key));
  const movingOnly = moving && !['vorhaben','vergleich','leistung'].some(key => query.has(key)) && query.getAll('service').length === 1;
  if (scoped && !selected && !movingOnly) return {service:null,view:null};
  if (url.hash === '#raeumungsrechner' && !moving && selected !== 'umzug') {
    return {service:selected || (query.get('hilfe') === 'none' ? 'entsorgung' : 'entruempelung'),view:'clearance'};
  }
  if ((!selected || selected === 'umzug') && (url.hash === '#preisfinder' || query.has('paket') || (moving && service !== 'umzug'))) {
    return {service:'umzug',view:'packages'};
  }
  return {service:selected,view:selected ? 'quick' : null};
}

function mountGuide(guide) {
  const choices = guide.querySelectorAll('[data-guide-choice]');
  const select = guide.querySelector('#comparison-topic');
  const quick = guide.querySelector('#preisvergleich');
  const clearance = guide.querySelector('#raeumungsrechner');
  const packages = guide.querySelector('#preisfinder');
  const tools = guide.querySelector('.guide-tools');
  guide.querySelector('[data-quick-service]').hidden = true;
  function render() {
    const source = new URL(location.href);
    const {service,view} = priceGuideRoute(source);
    const topic = inquiryTopic(source.searchParams,service);
    document.getElementById('richtpreis').textContent = topic ? '„'+topic.label+'“ einschätzen' : 'Ihr Vorhaben einschätzen';
    for (const link of choices) {
      if (link.dataset.guideChoice === service) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
      const target = new URL(link.href);
      carryPriceTopic(source,target);
      link.setAttribute('href',target.pathname+target.search+target.hash);
    }
    quick.hidden = view !== 'quick';
    clearance.hidden = view !== 'clearance';
    packages.hidden = view !== 'packages';
    tools.hidden = view !== 'quick';
    for (const link of tools.querySelectorAll('[data-guide-more]')) {
      link.hidden = !link.dataset.guideMore.split(' ').includes(service);
    }
    guide.querySelector('.guide-tariffs').hidden = service !== 'umzug';
    guide.querySelector('.household-guide').hidden = service !== 'entruempelung';
    for (const slot of guide.querySelectorAll('[data-calc-scope][open]')) {
      if (slot.closest('[hidden]')) slot.open = false;
    }
    if (view === 'quick' && select.value !== service) {
      select.value = service;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if (view === 'clearance') {
      const help = clearance.querySelector('[name="help"]');
      const desired = service === 'entsorgung' ? 'none' : 'team';
      if (help.value !== desired) {
        help.value = desired;
        help.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    guide.dispatchEvent(new CustomEvent('pricing-view-change',{bubbles:true,detail:{service,view}}));
  }
  render();
  guide.dataset.guideReady = '';
  window.addEventListener('hashchange',() => {
    render();
    // The destination may have been hidden when the browser first tried to scroll.
    const target = document.getElementById(location.hash.slice(1));
    if (target && !target.closest('[hidden]')) target.scrollIntoView();
  });
}

if (typeof document !== 'undefined') {
  const guide = document.querySelector('[data-guided-pricing]');
  if (guide) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded',() => mountGuide(guide),{once:true});
    } else mountGuide(guide);
  }
}
