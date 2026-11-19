// GET /api/live — diz se o Tiojoao está ao vivo na Twitch, na Kick e no YouTube.
// Roda no servidor (Vercel Function), então o Client Secret nunca vai para o navegador.
//
// Variáveis de ambiente necessárias (configure na Vercel ou no arquivo .env.local):
//   TWITCH_CLIENT_ID      → Client ID do app em dev.twitch.tv
//   TWITCH_CLIENT_SECRET  → Client Secret do app
//   TWITCH_LOGIN          → (opcional) nome do canal, padrão "tiojoaoyt"
//   KICK_CLIENT_ID        → Client ID do app em kick.com/settings/developer
//   KICK_CLIENT_SECRET    → Client Secret do app
//   KICK_SLUG             → (opcional) canal na Kick, padrão "tiojoao"
//   YOUTUBE_CHANNEL_ID    → (opcional) canal do YouTube (não precisa de chave)

let token = { value: null, expiresAt: 0 };

async function getAppToken(force = false) {
  if (!force && token.value && Date.now() < token.expiresAt) return token.value;
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const j = await r.json();
  // renova 5 min antes de expirar
  token = { value: j.access_token, expiresAt: Date.now() + (j.expires_in - 300) * 1000 };
  return token.value;
}

async function twitchStatus() {
  const id = process.env.TWITCH_CLIENT_ID;
  if (!id || !process.env.TWITCH_CLIENT_SECRET) return { status: "unknown", error: "sem credenciais" };
  const login = process.env.TWITCH_LOGIN || "tiojoaoyt";
  const helix = async (path) => {
    const call = async (force) => fetch(`https://api.twitch.tv/helix/${path}`,
      { headers: { "Client-Id": id, Authorization: `Bearer ${await getAppToken(force)}` } });
    let r = await call(false);
    if (r.status === 401) r = await call(true); // token expirou: pega outro e tenta de novo
    if (!r.ok) throw new Error(`helix ${r.status}`);
    return (await r.json()).data || [];
  };

  const [s] = await helix(`streams?user_login=${encodeURIComponent(login)}`);
  if (!s) {
    // offline: tenta mostrar a última live (VOD salvo na Twitch)
    try {
      const [u] = await helix(`users?login=${encodeURIComponent(login)}`);
      const [v] = u ? await helix(`videos?user_id=${u.id}&type=archive&first=1`) : [];
      if (v) return { status: "offline", lastLive: { title: v.title, at: v.created_at, url: v.url, duration: v.duration } };
    } catch (e) { console.error("twitch vod:", e.message); }
    return { status: "offline" };
  }
  return {
    status: "live",
    viewers: s.viewer_count,
    title: s.title,
    game: s.game_name,
    startedAt: s.started_at,
    thumb: s.thumbnail_url?.replace("{width}x{height}", "640x360"),
  };
}

/* ---------- Kick (API oficial: api.kick.com/public/v1) ---------- */
let kickToken = { value: null, expiresAt: 0 };
async function getKickToken(force = false) {
  if (!force && kickToken.value && Date.now() < kickToken.expiresAt) return kickToken.value;
  const r = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.KICK_CLIENT_ID,
      client_secret: process.env.KICK_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new Error(`kick token ${r.status}`);
  const j = await r.json();
  kickToken = { value: j.access_token, expiresAt: Date.now() + ((j.expires_in || 3600) - 300) * 1000 };
  return kickToken.value;
}

async function kickStatus() {
  if (!process.env.KICK_CLIENT_ID || !process.env.KICK_CLIENT_SECRET) return { status: "unknown", error: "sem credenciais" };
  const slug = process.env.KICK_SLUG || "tiojoao";
  const call = async (force) => fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(slug)}`,
    { headers: { Authorization: `Bearer ${await getKickToken(force)}`, Accept: "application/json" } });
  let r = await call(false);
  if (r.status === 401) r = await call(true);
  if (!r.ok) throw new Error(`kick channels ${r.status}`);
  const c = (await r.json()).data?.[0];
  if (!c) throw new Error("kick sem canal");
  const s = c.stream || {};
  if (!s.is_live) return { status: "offline" };
  return {
    status: "live",
    viewers: s.viewer_count ?? null,
    title: c.stream_title || "",
    game: c.category?.name || null,
    startedAt: s.start_time || null,
    thumb: s.thumbnail || null,
  };
}

/* ---------- YouTube (página pública /live do canal, sem chave) ---------- */
async function youtubeStatus() {
  const ch = process.env.YOUTUBE_CHANNEL_ID || "UCpT-H-0kRTNbY6bQjK_hjJQ";
  const r = await fetch(`https://www.youtube.com/channel/${ch}/live`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" },
  });
  if (!r.ok) throw new Error(`youtube ${r.status}`);
  const html = await r.text();
  if (!html.includes("ytInitialPlayerResponse") && !html.includes('rel="canonical"')) throw new Error("youtube página inesperada");
  const id = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || [])[1];
  if (!id) return { status: "offline" }; // canal sem live: /live cai na página do canal
  const dec = (t = "") => t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const title = dec((html.match(/<meta name="title" content="([^"]*)"/) || [])[1]);
  const url = `https://www.youtube.com/watch?v=${id}`;
  const upcoming = /"isUpcoming":true/.test(html);
  // a resposta do YouTube varia: às vezes vem isLiveNow, às vezes só isLive (que também aparece em live agendada)
  if (/"isLiveNow":true/.test(html) || (/"isLive":true/.test(html) && !upcoming)) {
    const v = (html.match(/"originalViewCount":"(\d+)"/) || [])[1];
    const started = (html.match(/"startTimestamp":"([^"]+)"/) || [])[1];
    return { status: "live", videoId: id, url, title, viewers: v ? Number(v) : null, startedAt: started || null, game: null };
  }
  const sched = Number((html.match(/"scheduledStartTime":"(\d+)"/) || [])[1]);
  // live agendada (só se for no futuro — agendamentos antigos que não aconteceram são ignorados)
  if (upcoming && sched * 1000 > Date.now()) return { status: "offline", next: { title, at: new Date(sched * 1000).toISOString(), url } };
  return { status: "offline" };
}

// nunca afirma online/offline se a API falhar
const safe = (nome, fn) => fn().catch(e => { console.error(nome + ":", e.message); return { status: "unknown" }; });

export default async function handler(req, res) {
  const [twitch, kick, youtube] = await Promise.all([safe("twitch", twitchStatus), safe("kick", kickStatus), safe("youtube", youtubeStatus)]);
  // CDN guarda a resposta por 60 s: as plataformas são consultadas no máximo 1x por minuto
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  res.status(200).json({ twitch, kick, youtube, updatedAt: new Date().toISOString() });
}
