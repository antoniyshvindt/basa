// Генерация data/*.json из модулей tools/data/*.mjs. Запуск: node tools/build-data.mjs
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { product, subsystems, components, operations } from "./data/product.mjs";
import { technologies, LEVELS, t10chain } from "./data/technologies.mjs";
import { research, rids, stats } from "./data/research.mjs";
import { orgs } from "./data/orgs.mjs";
import { patents, patentNote, knowhow, suppliers, AVAIL, exportRegimes, exportPrinciples } from "./data/market.mjs";
import { nptl, support, STAGES, deficits, devProject, sources } from "./data/policy.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const w = (name, data) => { writeFileSync(join(OUT, name), JSON.stringify(data, null, 1)); console.log("data/" + name); };

// проверки целостности ссылок
const sysIds = new Set(subsystems.map((s) => s.id));
const techIds = new Set(technologies.flatMap((t) => [t.id, ...t.subs.map((s) => s.id)]));
const resIds = new Set(research.map((r) => r.id));
const problems = [];
for (const c of components) for (const t of [...c.techCreate, ...c.techOperate]) if (!techIds.has(t)) problems.push(`component ${c.id}: ${t}`);
for (const r of research) for (const t of r.analytic.techs) if (!techIds.has(t)) problems.push(`research ${r.id}: ${t}`);
for (const r of research) for (const n of r.analytic.nodes) if (!sysIds.has(n)) problems.push(`research ${r.id}: ${n}`);
for (const r of research) if (r.analytic.org && !orgs.find((o) => o.id === r.analytic.org)) problems.push(`research ${r.id}: org ${r.analytic.org}`);
if (problems.length) { console.error(problems); process.exit(1); }

const teams = [
  { id: "TEAM-SPBPU-NTI", name: "Центр НТИ «Новые производственные технологии» (ИППТ СПбПУ)", org: "ORG-SPBPU", basis: "Наименование из карточек ЕГИСУ АААА-А19-119090690066-1, АААА-А20-120102990016-9" },
  { id: "TEAM-SPBPU-NCMU", name: "НЦМУ «Передовые цифровые технологии» (СПбПУ)", org: "ORG-SPBPU", basis: "Карточка ЕГИСУ 122042900021-5" },
  { id: "TEAM-BMSTU-NTI", name: "Центр НТИ на базе МГТУ им. Н.Э. Баумана", org: "ORG-BMSTU", basis: "Карточка ЕГИСУ 121062900111-2" },
  { id: "TEAM-KAI-CAT", name: "ЦАТ КАИ (центр аддитивных технологий)", org: "ORG-KAI", basis: "Наименование в карточке ЕГИСУ 125072809100-3" },
];

w("products.json", { product, subsystems, operations });
w("components.json", components);
w("technologies.json", { levels: LEVELS, technologies, t10chain, nptl });
w("research.json", { research, rids, stats, teams });
w("organizations.json", orgs);
w("patents.json", { note: patentNote, patents, knowhow, ruInventions: rids.filter((r) => r.type === "Изобретение" || r.type === "Полезная модель").map((r) => r.id) });
w("suppliers.json", { avail: AVAIL, suppliers, exportRegimes, exportPrinciples });
w("support.json", { stages: STAGES, support, deficits, devProject });
w("evidence.json", sources);

// ---------- граф знаний ----------
const nodes = new Map();
const edges = [];
const N = (id, type, label, extra = {}) => { if (!nodes.has(id)) nodes.set(id, { id, type, label, ...extra }); };
const E = (s, t, type) => { if (nodes.has(s) && nodes.has(t)) edges.push({ id: `${s}|${type}|${t}`, source: s, target: t, type }); };

N(product.id, "Product", product.short);
for (const s of subsystems) { N(s.id, "Assembly", `${s.id} ${s.short}`); E(s.id, product.id, "PART_OF"); }
for (const c of components) { N(c.id, "Component", c.name); E(c.id, c.sys, "PART_OF"); }
for (const t of technologies) {
  N(t.id, "Technology", `${t.id} ${t.name.replace(/^Технологии /, "")}`, { level: "group" });
  for (const st of t.subs) { N(st.id, "Technology", `${st.id}`, { full: st.name, level: st.level }); E(st.id, t.id, "PART_OF"); }
}
for (const o of operations) { N(o.id, "Process", o.name); for (const n of o.nodes) E(o.id, n, "IMPLEMENTS"); for (const t of o.techs) E(o.id, t, "REQUIRES"); }
for (const c of components) { for (const t of c.techCreate) E(c.id, t, "REQUIRES"); for (const t of c.techOperate) E(c.id, t, "REQUIRES"); }
for (const s of subsystems) { for (const t of s.techs) E(s.id, t, "REQUIRES"); for (const d of s.deps) E(s.id, d, "DEPENDS_ON"); }
for (const v of nptl.vnt) N(v.id, "VNT", `ВНТ № ${v.num}`, { full: v.name });
for (const p of nptl.projects) N(p.id, "NationalProject", p.name.replace("Национальный проект ", "НП "));
for (const f of nptl.fps) { N(f.id, "NationalProject", `ФП ${f.code}`, { full: f.name }); E(f.id, f.np, "PART_OF"); }
for (const [f, v] of nptl.fpVnt) E(v, f, "CONTRIBUTES_TO_NPTL");
for (const t of technologies) for (const v of t.vnt) E(t.id, v, "BELONGS_TO_VNT");
for (const o of orgs) N(o.id, "Organization", o.name.replace(/\s*\(.*\)$/, "").slice(0, 48));
for (const tm of teams) { N(tm.id, "ResearchTeam", tm.name); E(tm.id, tm.org, "PART_OF"); }
for (const r of research) {
  N(r.id, "ResearchProject", r.id, { full: r.card.name });
  for (const t of r.analytic.techs) E(t, r.id, "RESEARCHED_IN");
  if (r.analytic.org) E(r.id, r.analytic.org, "EXECUTED_BY");
  if (r.card.fp) { const fp = nptl.fps.find((f) => f.code === r.card.fp); if (fp) E(r.id, fp.id, "CONTRIBUTES_TO_NPTL"); }
}
E("122042900021-5", "TEAM-SPBPU-NCMU", "EXECUTED_BY");
E("121062900111-2", "TEAM-BMSTU-NTI", "EXECUTED_BY");
E("125072809100-3", "TEAM-KAI-CAT", "EXECUTED_BY");
for (const rd of rids) {
  const type = rd.type === "Изобретение" || rd.type === "Полезная модель" ? "Patent" : "Evidence";
  N("RID-" + rd.id, type, rd.type === "Изобретение" || rd.type === "Полезная модель" ? `RU ${rd.type.toLowerCase()}` : rd.type, { full: rd.name, rid: rd.id });
  if (rd.nioktr) E(rd.nioktr, "RID-" + rd.id, "HAS_RESULT");
  for (const t of rd.techs) E("RID-" + rd.id, t, "PROTECTS");
}
for (const p of patents) { N(p.id, "Patent", p.number, { full: p.title }); for (const t of p.techs) E(p.id, t, "PROTECTS"); }
for (const o of orgs) if (o.evidence?.published?.startsWith("диссертации")) { N("PUB-" + o.id, "Publication", o.evidence.published.replace("диссертации по СЛП в ЕГИСУ: ", "диссертации: ")); E("PUB-" + o.id, o.id, "PART_OF"); }
for (const grp of suppliers) {
  for (const s of grp.ru) { const id = "MFR-" + s.name.replace(/[^А-Яа-яA-Za-z0-9]+/g, "").slice(0, 24); N(id, grp.node === "S00" ? "Manufacturer" : "Supplier", s.name, { country: "Россия" }); E(id, grp.node === "S00" ? product.id : grp.node, "SUPPLIES"); }
  for (const s of grp.foreign) { const id = "SUP-" + s.name.replace(/[^А-Яа-яA-Za-z0-9]+/g, "").slice(0, 24); N(id, grp.node === "S00" ? "Manufacturer" : "Supplier", s.name, { country: s.country }); E(id, grp.node === "S00" ? product.id : grp.node, "SUPPLIES"); }
}
for (const m of support) { N(m.id, "SupportMeasure", m.name.split(":")[0] + (m.name.includes(":") ? ": " + m.name.split(":")[1].trim().slice(0, 30) : "")); }
for (const m of support) for (const t of m.techs || []) E(m.id, t, "SUPPORTS");
for (const st of devProject.stages) for (const s of st.support) for (const d of devProject.covers) for (const t of deficits.find((x) => x.id === d).techs) E(s, t, "SUPPORTS");
for (const src of sources.filter((s) => s.id.startsWith("E-EGISU"))) N(src.id, "Evidence", src.title.replace("ЕГИСУ НИОКТР — ", "ЕГИСУ: ").slice(0, 40));
for (const r of research) E(r.id, "E-EGISU-NIOKTR", "EVIDENCED_BY");
for (const v of nptl.vnt) E(v.id, "E-EGISU-VNT", "EVIDENCED_BY");
for (const rd of rids) E("RID-" + rd.id, "E-EGISU-RID", "EVIDENCED_BY");
for (const o of orgs) E("PUB-" + o.id, "E-EGISU-DISS", "EVIDENCED_BY");
for (const f of nptl.fps) E(f.id, "E-EGISU-FP", "EVIDENCED_BY");
// уникальность рёбер
const seen = new Set();
const uniq = edges.filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
w("graph.json", { nodes: [...nodes.values()], edges: uniq });
console.log("graph:", nodes.size, "nodes,", uniq.length, "edges");
