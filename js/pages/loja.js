import { $, $$, esc, fmtPts, openLogin, toast, revealScan } from "../site.js";

let data = null, tab = "premio", sel = null;
try { if (localStorage.getItem("lojaTab") === "sorteio" || location.hash === "#sorteios") tab = "sorteio"; } catch {}

const fmtData = iso => new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).replace(",", " às");
const encerrado = i => i.tipo === "sorteio" && (i.sorteado_em || (i.encerra_em && new Date(i.encerra_em) <= Date.now()));
const esgotado = i => i.estoque != null && i.estoque <= 0;
const noLimite = i => i.limite_por_pessoa != null && i.meus >= i.limite_por_pessoa;
const STATUS = { pendente:["Aguardando entrega","wait"], entregue:["Entregue","ok"], recusado:["Recusado · tjcoins devolvidos","no"],
  participando:["Participando","wait"], encerrado:["Sorteio encerrado","off"] };

/* ---------- carteira ---------- */
function renderWallet(){
  const t = $("#walletTxt"), a = $("#walletActs");
  if (!data.enabled) { t.innerHTML = "<b>A loja abre em breve</b><span>Estamos preparando os prêmios. Enquanto isso, continue juntando tjcoins nas lives.</span>"; a.innerHTML = ""; return; }
  if (!data.logado) {
    t.innerHTML = "<b>Entre para ver seu saldo</b><span>Use a Twitch ou a Kick. Quem tinha pontos no StreamElements recebe tudo no primeiro login com a Twitch.</span>";
    a.innerHTML = '<button class="btn btn-primary" type="button" id="wLogin">Entrar</button>'; $("#wLogin").onclick = openLogin; return;
  }
  t.innerHTML = `<span>Seu saldo</span><b class="bal">${fmtPts(data.saldo)} <small>tjcoins</small></b>`;
  a.innerHTML = data.admin ? '<a class="btn btn-sm" href="/painel">Abrir painel da loja</a>' : "";
}

/* ---------- vitrine ---------- */
function itemCard(i){
  const off = encerrado(i) || esgotado(i);
  let tag = "", foot = "";
  if (i.tipo === "sorteio") {
    tag = i.sorteado_em ? '<span class="chip">Sorteado</span>' : encerrado(i) ? '<span class="chip">Vendas encerradas</span>' : '<span class="chip on-g">Aberto</span>';
    foot = i.sorteado_em ? `<p class="si-win">🏆 Ganhador: <b>${esc(i.vencedor || "—")}</b></p>`
      : `<p class="si-meta">${fmtPts(i.vendidos)} bilhetes vendidos${i.encerra_em ? ` · até ${fmtData(i.encerra_em)}` : ""}${i.meus ? ` · <b>você tem ${i.meus}</b>` : ""}</p>`;
  } else {
    tag = esgotado(i) ? '<span class="chip">Esgotado</span>' : i.estoque != null ? `<span class="chip on-g">${i.estoque} ${i.estoque === 1 ? "restante" : "restantes"}</span>` : "";
    foot = i.meus ? `<p class="si-meta"><b>Você já resgatou${i.meus > 1 ? " " + i.meus + "x" : ""}</b></p>` : "";
  }
  const btn = off ? "" : noLimite(i) ? '<span class="si-lim">Limite atingido</span>'
    : `<button class="btn btn-primary btn-sm" type="button" data-buy="${i.id}">${i.tipo === "sorteio" ? "Comprar bilhete" : "Resgatar"}</button>`;
  return `<article class="shop-item cut ${off ? "is-off" : ""}">
    <div class="si-img">${i.imagem ? `<img src="${esc(i.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="si-ph">${i.tipo === "sorteio" ? "🎟" : "🎁"}</span>`}
      <span class="si-price stamp-mini"><span class="coin">TJ</span>${fmtPts(i.preco)}${i.tipo === "sorteio" ? "<small>/bilhete</small>" : ""}</span></div>
    <div class="si-body">${tag}<h3>${esc(i.nome)}</h3>${i.descricao ? `<p>${esc(i.descricao)}</p>` : ""}${foot}<div class="si-acts">${btn}</div></div>
  </article>`;
}

function renderGrid(){
  const itens = (data.itens || []);
  const lista = itens.filter(i => i.tipo === tab);
  $("#cPremio").textContent = itens.filter(i => i.tipo === "premio").length || "";
  $("#cSorteio").textContent = itens.filter(i => i.tipo === "sorteio").length || "";
  $$(".shop-bar .tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
  $("#shopGrid").innerHTML = lista.map(itemCard).join("");
  const empty = $("#shopEmpty");
  empty.hidden = !!lista.length;
  if (!lista.length) empty.innerHTML = !data.enabled ? "<b>🛒 Loja em construção</b><p>Os primeiros prêmios chegam logo. Fica de olho no Discord!</p>"
    : `<b>${tab === "sorteio" ? "🎟 Nenhum sorteio aberto agora" : "🎁 Nenhum prêmio na vitrine agora"}</b><p>Novos itens aparecem aqui — o aviso sai no Discord.</p>`;
  revealScan();
}

function renderOrders(){
  const box = $("#pedidos");
  const ped = data.pedidos || [];
  box.hidden = !ped.length;
  $("#orders").innerHTML = ped.map(p => {
    const [txt, cls] = STATUS[p.status] || [p.status, "off"];
    const ganhou = p.custo === 0 && p.tipo === "sorteio";
    return `<div class="order cut">
      <span class="o-ic">${ganhou ? "🏆" : p.tipo === "sorteio" ? "🎟" : "🎁"}</span>
      <div class="o-main"><b>${esc(p.item)}</b><small>${ganhou ? "Você ganhou o sorteio!" : p.tipo === "sorteio" ? `${p.qtd} ${p.qtd === 1 ? "bilhete" : "bilhetes"}` : "Prêmio"} · ${fmtData(p.criado_em)}${p.custo ? ` · ${fmtPts(p.custo)} TJ` : ""}</small>
        ${p.nota ? `<p class="o-note">Recado do Tio: ${esc(p.nota)}</p>` : ""}</div>
      <span class="o-st ${cls}">${txt}</span></div>`;
  }).join("");
}

function render(){ renderWallet(); renderGrid(); renderOrders(); }

async function load(){
  try {
    const r = await fetch("/api/loja", { cache:"no-store" });
    data = await r.json();
    if (!r.ok) throw new Error(data.error);
  } catch (e) { data = data && data.itens ? data : { enabled:false, itens:[] }; if (e.message) toast(e.message, "err"); }
  render();
}

$$(".shop-bar .tabs button").forEach(b => b.onclick = () => { tab = b.dataset.tab; try { localStorage.setItem("lojaTab", tab); } catch {} renderGrid(); });

/* ---------- compra ---------- */
const modal = $("#buyModal");
function total(){ return sel.preco * (sel.tipo === "sorteio" ? Math.max(1, Math.floor(+$("#buyQty").value || 1)) : 1); }
function updTotal(){
  const t = total(), falta = t > data.saldo;
  $("#buyTotal").innerHTML = `<span class="coin">TJ</span>${fmtPts(t)} <small>· saldo depois: ${fmtPts(Math.max(0, data.saldo - t))}</small>`;
  $("#buyErr").textContent = falta ? `Faltam ${fmtPts(t - data.saldo)} tjcoins.` : "";
  $("#buyGo").disabled = falta;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-buy]"); if (!b) return;
  if (!data.logado) { openLogin(); return; }
  sel = data.itens.find(i => i.id === +b.dataset.buy); if (!sel) return;
  $("#buyImg").innerHTML = sel.imagem ? `<img src="${esc(sel.imagem)}" alt="" referrerpolicy="no-referrer">` : "";
  $("#buyImg").hidden = !sel.imagem;
  $("#buyKind").textContent = sel.tipo === "sorteio" ? "Sorteio" : "Prêmio";
  $("#buyTitle").textContent = sel.nome;
  $("#buyDesc").textContent = sel.descricao || "";
  const max = Math.min(100, sel.limite_por_pessoa != null ? sel.limite_por_pessoa - sel.meus : 100, Math.floor(data.saldo / sel.preco) || 1);
  $("#buyQtyRow").hidden = sel.tipo !== "sorteio";
  $("#buyQty").value = 1; $("#buyQty").max = Math.max(1, max);
  $("#buyInfoRow").hidden = !sel.pede_entrega;
  $("#buyInfoLbl").textContent = sel.pede_entrega || "";
  $("#buyInfo").value = ""; $("#buyInfo").required = !!sel.pede_entrega;
  $("#buyGo").textContent = sel.tipo === "sorteio" ? "Comprar bilhetes" : "Confirmar resgate";
  updTotal();
  modal.showModal();
});
$$(".qty button", modal).forEach(b => b.onclick = () => {
  const q = $("#buyQty"); q.value = Math.min(+q.max || 100, Math.max(1, (+q.value || 1) + +b.dataset.q)); updTotal();
});
$("#buyQty").oninput = updTotal;
$("#buyClose").onclick = () => modal.close();
modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });
$("#buyForm").onsubmit = async e => {
  e.preventDefault();
  const go = $("#buyGo"); go.disabled = true; $("#buyErr").textContent = "";
  try {
    const r = await fetch("/api/loja", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ item: sel.id, qtd: sel.tipo === "sorteio" ? +$("#buyQty").value : 1, entrega: $("#buyInfo").value }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Não deu certo.");
    modal.close();
    toast(sel.tipo === "sorteio" ? "Bilhetes comprados! Boa sorte 🍀" : "Resgate feito! O Tio vai te entregar em breve.");
    await load();
    $$("#acct .bal").forEach(el => el.lastChild.textContent = fmtPts(data.saldo));
  } catch (err) { $("#buyErr").textContent = err.message; go.disabled = false; }
};

$("#shopGrid").innerHTML = '<div class="shop-item cut sk"></div>'.repeat(3);
load();
