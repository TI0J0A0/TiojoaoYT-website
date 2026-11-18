// GET /api/login?p=twitch|kick[&link=1] — começa o login (ou o vínculo de outra conta)
import { PROVIDERS, startUrl } from "./_lib/oauth.js";
import { getSession, redirect } from "./_lib/session.js";

export default function handler(req, res) {
  const provider = String(req.query?.p || "");
  const p = PROVIDERS[provider];
  if (!p) { res.status(400).json({ error: "plataforma inválida" }); return; }
  if (!p.id() || !p.secret()) { redirect(res, "/?conta_erro=nao_configurado#conta"); return; }
  const link = req.query?.link === "1";
  if (link && !getSession(req)) { redirect(res, "/?conta_erro=sessao_expirada#conta"); return; }
  redirect(res, startUrl(req, res, provider, { link }));
}
