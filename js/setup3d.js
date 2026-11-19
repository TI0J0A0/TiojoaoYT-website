// Setup 3D interativo do Tiojoao — Three.js
// Os objetos são modelados aqui com formas simples (estilo low-poly neon).
// Nomes, modelos e descrições vêm de data/setup.json (ligados pelo "id").
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const CATS = { pc: "PC & Monitores", audio: "Áudio & Live", video: "Câmera & Luz", perif: "Periféricos", console: "Console" };
const PINK = 0xff5fa2, ORANGE = 0xffa45c, TEAL = 0x2fd4d9, PURPLE = 0x6b2fd1;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- helpers de material e geometria ---------------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o });
const neonMats = [];
function neon(color, k = 1) {
  const m = new THREE.MeshBasicMaterial({ color });
  m.userData.base = new THREE.Color(color); m.userData.k = k;
  neonMats.push(m); return m;
}
function box(w, h, d, mat, r = 0) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, mat, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = m.receiveShadow = true; return m;
}
function between(a, b, r, mat) {
  const len = a.distanceTo(b), m = cyl(r, r, len, mat, 12);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData.redraw = (...a) => { draw(c.getContext("2d"), w, h, ...a); t.needsUpdate = true; };
  t.userData.redraw(); return t;
}
const FONT = '"Sofia Sans Extra Condensed","Arial Narrow",sans-serif';

/* ---------------- texturas ---------------- */
function drawSunset(x, w, h, live) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2a1153"); g.addColorStop(0.55, "#d4527e"); g.addColorStop(1, "#ffa45c");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // sol listrado
  const cx = w * 0.42, cy = h * 0.62, r = h * 0.3;
  const sg = x.createLinearGradient(0, cy - r, 0, cy + r); sg.addColorStop(0, "#ffe08a"); sg.addColorStop(1, "#ff4f9a");
  x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#c6457f";
  for (let i = 0; i < 6; i++) x.fillRect(cx - r, cy + i * r * 0.17, r * 2, r * 0.06 + i * 1.2);
  // mar + grade
  x.fillStyle = "#3d1766"; x.fillRect(0, h * 0.72, w, h);
  x.strokeStyle = "rgba(255,95,162,.55)"; x.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { const yy = h * 0.72 + i * i * 2.4; x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); }
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(cx, h * 0.72); x.lineTo(cx + i * w * 0.12, h); x.stroke(); }
  // palmeiras
  x.fillStyle = "#1a0b2e";
  [[w * 0.12, 1], [w * 0.8, -1]].forEach(([px, dir]) => {
    x.fillRect(px, h * 0.35, 6, h * 0.4);
    for (let k = 0; k < 6; k++) {
      x.beginPath(); x.ellipse(px + 3 + Math.cos(k) * 26 * dir, h * 0.35 + Math.sin(k * 1.3) * 8, 34, 7, (k - 2.5) * 0.45 * dir, 0, Math.PI * 2); x.fill();
    }
  });
  // HUD da live
  x.font = `900 ${h * 0.11}px ${FONT}`; x.fillStyle = "rgba(255,255,255,.92)"; x.fillText("TIOJOAOYT", 16, h * 0.16);
  if (live) {
    x.fillStyle = "#e5194d"; x.beginPath(); x.roundRect(w - 120, 14, 104, 30, 8); x.fill();
    x.fillStyle = "#fff"; x.font = `800 20px ${FONT}`; x.fillText("● AO VIVO", w - 110, 36);
  }
}
function drawChat(x, w, h) {
  x.fillStyle = "#140c1f"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#1d1230"; x.fillRect(0, 0, w, 36);
  x.fillStyle = "#fbf6ff"; x.font = `800 22px ${FONT}`; x.fillText("CHAT DA LIVE", 14, 26);
  const cols = ["#ff5fa2", "#2fd4d9", "#ffa45c", "#bf94ff", "#7ee2a0"];
  for (let i = 0; i < 9; i++) {
    const y = 58 + i * 26; x.fillStyle = cols[i % 5]; x.fillRect(14, y - 10, 46 + (i * 17) % 30, 10);
    x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(70 + (i * 17) % 30, y - 10, 80 + (i * 53) % 120, 10);
  }
}
function drawKeys(x, w, h) {
  x.fillStyle = "#0b0612"; x.fillRect(0, 0, w, h);
  const cols = 16, rows = 5, kw = w / cols, kh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const hue = 300 + ((c / cols) * 90 + r * 6);
    x.fillStyle = `hsl(${hue % 360} 90% 62%)`;
    x.globalAlpha = 0.95; x.fillRect(c * kw + 2, r * kh + 2, kw - 4, kh - 4);
  }
  x.globalAlpha = 1;
}
function drawGrid(x, w, h) {
  x.fillStyle = "#120a1e"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(255,95,162,.35)"; x.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * w / 8, 0); x.lineTo(i * w / 8, h); x.stroke(); x.beginPath(); x.moveTo(0, i * h / 8); x.lineTo(w, i * h / 8); x.stroke(); }
}
function drawWall(x, w, h) {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#1b0f30"); g.addColorStop(1, "#2a1450");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
function drawSign(x, w, h) {
  x.clearRect(0, 0, w, h);
  x.font = `900 ${h * 0.7}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.shadowColor = "#ff5fa2"; x.shadowBlur = 30; x.fillStyle = "#ffd0e4"; x.fillText("ON AIR", w / 2, h / 2 + 4);
  x.shadowBlur = 12; x.fillText("ON AIR", w / 2, h / 2 + 4);
}

function drawOBS(x, w, h) {
  x.fillStyle = "#1b1726"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#0d0a14"; x.fillRect(0, 0, w, 22);
  x.fillStyle = "#cfc6dd"; x.font = `700 14px ${FONT}`; x.fillText("OBS STUDIO  ·  CENA: GAMEPLAY", 10, 16);
  // preview
  const g = x.createLinearGradient(0, 30, 0, h * 0.62); g.addColorStop(0, "#3d1766"); g.addColorStop(1, "#ff7e7e");
  x.fillStyle = g; x.fillRect(w * 0.18, 30, w * 0.64, h * 0.56);
  x.strokeStyle = "#ff5fa2"; x.lineWidth = 2; x.strokeRect(w * 0.18, 30, w * 0.64, h * 0.56);
  x.fillStyle = "rgba(255,255,255,.85)"; x.font = `900 22px ${FONT}`; x.fillText("PREVIEW", w * 0.42, h * 0.34);
  // docks
  const labels = ["CENAS", "FONTES", "MIXER", "TRANSIÇÕES", "CONTROLES"];
  labels.forEach((l, i) => {
    const bx = 6 + i * (w - 12) / 5, bw = (w - 12) / 5 - 6, by = h * 0.7;
    x.fillStyle = "#26203a"; x.fillRect(bx, by, bw, h * 0.27);
    x.fillStyle = "#9b8fb3"; x.font = `700 12px ${FONT}`; x.fillText(l, bx + 6, by + 14);
    if (l === "MIXER") for (let k = 0; k < 3; k++) { x.fillStyle = k === 0 ? "#7ee2a0" : "#2fd4d9"; x.fillRect(bx + 6, by + 24 + k * 14, bw * (0.4 + k * 0.15), 6); }
    else for (let k = 0; k < 3; k++) { x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(bx + 6, by + 24 + k * 14, bw - 12, 8); }
  });
}
function drawStats(x, w, h) {
  x.fillStyle = "#101826"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#e6f6ff"; x.font = `800 22px ${FONT}`; x.fillText("ESTATÍSTICAS DO CANAL", 14, 28);
  const bars = [0.35, 0.5, 0.42, 0.66, 0.58, 0.8, 0.72, 0.95];
  bars.forEach((b, i) => { const bw = (w - 40) / bars.length - 8; const bx = 20 + i * (bw + 8), bh = b * (h - 90);
    const g = x.createLinearGradient(0, h - 30 - bh, 0, h - 30); g.addColorStop(0, "#2fd4d9"); g.addColorStop(1, "#6b2fd1");
    x.fillStyle = g; x.fillRect(bx, h - 30 - bh, bw, bh); });
  x.strokeStyle = "rgba(255,255,255,.2)"; x.beginPath(); x.moveTo(14, h - 28); x.lineTo(w - 14, h - 28); x.stroke();
}
function drawDeck(x, w, h) {
  x.fillStyle = "#07050b"; x.fillRect(0, 0, w, h);
  const cols = 5, rows = 3, pad = 8, kw = (w - pad * (cols + 1)) / cols, kh = (h - pad * (rows + 1)) / rows;
  const colors = ["#ff5fa2", "#2fd4d9", "#ffa45c", "#6b2fd1", "#e5194d", "#7ee2a0", "#ffd27a", "#bf94ff"];
  const icons = ["●", "▶", "♪", "★", "◆", "☰", "✦", "⚡", "◎", "▣", "♥", "✚", "◐", "▲", "✿"];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, bx = pad + c * (kw + pad), by = pad + r * (kh + pad);
    x.fillStyle = colors[i % colors.length]; x.beginPath(); x.roundRect(bx, by, kw, kh, 8); x.fill();
    x.fillStyle = "rgba(255,255,255,.9)"; x.font = `700 ${kh * 0.5}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(icons[i], bx + kw / 2, by + kh / 2 + 2);
  }
  x.textAlign = "left"; x.textBaseline = "alphabetic";
}
function drawMixer(x, w, h) {
  x.fillStyle = "#0b0a0e"; x.fillRect(0, 0, w, h);
  // tela
  x.fillStyle = "#16233a"; x.fillRect(w * 0.06, h * 0.1, w * 0.38, h * 0.4);
  x.fillStyle = "#7ee2a0"; for (let i = 0; i < 4; i++) x.fillRect(w * 0.09 + i * w * 0.08, h * 0.42 - (i + 1) * h * 0.06, w * 0.05, (i + 1) * h * 0.06);
  // pads
  const pc = ["#e5194d", "#ffa45c", "#2fd4d9", "#ff5fa2", "#7ee2a0", "#6b2fd1"];
  for (let i = 0; i < 6; i++) { x.fillStyle = pc[i]; x.beginPath(); x.roundRect(w * 0.06 + (i % 3) * w * 0.13, h * 0.58 + Math.floor(i / 3) * h * 0.2, w * 0.1, h * 0.15, 4); x.fill(); }
  // anéis dos knobs
  [[0.62, 0.5], [0.84, 0.5]].forEach(([cx, cy]) => { x.strokeStyle = "#ff5fa2"; x.lineWidth = 5; x.beginPath(); x.arc(w * cx, h * cy, h * 0.3, Math.PI * 0.75, Math.PI * 2.0); x.stroke(); });
}

/* ---------------- construção da cena ---------------- */
function buildScene(scene) {
  const items = {};
  const reg = (id, group, anchor, viewDir) => { group.traverse((o) => { if (o.isMesh) o.userData.itemId = id; }); items[id] = { id, group, anchor, viewDir }; scene.add(group); };
  const DESK_Y = 0.775;

  // Quarto
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), std(0xffffff, { map: (() => { const t = canvasTex(512, 512, drawGrid); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5); return t; })(), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = std(0xffffff, { map: canvasTex(64, 256, drawWall), roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), wallMat); back.position.set(0, 1.5, -0.95); back.receiveShadow = true; scene.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), wallMat); side.position.set(-2.0, 1.5, 1.05); side.rotation.y = Math.PI / 2; side.receiveShadow = true; scene.add(side);
  const led = box(4.0, 0.025, 0.025, neon(PINK, 1)); led.position.set(0, 2.2, -0.93); scene.add(led);
  const led2 = box(0.025, 0.025, 3.6, neon(TEAL, 1)); led2.position.set(-1.98, 2.2, 0.85); scene.add(led2);
  const ledDesk = box(2.5, 0.02, 0.02, neon(PURPLE, 1.4)); ledDesk.position.set(0, 1.62, -0.93); scene.add(ledDesk);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.56), new THREE.MeshBasicMaterial({ map: canvasTex(512, 288, (x, w, h) => drawSunset(x, w, h, false)) }));
  poster.position.set(1.15, 1.95, -0.94); scene.add(poster);
  const pf = box(1.06, 0.62, 0.02, std(0x0b0710)); pf.position.set(1.15, 1.95, -0.955); scene.add(pf);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.26), new THREE.MeshBasicMaterial({ map: canvasTex(512, 160, drawSign), transparent: true }));
  sign.position.set(-0.85, 1.98, -0.94); scene.add(sign);

  // Palmeira (decoração)
  const palm = new THREE.Group();
  const pot = cyl(0.16, 0.12, 0.3, std(PINK, { roughness: 0.4 })); pot.position.y = 0.15; palm.add(pot);
  let prev = new THREE.Vector3(0, 0.28, 0);
  for (let i = 1; i <= 6; i++) { const p = new THREE.Vector3(Math.sin(i * 0.35) * 0.08, 0.28 + i * 0.2, 0); palm.add(between(prev, p, 0.035 - i * 0.003, std(0x6b4a2e, { roughness: 0.9 }))); prev = p; }
  const leafMat = std(0x2f9e6a, { side: THREE.DoubleSide, roughness: 0.7 });
  for (let k = 0; k < 8; k++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.62, 4, 1, true), leafMat);
    leaf.scale.set(1, 1, 0.25); leaf.position.copy(prev); leaf.rotation.set(0, (k / 8) * Math.PI * 2, 1.15 + (k % 2) * 0.25); leaf.translateY(0.3); leaf.castShadow = true; palm.add(leaf);
  }
  palm.position.set(1.75, 0, -0.62); scene.add(palm);

  // Mesa (mais larga para os 4 monitores)
  const desk = new THREE.Group();
  const top = box(2.5, 0.05, 0.85, std(0x1d1230, { roughness: 0.45 }), 0.012); top.position.y = 0.75; desk.add(top);
  [-1.2, 1.2].forEach((x) => { const leg = box(0.05, 0.725, 0.75, std(0x120a1c)); leg.position.set(x, 0.3625, 0); desk.add(leg); });
  const deskLed = box(2.4, 0.012, 0.012, neon(PINK, 1)); deskLed.position.set(0, 0.725, 0.42); desk.add(deskLed);
  const pad = box(1.1, 0.006, 0.42, std(0x2a1153, { roughness: 0.95 }), 0.003); pad.position.set(-0.05, 0.778, 0.17); desk.add(pad);
  const padLed = box(1.12, 0.004, 0.44, neon(ORANGE, 0.8)); padLed.position.set(-0.05, 0.776, 0.17); desk.add(padLed);
  scene.add(desk);

  // Monitor genérico
  function monitor(w, h, tex, standH = 0.2) {
    const g = new THREE.Group();
    const base = box(w * 0.38, 0.014, 0.18, std(0x120a1c), 0.006); base.position.y = 0.007; g.add(base);
    const neck = box(0.04, standH + 0.06, 0.03, std(0x120a1c)); neck.position.set(0, (standH + 0.06) / 2, -0.05); g.add(neck);
    const frame = box(w + 0.02, h + 0.02, 0.03, std(0x0b0710, { metalness: 0.4 }), 0.008); frame.position.y = standH + h / 2; g.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); scr.position.set(0, standH + h / 2, 0.0155); g.add(scr);
    return g;
  }

  // 2× Alienware OLED (QHD 240 Hz) no centro
  const screenTex = canvasTex(512, 288, (x, w, h, live) => drawSunset(x, w, h, live));
  {
    const g = new THREE.Group();
    const L = monitor(0.6, 0.34, screenTex); L.position.set(-0.32, DESK_Y, -0.2); L.rotation.y = 0.1; g.add(L);
    const R = monitor(0.6, 0.34, canvasTex(512, 288, drawOBS)); R.position.set(0.32, DESK_Y, -0.2); R.rotation.y = -0.1; g.add(R);
    [L, R].forEach((m) => { const tag = box(0.06, 0.008, 0.004, neon(TEAL, 1)); tag.position.set(0, 0.2 - 0.004, 0.017); m.add(tag); });
    reg("alienware", g, new THREE.Vector3(0, DESK_Y + 0.37, -0.18), [0.12, 0.08, 1]);
  }
  // Samsung (FHD 240 Hz) à direita — chat
  {
    const g = monitor(0.53, 0.3, canvasTex(384, 256, drawChat)); g.position.set(0.98, DESK_Y, -0.08); g.rotation.y = -0.55;
    reg("samsung", g, new THREE.Vector3(0.98, DESK_Y + 0.35, -0.06), [0.75, 0.1, 1]);
  }
  // LG (FHD 60 Hz) à esquerda — estatísticas
  {
    const g = monitor(0.53, 0.3, canvasTex(384, 256, drawStats)); g.position.set(-0.98, DESK_Y, -0.08); g.rotation.y = 0.55;
    reg("lg", g, new THREE.Vector3(-0.98, DESK_Y + 0.35, -0.06), [-0.2, 0.1, 1]);
  }
  // PC no chão, à direita da mesa
  const fans = [];
  {
    const g = new THREE.Group(); g.position.set(1.48, 0, 0.0);
    const body = box(0.24, 0.5, 0.46, std(0x0d0815, { metalness: 0.5, roughness: 0.35 }), 0.012); body.position.y = 0.27; g.add(body);
    const feet = box(0.22, 0.02, 0.42, std(0x050308)); feet.position.y = 0.01; g.add(feet);
    const glass = box(0.005, 0.44, 0.4, new THREE.MeshPhysicalMaterial({ color: 0x8866aa, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0 })); glass.position.set(0.122, 0.27, 0); g.add(glass);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 28), neon(PINK, 1)); f.position.set(0, 0.12 + i * 0.14, 0.232); g.add(f); fans.push(f); }
    const back = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 28), neon(PINK, 1)); back.position.set(0, 0.42, -0.2); back.rotation.y = Math.PI; g.add(back); fans.push(back);
    const gpu = box(0.18, 0.045, 0.32, std(0x1a1026)); gpu.position.set(0.02, 0.22, -0.02); g.add(gpu);
    const gpuLed = box(0.005, 0.012, 0.28, neon(TEAL, 1)); gpuLed.position.set(0.112, 0.22, -0.02); g.add(gpuLed);
    const ram = box(0.01, 0.06, 0.12, neon(ORANGE, 0.9)); ram.position.set(0.05, 0.38, 0.0); g.add(ram);
    const cooler = cyl(0.04, 0.04, 0.02, std(0x222033)); cooler.rotation.z = Math.PI / 2; cooler.position.set(0.06, 0.38, 0.1); g.add(cooler);
    reg("pc", g, new THREE.Vector3(1.48, 0.36, 0.15), [0.9, 0.35, 1]);
  }
  // Teclado
  {
    const g = new THREE.Group(); g.position.set(-0.12, DESK_Y + 0.008, 0.2);
    const base = box(0.45, 0.025, 0.15, std(0x120a1c), 0.006); g.add(base);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.13), new THREE.MeshBasicMaterial({ map: canvasTex(320, 96, drawKeys) }));
    keys.rotation.x = -Math.PI / 2; keys.position.y = 0.0135; g.add(keys);
    keys.material.userData.base = new THREE.Color(1, 1, 1); keys.material.userData.k = 0.9; neonMats.push(keys.material);
    reg("teclado", g, new THREE.Vector3(-0.12, 0.82, 0.2), [0.1, 0.9, 0.7]);
  }
  // Mouse
  {
    const g = new THREE.Group(); g.position.set(0.3, DESK_Y + 0.015, 0.2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), std(0x120a1c, { roughness: 0.35 })); m.scale.set(0.06, 0.035, 0.1); m.castShadow = true; g.add(m);
    const stripe = box(0.006, 0.004, 0.05, neon(PINK, 1)); stripe.position.set(0, 0.017, -0.015); g.add(stripe);
    reg("mouse", g, new THREE.Vector3(0.3, 0.82, 0.2), [0.4, 0.9, 0.8]);
  }
  // Shure MV7 no braço articulado
  {
    const g = new THREE.Group(); const mat = std(0x15101f, { metalness: 0.6, roughness: 0.3 });
    const p0 = new THREE.Vector3(0.7, 0.78, -0.4), p1 = new THREE.Vector3(0.7, 1.2, -0.34), p2 = new THREE.Vector3(0.42, 1.16, 0.0);
    const clamp = box(0.05, 0.06, 0.06, mat); clamp.position.copy(p0); g.add(clamp);
    g.add(between(p0, p1, 0.009, mat)); g.add(between(p1, p2, 0.009, mat));
    [p1, p2].forEach((p) => { const j = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), mat); j.position.copy(p); g.add(j); });
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 8, 24, Math.PI), mat); yoke.position.set(0.42, 1.1, 0.04); yoke.rotation.set(0, Math.PI / 2, Math.PI); g.add(yoke);
    g.add(between(p2, new THREE.Vector3(0.42, 1.1, 0.0), 0.007, mat));
    // corpo do microfone dinâmico, apontado para quem está na cadeira
    const body = cyl(0.03, 0.028, 0.15, std(0x1e1a24, { metalness: 0.55, roughness: 0.35 }), 24); body.rotation.x = Math.PI / 2 - 0.25; body.position.set(0.42, 1.06, 0.06); g.add(body);
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.038, 18, 14), std(0x0a080d, { roughness: 1 })); foam.scale.set(1, 1, 1.25); foam.position.set(0.42, 1.04, 0.14); g.add(foam);
    const ledbar = box(0.03, 0.004, 0.004, neon(PINK, 1)); ledbar.position.set(0.42, 1.093, 0.06); g.add(ledbar);
    reg("microfone", g, new THREE.Vector3(0.42, 1.08, 0.08), [0.75, 0.15, 1]);
  }
  // RØDECaster Duo
  {
    const g = new THREE.Group(); g.position.set(0.66, DESK_Y, 0.2); g.rotation.y = -0.2;
    const body = box(0.24, 0.045, 0.18, std(0x101014, { roughness: 0.4 }), 0.01); body.position.y = 0.022; g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshBasicMaterial({ map: canvasTex(256, 186, drawMixer) }));
    face.rotation.x = -Math.PI / 2; face.position.y = 0.0455; g.add(face);
    face.material.userData.base = new THREE.Color(1, 1, 1); face.material.userData.k = 0.95; neonMats.push(face.material);
    [0.035, 0.083].forEach((x) => { const k = cyl(0.02, 0.022, 0.025, std(0x26232c, { metalness: 0.6, roughness: 0.3 })); k.position.set(x, 0.06, 0); g.add(k); });
    reg("rodecaster", g, new THREE.Vector3(0.66, 0.84, 0.2), [0.35, 0.85, 0.8]);
  }
  // Stream Deck
  {
    const g = new THREE.Group(); g.position.set(-0.56, DESK_Y, 0.2); g.rotation.y = 0.15;
    const stand = box(0.13, 0.02, 0.08, std(0x0b0710)); stand.position.y = 0.01; g.add(stand);
    const deck = new THREE.Group(); deck.position.set(0, 0.04, -0.005); deck.rotation.x = -0.75;
    const shell = box(0.12, 0.08, 0.02, std(0x15101f), 0.006); deck.add(shell);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.065), new THREE.MeshBasicMaterial({ map: canvasTex(320, 200, drawDeck) })); keys.position.z = 0.0105; deck.add(keys);
    keys.material.userData.base = new THREE.Color(1, 1, 1); keys.material.userData.k = 0.95; neonMats.push(keys.material);
    g.add(deck);
    reg("streamdeck", g, new THREE.Vector3(-0.56, 0.84, 0.2), [-0.1, 0.7, 1]);
  }
  // Astro A50 na base station
  {
    const g = new THREE.Group(); g.position.set(-0.98, DESK_Y, 0.25); g.rotation.y = 0.5; const mat = std(0x15101f, { roughness: 0.4 });
    const dock = box(0.16, 0.05, 0.1, std(0x0d0b12, { roughness: 0.35 }), 0.02); dock.position.y = 0.025; g.add(dock);
    const dockLed = box(0.1, 0.005, 0.004, neon(TEAL, 1)); dockLed.position.set(0, 0.03, 0.051); g.add(dockLed);
    const post = box(0.03, 0.12, 0.03, mat, 0.008); post.position.set(0, 0.1, -0.01); g.add(post);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.013, 10, 28, Math.PI), std(0x2a2433)); band.position.y = 0.25; band.castShadow = true; g.add(band);
    [-1, 1].forEach((s) => {
      const cup = box(0.04, 0.09, 0.075, mat, 0.02); cup.position.set(s * 0.09, 0.19, 0); g.add(cup);
      const ring = box(0.004, 0.06, 0.05, neon(PINK, 0.9)); ring.position.set(s * 0.112, 0.19, 0); g.add(ring);
    });
    reg("headset", g, new THREE.Vector3(-0.98, 1.0, 0.25), [0.3, 0.35, 1]);
  }
  // PS5 deitado no canto direito da mesa, com o controle em cima
  {
    const g = new THREE.Group(); g.position.set(1.04, DESK_Y, 0.24); g.rotation.y = -0.35;
    const core = box(0.36, 0.07, 0.22, std(0x15101f), 0.01); core.position.y = 0.05; g.add(core);
    [-1, 1].forEach((s) => { const pnl = box(0.38, 0.02, 0.24, std(0xf2eef8, { roughness: 0.3 }), 0.01); pnl.position.set(0, 0.05 + s * 0.045, 0); g.add(pnl); });
    const strip = box(0.34, 0.004, 0.004, neon(TEAL, 1)); strip.position.set(0, 0.05, 0.111); g.add(strip);
    const feet = box(0.3, 0.012, 0.16, std(0x0b0710)); feet.position.y = 0.006; g.add(feet);
    const pad = new THREE.Group(); pad.position.set(0.02, 0.118, 0.0); pad.rotation.set(0, 0.5, 0);
    const pb = box(0.12, 0.03, 0.06, std(0xf2eef8), 0.015); pad.add(pb);
    [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), std(0xf2eef8)); h.scale.set(1, 0.6, 1.2); h.position.set(s * 0.055, -0.004, 0.02); pad.add(h); });
    const lb = box(0.04, 0.004, 0.004, neon(TEAL, 1)); lb.position.set(0, 0.016, -0.02); pad.add(lb);
    g.add(pad);
    reg("console", g, new THREE.Vector3(1.04, 0.9, 0.24), [0.6, 0.6, 1]);
  }
  // Cadeira gamer (decoração)
  {
    const g = new THREE.Group(); g.position.set(0.05, 0, 1.0); g.rotation.y = -0.35;
    const dark = std(0x1a1026, { roughness: 0.6 }), accent = std(PINK, { roughness: 0.5 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(between(new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3), 0.02, dark));
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), dark); w.position.set(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3); g.add(w); }
    const pole = cyl(0.025, 0.025, 0.36, std(0x333044, { metalness: 0.8 })); pole.position.y = 0.25; g.add(pole);
    const seat = box(0.52, 0.09, 0.5, dark, 0.04); seat.position.y = 0.47; g.add(seat);
    const backr = box(0.5, 0.78, 0.09, dark, 0.04); backr.position.set(0, 0.92, 0.24); backr.rotation.x = 0.12; g.add(backr);
    [-1, 1].forEach((s) => {
      const st = box(0.06, 0.7, 0.095, accent, 0.02); st.position.set(s * 0.16, 0.93, 0.245); st.rotation.x = 0.12; g.add(st);
      const arm = box(0.06, 0.03, 0.3, dark, 0.01); arm.position.set(s * 0.29, 0.66, 0.02); g.add(arm);
      g.add(between(new THREE.Vector3(s * 0.29, 0.5, 0.05), new THREE.Vector3(s * 0.29, 0.65, 0.05), 0.012, dark));
    });
    const pillow = box(0.3, 0.12, 0.08, accent, 0.04); pillow.position.set(0, 1.18, 0.2); pillow.rotation.x = 0.12; g.add(pillow);
    scene.add(g);
  }
  return { items, screenTex, fans };
}

/* ---------------- app ---------------- */
export async function initSetup3D(root) {
  const stage = root.querySelector(".s3-stage");
  const holder = root.querySelector(".s3-canvas");
  const pinsEl = root.querySelector(".s3-pins");
  const panel = root.querySelector(".s3-panel");
  const chipsEl = root.querySelector(".s3-chips");
  const loading = root.querySelector(".s3-loading");
  const liveBtn = document.getElementById("s3Live");
  const resetBtn = document.getElementById("s3Reset");

  let data = { items: [] };
  try { data = await fetch("/data/setup.json", { cache: "no-cache" }).then((r) => r.json()); } catch (e) { /* segue com nomes padrão */ }
  const info = Object.fromEntries((data.items || []).map((i) => [i.id, i]));
  try { await document.fonts.ready; } catch (e) {}

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { loading.textContent = "Seu navegador não suporta 3D. Veja a lista abaixo."; renderFallback(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0612);
  scene.fog = new THREE.Fog(0x0a0612, 5, 10);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
  const HOME = { pos: new THREE.Vector3(2.9, 2.05, 3.3), target: new THREE.Vector3(-0.05, 0.8, -0.05) };
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 0.45; controls.maxDistance = 5.5;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minAzimuthAngle = -0.35; controls.maxAzimuthAngle = 1.45;
  controls.enablePan = false;
  controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.5;

  // Luzes
  const hemi = new THREE.HemisphereLight(0xffc2e0, 0x1a0f2e, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2b0, 1.4); sun.position.set(2.5, 3.5, 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 10 }); scene.add(sun);
  const pinkL = new THREE.PointLight(PINK, 2.2, 4, 1.6); pinkL.position.set(0, 1.4, -0.6); scene.add(pinkL);
  const tealL = new THREE.PointLight(TEAL, 1.6, 4, 1.6); tealL.position.set(-1.2, 1.6, -0.2); scene.add(tealL);
  const pcL = new THREE.PointLight(PINK, 1.2, 1.6, 2); pcL.position.set(1.75, 0.45, 0.35); scene.add(pcL);

  const { items, screenTex, fans } = buildScene(scene);
  const ids = Object.keys(items);
  const order = (data.items || []).map((i) => i.id).filter((id) => items[id]).concat(ids.filter((id) => !info[id]));
  const meta = (id) => ({ nome: id, categoria: "pc", ...info[id] });
  const softEl = root.querySelector(".s3-soft");
  if (softEl && Array.isArray(data.softwares) && data.softwares.length)
    softEl.innerHTML = `<span>No PC rodam:</span>` + data.softwares.map((n) => `<b>${esc(n)}</b>`).join("");

  // Contorno de destaque (hover/seleção)
  const outlineMat = new THREE.MeshBasicMaterial({ color: PINK, side: THREE.BackSide, transparent: true, opacity: 0.95, depthWrite: false });
  for (const id of ids) {
    const outs = [];
    items[id].group.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { const m = new THREE.Mesh(o.geometry, outlineMat); m.userData.isOutline = true; m.scale.setScalar(1.06); m.visible = false; m.raycast = () => {}; o.add(m); outs.push(m); } });
    items[id].outlines = outs;
    const sph = new THREE.Box3().setFromObject(items[id].group).getBoundingSphere(new THREE.Sphere());
    items[id].radius = sph.radius;
  }
  const showOutline = (id, on) => id && items[id] && items[id].outlines.forEach((m) => (m.visible = on));

  // Pinos (HTML)
  const pins = {};
  order.forEach((id, n) => {
    const b = document.createElement("button");
    b.className = "s3-pin"; b.type = "button"; b.dataset.id = id;
    b.innerHTML = `<span class="n">${n + 1}</span><span class="lbl">${esc(meta(id).nome)}</span>`;
    b.setAttribute("aria-label", `Ver ${meta(id).nome}`);
    b.addEventListener("click", (e) => { e.stopPropagation(); select(id); });
    b.addEventListener("mouseenter", () => setHover(id)); b.addEventListener("mouseleave", () => setHover(null));
    pinsEl.appendChild(b); pins[id] = b;
  });

  // Categorias
  const usedCats = [...new Set(order.map((id) => meta(id).categoria))].filter((c) => CATS[c]);
  let filter = "todos";
  chipsEl.innerHTML = `<button type="button" data-c="todos" aria-pressed="true">Tudo</button>` + usedCats.map((c) => `<button type="button" data-c="${c}" aria-pressed="false">${CATS[c]}</button>`).join("");
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.c;
    chipsEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    closePanel(false);
    if (filter === "todos") { flyTo(HOME.pos, HOME.target); return; }
    const sel = order.filter((id) => meta(id).categoria === filter);
    const box3 = new THREE.Box3(); sel.forEach((id) => box3.expandByObject(items[id].group));
    const c = box3.getCenter(new THREE.Vector3()), r = box3.getBoundingSphere(new THREE.Sphere()).radius;
    flyTo(c.clone().add(new THREE.Vector3(0.55, 0.35, 1).normalize().multiplyScalar(Math.max(1.1, r * 3))), c);
    sel.forEach((id) => { showOutline(id, true); setTimeout(() => { if (id !== selected && id !== hovered) showOutline(id, false); }, 1400); });
  });
  const visibleIds = () => order.filter((id) => filter === "todos" || meta(id).categoria === filter);

  // Voo da câmera
  let fly = null;
  function flyTo(pos, target, dur = reduceMotion ? 0 : 1100) {
    controls.autoRotate = false;
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: performance.now(), dur };
  }
  controls.addEventListener("start", () => { fly = null; controls.autoRotate = false; stage.classList.add("touched"); });

  // Seleção / painel
  let selected = null, hovered = null;
  function setHover(id) {
    if (hovered && hovered !== selected) showOutline(hovered, false);
    hovered = id; if (id) showOutline(id, true);
    renderer.domElement.style.cursor = id ? "pointer" : "grab";
    Object.entries(pins).forEach(([k, p]) => p.classList.toggle("hover", k === id));
  }
  function select(id) {
    if (selected && selected !== id) showOutline(selected, false);
    selected = id; showOutline(id, true);
    const it = items[id], d = new THREE.Vector3(...it.viewDir).normalize();
    flyTo(it.anchor.clone().add(d.multiplyScalar(Math.max(0.55, it.radius * 3.2))), it.anchor);
    Object.entries(pins).forEach(([k, p]) => p.classList.toggle("active", k === id));
    renderPanel(id);
  }
  function closePanel(goHome = true) {
    if (selected) showOutline(selected, false);
    selected = null; panel.hidden = true; stage.classList.remove("has-panel");
    Object.values(pins).forEach((p) => p.classList.remove("active"));
    if (goHome) flyTo(HOME.pos, HOME.target);
  }
  function renderPanel(id) {
    const m = meta(id), list = visibleIds(), i = list.indexOf(id);
    const specs = (m.specs || []).filter((s) => s && s.label);
    const attrs = m.atributos && typeof m.atributos === "object" ? Object.entries(m.atributos) : [];
    panel.innerHTML = `
      <button class="s3-x" type="button" aria-label="Fechar">✕</button>
      <span class="s3-cat">${esc(CATS[m.categoria] || "")}</span>
      <h3 class="display">${esc(m.nome)}</h3>
      <p class="s3-model ${m.modelo ? "" : "tbd"}">${m.modelo ? esc(m.modelo) : "Modelo a definir"}</p>
      ${m.descricao ? `<p class="s3-desc">${esc(m.descricao)}</p>` : ""}
      ${specs.length ? `<dl class="s3-specs">${specs.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.valor)}</dd></div>`).join("")}</dl>` : ""}
      ${attrs.length ? `<div class="s3-attrs">${attrs.map(([k, v]) => `<div><span>${esc(k)}</span><i style="--v:${Math.max(0, Math.min(10, +v)) * 10}%"></i></div>`).join("")}</div>` : ""}
      ${m.link ? `<a class="btn btn-primary btn-sm" href="${esc(m.link)}" target="_blank" rel="noopener sponsored">Ver produto ↗</a>` : ""}
      <div class="s3-nav">
        <button type="button" class="btn btn-sm" data-go="-1">‹ Anterior</button>
        <span>${i + 1} / ${list.length}</span>
        <button type="button" class="btn btn-sm" data-go="1">Próximo ›</button>
      </div>`;
    panel.hidden = false; stage.classList.add("has-panel");
    panel.querySelector(".s3-x").onclick = () => closePanel();
    panel.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => select(list[(i + +b.dataset.go + list.length) % list.length])));
  }
  resetBtn?.addEventListener("click", () => { filter = "todos"; chipsEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.c === "todos")); closePanel(); });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && selected) closePanel();
    if (selected && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { const l = visibleIds(); select(l[(l.indexOf(selected) + (e.key === "ArrowRight" ? 1 : -1) + l.length) % l.length]); }
  });

  // Modo live: apaga o quarto e acende o RGB
  let live = false, liveMix = 0;
  liveBtn?.addEventListener("click", () => {
    live = !live; liveBtn.setAttribute("aria-pressed", live); root.classList.toggle("is-live", live);
    screenTex.userData.redraw(live);
  });

  // Raycast (hover e clique)
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  const pickables = []; ids.forEach((id) => items[id].group.traverse((o) => { if (o.isMesh && !o.userData.isOutline) pickables.push(o); }));
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.itemId : null;
  }
  renderer.domElement.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse" && !down) setHover(pick(ev)); });
  renderer.domElement.addEventListener("pointerdown", (ev) => (down = { x: ev.clientX, y: ev.clientY }));
  renderer.domElement.addEventListener("pointerup", (ev) => {
    if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 6) { const id = pick(ev); if (id) select(id); else if (selected) closePanel(); }
    down = null;
  });

  // Tamanho
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < 600 ? 55 : 42; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(holder); resize();

  // Loop (só roda quando o setup está na tela)
  let visible = true, raf = 0;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(stage);
  const v = new THREE.Vector3(), clock = new THREE.Clock();
  function loop(now) {
    raf = 0; if (!visible) return;
    const t = clock.getElapsedTime();
    if (fly) {
      const k = fly.dur ? Math.min(1, (now - fly.start) / fly.dur) : 1, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (k >= 1) fly = null;
    }
    controls.update();
    // RGB animado
    liveMix += ((live ? 1 : 0) - liveMix) * 0.08;
    fans.forEach((f, i) => f.material.color.setHSL(((t * 0.08 + i * 0.12) % 1), 0.9, 0.6).multiplyScalar(1 + liveMix * 0.8));
    pcL.color.setHSL((t * 0.08) % 1, 0.9, 0.6);
    for (const m of neonMats) if (m.userData.base && !fans.some((f) => f.material === m)) m.color.copy(m.userData.base).multiplyScalar(m.userData.k * (1 + liveMix * 0.9));
    hemi.intensity = 0.75 - liveMix * 0.55; sun.intensity = 1.4 - liveMix * 1.15;
    pinkL.intensity = 2.2 + liveMix * 2.5; tealL.intensity = 1.6 + liveMix * 1.8; pcL.intensity = 1.2 + liveMix * 1.5;
    // posiciona os pinos
    const r = holder.getBoundingClientRect(), vis = new Set(visibleIds());
    for (const id of order) {
      const p = pins[id]; v.copy(items[id].anchor).project(camera);
      const show = v.z < 1 && vis.has(id) && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      p.style.display = show ? "" : "none";
      if (show) p.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px)`;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  loading.remove();
  stage.classList.add("ready");

  function renderFallback() {
    panel.hidden = false;
    panel.innerHTML = `<h3 class="display">Meu setup</h3>` + (data.items || []).map((m) => `<p><b>${esc(m.nome)}</b> — ${m.modelo ? esc(m.modelo) : "modelo a definir"}</p>`).join("");
  }
}
