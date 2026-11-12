// Рантайм интерактивной анатомии LPBF-установки (кит Anatomy, MIT).
// Модель цикла: дозирование → нанесение слоя → контроль слоя → сканирование → опускание платформы.
// Все движения — условная учебная визуализация, не физический расчёт.
import * as k from "../assets/anatomy/iso-kit.mjs";

const PHASES = [
  { id: "dose", t: 1.0, label: "Дозирование порошка", op: "O2" },
  { id: "recoat", t: 2.2, label: "Нанесение слоя рекотером", op: "O3" },
  { id: "inspect", t: 0.8, label: "Контроль качества слоя", op: "O4" },
  { id: "scan", t: 3.6, label: "Сканирование и сплавление", op: "O5" },
  { id: "return", t: 0.9, label: "Возврат рекотера", op: "O3" },
  { id: "lower", t: 0.8, label: "Опускание платформы", op: "O7" },
];
const CYCLE = PHASES.reduce((s, p) => s + p.t, 0);
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export async function mountAnatomy(host, { onSelect, onPhase, onHover } = {}) {
  const [svgText, model] = await Promise.all([
    fetch("assets/anatomy/lpbf.svg").then((r) => r.text()),
    fetch("assets/anatomy/lpbf-model.json").then((r) => r.json()),
  ]);
  const { P, M, W, H } = model;
  host.innerHTML = svgText;
  const svg = host.querySelector("svg");
  svg.insertAdjacentHTML("afterbegin", `<defs><radialGradient id="meltGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity="1"/><stop offset=".25" stop-color="#ffb347" stop-opacity=".9"/><stop offset=".6" stop-color="#ff6a1a" stop-opacity=".35"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/></radialGradient></defs>`);
  const q = (s) => svg.querySelector(s);
  const fig = host.closest(".fig");
  const pieces = [...svg.querySelectorAll(".piece")].map((el) => ({ el, sys: el.dataset.sys, ex: el.dataset.ex.split(",").map(Number), at: 0, v: 0, target: 0, delay: 0 }));
  const sysEls = [...svg.querySelectorAll("[data-sys]")];
  const els = {
    recoater: q('[data-move="recoater"]'), buildRod: q('[data-move="build-rod"]'), buildMark: q('[data-move="build-mark"]'),
    supplyRod: q('[data-move="supply-rod"]'), supplyMark: q('[data-move="supply-mark"]'), fresh: q('[data-id="fresh-layer"]'),
    track: q('[data-id="track"]'), beam: q('[data-id="beam"]'), spot: q('[data-id="spot"]'), glow: q('[data-id="spot-glow"]'),
    partTop: q('[data-id="part-top"]'), hmi: q('[data-id="hmi-text"] text'), ridge: q('[data-id="powder-ridge"]'),
  };
  const trackLen = els.track.getTotalLength();
  els.track.style.strokeDasharray = `${trackLen} ${trackLen}`;
  const lensPt = k.iso(M.lens, P);

  const st = { running: false, speed: 0.5, clock: 0, layer: 12, phase: -1, apart: false, sel: null, last: 0, frame: 0, viewBox: [0, 0, W, H], vbTarget: [0, 0, W, H], housing: true, forceScan: false };

  // ---------- выбор узла ----------
  function select(id, { silent } = {}) {
    st.sel = id || null;
    fig.classList.toggle("has-sel", !!st.sel);
    for (const el of sysEls) el.classList.toggle("is-sel", el.dataset.sys === st.sel);
    if (!silent && onSelect) onSelect(st.sel);
  }
  svg.addEventListener("click", (e) => {
    const el = e.target.closest("[data-sys]");
    if (el) select(el.dataset.sys === st.sel ? null : el.dataset.sys);
  });
  let hovered = null;
  svg.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-sys]");
    const id = el ? el.dataset.sys : null;
    if (id !== hovered) {
      sysEls.forEach((x) => x.classList.toggle("is-hover", x.dataset.sys === id));
      hovered = id;
    }
    onHover && onHover(id, e);
  });
  svg.addEventListener("pointerleave", (e) => { sysEls.forEach((x) => x.classList.remove("is-hover")); hovered = null; onHover && onHover(null, e); });

  // ---------- корпус ----------
  function setHousing(on) { st.housing = on; fig.classList.toggle("no-housing", !on); }

  // ---------- разборка ----------
  function setApart(on) {
    st.apart = on;
    const order = on ? pieces : [...pieces].reverse();
    order.forEach((p, i) => { p.target = on ? 1 : 0; p.delay = i * 0.035; });
    if (on) setHousing(false);
    st.vbTarget = on ? apartBox() : st.sel && st.focused ? st.vbTarget : [0, 0, W, H];
    kick();
  }

  function apartBox() {
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    for (const p of pieces) {
      const b = p.el.getBBox();
      if (!b.width && !b.height) continue;
      const [dx, dy] = k.axisVector(P, p.ex);
      x0 = Math.min(x0, b.x + dx); y0 = Math.min(y0, b.y + dy); x1 = Math.max(x1, b.x + b.width + dx); y1 = Math.max(y1, b.y + b.height + dy);
    }
    const pad = 24; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const ar = W / H;
    if (w / h > ar) { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
    return [x0, y0, w, h];
  }
  // ---------- камера (зум на узел) ----------
  function bboxOf(id) {
    const list = sysEls.filter((el) => el.dataset.sys === id && !el.classList.contains("cable"));
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of list) {
      const b = el.getBBox();
      const m = (el.getAttribute("transform") || "").match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      const dx = m ? +m[1] : 0, dy = m ? +m[2] : 0;
      x0 = Math.min(x0, b.x + dx); y0 = Math.min(y0, b.y + dy); x1 = Math.max(x1, b.x + b.width + dx); y1 = Math.max(y1, b.y + b.height + dy);
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function focus(id) {
    st.focused = !!id;
    if (!id) { st.vbTarget = st.apart ? apartBox() : [0, 0, W, H]; kick(); return; }
    const b = bboxOf(id);
    if (!b) return;
    const pad = 40, ar = W / H;
    let [x, y, w, h] = [b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2];
    if (w / h > ar) { const nh = w / ar; y -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
    const minW = W * 0.28;
    if (w < minW) { const s = minW / w; x -= (w * s - w) / 2; y -= (h * s - h) / 2; w *= s; h *= s; }
    st.vbTarget = [x, y, w, h];
    kick();
  }

  // ---------- модель процесса ----------
  const DZ = M.layerVisual;
  function phaseAt(c) {
    let t = c % CYCLE;
    for (let i = 0; i < PHASES.length; i++) { if (t < PHASES[i].t) return [i, t / PHASES[i].t]; t -= PHASES[i].t; }
    return [PHASES.length - 1, 1];
  }
  function freshSlab(x1) {
    const b = M.build;
    const w = Math.max(0, Math.min(b.w, x1 - b.x));
    if (w <= 0.2) return "";
    return k.solidSvg(k.slabOf({ x: b.x, y: b.y, w, d: b.d, r: 0.2 }, M.deck - 0.1, 0.2, P, 2), { tone: "lo", flat: true, crease: "none", className: "fresh" });
  }
  function drawProcess() {
    const [pi, f] = phaseAt(st.clock);
    const ph = PHASES[pi].id;
    const layer = st.layer + (Math.floor(st.clock / CYCLE));
    const shownLayer = ((layer - 1) % M.maxLayers) + 1;
    let rx = M.recoater.park, fresh = "", scan = 0, lowered = 0, dosed = 0;
    if (ph === "dose") { dosed = ease(f); fresh = ""; }
    else if (ph === "recoat") { dosed = 1; rx = M.recoater.park + (M.recoater.end - M.recoater.park) * ease(f); fresh = freshSlab(rx + 2); }
    else if (ph === "inspect") { dosed = 1; rx = M.recoater.end; fresh = freshSlab(999); }
    else if (ph === "scan") { dosed = 1; rx = M.recoater.end; fresh = freshSlab(999); scan = f; }
    else if (ph === "return") { dosed = 1; rx = M.recoater.end - (M.recoater.end - M.recoater.park) * ease(f); scan = 1; }
    else if (ph === "lower") { dosed = 1; scan = 1; lowered = ease(f); }
    if (st.forceScan) { scan = (st.clock % 3.6) / 3.6; fresh = freshSlab(999); rx = M.recoater.end; }
    els.recoater.setAttribute("transform", k.translateAlong(P, [rx, 0, 0]));
    els.ridge.style.opacity = ph === "recoat" ? 1 : 0;
    els.fresh.innerHTML = fresh;
    // штоки: платформа построения опускается, питатель поднимается
    const zb = -(shownLayer - 1 + lowered) * DZ;
    const zs = -M.maxLayers * DZ + (shownLayer - 1 + dosed) * DZ;
    els.buildRod.setAttribute("transform", k.translateAlong(P, [0, 0, zb]));
    els.buildMark.setAttribute("transform", k.translateAlong(P, [0, 0, zb]));
    els.supplyRod.setAttribute("transform", k.translateAlong(P, [0, 0, zs]));
    els.supplyMark.setAttribute("transform", k.translateAlong(P, [0, 0, zs]));
    // сканирование
    const scanning = scan > 0 && scan < 1 && (ph === "scan" || st.forceScan);
    els.partTop.style.opacity = ph === "recoat" || ph === "inspect" || (ph === "scan" && !st.forceScan) ? 0.15 : 0.92;
    els.track.style.opacity = scan > 0 && (ph === "scan" || st.forceScan) ? 1 : 0;
    els.track.style.strokeDashoffset = String(trackLen * (1 - scan));
    if (scanning) {
      const p = els.track.getPointAtLength(trackLen * scan);
      els.beam.setAttribute("d", `M${lensPt[0].toFixed(1)} ${lensPt[1].toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      els.beam.style.opacity = 0.9;
      const flick = 1 + Math.sin(st.clock * 90) * 0.12;
      els.spot.setAttribute("cx", p.x); els.spot.setAttribute("cy", p.y); els.spot.setAttribute("r", 1.3);
      els.glow.setAttribute("cx", p.x); els.glow.setAttribute("cy", p.y); els.glow.setAttribute("r", 9 * flick);
    } else {
      els.beam.style.opacity = 0; els.spot.setAttribute("r", 0); els.glow.setAttribute("r", 0);
    }
    if (els.hmi) els.hmi.textContent = `СЛОЙ ${String(shownLayer).padStart(3, "0")} · ${PHASES[pi].id.toUpperCase()}`;
    if (pi !== st.phase) { st.phase = pi; onPhase && onPhase(PHASES[pi], shownLayer, pi); }
    return { phase: PHASES[pi], layer: shownLayer };
  }

  // ---------- цикл кадров ----------
  function tick(now) {
    const dt = st.last ? Math.min((now - st.last) / 1000, 1 / 20) : 1 / 60;
    st.last = now;
    let busy = false;
    if (st.running) { st.clock += dt * st.speed; busy = true; }
    // пружины разборки (с задержкой по порядку)
    for (const p of pieces) {
      if (p.delay > 0) { p.delay -= dt; busy = true; continue; }
      const stiff = 64, drag = 14.2;
      for (let i = 0; i < 4; i++) { p.v += ((p.target - p.at) * stiff - p.v * drag) * dt / 4; p.at += p.v * dt / 4; }
      if (Math.abs(p.target - p.at) < 0.0005 && Math.abs(p.v) < 0.0005) { p.at = p.target; p.v = 0; } else busy = true;
      p.el.setAttribute("transform", p.at ? k.translateAlong(P, p.ex.map((v) => v * p.at)) : "");
    }
    // камера
    const vb = st.viewBox;
    let moved = false;
    for (let i = 0; i < 4; i++) { const d = st.vbTarget[i] - vb[i]; if (Math.abs(d) > 0.05) { vb[i] += d * (1 - Math.exp(-dt / 0.18)); moved = true; } else vb[i] = st.vbTarget[i]; }
    if (moved) { svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" ")); busy = true; }
    const info = drawProcess();
    tickListeners.forEach((fn) => fn(info));
    st.frame = busy ? requestAnimationFrame(tick) : 0;
  }
  const tickListeners = [];
  function kick() { if (!st.frame) { st.last = 0; st.frame = requestAnimationFrame(tick); } }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  drawProcess();

  return {
    phases: PHASES,
    state: st,
    select, focus, setHousing, setApart,
    play(on = !st.running) { st.running = on && !reduce.matches; fig.classList.toggle("running", st.running); kick(); return st.running; },
    setSpeed(v) { st.speed = v; },
    setForceScan(on) { st.forceScan = on; if (on && !st.running) this.play(true); kick(); },
    reset() { st.clock = 0; st.layer = 12; select(null); focus(null); setApart(false); setHousing(true); st.forceScan = false; kick(); },
    onTick(fn) { tickListeners.push(fn); },
    bboxOf,
  };
}
