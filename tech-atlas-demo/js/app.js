import { mountAnatomy } from "./anatomy.js";

// ---------------- данные ----------------
const files = ["products", "components", "technologies", "research", "organizations", "patents", "suppliers", "support", "graph", "evidence", "publications"];
const D = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await fetch(`data/${f}.json`).then((r) => r.json())])));
const map = await fetch("assets/images/russia-map.json").then((r) => r.json());

const SYS = D.products.subsystems;
const sysById = Object.fromEntries(SYS.map((s) => [s.id, s]));
const TECH = D.technologies.technologies;
const techById = {};
for (const t of TECH) { techById[t.id] = t; for (const s of t.subs) techById[s.id] = { ...s, parent: t.id }; }
const LEVELS = D.technologies.levels;
const NPTL = D.technologies.nptl;
const RES = D.research.research;
const resById = Object.fromEntries(RES.map((r) => [r.id, r]));
const RIDS = D.research.rids;
const ORGS = D.organizations;
const orgById = Object.fromEntries(ORGS.map((o) => [o.id, o]));
const SUP = D.support.support;
const supById = Object.fromEntries(SUP.map((s) => [s.id, s]));
const SRC = Object.fromEntries(D.evidence.map((s) => [s.id, s]));
const vntById = Object.fromEntries(NPTL.vnt.map((v) => [v.id, v]));
const COMP = D.components;
const topTech = (id) => (id.includes(".") ? id.split(".")[0] : id);

// ---------------- утилиты ----------------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmtBudget = (b) => (b == null ? "—" : Number(b).toLocaleString("ru-RU", { maximumFractionDigits: 1 }));
const year = (d) => (d ? d.slice(0, 4) : "—");
const chipT = (id) => `<button class="chip t" data-go-tech="${esc(topTech(id))}" title="${esc(techById[id]?.name || "")}">${esc(id)}</button>`;
const chipS = (id) => `<button class="chip s" data-go-node="${esc(id)}" title="${esc(sysById[id]?.name || "")}">${esc(id)} ${esc(sysById[id]?.short || "")}</button>`;
const chipV = (id) => `<button class="chip v" data-go="nptl" title="${esc(vntById[id]?.name || "")}">ВНТ № ${vntById[id]?.num}</button>`;
const chipR = (id) => resById[id] ? `<button class="chip" data-go-res="${esc(id)}">${esc(id)}</button>` : `<span class="chip static" title="карточка не входит в выборку макета">${esc(id)}</span>`;
const srcLink = (id) => { const s = SRC[id]; return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}">${esc(s.title.length > 70 ? s.title.slice(0, 68) + "…" : s.title)}</a>` : ""; };
const availBadge = (a) => ({ ok: '<span class="badge b-ok">поставка подтверждена</span>', check: '<span class="badge b-warn">требуется проверка</span>', restricted: '<span class="badge b-bad">ограничения</span>', none: '<span class="badge b-none">нет данных</span>' })[a] || "";
const lvlBadge = (l) => `<span class="lvl lvl-${l}">${esc(LEVELS[l])}</span>`;

// связи «узел → …»
function techsOfNode(id) {
  const s = sysById[id]; const set = new Set(s.techs);
  for (const c of COMP.filter((c) => c.sys === id)) for (const t of [...c.techCreate, ...c.techOperate]) set.add(topTech(t));
  for (const t of TECH) if (t.nodes.includes(id)) set.add(t.id);
  return [...set].sort();
}
const resOfNode = (id) => RES.filter((r) => r.analytic.nodes.includes(id));
const resOfTech = (tid) => RES.filter((r) => r.analytic.techs.includes(tid));
const orgsOfRes = (list) => [...new Set(list.map((r) => r.analytic.org).filter(Boolean))].map((o) => orgById[o]);
const ridsOfTechs = (ts) => RIDS.filter((r) => r.techs.some((t) => ts.includes(t)));
const patentsOfNode = (id) => D.patents.patents.filter((p) => p.nodes.includes(id));
const suppliersOfNode = (id) => D.suppliers.suppliers.filter((g) => g.node === id || (id === "S07" && g.node === "S08") || (id === "S10" && g.node === "S09"));
const vntOfTechs = (ts) => [...new Set(ts.flatMap((t) => techById[t]?.vnt || []))];
const deficitsOfNode = (id) => D.support.deficits.filter((d) => d.nodes.includes(id));
function supportOfTechs(ts) {
  const out = new Set();
  for (const d of D.support.deficits.filter((d) => d.techs.some((t) => ts.includes(t)))) for (const st of D.support.devProject.stages) if (D.support.devProject.covers.includes(d.id)) st.support.forEach((s) => out.add(s));
  if (ts.some((t) => ["T08", "T09"].includes(t))) out.add("SUP-RSF-BASIC");
  out.add("SUP-RSF-NPTL");
  if (ts.some((t) => ["T13", "T12"].includes(t))) out.add("SUP-RSF-3052");
  return [...out].map((s) => supById[s]).filter(Boolean);
}

// ---------------- маршрутизация ----------------
const SECTIONS = [
  ["anatomy", "Анатомия"], ["nptl", "НПТЛ и ВНТ"], ["tech", "Технологии"], ["research", "НИОКТР"], ["orgs", "Компетенции"],
  ["patents", "Патенты"], ["market", "Рынок"], ["support", "Поддержка"], ["graph", "Граф знаний"], ["gaps", "Дефициты и проект"], ["sources", "Источники"],
];
const state = { node: null, tech: null, res: null, org: null };
$("#tabs").innerHTML = SECTIONS.map(([id, name], i) => `<button class="tab" data-tab="${id}"><span class="n">${String(i + 1).padStart(2, "0")}</span>${name}</button>`).join("");
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab); });
const views = {};
const main = $("#main");
for (const [id] of SECTIONS) { const sec = document.createElement("section"); sec.id = "v-" + id; sec.hidden = true; main.append(sec); views[id] = sec; }
const rendered = new Set();
let current = null;
function go(id, opts = {}) {
  if (!views[id]) id = "anatomy";
  document.querySelector(".drawer")?.classList.remove("open");
  if (current !== id || opts.force) {
    for (const [k, v] of Object.entries(views)) v.hidden = k !== id;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.tab === id ? "page" : "false"));
    current = id;
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  }
  if (!rendered.has(id) || opts.force) { RENDER[id](views[id]); rendered.add(id); }
  if (opts.after) opts.after();
  if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}
window.addEventListener("hashchange", () => go(location.hash.slice(1)));
// глобальные переходы по чипам
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go-tech],[data-go-node],[data-go-res],[data-go-org],[data-go]");
  if (!t || t.closest(".fig svg")) return;
  if (t.dataset.goTech) { state.tech = t.dataset.goTech; go("tech", { force: true }); }
  else if (t.dataset.goNode) { state.node = t.dataset.goNode; go("anatomy", { after: () => anat && anatSelect(state.node, true) }); }
  else if (t.dataset.goRes) { openResearch(t.dataset.goRes); }
  else if (t.dataset.goOrg) { state.org = t.dataset.goOrg; go("orgs", { force: true }); }
  else if (t.dataset.go) { go(t.dataset.go); }
});
// тема
const savedTheme = (() => { try { return localStorage.getItem("atlas-theme"); } catch { return null; } })();
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$("#themeBtn").addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("atlas-theme", t); } catch {}
  document.querySelectorAll(".iso").forEach((el) => el.setAttribute("data-theme", t));
  if (cy) styleGraph();
});
const isoTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
// тултип
const tip = $("#tooltip");
function showTip(html, e) { if (!html) { tip.hidden = true; return; } tip.innerHTML = html; tip.hidden = false; const x = Math.min(e.clientX + 14, innerWidth - 320); tip.style.left = x + "px"; tip.style.top = e.clientY + 14 + "px"; }
// выдвижная панель
const drawer = document.createElement("aside"); drawer.className = "drawer"; drawer.setAttribute("aria-live", "polite"); document.body.append(drawer);
function openDrawer(html) { drawer.innerHTML = `<button class="btn close" data-close>Закрыть ✕</button>${html}`; drawer.classList.add("open"); drawer.scrollTop = 0; }
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) drawer.classList.remove("open"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") drawer.classList.remove("open"); });

// ---------------- 01 АНАТОМИЯ ----------------
let anat = null;
let anatSelect = () => {};
const RENDER = {};
RENDER.anatomy = async (el) => {
  const P = D.products.product;
  el.innerHTML = `
  <div class="section-head"><div><h1>${esc(P.name)}</h1><p>${esc(P.principle)}</p></div>
    <div class="pill-row"><span class="badge b-link">${esc(P.class)}</span><span class="badge b-none">типовая модель, не конкретная установка</span></div></div>
  <div class="anat">
    <div>
      <div class="anat-controls" role="toolbar" aria-label="Управление анатомией">
        <div class="seg" id="modeSeg" role="group" aria-label="Режим">
          <button data-mode="overview" aria-pressed="true">1 · Общий вид</button><button data-mode="apart">2 · Взрыв-схема</button><button data-mode="work">3 · Работа</button><button data-mode="detail">4 · Узел</button><button data-mode="deps">5 · Зависимости</button>
        </div>
        <span class="sep"></span>
        <button class="btn" id="playBtn" aria-pressed="false">▶ Старт</button>
        <label class="muted" style="font-size:12px">скорость <select id="speedSel"><option value="0.25">0,25×</option><option value="0.5" selected>0,5× учебная</option><option value="1">1×</option><option value="2">2×</option></select></label>
        <button class="btn" id="apartBtn" aria-pressed="false">Разобрать</button>
        <button class="btn" id="housingBtn" aria-pressed="true">Корпус: показан</button>
        <select id="nodeSel" aria-label="Выбрать узел"><option value="">— выбрать узел —</option>${SYS.map((s) => `<option value="${s.id}">${s.id} · ${esc(s.name)}</option>`).join("")}</select>
        <button class="btn" id="physBtn" aria-pressed="false">Физический процесс</button>
        <button class="btn" id="toTechBtn">Перейти к технологии →</button>
        <button class="btn" id="resetBtn">Сброс вида</button>
      </div>
      <div class="fig iso" data-theme="${isoTheme()}">
        <figure class="iso-figure"><div class="iso-plate">
          <div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Рис. 1</span><span class="iso-plate-corner" data-corner="title">LPBF · типовая компоновка</span><span class="iso-plate-corner" data-corner="hint" id="figHint">нажмите на узел</span><span class="iso-plate-corner" data-corner="readout" id="figReadout">слой 12 · 40 мкм</span></div>
          <div class="iso-stage" id="anatStage" tabindex="0" role="group" aria-label="Интерактивная схема установки: нажмите на узел, чтобы выбрать его"></div>
        </div></figure>
      </div>
      <div class="cycle" id="cycle"></div>
      <div class="fig-legend"><span><i style="background:#ff6a1a"></i>луч и трек сканирования (условно)</span><span><i style="background:var(--accent)"></i>выбранный узел</span><span>Шаг опускания платформы и толщина слоя на схеме увеличены для наглядности; реальный слой — 20–60 мкм.</span></div>
      <h3 style="margin-top:22px">Сквозная цепочка для выбранного узла</h3>
      <p class="muted" style="font-size:12.5px">Изделие → подсистема → узел → технология → ВНТ → НИОКТР → коллективы → патенты → рынок → поддержка → дефициты → проект развития. Нажмите на шаг, чтобы перейти.</p>
      <div class="chain" id="chain"></div>
    </div>
    <aside class="card side" id="side"></aside>
  </div>`;
  $("#cycle").innerHTML = ["Дозирование порошка", "Нанесение слоя", "Контроль слоя", "Сканирование и сплавление", "Возврат рекотера", "Опускание платформы"].map((x, i) => `<div data-ph="${i}">${String(i + 1)}. ${x}</div>`).join("");
  anat = await mountAnatomy($("#anatStage"), {
    onSelect: (id) => { state.node = id; $("#nodeSel").value = id || ""; renderSide(); renderChain(); if (mode === "detail") anat.focus(id); },
    onPhase: (ph, layer, pi) => { document.querySelectorAll("#cycle div").forEach((d, i) => d.classList.toggle("on", i === pi)); },
    onHover: (id, e) => showTip(id ? `<b>${id}</b> · ${esc(sysById[id].name)}` : null, e),
  });
  anat.onTick((info) => { $("#figReadout").textContent = `слой ${info.layer} · ${D.products.product.typical[1] ? "40 мкм" : ""} · ${info.phase.label.toLowerCase()}`; });
  let mode = "overview";
  const setMode = (m) => {
    mode = m;
    document.querySelectorAll("#modeSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    anat.setApart(m === "apart"); $("#apartBtn").setAttribute("aria-pressed", String(m === "apart")); $("#apartBtn").textContent = m === "apart" ? "Собрать" : "Разобрать";
    if (m === "work") { anat.setHousing(false); setPlay(true); }
    if (m === "overview") { anat.setHousing(true); anat.focus(null); }
    if (m === "detail") { anat.setHousing(false); if (!state.node) anatSelect("S03"); anat.focus(state.node || "S03"); } else anat.focus(null);
    if (m === "deps" && !state.node) anatSelect("S09");
    syncHousingBtn(); $("#figHint").textContent = { overview: "нажмите на узел", apart: "узлы раздвинуты, связи сохранены", work: "цикл послойного построения", detail: "камера приближена к узлу", deps: "технологии выбранной детали" }[m];
    renderSide();
  };
  const syncHousingBtn = () => { const on = anat.state.housing; $("#housingBtn").setAttribute("aria-pressed", String(on)); $("#housingBtn").textContent = on ? "Корпус: показан" : "Корпус: скрыт"; };
  const setPlay = (on) => { const r = anat.play(on); $("#playBtn").textContent = r ? "❚❚ Пауза" : "▶ Старт"; $("#playBtn").setAttribute("aria-pressed", String(r)); };
  anatSelect = (id, fromOutside) => { anat.select(id, { silent: true }); state.node = id; $("#nodeSel").value = id || ""; renderSide(); renderChain(); if (mode === "detail" || fromOutside) { if (fromOutside && mode === "overview") anat.setHousing(false), syncHousingBtn(); if (mode === "detail") anat.focus(id); } };
  $("#modeSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
  $("#playBtn").addEventListener("click", () => setPlay(!anat.state.running));
  $("#speedSel").addEventListener("change", (e) => anat.setSpeed(+e.target.value));
  $("#apartBtn").addEventListener("click", () => setMode(mode === "apart" ? "overview" : "apart"));
  $("#housingBtn").addEventListener("click", () => { anat.setHousing(!anat.state.housing); syncHousingBtn(); });
  $("#nodeSel").addEventListener("change", (e) => anatSelect(e.target.value || null));
  $("#physBtn").addEventListener("click", () => { const on = $("#physBtn").getAttribute("aria-pressed") !== "true"; $("#physBtn").setAttribute("aria-pressed", String(on)); anat.setForceScan(on); if (on) { anat.setHousing(false); syncHousingBtn(); anatSelect("S03"); setPlay(true); } renderSide(on ? "phys" : null); });
  $("#toTechBtn").addEventListener("click", () => { state.tech = state.node ? techsOfNode(state.node)[0] : "T10"; go("tech", { force: true }); });
  $("#resetBtn").addEventListener("click", () => { anat.reset(); setPlay(false); $("#physBtn").setAttribute("aria-pressed", "false"); setMode("overview"); syncHousingBtn(); renderSide(); renderChain(); });
  $("#anatStage").addEventListener("keydown", (e) => {
    const ids = SYS.map((s) => s.id); const i = ids.indexOf(state.node);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { anatSelect(ids[(i + 1) % ids.length]); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { anatSelect(ids[(i - 1 + ids.length) % ids.length]); e.preventDefault(); }
    if (e.key === "Escape") anatSelect(null);
  });
  function renderSide(extra) {
    const side = $("#side");
    if (extra === "phys" || (!extra && $("#physBtn").getAttribute("aria-pressed") === "true")) { side.innerHTML = physPanel(); return; }
    const id = state.node;
    if (!id) {
      side.innerHTML = `<h2>${esc(D.products.product.short)}</h2><p class="muted" style="font-size:12.5px">Выберите узел на схеме или в списке. 12 подсистем имеют устойчивые идентификаторы S01–S12, связанные с данными.</p>
      <div class="sec"><h4>Подсистемы</h4><div class="node-list">${SYS.map((s) => `<button data-pick="${s.id}"><span class="id">${s.id}</span>${esc(s.short)}</button>`).join("")}</div></div>
      <div class="sec"><h4>Типовые параметры класса</h4><dl class="kv">${D.products.product.typical.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl><p class="src" style="margin-top:6px">${esc(D.products.product.typicalNote)}</p></div>`;
    } else {
      const s = sysById[id]; const comps = COMP.filter((c) => c.sys === id);
      const deps = mode === "deps";
      side.innerHTML = `<div class="pill-row"><span class="badge b-acc">${id}</span><span class="muted" style="font-size:12px">критичность ${"●".repeat(s.criticality)}${"○".repeat(5 - s.criticality)}</span></div>
      <h2 style="margin-top:6px">${esc(s.name)}</h2><p style="font-size:13px">${esc(s.purpose)}</p>
      ${deps ? depsBlock(id) : `
      <div class="sec"><h4>Принцип работы</h4><p style="font-size:13px">${esc(s.principle)}</p></div>
      <div class="sec"><h4>Компоненты</h4>${comps.map((c) => `<div style="font-size:12.5px;margin:4px 0"><span class="mono muted">${c.id}</span> ${esc(c.name)}</div>`).join("")}</div>
      <div class="sec"><h4>Физические процессы</h4><ul class="list" style="font-size:12.5px">${s.physics.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="sec"><h4>Материалы</h4><ul class="list" style="font-size:12.5px">${s.materials.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="sec"><h4>Компетенции</h4><div class="chips">${s.competences.map((x) => `<span class="chip static">${esc(x)}</span>`).join("")}</div></div>
      <div class="sec"><h4>Критичные характеристики</h4><ul class="list" style="font-size:12.5px">${s.critical.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="sec"><h4>Зависит от узлов</h4><div class="chips">${s.deps.map(chipS).join("")}</div></div>
      <div class="sec"><h4>Технологии</h4><div class="chips">${techsOfNode(id).map(chipT).join("")}</div><p class="src" style="margin-top:6px">Режим «5 · Зависимости» раскладывает технологии по уровням создания/функционирования/контроля.</p></div>
      ${mode === "detail" ? `<div class="sec"><h4>Устройство узла (схема)</h4>${schematic(id)}</div>` : ""}`}`;
    }
    side.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => anatSelect(b.dataset.pick)));
  }
  function depsBlock(id) {
    const comps = COMP.filter((c) => c.sys === id);
    const byTech = new Map();
    for (const c of comps) for (const t of [...c.techCreate, ...c.techOperate]) { if (!byTech.has(t)) byTech.set(t, []); if (!byTech.get(t).includes(c)) byTech.get(t).push(c); }
    const order = { create: 0, operate: 1, produce: 2, control: 3 };
    const rows = [...byTech].map(([t, cs]) => [cs, t, techById[t]?.level || "operate"]).sort((a, b) => order[a[2]] - order[b[2]] || a[1].localeCompare(b[1]));
    const produce = TECH.flatMap((t) => t.subs.filter((s) => s.level === "produce" && t.nodes.includes(id) && !byTech.has(s.id)));
    return `<div class="sec"><h4>Технологии, необходимые для узла</h4><div class="dep-tech">${rows.map(([cs, t, l]) => `<div class="row">${lvlBadge(l)}<div><b class="mono" style="font-size:11.5px">${esc(t)}</b> ${esc(techById[t]?.name || "")}<div class="muted" style="font-size:11.5px">${cs.map((c) => esc(c.id) + " · " + esc(c.name)).join("; ")}</div></div></div>`).join("")}
    ${produce.map((t) => `<div class="row">${lvlBadge("produce")}<div><b class="mono" style="font-size:11.5px">${t.id}</b> ${esc(t.name)}<div class="muted" style="font-size:11.5px">технология производства изделия на установке</div></div></div>`).join("")}</div>
    <p class="src" style="margin-top:8px">Уровни не смешиваются: создание узла, функционирование узла, производство готового изделия, контроль качества. Классификация — рабочая авторская.</p></div>
    <div class="sec"><h4>ВНТ</h4><div class="chips">${vntOfTechs(techsOfNode(id)).map(chipV).join("")}</div></div>`;
  }
  function physPanel() {
    return `<span class="badge b-acc">Физический процесс</span><h2 style="margin-top:6px">Сплавление в ванне расплава</h2>
    <p style="font-size:13px">Пятно лазера диаметром ≈ 50–100 мкм движется со скоростью до нескольких м/с. Порошок поглощает излучение, плавится и образует ванну расплава длиной в сотни мкм, которая за доли миллисекунды кристаллизуется в трек. Перекрывающиеся треки образуют сечение детали; новый слой частично переплавляет предыдущий.</p>
    <div class="sec">${meltSchematic()}</div>
    <div class="sec"><h4>Ключевые явления</h4><ul class="list" style="font-size:12.5px"><li>Поглощение излучения порошком (многократное отражение между частицами)</li><li>Конвекция Марангони — течение по градиенту поверхностного натяжения</li><li>Испарение, отдача паров и брызги (spatter)</li><li>Режим «замочной скважины» при избыточной плотности энергии → поры</li><li>Недоплавление при недостаточной энергии → несплавления</li><li>Высокие скорости охлаждения → остаточные напряжения</li></ul></div>
    <div class="sec"><h4>Связанные технологии</h4><div class="chips">${["T09", "T10", "T01", "T03", "T06"].map(chipT).join("")}</div></div>
    <p class="note" style="margin-top:10px">Свечение и трек на схеме — условная визуализация, а не физический расчёт температуры или размеров ванны.</p>`;
  }
  function renderChain() {
    const id = state.node;
    const el = $("#chain");
    if (!id) { el.innerHTML = `<div class="empty" style="grid-column:1/-1">Выберите узел на схеме — здесь появится сквозная цепочка от узла до проекта развития.</div>`; return; }
    const ts = techsOfNode(id); const rs = resOfNode(id); const os = orgsOfRes(rs); const rids = ridsOfTechs(ts); const pats = patentsOfNode(id);
    const sup = suppliersOfNode(id); const supCount = sup.reduce((a, g) => a + g.ru.length + g.foreign.length, 0);
    const meas = supportOfTechs(ts); const defs = deficitsOfNode(id); const vnts = vntOfTechs(ts);
    const step = (k, v, d, act) => `<div class="step" data-act="${act}"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${esc(d)}</div></div>`;
    el.innerHTML = [
      step("Узел", id, sysById[id].name, "node"),
      step("Технологии", ts.length, ts.map((t) => techById[t].name.replace("Технологии ", "")).join("; "), "tech"),
      step("ВНТ", vnts.length, vnts.map((v) => "№ " + vntById[v].num).join(", "), "nptl"),
      step("НИОКТР", rs.length, rs.slice(0, 3).map((r) => r.card.executor).join("; ") || "в выборке нет", "research"),
      step("Коллективы", os.length, os.slice(0, 3).map((o) => o.name.split(" (")[0]).join("; ") || "—", "orgs"),
      step("РИД и патенты", rids.length + pats.length, `${rids.length} РИД ЕГИСУ, ${pats.length} зарубежных документов`, "patents"),
      step("Рынок", supCount, sup.map((g) => g.nodeName).join("; ") || "нет данных", "market"),
      step("Поддержка", meas.length, meas.map((m) => m.operator).join("; "), "support"),
      step("Дефициты", defs.length, defs.map((d) => d.title).join("; ") || "не выявлено", "gaps"),
      step("Проект развития", D.support.devProject.covers.some((c) => defs.find((d) => d.id === c)) ? "да" : "—", D.support.devProject.title.replace("Проект развития (аналитическая гипотеза): ", ""), "gaps"),
      step("Граф", "→", "окрестность узла в графе знаний", "graph"),
      step("Источники", "→", "реестр источников и ограничений", "sources"),
    ].join("");
    el.onclick = (e) => {
      const s = e.target.closest("[data-act]"); if (!s) return;
      const a = s.dataset.act;
      if (a === "node") return anat.focus(id);
      if (a === "tech") { state.tech = ts[0]; return go("tech", { force: true }); }
      if (a === "research") { state.res = { node: id }; return go("research", { force: true }); }
      if (a === "orgs") { state.org = null; state.orgFilter = os.map((o) => o.id); return go("orgs", { force: true }); }
      if (a === "graph") { state.graphFocus = id; return go("graph", { force: true }); }
      go(a, { force: true });
    };
  }
  renderSide(); renderChain();
  if (state.node) anatSelect(state.node);
};

function schematic(id) {
  const S = {
    S03: `<svg class="schem" viewBox="0 0 320 170"><g fill="none" stroke="currentColor" stroke-width="1.2" style="color:var(--muted)"><rect x="20" y="70" width="40" height="22" rx="3"/><line x1="60" y1="81" x2="130" y2="81" stroke="#ff6a1a" stroke-width="2"/><g class="mx"><line x1="125" y1="95" x2="150" y2="68" stroke="var(--text)" stroke-width="3"/><animateTransform attributeName="transform" type="rotate" values="-6 137 81;6 137 81;-6 137 81" dur="1.4s" repeatCount="indefinite"/></g><line x1="137" y1="81" x2="200" y2="40" stroke="#ff6a1a" stroke-width="2"/><g><line x1="190" y1="30" x2="215" y2="52" stroke="var(--text)" stroke-width="3"/><animateTransform attributeName="transform" type="rotate" values="5 202 41;-5 202 41;5 202 41" dur="0.9s" repeatCount="indefinite"/></g><path d="M202 41 L240 120" stroke="#ff6a1a" stroke-width="2"/><rect x="215" y="100" width="54" height="10" rx="2"/><line x1="200" y1="150" x2="300" y2="150"/></g><text x="18" y="108">коллиматор</text><text x="108" y="112">зеркало X</text><text x="196" y="22">зеркало Y</text><text x="272" y="108">f-theta</text><text x="210" y="164">плоскость построения</text></svg><p class="src">Два гальванометрических зеркала отклоняют пучок по X и Y; f-theta объектив держит фокус в плоскости. Анимация условна.</p>`,
    S07: `<svg class="schem" viewBox="0 0 320 150"><g stroke="currentColor" style="color:var(--muted)" fill="none" stroke-width="1.2"><rect x="10" y="100" width="300" height="30"/><rect x="110" y="104" width="100" height="26" stroke-dasharray="3 3"/></g><g><rect x="0" y="60" width="16" height="36" rx="2" fill="var(--text)"/><path d="M16 96 l14 4 h-14z" fill="#9a968c"/><animateTransform attributeName="transform" type="translate" values="20 0;270 0;20 0" dur="4s" repeatCount="indefinite"/></g><path d="M20 100 H300" stroke="#9a968c" stroke-width="3"/><text x="12" y="145">стол</text><text x="120" y="145">колодец построения</text><text x="8" y="52">лезвие рекотера и валик порошка</text></svg><p class="src">Лезвие переносит валик порошка и оставляет слой 20–60 мкм. Масштаб условный.</p>`,
    S09: `<svg class="schem" viewBox="0 0 320 170"><g fill="none" stroke="currentColor" stroke-width="1.2" style="color:var(--muted)"><rect x="130" y="40" width="40" height="40" transform="rotate(45 150 60)"/><rect x="220" y="44" width="60" height="32" rx="4"/><circle cx="60" cy="60" r="12"/></g><line x1="10" y1="60" x2="150" y2="60" stroke="#ff6a1a" stroke-width="2"/><line x1="150" y1="60" x2="150" y2="150" stroke="#ff6a1a" stroke-width="2"/><line x1="150" y1="140" x2="150" y2="62" stroke="#62a0ff" stroke-width="1.5" stroke-dasharray="3 3"/><line x1="152" y1="60" x2="220" y2="60" stroke="#62a0ff" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="150" cy="150" r="6" fill="url(#mg2)"/><defs><radialGradient id="mg2"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient></defs><text x="125" y="25">дихроичный светоделитель</text><text x="222" y="92">фотодиод / камера</text><text x="160" y="160">ванна расплава</text><text x="10" y="50">лазер</text></svg><p class="src">Излучение ванны возвращается по оптическому тракту и отводится светоделителем на датчики (коаксиальная схема).</p>`,
    S01: `<svg class="schem" viewBox="0 0 320 120"><g fill="none" stroke="currentColor" stroke-width="1.2" style="color:var(--muted)"><rect x="10" y="40" width="50" height="40" rx="3"/><path d="M60 60 C90 20,120 100,150 60 S210 20,240 60"/><rect x="240" y="50" width="30" height="20" rx="3"/><line x1="96" y1="44" x2="96" y2="76"/><line x1="204" y1="44" x2="204" y2="76"/></g><line x1="270" y1="60" x2="315" y2="60" stroke="#ff6a1a" stroke-width="2.5"/><text x="12" y="95">диоды накачки</text><text x="80" y="35">ВБР</text><text x="120" y="100">Yb-волокно</text><text x="190" y="35">ВБР</text><text x="238" y="90">QBH</text></svg><p class="src">Резонатор из волоконных брэгговских решёток в активном Yb-волокне.</p>`,
  };
  return S[id] || `<p class="muted" style="font-size:12.5px">Камера приближена к узлу на схеме. Внутренние элементы — в списке компонентов (C${id.slice(1)}.x). Детальная схема для этого узла в макете не построена.</p>`;
}
function meltSchematic() {
  return `<svg class="schem" viewBox="0 0 320 160"><defs><radialGradient id="mp" cx=".45" cy=".3"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#ff9a3c"/><stop offset="1" stop-color="#ff3d00" stop-opacity=".1"/></radialGradient></defs>
  <rect x="0" y="95" width="320" height="65" fill="var(--panel)"/><g fill="#a7a49b">${Array.from({ length: 34 }, (_, i) => `<circle cx="${8 + i * 9.4}" cy="${88 + (i % 3)}" r="4.2"/>`).join("")}</g>
  <path d="M0 95 H120 Q160 125 200 95" fill="none" stroke="var(--muted)"/><path d="M120 95 Q160 128 200 95 Z" fill="url(#mp)"/>
  <path d="M0 100 H120" stroke="#c9c3b5" stroke-width="5"/><line x1="170" y1="0" x2="160" y2="92" stroke="#ff6a1a" stroke-width="3"/>
  <path d="M140 105 q15 10 30 0" fill="none" stroke="#fff" stroke-width="1" marker-end="url(#a)"/><circle cx="185" cy="72" r="1.6" fill="#ffb347"><animate attributeName="cy" values="88;50;88" dur="1.1s" repeatCount="indefinite"/></circle>
  <text x="6" y="118">затвердевший трек</text><text x="205" y="118">порошок</text><text x="176" y="20">лазерный пучок</text><text x="126" y="140">ванна (условно)</text><text x="196" y="66">брызги</text></svg>`;
}

// ---------------- 02 НПТЛ и ВНТ ----------------
RENDER.nptl = (el) => {
  const opsBy = D.products.operations;
  const techVnt = (v) => TECH.filter((t) => t.vnt.includes(v));
  el.innerHTML = `<div class="section-head"><div><h1>НПТЛ → федеральный проект → ВНТ → технология → операция → узел</h1>
  <p>Связи многозначны: одна технология относится к нескольким ВНТ, одна ВНТ — к нескольким ФП. Наименования и коды НП/ФП подтверждены справочником ЕГИСУ НИОКТР; уровни ниже ВНТ — авторская рабочая классификация.</p></div></div>
  <div class="split"><div class="card tree" id="nptlTree"></div>
  <div><div class="card"><h3>Применимость федеральных проектов</h3>${NPTL.fps.map((f) => `<div style="margin-top:10px"><div class="pill-row"><span class="mono">${f.code}</span><b style="font-size:13px">${esc(f.name)}</b></div><div style="font-size:12.5px;margin-top:3px">${esc(f.applicability)}</div><div class="src">сила связи: ${"●".repeat(f.strength)}${"○".repeat(3 - f.strength)}</div></div>`).join("")}<p class="note info" style="margin-top:12px">${esc(NPTL.passportNote)}</p></div>
  <div class="card"><h3>Важнейшие наукоёмкие технологии (Указ № 529)</h3>${NPTL.vnt.map((v) => `<div style="margin-top:10px"><div class="pill-row"><span class="badge ${v.priority === "основная" ? "b-acc" : "b-warn"}">ВНТ № ${v.num} · ${v.priority}</span><span class="src">${v.kind}, код ЕГИСУ ${v.egisu.slice(0, 3)}…</span></div><div style="font-size:13px;margin-top:3px">${esc(v.name)}</div>${v.rationale ? `<div class="note" style="margin-top:6px">${esc(v.rationale)}</div>` : ""}</div>`).join("")}<p class="src" style="margin-top:10px">${esc(NPTL.vntNote)}</p></div>
  <div class="card"><h3>НИОКТР с привязкой к ФП в ЕГИСУ</h3><p class="muted" style="font-size:12.5px">Всего / связанных с аддитивными технологиями (по названию)</p><div class="bars" style="margin-top:8px">${D.research.stats.byFp.map(([c, n, a]) => `<div class="bar"><span class="mono">${c}</span><div class="track"><div class="fill" style="width:${(n / 90) * 100}%;background:var(--line-2)"><div style="width:${(a / n) * 100}%;height:100%;background:var(--accent)"></div></div></div><span class="num">${a}/${n}</span></div>`).join("")}</div></div></div></div>`;
  const tree = `<details open><summary><span class="lab">НП</span><b>Национальные проекты технологического лидерства</b></summary>
  ${NPTL.projects.map((p) => `<details open><summary><span class="lab">НП</span>${esc(p.name)} <span class="mono muted">${p.code}</span></summary>
    ${NPTL.fps.filter((f) => f.np === p.id).map((f) => `<details ${f.strength >= 2 ? "open" : ""}><summary><span class="lab">ФП</span>${esc(f.name)} <span class="mono muted">${f.code}</span></summary>
      ${NPTL.fpVnt.filter(([fp]) => fp === f.id).map(([, v]) => `<details ${f.strength >= 3 ? "open" : ""}><summary><span class="lab">ВНТ</span>№ ${vntById[v].num}. ${esc(vntById[v].name.slice(0, 90))}${vntById[v].name.length > 90 ? "…" : ""}</summary>
        ${techVnt(v).map((t) => `<details><summary><span class="lab">Техн.</span>${esc(t.id)} ${esc(t.name)}</summary>
          ${t.subs.map((s) => { const ops = opsBy.filter((o) => o.techs.includes(s.id)); return `<details><summary><span class="lab">Предм.</span><span class="mono">${s.id}</span> ${esc(s.name)} ${lvlBadge(s.level)}</summary>
            ${(ops.length ? ops : [{ id: "—", name: "операция цикла не выделена (технология создания/контроля)", nodes: t.nodes }]).map((o) => `<div class="leaf"><span class="lab">Операция</span>${esc(o.name)} → ${o.nodes.map(chipS).join("")}</div>`).join("")}</details>`; }).join("")}
        </details>`).join("")}
      </details>`).join("")}
    </details>`).join("")}
  </details>`).join("")}</details>`;
  $("#nptlTree", el).innerHTML = `<h3 style="margin-bottom:8px">Интерактивное дерево</h3>${tree}`;
};

// ---------------- 03 ТЕХНОЛОГИИ ----------------
RENDER.tech = (el) => {
  const cur = state.tech || "T10";
  const t = techById[cur];
  const rs = resOfTech(cur); const rids = RIDS.filter((r) => r.techs.includes(cur)); const pats = D.patents.patents.filter((p) => p.techs.includes(cur));
  const byLevel = Object.keys(LEVELS).map((l) => [l, t.subs.filter((s) => s.level === l)]);
  el.innerHTML = `<div class="section-head"><div><h1>Предметные технологии T01–T15</h1><p>Рабочая классификация макета (не официальная). Для каждого направления — 3–4 конкретизированные технологии, разнесённые по уровням: создание узла, функционирование узла, производство изделия, контроль качества.</p></div></div>
  <div class="split"><div>
    <div class="card"><div class="table-wrap" style="max-height:none"><table><thead><tr><th>Код</th><th>Направление</th><th>Узлы</th><th>ВНТ</th><th>НИОКТР</th><th>РИД</th></tr></thead><tbody>
    ${TECH.map((x) => `<tr class="clickable" data-t="${x.id}" ${x.id === cur ? 'style="background:var(--accent-soft)"' : ""}><td class="mono">${x.id}</td><td>${esc(x.name)}</td><td>${x.nodes.map((n) => `<span class="mono">${n}</span>`).join(" ")}</td><td>${x.vnt.map((v) => vntById[v].num).join(", ")}</td><td>${resOfTech(x.id).length}</td><td>${RIDS.filter((r) => r.techs.includes(x.id)).length}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="card"><h3>Матрица «технология × узел»</h3><p class="muted" style="font-size:12px">Число связей: подсистема требует направление, компоненты требуют предметные технологии.</p><div style="overflow:auto">${techNodeMatrix()}</div></div>
  </div>
  <div class="card side"><span class="badge b-link">${t.id}</span><h2 style="margin-top:6px">${esc(t.name)}</h2>
    <div class="chips" style="margin-top:6px">${t.nodes.map(chipS).join("")}${t.vnt.map(chipV).join("")}</div>
    ${byLevel.map(([l, subs]) => subs.length ? `<div class="sec"><h4>${esc(LEVELS[l])}</h4>${subs.map((s) => `<div style="font-size:13px;margin:4px 0"><span class="mono muted">${s.id}</span> ${esc(s.name)}</div>`).join("")}</div>` : "").join("")}
    ${cur === "T10" ? `<div class="sec"><h4>Пример углублённой декомпозиции</h4><div class="flow-steps">${D.technologies.t10chain.map((c, i) => `${i ? '<span class="arrow">→</span>' : ""}<span class="chip static" title="${esc(c.kind)}">${esc(c.step)}</span>`).join("")}</div></div>` : ""}
    <div class="sec"><h4>Выполненные НИОКТР (ЕГИСУ) · ${rs.length}</h4>${rs.map((r) => `<div style="font-size:12.5px;margin:5px 0"><button class="chip" data-go-res="${esc(r.id)}">${esc(r.id)}</button> ${esc(r.card.name.slice(0, 110))}${r.card.name.length > 110 ? "…" : ""} <span class="muted">— ${esc(r.card.executor)}, ${year(r.card.start)}–${year(r.card.end)}</span></div>`).join("") || '<div class="empty">В выборке НИОКТР по названиям не найдено — пробел данных или требуется расширенный поиск по аннотациям.</div>'}</div>
    <div class="sec"><h4>РИД (ЕГИСУ) · ${rids.length}</h4>${rids.slice(0, 12).map((r) => `<div style="font-size:12px;margin:3px 0"><span class="badge b-none">${esc(r.type)}</span> ${esc(r.name)}</div>`).join("") || '<span class="muted">—</span>'}</div>
    <div class="sec"><h4>Публикации российских авторов (Crossref) · ${(D.publications.byTech[cur] || []).length}</h4>${(D.publications.byTech[cur] || []).map((p) => `<div style="font-size:12px;margin:3px 0"><span class="mono muted">${p.year}</span> ${esc(p.title)} <a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi</a><div class="faint">${esc(p.aff)}</div></div>`).join("") || '<span class="muted">тематический поиск в Crossref не дал релевантных статей по LPBF</span>'}</div>
    <div class="sec"><h4>Зарубежные патентные документы · ${pats.length}</h4>${pats.map((p) => `<div style="font-size:12px;margin:3px 0"><span class="mono">${esc(p.number)}</span> ${esc(p.title)}</div>`).join("") || '<span class="muted">—</span>'}</div>
  </div></div>`;
  el.querySelectorAll("tr[data-t]").forEach((tr) => tr.addEventListener("click", () => { state.tech = tr.dataset.t; RENDER.tech(el); }));
};
function techNodeMatrix() {
  const cnt = (t, s) => (sysById[s].techs.includes(t.id) ? 1 : 0) + COMP.filter((c) => c.sys === s).reduce((a, c) => a + [...c.techCreate, ...c.techOperate].filter((x) => topTech(x) === t.id).length, 0);
  return `<table class="matrix"><thead><tr><th></th>${SYS.map((s) => `<th title="${esc(s.name)}" class="mono">${s.id}</th>`).join("")}</tr></thead><tbody>${TECH.map((t) => `<tr><td class="h"><span class="mono">${t.id}</span></td>${SYS.map((s) => { const n = cnt(t, s.id); return `<td><div class="cell c${Math.min(4, n)}" title="${t.id} × ${s.id}: ${n}">${n || ""}</div></td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
}

// ---------------- 04 НИОКТР ----------------
RENDER.research = (el) => {
  const f = state.res || {};
  el.innerHTML = `<div class="section-head"><div><h1>ЕГИСУ НИОКТР: научно-технологический задел</h1>
  <p>Подключение к ЕГИСУ НИОКТР найдено (коннектор <span class="mono">egisuopen</span>, открытые данные: карточки НИОКТР, РИД, ИКРБС, диссертации). Поиск выполнен по каждой предметной технологии с регулярными выражениями и синонимами по названиям карточек; ниже — ${RES.length} отобранных НИОКТР и ${RIDS.length} РИД с регистрационными номерами из первоисточника.</p></div></div>
  <div class="grid g4" style="margin-bottom:14px">
    <div class="card stat"><b>${D.research.stats.byYear.reduce((a, [, n]) => a + n, 0)}</b><span>НИОКТР по СЛП/послойному лазерному сплавлению (2012–2026, по названию)</span></div>
    <div class="card stat"><b>${RES.length}</b><span>карточек в макете с аналитической разметкой</span></div>
    <div class="card stat"><b>${RIDS.length}</b><span>РИД, связанных с технологиями LPBF</span></div>
    <div class="card stat"><b>${D.research.stats.dissertations.reduce((a, [, n]) => a + n, 0)}</b><span>диссертаций по СЛП (по организациям, ЕГИСУ)</span></div>
  </div>
  <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Динамика: НИОКТР по году начала</h3>${colChart(D.research.stats.byYear)}<p class="src">${esc(D.research.stats.queryNote)}</p></div>
  <div class="card"><h3>Диссертации по СЛП по организациям</h3><div class="bars" style="margin-top:8px">${D.research.stats.dissertations.slice(0, 9).map(([o, n]) => `<div class="bar"><span>${esc(o)}</span><div class="track"><div class="fill" style="width:${(n / 7) * 100}%"></div></div><span class="num">${n}</span></div>`).join("")}</div></div></div>
  <div class="card"><div class="toolbar"><input type="search" id="resQ" placeholder="Поиск: номер, название, исполнитель…" style="min-width:280px">
  <select id="resT"><option value="">все технологии</option>${TECH.map((t) => `<option value="${t.id}">${t.id} ${esc(t.name.slice(0, 50))}</option>`).join("")}</select>
  <select id="resN"><option value="">все узлы</option>${SYS.map((s) => `<option value="${s.id}" ${f.node === s.id ? "selected" : ""}>${s.id} ${esc(s.short)}</option>`).join("")}</select>
  <select id="resC"><option value="">все заказчики</option>${[...new Set(RES.map((r) => r.card.customer).filter(Boolean))].sort().map((c) => `<option>${esc(c)}</option>`).join("")}</select>
  <span class="muted" id="resCount" style="font-size:12px"></span></div>
  <div class="table-wrap"><table><thead><tr><th>Рег. номер</th><th>Название (карточка)</th><th>Исполнитель</th><th>Сроки</th><th>Заказчик / основание</th><th>Бюджет*</th><th>РИД</th><th>Технологии (аналитика)</th></tr></thead><tbody id="resBody"></tbody></table></div>
  <p class="src" style="margin-top:8px">* Значение поля budget_sum карточки; единица в открытой выгрузке не указана (по порядку величин — тыс. руб.). Зелёные поля — из карточки, оранжевые — аналитическая разметка макета.</p></div>`;
  const draw = () => {
    const qv = $("#resQ").value.toLowerCase(), tv = $("#resT").value, nv = $("#resN").value, cv = $("#resC").value;
    const list = RES.filter((r) => (!qv || (r.id + r.card.name + r.card.executor).toLowerCase().includes(qv)) && (!tv || r.analytic.techs.includes(tv)) && (!nv || r.analytic.nodes.includes(nv)) && (!cv || r.card.customer === cv)).sort((a, b) => (b.card.start || "").localeCompare(a.card.start || ""));
    $("#resCount").textContent = `${list.length} из ${RES.length}`;
    $("#resBody").innerHTML = list.map((r) => `<tr class="clickable" data-r="${esc(r.id)}"><td class="mono">${esc(r.id)}</td><td>${esc(r.card.name)}</td><td>${esc(r.card.executor)}<div class="src">${esc(r.card.region)}</div></td><td class="mono">${year(r.card.start)}–${year(r.card.end)}</td><td>${esc(r.card.customer || "—")}<div class="src">${esc(r.card.basis)}</div></td><td class="mono" style="text-align:right">${fmtBudget(r.card.budget)}</td><td>${r.card.ridCount}</td><td><div class="chips">${r.analytic.techs.map((t) => `<span class="chip t static">${t}</span>`).join("")}</div></td></tr>`).join("");
  };
  ["resQ", "resT", "resN", "resC"].forEach((id) => $("#" + id).addEventListener("input", draw));
  $("#resBody").addEventListener("click", (e) => { const tr = e.target.closest("[data-r]"); if (tr) openResearch(tr.dataset.r); });
  draw();
};
function colChart(rows) {
  const max = Math.max(...rows.map(([, n]) => n));
  return `<div class="colchart">${rows.map(([y, n], i) => `<div class="col ${i === rows.length - 1 ? "partial" : ""}" title="${y}: ${n}"><em>${n}</em><b style="height:${(n / max) * 100}%"></b><span>${String(y).slice(2)}</span></div>`).join("")}</div>`;
}
function openResearch(id) {
  const r = resById[id]; if (!r) return;
  const rids = RIDS.filter((x) => x.nioktr === id);
  const org = orgById[r.analytic.org];
  openDrawer(`<span class="badge b-link">НИОКТР · ЕГИСУ</span><h2 style="margin:8px 0 4px">${esc(r.card.name)}</h2>
  <h4 style="margin-top:14px">Регистрационная карточка <span class="tag-src card">первоисточник</span></h4>
  <dl class="kv" style="margin-top:8px"><dt>Рег. номер</dt><dd class="mono">${esc(r.id)}</dd><dt>Исполнитель</dt><dd>${esc(r.card.executor)}${org ? ` · <button class="chip" data-go-org="${org.id}">карточка организации</button>` : ""}</dd><dt>Регион</dt><dd>${esc(r.card.region)}</dd><dt>Заказчик / источник</dt><dd>${esc(r.card.customer || "не раскрыт")}</dd><dt>Основание</dt><dd>${esc(r.card.basis)}</dd><dt>Сроки</dt><dd>${esc(r.card.start)} — ${esc(r.card.end)}</dd><dt>Статус</dt><dd>${r.card.end < "2026-11-11" ? "срок выполнения истёк (статус ИКРБС не проверялся)" : "выполняется по срокам карточки"}</dd><dt>Бюджет (budget_sum)</dt><dd>${fmtBudget(r.card.budget)}</dd><dt>Связанные РИД</dt><dd>${r.card.ridCount}</dd>${r.card.fp ? `<dt>ФП НПТЛ</dt><dd class="mono">${r.card.fp} · ${esc(NPTL.fps.find((f) => f.code === r.card.fp)?.name || "")}</dd>` : ""}</dl>
  ${r.card.annotation ? `<h4 style="margin-top:14px">Аннотация (выдержка из карточки)</h4><p style="font-size:13px;margin-top:6px">${esc(r.card.annotation)}</p>` : `<p class="src" style="margin-top:10px">Аннотация, цель, методы и публикации в макет не выгружались — доступны в карточке ЕГИСУ по номеру.</p>`}
  ${rids.length ? `<h4 style="margin-top:14px">РИД из ЕГИСУ</h4>${rids.map((x) => `<div style="font-size:12.5px;margin:4px 0"><span class="badge b-none">${esc(x.type)}</span> ${esc(x.name)} <span class="mono muted">${esc(x.id)}</span></div>`).join("")}` : ""}
  <h4 style="margin-top:16px">Аналитическая разметка <span class="tag-src an">вывод макета</span></h4>
  <div class="chips" style="margin-top:6px">${r.analytic.techs.map(chipT).join("")}${r.analytic.nodes.map(chipS).join("")}</div>
  <p style="font-size:12.5px;margin-top:6px">Релевантность: <b>${esc(r.analytic.relevance)}</b>${r.analytic.note ? `. ${esc(r.analytic.note)}` : ""}</p>
  <p class="src" style="margin-top:14px">Источник: ${srcLink("E-EGISU-NIOKTR")}. Карточку можно найти в ЕГИСУ по регистрационному номеру.</p>`);
}

// ---------------- 05 КОМПЕТЕНЦИИ ----------------
RENDER.orgs = (el) => {
  const tf = state.orgTech || "";
  const filt = state.orgFilter;
  const pr = map.proj;
  const project = ([lon, lat]) => { const R = Math.PI / 180; const l = lon < -20 ? lon + 360 : lon; const rho = pr.G - lat * R, th = pr.n * (l - pr.lon0) * R; return [(rho * Math.sin(th) - pr.minX) * pr.s, (-(pr.G - rho * Math.cos(th)) - pr.minY) * pr.s]; };
  const groups = {};
  for (const o of ORGS) { const key = o.coords.join(","); (groups[key] ||= []).push(o); }
  el.innerHTML = `<div class="section-head"><div><h1>Карта научных компетенций</h1><p>Карточки организаций построены только на найденных свидетельствах (ЕГИСУ: НИОКТР, РИД, диссертации; отдельные сведения СМИ — с пометкой). Наличие публикации не означает готовности создать промышленный компонент; оценка соответствия технологии — качественная, с основанием.</p></div></div>
  <div class="split"><div>
    <div class="card"><div class="toolbar"><select id="orgT"><option value="">все технологии</option>${TECH.map((t) => `<option value="${t.id}" ${tf === t.id ? "selected" : ""}>${t.id} ${esc(t.name.slice(0, 50))}</option>`).join("")}</select>${filt ? `<span class="badge b-acc">фильтр: организации выбранного узла</span> <button class="btn" id="orgClr">сбросить</button>` : ""}<span class="src">● — город подтверждён карточкой ЕГИСУ · ○ — указан только регион (точка в центре субъекта)</span></div>
    <div class="map"><svg viewBox="-10 -10 ${map.width + 20} ${map.height + 20}" role="img" aria-label="Карта организаций России"><path class="land" d="${map.d}"/>
    ${(() => { const placed = []; return Object.values(groups).sort((a, b) => b.length - a.length).map((g) => { const [x, y] = project(g[0].coords); const vis = g.filter((o) => (!tf || o.fit.some(([t]) => t === tf)) && (!filt || filt.includes(o.id))); const clash = placed.some(([px, py]) => Math.abs(px - x) < 60 && Math.abs(py - y) < 12); placed.push([x, y]); const name = g[0].city.split(" (")[0]; return `<g>${clash ? "" : `<text class="city" x="${x + 9}" y="${y + 3}">${esc(name)}${g.length > 1 ? " · " + g.length : ""}</text>`}<title>${esc(name)}</title><circle class="dot ${g[0].precision === "регион" ? "reg" : ""} ${vis.length ? "" : "dim"}" cx="${x}" cy="${y}" r="${4 + Math.sqrt(vis.length || g.length) * 3}" data-orgs="${g.map((o) => o.id).join(",")}"/></g>`; }).join(""); })()}
    </svg></div><p class="src">${esc(map.source)}. Коническая равнопромежуточная проекция.</p></div>
    <div class="card"><h3>Таблица исследовательских коллективов</h3><div class="table-wrap"><table><thead><tr><th>Организация</th><th>Тип</th><th>НИОКТР</th><th>Статьи Crossref</th><th>Соответствие технологиям (основание)</th></tr></thead><tbody id="orgBody"></tbody></table></div></div>
  </div><div class="card side" id="orgSide"></div></div>`;
  const draw = () => {
    const tv = $("#orgT").value; state.orgTech = tv;
    const list = ORGS.filter((o) => (!tv || o.fit.some(([t]) => t === tv)) && (!state.orgFilter || state.orgFilter.includes(o.id)));
    $("#orgBody").innerHTML = list.map((o) => `<tr class="clickable" data-o="${o.id}"><td><b>${esc(o.name)}</b><div class="src">${esc(o.city)}</div></td><td>${esc(o.type)}</td><td>${(o.evidence?.nioktr || []).length}</td><td>${o.evidence?.crossref || "—"}</td><td>${o.fit.filter(([t]) => !tv || t === tv).map(([t, l, b]) => `<div style="margin:2px 0"><span class="chip t static">${t}</span> <span class="badge ${l === "высокий" ? "b-ok" : l === "средний" ? "b-warn" : "b-none"}">${l}</span> <span style="font-size:12px">${esc(b)}</span></div>`).join("")}</td></tr>`).join("");
  };
  const side = (id) => {
    const o = orgById[id] || orgById[state.org] || ORGS[0];
    const ev = o.evidence || {};
    $("#orgSide").innerHTML = `<span class="badge b-link">${esc(o.type)}</span><h2 style="margin-top:6px">${esc(o.name)}</h2><div class="src">${esc(o.city)} · точность местоположения: ${esc(o.precision)}</div>
    <div class="sec"><h4>Свидетельства</h4><dl class="kv">
      <dt>Опубликованные исследования</dt><dd>${ev.crossref ? `${ev.crossref} статей по LPBF/СЛП в Crossref (2019–2026, аффилиация подтверждена метаданными)` : "в Crossref по запросу не найдено"}${ev.published ? "; " + esc(ev.published) : ""}</dd>
      <dt>Выполненные НИОКТР</dt><dd><div class="chips">${(ev.nioktr || []).map(chipR).join("") || "—"}</div></dd>
      <dt>Экспериментальная инфраструктура</dt><dd>${esc(ev.infrastructure || "нет подтверждения в собранных источниках")}</dd>
      <dt>Прототипы</dt><dd>${esc(ev.prototypes || "нет подтверждения")}</dd>
      <dt>Патенты / РИД</dt><dd>${esc(ev.patents || "нет подтверждения")}</dd>
      <dt>Собственное оборудование</dt><dd>${esc(ev.equipment || "нет подтверждения")}</dd>
      <dt>Производственные мощности</dt><dd>${esc(ev.production || "нет подтверждения")}</dd></dl></div>
    <div class="sec"><h4>Соответствие технологиям (качественно)</h4>${o.fit.map(([t, l, b]) => `<div style="margin:6px 0;font-size:12.5px">${chipT(t)} <span class="badge ${l === "высокий" ? "b-ok" : l === "средний" ? "b-warn" : "b-none"}">${l}</span><div>${esc(b)}</div></div>`).join("")}</div>
    ${(D.publications.byOrg[o.id] || []).length ? `<div class="sec"><h4>Публикации (Crossref, по цитируемости)</h4>${D.publications.byOrg[o.id].slice(0, 8).map((p) => `<div style="font-size:12px;margin:5px 0"><span class="mono muted">${p.year}</span> ${esc(p.title)} <span class="muted">— ${esc(p.authors)}, ${esc(p.journal)}</span> <a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi</a> <span class="faint">цит. ${p.cited}</span></div>`).join("")}<p class="src">Наличие публикаций не означает готовности создать промышленный компонент.</p></div>` : ""}
    ${o.sources ? `<div class="sec src">Источники: ${o.sources.map(srcLink).join("; ")}</div>` : ""}`;
  };
  $("#orgT").addEventListener("change", () => RENDER.orgs(el));
  $("#orgClr")?.addEventListener("click", () => { state.orgFilter = null; RENDER.orgs(el); });
  $("#orgBody").addEventListener("click", (e) => { const tr = e.target.closest("[data-o]"); if (tr) side(tr.dataset.o); });
  el.querySelector(".map svg").addEventListener("click", (e) => { const c = e.target.closest("[data-orgs]"); if (c) side(c.dataset.orgs.split(",")[0]); });
  el.querySelector(".map svg").addEventListener("pointermove", (e) => { const c = e.target.closest("[data-orgs]"); showTip(c ? c.dataset.orgs.split(",").map((id) => esc(orgById[id].name)).join("<br>") : null, e); });
  el.querySelector(".map svg").addEventListener("pointerleave", (e) => showTip(null, e));
  draw(); side(state.org);
};

// ---------------- 06 ПАТЕНТЫ ----------------
RENDER.patents = (el) => {
  const P = D.patents;
  const ru = RIDS.filter((r) => P.ruInventions.includes(r.id));
  const fams = {};
  for (const p of P.patents) (fams[p.family] ||= []).push(p);
  const techsAll = TECH.map((t) => t.id);
  el.innerHTML = `<div class="section-head"><div><h1>Патентный ландшафт</h1><p>Приоритетные направления: подача порошка, рекотеры, сканирование, управление мощностью, мониторинг расплава, газовая защита, алгоритмы управления, прецизионные механизмы.</p></div></div>
  <p class="note" style="margin-bottom:14px">${esc(P.note)}</p>
  <div class="grid g3" style="margin-bottom:14px"><div class="card stat"><b>${ru.length}</b><span>РИД ЕГИСУ вида «изобретение» / «полезная модель» по LPBF (уровень B)</span></div><div class="card stat"><b>${P.patents.length}</b><span>зарубежных патентных документов, ${Object.keys(fams).length} предполагаемых семейств (уровень C)</span></div><div class="card stat"><b>${RIDS.filter((r) => r.type.startsWith("Секрет")).length}</b><span>ноу-хау в выборке РИД</span></div></div>
  <div class="card"><h3>Матрица: технология × документ × правообладатель × юрисдикция × статус</h3><div style="overflow:auto"><table class="matrix" style="min-width:900px"><thead><tr><th style="text-align:left">Документ</th><th>Юрисд.</th><th style="text-align:left">Правообладатель</th><th>Статус</th><th>Подтв.</th>${techsAll.map((t) => `<th class="mono">${t}</th>`).join("")}</tr></thead><tbody>
  ${P.patents.map((p) => `<tr><td class="h"><span class="mono">${esc(p.number)}</span></td><td>${p.juris}</td><td class="h" style="font-size:11px;max-width:200px;white-space:normal">${esc(p.applicant)}</td><td><span class="badge b-none">${esc(p.status)}</span></td><td><span class="badge b-warn">${p.conf}</span></td>${techsAll.map((t) => `<td><div class="cell ${p.techs.includes(t) ? "c4" : "c0"}">${p.techs.includes(t) ? "●" : ""}</div></td>`).join("")}</tr>`).join("")}
  ${ru.map((r) => `<tr><td class="h" style="white-space:normal;max-width:260px;font-size:11px">${esc(r.name.slice(0, 70))}${r.name.length > 70 ? "…" : ""}</td><td>RU</td><td class="h" style="font-size:11px">${esc(resById[r.nioktr]?.card.executor || "исполнитель НИОКТР не в выборке")}</td><td><span class="badge b-none">РИД учтён</span></td><td><span class="badge b-link">B</span></td>${techsAll.map((t) => `<td><div class="cell ${r.techs.includes(t) ? "c3" : "c0"}">${r.techs.includes(t) ? "●" : ""}</div></td>`).join("")}</tr>`).join("")}
  </tbody></table></div><p class="src" style="margin-top:6px">Уровни подтверждения: A — запись реестра проверена; B — карточка РИД в ЕГИСУ (номер охранного документа ФИПС в открытой выгрузке не раскрыт); C — номер и название из поисковой выдачи, правообладатель и статус не проверены; D — гипотеза.</p></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Семейства и предполагаемая область применения</h3>${Object.entries(fams).map(([f, ps]) => `<div class="sec"><div class="mono muted" style="font-size:11px">${f}</div>${ps.map((p) => `<div style="margin:6px 0;font-size:12.5px"><b class="mono">${esc(p.number)}</b> — ${esc(p.title)}<div>${p.nodes.map(chipS).join(" ")} <span class="badge b-warn">связь: ${p.conf === "C" ? "предполагаемая" : "подтверждённая"}</span></div><div class="muted">Признаки, относящиеся к узлу: ${esc(p.claimHint)}</div><div class="src">${srcLink(p.src)}</div></div>`).join("")}</div>`).join("")}</div>
  <div><div class="card"><h3>Ноу-хау</h3><p style="font-size:13px;margin-top:6px">${esc(P.knowhow.text)}</p><p style="font-size:13px;margin-top:8px">${esc(P.knowhow.observed)}</p><div class="sec"><h4>Ноу-хау в выборке</h4>${RIDS.filter((r) => r.type.startsWith("Секрет")).map((r) => `<div style="font-size:12px;margin:3px 0">${esc(r.name)} <span class="mono muted">${esc(r.id)}</span></div>`).join("")}</div></div>
  <div class="card"><h3>Не смешивать</h3><ul class="list" style="font-size:13px">${P.knowhow.caution.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div></div></div>`;
};

// ---------------- 07 РЫНОК ----------------
RENDER.market = (el) => {
  const S = D.suppliers;
  el.innerHTML = `<div class="section-head"><div><h1>Рынок, поставщики и импортная зависимость</h1><p>Узел → российские производители → зарубежные производители → подтверждённая доступность → правовые ограничения → возможность локализации. Цены, сроки поставки, складские остатки и доступность в России не приводятся — таких подтверждённых сведений нет.</p></div></div>
  <div class="card" style="margin-bottom:14px"><h3>Матрица технологической и импортной зависимости</h3><div style="overflow:auto"><table class="matrix" style="min-width:820px"><thead><tr><th style="text-align:left">Узел</th><th>Российские<br>предложения</th><th>Стадия RU</th><th>Зарубежные</th><th>Доминирующий режим</th><th>Дефицит</th><th style="text-align:left">Возможность локализации (аналитика)</th></tr></thead><tbody>
  ${S.suppliers.map((g) => { const ruProd = g.ru.filter((r) => r.avail === "ok").length; const stage = ruProd ? "продукт" : g.ru.length ? "НИОКР / опытный образец" : "нет данных"; const worst = g.foreign.some((f) => f.avail === "restricted") ? "restricted" : g.foreign.some((f) => f.avail === "check") ? "check" : "none"; const def = D.support.deficits.find((d) => d.nodes.includes(g.node)); return `<tr><td class="h"><b>${esc(g.nodeName)}</b> <span class="mono muted">${g.node}</span></td><td><div class="cell ${g.ru.length ? (ruProd ? "c3" : "c1") : "c0"}">${g.ru.length}</div></td><td style="font-size:11.5px">${stage}</td><td><div class="cell c2">${g.foreign.length}</div></td><td>${availBadge(worst)}</td><td>${def ? `<span class="badge b-bad">${def.id}</span>` : "—"}</td><td class="h" style="white-space:normal;font-size:11.5px;max-width:320px">${esc(def ? def.need : g.gap || "Есть отечественные решения; требуется подтверждение характеристик и объёмов")}</td></tr>`; }).join("")}
  </tbody></table></div></div>
  <div class="grid g2">${S.suppliers.map((g) => `<div class="card"><div class="pill-row"><h3>${esc(g.nodeName)}</h3>${g.node !== "S00" ? chipS(g.node) : ""}</div>
    ${g.gap ? `<p class="note" style="margin-top:8px">${esc(g.gap)}</p>` : ""}
    ${g.ru.length ? `<h4 style="margin-top:10px">Россия</h4>${g.ru.map((s) => `<div style="margin:6px 0;font-size:12.5px"><b>${esc(s.name)}</b> ${availBadge(s.avail)}<div>${esc(s.product)}</div><div class="src">Основание: ${esc(s.evidence)}${s.note ? " · " + esc(s.note) : ""}</div></div>`).join("")}` : ""}
    ${g.foreign.length ? `<h4 style="margin-top:10px">Зарубежные</h4>${g.foreign.map((s) => `<div style="margin:6px 0;font-size:12.5px"><b>${esc(s.name)}</b> <span class="muted">${esc(s.country)}</span> ${availBadge(s.avail)}<div>${esc(s.product)}</div><div class="src">${esc(s.note)}</div></div>`).join("")}` : ""}</div>`).join("")}</div>
  <div class="card" style="margin-top:14px"><h3>Экспортный контроль и санкционные ограничения применительно к России</h3><div class="grid g3" style="margin-top:10px">${S.exportRegimes.map((r) => `<div><div class="pill-row"><b>${esc(r.name)}</b><span class="badge ${r.status.startsWith("действ") ? "b-bad" : "b-warn"}">${esc(r.status)}</span></div><p style="font-size:12.5px;margin-top:4px">${esc(r.basis)}</p><p class="src" style="margin-top:4px">Проверка: ${esc(r.verify)}${r.src ? " · " + srcLink(r.src) : ""}</p></div>`).join("")}</div>
  <div class="sec"><h4>Коды компонентов LPBF в Supplement No. 4 к 15 CFR 746 (США), ред. 01.11.2026</h4><div class="table-wrap" style="max-height:none"><table><thead><tr><th>HTS-6</th><th>Позиция</th><th>Узел</th><th>В перечне</th></tr></thead><tbody>${S.htsCodes.map((h) => `<tr><td class="mono">${h.code}</td><td>${esc(h.name)}</td><td>${chipS(h.node)}</td><td>${h.listed ? '<span class="badge b-bad">да — политика отказа</span>' : '<span class="badge b-none">не найден</span>'}</td></tr>`).join("")}</tbody></table></div><p class="src" style="margin-top:6px">Отнесение конкретного изделия к HTS-коду — задача классификации; наличие кода в перечне означает лицензионное требование для товаров, подпадающих под EAR. ${srcLink("E-ECFR-746")}</p></div>
  <div class="sec"><h4>Категории вывода</h4><div class="pill-row">${Object.entries(S.avail).map(([k, v]) => `${availBadge(k)} <span style="font-size:12px;margin-right:10px">${esc(v)}</span>`).join("")}</div></div>
  <div class="sec"><h4>Принципы</h4><ul class="list" style="font-size:12.5px">${S.exportPrinciples.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div></div>`;
};

// ---------------- 08 ПОДДЕРЖКА ----------------
RENDER.support = (el) => {
  const st = D.support.stages;
  el.innerHTML = `<div class="section-head"><div><h1>Инструменты поддержки по стадиям</h1><p>Паспорта мер поддержки с датой проверки. Соответствие программы конкретному проекту не утверждается без проверки заявителя и всех конкурсных условий.</p></div></div>
  <div class="card" style="overflow:auto;margin-bottom:14px"><h3 style="margin-bottom:10px">Шкала стадий</h3><div class="stages"><div></div>${st.map((s) => `<div class="hd">${esc(s)}</div>`).join("")}
  ${D.support.support.map((m) => `<div class="nm" data-m="${m.id}">${esc(m.name.split(":")[0])}<div class="src">${esc((m.name.split(":")[1] || "").trim().slice(0, 60))}</div></div>${st.map((_, i) => `<div class="st ${m.stages.includes(i) ? "on" : ""}" title="${m.stages.includes(i) ? esc(st[i]) : ""}"></div>`).join("")}`).join("")}</div></div>
  <div class="grid g2" id="supCards">${D.support.support.map((m) => `<div class="card" id="m-${m.id}"><span class="badge b-link">${esc(m.operator)}</span><h3 style="margin-top:6px">${esc(m.name)}</h3>
  <dl class="kv" style="margin-top:8px"><dt>Предмет</dt><dd>${esc(m.subject)}</dd><dt>Заявители</dt><dd>${esc(m.applicants)}</dd><dt>Стадии</dt><dd>${m.stages.map((i) => esc(st[i])).join(", ")}</dd><dt>Условия</dt><dd>${esc(m.conditions)}</dd><dt>Сумма</dt><dd>${esc(m.amount)}</dd><dt>Софинансирование</dt><dd>${esc(m.cofin)}</dd><dt>Допустимые расходы</dt><dd>${esc(m.costs)}</dd><dt>Сроки</dt><dd>${esc(m.term)}</dd><dt>Статус</dt><dd>${esc(m.status)}</dd><dt>Применимость</dt><dd>${esc(m.fit)}</dd><dt>Проверено</dt><dd class="mono">${esc(m.checked)}</dd></dl>
  <p class="src" style="margin-top:6px">${m.src.map(srcLink).join("; ") || "источник не исследован"}</p></div>`).join("")}</div>`;
  el.querySelectorAll("[data-m]").forEach((n) => n.addEventListener("click", () => $("#m-" + n.dataset.m).scrollIntoView({ behavior: "smooth", block: "center" })));
};

// ---------------- 09 ГРАФ ----------------
let cy = null;
const TYPES = ["Product", "Assembly", "Component", "Technology", "Process", "VNT", "NationalProject", "ResearchProject", "Organization", "ResearchTeam", "Publication", "Patent", "Manufacturer", "Supplier", "SupportMeasure", "Evidence"];
const TYPE_RU = { Product: "Изделие", Assembly: "Подсистема", Component: "Компонент", Technology: "Технология", Process: "Процесс", VNT: "ВНТ", NationalProject: "НП/ФП", ResearchProject: "НИОКТР", Organization: "Организация", ResearchTeam: "Коллектив", Publication: "Публикации", Patent: "Патент/РИД", Manufacturer: "Производитель", Supplier: "Поставщик", SupportMeasure: "Мера поддержки", Evidence: "Источник" };
const color = (t) => getComputedStyle(document.documentElement).getPropertyValue("--c-" + t).trim() || "#888";
function styleGraph() {
  const txt = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
  cy.style([
    { selector: "node", style: { "background-color": (n) => color(n.data("type")), label: (n) => (["Product", "Assembly", "VNT", "NationalProject", "Organization"].includes(n.data("type")) || n.data("level") === "group" ? n.data("label") : ""), "font-size": 7, color: txt, "text-valign": "bottom", "text-margin-y": 2, width: (n) => ({ Product: 26, Assembly: 18, VNT: 18, NationalProject: 16, Technology: n.data("level") === "group" ? 14 : 8 })[n.data("type")] || 10, height: (n) => ({ Product: 26, Assembly: 18, VNT: 18, NationalProject: 16, Technology: n.data("level") === "group" ? 14 : 8 })[n.data("type")] || 10, "text-wrap": "ellipsis", "text-max-width": 90, "min-zoomed-font-size": 6 } },
    { selector: "edge", style: { width: 0.7, "line-color": "#9aa0a6", opacity: 0.45, "curve-style": "haystack" } },
    { selector: ".faded", style: { opacity: 0.08 } },
    { selector: "node:selected", style: { "border-width": 3, "border-color": "#d9480f" } },
    { selector: ".hl", style: { opacity: 1, width: 1.4, "line-color": "#d9480f", "font-size": 8 } },
    { selector: "node.hl", style: { label: "data(label)" } },
  ]);
}
RENDER.graph = (el) => {
  const G = D.graph;
  const edgeTypes = [...new Set(G.edges.map((e) => e.type))];
  el.innerHTML = `<div class="section-head"><div><h1>Граф знаний</h1><p>${G.nodes.length} вершин 16 типов и ${G.edges.length} связей (${edgeTypes.join(", ")}). Нажмите на вершину, чтобы увидеть окрестность и сведения.</p></div></div>
  <div class="split"><div><div class="toolbar"><input type="search" id="gq" placeholder="Найти вершину…"><select id="gLayout"><option value="cose">силовая раскладка</option><option value="concentric">концентрическая по типу</option><option value="breadthfirst">иерархия от изделия</option></select><button class="btn" id="gFit">Вписать</button><button class="btn" id="gAll">Показать всё</button></div>
  <div class="legend-types" id="gTypes" style="margin-bottom:8px">${TYPES.map((t) => `<label><input type="checkbox" value="${t}" checked hidden><i style="background:var(--c-${t})"></i>${TYPE_RU[t]} <span class="faint">${G.nodes.filter((n) => n.type === t).length}</span></label>`).join("")}</div>
  <div id="cy" role="img" aria-label="Граф знаний"></div></div><div class="card side" id="gSide"><p class="muted">Выберите вершину графа.</p><div class="sec"><h4>Типы связей</h4>${edgeTypes.map((t) => `<div class="mono" style="font-size:11.5px">${t} · ${G.edges.filter((e) => e.type === t).length}</div>`).join("")}</div></div></div>`;
  if (!window.cytoscape) { $("#cy").innerHTML = '<div class="empty">Библиотека Cytoscape.js не загружена.</div>'; return; }
  cy = window.cytoscape({ container: $("#cy"), elements: [...G.nodes.map((n) => ({ data: n })), ...G.edges.map((e) => ({ data: e }))], wheelSensitivity: 0.25, minZoom: 0.1, maxZoom: 4 });
  styleGraph();
  const layout = (name) => cy.layout({ name, animate: false, nodeDimensionsIncludeLabels: false, idealEdgeLength: 60, nodeRepulsion: 9000, gravity: 0.25, numIter: 1500, concentric: (n) => 16 - TYPES.indexOf(n.data("type")), levelWidth: () => 1, roots: name === "breadthfirst" ? "#P-LPBF" : undefined, spacingFactor: name === "breadthfirst" ? 0.7 : 1 }).run();
  layout("cose");
  const focusNode = (n) => {
    cy.elements().addClass("faded").removeClass("hl");
    const nb = n.closedNeighborhood(); nb.removeClass("faded").addClass("hl");
    const d = n.data();
    const links = n.connectedEdges().map((e) => { const o = e.source().id() === d.id ? e.target() : e.source(); return `<div style="font-size:12px;margin:2px 0"><span class="mono muted">${e.data("type")}</span> → <a href="#" data-gn="${esc(o.id())}">${esc(o.data("label"))}</a> <span class="faint">${TYPE_RU[o.data("type")]}</span></div>`; }).join("");
    $("#gSide").innerHTML = `<span class="badge" style="background:${color(d.type)};color:#fff">${TYPE_RU[d.type]}</span><h3 style="margin-top:6px">${esc(d.label)}</h3>${d.full ? `<p style="font-size:12.5px">${esc(d.full)}</p>` : ""}<div class="mono muted" style="font-size:11px">${esc(d.id)}</div>
    <div class="pill-row" style="margin-top:8px">${sysById[d.id] ? chipS(d.id) : ""}${techById[d.id] ? chipT(d.id) : ""}${resById[d.id] ? chipR(d.id) : ""}${orgById[d.id] ? `<button class="chip" data-go-org="${d.id}">карточка</button>` : ""}</div>
    <div class="sec"><h4>Связи · ${n.connectedEdges().length}</h4>${links}</div>`;
    $("#gSide").querySelectorAll("[data-gn]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const m = cy.$id(a.dataset.gn); cy.$(":selected").unselect(); m.select(); focusNode(m); cy.animate({ center: { eles: m }, duration: 300 }); }));
  };
  cy.on("tap", "node", (e) => focusNode(e.target));
  cy.on("tap", (e) => { if (e.target === cy) cy.elements().removeClass("faded hl"); });
  $("#gLayout").addEventListener("change", (e) => layout(e.target.value));
  $("#gFit").addEventListener("click", () => cy.fit(undefined, 20));
  $("#gAll").addEventListener("click", () => { cy.elements().removeClass("faded hl"); cy.nodes().style("display", "element"); el.querySelectorAll("#gTypes input").forEach((i) => { i.checked = true; i.parentElement.style.opacity = 1; }); });
  $("#gTypes").addEventListener("click", (e) => { const lab = e.target.closest("label"); if (!lab) return; e.preventDefault(); const inp = lab.querySelector("input"); inp.checked = !inp.checked; lab.style.opacity = inp.checked ? 1 : 0.4; cy.nodes(`[type = "${inp.value}"]`).style("display", inp.checked ? "element" : "none"); });
  $("#gq").addEventListener("change", (e) => { const v = e.target.value.toLowerCase(); const m = cy.nodes().filter((n) => (n.data("label") + " " + (n.data("full") || "") + n.id()).toLowerCase().includes(v)); if (m.length) { cy.$(":selected").unselect(); m[0].select(); focusNode(m[0]); cy.animate({ center: { eles: m[0] }, zoom: 1.6, duration: 300 }); } });
  if (state.graphFocus) { const n = cy.$id(state.graphFocus); if (n.length) { n.select(); focusNode(n); setTimeout(() => cy.animate({ center: { eles: n }, zoom: 1.4, duration: 300 }), 50); } state.graphFocus = null; }
};

// ---------------- 10 ДЕФИЦИТЫ И ПРОЕКТ ----------------
RENDER.gaps = (el) => {
  const S = D.support;
  const pj = S.devProject;
  el.innerHTML = `<div class="section-head"><div><h1>Технологические дефициты и проект развития</h1><p>Аналитический слой атласа: где данные показывают разрыв между потребностью узла и подтверждённым отечественным предложением.</p></div></div>
  <div class="grid g3">${S.deficits.map((d) => `<div class="card"><div class="pill-row"><span class="badge b-bad">${d.id}</span><span class="muted" style="font-size:12px">острота ${"●".repeat(d.severity)}${"○".repeat(5 - d.severity)}</span></div><h3 style="margin-top:6px">${esc(d.title)}</h3><div class="chips" style="margin:6px 0">${d.nodes.map(chipS).join("")}${d.techs.map(chipT).join("")}</div><h4 style="margin-top:8px">Основания</h4><ul class="list" style="font-size:12.5px">${d.evidence.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h4 style="margin-top:8px">Потребность</h4><p style="font-size:12.5px">${esc(d.need)}</p></div>`).join("")}</div>
  <div class="card" style="margin-top:14px"><span class="badge b-acc">аналитическая гипотеза</span><h2 style="margin-top:6px">${esc(pj.title.replace("Проект развития (аналитическая гипотеза): ", ""))}</h2><p style="margin-top:6px">${esc(pj.goal)}</p><p class="note" style="margin-top:8px">${esc(pj.disclaimer)}</p>
  <div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Стадия</th><th>Содержание</th><th>Организации с заделом</th><th>Инструменты поддержки</th></tr></thead><tbody>${pj.stages.map((s) => `<tr><td>${esc(S.stages[s.stage])}</td><td>${esc(s.name)}</td><td>${s.orgs.map((o) => `<button class="chip" data-go-org="${o}">${esc(orgById[o].name.split(" (")[0])}</button>`).join(" ")}</td><td>${s.support.map((m) => `<span class="chip static">${esc(supById[m].name.split(":")[0])}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>
  <h4 style="margin-top:12px">Показатели результата</h4><ul class="list" style="font-size:13px">${pj.kpis.map((k) => `<li>${esc(k)}</li>`).join("")}</ul><div class="chips" style="margin-top:8px">${pj.covers.map((c) => `<span class="badge b-bad">${c}</span>`).join(" ")}</div></div>`;
};

// ---------------- 11 ИСТОЧНИКИ ----------------
RENDER.sources = (el) => {
  el.innerHTML = `<div class="section-head"><div><h1>Источники, доказательства и ограничения</h1><p>Внешние источники использовались на этапе подготовки; при показе макета доступ к API не требуется — все данные локальны (<span class="mono">data/*.json</span>).</p></div></div>
  <div class="card"><div class="table-wrap" style="max-height:none"><table><thead><tr><th>ID</th><th>Тип</th><th>Источник</th><th>Способ доступа</th><th>Надёжность</th><th>Дата</th></tr></thead><tbody>${D.evidence.map((s) => `<tr><td class="mono">${s.id}</td><td>${esc(s.type)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></td><td>${esc(s.via)}</td><td>${esc(s.reliability)}</td><td class="mono">${s.date}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Что проверено</h3><ul class="list" style="font-size:13px"><li>ЕГИСУ НИОКТР — через подключённый коннектор: карточки НИОКТР, РИД, диссертации, справочники НП/ФП и ВНТ по Указу № 529.</li><li>Веб-поиск — меры поддержки, рынок, экспортные режимы, патентные номера (по выдаче).</li><li>Навык Anatomy — установлен из github.com/wheresryan22/anatomy, кит использован для геометрии.</li></ul></div>
  <div class="card"><h3>Ограничения сессии подготовки</h3><ul class="list" style="font-size:13px"><li>Сеть окружения расширена (окружение «basa»): rscf.ru, Crossref, EUR-Lex, eCFR теперь доступны — конкурс РНФ № 3052, Приложение VII ЕС и Supplement No. 4 США проверены по первоисточникам, 153 публикации собраны через Crossref.</li><li>ФИПС, Espacenet, Google Patents, gisp.gov.ru, fasie.ru, frprf.ru отвечают 403/503 (защита сайтов от автоматических запросов) → патентов уровня A нет; для EPO OPS нужен бесплатный ключ разработчика.</li><li>OpenAlex — исчерпан бесплатный дневной лимит общего IP; нужен бесплатный API-ключ. Elicit — нет API-доступа по тарифу.</li><li>gisp.gov.ru, fasie.ru, frprf.ru — сведения получены через поисковую выдачу и вторичные источники.</li><li>Решение № 22-68462-00692-Р: версия 7 от 03.07.2026 проверена по sudact.ru (ссылку предоставил пользователь) — субсидия до 70 % затрат на НИР, внебюджетные средства ≥ 50 % субсидии, срок до 3 лет.</li></ul><p class="src" style="margin-top:8px">Подробно — research/research-log.md, research/source-registry.md, research/gaps.md.</p></div></div>`;
};

go(location.hash.slice(1) || "anatomy");
