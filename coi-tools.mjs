#!/usr/bin/env node
/**
 * COI Forge — ferramentas de desenvolvimento (Node.js 18+, sem dependências)
 * ------------------------------------------------------------------------
 *   node coi-tools.mjs servidor [porta]          Servidor local: aplicação + API REST (/api/coi) + WebSocket (/ws)
 *   node coi-tools.mjs validar [arquivo.json]    Valida uma configuração exportada (sem arquivo: valida o padrão do index.html)
 *   node coi-tools.mjs exemplo <mock|3x3> [saida.json] [porta]
 *                                                 Gera configuração de exemplo para importar em Configurações → Importar JSON
 *     mock : página Executivo via REST e demais widgets via WebSocket do servidor local (porta padrão 8787)
 *     3x3  : layout de videowall 3 × 3 com tela mesclada 2 × 2 e playlists
 *   node coi-tools.mjs testar wall               Testes de playlists, geometria das telas (mover, mesclar, dividir), modelos, rotação e migração
 *   node coi-tools.mjs verificar                 Antes do commit: sintaxe + configuração padrão + exemplos + testes
 *
 * O servidor escuta apenas em 127.0.0.1 e é exclusivo para desenvolvimento.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, createContext, runInContext } from "node:vm";

/* ====================== index.html ====================== */
function lerIndex() { return readFileSync(new URL("./index.html", import.meta.url), "utf8"); }
function padrao() {
  const m = lerIndex().match(/<script id="coi-defaults" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("bloco #coi-defaults não encontrado no index.html");
  return JSON.parse(m[1]);
}
// Carrega as seções U, Store e Wall do index.html (entre @core-begin e @core-end), sem navegador
function nucleo() {
  const html = lerIndex();
  const i = html.indexOf("/* @core-begin"), j = html.indexOf("/* @core-end */");
  if (i < 0 || j < 0) throw new Error("marcadores @core-begin / @core-end não encontrados no index.html");
  const memoria = new Map();
  const ctx = createContext({
    window: { COI_DEFAULTS: padrao() },
    localStorage: { getItem: k => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: k => memoria.delete(k) },
    console
  });
  return runInContext(html.slice(i, j) + "\n;({ U, Store, Wall })", ctx, { filename: "index.html (núcleo)" });
}

/* ====================== exemplos ====================== */
function exemplo(tipo, porta = 8787) {
  const c = padrao();
  if (tipo === "3x3") {
    c.settings.accent = "#0f766e";
    const it = (source, duration = 30) => ({ source, duration });
    const t = (id, x, y, w, h, items, title = "") => ({ id, x, y, w, h, title, header: true, fit: "contain", items });
    c.videowall.layouts.push({
      id: "videowall-3x3", name: "Videowall 3×3", rows: 3, cols: 3, aspect: "16:9", bezel: 8, seams: true, background: "#020617",
      labels: true, progressTv: true,
      tiles: [
        t("a", 0, 0, 2, 2, [it("page:operacao", 30), it("page:executivo", 20)], "Sala de controle"),
        t("b", 2, 0, 1, 1, [it("widget:operacao:op-line-1")]),
        t("c", 2, 1, 1, 1, [it("widget:operacao:op-alarms-1")]),
        t("d", 0, 2, 1, 1, [it("widget:seguranca:sg-cam-1", 10), it("widget:seguranca:sg-cam-2", 10)]),
        t("e", 1, 2, 1, 1, [it("widget:operacao:op-status-1")]),
        t("f", 2, 2, 1, 1, [it("widget:seguranca:sg-clock-1")])
      ]
    });
    c.videowall.activeLayout = "videowall-3x3";
    return c;
  }
  if (tipo === "mock") {
    c.sources = [
      { id: "api", name: "Mock — REST", type: "rest", url: "api/coi", interval: 5, staleAfter: 0, enabled: true },
      { id: "ws", name: "Mock — WebSocket", type: "websocket", url: `ws://localhost:${porta}/ws`, interval: 5, staleAfter: 20, enabled: true }
    ];
    c.pages.forEach(p => p.widgets.forEach(w => { if (w.binding) w.binding.source = p.id === "executivo" ? "api" : "ws"; }));
    return c;
  }
  return null;
}

/* ====================== validador ====================== */
const TYPES = ["kpi", "line", "bar", "gauge", "alarms", "status", "table", "text", "clock", "camera", "embed"];
const BINDABLE = ["kpi", "line", "bar", "gauge", "alarms", "status", "table", "text"];
const SOURCE_TYPES = ["simulated", "rest", "websocket"];

function urlCheck(u, type) {
  u = String(u || "").trim();
  if (type === "simulated") return "";
  if (!u) return "URL não informada";
  if (/\s/.test(u)) return "URL contém espaços";
  if (type === "websocket") return /^wss:\/\/.+/i.test(u) || /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u) ? "" : "use wss:// (ou ws://localhost)";
  if (/^https:\/\/.+/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u)) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith("//")) return "";
  return "use https://, caminho relativo ou http://localhost";
}

function validar(file, obj) {
  const errors = [], warnings = [];
  let cfg = obj;
  if (!cfg) {
    try { cfg = file ? JSON.parse(readFileSync(file, "utf8")) : padrao(); }
    catch (e) { console.error(`✗ ${file || "index.html"}: ${e.code === "ENOENT" ? "arquivo não encontrado" : "JSON inválido — " + e.message}`); return false; }
  }
  file = file || "index.html (#coi-defaults)";

  if (![2, 3, 4, 5].includes(cfg.version)) errors.push("version deve ser 5 (2, 3 e 4 são migradas automaticamente)");
  if ([2, 3, 4].includes(cfg.version)) warnings.push(`configuração v${cfg.version}: será migrada para v5 ao ser importada`);
  if (!Array.isArray(cfg.pages) || !cfg.pages.length) errors.push("pages deve conter ao menos uma página");

  const srcIds = new Set();
  (cfg.sources || []).forEach((s, i) => {
    const at = `sources[${i}]`;
    if (!s.id) errors.push(`${at} sem id`);
    else if (srcIds.has(s.id)) errors.push(`${at} id duplicado: ${s.id}`);
    srcIds.add(s.id);
    if (!SOURCE_TYPES.includes(s.type)) errors.push(`${at} tipo inválido: ${s.type}`);
    const u = urlCheck(s.url, s.type);
    if (u) errors.push(`${at} (${s.name || s.id}): ${u}`);
    if (/[?&](token|key|apikey|api_key|password|senha|secret)=/i.test(String(s.url || ""))) errors.push(`${at} URL parece conter credencial — remova antes do commit`);
    if ("password" in s || "senha" in s || "token" in s) errors.push(`${at} contém credencial — senhas e tokens não podem fazer parte da configuração`);
    if (s.interval !== undefined && !(s.interval >= 1 && s.interval <= 3600)) errors.push(`${at} interval deve estar entre 1 e 3600`);
  });

  const ids = new Set(), pageIds = new Set();
  let bound = 0;
  (cfg.pages || []).forEach((p, i) => {
    if (!p.id) errors.push(`pages[${i}] sem id`);
    pageIds.add(p.id);
    if (!Array.isArray(p.widgets)) { errors.push(`pages[${i}].widgets deve ser uma lista`); return; }
    p.widgets.forEach((w, j) => {
      const at = `pages[${i}].widgets[${j}]`;
      if (!w.id) errors.push(`${at} sem id`);
      else if (ids.has(`${p.id}:${w.id}`)) errors.push(`${at} id duplicado: ${w.id}`);
      ids.add(`${p.id}:${w.id}`);
      if (!TYPES.includes(w.type)) errors.push(`${at} tipo desconhecido: ${w.type}`);
      if (!(w.w >= 1 && w.w <= 12)) errors.push(`${at} largura (w) deve estar entre 1 e 12`);
      if (!(w.h >= 1 && w.h <= 8)) errors.push(`${at} altura (h) deve estar entre 1 e 8`);
      if (typeof w.props !== "object" || w.props === null) errors.push(`${at} sem props`);
      if (w.binding) {
        bound++;
        if (!BINDABLE.includes(w.type)) errors.push(`${at} o tipo ${w.type} não aceita vínculo com fonte`);
        if (!srcIds.has(w.binding.source)) errors.push(`${at} vinculado a fonte inexistente: ${w.binding.source}`);
        if (typeof w.binding.path !== "string") errors.push(`${at} binding.path deve ser texto`);
      }
    });
  });

  const fonte = (src, at) => {
    const [kind, a, b] = String(src || "none").split(":");
    if (kind === "none") return;
    if (kind === "page" && !pageIds.has(a)) errors.push(`${at} página inexistente: ${a}`);
    else if (kind === "widget" && !ids.has(`${a}:${b}`)) errors.push(`${at} widget inexistente: ${a}:${b}`);
    else if (kind !== "page" && kind !== "widget") errors.push(`${at} fonte inválida: ${src}`);
  };
  const vw = cfg.videowall || {};
  let resumo = "";
  if (cfg.version >= 4) {
    const layouts = Array.isArray(vw.layouts) ? vw.layouts : [];
    if (!layouts.length || layouts.length > 20) errors.push("videowall.layouts deve ter de 1 a 20 layouts");
    const lids = new Set();
    let playlists = 0, merged = 0;
    const v5 = cfg.version === 5, maxR = v5 ? 6 : 4, maxC = v5 ? 8 : 6;
    layouts.forEach((l, i) => {
      const at = `videowall.layouts[${i}]`;
      if (!l.id) errors.push(`${at} sem id`);
      else if (lids.has(l.id)) errors.push(`${at} id duplicado: ${l.id}`);
      lids.add(l.id);
      if (!(l.rows >= 1 && l.rows <= maxR)) errors.push(`${at}.rows deve estar entre 1 e ${maxR}`);
      if (!(l.cols >= 1 && l.cols <= maxC)) errors.push(`${at}.cols deve estar entre 1 e ${maxC}`);
      if (!Array.isArray(l.tiles)) { errors.push(`${at}.tiles deve ser uma lista`); return; }
      if (v5) {
        if (!["16:9", "16:10", "21:9", "4:3", "9:16"].includes(l.aspect)) errors.push(`${at}.aspect deve ser 16:9, 16:10, 21:9, 4:3 ou 9:16`);
        if (!(Number.isInteger(l.bezel) && l.bezel >= 0 && l.bezel <= 24)) errors.push(`${at}.bezel deve ser um inteiro entre 0 e 24`);
        if (!/^#[0-9a-f]{6}$/i.test(l.background || "")) errors.push(`${at}.background deve ser uma cor #rrggbb`);
        const tids = new Set();
        l.tiles.forEach((t, k) => {
          const ta = `${at}.tiles[${k}]`;
          if (!t.id) errors.push(`${ta} sem id`); else if (tids.has(t.id)) errors.push(`${ta} id duplicado: ${t.id}`);
          tids.add(t.id);
          const okNum = ["x", "y", "w", "h"].every(p => Number.isInteger(t[p]));
          if (!okNum || t.w < 1 || t.h < 1 || t.x < 0 || t.y < 0 || t.x + t.w > l.cols || t.y + t.h > l.rows) errors.push(`${ta} posição/tamanho fora da matriz ${l.cols}×${l.rows}`);
          l.tiles.slice(0, k).forEach((o, q) => {
            if (okNum && t.x < o.x + o.w && o.x < t.x + t.w && t.y < o.y + o.h && o.y < t.y + t.h) errors.push(`${ta} sobrepõe ${at}.tiles[${q}]`);
          });
          if (t.w * t.h > 1) merged++;
          if (t.fit !== undefined && !["contain", "cover"].includes(t.fit)) errors.push(`${ta}.fit deve ser contain ou cover`);
        });
      } else if (l.tiles.length !== l.rows * l.cols) errors.push(`${at}.tiles deve ter ${l.rows * l.cols} telas (linhas × colunas)`);
      l.tiles.forEach((t, k) => {
        const items = t && t.items;
        if (!Array.isArray(items) || items.length < 1 || items.length > 12) { errors.push(`${at}.tiles[${k}].items deve ter de 1 a 12 conteúdos`); return; }
        if (items.length > 1) playlists++;
        items.forEach((it, n) => {
          const ia = `${at}.tiles[${k}].items[${n}]`;
          fonte(it.source, ia);
          if (!(Number.isInteger(it.duration) && it.duration >= 5 && it.duration <= 3600)) errors.push(`${ia}.duration deve ser um inteiro entre 5 e 3600 segundos`);
        });
      });
    });
    if (layouts.length && !lids.has(vw.activeLayout)) errors.push(`videowall.activeLayout inexistente: ${vw.activeLayout}`);
    const r = cfg.rotation;
    if (!r) errors.push("rotation ausente");
    else {
      if (typeof r.enabled !== "boolean") errors.push("rotation.enabled deve ser true ou false");
      (Array.isArray(r.pages) ? r.pages : []).forEach(id => { if (!pageIds.has(id)) errors.push(`rotation.pages contém página inexistente: ${id}`); });
      if (!Array.isArray(r.pages)) errors.push("rotation.pages deve ser uma lista");
      else if (r.enabled && r.pages.length < 2) warnings.push("rotation habilitada com menos de 2 páginas: não terá efeito");
      if (!(r.interval >= 10 && r.interval <= 3600)) errors.push("rotation.interval deve estar entre 10 e 3600");
      if (!(r.resumeAfter >= 10 && r.resumeAfter <= 600)) errors.push("rotation.resumeAfter deve estar entre 10 e 600");
    }
    resumo = `${layouts.length} ${layouts.length === 1 ? "layout" : "layouts"} de videowall (${playlists} telas com playlist, ${merged} mescladas)`;
  } else {
    if (!(vw.rows >= 1 && vw.rows <= 4)) errors.push("videowall.rows deve estar entre 1 e 4");
    if (!(vw.cols >= 1 && vw.cols <= 6)) errors.push("videowall.cols deve estar entre 1 e 6");
    (vw.tiles || []).forEach((t, i) => fonte(t.source, `videowall.tiles[${i}]`));
    resumo = `videowall ${vw.rows}x${vw.cols}`;
  }

  warnings.forEach(w => console.warn("! " + w));
  if (errors.length) { console.error(`✗ ${errors.length} problema(s) em ${file}:`); errors.forEach(e => console.error("  - " + e)); return false; }
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  console.log(`✓ ${file} válido — ${pl(cfg.pages.length, "página", "páginas")}, ${pl(ids.size, "widget", "widgets")} (${bound} vinculados), ${pl(srcIds.size, "fonte", "fontes")}, ${resumo}.`);
  return true;
}

/* ====================== testes (testar wall) ====================== */
function testarWall() {
  let ok = 0;
  const falhas = [];
  const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { falhas.push(`${nome}: ${e.message}`); } };
  const igual = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ""} esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)}`); };
  let core;
  try { core = nucleo(); } catch (e) { console.error(`✗ Não foi possível carregar o núcleo do index.html: ${e.message}`); return false; }
  const { Wall, Store } = core;
  const pl = [{ source: "a", duration: 10 }, { source: "b", duration: 20 }, { source: "c", duration: 30 }];
  const idx = t => Wall.current(pl, t).index;

  caso("A1 · ordem e viradas (10 s, 20 s, 30 s)", () => {
    igual([0, 9.9, 10, 29.9, 30, 59.9, 60].map(idx), [0, 0, 1, 1, 2, 2, 0]);
  });
  caso("A2 · várias voltas sem acumular erro", () => {
    igual(idx(60 * 120 + 15), 1, "após 120 ciclos + 15 s:");
    igual(idx(60 * 10000 + 45), 2, "após 10.000 ciclos + 45 s:");
  });
  caso("tempo restante e progresso", () => {
    const c = Wall.current(pl, 15);
    igual([c.index, c.remaining, +c.progress.toFixed(2), c.count], [1, 15, 0.25, 3]);
  });
  caso("tela com item único fica fixa", () => {
    const c = Wall.current([{ source: "x", duration: 10 }], 12345);
    igual([c.index, c.remaining, c.progress, c.count], [0, null, null, 1]);
  });
  caso("lista vazia vira 'Sem sinal'", () => igual(Wall.current([], 5).item.source, "none"));
  caso("duração fora da faixa é limitada a 5–3600 s", () => {
    igual([Wall.duration(1), Wall.duration(99999), Wall.duration("abc"), Wall.duration(12.4)], [5, 3600, 30, 12]);
    igual(Wall.current([{ source: "a", duration: 1 }, { source: "b", duration: 1 }], 5).index, 1);
  });
  const T = (id, x, y, w = 1, h = 1, src = "s" + id) => ({ id, x, y, w, h, title: "", header: true, fit: "contain", items: [{ source: src, duration: 30 }] });
  const grade = (cols, rows) => Array.from({ length: cols * rows }, (_, k) => T(String(k), k % cols, Math.floor(k / cols)));
  caso("A6 · 3×2 → 3×3 mantém as 6 telas pela posição", () => {
    const r = Wall.fit(grade(3, 2), 3, 3);
    igual([r.tiles.length, r.removed, Wall.freeCells(r.tiles, 3, 3).length], [6, 0, 3]);
  });
  caso("matriz menor corta tela mesclada e conta as perdidas", () => {
    const r = Wall.fit([T("a", 0, 0, 3, 2), T("b", 3, 0)], 2, 2);
    igual(r.tiles.map(t => [t.id, t.w, t.h]), [["a", 2, 2]]);
    igual(r.removed, 1);
  });
  caso("sobreposição é descartada na normalização", () => {
    const r = Wall.fit([T("a", 0, 0, 2, 1), T("b", 1, 0)], 2, 2);
    igual(r.tiles.map(t => t.id), ["a"]);
  });
  caso("mover para área livre e bloquear área ocupada", () => {
    const tiles = [T("a", 0, 0), T("b", 1, 0, 1, 2)];
    igual(Wall.move(tiles, "a", 0, 1, 2, 2).find(t => t.id === "a").y, 1);
    igual(Wall.move(tiles, "a", 1, 1, 2, 2), null);
    igual(Wall.move(tiles, "a", 2, 0, 2, 2), null, "fora da matriz:");
  });
  caso("soltar sobre tela do mesmo tamanho troca as duas", () => {
    const out = Wall.move([T("a", 0, 0), T("b", 1, 0)], "a", 1, 0, 1, 2);
    igual(out.map(t => [t.id, t.x]), [["a", 1], ["b", 0]]);
  });
  caso("mesclar (redimensionar) só em área livre", () => {
    const tiles = [T("a", 0, 0), T("b", 2, 0)];
    igual(Wall.resize(tiles, "a", 2, 2, 2, 3).find(t => t.id === "a").w, 2);
    igual(Wall.resize(tiles, "a", 3, 1, 2, 3), null);
  });
  caso("dividir 2×2 em quatro 1×1 mantendo o conteúdo na primeira", () => {
    let n = 0;
    const out = Wall.split([T("a", 0, 0, 2, 2)], "a", () => "n" + ++n);
    igual(out.map(t => [t.id, t.x, t.y, t.w, t.items[0].source]), [["a", 0, 0, 1, "sa"], ["n1", 1, 0, 1, "none"], ["n2", 0, 1, 1, "none"], ["n3", 1, 1, 1, "none"]]);
  });
  caso("primeira posição livre para um tamanho", () => {
    igual(Wall.firstFree([T("a", 0, 0, 2, 1)], 2, 3, 2, 1), { x: 0, y: 1, w: 2, h: 1 });
    igual(Wall.firstFree(grade(2, 2), 2, 2), null);
  });
  caso("modelo com destaque recebe o conteúdo na ordem de leitura", () => {
    let n = 0;
    const p = Wall.PRESETS.find(x => x.id === "3x3-destaque");
    const r = Wall.preset(grade(2, 2), p, () => "n" + ++n);
    igual(r.tiles.map(t => [t.items[0].source, t.w]), [["s0", 2], ["s1", 1], ["s2", 1], ["s3", 1], ["none", 1], ["none", 1]]);
    igual(r.lost, 0);
  });
  caso("rotação: próxima página e volta ao início", () => {
    igual([Wall.nextPage(["a", "b", "c"], "a"), Wall.nextPage(["a", "b", "c"], "c"), Wall.nextPage(["a", "b"], "x"), Wall.nextPage([], "a")], ["b", "a", "a", null]);
  });
  caso("A9 · migração v3 → v5 sem perda", () => {
    const v3 = JSON.parse(JSON.stringify(padrao()));
    v3.version = 3;
    delete v3.rotation;
    v3.videowall = { rows: 2, cols: 3, labels: false, tiles: [
      { source: "page:operacao" }, { source: "widget:operacao:op-line-1" }, { source: "widget:seguranca:sg-cam-1" },
      { source: "widget:operacao:op-alarms-1" }, { source: "widget:pagina-excluida:x" }, { source: "none" }
    ] };
    if (!Store.valid(v3)) throw new Error("v3 não reconhecida como válida");
    const v4 = Store.normalize(v3);
    const L = v4.videowall.layouts[0];
    igual([v4.version, v4.videowall.layouts.length, v4.videowall.activeLayout, L.rows, L.cols, L.labels, L.aspect], [5, 1, "principal", 2, 3, false, "16:9"]);
    igual(L.tiles.map(t => t.items.map(i => i.source).join()), ["page:operacao", "widget:operacao:op-line-1", "widget:seguranca:sg-cam-1", "widget:operacao:op-alarms-1", "none", "none"]);
    igual(L.tiles.map(t => [t.x, t.y, t.w, t.h].join()), ["0,0,1,1", "1,0,1,1", "2,0,1,1", "0,1,1,1", "1,1,1,1", "2,1,1,1"]);
    igual(v4.rotation, { enabled: false, pages: v3.pages.map(p => p.id), interval: 30, resumeAfter: 60 });
    igual(v4.pages.length, v3.pages.length, "páginas:");
    igual(v4.sources.length, v3.sources.length, "fontes:");
  });
  caso("migração v4 (telas por posição) → v5 com geometria", () => {
    const c = JSON.parse(JSON.stringify(padrao()));
    c.version = 4;
    c.videowall = { activeLayout: "x", layouts: [{ id: "x", name: "X", rows: 1, cols: 2, labels: true, progressTv: false,
      tiles: [{ items: [{ source: "page:operacao", duration: 20 }] }, { items: [{ source: "page:executivo", duration: 20 }] }] }] };
    const L = Store.normalize(c).videowall.layouts[0];
    igual(L.tiles.map(t => [t.x, t.y, t.w, t.h, t.items[0].source]), [[0, 0, 1, 1, "page:operacao"], [1, 0, 1, 1, "page:executivo"]]);
  });
  caso("normalização v5: limites e layout ativo inexistente", () => {
    const c = JSON.parse(JSON.stringify(padrao()));
    c.videowall.activeLayout = "nao-existe";
    c.videowall.layouts[0].tiles[0].items = Array.from({ length: 20 }, () => ({ source: "page:operacao", duration: 1 }));
    c.videowall.layouts[0].bezel = 99; c.videowall.layouts[0].aspect = "5:1";
    const n = Store.normalize(c), L0 = n.videowall.layouts[0];
    igual(n.videowall.activeLayout, L0.id);
    const t0 = L0.tiles.find(t => t.id === c.videowall.layouts[0].tiles[0].id);
    igual([t0.items.length, t0.items[0].duration, L0.bezel, L0.aspect], [12, 5, 24, "16:9"]);
  });

  if (falhas.length) { console.error(`✗ testar wall: ${falhas.length} de ${ok + falhas.length} casos falharam:`); falhas.forEach(f => console.error("  - " + f)); return false; }
  console.log(`✓ testar wall — ${ok} casos aprovados (playlists, geometria das telas, modelos, rotação e migração).`);
  return true;
}

/* ====================== verificação de sintaxe ====================== */
function sintaxe() {
  const html = lerIndex();
  const blocos = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!blocos.length) { console.error("✗ index.html: nenhum bloco de código encontrado"); return false; }
  try { blocos.forEach((codigo, n) => new Script(codigo, { filename: `index.html (script ${n + 1})` })); }
  catch (e) { console.error(`✗ Erro de sintaxe no index.html: ${e.message}`); return false; }
  console.log(`✓ index.html — código JavaScript sem erros de sintaxe (${blocos.length} bloco${blocos.length === 1 ? "" : "s"}).`);
  return true;
}

/* ====================== servidor de teste ====================== */
const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".md": "text/markdown; charset=utf-8"
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const drift = (v, pct, a, b) => clamp(v + (Math.random() - 0.5) * 2 * Math.max(Math.abs(v) * pct, 0.1), a, b);
const hhmm = (d = new Date()) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const sim = {
  disp: 97.9, ef: 91.2, cap: 71,
  prod: [410, 432, 451, 447, 468, 480, 476, 495, 502, 517, 509, 528],
  integ: [["SCADA", "online"], ["CFTV", "online"], ["Sensores IoT", "pendente"], ["ERP", "online"], ["MES", "offline"]],
  par: { Recebimento: 28, Secagem: 47, Armazenagem: 22, "Expedição": 36, Utilidades: 9 },
  alarms: [
    { nivel: "critical", descricao: "[API] Falha de comunicação — CLP Linha 01", hora: hhmm() },
    { nivel: "warning", descricao: "[API] Nível alto — Silo 05", hora: hhmm() }
  ]
};
const pool = [
  ["critical", "[API] Motor M-12 em sobrecarga"], ["warning", "[API] Temperatura elevada — Silo 02"],
  ["info", "[API] Sincronização ERP concluída"], ["warning", "[API] Vibração acima do limite — Elevador 03"]
];
function step() {
  sim.disp = +drift(sim.disp, 0.003, 90, 100).toFixed(1);
  sim.ef = +drift(sim.ef, 0.005, 80, 100).toFixed(1);
  sim.cap = Math.round(drift(sim.cap, 0.03, 40, 98));
  sim.prod = sim.prod.slice(1).concat(Math.round(drift(sim.prod.at(-1), 0.03, 300, 700)));
  for (const k in sim.par) sim.par[k] = Math.round(drift(sim.par[k], 0.06, 0, 120));
  if (Math.random() < 0.25) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    sim.alarms = [{ nivel: a[0], descricao: a[1], hora: hhmm() }, ...sim.alarms].slice(0, 6);
  }
}
function payload() {
  return {
    timestamp: new Date().toISOString(),
    origem: "mock-server",
    operacao: {
      disponibilidade: sim.disp, eficiencia: sim.ef, capacidade: sim.cap,
      producaoAtual: sim.prod.at(-1), producao: sim.prod,
      alarmesAtivos: sim.alarms.length,
      sistemasIntegrados: sim.integ.filter(x => x[1] === "online").length
    },
    alarmes: sim.alarms,
    integracoes: sim.integ.map(([sistema, status]) => ({ sistema, status })),
    paradas: Object.entries(sim.par).map(([area, minutos]) => ({ area, minutos })),
    mes: { volume: 184.1, custoTonelada: 18.2, incidentesSeguranca: 0 },
    unidades: [
      { unidade: "Unidade A", volume: 66 }, { unidade: "Unidade B", volume: 52 },
      { unidade: "Unidade C", volume: 38 }, { unidade: "Unidade D", volume: 28 }
    ]
  };
}
function frame(text) {
  const data = Buffer.from(text);
  const len = data.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, data]);
}
function servidor(PORT) {
  setInterval(step, 2000);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/coi") {
      res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(payload()));
      return;
    }
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403); res.end("Acesso negado"); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Não encontrado");
    }
  });
  // WebSocket mínimo (somente envio de texto)
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (new URL(req.url, "http://x").pathname !== "/ws" || !key) { socket.destroy(); return; }
    const accept = createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const send = () => { if (!socket.destroyed) socket.write(frame(JSON.stringify(payload()))); };
    send();
    const timer = setInterval(send, 2000);
    const stop = () => clearInterval(timer);
    socket.on("data", buf => { if ((buf[0] & 0x0f) === 0x8) { stop(); socket.end(Buffer.from([0x88, 0x00])); } });
    socket.on("close", stop);
    socket.on("error", stop);
  });
  server.on("error", e => {
    console.error(e.code === "EADDRINUSE" ? `✗ A porta ${PORT} já está em uso. Use outra: node coi-tools.mjs servidor 9000` : `✗ Não foi possível iniciar o servidor: ${e.message}`);
    process.exit(1);
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`COI Forge — servidor de teste em http://localhost:${PORT}`);
    console.log(`  REST       http://localhost:${PORT}/api/coi`);
    console.log(`  WebSocket  ws://localhost:${PORT}/ws`);
    console.log(`  Modo TV    http://localhost:${PORT}/?tv=1&layout=operacao-normal`);
    console.log(`  Exemplo    node coi-tools.mjs exemplo mock coi-mock.json${PORT === 8787 ? "" : " " + PORT}  → importe em Configurações`);
  });
}

/* ====================== linha de comando ====================== */
const porta = v => {
  const n = Number(v ?? process.env.PORT ?? 8787);
  if (!Number.isInteger(n) || n < 1 || n > 65535) { console.error(`✗ Porta inválida: ${v}`); process.exit(2); }
  return n;
};
const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "servidor") servidor(porta(a));
else if (cmd === "validar") process.exit(validar(a) ? 0 : 1);
else if (cmd === "exemplo") {
  const cfg = exemplo(a, porta(c));
  if (!cfg) { console.error("Tipos disponíveis: mock, 3x3"); process.exit(2); }
  const json = JSON.stringify(cfg, null, 2) + "\n";
  if (b) { writeFileSync(b, json); console.log(`✓ ${b} gerado — importe em Configurações → Importar JSON.`); }
  else process.stdout.write(json);
}
else if (cmd === "testar") {
  if (a !== "wall") { console.error("Testes disponíveis: wall"); process.exit(2); }
  process.exit(testarWall() ? 0 : 1);
}
else if (cmd === "verificar") {
  // antes do commit: sintaxe, configuração padrão, exemplos (em memória, sem gravar arquivos) e testes
  const ok = [sintaxe(), validar(), validar("exemplo mock", exemplo("mock")), validar("exemplo 3x3", exemplo("3x3")), testarWall()];
  console.log(ok.every(Boolean) ? "\n✓ Tudo certo para o commit." : "\n✗ Corrija os problemas acima antes do commit.");
  process.exit(ok.every(Boolean) ? 0 : 1);
}
else {
  console.log(`COI Forge — ferramentas
  node coi-tools.mjs servidor [porta]
  node coi-tools.mjs validar [arquivo.json]
  node coi-tools.mjs exemplo <mock|3x3> [saida.json] [porta]
  node coi-tools.mjs testar wall
  node coi-tools.mjs verificar`);
  process.exit(cmd && cmd !== "ajuda" && cmd !== "--help" ? 2 : 0);
}
