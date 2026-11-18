// POST /api/logout — encerra a sessão
import { clearSession } from "./_lib/session.js";

export default function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "use POST" }); return; }
  clearSession(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
}
