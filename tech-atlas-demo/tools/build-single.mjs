// Сборка атласа в ОДИН самодостаточный HTML-файл (открывается двойным щелчком, без сервера и интернета).
// Запуск: node tools/build-single.mjs → dist/tech-atlas-lpbf.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => readFileSync(join(ROOT, p), "utf8");

// 1. Файлы, которые приложение загружает через fetch(), — во встроенный словарь
const files = {};
for (const f of readdirSync(join(ROOT, "data")).filter((f) => f.endsWith(".json"))) files[`data/${f}`] = r(`data/${f}`);
for (const f of ["assets/anatomy/lpbf.svg", "assets/anatomy/lpbf-model.json", "assets/images/russia-map.json"]) files[f] = r(f);

// 2. Модули → одна область видимости
const wrapModule = (src, name) => {
  const exported = [...src.matchAll(/^export (?:async )?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const body = src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
  return `const ${name} = (() => {\n${body}\nreturn { ${exported.join(", ")} };\n})();\n`;
};
const kit = wrapModule(r("assets/anatomy/iso-kit.mjs"), "k");
const anatomy = wrapModule(r("js/anatomy.js"), "__anatomy") + "const { mountAnatomy } = __anatomy;\n";
const app = r("js/app.js").replace(/^import .*$/gm, "");

const shim = `
const __FILES = ${JSON.stringify(files).replace(/<\/(script)/gi, "<\\/$1")};
const __fetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = (url, opts) => {
  const key = String(url).replace(/^\\.\\//, "").split("?")[0];
  if (key in __FILES) return Promise.resolve(new Response(__FILES[key], { status: 200, headers: { "Content-Type": key.endsWith(".svg") ? "image/svg+xml" : "application/json" } }));
  return __fetch ? __fetch(url, opts) : Promise.reject(new Error("offline: " + key));
};`;

const css = r("assets/anatomy/iso.css") + "\n" + r("css/app.css");
const html = r("index.html");
const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
const icon = "data:image/svg+xml," + encodeURIComponent(r("assets/icons/atlas.svg").trim());
const esc = (s) => s.replace(/<\/(script)/gi, "<\\/$1");

const out = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Технологический атлас LPBF</title>
<meta name="description" content="Демонстрационный макет «Технологический атлас» на примере установки LPBF. Самодостаточный файл: работает без сервера и интернета.">
<link rel="icon" href="${icon}">
<style>${css}</style>
</head>
<body>${bodyMatch[1]}<script>${esc(r("assets/vendor/cytoscape.min.js"))}</script>
<script>${shim}</script>
<script type="module">
${esc(kit)}
${esc(anatomy)}
${esc(app)}
</script>
</body>
</html>`;
mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/tech-atlas-lpbf.html"), out);
console.log("dist/tech-atlas-lpbf.html", (out.length / 1024 / 1024).toFixed(2) + " MB");
