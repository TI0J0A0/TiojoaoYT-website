// Utilidades comuns da loja (/api/loja e /api/painel)
import { getSession } from "./session.js";

export const storeConfigured = () => !!(process.env.SESSION_SECRET && process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

// Corpo JSON (a Vercel já entrega em req.body; o servidor local não)
export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw new Error("corpo grande demais"); }
  return raw ? JSON.parse(raw) : {};
}

// Só aceita POST do próprio site, em JSON (protege contra formulários de outros sites)
export function checkPost(req) {
  if (req.method !== "POST") return "use POST";
  if (!String(req.headers["content-type"] || "").includes("application/json")) return "formato inválido";
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return "origem inválida"; } catch { return "origem inválida"; }
  }
  return null;
}

export function sessionPid(req) {
  try { return getSession(req)?.pid || null; } catch { return null; }
}

// Erros das funções do banco → mensagem para a pessoa
const MSGS = {
  saldo_insuficiente: "Você não tem tjcoins suficientes.",
  sem_estoque: "Esse prêmio acabou.",
  item_indisponivel: "Esse item não está mais disponível.",
  sorteio_encerrado: "As vendas desse sorteio já encerraram.",
  limite_por_pessoa: "Você já atingiu o limite desse item.",
  falta_entrega: "Preencha o dado para a entrega.",
  qtd_invalida: "Quantidade inválida.",
  sem_permissao: "Só o dono da loja pode fazer isso.",
  pedido_invalido: "Esse pedido não pode mais ser alterado.",
  status_invalido: "Status inválido.",
  ja_sorteado: "Esse sorteio já foi realizado.",
  sem_bilhetes: "Ninguém comprou bilhete ainda.",
  item_invalido: "Item inválido.",
};
export function dbError(e) {
  const code = Object.keys(MSGS).find((k) => String(e.message).includes(k));
  return code ? { code, msg: MSGS[code] } : null;
}
