import { $, loadVideos, videoCard, cleanTitle, fmtDate, revealScan } from "../site.js";

loadVideos().then(list => {
  const vids = list.filter(v => !v.short), shorts = list.filter(v => v.short);
  // destaque: o vídeo longo mais recente (se ainda não tiver vídeo longo, vira o 1º da lista)
  const top = vids[0];
  if (top) {
    const f = $("#feat"), img = $("#featImg");
    f.href = top.url; f.dataset.yt = top.id; f.dataset.title = cleanTitle(top.titulo);
    img.src = top.thumb.replace("hqdefault", "maxresdefault");
    const fb = () => { img.onerror = img.onload = null; img.src = top.thumb; };
    img.onerror = fb; img.onload = () => { if (img.naturalWidth < 200) fb(); };
    $("#featTitle").textContent = cleanTitle(top.titulo);
    $("#featMeta").textContent = [top.canal, fmtDate(top.publicado)].filter(Boolean).join(" · ");
    f.hidden = false;
  }
  const rest = vids.slice(1);
  $("#gridVideos").innerHTML = rest.length ? rest.map(videoCard).join("") : (top ? "" : '<p class="empty">Nenhum vídeo recente.</p>');
  $("#gridShorts").innerHTML = shorts.length ? shorts.map(videoCard).join("") : '<p class="empty">Nenhum short recente.</p>';
  $("#countVideos").textContent = vids.length || "";
  $("#countShorts").textContent = shorts.length || "";
  revealScan();
});

/* abas Vídeos / Shorts */
const tabs = [$("#tab-videos"), $("#tab-shorts")];
function select(t){
  tabs.forEach(b => { const on = b === t; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1;
    document.getElementById(b.getAttribute("aria-controls")).hidden = !on; });
  $("#feat").classList.toggle("off", t.id === "tab-shorts");
  try { localStorage.setItem("ytTab", t.id); } catch {}
  revealScan();
}
tabs.forEach((b,i) => {
  b.onclick = () => select(b);
  b.onkeydown = e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[(i+1) % 2]; select(n); n.focus(); } };
});
const pref = location.hash === "#shorts" ? "tab-shorts" : (() => { try { return localStorage.getItem("ytTab"); } catch { return null; } })();
if (pref && document.getElementById(pref)) select(document.getElementById(pref));
