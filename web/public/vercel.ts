// The production origin runs web/server.mjs with the operator's persistent lead store.
// Keep preview deployments on the static site, including their contact settings.
const configuredOrigin = process.env.VERCEL_ENV === 'production'
  ? process.env.FRANKENPACKT_INTAKE_ORIGIN?.trim()
  : undefined;
const cloudEnabled = process.env.VERCEL_ENV === 'production' && process.env.FRANKENPACKT_CLOUD_INTAKE === '1';
const cloud = 'https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake';
const pages = 'anfrage|danke|datenschutz|entsorgung|impressum|moebeltaxi|preise|raeumung|seniorenumzug|umzug';
const read = ['GET','HEAD'];

function cloudRoutes() {
  return [
    {src:'^/(?:index\\.html)?$', methods:read, dest:'/betrieb/index.html'},
    {src:'^/('+pages+')(?:/index\\.html|/)?$', methods:read, dest:'/betrieb/$1/index.html'},
    {src:'^/robots\\.txt$', methods:read, dest:'/betrieb/robots.txt'},
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
    { src: '^/(?:index\\.html)?$', methods: read, dest: origin + '/' },
    { src: '^/(' + pages + ')(?:/index\\.html|/)?$', methods: read, dest: origin + '/$1/' },
    { src: '^/robots\\.txt$', methods: read, dest: origin + '/robots.txt' },
    { src: '^/api/config$', methods: read, dest: origin + '/api/config' },
    { src: '^/api/(leads|contact-events)$', methods: ['POST'], dest: origin + '/api/$1' }
  ];
}

export const config = {
  routes: [
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
