import { $, $$, esc, fmtPts, openLogin, toast, revealScan } from "../site.js";

let data = null, filtro = "pendente";
const fmtData = iso => iso ? new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" }) : "";
const ST = { pendente:"Pendente", entregue:"Entregue", recusado:"Recusado" };
const PROV = { twitch:"Twitch", kick:"Kick" };

async function api(body){
  const r = await fetch("/api/painel", body ? { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) } : { cache:"no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Erro"), { status: r.status });
  return j;
}

/* ---------- pedidos ---------- */
function renderOrders(){
  const all = data.pedidos || [];
  const pend = all.filter(p => p.status === "pendente");
  $("#nPend").textContent = pend.length || "";
  $$("[data-f]").forEach(b => b.setAttribute("aria-selected", b.dataset.f === filtro));
  const list = filtro === "pendente" ? pend : all;
  $("#admOrders").innerHTML = list.length ? list.map(p => `
    <div class="adm-order cut st-${p.status}">
      <div class="ao-who">${p.avatar ? `<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer">` : ""}
        <div><b>${esc(p.pessoa)}</b><small>${(p.contas || []).map(c => `${PROV[c.provider] || c.provider}: ${esc(c.login)}`).join(" · ")}</small></div></div>
      <div class="ao-what"><b>${p.sorteio ? "🏆 Ganhou: " : "🎁 "}${esc(p.item)}</b>
        <small>${fmtData(p.criado_em)}${p.custo ? ` · pagou ${fmtPts(p.custo)} TJ` : ""}</small>
        ${p.entrega ? `<div class="ao-info"><span>Dado para entrega</span><code>${esc(p.entrega)}</code><button type="button" class="ao-copy" data-copy="${esc(p.entrega)}">Copiar</button></div>` : '<div class="ao-info none">Sem dado de entrega — fale com a pessoa pela Twitch/Kick.</div>'}
        ${p.nota ? `<p class="ao-note">Seu recado: ${esc(p.nota)}</p>` : ""}</div>
      <div class="ao-acts">${p.status === "pendente"
        ? `<button class="btn btn-primary btn-sm" data-st="entregue" data-id="${p.id}">✓ Entregue</button>
           <button class="btn btn-sm" data-st="recusado" data-id="${p.id}">Recusar${p.custo ? " e devolver" : ""}</button>`
        : `<span class="o-st ${p.status === "entregue" ? "ok" : "no"}">${ST[p.status]}</span>
           ${p.status === "entregue" ? `<button class="ao-link" data-st="pendente" data-id="${p.id}">voltar p/ pendente</button>` : ""}`}</div>
    </div>`).join("") : `<div class="shop-empty cut"><b>${filtro === "pendente" ? "✨ Nenhum pedido pendente" : "Nenhum pedido ainda"}</b></div>`;
}

/* ---------- itens ---------- */
function renderItems(){
  const it = data.itens || [];
  $("#admItems").innerHTML = it.length ? it.map(i => {
    const sorteio = i.tipo === "sorteio";
    const info = sorteio
      ? (i.sorteado_em ? `🏆 ${esc(i.vencedor || "—")} · sorteado em ${fmtData(i.sorteado_em)}` : `${fmtPts(i.vendidos)} bilhetes · ${i.participantes} ${i.participantes === 1 ? "pessoa" : "pessoas"}${i.encerra_em ? ` · vendas até ${fmtData(i.encerra_em)}` : ""}`)
      : `${i.vendidos} resgatados${i.estoque != null ? ` · ${i.estoque} em estoque` : " · sem limite de estoque"}`;
    return `<div class="adm-item cut ${i.ativo ? "" : "is-off"}">
      <span class="ai-ic">${i.imagem ? `<img src="${esc(i.imagem)}" alt="" referrerpolicy="no-referrer">` : sorteio ? "🎟" : "🎁"}</span>
      <div class="ai-main"><b>${esc(i.nome)}</b>${i.ativo ? "" : ' <span class="chip">Oculto</span>'}
        <small>${sorteio ? "Sorteio" : "Prêmio"} · ${fmtPts(i.preco)} TJ${sorteio ? "/bilhete" : ""} · ${info}</small></div>
      <div class="ai-acts">
        ${sorteio && !i.sorteado_em ? `<button class="btn btn-primary btn-sm" data-draw="${i.id}" ${i.vendidos ? "" : "disabled"}>🎲 Sortear</button>` : ""}
        <button class="btn btn-sm" data-edit="${i.id}">Editar</button>
      </div></div>`;
  }).join("") : '<div class="shop-empty cut"><b>Nenhum item ainda</b><p>Clique em “+ Novo item” para criar o primeiro prêmio ou sorteio.</p></div>';
}

function render(){ renderOrders(); renderItems(); revealScan(); }

async function load(){
  try {
    data = await api();
    $("#admMsg").textContent = "Só você vê esta página.";
    $("#admApp").hidden = false;
    render();
  } catch (e) {
    const m = $("#admMsg");
    m.textContent = e.message;
    if (e.status === 401) { m.innerHTML = 'Entre na sua conta para abrir o painel. <button class="btn btn-sm" type="button" id="admLogin">Entrar</button>'; $("#admLogin").onclick = openLogin; }
  }
}

$$("[data-f]").forEach(b => b.onclick = () => { filtro = b.dataset.f; renderOrders(); });

document.addEventListener("click", async e => {
  const cp = e.target.closest("[data-copy]");
  if (cp) { navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast("Copiado!")); return; }

  const st = e.target.closest("[data-st]");
  if (st) {
    const status = st.dataset.st;
    let nota = null;
    if (status === "recusado") {
      nota = prompt("Recusar este pedido? Os tjcoins voltam para a pessoa.\n\nRecado para ela (opcional):", "");
      if (nota === null) return;
    } else if (status === "entregue") {
      nota = prompt("Marcar como entregue. Recado para a pessoa (opcional):", "Prêmio enviado! Aproveite 🎉");
      if (nota === null) return;
    }
    st.disabled = true;
    try { await api({ acao:"status", id:+st.dataset.id, status, nota }); toast(status === "recusado" ? "Pedido recusado e tjcoins devolvidos." : "Pedido atualizado."); await load(); }
    catch (err) { toast(err.message, "err"); st.disabled = false; }
    return;
  }

  const dr = e.target.closest("[data-draw]");
  if (dr) {
    const i = data.itens.find(x => x.id === +dr.dataset.draw);
    if (!confirm(`Sortear "${i.nome}" agora?\n\n${i.vendidos} bilhetes de ${i.participantes} ${i.participantes === 1 ? "pessoa" : "pessoas"}. As vendas fecham e não dá para desfazer.`)) return;
    dr.disabled = true;
    try { const r = await api({ acao:"sortear", id:i.id }); alert(`🏆 Ganhador: ${r.vencedor}\n\n(${r.bilhetes} bilhetes no sorteio). O prêmio entrou na fila de pedidos.`); await load(); }
    catch (err) { toast(err.message, "err"); dr.disabled = false; }
    return;
  }

  const ed = e.target.closest("[data-edit]");
  if (ed) openItem(data.itens.find(x => x.id === +ed.dataset.edit));
});

/* ---------- formulário de item ---------- */
const modal = $("#itemModal"), form = $("#itemForm");
const localDT = iso => { if (!iso) return ""; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
function syncTipo(){
  const t = form.tipo.value;
  $$("[data-only]", form).forEach(el => el.hidden = el.dataset.only !== t);
  $("[data-lbl-preco]", form).textContent = t === "sorteio" ? "Preço do bilhete (tjcoins)" : "Preço (tjcoins)";
}
function openItem(i){
  form.reset(); $("#itemErr").textContent = "";
  $("#itemTitle").textContent = i ? "Editar item" : "Novo item";
  form.item_id.value = i?.id || "";
  form.tipo.value = i?.tipo || "premio";
  $$('input[name="tipo"]', form).forEach(r => r.disabled = !!i); // tipo não muda depois de criado
  for (const k of ["nome", "descricao", "imagem", "preco", "estoque", "limite_por_pessoa", "pede_entrega", "ordem"]) form[k].value = i?.[k] ?? (k === "ordem" ? 0 : "");
  form.encerra_em.value = localDT(i?.encerra_em);
  form.ativo.checked = i ? i.ativo : true;
  syncTipo();
  modal.showModal();
}
$$('input[name="tipo"]', form).forEach(r => r.onchange = syncTipo);
$("#newItem").onclick = () => openItem(null);
$("#itemClose").onclick = () => modal.close();
form.onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  const item = { ...f, id: form.item_id.value || null, tipo: form.tipo.value, ativo: form.ativo.checked,
    encerra_em: form.tipo.value === "sorteio" && f.encerra_em ? new Date(f.encerra_em).toISOString() : null,
    estoque: form.tipo.value === "premio" ? f.estoque : "" };
  try { await api({ acao:"salvar", item }); modal.close(); toast("Item salvo!"); await load(); }
  catch (err) { $("#itemErr").textContent = err.message; }
};

load();
