/* =========================================================
   TIOJOAOYT — código compartilhado por todas as páginas
   (topo, menu, rodapé, conta, player de vídeo, Discord, lives)
   ========================================================= */

/* ---------- CONFIGURAÇÃO — edite aqui links e a próxima live ---------- */
export const CONFIG = {
  lives: [
    { id:"kick",    name:"Kick",    url:"https://kick.com/tiojoao",                                  title:"Me siga na Kick" },
    { id:"twitch",  name:"Twitch",  url:"https://www.twitch.tv/tiojoaoyt",                           title:"Me siga na Twitch" },
    { id:"youtube", name:"YouTube", url:"https://www.youtube.com/channel/UCpT-H-0kRTNbY6bQjK_hjJQ", title:"Me siga no YouTube" },
  ],
  evento: { titulo:"Live especial com o Tio", data:"2026-11-20T00:00:00-03:00" }, // horário de Brasília
  redes: {
    twitch:"https://www.twitch.tv/tiojoaoyt", kick:"https://kick.com/tiojoao",
    youtube:"https://www.youtube.com/channel/UCpT-H-0kRTNbY6bQjK_hjJQ", instagram:"https://www.instagram.com/tiojoaoyt",
    discord:"https://discord.com/invite/d88egTm7", x:"https://twitter.com/joaoguiar_5", livepix:"https://livepix.gg/tiojoaoyt",
  },
};
const PAGES = [
  { id:"inicio", href:"/", nome:"Início" },
  { id:"lives", href:"/lives", nome:"Lives" },
  { id:"videos", href:"/videos", nome:"Vídeos" },
  { id:"reviews", href:"/reviews", nome:"Reviews" },
  { id:"setup", href:"/setup", nome:"Setup" },
  { id:"comunidade", href:"/comunidade", nome:"Comunidade" },
];

/* ---------- utilidades ---------- */
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export const pad = n => String(n).padStart(2, "0");
export function ago(iso){
  const day = t => { const x = new Date(t); x.setHours(0,0,0,0); return x; };
  const d = Math.round((day(Date.now()) - day(iso)) / 86400000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 30 ? `há ${d} dias` : "em " + new Date(iso).toLocaleDateString("pt-BR");
}
export const fmtNota = n => n == null ? "—" : Number(n).toLocaleString("pt-BR", { maximumFractionDigits:1 });
export const mesAno = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { month:"short", year:"numeric" }).replace(".", "") : "";
export const slugify = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fetchJSON = (url, opt) => fetch(url, opt).then(r => r.ok ? r.json() : Promise.reject(new Error(url + " " + r.status)));
const SOCIAL = [
  ["twitch","tw","▣","Twitch","Lives principais"], ["kick","ki","K","Kick","Lives"], ["youtube","yt","▶","YouTube","Vídeos e Shorts"],
  ["instagram","ig","◎","Instagram","@tiojoaoyt"], ["discord","dc","◆","Discord","Comunidade"], ["x","x","𝕏","X / Twitter","Novidades"],
  ["livepix","tip","♥","Apoiar","LivePix · mensagem na live"],
];
const socialLinks = () => SOCIAL.map(([k,c,i,n,s]) => `<a href="${CONFIG.redes[k]}" target="_blank" rel="noopener"><span class="ic ${c}">${i}</span><span>${n}<small>${s}</small></span></a>`).join("");

/* ---------- topo, menu lateral, rodapé e janelas ---------- */
const page = document.body.dataset.page || "";
const cur = id => id === page ? ' aria-current="page"' : "";
document.body.insertAdjacentHTML("afterbegin", `
<a class="sr-only" href="#conteudo">Pular para o conteúdo</a>
<header class="site-head" id="top">
  <div class="wrap nav">
    <a href="/" class="brand" aria-label="Tiojoao — início"><span class="logo">TJ</span><span>TIOJOAO<span class="dim">YT</span></span></a>
    <ul class="menu" aria-label="Menu principal">
      ${PAGES.map(p => `<li><a href="${p.href}"${cur(p.id)}>${p.nome}</a></li>`).join("")}
      <li class="has-sub"><button aria-expanded="false" aria-haspopup="true" id="redesBtn">Redes <span class="caret">▾</span></button>
        <div class="sub cut">${socialLinks()}</div></li>
    </ul>
    <div class="nav-right">
      <div class="acct" id="acct" hidden></div>
      <a href="/lives" class="btn btn-primary btn-sm" id="liveBtn"><span class="dot"></span> Ver lives</a>
      <button class="menu-btn" id="openMenu" aria-label="Abrir menu" aria-controls="drawer" aria-expanded="false">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
  <div class="progress" id="progress"></div>
</header>
<div class="drawer" id="drawer" aria-hidden="true"><nav aria-label="Menu">
  <div class="drawer-head"><span class="brand"><span class="logo">TJ</span><span>TIOJOAO<span class="dim">YT</span></span></span>
    <button class="menu-btn" id="closeMenu" aria-label="Fechar menu">✕</button></div>
  <h6>Navegar</h6>
  ${PAGES.map((p,i) => `<a class="big" href="${p.href}"${cur(p.id)}><small>${pad(i+1)}</small>${p.nome}</a>`).join("")}
  <h6>Redes</h6><div class="drawer-socials">${socialLinks()}</div>
  <a href="/lives" class="btn btn-primary">Ver lives</a>
</nav></div>`);
document.body.insertAdjacentHTML("beforeend", `
<footer class="site-foot">
  <div class="stripes" aria-hidden="true"></div>
  <div class="wrap">
    <div class="foot-top"><span class="script">Até a próxima live!</span><a href="/lives" class="btn btn-primary">Ver lives</a></div>
    <div class="foot-cols">
      <div><h5>Site</h5>${PAGES.map(p => `<a href="${p.href}">${p.nome}</a>`).join("")}</div>
      <div><h5>Lives</h5><a href="${CONFIG.redes.twitch}" target="_blank" rel="noopener">Twitch</a><a href="${CONFIG.redes.kick}" target="_blank" rel="noopener">Kick</a><a href="${CONFIG.redes.youtube}" target="_blank" rel="noopener">YouTube</a></div>
      <div><h5>Comunidade</h5><a href="${CONFIG.redes.discord}" target="_blank" rel="noopener">Discord</a><a href="${CONFIG.redes.livepix}" target="_blank" rel="noopener">Apoiar no LivePix</a><a href="${CONFIG.redes.instagram}" target="_blank" rel="noopener">Instagram</a><a href="${CONFIG.redes.x}" target="_blank" rel="noopener">X / Twitter</a></div>
      <div><h5>Parcerias</h5><a href="${CONFIG.redes.instagram}" target="_blank" rel="noopener">Mande DM no Instagram</a><a href="/comunidade#parcerias">Como trabalhar comigo</a></div>
    </div>
    <div class="foot-bottom"><span>© ${new Date().getFullYear()} Tiojoao · tiojoaoyt.com</span><a href="#top">Voltar ao topo ↑</a></div>
  </div>
</footer>
<dialog class="video-modal" id="videoModal" aria-labelledby="vmTitle">
  <div class="vm-frame" id="vmFrame"></div>
  <div class="vm-bar"><h4 id="vmTitle"></h4><div class="acts">
    <a class="btn btn-sm" id="vmYT" target="_blank" rel="noopener">Abrir no YouTube ↗</a>
    <button class="btn btn-sm" type="button" id="vmClose">✕ Fechar</button></div></div>
</dialog>
<dialog class="login-modal cut" id="loginModal" aria-labelledby="loginTitle">
  <button class="x-btn" type="button" id="loginClose" aria-label="Fechar">✕</button>
  <span class="coin big" aria-hidden="true">TJ</span>
  <h3 class="display" id="loginTitle">Entre para juntar tjcoins</h3>
  <p>Seus tjcoins ficam na sua conta e vão valer na loja do site. Você pode ligar a Twitch e a Kick no mesmo perfil.</p>
  <div class="login-btns">
    <a class="login-opt tw cut" href="/api/login?p=twitch"><span class="ic tw">▣</span> Entrar com Twitch</a>
    <a class="login-opt ki cut" href="/api/login?p=kick"><span class="ic ki">K</span> Entrar com Kick</a>
  </div>
  <p class="small">Já tinha tjcoins no StreamElements? Entre com a <b>Twitch</b> que eles vêm junto.</p>
  <p class="small">Usamos o login só para saber quem é você. Não guardamos senha nem postamos nada.</p>
</dialog>
<div class="toast" id="toast" role="status" hidden></div>`);

/* topo: fundo ao rolar + barra de progresso */
const head = $(".site-head"), progress = $("#progress");
function onScroll(){
  head.classList.toggle("scrolled", scrollY > 20);
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener("scroll", onScroll, { passive:true }); onScroll();

/* menu Redes (clique abre no celular/teclado) */
const redes = $(".has-sub"), redesBtn = $("#redesBtn");
const closeRedes = () => { redes.classList.remove("open"); redesBtn.setAttribute("aria-expanded", false); };
redesBtn.onclick = e => { e.stopPropagation(); const o = !redes.classList.contains("open"); redes.classList.toggle("open", o); redesBtn.setAttribute("aria-expanded", o); };
document.addEventListener("click", e => { if (!redes.contains(e.target)) closeRedes(); });

/* menu lateral (celular) */
const drawer = $("#drawer");
const setMenu = open => {
  drawer.classList.toggle("open", open); drawer.setAttribute("aria-hidden", !open);
  $("#openMenu").setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
  $$(".big", drawer).forEach((a,i) => a.style.transitionDelay = open ? (80 + i*40) + "ms" : "0ms");
};
$("#openMenu").onclick = () => setMenu(true);
$("#closeMenu").onclick = () => setMenu(false);
drawer.onclick = e => { if (e.target === drawer || e.target.closest("a")) setMenu(false); };
addEventListener("keydown", e => { if (e.key === "Escape") { setMenu(false); closeRedes(); } });

/* ---------- aparecer ao rolar ---------- */
const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}), { threshold:.12, rootMargin:"0px 0px -40px 0px" }) : null;
export function revealScan(){
  if (!io) return;
  $$("[data-reveal], .tile, .game, .vid, .sec-head, .panel, .live-card, .insta a").forEach(el => {
    if (el.dataset.rv) return; el.dataset.rv = 1;
    const d = Math.min([...el.parentElement.children].indexOf(el), 6) * 70;
    el.style.transitionDelay = `${d}ms, ${d}ms, 0ms`;
    el.classList.add("reveal"); io.observe(el);
  });
}

/* ---------- toast ---------- */
export function toast(msg, kind = "ok"){
  const t = $("#toast"); t.textContent = msg; t.className = "toast " + kind; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 6000);
}

/* ---------- player do YouTube na própria página ---------- */
const vModal = $("#videoModal");
export const ytId = u => { try { const x = new URL(u); if (x.hostname.includes("youtu.be")) return x.pathname.slice(1);
  return x.searchParams.get("v") || (x.pathname.match(/\/(?:shorts|embed|live|vi)\/([\w-]{6,})/) || [])[1] || ""; } catch { return ""; } };
export function openVideo(id, { short = false, title = "", url = "", list = "" } = {}){
  if (!id || !vModal.showModal) return false;
  vModal.classList.toggle("short", short);
  $("#vmFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1${list ? "&list=" + encodeURIComponent(list) : ""}"
    title="${esc(title || "Vídeo do YouTube")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  $("#vmTitle").textContent = title;
  $("#vmYT").href = url || (short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`);
  vModal.showModal();
  return true;
}
vModal.addEventListener("close", () => { $("#vmFrame").innerHTML = ""; });
$("#vmClose").onclick = () => vModal.close();
vModal.addEventListener("click", e => { if (e.target === vModal) vModal.close(); });
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-yt]");
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  if (openVideo(a.dataset.yt || ytId(a.href), { short: a.hasAttribute("data-short"), title: a.dataset.title, url: a.href })) e.preventDefault();
});

/* ---------- lives (status vindo de /api/live) ---------- */
const ICONS = { kick:"K", twitch:"▣", youtube:"▶" };
export const liveData = fetchJSON("/api/live").catch(() => ({}));
export function mergeLive(d){
  return CONFIG.lives.map(l => {
    const info = d[l.id] || {};
    return { ...l, status: info.status || "unknown", viewers: info.viewers ?? null, game: info.game || null,
      lastLive: info.lastLive || null, next: info.next || null, videoId: info.videoId || null,
      liveUrl: info.status === "live" && info.url ? info.url : null, title: info.status === "live" && info.title ? info.title : l.title };
  });
}
export const liveCard = l => {
  const chip = l.status === "live" ? '<span class="chip on"><span class="dot"></span>Ao vivo</span>'
    : l.status === "offline" ? '<span class="chip">Offline</span>' : '<span class="chip">Sem status</span>';
  const sub = l.status === "live"
    ? `${l.viewers != null ? "👁 " + Number(l.viewers).toLocaleString("pt-BR") + " assistindo · " : ""}${esc(l.title)}`
    : l.next ? `Próxima live ${new Date(l.next.at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).replace(",", " às")}: ${esc(l.next.title)}`
    : l.lastLive ? `Última live ${ago(l.lastLive.at)}: ${esc(l.lastLive.title)}` : esc(l.title);
  return `<a class="live-card cut ${l.status === "live" ? "is-live" : ""}" href="${esc(l.liveUrl || (l.next && l.next.url) || l.url)}" target="_blank" rel="noopener">
    <span class="ico ${l.id}">${ICONS[l.id]}</span>
    <div><h3>${esc(l.name)} ${chip}</h3><p>${sub}</p>${l.status === "live" && l.game ? `<p class="game">🎮 ${esc(l.game)}</p>` : ""}</div>
    <span class="arrow">↗</span></a>`;
};
liveData.then(d => {
  const live = mergeLive(d).find(l => l.status === "live");
  if (!live) return;
  const b = $("#liveBtn"); b.classList.add("is-on"); b.innerHTML = '<span class="dot"></span> Ao vivo agora';
});

/* ---------- contagem regressiva (próxima live) ---------- */
export function countdown(root){
  const target = new Date(CONFIG.evento.data);
  const el = k => $(`[data-cd="${k}"]`, root);
  let iv;
  const tick = () => {
    const d = Math.max(0, target - Date.now()) / 1000;
    if (!d) { // chegou a hora: troca a contagem por um aviso
      clearInterval(iv);
      root.innerHTML = `<a class="btn btn-primary cd-now" href="/lives"><span class="dot"></span> Chegou a hora! Vem pra live</a>`;
      return;
    }
    el("d").textContent = pad(Math.floor(d / 86400)); el("h").textContent = pad(Math.floor(d % 86400 / 3600));
    el("m").textContent = pad(Math.floor(d % 3600 / 60)); el("s").textContent = pad(Math.floor(d % 60));
  };
  iv = setInterval(tick, 1000); tick();
  return target;
}
export const countdownHTML = `<div class="countdown" aria-live="off">
  <div class="cut"><b data-cd="d">00</b><span>dias</span></div><div class="cut"><b data-cd="h">00</b><span>horas</span></div>
  <div class="cut"><b data-cd="m">00</b><span>min</span></div><div class="cut"><b data-cd="s">00</b><span>seg</span></div></div>`;
export const fmtEvento = t => {
  const o = { timeZone:"America/Sao_Paulo" };
  const hm = t.toLocaleTimeString("pt-BR", { ...o, hour:"2-digit", minute:"2-digit" });
  // meia-noite: mostra o dia anterior ("quinta, 19 de novembro, à meia-noite") — é como o público fala
  if (hm === "00:00") {
    const v = new Date(t - 60000), dia = d => d.toLocaleDateString("pt-BR", { ...o, weekday:"long" }).split("-")[0];
    return `${v.toLocaleDateString("pt-BR", { ...o, weekday:"long", day:"2-digit", month:"long" })}, à meia-noite (virada para ${dia(t)}) · Brasília`;
  }
  return t.toLocaleString("pt-BR", { ...o, weekday:"long", day:"2-digit", month:"long", hour:"2-digit", minute:"2-digit" }) + " (Brasília)";
};

/* ---------- vídeos do YouTube ---------- */
const fmtViews = n => n == null ? "" : " · " + (n >= 1000 ? (n/1000).toLocaleString("pt-BR", { maximumFractionDigits:1 }) + " mil" : n) + (n === 1 ? " visualização" : " visualizações");
export const fmtDate = iso => { if (!iso) return ""; const d = (Date.now() - new Date(iso)) / 86400000;
  return d < 1 ? "hoje" : d < 2 ? "ontem" : d < 30 ? `há ${Math.floor(d)} dias` : new Date(iso).toLocaleDateString("pt-BR"); };
export const cleanTitle = t => String(t || "").replace(/\s*#shorts?\b/ig, "").trim();
const getV = url => fetchJSON(url, { cache:"no-cache" }).then(d => d.videos && d.videos.length ? d.videos : Promise.reject());
export const loadVideos = () => getV("/api/videos").catch(() => getV("/data/videos.json")).catch(() => []);
export const videoCard = v => `<a class="vid" href="${esc(v.url)}" target="_blank" rel="noopener" data-yt="${esc(v.id || "")}"${v.short ? " data-short" : ""} data-title="${esc(cleanTitle(v.titulo))}">
  <div class="frame cut"><img src="${esc(v.thumb)}" alt="" loading="lazy"><span class="play">▶</span></div>
  <h4>${esc(cleanTitle(v.titulo))}</h4><small>${v.publicado ? fmtDate(v.publicado) : ""}${fmtViews(v.views)}</small></a>`;

/* ---------- reviews dos jogos ---------- */
export const loadGames = () => fetchJSON("/data/games.json", { cache:"no-cache" })
  .then(d => (d.games || []).map(g => ({ ...g, slug: g.slug || slugify(g.titulo) })))
  .then(list => list.sort((a,b) => (b.fim || "").localeCompare(a.fim || "")));
export const tone = n => n >= 9 ? "#c2410c" : n >= 8 ? "#d1246b" : n >= 7 ? "#7c3aed" : "#5b5370";
export const stampHTML = (g, s = 78) => {
  const tem = g.review && g.review.length;
  return g.nota == null
    ? `<div class="stamp-wrap"><div class="stamp none" style="--s:${s}px"><div><b>?</b><i>${tem ? "a definir" : "em breve"}</i></div></div></div>`
    : `<div class="stamp-wrap" title="Nota ${fmtNota(g.nota)} de 10"><div class="stamp" style="--s:${s}px;--tone:${tone(g.nota)}"><div><b>${fmtNota(g.nota)}</b><i>nota do tio</i></div></div></div>`;
};
export const gameMeta = g => [g.episodios ? `${g.episodios} episódio${g.episodios > 1 ? "s" : ""}` : "", g.fim ? mesAno(g.fim) : ""].filter(Boolean).join(" · ");
export const gameCard = g => {
  const tem = g.review && g.review.length;
  return `<article class="game cut">
    <div class="cover"><img src="${esc(g.capa)}" alt="" loading="lazy">${stampHTML(g)}</div>
    <div class="body">
      <h3><a href="/reviews/${esc(g.slug)}">${esc(g.titulo)}</a></h3>
      ${gameMeta(g) ? `<div class="meta">${gameMeta(g)}</div>` : ""}
      ${tem ? `<p class="excerpt">${esc(g.review[0])}</p>` : '<p class="excerpt soon">⏳ Review em breve</p>'}
      <div class="acts"><span class="read">${tem ? "Ler review →" : "Ver jogo →"}</span>
        ${g.playlist ? `<a class="btn btn-sm" href="${esc(g.playlist)}" target="_blank" rel="noopener">▶ Playlist</a>` : ""}</div>
    </div></article>`;
};

// o cartão inteiro do jogo abre a review (menos o botão da playlist)
document.addEventListener("click", e => {
  const card = e.target.closest(".game"); if (!card || e.target.closest("a, button")) return;
  const a = $("h3 a", card); if (a) location.href = a.href;
});

/* ---------- Discord (widget público) ---------- */
export const discordData = fetchJSON("https://discord.com/api/guilds/1023643110934327396/widget.json").catch(() => null);
discordData.then(d => {
  if (!d) return;
  if (d.instant_invite) $$('a[href*="discord.com/invite"]').forEach(a => a.href = d.instant_invite);
  const n = d.presence_count ?? (d.members || []).length;
  if (n) $$("[data-discord-online]").forEach(el => { el.textContent = n.toLocaleString("pt-BR") + " online"; el.hidden = false; });
});

/* ---------- conta e tjcoins ---------- */
const acct = $("#acct"), loginModal = $("#loginModal");
const PROV = { twitch:{ nome:"Twitch", ic:'<span class="ic tw">▣</span>' }, kick:{ nome:"Kick", ic:'<span class="ic ki">K</span>' } };
export const fmtPts = n => Number(n || 0).toLocaleString("pt-BR");
export const openLogin = () => loginModal.showModal ? loginModal.showModal() : loginModal.setAttribute("open", "");
function renderAcct(u){
  if (!u) { acct.innerHTML = '<button class="acct-btn" type="button" id="loginOpen">Entrar</button>'; $("#loginOpen").onclick = openLogin; return; }
  const has = Object.fromEntries(u.accounts.map(a => [a.provider, a.login]));
  acct.innerHTML = `<button class="acct-chip" type="button" id="acctChip" aria-expanded="false" aria-haspopup="true">
      ${u.avatar ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">` : ""}
      <span class="nm">${esc(u.name)}</span><span class="bal"><span class="coin">TJ</span>${fmtPts(u.points)}</span></button>
    <div class="acct-pop cut" id="acctPop" hidden>
      <div class="who">${u.avatar ? `<img class="av" src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">` : ""}<div><b>${esc(u.name)}</b><small>Minha conta</small></div></div>
      <div class="wallet cut"><span>Seu saldo</span><b><span class="coin" style="width:30px;height:30px;font-size:11px">TJ</span>${fmtPts(u.points)}</b><span>tjcoins</span></div>
      <h6>Contas ligadas</h6>
      <div class="links">${Object.entries(PROV).map(([k,p]) => `<div>${p.ic}<span>${p.nome}${has[k] ? ` · ${esc(has[k])}` : ""}</span>${has[k] ? '<span class="ok">✓</span>' : `<a href="/api/login?p=${k}&link=1">Vincular</a>`}</div>`).join("")}</div>
      <p class="soon">🛒 A loja para trocar seus tjcoins chega em breve.</p>
      <button class="btn btn-sm out" type="button" id="logoutBtn">Sair</button>
    </div>`;
  const chip = $("#acctChip"), pop = $("#acctPop");
  chip.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; chip.setAttribute("aria-expanded", !pop.hidden); };
  document.addEventListener("click", e => { if (!acct.contains(e.target)) { pop.hidden = true; chip.setAttribute("aria-expanded", false); } });
  $("#logoutBtn").onclick = () => fetch("/api/logout", { method:"POST" }).finally(() => location.reload());
}
$("#loginClose").onclick = () => loginModal.close();
loginModal.addEventListener("click", e => { if (e.target === loginModal) loginModal.close(); });
export const me = fetchJSON("/api/me", { cache:"no-store" }).catch(() => ({ enabled:false }));
me.then(d => { if (d.enabled) { acct.hidden = false; renderAcct(d.user); } });
(() => { // mensagens da volta do login
  const q = new URLSearchParams(location.search);
  const ERR = { cancelado:"Login cancelado.", sessao_expirada:"O login expirou. Tente de novo.", conta_ja_vinculada:"Essa conta já está ligada a outro perfil.",
    plataforma_ja_vinculada:"Seu perfil já tem uma conta dessa plataforma.", nao_configurado:"O login ainda não está disponível.", falha:"Não foi possível entrar agora. Tente de novo." };
  if (q.has("conta")) {
    const imp = +q.get("importados") || 0;
    toast(q.get("conta") === "vinculada" ? "Conta vinculada! Seus pontos agora ficam juntos." : imp ? `Bem-vindo! ${fmtPts(imp)} tjcoins do StreamElements foram para a sua conta.` : "Você entrou! Seus tjcoins aparecem no topo.");
  } else if (q.has("conta_erro")) toast(ERR[q.get("conta_erro")] || ERR.falha, "err");
  if (q.has("conta") || q.has("conta_erro")) history.replaceState(null, "", location.pathname);
})();

revealScan();
