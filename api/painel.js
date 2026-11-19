// /api/painel — só para o dono da loja (profiles.is_admin = true)
//   GET  → todos os itens e pedidos
//   POST → { acao: "salvar", item: {...} }            cria/edita item
//          { acao: "status", id, status, nota }        entregue | recusado (devolve tjcoins) | pendente
//          { acao: "sortear", id }                     sorteia um ganhador
import { db } from "./_lib/db.js";
import { storeConfigured, readJson, checkPost, sessionPid, dbError } from "./_lib/store.js";

const txt = (v, max) => { const s = String(v ?? "").trim().slice(0, max); return s || null; };
const int = (v, min) => { if (v === "" || v == null) return null; const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= min ? n : NaN; };

function cleanItem(i) {
  const out = {
    tipo: i.tipo === "sorteio" ? "sorteio" : "premio",
    nome: txt(i.nome, 80),
    descricao: txt(i.descricao, 600) || "",
    imagem: txt(i.imagem, 500),
    preco: int(i.preco, 1),
    estoque: int(i.estoque, 0),
    limite_por_pessoa: int(i.limite_por_pessoa, 1),
    pede_entrega: txt(i.pede_entrega, 80),
    encerra_em: i.encerra_em ? new Date(i.encerra_em).toISOString() : null,
    ativo: i.ativo !== false,
    ordem: int(i.ordem, -9999) ?? 0,
  };
  if (!out.nome) return "Dê um nome ao item.";
  if (!out.preco || Number.isNaN(out.preco)) return "Preço inválido.";
  if ([out.estoque, out.limite_por_pessoa, out.ordem].some(Number.isNaN)) return "Número inválido.";
  if (out.imagem && !/^https:\/\//.test(out.imagem) && !out.imagem.startsWith("/")) return "A imagem precisa ser um link https://";
  if (out.tipo === "sorteio") out.estoque = out.estoque ?? null;
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (!storeConfigured()) { res.status(503).json({ error: "A loja ainda não foi configurada." }); return; }
  const pid = sessionPid(req);
  if (!pid) { res.status(401).json({ error: "Entre na sua conta." }); return; }
  const [me] = await db.select("profiles", `id=eq.${encodeURIComponent(pid)}&select=is_admin`).catch(() => []);
  if (!me?.is_admin) { res.status(403).json({ error: "Só o dono da loja pode abrir o painel." }); return; }

  try {
    if (req.method === "GET") { res.status(200).json(await db.rpc("store_admin", { p_admin: pid })); return; }
    const bad = checkPost(req);
    if (bad) { res.status(400).json({ error: bad }); return; }
    const b = await readJson(req);

    if (b.acao === "salvar") {
      const item = cleanItem(b.item || {});
      if (typeof item === "string") { res.status(400).json({ error: item }); return; }
      const id = int(b.item?.id, 1);
      if (id) await db.update("store_items", `id=eq.${id}`, item);
      else await db.insert("store_items", item);
      res.status(200).json({ ok: true }); return;
    }
    if (b.acao === "status") {
      await db.rpc("store_set_status", { p_admin: pid, p_id: Number(b.id), p_status: String(b.status), p_nota: txt(b.nota, 300) });
      res.status(200).json({ ok: true }); return;
    }
    if (b.acao === "sortear") {
      res.status(200).json({ ok: true, ...(await db.rpc("store_draw", { p_admin: pid, p_item: Number(b.id) })) }); return;
    }
    res.status(400).json({ error: "Ação desconhecida." });
  } catch (e) {
    const known = dbError(e);
    if (!known) console.error("painel:", e.message);
    res.status(known ? 409 : 500).json({ error: known ? known.msg : "Erro no painel. Tente de novo." });
  }
}
