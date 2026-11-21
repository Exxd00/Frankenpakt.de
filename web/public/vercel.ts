// The production origin runs web/server.mjs with the operator's persistent lead store.
// Keep preview deployments on the static site, including their contact settings.
const configuredOrigin = process.env.VERCEL_ENV === 'production'
  ? process.env.FRANKENPACKT_INTAKE_ORIGIN?.trim()
  : undefined;

function intakeRoutes(value: string) {
  const url = new URL(value);
  const ownHosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, 'frankenpakt.vercel.app'];
  if (url.protocol !== 'https:' || url.origin !== value.replace(/\/$/, '') || ownHosts.includes(url.host)) {
    throw new Error('FRANKENPACKT_INTAKE_ORIGIN must be the separate HTTPS origin of the operator service.');
  }
  const origin = url.origin;
  const read = ['GET', 'HEAD'];
  // Route HTML as well as the API so contact links, legal information and receipts agree.
  const pages = 'anfrage|danke|datenschutz|entsorgung|impressum|moebeltaxi|preise|raeumung|seniorenumzug|umzug';
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
    ...(configuredOrigin ? intakeRoutes(configuredOrigin) : [
      { src: '^/api/config$', methods: ['GET', 'HEAD'], dest: '/assets/contact-preview.json', headers: { 'Cache-Control': 'no-store' } }
    ])
  ]
};
