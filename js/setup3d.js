// Setup 3D interativo do Tiojoao — Three.js
// Os objetos são modelados aqui com formas simples (estilo low-poly neon).
// Nomes, modelos e descrições vêm de data/setup.json (ligados pelo "id").
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const CATS = { pc: "PC & Monitores", audio: "Áudio", video: "Câmera & Luz", perif: "Periféricos", console: "Consoles" };
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

/* ---------------- construção da cena ---------------- */
function buildScene(scene) {
  const items = {};
  const reg = (id, group, anchor, viewDir) => { group.traverse((o) => { if (o.isMesh) o.userData.itemId = id; }); items[id] = { id, group, anchor, viewDir }; scene.add(group); };

  // Quarto
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), std(0xffffff, { map: (() => { const t = canvasTex(512, 512, drawGrid); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })(), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = std(0xffffff, { map: canvasTex(64, 256, drawWall), roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat); back.position.set(0, 1.5, -0.95); back.receiveShadow = true; scene.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), wallMat); side.position.set(-1.75, 1.5, 1.05); side.rotation.y = Math.PI / 2; side.receiveShadow = true; scene.add(side);
  // fita de LED e decoração
  const led = box(3.4, 0.025, 0.025, neon(PINK, 1)); led.position.set(0, 2.15, -0.93); scene.add(led);
  const led2 = box(0.025, 0.025, 3.6, neon(TEAL, 1)); led2.position.set(-1.73, 2.15, 0.85); scene.add(led2);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), new THREE.MeshBasicMaterial({ map: canvasTex(512, 288, (x, w, h) => drawSunset(x, w, h, false)) }));
  poster.position.set(0.95, 1.75, -0.94); scene.add(poster);
  const pf = box(1.16, 0.68, 0.02, std(0x0b0710)); pf.position.set(0.95, 1.75, -0.955); scene.add(pf);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.26), new THREE.MeshBasicMaterial({ map: canvasTex(512, 160, drawSign), transparent: true }));
  sign.position.set(-0.75, 1.85, -0.94); scene.add(sign);

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
  palm.position.set(1.45, 0, -0.55); scene.add(palm);

  // Mesa
  const desk = new THREE.Group();
  const top = box(2.0, 0.05, 0.85, std(0x1d1230, { roughness: 0.45 }), 0.012); top.position.y = 0.75; desk.add(top);
  [-0.95, 0.95].forEach((x) => { const leg = box(0.05, 0.725, 0.75, std(0x120a1c)); leg.position.set(x, 0.3625, 0); desk.add(leg); });
  const deskLed = box(1.9, 0.012, 0.012, neon(PINK, 1)); deskLed.position.set(0, 0.725, 0.42); desk.add(deskLed);
  const pad = box(1.0, 0.006, 0.42, std(0x2a1153, { roughness: 0.95 }), 0.003); pad.position.set(0.05, 0.778, 0.17); desk.add(pad);
  const padLed = box(1.02, 0.004, 0.44, neon(ORANGE, 0.8)); padLed.position.set(0.05, 0.776, 0.17); desk.add(padLed);
  scene.add(desk);

  // Monitor principal
  const screenTex = canvasTex(512, 288, (x, w, h, live) => drawSunset(x, w, h, live));
  {
    const g = new THREE.Group(); g.position.set(0, 0.775, -0.22);
    const base = box(0.26, 0.014, 0.18, std(0x120a1c), 0.006); base.position.y = 0.007; g.add(base);
    const neck = box(0.04, 0.32, 0.03, std(0x120a1c)); neck.position.set(0, 0.17, -0.04); g.add(neck);
    const frame = box(0.98, 0.57, 0.035, std(0x0b0710, { metalness: 0.4 }), 0.01); frame.position.y = 0.5; g.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.53), new THREE.MeshBasicMaterial({ map: screenTex })); scr.position.set(0, 0.5, 0.0185); g.add(scr);
    reg("monitor", g, new THREE.Vector3(0, 1.28, -0.2), [0.15, 0.1, 1]);
  }
  // Webcam (câmera) em cima do monitor
  {
    const g = new THREE.Group(); g.position.set(0, 1.565, -0.21);
    const body = box(0.11, 0.04, 0.045, std(0x15101f), 0.015); g.add(body);
    const lens = cyl(0.015, 0.015, 0.02, std(0x050308, { metalness: 0.8, roughness: 0.2 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.03; g.add(lens);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 24), neon(TEAL, 1)); ring.position.z = 0.041; g.add(ring);
    const clip = box(0.05, 0.03, 0.06, std(0x15101f)); clip.position.set(0, -0.03, -0.01); g.add(clip);
    reg("camera", g, new THREE.Vector3(0, 1.57, -0.19), [0.4, 0.15, 1]);
  }
  // Monitor secundário (chat)
  {
    const g = new THREE.Group(); g.position.set(0.8, 0.775, -0.12); g.rotation.y = -0.5;
    const base = box(0.2, 0.014, 0.15, std(0x120a1c), 0.006); base.position.y = 0.007; g.add(base);
    const neck = box(0.035, 0.26, 0.03, std(0x120a1c)); neck.position.set(0, 0.14, -0.03); g.add(neck);
    const frame = box(0.62, 0.38, 0.03, std(0x0b0710, { metalness: 0.4 }), 0.008); frame.position.y = 0.4; g.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.35), new THREE.MeshBasicMaterial({ map: canvasTex(384, 256, drawChat) })); scr.position.set(0, 0.4, 0.016); g.add(scr);
    reg("monitor2", g, new THREE.Vector3(0.8, 1.18, -0.1), [0.6, 0.12, 1]);
  }
  // PC gamer com RGB
  const fans = [];
  {
    const g = new THREE.Group(); g.position.set(-0.75, 0.775, -0.12);
    const body = box(0.24, 0.5, 0.46, std(0x0d0815, { metalness: 0.5, roughness: 0.35 }), 0.012); body.position.y = 0.25; g.add(body);
    const glass = box(0.005, 0.44, 0.4, new THREE.MeshPhysicalMaterial({ color: 0x8866aa, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0 })); glass.position.set(0.122, 0.25, 0); g.add(glass);
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 28), neon(PINK, 1)); f.position.set(0, 0.1 + i * 0.14, 0.232); g.add(f); fans.push(f);
    }
    const gpu = box(0.18, 0.04, 0.3, std(0x1a1026)); gpu.position.set(0.02, 0.2, -0.02); g.add(gpu);
    const gpuLed = box(0.005, 0.01, 0.26, neon(TEAL, 1)); gpuLed.position.set(0.112, 0.2, -0.02); g.add(gpuLed);
    reg("pc", g, new THREE.Vector3(-0.75, 1.05, 0.0), [0.8, 0.2, 1]);
  }
  // Teclado
  {
    const g = new THREE.Group(); g.position.set(-0.05, 0.783, 0.2);
    const base = box(0.45, 0.025, 0.15, std(0x120a1c), 0.006); g.add(base);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.13), new THREE.MeshBasicMaterial({ map: canvasTex(320, 96, drawKeys) }));
    keys.rotation.x = -Math.PI / 2; keys.position.y = 0.0135; g.add(keys); neonMats.push(keys.material); keys.material.userData.base = new THREE.Color(1, 1, 1); keys.material.userData.k = 0.9;
    reg("teclado", g, new THREE.Vector3(-0.05, 0.82, 0.2), [0.1, 0.9, 0.7]);
  }
  // Mouse
  {
    const g = new THREE.Group(); g.position.set(0.36, 0.79, 0.2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), std(0x120a1c, { roughness: 0.35 })); m.scale.set(0.06, 0.035, 0.1); m.castShadow = true; g.add(m);
    const stripe = box(0.006, 0.004, 0.05, neon(PINK, 1)); stripe.position.set(0, 0.017, -0.015); g.add(stripe);
    reg("mouse", g, new THREE.Vector3(0.36, 0.82, 0.2), [0.4, 0.9, 0.8]);
  }
  // Microfone com braço articulado
  {
    const g = new THREE.Group(); const mat = std(0x15101f, { metalness: 0.6, roughness: 0.3 });
    const p0 = new THREE.Vector3(0.48, 0.78, -0.38), p1 = new THREE.Vector3(0.48, 1.12, -0.3), p2 = new THREE.Vector3(0.36, 1.2, 0.02);
    const clamp = box(0.05, 0.06, 0.06, mat); clamp.position.copy(p0); g.add(clamp);
    g.add(between(p0, p1, 0.009, mat)); g.add(between(p1, p2, 0.009, mat));
    [p1, p2].forEach((p) => { const j = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), mat); j.position.copy(p); g.add(j); });
    const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.11, 6, 16), std(0x2a2433, { metalness: 0.5, roughness: 0.4 }));
    mic.position.set(0.36, 1.1, 0.04); mic.castShadow = true; g.add(mic);
    const grill = new THREE.Mesh(new THREE.CapsuleGeometry(0.031, 0.05, 6, 16), std(0x777080, { metalness: 0.9, roughness: 0.25, wireframe: true }));
    grill.position.set(0.36, 1.13, 0.04); g.add(grill);
    const mount = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.004, 8, 28), mat); mount.rotation.x = Math.PI / 2; mount.position.set(0.36, 1.1, 0.04); g.add(mount);
    const ledMic = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.003, 8, 28), neon(PINK, 1)); ledMic.rotation.x = Math.PI / 2; ledMic.position.set(0.36, 1.045, 0.04); g.add(ledMic);
    reg("microfone", g, new THREE.Vector3(0.36, 1.12, 0.04), [0.7, 0.1, 1]);
  }
  // Headset no suporte
  {
    const g = new THREE.Group(); g.position.set(-0.42, 0.775, -0.3); const mat = std(0x15101f, { roughness: 0.4 });
    const base = cyl(0.055, 0.06, 0.012, mat); base.position.y = 0.006; g.add(base);
    const pole = cyl(0.008, 0.008, 0.26, mat); pole.position.y = 0.13; g.add(pole);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 10, 28, Math.PI), std(0x2a1153)); band.position.y = 0.27; band.castShadow = true; g.add(band);
    [-1, 1].forEach((s) => {
      const cup = cyl(0.045, 0.045, 0.035, mat, 24); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.09, 0.22, 0); g.add(cup);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.004, 8, 28), neon(TEAL, 1)); ring.rotation.y = Math.PI / 2; ring.position.set(s * 0.108, 0.22, 0); g.add(ring);
    });
    reg("headset", g, new THREE.Vector3(-0.42, 1.0, -0.3), [0.5, 0.25, 1]);
  }
  // Ring light (iluminação)
  {
    const g = new THREE.Group(); g.position.set(-1.3, 0, -0.45); const mat = std(0x15101f, { metalness: 0.5 });
    [0, 1, 2].forEach((i) => { const a = (i / 3) * Math.PI * 2; g.add(between(new THREE.Vector3(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22), new THREE.Vector3(0, 0.35, 0), 0.008, mat)); });
    g.add(between(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1.45, 0), 0.012, mat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 12, 48), neon(0xfff1f7, 1.2)); ring.position.y = 1.62; ring.rotation.y = 0.9; g.add(ring);
    const holder = box(0.05, 0.05, 0.05, mat); holder.position.y = 1.45; g.add(holder);
    reg("luz", g, new THREE.Vector3(-1.3, 1.62, -0.45), [0.9, 0.05, 1]);
  }
  // Cadeira gamer
  {
    const g = new THREE.Group(); g.position.set(0.05, 0, 0.95); g.rotation.y = -0.35;
    const dark = std(0x1a1026, { roughness: 0.6 }), accent = std(PINK, { roughness: 0.5 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(between(new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3), 0.02, dark));
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), dark); w.position.set(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3); g.add(w); }
    const pole = cyl(0.025, 0.025, 0.36, std(0x333044, { metalness: 0.8 })); pole.position.y = 0.25; g.add(pole);
    const seat = box(0.52, 0.09, 0.5, dark, 0.04); seat.position.y = 0.47; g.add(seat);
    const back = box(0.5, 0.78, 0.09, dark, 0.04); back.position.set(0, 0.92, 0.24); back.rotation.x = 0.12; g.add(back);
    [-1, 1].forEach((s) => {
      const st = box(0.06, 0.7, 0.095, accent, 0.02); st.position.set(s * 0.16, 0.93, 0.245); st.rotation.x = 0.12; g.add(st);
      const arm = box(0.06, 0.03, 0.3, dark, 0.01); arm.position.set(s * 0.29, 0.66, 0.02); g.add(arm);
      g.add(between(new THREE.Vector3(s * 0.29, 0.5, 0.05), new THREE.Vector3(s * 0.29, 0.65, 0.05), 0.012, dark));
    });
    const pillow = box(0.3, 0.12, 0.08, accent, 0.04); pillow.position.set(0, 1.18, 0.2); pillow.rotation.x = 0.12; g.add(pillow);
    reg("cadeira", g, new THREE.Vector3(0.05, 0.9, 1.0), [0.7, 0.35, 1]);
  }
  // Console + controle
  {
    const g = new THREE.Group(); g.position.set(0.8, 0.778, 0.22); g.rotation.y = -0.3;
    const body = box(0.28, 0.06, 0.2, std(0xf2eef8, { roughness: 0.3 }), 0.02); body.position.y = 0.03; g.add(body);
    const core = box(0.282, 0.02, 0.12, std(0x15101f)); core.position.y = 0.03; g.add(core);
    const strip = box(0.25, 0.004, 0.004, neon(TEAL, 1)); strip.position.set(0, 0.03, 0.101); g.add(strip);
    const pad = new THREE.Group(); pad.position.set(-0.24, 0.02, 0.05); pad.rotation.y = 0.4;
    const pb = box(0.12, 0.03, 0.06, std(0x15101f), 0.015); pad.add(pb);
    [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), std(0x15101f)); h.scale.set(1, 0.6, 1.2); h.position.set(s * 0.055, -0.004, 0.02); pad.add(h); });
    const lb = box(0.04, 0.004, 0.004, neon(PINK, 1)); lb.position.set(0, 0.016, -0.02); pad.add(lb);
    g.add(pad);
    reg("console", g, new THREE.Vector3(0.7, 0.86, 0.24), [0.5, 0.7, 1]);
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
  try { data = await fetch("data/setup.json", { cache: "no-cache" }).then((r) => r.json()); } catch (e) { /* segue com nomes padrão */ }
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
  const HOME = { pos: new THREE.Vector3(2.5, 1.9, 2.9), target: new THREE.Vector3(-0.05, 0.95, -0.1) };
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
  const pcL = new THREE.PointLight(PINK, 1.2, 1.6, 2); pcL.position.set(-0.6, 1.05, 0.2); scene.add(pcL);

  const { items, screenTex, fans } = buildScene(scene);
  const ids = Object.keys(items);
  const order = (data.items || []).map((i) => i.id).filter((id) => items[id]).concat(ids.filter((id) => !info[id]));
  const meta = (id) => ({ nome: id, categoria: "pc", ...info[id] });

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
