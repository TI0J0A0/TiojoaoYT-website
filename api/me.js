// GET /api/me — quem está logado, saldo de tjcoins e contas ligadas
import { db } from "./_lib/db.js";
import { getSession, clearSession } from "./_lib/session.js";

const configured = () => {
  const e = process.env;
  return !!(e.SESSION_SECRET && e.SUPABASE_URL && e.SUPABASE_SECRET_KEY &&
    ((e.TWITCH_CLIENT_ID && e.TWITCH_CLIENT_SECRET) || (e.KICK_CLIENT_ID && e.KICK_CLIENT_SECRET)));
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!configured()) { res.status(200).json({ user: null, enabled: false }); return; }
  let sess = null;
  try { sess = getSession(req); } catch (e) { console.error("me:", e.message); res.status(200).json({ user: null, enabled: false }); return; }
  if (!sess) { res.status(200).json({ user: null, enabled: true }); return; }
  try {
    const [p] = await db.select("profiles", `id=eq.${encodeURIComponent(sess.pid)}&select=id,display_name,avatar_url,points,accounts(provider,login)`);
    if (!p) { clearSession(req, res); res.status(200).json({ user: null, enabled: true }); return; }
    res.status(200).json({
      enabled: true,
      user: { name: p.display_name, avatar: p.avatar_url, points: p.points, accounts: (p.accounts || []).map((a) => ({ provider: a.provider, login: a.login })) },
    });
  } catch (e) {
    console.error("me:", e.message);
    res.status(503).json({ error: "indisponivel" });
  }
}
