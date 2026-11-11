// Сборка изометрической фигуры LPBF-установки на ките Anatomy (MIT, github.com/wheresryan22/anatomy).
// Типовая инженерная модель, не геометрия конкретной коммерческой установки.
// Мировые единицы: 1 ед. ≈ 5 мм. x — ширина, y — глубина (фронт оператора при y = 180), z — высота.
// Запуск: node tools/build-anatomy.mjs  → assets/anatomy/lpbf.svg + assets/anatomy/lpbf-model.json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../assets/anatomy/iso-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 900, H = 720;

// ---------- модель (единые константы для геометрии и анимации) ----------
const M = {
  deck: 140,               // верх рабочего стола (уровень порошкового слоя)
  supply: { x: 100, y: 60, w: 36, d: 60 },   // колодец дозирующего питателя
  build: { x: 146, y: 60, w: 60, d: 60 },    // колодец платформы построения (300×300 мм)
  overflow: { x: 216, y: 60, w: 24, d: 60 }, // бункер избытка порошка
  rails: [44, 130],        // y направляющих рекотера
  recoater: { park: 94, end: 246 },
  lens: [179, 90, 284],    // выход f-theta объектива
  layerVisual: 0.5,        // визуальный шаг опускания платформы, ед. (условно; реальный слой 20–60 мкм)
  layerReal: 40,           // мкм — типовая толщина слоя для демонстрации
  maxLayers: 60,
};
const PART = { cx: 176, cy: 90, half: 15, hole: 6 }; // сечение детали: квадрат 30×30 ед. с отверстием

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: 262, d: 186 }, -6, 300), [176, 120, 340], [40, 90, 372]],
  W, H, { pad: 34, azimuth: 45 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const slab = (plan, z, h, tone = "mid", extra = {}) => S(k.slabOf({ r: 1, ...plan }, z, h, P, 4, extra.bevel ?? 0.5), { tone, ...extra });
const cyl = (cx, cy, r, z, h, tone = "mid", extra = {}) => S(k.cylinder(cx, cy, r, z, h, P, extra.steps ?? 28, extra.bevel ?? 0), { tone, ...extra });
const screws = (plan, z, inset = 3) => D(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.45 });
const seg = (a, b, tone = "lo", extra = {}) => L(k.segment(a, b, P), { tone, ...extra });
const piece = (sys, ex, body, extra = "") => `<g class="piece" data-sys="${sys}" data-ex="${ex.join(",")}"${extra}>${body}</g>`;
const vents = (x0, x1, y, z0, z1, step, tone = "lo") => {
  // вентиляционные прорези на грани +y: закрытые щели
  let out = "";
  for (let z = z0; z <= z1; z += step) out += L(k.pathOf([at([x0, y, z]), at([x1, y, z]), at([x1, y, z + 1.2]), at([x0, y, z + 1.2])], true), { tone });
  return out;
};
const ventsX = (x, y0, y1, z0, z1, step, tone = "lo") => {
  let out = "";
  for (let z = z0; z <= z1; z += step) out += L(k.pathOf([at([x, y0, z]), at([x, y1, z]), at([x, y1, z + 1.2]), at([x, y0, z + 1.2])], true), { tone });
  return out;
};
const ringY = (cx, y, cz, r, tone = "mid") => L(k.sideRing([cx, y, cz], r, "y", P, 24), { tone });
const ringX = (x, cy, cz, r, tone = "mid") => L(k.sideRing([x, cy, cz], r, "x", P, 24), { tone });
const label = (pt, z, text, size = 2.6, tone = "lo") => k.faceTextSvg(k.sideMatrix(pt, z, P, "left"), text, { size, tone });

// ---------- корпус: основание и ножки ----------
function floor() {
  return `<path class="iso-halo" d="${k.haloOf({ x: -6, y: -6, w: 274, d: 198, r: 10 }, -8, 6, P)}"/>`;
}
function feet() {
  let out = "";
  const pts = [[8, 10], [72, 10], [8, 170], [72, 170], [92, 10], [252, 10], [92, 170], [252, 170], [172, 10], [172, 170]];
  for (const [x, y] of pts.sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out += cyl(x, y, 6, -6, 1.6, "lo");
    out += cyl(x, y, 3, -4.4, 4.4, "mid", { steps: 20 });
  }
  return out;
}

// ---------- башня управления (корпус, внутренности) ----------
function towerShell() {
  let out = "";
  out += slab({ x: 0, y: 0, w: 80, d: 4 }, 0, 300, "lo");          // задняя стенка
  out += slab({ x: 0, y: 4, w: 4, d: 176 }, 0, 300, "lo");         // левая стенка
  out += slab({ x: 4, y: 4, w: 74, d: 172 }, 0, 6, "mid");         // днище
  out += slab({ x: 6, y: 136, w: 68, d: 4 }, 88, 202, "lo", { bevel: 0.3 }); // монтажная панель
  out += screws({ x: 6, y: 136, w: 68, d: 4 }, 290, 4);
  // кабельный канал
  out += slab({ x: 8, y: 140, w: 6, d: 8 }, 90, 196, "lo");
  return out;
}
function laserSource() { // S01
  let out = "";
  const rack = { x: 8, y: 30, w: 64, d: 140 };
  out += slab(rack, 10, 4, "lo");
  out += slab({ x: 10, y: 32, w: 60, d: 136 }, 14, 58, "hi", { bevel: 0.8 });
  // лицевая панель модуля
  out += slab({ x: 10, y: 168, w: 60, d: 2 }, 16, 54, "mid", { bevel: 0.3 });
  out += vents(14, 40, 170, 22, 62, 4);
  out += cyl(52, 171, 2.2, 54, 0.1, "lo");
  out += D([at([52, 170, 58]), at([58, 170, 58])], { size: 0.8, tone: "hi" });
  out += D([at([62, 170, 58])], { size: 0.8, tone: "lo" });
  // ключ и разъём оптоволокна
  out += slab({ x: 48, y: 170, w: 6, d: 3 }, 30, 6, "mid");
  out += slab({ x: 58, y: 170, w: 8, d: 4 }, 30, 8, "hi");
  out += D([at([62, 174, 34])], { size: 0.7, tone: "hi" });
  // радиатор накачки: рёбра на крышке
  const fins = k.topTicks(14, 66, 3, 5, 40, 72, [56, 56], P);
  out += L(fins.minor, { tone: "faint" }) + L(fins.major, { tone: "lo" });
  out += L(k.planOutline({ x: 13, y: 38, w: 54, d: 60, r: 1 }, 72, P), { tone: "lo" });
  // катушка волокна
  out += cyl(36, 130, 16, 72, 3, "mid", { steps: 36 }) + L(k.ring(36, 130, 10, 75, P, 32), { tone: "lo" }) + L(k.ring(36, 130, 13, 75, P, 32), { tone: "faint" });
  out += label([12, 168], 66, "YB-FIBER 1 кВт", 2.6, "mid");
  return out;
}
function controlInternal() { // S11: ПЛК и промышленный ПК
  let out = "";
  out += slab({ x: 12, y: 140, w: 58, d: 3 }, 104, 2.4, "mid", { bevel: 0.2 }); // DIN-рейка
  for (let i = 0; i < 8; i++) {
    const x = 13 + i * 7;
    out += slab({ x, y: 143, w: 6, d: 18, r: 0.6 }, 96, 20, i === 0 ? "hi" : "mid", { bevel: 0.3 });
    out += D([at([x + 1.5, 161, 112]), at([x + 3, 161, 112])], { size: 0.45, tone: i % 3 ? "mid" : "hi" });
    out += L(k.pathOf([at([x + 1, 161, 100]), at([x + 5, 161, 100])]), { tone: "faint" });
  }
  // промышленный ПК
  out += slab({ x: 14, y: 142, w: 40, d: 22 }, 124, 18, "mid", { bevel: 0.6 });
  out += vents(18, 40, 164, 128, 138, 3);
  out += D([at([48, 164, 136])], { size: 0.8, tone: "hi" });
  return out;
}
function electrical() { // S12: силовой шкаф
  let out = "";
  out += slab({ x: 12, y: 140, w: 58, d: 3 }, 176, 2.4, "mid", { bevel: 0.2 });
  for (let i = 0; i < 11; i++) {
    const x = 13 + i * 5;
    out += slab({ x, y: 143, w: 4.4, d: 14, r: 0.4 }, 170, 16, "mid", { bevel: 0.2 });
    out += slab({ x: x + 1.4, y: 157, w: 1.6, d: 2, r: 0.3 }, 177, 3, i < 2 ? "hi" : "lo", { bevel: 0 });
  }
  // блоки питания
  out += slab({ x: 14, y: 142, w: 22, d: 20 }, 200, 26, "mid", { bevel: 0.6 });
  out += slab({ x: 40, y: 142, w: 22, d: 20 }, 200, 26, "mid", { bevel: 0.6 });
  out += vents(16, 34, 162, 206, 222, 3) + vents(42, 60, 162, 206, 222, 3);
  // клеммники
  for (let i = 0; i < 14; i++) out += slab({ x: 14 + i * 3.8, y: 143, w: 3.2, d: 10, r: 0.3 }, 240, 8, "lo", { bevel: 0 });
  out += D(Array.from({ length: 14 }, (_, i) => at([15.6 + i * 3.8, 153, 246])), { size: 0.4 });
  return out;
}
function towerTop() {
  let out = "";
  out += slab({ x: 0, y: 0, w: 80, d: 180, r: 1.2 }, 296, 4, "mid", { bevel: 0.6 });
  out += screws({ x: 0, y: 0, w: 80, d: 180 }, 300, 4);
  return out;
}
function towerFront() { // корпус башни (+y)
  let out = "";
  out += slab({ x: 0, y: 176, w: 80, d: 4 }, 4, 292, "mid", { bevel: 0.6 });
  out += L(k.pathOf([at([40, 180, 8]), at([40, 180, 292])]), { tone: "faint" }); // шов дверей
  out += vents(8, 32, 180, 16, 60, 4) + vents(48, 72, 180, 16, 60, 4);
  out += slab({ x: 34, y: 180, w: 2, d: 3 }, 130, 40, "hi", { bevel: 0 }); // ручка
  out += slab({ x: 44, y: 180, w: 2, d: 3 }, 130, 40, "hi", { bevel: 0 });
  out += cyl(20, 182, 2.4, 266, 0.1, "lo") + D([at([20, 182, 266])], { size: 0.6 });
  out += label([6, 180], 284, "ТЕХАТЛАС · LPBF-ТИПОВАЯ", 3, "mid");
  return out;
}
function towerSide() { // правая стенка башни — над столом видна
  let out = slab({ x: 76, y: 4, w: 4, d: 172 }, 0, 296, "lo");
  return out;
}

// ---------- основание: приводы осей Z, колодцы ----------
function baseShell() {
  let out = "";
  out += slab({ x: 82, y: 0, w: 180, d: 4 }, 0, 134, "lo");
  out += slab({ x: 82, y: 4, w: 4, d: 172 }, 0, 134, "lo");
  out += slab({ x: 86, y: 4, w: 172, d: 172 }, 0, 6, "mid");
  // продольные балки рамы
  out += slab({ x: 86, y: 8, w: 172, d: 8 }, 120, 10, "mid", { bevel: 0.4 });
  return out;
}
function zDrive(well, travelZ, sys, tag) { // привод оси Z: ходовой винт, направляющие, мотор, колодец
  const cx = well.x + well.w / 2, cy = well.y + well.d / 2;
  let out = "";
  // мотор с энкодером
  out += slab({ x: cx - 9, y: cy - 9, w: 18, d: 18, r: 1.5 }, 8, 18, "mid", { bevel: 0.6 });
  out += cyl(cx, cy, 5, 26, 3, "mid") + L(k.knurl(cx, cy, 5, 26, 29, 24, P), { tone: "lo" });
  out += L(k.sideSeam({ x: cx - 9, y: cy - 9, w: 18, d: 18, r: 1.5 }, 16, P, 4), { tone: "lo" });
  // направляющие колонны
  for (const dx of [-well.w / 2 + 5, well.w / 2 - 5]) out += cyl(cx + dx, cy + well.d / 2 - 6, 1.8, 8, 40, "mid", { steps: 16 });
  // подвижный шток и гайка (в группе data-move)
  let rod = cyl(cx, cy, 2.6, 30, 70, "hi", { steps: 20, lit: tag === "build" });
  rod += slab({ x: cx - 7, y: cy - 7, w: 14, d: 14, r: 1 }, 60, 6, "mid", { bevel: 0.4 });
  rod += screws({ x: cx - 7, y: cy - 7, w: 14, d: 14 }, 66, 2);
  out += `<g data-move="${tag}-rod">${rod}</g>`;
  // колодец (цилиндр построения) — снаружи закрывает верх штока
  const box = { x: well.x - 3, y: well.y - 3, w: well.w + 6, d: well.d + 6, r: 1.5 };
  out += slab(box, 64, 70, "mid", { bevel: 0.6 });
  out += L(k.sideSeam(box, 74, P, 4), { tone: "lo" }) + L(k.sideSeam(box, 124, P, 4), { tone: "lo" });
  // шкала уровня платформы на грани +y и подвижная метка
  const face = well.y + well.d + 3;
  const t = k.sideTicks(well.x + 4, well.x + 4, 1, 1, face, 0, [0, 0], P); // заглушка для API
  let ticks = "";
  for (let z = 78; z <= 132; z += 2) ticks += L(k.segment([well.x + 4, face, z], [well.x + ((z % 10 === 0) ? 10 : 7), face, z], P), { tone: z % 10 === 0 ? "mid" : "lo" });
  out += ticks + (t.minor || "");
  out += `<g data-move="${tag}-mark">${L(k.segment([well.x + 3, face, 132], [well.x + 12, face, 132], P), { tone: "lit" })}${D([at([well.x + 12, face, 132])], { size: 0.8, tone: "hi" })}</g>`;
  return out;
}
function overflowBin() {
  const o = M.overflow;
  let out = slab({ x: o.x - 2, y: o.y - 2, w: o.w + 4, d: o.d + 4 }, 70, 64, "mid", { bevel: 0.5 });
  out += slab({ x: o.x + 4, y: o.y + o.d + 2, w: o.w - 8, d: 3 }, 84, 4, "hi"); // смотровая ручка
  out += L(k.sideSeam({ x: o.x - 2, y: o.y - 2, w: o.w + 4, d: o.d + 4, r: 1 }, 100, P, 4), { tone: "lo" });
  return out;
}
function baseFront() {
  let out = "";
  out += slab({ x: 258, y: 0, w: 4, d: 176 }, 4, 130, "mid", { bevel: 0.6 });
  out += ventsX(262, 20, 60, 16, 60, 4);
  out += slab({ x: 82, y: 176, w: 180, d: 4 }, 4, 130, "mid", { bevel: 0.6 });
  out += L(k.pathOf([at([172, 180, 8]), at([172, 180, 130])]), { tone: "faint" });
  out += slab({ x: 164, y: 180, w: 2, d: 3 }, 60, 30, "hi", { bevel: 0 }) + slab({ x: 178, y: 180, w: 2, d: 3 }, 60, 30, "hi", { bevel: 0 });
  out += vents(96, 150, 180, 14, 36, 4) + vents(194, 248, 180, 14, 36, 4);
  return out;
}

// ---------- рабочая камера ----------
function chamberBack() { // S04: задняя и левая стенки, стол
  let out = "";
  out += slab({ x: 82, y: 0, w: 180, d: 5 }, 134, 156, "lo");
  out += slab({ x: 82, y: 5, w: 5, d: 171 }, 134, 156, "lo");
  out += L(k.planOutline({ x: 92, y: 0, w: 160, d: 5, r: 0 }, 134, P), { tone: "faint" });
  // уплотнение по контуру
  out += L(k.pathOf([at([87, 5, 286]), at([258, 5, 286])]), { tone: "faint" });
  return out;
}
function deck() { // S04: рабочий стол с проёмами
  const z = M.deck - 6, h = 6;
  const s = M.supply, b = M.build, o = M.overflow;
  const strips = [
    { x: 87, y: 5, w: 171, d: s.y - 5 },
    { x: 87, y: s.y, w: s.x - 87, d: s.d },
    { x: s.x + s.w, y: s.y, w: b.x - s.x - s.w, d: s.d },
    { x: b.x + b.w, y: s.y, w: o.x - b.x - b.w, d: s.d },
    { x: o.x + o.w, y: s.y, w: 258 - o.x - o.w, d: s.d },
    { x: 87, y: s.y + s.d, w: 171, d: 176 - s.y - s.d },
  ];
  let out = strips.map((pl) => slab({ ...pl, r: 0.4 }, z, h, "mid", { bevel: 0.3 })).join("");
  for (const w of [s, b, o]) out += L(k.planOutline({ ...w, r: 0.4 }, M.deck, P, 2), { tone: "lo" });
  out += screws({ x: 87, y: 5, w: 171, d: 171 }, M.deck, 5);
  // линейка вдоль переднего края
  const t = k.topTicks(96, 250, 2, 5, 168, M.deck, [1.6, 3.2], P);
  out += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
  return out;
}
function powderTops() {
  const s = M.supply, b = M.build, o = M.overflow;
  let out = "";
  out += `<g data-id="powder-supply">${S(k.slabOf({ ...s, r: 0.2 }, M.deck - 0.4, 0.4, P, 2), { tone: "lo", flat: true, className: "powder" })}</g>`;
  out += `<g data-id="powder-bed">${S(k.slabOf({ ...b, r: 0.2 }, M.deck - 0.4, 0.4, P, 2), { tone: "lo", flat: true, className: "powder" })}</g>`;
  out += S(k.slabOf({ ...o, r: 0.2 }, M.deck - 6, 0.4, P, 2), { tone: "lo", flat: true, className: "powder" });
  return out;
}
function partSection() { // сечение детали (сплавленный материал)
  const { cx, cy, half, hole } = PART;
  const outer = k.roundedPlan({ x: cx - half, y: cy - half, w: half * 2, d: half * 2, r: 3 }, 6);
  const inner = k.circleRing(cx, cy, hole, 28).reverse();
  const d = k.pathOf(outer.map(([x, y]) => at([x, y, M.deck])), true) + k.pathOf(inner.map(([x, y]) => at([x, y, M.deck])), true);
  return `<path data-id="part-top" class="part-top" fill-rule="evenodd" d="${d}"/>`;
}
function hatchPath() { // траектория сканирования: контур + штриховка (зигзаг)
  const { cx, cy, half, hole } = PART;
  const pts = [];
  const step = 2.2;
  let dir = 1;
  for (let y = cy - half + 1.2; y <= cy + half - 1.2; y += step) {
    const dy = y - cy;
    const segs = [];
    if (Math.abs(dy) < hole + 0.6) {
      const dx = Math.sqrt(Math.max(0, (hole + 0.6) ** 2 - dy * dy));
      segs.push([cx - half + 1.2, cx - dx], [cx + dx, cx + half - 1.2]);
    } else segs.push([cx - half + 1.2, cx + half - 1.2]);
    const ordered = dir > 0 ? segs : segs.map(([a, b]) => [b, a]).reverse();
    for (const [a, b] of ordered) { pts.push([a, y], [b, y]); }
    dir *= -1;
  }
  const hatch = pts.map(([x, y]) => at([x, y, M.deck + 0.1]));
  return k.pathOf(hatch);
}
function rails() { // S07
  let out = "";
  for (const y of M.rails) {
    out += slab({ x: 90, y: y - 3, w: 166, d: 6, r: 0.8 }, M.deck, 3, "mid", { bevel: 0.3 });
    out += D([96, 130, 170, 210, 250].map((x) => at([x, y, M.deck + 3])), { size: 0.4, tone: "lo" });
  }
  // привод: мотор и ремень
  out += slab({ x: 246, y: 134, w: 10, d: 12 }, M.deck, 12, "mid", { bevel: 0.5 });
  out += cyl(251, 140, 3, M.deck + 12, 2, "mid") + L(k.knurl(251, 140, 3, M.deck + 12, M.deck + 14, 16, P), { tone: "lo" });
  out += L(k.pathOf([at([94, 136, M.deck + 4]), at([246, 136, M.deck + 4])]), { tone: "lo" });
  return out;
}
function recoater() { // S07: каретка (сдвигается по x в рантайме)
  const x = 0; // локальные координаты: центр балки в x = 0, переносится translateAlong
  let out = "";
  out += `<g data-id="powder-ridge">${slab({ x: x + 5, y: 58, w: 3, d: 64, r: 0.5 }, M.deck, 1.4, "lo", { bevel: 0 })}</g>`;
  out += slab({ x: x + 2.6, y: 58, w: 2, d: 64, r: 0.3 }, M.deck + 0.2, 4, "hi", { lit: true, bevel: 0 }); // лезвие
  for (const y of M.rails) out += slab({ x: x - 6, y: y - 5, w: 12, d: 10, r: 1 }, M.deck + 3, 8, "mid", { bevel: 0.4 });
  out += slab({ x: x - 5, y: 38, w: 10, d: 104, r: 1 }, M.deck + 6, 10, "mid", { bevel: 0.6 });
  out += L(k.lineOnTop([x - 2, 40], [x - 2, 140], M.deck + 16, P), { tone: "faint" });
  out += screws({ x: x - 5, y: 38, w: 10, d: 104 }, M.deck + 16, 2.5);
  out += slab({ x: x - 3, y: 128, w: 6, d: 8 }, M.deck + 16, 4, "mid", { bevel: 0.3 }); // кабельный ввод
  return out;
}
function gas() { // S05: коллекторы подачи и отсоса, потоки
  let out = "";
  out += slab({ x: 88, y: 56, w: 6, d: 68 }, M.deck, 22, "mid", { bevel: 0.5 });
  for (let z = M.deck + 4; z <= M.deck + 18; z += 3.5) out += L(k.segment([94, 60, z], [94, 120, z], P), { tone: "lo" });
  out += slab({ x: 250, y: 56, w: 6, d: 68 }, M.deck, 26, "mid", { bevel: 0.5 });
  out += L(k.planOutline({ x: 251, y: 60, w: 4, d: 60, r: 0.5 }, M.deck + 26, P, 2), { tone: "lo" });
  return out;
}
function gasFlow() {
  let out = "";
  for (const [y, z] of [[66, 150], [80, 154], [94, 151], [108, 155], [118, 150]]) {
    out += L(k.pathOf([at([96, y, z]), at([150, y, z + 1.5]), at([200, y, z + 1]), at([248, y, z])]), { tone: "mid", flow: true, className: "gas-flow" });
  }
  return out;
}
function bridge() { // S04: мост сканатора
  let out = "";
  out += cyl(...M.lens.slice(0, 2), 8, 282, 8, "hi", { steps: 32 }); // f-theta, под мостом
  out += L(k.ring(M.lens[0], M.lens[1], 6, 282, P, 28), { tone: "lo" });
  out += slab({ x: 82, y: 70, w: 180, d: 40, r: 1 }, 290, 8, "mid", { bevel: 0.8 });
  out += screws({ x: 82, y: 70, w: 180, d: 40 }, 298, 4);
  out += slab({ x: 82, y: 0, w: 180, d: 5 }, 290, 6, "mid");
  out += slab({ x: 82, y: 5, w: 5, d: 175 }, 290, 6, "mid");
  return out;
}
function layerCamera() { // S10: камера послойного контроля и подсветка
  let out = "";
  out += slab({ x: 120, y: 110, w: 110, d: 3, r: 0.5 }, 285, 4, "hi", { bevel: 0.2 }); // LED-линейка
  out += D(Array.from({ length: 18 }, (_, i) => at([124 + i * 6, 113, 286.6])), { size: 0.55, tone: "hi" });
  out += slab({ x: 234, y: 104, w: 14, d: 14, r: 1.5 }, 278, 12, "mid", { bevel: 0.5 });
  out += cyl(241, 111, 4, 274, 4, "hi");
  out += L(k.ring(241, 111, 2.4, 274, P, 20), { tone: "lo" });
  return out;
}
function optics() { // S02
  let out = "";
  out += slab({ x: 108, y: 84, w: 24, d: 12, r: 1.5 }, 298, 12, "mid", { bevel: 0.6 }); // коллиматор
  out += ringX(132, 90, 304, 4.2, "lo");
  out += slab({ x: 134, y: 82, w: 26, d: 16, r: 2 }, 298, 14, "hi", { bevel: 0.8 }); // расширитель пучка
  for (const x of [140, 152]) out += cyl(x, 90, 3, 312, 3, "mid", { steps: 20 }) + L(k.knurl(x, 90, 3, 312, 315, 16, P), { tone: "lo" });
  out += L(k.sideSeam({ x: 134, y: 82, w: 26, d: 16, r: 2 }, 305, P, 4), { tone: "lo" });
  out += slab({ x: 100, y: 86, w: 8, d: 8, r: 1 }, 300, 8, "mid", { bevel: 0.4 }); // разъём QBH
  return out;
}
function galvo() { // S03
  let out = "";
  const head = { x: 162, y: 76, w: 34, d: 28, r: 2 };
  out += slab(head, 298, 24, "hi", { bevel: 1 });
  out += L(k.sideSeam(head, 312, P, 4), { tone: "lo" });
  out += screws(head, 322, 3);
  out += cyl(172, 86, 5, 322, 12, "mid") + L(k.ring(172, 86, 3, 334, P, 24), { tone: "lo" }); // мотор X
  out += slab({ x: 184, y: 104, w: 9, d: 6, r: 1 }, 304, 10, "mid", { bevel: 0.4 });       // мотор Y (сбоку)
  out += ringY(188.5, 110, 309, 3.2, "mid");
  out += slab({ x: 196, y: 82, w: 4, d: 12 }, 304, 10, "lo"); // разъём XY2-100
  out += D([at([200, 86, 310]), at([200, 90, 310])], { size: 0.5, tone: "hi" });
  out += label([164, 104], 320, "XY2", 2.4, "lo");
  return out;
}
function meltPool() { // S09: коаксиальный мониторинг ванны
  let out = "";
  out += slab({ x: 162, y: 104, w: 12, d: 8, r: 0.6 }, 300, 12, "mid", { bevel: 0.4 }); // светоделитель
  out += slab({ x: 162, y: 112, w: 12, d: 16, r: 1.2 }, 300, 12, "hi", { bevel: 0.6 });  // камера
  out += ringY(168, 128, 306, 4, "mid") + ringY(168, 128, 306, 2.2, "lo");
  out += cyl(168, 120, 2.6, 312, 6, "mid", { steps: 18 }); // фотодиод
  out += D([at([170, 128, 310])], { size: 0.6, tone: "hi" });
  return out;
}
function filterUnit() { // S05: блок фильтрации и рециркуляции на башне
  let out = "";
  out += slab({ x: 6, y: 40, w: 68, d: 100, r: 2 }, 300, 4, "lo");
  for (const y of [62, 118]) {
    out += cyl(24, y, 14, 304, 52, "mid", { steps: 40, bevel: 0.6 });
    out += L(k.sideArc(24, y, 14, 316, P, 30), { tone: "lo" }) + L(k.sideArc(24, y, 14, 344, P, 30), { tone: "lo" });
    out += cyl(24, y, 8, 356, 4, "mid") + L(k.knurl(24, y, 8, 356, 360, 28, P), { tone: "lo" });
  }
  out += slab({ x: 44, y: 70, w: 26, d: 40, r: 2 }, 304, 26, "hi", { bevel: 0.8 }); // воздуходувка
  out += cyl(57, 90, 8, 330, 3, "mid", { steps: 32 }) + L(k.ring(57, 90, 5, 333, P, 28), { tone: "lo" });
  out += vents(48, 66, 110, 310, 324, 3);
  return out;
}
function hopper() { // S06: бункер порошка на задней стенке
  let out = "";
  out += slab({ x: 104, y: 5, w: 28, d: 22, r: 2 }, 236, 36, "mid", { bevel: 0.6 });
  out += slab({ x: 110, y: 10, w: 16, d: 14, r: 1.5 }, 222, 14, "mid", { bevel: 0.4 });
  out += slab({ x: 112, y: 27, w: 12, d: 1, r: 0.3 }, 246, 18, "lo", { bevel: 0 }); // смотровое окно
  out += cyl(118, 16, 5, 272, 3, "mid") + L(k.knurl(118, 16, 5, 272, 275, 20, P), { tone: "lo" });
  return out;
}
function chamberGlass() { // корпус камеры: стекло двери и правая стенка
  let out = "";
  out += `<g class="glass">${slab({ x: 258, y: 5, w: 4, d: 171 }, 134, 156, "mid", { bevel: 0.5 })}</g>`;
  out += slab({ x: 258, y: 5, w: 4, d: 6 }, 134, 156, "mid") + slab({ x: 258, y: 170, w: 4, d: 6 }, 134, 156, "mid");
  out += `<g class="glass">${slab({ x: 87, y: 176, w: 175, d: 4 }, 134, 156, "mid", { bevel: 0.5 })}</g>`;
  // рама двери
  out += slab({ x: 87, y: 176, w: 175, d: 4 }, 280, 10, "mid") + slab({ x: 87, y: 176, w: 175, d: 4 }, 134, 10, "mid");
  out += slab({ x: 87, y: 176, w: 6, d: 4 }, 144, 136, "mid") + slab({ x: 256, y: 176, w: 6, d: 4 }, 144, 136, "mid");
  // перчаточные порты
  for (const x of [140, 210]) out += ringY(x, 180, 200, 12, "mid") + ringY(x, 180, 200, 10, "lo");
  out += slab({ x: 244, y: 180, w: 3, d: 3 }, 190, 34, "hi", { bevel: 0 });
  return out;
}
function hmi() { // S11: панель оператора
  let out = "";
  out += slab({ x: 52, y: 180, w: 6, d: 10 }, 214, 6, "mid");
  out += slab({ x: 30, y: 190, w: 48, d: 3, r: 1.5 }, 196, 40, "hi", { bevel: 0.8 });
  out += `<path class="hmi-screen" d="${k.pathOf([[34, 193, 232], [74, 193, 232], [74, 193, 204], [34, 193, 204]].map(at), true)}"/>`;
  out += k.faceTextSvg(k.sideMatrix([36, 193], 226, P, "left"), "СЛОЙ ▮▮▮▯", { size: 2.6, tone: "hi" });
  out += `<g data-id="hmi-text">${k.faceTextSvg(k.sideMatrix([36, 193], 214, P, "left"), "PROCESS OK", { size: 2.6, tone: "mid" })}</g>`;
  return out;
}
function estop() { // S12: аварийная кнопка и сигнальная колонна
  let out = "";
  out += slab({ x: 60, y: 180, w: 12, d: 4, r: 1 }, 170, 12, "mid", { bevel: 0.4 });
  out += `<path class="estop" d="${k.sideRing([66, 184, 176], 4, "y", P, 28)}"/>`;
  out += `<path class="estop-cap" d="${k.sideRing([66, 186, 176], 3, "y", P, 28)}"/>`;
  return out;
}
function stackLight() {
  let out = cyl(70, 160, 1.4, 300, 6, "mid", { steps: 14 });
  const tones = ["green", "amber", "red"];
  tones.forEach((t, i) => { out += `<g class="lamp" data-lamp="${t}">${cyl(70, 160, 3.4, 306 + i * 7, 6.4, "mid", { steps: 24 })}</g>`; });
  out += cyl(70, 160, 3.4, 327, 1.6, "lo");
  return out;
}
// оптоволокно и кабели (проводники с концевыми точками на объектах)
function cables() {
  let out = "";
  out += `<g data-sys="S01" class="cable fiber">${k.wireSvg(at([62, 174, 38]), at([100, 90, 304]), { via: [at([78, 184, 38]), at([78, 184, 300]), at([88, 120, 304])], tone: "hi" })}</g>`;
  out += `<g data-sys="S09" class="cable">${k.wireSvg(at([168, 128, 300]), at([80, 140, 296]), { via: [at([140, 132, 298])], tone: "lo" })}</g>`;
  out += `<g data-sys="S03" class="cable">${k.wireSvg(at([200, 88, 306]), at([80, 100, 297]), { via: [at([210, 88, 300]), at([210, 60, 298]), at([84, 60, 298])], tone: "lo" })}</g>`;
  out += `<g data-sys="S05" class="cable">${k.wireSvg(at([70, 90, 316]), at([88, 70, 160]), { via: [at([84, 70, 316])], tone: "mid", size: 1.6 })}</g>`;
  return out;
}

// ---------- сборка ----------
const ex = {
  S01: [0, 110, 0], S11: [0, 85, 10], S11b: [0, 45, 0], S12: [0, 70, 35], S12b: [0, 35, 0], S12c: [0, 0, 30],
  S05: [-10, -10, 50], S05b: [0, 0, 0], S06: [0, 0, 45], S06b: [-15, 70, -0], S06c: [55, 70, 0],
  S08: [25, 120, 0], S07: [0, 0, 55], S02: [-35, 0, 40], S03: [0, 0, 65], S09: [0, 45, 75], S10: [25, 60, -10], S04: [0, 0, 0],
};
const body = [
  floor(), feet(),
  `<g data-id="tower">${towerShell()}</g>`,
  piece("S01", ex.S01, laserSource()),
  piece("S11", ex.S11, controlInternal()),
  piece("S12", ex.S12, electrical()),
  towerSide(),
  `<g data-id="base">${baseShell()}</g>`,
  piece("S06", ex.S06b, zDrive(M.supply, 0, "S06", "supply")),
  piece("S08", ex.S08, zDrive(M.build, 0, "S08", "build")),
  piece("S06", ex.S06c, overflowBin()),
  `<g class="housing" data-housing="base">${baseFront()}</g>`,
  piece("S04", ex.S04, chamberBack()),
  piece("S06", ex.S06, hopper()),
  piece("S04", ex.S04, deck()),
  piece("S08", [0, 0, 0], powderTops() + partSection() + `<g data-id="fresh-layer"></g>` + `<path data-id="track" class="scan-track" d="${hatchPath()}"/>`, ` data-keep="1"`),
  piece("S07", ex.S07, rails()),
  piece("S05", ex.S05b, gas() + `<g data-id="gas-flow">${gasFlow()}</g>`),
  piece("S07", ex.S07, `<g data-move="recoater" transform="${k.translateAlong(P, [M.recoater.park, 0, 0])}">${recoater()}</g>`),
  `<g data-id="beam-layer"><path data-id="beam" class="beam" d=""/><circle data-id="spot-glow" class="spot-glow" r="0" cx="0" cy="0"/><circle data-id="spot" class="spot" r="0" cx="0" cy="0"/></g>`,
  piece("S10", ex.S10, layerCamera()),
  `<g data-id="tower-top">${towerTop()}</g>`,
  piece("S05", ex.S05, filterUnit()),
  piece("S12", ex.S12c, stackLight()),
  `<g class="housing" data-housing="tower">${towerFront()}</g>`,
  `<g class="housing" data-housing="chamber">${chamberGlass()}</g>`,
  piece("S11", ex.S11b, hmi()),
  piece("S12", ex.S12b, estop()),
  piece("S04", ex.S04, bridge()),
  piece("S02", ex.S02, optics()),
  piece("S03", ex.S03, galvo()),
  piece("S09", ex.S09, meltPool()),
  `<g data-id="cables">${cables()}</g>`,
];

const svg = k.figureSvg({
  width: W, height: H,
  label: "Типовая установка лазерного сплавления металлического порошка (LPBF): башня управления с волоконным лазером, рабочая камера со столом, рекотером и платформой построения, мост с оптикой и гальваносканатором.",
  body,
});
writeFileSync(join(ROOT, "assets/anatomy/lpbf.svg"), svg);
writeFileSync(join(ROOT, "assets/anatomy/lpbf-model.json"), JSON.stringify({ W, H, P, M, PART, ex }, null, 1));
console.log("wrote assets/anatomy/lpbf.svg", (svg.length / 1024).toFixed(0) + " KB");
