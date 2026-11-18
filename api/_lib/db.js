// Acesso ao Supabase pela API REST, só no servidor (chave secreta nunca vai ao navegador).
function cfg() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY ausentes");
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`; // chave service_role antiga (JWT)
  return { url: url.replace(/\/$/, ""), headers };
}

async function call(path, init = {}) {
  const { url, headers } = cfg();
  const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await r.text();
  const body = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const err = new Error(body?.message || `supabase ${r.status}`);
    err.status = r.status; err.code = body?.code; throw err;
  }
  return body;
}

export const db = {
  rpc: (fn, args) => call(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
  select: (table, query) => call(`${table}?${query}`),
  upsert: (table, rows, onConflict) => call(`${table}${onConflict ? `?on_conflict=${onConflict}` : ""}`, {
    method: "POST", body: JSON.stringify(rows), headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  }),
};
