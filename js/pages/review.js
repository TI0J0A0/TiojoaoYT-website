import { $, esc, loadGames, gameCard, stampHTML, gameMeta, ytId, revealScan } from "../site.js";

// endereço: /reviews/nome-do-jogo  (ou /review.html?jogo=nome-do-jogo)
const slug = decodeURIComponent(location.pathname.split("/reviews/")[1] || new URLSearchParams(location.search).get("jogo") || "").replace(/\/$/, "");

loadGames().then(list => {
  const g = list.find(x => x.slug === slug);
  if (!g) {
    $("#rvTitle").textContent = "Jogo não encontrado";
    $("#rvText").innerHTML = '<p>Essa review não existe (ou mudou de endereço). <a class="link" href="/reviews">Ver todas as reviews</a></p>';
    $(".rv-card").hidden = true;
    return;
  }
  document.title = `${g.titulo} · Review do Tiojoao`;
  $('meta[name="description"]').content = g.review && g.review[0] ? g.review[0].slice(0, 155) : `Review de ${g.titulo} no canal do Tiojoao.`;
  $("#rvTitle").textContent = g.titulo;
  $("#rvMeta").textContent = [gameMeta(g), g.nota != null ? `nota ${String(g.nota).replace(".", ",")}/10` : "nota a definir"].filter(Boolean).join(" · ");
  $("#rvBg").src = g.capa; $("#rvCover").src = g.capa; $("#rvCover").alt = "Capa do vídeo de " + g.titulo;
  $("#rvCap").textContent = g.titulo;
  $("#rvStamp").innerHTML = stampHTML(g, 118);
  $("#rvText").innerHTML = g.review && g.review.length
    ? g.review.map(t => `<p>${esc(t)}</p>`).join("")
    : '<p class="soon">⏳ A review deste jogo ainda está sendo escrita. Enquanto isso, dá pra assistir a gameplay completa.</p>';

  // player: 1º episódio (da capa) + playlist, carregado só quando clicar
  const vid = ytId(g.capa);
  const list_ = (() => { try { return new URL(g.playlist).searchParams.get("list") || ""; } catch { return ""; } })();
  const listOk = list_.length >= 18; // ids curtos/incompletos não funcionam no player
  if (g.playlist) { const p = $("#rvPlaylist"); p.href = g.playlist; p.hidden = false; }
  if (vid) {
    $("#rvPlayer").hidden = false;
    $("#rvThumb").src = g.capa;
    $("#rvFacade").onclick = () => {
      $("#rvPlayer").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}?autoplay=1&rel=0&modestbranding=1&playsinline=1${listOk ? "&list=" + encodeURIComponent(list_) : ""}"
        title="${esc(g.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    };
  }

  // outras reviews: as com nota primeiro, depois as mais recentes
  const others = list.filter(x => x !== g).sort((a,b) => (b.nota != null) - (a.nota != null)).slice(0, 3);
  $("#others").innerHTML = others.map(gameCard).join("");
  revealScan();
}).catch(() => { $("#rvTitle").textContent = "Não foi possível carregar"; });
