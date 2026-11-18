// Login com Twitch e Kick (OAuth 2). Só usamos o login para saber QUEM é a pessoa:
// nenhum token da plataforma é guardado.
import crypto from "node:crypto";
import { cookie, addCookie, parseCookies, siteUrl } from "./session.js";

const STATE_COOKIE = "tj_oauth";

export const PROVIDERS = {
  twitch: {
    authorize: "https://id.twitch.tv/oauth2/authorize",
    token: "https://id.twitch.tv/oauth2/token",
    scope: "",
    pkce: false,
    id: () => process.env.TWITCH_CLIENT_ID,
    secret: () => process.env.TWITCH_CLIENT_SECRET,
    async user(accessToken) {
      const r = await fetch("https://api.twitch.tv/helix/users", { headers: { "Client-Id": this.id(), Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) throw new Error(`twitch users ${r.status}`);
      const u = (await r.json()).data?.[0];
      if (!u) throw new Error("twitch sem usuário");
      return { uid: u.id, login: u.login, name: u.display_name || u.login, avatar: u.profile_image_url || null };
    },
  },
  kick: {
    authorize: "https://id.kick.com/oauth/authorize",
    token: "https://id.kick.com/oauth/token",
    scope: "user:read",
    pkce: true,
    id: () => process.env.KICK_CLIENT_ID,
    secret: () => process.env.KICK_CLIENT_SECRET,
    async user(accessToken) {
      const r = await fetch("https://api.kick.com/public/v1/users", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
      if (!r.ok) throw new Error(`kick users ${r.status}`);
      const u = (await r.json()).data?.[0];
      if (!u) throw new Error("kick sem usuário");
      return { uid: String(u.user_id), login: u.name, name: u.name, avatar: u.profile_picture || null };
    },
  },
};

export const callbackUrl = (req, provider) => `${siteUrl(req)}/api/callback-${provider}`;

// Início do login: guarda state (+ PKCE da Kick) num cookie de 10 min e devolve a URL do provedor
export function startUrl(req, res, provider, { link = false } = {}) {
  const p = PROVIDERS[provider];
  const state = crypto.randomBytes(16).toString("base64url");
  const verifier = p.pkce ? crypto.randomBytes(32).toString("base64url") : "";
  addCookie(res, cookie(req, STATE_COOKIE, JSON.stringify({ provider, state, verifier, link }), 600));
  const q = new URLSearchParams({ client_id: p.id(), redirect_uri: callbackUrl(req, provider), response_type: "code", scope: p.scope, state });
  if (p.pkce) {
    q.set("code_challenge", crypto.createHash("sha256").update(verifier).digest("base64url"));
    q.set("code_challenge_method", "S256");
  }
  return `${p.authorize}?${q}`;
}

// Volta do provedor: confere o state, troca o code por token e busca o usuário
export async function finish(req, res, provider) {
  const p = PROVIDERS[provider];
  let saved = null;
  try { saved = JSON.parse(parseCookies(req)[STATE_COOKIE] || "null"); } catch {}
  addCookie(res, cookie(req, STATE_COOKIE, "", 0));
  const { code, state, error } = req.query || {};
  if (error) throw Object.assign(new Error("cancelado"), { public: "cancelado" });
  if (!saved || saved.provider !== provider || !state || saved.state !== state || !code) throw Object.assign(new Error("state inválido"), { public: "sessao_expirada" });

  const body = new URLSearchParams({
    client_id: p.id(), client_secret: p.secret(), code, grant_type: "authorization_code", redirect_uri: callbackUrl(req, provider),
  });
  if (p.pkce) body.set("code_verifier", saved.verifier);
  const r = await fetch(p.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error(`${provider} token ${r.status}`);
  const { access_token } = await r.json();
  const user = await p.user(access_token);
  return { user, link: !!saved.link };
}
