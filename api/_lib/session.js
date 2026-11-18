// Sessão do visitante num cookie assinado (HMAC). Nada de senha guardada no site.
import crypto from "node:crypto";

const COOKIE = "tj_sess";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const b64u = (buf) => Buffer.from(buf).toString("base64url");
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mín. 32 caracteres)");
  return s;
}
function sign(data) { return crypto.createHmac("sha256", secret()).update(data).digest("base64url"); }

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isSecure(req) {
  const host = req.headers.host || "";
  return !(host.startsWith("localhost") || host.startsWith("127.0.0.1"));
}

export function cookie(req, name, value, maxAge) {
  return [
    `${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax",
    `Max-Age=${maxAge}`, isSecure(req) ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function addCookie(res, c) {
  const prev = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", prev ? [].concat(prev, c) : [c]);
}

export function setSession(req, res, profileId) {
  const payload = b64u(JSON.stringify({ pid: profileId, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  addCookie(res, cookie(req, COOKIE, `${payload}.${sign(payload)}`, MAX_AGE));
}

export function clearSession(req, res) { addCookie(res, cookie(req, COOKIE, "", 0)); }

export function getSession(req) {
  const raw = parseCookies(req)[COOKIE];
  if (!raw || !raw.includes(".")) return null;
  const [payload, sig] = raw.split(".");
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() / 1000 ? data : null;
  } catch { return null; }
}

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  return `${isSecure(req) ? "https" : "http"}://${req.headers.host}`;
}

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}
