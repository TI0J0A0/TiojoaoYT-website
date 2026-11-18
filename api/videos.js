// GET /api/videos — últimos vídeos e Shorts do canal, lidos do RSS público do YouTube.
// Roda no servidor e fica em cache por 30 min, então o site se atualiza sozinho
// sem precisar rodar scripts/update_videos.py.

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCpT-H-0kRTNbY6bQjK_hjJQ";

const decode = (s = "") => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const pick = (xml, re) => decode((xml.match(re) || [])[1]);

export default async function handler(req, res) {
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { headers: { "User-Agent": "Mozilla/5.0 (site-updater)" } });
    if (!r.ok) throw new Error(`rss ${r.status}`);
    const xml = await r.text();

    const canal = pick(xml.split("<entry>")[0], /<title>([^<]*)<\/title>/);
    const videos = xml.split("<entry>").slice(1).map((e) => {
      const id = pick(e, /<yt:videoId>([^<]+)</);
      const url = pick(e, /<link rel="alternate" href="([^"]+)"/);
      const views = pick(e, /<media:statistics views="(\d+)"/);
      return {
        id,
        titulo: pick(e, /<title>([^<]*)<\/title>/),
        url,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publicado: pick(e, /<published>([^<]+)</),
        short: url.includes("/shorts/"),
        views: views ? Number(views) : null,
        canal,
      };
    });

    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.status(200).json({ canal, videos });
  } catch (e) {
    console.error("videos:", e.message);
    res.status(502).json({ videos: [] }); // o site cai para data/videos.json
  }
}
