import { $, esc, CONFIG, discordData, me, openLogin, revealScan } from "../site.js";

/* Discord */
discordData.then(d => {
  if (!d) return;
  const n = d.presence_count ?? (d.members || []).length; if (!n) return;
  $("#dcFaces").innerHTML = (d.members || []).filter(m => m.avatar_url).slice(0, 8)
    .map(m => `<img src="${esc(m.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join("");
  $("#dcCount").textContent = n.toLocaleString("pt-BR") + " online agora";
  $("#dcOnline").hidden = false;
});

/* tjcoins: botão de entrar só aparece quando o login estiver ativo */
me.then(d => { if (d.enabled && !d.user) { const b = $("#coinsLogin"); b.hidden = false; b.onclick = openLogin; } });

/* Instagram — posts reais via /api/instagram; sem token, blocos que levam ao perfil */
const IG = CONFIG.redes.instagram;
const igNum = n => n == null ? "" : n >= 1000 ? (n/1000).toLocaleString("pt-BR", { maximumFractionDigits:1 }) + " mil" : n;
const igPost = p => `<a class="cut" href="${esc(p.url)}" target="_blank" rel="noopener" title="${esc(p.legenda.slice(0,140))}">
  <img class="art" src="${esc(p.img)}" alt="${esc(p.legenda.slice(0,100) || "Post do Instagram")}" loading="lazy">
  ${p.tipo !== "foto" ? `<i class="ig-kind" aria-hidden="true">${p.tipo === "video" ? "▶" : "❐"}</i>` : ""}
  <span>${esc(p.legenda.split("\n")[0].slice(0,90))}${p.curtidas != null ? `<small>♥ ${igNum(p.curtidas)}${p.comentarios != null ? ` · 💬 ${igNum(p.comentarios)}` : ""}</small>` : ""}</span></a>`;
$("#insta").innerHTML = [1,2,3,4].map(i => `<a class="cut ig-ph" href="${IG}" target="_blank" rel="noopener"><div class="art a${i}"></div>${i === 1 ? "<span>Siga <b>@tiojoaoyt</b> no Instagram ↗</span>" : ""}</a>`).join("");
fetch("/api/instagram").then(r => r.ok ? r.json() : Promise.reject()).then(d => {
  if (!d.posts || !d.posts.length) return;
  $("#insta").innerHTML = d.posts.slice(0, 8).map(igPost).join("");
  revealScan();
}).catch(() => {});

/* todas as redes */
const R = CONFIG.redes;
$("#socials").innerHTML = [
  ["tw","▣","Twitch","Lives principais",R.twitch], ["ki","K","Kick","Lives",R.kick], ["yt","▶","YouTube","Vídeos e Shorts",R.youtube],
  ["ig","◎","Instagram","@tiojoaoyt",R.instagram], ["dc","◆","Discord","Comunidade",R.discord], ["x","𝕏","X / Twitter","@joaoguiar_5",R.x],
].map(([c,i,n,s,u]) => `<a class="social cut" href="${u}" target="_blank" rel="noopener"><span class="ic ${c}">${i}</span><span><b>${n}</b><small>${s}</small></span><span class="arrow">↗</span></a>`).join("");
revealScan();
