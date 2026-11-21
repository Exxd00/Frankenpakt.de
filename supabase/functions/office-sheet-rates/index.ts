const projectUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

type Rate = {
  id: string; cents: number; revision: number; label: string; unit: string; scope: string;
};

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function csvText(value: string): string {
  // Preserve ordinary text and neutralize formula-like cell content in CSV readers.
  const normalized = value.replace(/[\r\n\t]+/g, ' ');
  const literal = /^\s*[=+@-]/.test(normalized) ? "'" + normalized : normalized;
  return '"' + literal.replaceAll('"', '""') + '"';
}

Deno.serve(async request => {
  const fail = (status: number) => new Response(null, { status, headers: responseHeaders });
  if (request.method !== 'GET') return fail(405);
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!/^[a-f0-9]{64}$/.test(key)) return fail(403);

  try {
    const headers: Record<string, string> = { apikey: serviceKey, 'Content-Type': 'application/json' };
    if (serviceKey.startsWith('eyJ')) headers.Authorization = 'Bearer ' + serviceKey;
    const result = await fetch(projectUrl + '/rest/v1/rpc/fp_sheet_rates', {
      method: 'POST', headers,
      body: JSON.stringify({ p_access_digest: await digest(key) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) return fail(503);
    const rates: Rate[] | null = await result.json();
    if (!rates) return fail(403);

    const csv = ['Tarif-ID,Preis (Cent),Version,Leistung,Einheit,Leistungsumfang'];
    for (const rate of rates) {
      csv.push([csvText(rate.id), rate.cents, rate.revision, csvText(rate.label),
        csvText(rate.unit), csvText(rate.scope)].join(','));
    }
    return new Response(csv.join('\r\n'), {
      headers: { ...responseHeaders, 'Content-Type': 'text/csv; charset=utf-8' },
    });
  } catch {
    return fail(503);
  }
});
