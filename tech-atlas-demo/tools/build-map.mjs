// Контур России из Natural Earth (world-atlas 50m, public domain) → SVG-путь в конической проекции.
// Запуск (однократно, нужен npm-пакет world-atlas и topojson-client): node tools/build-map.mjs <path-to-node_modules>
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const nm = process.argv[2] || "node_modules";
const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(`${nm}/world-atlas/countries-50m.json`, "utf8"));
const { feature } = require(`${nm}/topojson-client`);
const ru = feature(topo, topo.objects.countries).features.find((f) => f.properties.name === "Russia");
// Равнопромежуточная коническая проекция: стандартные параллели 52° и 64°, центральный меридиан 100°.
const R = Math.PI / 180, p1 = 52 * R, p2 = 64 * R, n = (Math.cos(p1) - Math.cos(p2)) / (p2 - p1), G = Math.cos(p1) / n + p1;
const lon0 = 100;
export function project(lon, lat) {
  let l = lon < -20 ? lon + 360 : lon;
  const rho = G - lat * R, th = n * (l - lon0) * R;
  return [rho * Math.sin(th), -(G - rho * Math.cos(th))];
}
const polys = ru.geometry.type === "MultiPolygon" ? ru.geometry.coordinates : [ru.geometry.coordinates];
const all = polys.flatMap((p) => p[0].map(([a, b]) => project(a, b)));
const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const Wd = 1000, s = Wd / (maxX - minX), Hd = (maxY - minY) * s;
const fx = ([x, y]) => [((x - minX) * s).toFixed(1), ((y - minY) * s).toFixed(1)];
let d = "";
for (const poly of polys) for (const ring of poly) {
  const pts = ring.map(([a, b]) => fx(project(a, b)));
  if (pts.length < 4) continue;
  d += "M" + pts.map((p) => p.join(",")).join("L") + "Z";
}
writeFileSync("assets/images/russia-map.json", JSON.stringify({ width: Wd, height: Math.round(Hd), d, proj: { minX, minY, s, n, G, lon0 }, source: "Natural Earth 1:50m через world-atlas@2.0.2 (public domain)" }));
console.log("map", Wd, Math.round(Hd), (d.length / 1024).toFixed(0) + "KB");
