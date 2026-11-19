import { $, esc, CONFIG, liveData, mergeLive, liveCard, revealScan, countdown, countdownHTML, fmtEvento, ago } from "../site.js";

$("#eventTitle").textContent = CONFIG.evento.titulo;
$("#cd").innerHTML = countdownHTML;
$("#eventWhen").textContent = fmtEvento(countdown($("#cd")));

function render(d){
  const lives = mergeLive(d);
  $("#livesGrid").innerHTML = lives.map(liveCard).join("");
  const tw = lives.find(l => l.id === "twitch");
  // player da Twitch aparece só quando estiver ao vivo
  const box = $("#playerBox");
  if (tw.status === "live") {
    if (!$("#playerFrame iframe")) $("#playerFrame").innerHTML =
      `<iframe src="https://player.twitch.tv/?channel=tiojoaoyt&parent=${encodeURIComponent(location.hostname)}&muted=true" allowfullscreen title="Live na Twitch"></iframe>`;
    $("#playerTitle").textContent = tw.title + (tw.game ? " · " + tw.game : "");
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
