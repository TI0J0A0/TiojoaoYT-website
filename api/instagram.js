// GET /api/instagram — últimos posts do @tiojoaoyt pela API do Instagram (login do Instagram).
// Precisa de INSTAGRAM_TOKEN (gere com: node scripts/instagram-token.mjs). Cache de 1 h.

export default async function handler(req, res) {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { res.setHeader("Cache-Control", "s-maxage=300"); res.status(200).json({ enabled: false, posts: [] }); return; }
  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
    const r = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=12&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error?.message || `instagram ${r.status}`);
    const posts = (d.data || []).map((m) => ({
      id: m.id,
      tipo: m.media_type === "VIDEO" ? "video" : m.media_type === "CAROUSEL_ALBUM" ? "album" : "foto",
      img: m.media_type === "VIDEO" ? (m.thumbnail_url || null) : (m.media_url || null),
      legenda: (m.caption || "").trim(),
      url: m.permalink,
      data: m.timestamp,
      curtidas: m.like_count ?? null,
      comentarios: m.comments_count ?? null,
    })).filter((p) => p.img && p.url);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ enabled: true, posts });
  } catch (e) {
    console.error("instagram:", e.message);
    res.setHeader("Cache-Control", "s-maxage=120");
    res.status(200).json({ enabled: true, posts: [], error: "indisponivel" });
  }
}
