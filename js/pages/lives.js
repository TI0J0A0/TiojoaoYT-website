import { $, esc, CONFIG, liveData, mergeLive, liveCard, revealScan, countdown, countdownHTML, fmtEvento, ago } from "../site.js";

$("#eventTitle").textContent = CONFIG.evento.titulo;
$("#cd").innerHTML = countdownHTML;
$("#eventWhen").textContent = fmtEvento(countdown($("#cd")));

function render(d){
  const lives = mergeLive(d);
  $("#livesGrid").innerHTML = lives.map(liveCard).join("");
  const tw = lives.find(l => l.id === "twitch");
  // player aparece só quando estiver ao vivo (Twitch primeiro; depois Kick; depois YouTube)
  const box = $("#playerBox");
  const on = ["twitch", "kick", "youtube"].map(id => lives.find(l => l.id === id)).find(l => l && l.status === "live" && (l.id !== "youtube" || l.videoId));
  if (on) {
    const src = on.id === "twitch" ? `https://player.twitch.tv/?channel=tiojoaoyt&parent=${encodeURIComponent(location.hostname)}&muted=true`
      : on.id === "kick" ? `https://player.kick.com/${CONFIG.redes.kick.split("/").pop()}?muted=true`
      : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(on.videoId)}?autoplay=1&mute=1&playsinline=1`;
    const cur = $("#playerFrame iframe");
    if (!cur || cur.dataset.p !== on.id) $("#playerFrame").innerHTML =
      `<iframe data-p="${on.id}" src="${src}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="Live: ${on.name}"></iframe>`;
    $("#playerWhere").textContent = (on.id === "youtube" ? "Ao vivo no " : "Ao vivo na ") + on.name;
    $("#playerTitle").textContent = on.title + (on.game ? " · " + on.game : "");
    box.hidden = false;
    $("#liveLead").textContent = "Estou ao vivo agora! Chega mais.";
  } else { box.hidden = true; $("#playerFrame").innerHTML = ""; }
  // última live (Twitch)
  if (tw.lastLive) {
    $("#lastLive").hidden = false;
    $("#lastTitle").textContent = tw.lastLive.title;
    $("#lastMeta").textContent = [ago(tw.lastLive.at), tw.lastLive.duration ? "duração " + tw.lastLive.duration.replace(/(\d+m)\d+s$/, "$1") : ""].filter(Boolean).join(" · ");
    $("#lastLink").href = tw.lastLive.url || CONFIG.redes.twitch;
  }
  revealScan();
}
render({});
liveData.then(render);
// atualiza o status a cada minuto
setInterval(() => fetch("/api/live").then(r => r.ok ? r.json() : null).then(d => d && render(d)).catch(() => {}), 60000);
