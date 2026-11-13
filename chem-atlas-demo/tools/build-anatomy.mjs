// Изометрическая схема опытно-промышленной линии производства титаномагниевого катализатора Циглера–Натта
// и его применения (кит Anatomy, MIT). Типовая технологическая компоновка, не проект конкретного завода.
// Мировые единицы: 1 ед. ≈ 5 см. x — длина линии, y — глубина (фронт при y = 180), z — высота.
// Запуск: node tools/build-anatomy.mjs → assets/anatomy/plant.svg + assets/anatomy/plant-model.json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../assets/anatomy/iso-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 940, H = 700;
const PLAT = 70; // отметка площадки обслуживания

const P = k.fitProjection([...k.boxCorners({ x: -6, y: -6, w: 330, d: 200 }, -4, 175)], W, H, { pad: 24, azimuth: 58 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const slab = (plan, z, h, tone = "mid", extra = {}) => S(k.slabOf({ r: 1, ...plan }, z, h, P, 4, extra.bevel ?? 0.5), { tone, ...extra });
const cyl = (cx, cy, r, z, h, tone = "mid", extra = {}) => S(k.cylinder(cx, cy, r, z, h, P, extra.steps ?? 36, extra.bevel ?? 0), { tone, ...extra });
const piece = (sys, ex, body) => `<g class="piece" data-sys="${sys}" data-ex="${ex.join(",")}">${body}</g>`;
const label = (pt, z, text, size = 3, tone = "mid") => k.faceTextSvg(k.sideMatrix(pt, z, P, "left"), text, { size, tone });

// Аппарат: опоры, обечайка с поясами, «эллиптические» днища ступенями, мотор-редуктор мешалки, люк, штуцеры
function vessel(cx, cy, r, z, h, { tone = "hi", motor = true, legs = 0, jacket = false, tag = "", lit = false, agit = "" } = {}) {
  let out = "";
  if (legs) for (const [dx, dy] of [[-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, r * 0.7]].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)))
    out += cyl(cx + dx, cy + dy, 1.4, z - legs, legs, "lo", { steps: 12 });
  // нижнее днище
  out += cyl(cx, cy, r * 0.55, z - 5, 2.5, tone, { steps: 28 }) + cyl(cx, cy, r * 0.85, z - 2.5, 2.5, tone, { steps: 32 });
  out += cyl(cx, cy, 1.6, z - 9, 4, "mid", { steps: 12 }); // донный клапан
  if (jacket) out += cyl(cx, cy, r + 1.2, z + 2, h * 0.7, "mid", { steps: 40 });
  out += cyl(cx, cy, r, z, h, tone, { steps: 44, bevel: 0.3, lit });
  for (const zz of [z + h * 0.33, z + h * 0.66]) out += L(k.sideArc(cx, cy, r, zz, P, 36), { tone: "lo" });
  // верхнее днище
  out += cyl(cx, cy, r * 0.85, z + h, 2.5, tone, { steps: 32 }) + cyl(cx, cy, r * 0.55, z + h + 2.5, 2.5, tone, { steps: 28 });
  out += D(k.circleRing(cx, cy, r * 0.7, 8).map(([x, y]) => at([x, y, z + h + 2.5])), { size: 0.45 });
  if (motor) {
    out += cyl(cx, cy, 2, z + h + 5, 4, "mid", { steps: 14 });
    out += slab({ x: cx - 4, y: cy - 4, w: 8, d: 8, r: 1 }, z + h + 9, 6, "mid");
    out += cyl(cx + 6, cy, 3, z + h + 10, 9, "mid", { steps: 20 }) + L(k.knurl(cx + 6, cy, 3, z + h + 10, z + h + 19, 16, P), { tone: "lo" });
    if (agit) out += `<path class="iso-line agitator" data-agit="${agit}" data-tone="lit" d=""/>`;
  }
  out += cyl(cx - r * 0.45, cy + r * 0.3, 2.6, z + h + 2, 4, "mid", { steps: 16 }); // люк
  out += D([at([cx - r * 0.45, cy + r * 0.3, z + h + 6])], { size: 0.6, tone: "hi" });
  if (tag) out += label([cx - r * 0.6, cy + r], z + h * 0.62, tag, 3.2, "mid");
  return out;
}

function ground() {
  let out = `<path class="iso-halo" d="${k.haloOf({ x: -6, y: -6, w: 330, d: 200, r: 8 }, -4, 4, P)}"/>`;
  out += slab({ x: -4, y: -4, w: 326, d: 196, r: 2 }, -4, 4, "lo", { bevel: 0.6 });
  // разметка проходов и обвалований
  out += L(k.planOutline({ x: 2, y: 2, w: 314, d: 184, r: 1 }, 0, P), { tone: "faint" });
  return out;
}
function steelFrame() { // эстакада и площадка обслуживания (не подсистема)
  let out = "";
  const posts = [[30, 70], [200, 70], [30, 135], [200, 135], [115, 70], [115, 135]];
  for (const [x, y] of posts.sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) out += slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.3 }, 0, PLAT, "lo", { bevel: 0 });
  out += slab({ x: 28, y: 68, w: 174, d: 69, r: 0.5 }, PLAT, 2, "mid", { bevel: 0.2 });
  const t = k.topTicks(30, 200, 3, 5, 135, PLAT + 2, [1.5, 1.5], P); out += L(t.minor, { tone: "faint" });
  // ограждение площадки (перила по переднему краю)
  for (let x = 32; x <= 200; x += 12) out += L(k.segment([x, 137, PLAT + 2], [x, 137, PLAT + 14], P), { tone: "lo" });
  out += L(k.segment([30, 137, PLAT + 14], [202, 137, PLAT + 14], P), { tone: "mid" });
  // лестница
  for (let i = 0; i < 9; i++) out += slab({ x: 205 + i * 0 , y: 140 + i * 0, w: 12, d: 4, r: 0.2 }, i * 8, 1, "lo", { bevel: 0 });
  return out;
}
function solvents() { // S07: растворители и азот
  let out = "";
  out += slab({ x: 6, y: 6, w: 70, d: 40, r: 1 }, 0, 4, "lo"); // обвалование
  out += vessel(24, 26, 13, 6, 60, { tone: "mid", motor: false, legs: 2, tag: "ГЕПТАН" });
  out += vessel(56, 26, 13, 6, 60, { tone: "mid", motor: false, legs: 2, tag: "ГЕКСАН" });
  // рампа баллонов азота
  out += slab({ x: 6, y: 150, w: 32, d: 10, r: 0.5 }, 0, 2, "lo");
  for (let i = 0; i < 5; i++) out += cyl(10 + i * 6, 155, 2.6, 2, 34, i % 2 ? "mid" : "hi", { steps: 18 }) + cyl(10 + i * 6, 155, 1, 36, 3, "mid", { steps: 10 });
  out += label([6, 160], 30, "N₂", 3.6, "hi");
  return out;
}
function ticl4() { // S02: хранение и дозирование TiCl4
  let out = slab({ x: 86, y: 8, w: 40, d: 36, r: 1 }, 0, 5, "lo");
  out += vessel(106, 26, 14, 8, 52, { tone: "hi", motor: false, legs: 3, tag: "TiCl₄" });
  out += slab({ x: 100, y: 46, w: 12, d: 8, r: 1 }, 0, 10, "mid"); // насос-дозатор
  out += cyl(106, 50, 3, 10, 4, "mid", { steps: 16 });
  return out;
}
function supportReactor() { // S01: синтез сферического аддукта MgCl2·nEtOH
  let out = vessel(60, 102, 17, PLAT + 6, 42, { tone: "hi", legs: 6, jacket: true, tag: "R-1", agit: "R1" });
  // колонна распылительного охлаждения
  out += cyl(94, 112, 7, PLAT + 2, 70, "mid", { steps: 28 });
  out += cyl(94, 112, 4, PLAT + 72, 6, "mid", { steps: 20 });
  for (const z of [PLAT + 25, PLAT + 50]) out += L(k.sideArc(94, 112, 7, z, P, 24), { tone: "lo" });
  return out;
}
function donorDosing() { // S03: внутренний донор
  let out = vessel(132, 80, 6, PLAT + 40, 18, { tone: "mid", motor: false, legs: 38, tag: "" });
  out += label([126, 86], PLAT + 54, "ID", 3.2, "hi");
  return out;
}
function titanation() { // S08: титанирование, отмывка, сушка
  let out = vessel(165, 104, 19, PLAT + 6, 46, { tone: "hi", legs: 6, jacket: true, tag: "R-2", agit: "R2", lit: true });
  // фильтр-сушилка под площадкой
  out += vessel(170, 108, 21, 12, 22, { tone: "mid", motor: true, legs: 10, tag: "F-1", agit: "F1" });
  // бочки готового катализатора
  for (const [x, y] of [[196, 158], [210, 158]]) out += cyl(x, y, 5, 0, 14, "mid", { steps: 24 }) + L(k.sideArc(x, y, 5, 7, P, 16), { tone: "lo" });
  return out;
}
function recovery() { // S09: ректификационная колонна рекуперации TiCl4 и растворителей
  let out = cyl(236, 26, 8, 0, 3, "lo");
  out += cyl(236, 26, 7, 3, 150, "mid", { steps: 30, bevel: 0.2 });
  for (let z = 20; z < 150; z += 22) out += L(k.sideArc(236, 26, 7, z, P, 24), { tone: "lo" });
  out += cyl(236, 26, 5, 153, 4, "mid", { steps: 22 });
  // конденсатор и рефлюксная ёмкость
  out += slab({ x: 244, y: 18, w: 26, d: 8, r: 3 }, 132, 8, "mid");
  out += slab({ x: 244, y: 34, w: 24, d: 10, r: 4 }, 100, 10, "mid");
  // кипятильник
  out += slab({ x: 220, y: 40, w: 20, d: 10, r: 4 }, 6, 10, "mid");
  out += label([228, 34], 100, "C-1", 3.2, "mid");
  return out;
}
function prepoly() { // S10: предполимеризация и фасовка в инертной атмосфере
  let out = vessel(246, 104, 12, 14, 34, { tone: "hi", legs: 12, tag: "R-3", agit: "R3" });
  // перчаточный бокс фасовки
  out += slab({ x: 232, y: 146, w: 34, d: 18, r: 1 }, 0, 18, "mid");
  out += slab({ x: 234, y: 148, w: 30, d: 14, r: 1 }, 18, 16, "hi", { bevel: 0.4 });
  for (const x of [242, 256]) out += L(k.sideRing([x, 162, 26], 3.2, "y", P, 20), { tone: "lo" });
  return out;
}
function teal() { // S05: хранение триэтилалюминия (пирофорный) — отдельная зона с ограждением
  let out = slab({ x: 274, y: 4, w: 44, d: 40, r: 1 }, 0, 6, "lo");
  // ISO-контейнер-цистерна: рама и горизонтальная ёмкость (упрощённо — коробчатая рама с цилиндрическими торцами)
  out += slab({ x: 278, y: 12, w: 36, d: 24, r: 1 }, 6, 4, "mid");
  out += slab({ x: 280, y: 14, w: 32, d: 20, r: 9 }, 10, 18, "hi", { bevel: 0.8 });
  out += L(k.sideSeam({ x: 280, y: 14, w: 32, d: 20, r: 9 }, 19, P, 8), { tone: "lo" });
  out += label([282, 34], 26, "ТЭА · 4.2", 3, "hi");
  return out;
}
function donorED() { // S04: внешний донор (силан) в еврокубе
  let out = slab({ x: 280, y: 62, w: 18, d: 18, r: 0.5 }, 0, 4, "lo");
  out += slab({ x: 281, y: 63, w: 16, d: 16, r: 1 }, 4, 16, "mid", { bevel: 0.3 });
  for (let z = 6; z < 20; z += 4) out += L(k.segment([281, 79, z], [297, 79, z], P), { tone: "faint" });
  out += label([282, 79], 16, "ED", 3, "hi");
  return out;
}
function loopReactor() { // S11: петлевой реактор полимеризации пропилена (фрагмент)
  let out = "";
  for (const y of [96, 128]) out += cyl(306, y, 5, 0, 150, "hi", { steps: 24, bevel: 0.2 });
  out += slab({ x: 301, y: 96, w: 10, d: 32, r: 5 }, 150, 10, "hi");
  out += slab({ x: 301, y: 96, w: 10, d: 32, r: 5 }, 0, 10, "hi");
  out += cyl(306, 112, 4, 0, 12, "mid", { steps: 18 }); // циркуляционный насос
  for (const z of [50, 100]) for (const y of [96, 128]) out += L(k.sideArc(306, y, 5, z, P, 18), { tone: "lo" });
  out += label([300, 100], 90, "ПП-РЕАКТОР", 3, "mid");
  return out;
}
function qcLab() { // S12: лаборатория контроля (контейнер)
  let out = slab({ x: 40, y: 150, w: 70, d: 34, r: 1 }, 0, 34, "mid", { bevel: 0.5 });
  out += L(k.pathOf([at([46, 184, 8]), at([64, 184, 8]), at([64, 184, 28]), at([46, 184, 28])], true), { tone: "lo" }); // окно
  out += L(k.pathOf([at([72, 184, 2]), at([84, 184, 2]), at([84, 184, 26]), at([72, 184, 26])], true), { tone: "lo" }); // дверь
  out += cyl(98, 168, 4, 34, 8, "hi", { steps: 18 }); // лабораторный автоклав на крыше-стенде (условно)
  out += label([88, 184], 30, "ОТК", 3, "hi");
  return out;
}
function particleLens() { // S06: «лупа» — морфология частицы катализатора
  const c = [118, 128];
  let out = `<g class="lens" transform="translate(${c[0].toFixed(1)} ${c[1].toFixed(1)}) scale(1.35)">`;
  out += `<circle r="44" class="lens-ring"/><circle r="40" class="lens-bg"/>`;
  // частица: сфера из кристаллитов MgCl2
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  out += `<circle r="26" class="part-body"/>`;
  for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 23; out += `<rect class="cryst" x="${(Math.cos(a) * rr - 2).toFixed(1)}" y="${(Math.sin(a) * rr - 1).toFixed(1)}" width="${(3 + rnd() * 3).toFixed(1)}" height="${(1.6 + rnd() * 1.5).toFixed(1)}" transform="rotate(${(rnd() * 180).toFixed(0)} ${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)})"/>`; }
  for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 22; out += `<circle class="ti-site" cx="${(Math.cos(a) * rr).toFixed(1)}" cy="${(Math.sin(a) * rr).toFixed(1)}" r="1.1"/>`; }
  out += `<text class="lens-cap" y="38" text-anchor="middle">частица 20–60 мкм</text></g>`;
  // ручка лупы — линия к фильтр-сушилке (откуда частицы)
  const f = at([170, 108, 34]);
  out = `<path class="iso-line" data-tone="faint" d="M${(c[0] + 42).toFixed(1)} ${(c[1] + 42).toFixed(1)}L${f[0].toFixed(1)} ${f[1].toFixed(1)}"/>` + out;
  return out;
}
// трубопроводы: data-ph — фазы, в которых по линии идёт поток
function pipe(ph, a, b, via = [], tone = "mid") {
  const pts = [a, ...via, b].map(at);
  return `<g class="pipe" data-ph="${ph}">${k.wireSvg(pts[0], pts[pts.length - 1], { via: pts.slice(1, -1), tone: "lo", size: 0.9 })}<path class="iso-line flowline" data-tone="lit" d="${k.pathOf(pts)}"/></g>`;
}
function pipes() {
  return [
    pipe("1", [56, 26, 66], [60, 102, PLAT + 52], [[56, 60, 66], [56, 60, PLAT + 52]]),            // растворитель → R-1
    pipe("1", [94, 112, PLAT + 74], [60, 102, PLAT + 54], [[80, 112, PLAT + 76]]),                 // R-1 ↔ колонна охлаждения
    pipe("2", [106, 26, 60], [165, 104, PLAT + 56], [[106, 60, 60], [140, 60, PLAT + 60], [160, 100, PLAT + 60]]), // TiCl4 → R-2
    pipe("2", [132, 80, PLAT + 58], [165, 104, PLAT + 54], [[150, 84, PLAT + 58]]),               // донор → R-2
    pipe("2", [60, 102, PLAT + 2], [165, 104, PLAT + 4], [[110, 102, PLAT + 1]]),                  // носитель → R-2
    pipe("3", [165, 104, PLAT + 1], [170, 108, 36], [[166, 106, 50]]),                              // R-2 → F-1
    pipe("3", [24, 26, 66], [170, 108, 38], [[24, 70, 66], [130, 70, 50], [168, 106, 50]]),        // гептан отмывка → F-1
    pipe("4", [170, 108, 12], [236, 26, 20], [[200, 108, 4], [236, 60, 4]]),                       // фильтрат → колонна
    pipe("4", [256, 39, 105], [106, 26, 64], [[256, 39, 165], [106, 39, 165]]),                    // рекуперат TiCl4 → склад
    pipe("5", [170, 108, 10], [246, 104, 50], [[210, 104, 8], [246, 104, 8]]),                     // катализатор → R-3
    pipe("6", [246, 104, 20], [306, 96, 40], [[276, 100, 30]]),                                     // катализатор → ПП-реактор
    pipe("6", [296, 24, 18], [306, 128, 50], [[298, 52, 18], [298, 128, 50]]),                     // ТЭА → реактор
    pipe("6", [289, 71, 20], [306, 96, 60], [[289, 90, 40]]),                                       // ED → реактор
    pipe("7", [306, 128, 10], [98, 168, 40], [[200, 175, 10], [98, 175, 40]], "lo"),               // проба ПП → ОТК
  ].join("");
}
function housing() { // ограждение/навес: задняя и левая стены с фермами (корпус)
  let out = "";
  out += `<g class="glass">${slab({ x: -4, y: -4, w: 326, d: 3 }, 0, 170, "mid", { bevel: 0 })}</g>`;
  out += `<g class="glass">${slab({ x: -4, y: -1, w: 3, d: 193 }, 0, 170, "mid", { bevel: 0 })}</g>`;
  for (let x = 20; x < 320; x += 40) out += slab({ x, y: -4, w: 3, d: 4 }, 0, 170, "lo", { bevel: 0 });
  return out;
}

const ex = { S01: [-20, 40, 40], S02: [0, -30, 30], S03: [0, -20, 70], S04: [40, 0, 20], S05: [40, -40, 30], S06: [0, 0, 40], S07: [-30, -30, 0], S08: [0, 60, 40], S09: [0, -40, 30], S10: [30, 50, 0], S11: [50, 30, 0], S12: [-20, 50, 0] };
const body = [
  ground(),
  `<g class="housing" data-housing="wall">${housing()}</g>`,
  piece("S07", ex.S07, solvents()),
  piece("S02", ex.S02, ticl4()),
  piece("S09", ex.S09, recovery()),
  piece("S05", ex.S05, teal()),
  `<g data-id="frame">${steelFrame()}</g>`,
  piece("S12", ex.S12, qcLab()),
  piece("S04", ex.S04, donorED()),
  piece("S01", ex.S01, supportReactor()),
  piece("S03", ex.S03, donorDosing()),
  piece("S08", ex.S08, titanation()),
  piece("S10", ex.S10, prepoly()),
  piece("S11", ex.S11, loopReactor()),
  `<g data-id="pipes">${pipes()}</g>`,
  piece("S06", ex.S06, particleLens()),
];
const svg = k.figureSvg({ width: W, height: H, label: "Типовая опытно-промышленная линия: хранение сырья и растворителей, синтез носителя MgCl2, титанирование, фильтр-сушилка, рекуперация TiCl4, предполимеризация, применение в реакторе полимеризации пропилена и контроль качества.", body });
writeFileSync(join(ROOT, "assets/anatomy/plant.svg"), svg);
writeFileSync(join(ROOT, "assets/anatomy/plant-model.json"), JSON.stringify({ W, H, P, ex, agit: { R1: [66, 102, PLAT + 67, 2.6], R2: [171, 104, PLAT + 71, 2.6], F1: [176, 108, 53, 2.6], R3: [252, 104, 67, 2.6] } }));
console.log("plant.svg", (svg.length / 1024).toFixed(0) + " KB");
