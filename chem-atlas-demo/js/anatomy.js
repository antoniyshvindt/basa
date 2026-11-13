// Рантайм интерактивной схемы опытно-промышленной линии катализатора Циглера–Натта (кит Anatomy, MIT).
// Цикл: синтез носителя → титанирование → отмывка → рекуперация → предполимеризация → полимеризация → контроль.
// Анимация условная (последовательность стадий), не моделирование кинетики.
import * as k from "../assets/anatomy/iso-kit.mjs";

export const PHASES = [
  { id: "support", t: 2.2, label: "Синтез сферического носителя MgCl₂·nEtOH", sys: ["S01", "S07"], ph: "1", agit: ["R1"] },
  { id: "titan", t: 2.6, label: "Титанирование TiCl₄ и введение внутреннего донора", sys: ["S02", "S03", "S08"], ph: "2", agit: ["R2"] },
  { id: "wash", t: 2.0, label: "Отмывка гептаном, фильтрация и сушка", sys: ["S08", "S07"], ph: "3", agit: ["F1"] },
  { id: "recover", t: 1.8, label: "Рекуперация TiCl₄ и растворителей", sys: ["S09"], ph: "4", agit: [] },
  { id: "prepoly", t: 1.8, label: "Предполимеризация и фасовка в инертной среде", sys: ["S10"], ph: "5", agit: ["R3"] },
  { id: "poly", t: 2.6, label: "Полимеризация пропилена с ТЭА и внешним донором", sys: ["S11", "S05", "S04"], ph: "6", agit: [] },
  { id: "qc", t: 1.6, label: "Контроль качества катализатора и полимера", sys: ["S12"], ph: "7", agit: [] },
];
const CYCLE = PHASES.reduce((s, p) => s + p.t, 0);

export async function mountAnatomy(host, { onSelect, onPhase, onHover } = {}) {
  const [svgText, model] = await Promise.all([
    fetch("assets/anatomy/plant.svg").then((r) => r.text()),
    fetch("assets/anatomy/plant-model.json").then((r) => r.json()),
  ]);
  const { P, W, H } = model;
  host.innerHTML = svgText;
  const svg = host.querySelector("svg");
  const fig = host.closest(".fig");
  const pieces = [...svg.querySelectorAll(".piece")].map((el) => ({ el, sys: el.dataset.sys, ex: el.dataset.ex.split(",").map(Number), at: 0, v: 0, target: 0, delay: 0 }));
  const sysEls = [...svg.querySelectorAll("[data-sys]")];
  const pipes = [...svg.querySelectorAll(".pipe")];
  const agits = [...svg.querySelectorAll("[data-agit]")];
  const st = { running: false, speed: 0.5, clock: 0, batch: 1, phase: -1, apart: false, sel: null, last: 0, frame: 0, viewBox: [0, 0, W, H], vbTarget: [0, 0, W, H], housing: true, forceScan: false, focused: false };

  function select(id, { silent } = {}) {
    st.sel = id || null;
    fig.classList.toggle("has-sel", !!st.sel);
    for (const el of sysEls) el.classList.toggle("is-sel", el.dataset.sys === st.sel);
    if (!silent && onSelect) onSelect(st.sel);
  }
  svg.addEventListener("click", (e) => { const el = e.target.closest("[data-sys]"); if (el) select(el.dataset.sys === st.sel ? null : el.dataset.sys); });
  let hovered = null;
  svg.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-sys]"); const id = el ? el.dataset.sys : null;
    if (id !== hovered) { sysEls.forEach((x) => x.classList.toggle("is-hover", x.dataset.sys === id)); hovered = id; }
    onHover && onHover(id, e);
  });
  svg.addEventListener("pointerleave", (e) => { sysEls.forEach((x) => x.classList.remove("is-hover")); hovered = null; onHover && onHover(null, e); });

  function setHousing(on) { st.housing = on; fig.classList.toggle("no-housing", !on); }
  function apartBox() {
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    for (const p of pieces) { const b = p.el.getBBox(); if (!b.width && !b.height) continue; const [dx, dy] = k.axisVector(P, p.ex); x0 = Math.min(x0, b.x + dx); y0 = Math.min(y0, b.y + dy); x1 = Math.max(x1, b.x + b.width + dx); y1 = Math.max(y1, b.y + b.height + dy); }
    const pad = 20; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const ar = W / H;
    if (w / h > ar) { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
    return [x0, y0, w, h];
  }
  function setApart(on) {
    st.apart = on;
    (on ? pieces : [...pieces].reverse()).forEach((p, i) => { p.target = on ? 1 : 0; p.delay = i * 0.04; });
    if (on) setHousing(false);
    st.vbTarget = on ? apartBox() : st.sel && st.focused ? st.vbTarget : [0, 0, W, H];
    kick();
  }
  function bboxOf(id) {
    const list = sysEls.filter((el) => el.dataset.sys === id);
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of list) {
      const b = el.getBBox(); const m = (el.getAttribute("transform") || "").match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      const dx = m ? +m[1] : 0, dy = m ? +m[2] : 0;
      x0 = Math.min(x0, b.x + dx); y0 = Math.min(y0, b.y + dy); x1 = Math.max(x1, b.x + b.width + dx); y1 = Math.max(y1, b.y + b.height + dy);
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function focus(id) {
    st.focused = !!id;
    if (!id) { st.vbTarget = st.apart ? apartBox() : [0, 0, W, H]; kick(); return; }
    const b = bboxOf(id); if (!b) return;
    const pad = 40, ar = W / H;
    let [x, y, w, h] = [b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2];
    if (w / h > ar) { const nh = w / ar; y -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
    const minW = W * 0.3; if (w < minW) { const s = minW / w; x -= (w * s - w) / 2; y -= (h * s - h) / 2; w *= s; h *= s; }
    st.vbTarget = [x, y, w, h]; kick();
  }

  function phaseAt(c) { let t = c % CYCLE; for (let i = 0; i < PHASES.length; i++) { if (t < PHASES[i].t) return [i, t / PHASES[i].t]; t -= PHASES[i].t; } return [PHASES.length - 1, 1]; }
  function drawProcess() {
    const [pi] = phaseAt(st.clock);
    const ph = PHASES[pi];
    const active = st.running || st.clock > 0;
    for (const p of pieces) p.el.classList.toggle("on", active && ph.sys.includes(p.sys));
    for (const el of pipes) el.classList.toggle("on", active && el.dataset.ph === ph.ph);
    for (const el of agits) {
      const a = model.agit[el.dataset.agit]; if (!a) continue;
      const spin = active && ph.agit.includes(el.dataset.agit);
      const ang = spin ? st.clock * 6 : 0.6;
      const [cx, cy, z, r] = a;
      el.setAttribute("d", k.lineOnTop([cx - Math.cos(ang) * r, cy - Math.sin(ang) * r], [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r], z + 0.2, P));
      el.style.opacity = spin ? 1 : 0.35;
    }
    const batch = st.batch + Math.floor(st.clock / CYCLE);
    if (pi !== st.phase) { st.phase = pi; onPhase && onPhase(ph, batch, pi); }
    return { phase: ph, layer: batch };
  }
  const tickListeners = [];
  function tick(now) {
    const dt = st.last ? Math.min((now - st.last) / 1000, 1 / 20) : 1 / 60; st.last = now;
    let busy = false;
    if (st.running) { st.clock += dt * st.speed; busy = true; }
    for (const p of pieces) {
      if (p.delay > 0) { p.delay -= dt; busy = true; continue; }
      for (let i = 0; i < 4; i++) { p.v += ((p.target - p.at) * 64 - p.v * 14.2) * dt / 4; p.at += p.v * dt / 4; }
      if (Math.abs(p.target - p.at) < 0.0005 && Math.abs(p.v) < 0.0005) { p.at = p.target; p.v = 0; } else busy = true;
      p.el.setAttribute("transform", p.at ? k.translateAlong(P, p.ex.map((v) => v * p.at)) : "");
    }
    const vb = st.viewBox; let moved = false;
    for (let i = 0; i < 4; i++) { const d = st.vbTarget[i] - vb[i]; if (Math.abs(d) > 0.05) { vb[i] += d * (1 - Math.exp(-dt / 0.18)); moved = true; } else vb[i] = st.vbTarget[i]; }
    if (moved) { svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" ")); busy = true; }
    const info = drawProcess(); tickListeners.forEach((fn) => fn(info));
    st.frame = busy ? requestAnimationFrame(tick) : 0;
  }
  function kick() { if (!st.frame) { st.last = 0; st.frame = requestAnimationFrame(tick); } }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  drawProcess();

  return {
    phases: PHASES, state: st, select, focus, setHousing, setApart, bboxOf,
    setRelated(ids) { const set = new Set(ids || []); for (const el of sysEls) el.classList.toggle("is-rel", set.has(el.dataset.sys)); },
    play(on = !st.running) { st.running = on && !reduce.matches; fig.classList.toggle("running", st.running); kick(); return st.running; },
    setSpeed(v) { st.speed = v; },
    setForceScan(on) { st.forceScan = on; fig.classList.toggle("show-particle", on); if (on && !st.running) this.play(true); kick(); },
    reset() { st.clock = 0; st.batch = 1; select(null); focus(null); setApart(false); setHousing(true); st.forceScan = false; fig.classList.remove("show-particle"); kick(); },
    onTick(fn) { tickListeners.push(fn); },
  };
}
