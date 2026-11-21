import { $, esc, CONFIG, liveData, mergeLive, liveCard, revealScan, loadVideos, cleanTitle, loadGames, stampHTML,
  countdown, countdownHTML, fmtEvento, discordData } from "../site.js";

// links antigos (#notas, #setup...) da página única levam para a página nova
const OLD = { lives:"/lives", evento:"/lives", youtube:"/videos", notas:"/reviews", setup:"/setup", comunidade:"/comunidade", instagram:"/comunidade", contato:"/comunidade" };
const h = location.hash.slice(1); if (OLD[h]) location.replace(OLD[h]);

/* status das lives */
const renderLives = d => { $("#livesGrid").innerHTML = mergeLive(d).map(liveCard).join(""); revealScan(); };
renderLives({});
liveData.then(renderLives);

/* próxima live */
$("#tEventTitle").textContent = CONFIG.evento.titulo;
$("#tCountdown").innerHTML = countdownHTML;
$("#tEventWhen").textContent = fmtEvento(countdown($("#tCountdown")));

/* último vídeo longo */
loadVideos().then(list => {
  const v = list.find(x => !x.short && x.thumb); if (!v) return;
  const t = $("#tVideo"), img = $(".bg", t);
  img.src = v.thumb.replace("hqdefault", "maxresdefault"); img.hidden = false;
  // a versão HD nem sempre existe (o YouTube devolve uma imagem cinza pequena): volta para a normal
  const fallback = () => { img.onerror = img.onload = null; img.src = v.thumb; };
  img.onerror = fallback; img.onload = () => { if (img.naturalWidth < 200) fallback(); };
  const a = $("#tVideoLink"); a.href = v.url; a.dataset.yt = v.id; a.dataset.title = cleanTitle(v.titulo);
  $("#tVideoTitle").textContent = cleanTitle(v.titulo);
});

/* última review com nota */
loadGames().then(list => {
  const g = list.find(x => x.nota != null && x.review && x.review.length) || list[0]; if (!g) return;
  const t = $("#tReview"); t.href = "/reviews/" + g.slug;
  const img = $(".bg", t); img.src = g.capa; img.hidden = false;
  $("#tReviewStamp").innerHTML = stampHTML(g, 84);
  $("#tReviewTitle").textContent = g.titulo;
  $("#tReviewText").textContent = g.review && g.review[0] ? g.review[0] : "Review em breve.";
});

/* Discord: rostos de quem está online */
discordData.then(d => {
  if (!d) return;
  $("#tAvatars").innerHTML = (d.members || []).filter(m => m.avatar_url).slice(0, 7)
    .map(m => `<img src="${esc(m.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join("");
});

/* arte do topo acompanha o mouse */
const hero = $(".hero");
if (matchMedia("(hover:hover) and (prefers-reduced-motion:no-preference)").matches) {
  let mv = null, mRaf = 0; // no máximo 1 atualização por quadro
  hero.addEventListener("mousemove", e => {
    mv = e; if (mRaf) return;
    mRaf = requestAnimationFrame(() => {
      mRaf = 0; const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((mv.clientX - r.left) / r.width - .5).toFixed(2));
      hero.style.setProperty("--my", ((mv.clientY - r.top) / r.height - .5).toFixed(2));
    });
  });
  hero.addEventListener("mouseleave", () => { hero.style.setProperty("--mx", 0); hero.style.setProperty("--my", 0); });
}
revealScan();
