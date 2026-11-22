import {guideLabels,guideServices} from './search-routes.js';
import {serviceFromQuery} from './actual-job.js';

export function inquiryTopic(params, service) {
  const slugs = params.getAll('thema');
  if (slugs.length !== 1 || !/^[a-z0-9-]{1,80}$/.test(slugs[0])) return null;
  const path = '/' + slugs[0] + '/';
  return Object.hasOwn(guideServices,path) && guideServices[path] === service
    ? {slug:slugs[0],label:guideLabels[path],service} : null;
}

export function carryPriceTopic(source, target) {
  if (source.pathname !== '/preise/' || target.origin !== source.origin ||
      !['/anfrage/','/preise/'].includes(target.pathname)) return;
  const service = serviceFromQuery(target.searchParams);
  const topic = inquiryTopic(source.searchParams,service);
  target.searchParams.delete('thema');
  if (topic && serviceFromQuery(source.searchParams) === service) target.searchParams.set('thema',topic.slug);
}
