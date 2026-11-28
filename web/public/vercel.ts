import {publicOrigin, publicPagePaths} from './assets/search-routes.js';

// The production origin runs web/server.mjs with the operator's persistent lead store.
// Keep preview deployments on the static site, including their contact settings.
const configuredOrigin = process.env.VERCEL_ENV === 'production'
  ? process.env.FRANKENPACKT_INTAKE_ORIGIN?.trim()
  : undefined;
const cloudEnabled = process.env.VERCEL_ENV === 'production' && process.env.FRANKENPACKT_CLOUD_INTAKE === '1';
const cloud = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake';
const pages = publicPagePaths.filter(path=>path!=='/').map(path=>path.slice(1,-1)).join('|');
const read = ['GET','HEAD'];

// Normalize published HTML before its internal rewrite. Vercel preserves the request query on redirects.
const canonicalRoutes = configuredOrigin || cloudEnabled ? [
  {src:'^/index\\.html$', methods:read, status:308, headers:{Location:publicOrigin+'/'}},
  {src:'^/('+pages+')(?:/index\\.html)?$', methods:read, status:308, headers:{Location:publicOrigin+'/$1/'}},
  {src:'^(/|/(?:'+pages+')/|/robots\\.txt|/sitemap\\.xml)$', methods:read,
    has:[{type:'host',value:'frankenpakt.vercel.app'}], status:308, headers:{Location:publicOrigin+'$1'}}
] : [];

function cloudRoutes() {
  return [
    {src:'^/$', methods:read, dest:'/betrieb/index.html'},
    {src:'^/('+pages+')/$', methods:read, dest:'/betrieb/$1/index.html'},
    {src:'^/(robots\\.txt|sitemap\\.xml)$', methods:read, dest:'/betrieb/$1'},
    {src:'^/api/config$', methods:read, dest:cloud+'/config',headers:{'Cache-Control':'no-store'}},
    {src:'^/api/leads$', methods:['POST'], dest:cloud+'/leads',headers:{'Cache-Control':'no-store'}}
  ];
}

function intakeRoutes(value: string) {
  const url = new URL(value);
  const ownHosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, 'frankenpakt.vercel.app'];
  if (url.protocol !== 'https:' || url.origin !== value.replace(/\/$/, '') || ownHosts.includes(url.host)) {
    throw new Error('FRANKENPACKT_INTAKE_ORIGIN must be the separate HTTPS origin of the operator service.');
  }
  const origin = url.origin;
  // Route HTML as well as the API so contact links, legal information and receipts agree.
  return [
    { src: '^/$', methods: read, dest: origin + '/' },
    { src: '^/(' + pages + ')/$', methods: read, dest: origin + '/$1/' },
    { src: '^/(robots\\.txt|sitemap\\.xml)$', methods: read, dest: origin + '/$1' },
    { src: '^/api/config$', methods: read, dest: origin + '/api/config' },
    { src: '^/api/(leads|contact-events)$', methods: ['POST'], dest: origin + '/api/$1' }
  ];
}

export const config = {
  routes: [
    ...canonicalRoutes,
    ...(configuredOrigin || cloudEnabled ? [{
      src:'^/api/contact-confirmation$', methods:['POST'],
      dest:'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/office-events',
      headers:{'Cache-Control':'private, no-store'}
    }] : []),
    {src:'^/betrieb(?:/.*)?$',methods:read,status:404,dest:'/404.html',headers:{'X-Robots-Tag':'noindex, nofollow'}},
    {
      src: '^/api/office/([A-Za-z0-9_/-]+)$', methods: ['GET', 'POST'],
      dest: 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-office/$1',
      headers: { 'Cache-Control': 'private, no-store' }
    },
    ...(configuredOrigin ? intakeRoutes(configuredOrigin) : cloudEnabled ? cloudRoutes() : [
      { src: '^/api/config$', methods: ['GET', 'HEAD'], dest: '/assets/contact-preview.json', headers: { 'Cache-Control': 'no-store' } }
    ])
  ]
};
