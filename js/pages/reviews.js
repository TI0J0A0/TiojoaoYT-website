import { $, loadGames, gameCard, fmtNota, revealScan } from "../site.js";

const st = { list:[], busca:"", ordem:"recentes" };
const ORD = {
  recentes:(a,b) => (b.fim || "").localeCompare(a.fim || ""),
  nota:(a,b) => (b.nota ?? -1) - (a.nota ?? -1),
  az:(a,b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
};
function render(){
  const q = st.busca.trim().toLowerCase();
  const list = st.list.filter(g => !q || g.titulo.toLowerCase().includes(q)).sort(ORD[st.ordem]);
  $("#gamesGrid").innerHTML = list.length ? list.map(gameCard).join("") : '<p class="empty">Nenhum jogo encontrado.</p>';
  revealScan();
}
loadGames().then(list => {
  st.list = list;
  const notas = list.filter(g => g.nota != null).map(g => +g.nota);
  $("#gStats").innerHTML = `<div class="cut"><b>${list.length}</b><span>jogos</span></div>`
    + (notas.length ? `<div class="cut"><b>${fmtNota(notas.reduce((a,b) => a+b, 0) / notas.length)}</b><span>média</span></div>` : "")
    + (notas.length ? `<div class="cut"><b>${fmtNota(Math.max(...notas))}</b><span>maior nota</span></div>` : "");
  render();
}).catch(() => { $("#gamesGrid").innerHTML = '<p class="empty">Não foi possível carregar a lista de jogos.</p>'; });

$("#gSearch").addEventListener("input", e => { st.busca = e.target.value; render(); });
$("#gSort").addEventListener("change", e => { st.ordem = e.target.value; render(); });
