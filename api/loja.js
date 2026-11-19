// /api/loja
//   GET  → itens da loja (e, se logado, saldo e pedidos da pessoa)
//   POST → { item, qtd, entrega } compra um prêmio ou bilhetes de sorteio
import { db } from "./_lib/db.js";
import { storeConfigured, readJson, checkPost, sessionPid, dbError } from "./_lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!storeConfigured()) { res.status(200).json({ enabled: false, itens: [] }); return; }
  const pid = sessionPid(req);

  if (req.method === "GET") {
    try {
      const cat = await db.rpc("store_catalog", { p_profile: pid });
      let saldo = null, admin = false;
      if (pid) {
        const [p] = await db.select("profiles", `id=eq.${encodeURIComponent(pid)}&select=points,is_admin`);
        if (p) { saldo = p.points; admin = p.is_admin; }
      }
      res.status(200).json({ enabled: true, logado: saldo != null, saldo, admin, ...cat });
    } catch (e) {
      console.error("loja:", e.message);
      res.status(503).json({ enabled: true, error: "A loja está indisponível agora." });
    }
    return;
  }

  const bad = checkPost(req);
  if (bad) { res.status(400).json({ error: bad }); return; }
  if (!pid) { res.status(401).json({ error: "Entre com a Twitch ou a Kick para comprar." }); return; }
  try {
    const b = await readJson(req);
    const item = Number(b.item), qtd = Math.floor(Number(b.qtd) || 1);
    if (!Number.isInteger(item) || item < 1) { res.status(400).json({ error: "Item inválido." }); return; }
    const r = await db.rpc("store_redeem", { p_profile: pid, p_item: item, p_qtd: qtd, p_entrega: String(b.entrega || "").slice(0, 300) || null });
    res.status(200).json({ ok: true, ...r });
  } catch (e) {
    const known = dbError(e);
    if (!known) console.error("loja compra:", e.message);
    res.status(known ? 409 : 500).json({ error: known ? known.msg : "Não deu para concluir agora. Tente de novo.", code: known?.code });
  }
}
