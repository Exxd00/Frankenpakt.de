import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const base = Deno.env.get("SUPABASE_URL");
const serverKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
const owner = "ixamarketing.de@gmail.com";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.length > 8192) return json(401, { error: "identity" });
  let audience: string;
  try {
    const { payload } = await jwtVerify(auth.slice(7), keys, {
      issuer: ["accounts.google.com", "https://accounts.google.com"], algorithms: ["RS256"],
      requiredClaims: ["aud", "sub", "exp", "iat", "email", "email_verified"], maxTokenAge: "65m"
    });
    if (payload.email !== owner || payload.email_verified !== true || typeof payload.aud !== "string" ||
      (payload.azp && payload.azp !== payload.aud)) return json(403, { error: "identity" });
    audience = payload.aud;
  } catch { return json(401, { error: "identity" }); }
  let after: string;
  try {
    if (Number(req.headers.get("content-length")) > 128) return json(400, { error: "cursor" });
    const body = await req.text();
    if (body.length > 128) return json(400, { error: "cursor" });
    after = JSON.parse(body).after;
    if (typeof after !== "string" || (after !== "" && !/^AN-[A-F0-9]{16}$/.test(after)))
      return json(400, { error: "cursor" });
  } catch { return json(400, { error: "cursor" }); }
  if (!base || !serverKey) return json(503, { error: "storage" });
  try {
    const headers: Record<string,string> = { apikey: serverKey, "Content-Type": "application/json" };
    if (serverKey.startsWith("eyJ")) headers.Authorization = "Bearer " + serverKey;
    const result = await fetch(base + "/rest/v1/rpc/fp_customer_sheet_page", {
      method: "POST", headers, body: JSON.stringify({ p_audience: audience, p_after: after }),
      signal: AbortSignal.timeout(15000), redirect: "error"
    });
    if (!result.ok) return json(503, { error: "storage" });
    const value = await result.text();
    const page = value ? JSON.parse(value) : null;
    if (page === null) return json(403, { error: "audience" });
    return json(200, page);
  } catch { return json(503, { error: "storage" }); }
});
