#!/usr/bin/env node
/**
 * COI Forge — ferramentas de desenvolvimento (Node.js 18+, sem dependências)
 * ------------------------------------------------------------------------
 *   node coi-tools.mjs servidor [porta]          Servidor local: aplicação + API REST (/api/coi) + WebSocket (/ws)
 *   node coi-tools.mjs validar [arquivo.json]    Valida uma configuração exportada (sem arquivo: valida o padrão do index.html)
 *   node coi-tools.mjs exemplo <mock|3x3> [saida.json] [porta]
 *                                                 Gera configuração de exemplo para importar em Configurações → Importar JSON
 *     mock : página Executivo via REST e demais widgets via WebSocket do servidor local (porta padrão 8787)
 *     3x3  : videowall 3 × 3 com páginas, gráficos, alarmes e câmeras
 *   node coi-tools.mjs verificar                 Antes do commit: sintaxe do código do index.html + configuração padrão + exemplos
 *
 * O servidor escuta apenas em 127.0.0.1 e é exclusivo para desenvolvimento.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Script } from "node:vm";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/* ====================== configuração padrão (lida do index.html) ====================== */
function lerIndex() { return readFileSync(new URL("./index.html", import.meta.url), "utf8"); }
function padrao() {
  const html = lerIndex();
  const m = html.match(/<script id="coi-defaults" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("bloco #coi-defaults não encontrado no index.html");
  return JSON.parse(m[1]);
}

/* ====================== exemplos ====================== */
function exemplo(tipo, porta = 8787) {
  const c = padrao();
  if (tipo === "3x3") {
    c.settings.accent = "#0f766e";
    c.videowall = { rows: 3, cols: 3, labels: true, tiles: [
      "page:operacao", "widget:operacao:op-line-1", "page:executivo",
      "widget:seguranca:sg-cam-1", "widget:operacao:op-alarms-1", "widget:seguranca:sg-cam-2",
      "widget:seguranca:sg-cam-3", "widget:operacao:op-status-1", "widget:seguranca:sg-cam-4"
    ].map(source => ({ source })) };
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

if (cfg.version !== 3 && cfg.version !== 2) errors.push("version deve ser 3 (ou 2, migrado automaticamente)");
if (cfg.version === 2) warnings.push("configuração v2: será migrada para v3 ao ser importada");
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
  if (s.interval !== undefined && !(s.interval >= 1 && s.interval <= 3600)) errors.push(`${at} interval deve estar entre 1 e 3600`);
});

const ids = new Set();
let bound = 0;
(cfg.pages || []).forEach((p, i) => {
  if (!p.id) errors.push(`pages[${i}] sem id`);
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

const vw = cfg.videowall || {};
if (!(vw.rows >= 1 && vw.rows <= 4)) errors.push("videowall.rows deve estar entre 1 e 4");
if (!(vw.cols >= 1 && vw.cols <= 6)) errors.push("videowall.cols deve estar entre 1 e 6");
(vw.tiles || []).forEach((t, i) => {
  const [kind, a, b] = String(t.source || "none").split(":");
  if (kind === "page" && !(cfg.pages || []).some(p => p.id === a)) errors.push(`videowall.tiles[${i}] página inexistente: ${a}`);
  if (kind === "widget" && !ids.has(`${a}:${b}`)) errors.push(`videowall.tiles[${i}] widget inexistente: ${a}:${b}`);
});

warnings.forEach(w => console.warn("! " + w));
if (errors.length) { console.error(`✗ ${errors.length} problema(s) em ${file}:`); errors.forEach(e => console.error("  - " + e)); return false; }
const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
console.log(`✓ ${file} válido — ${pl(cfg.pages.length, "página", "páginas")}, ${pl(ids.size, "widget", "widgets")} (${bound} vinculados), ${pl(srcIds.size, "fonte", "fontes")}, videowall ${vw.rows}x${vw.cols}.`);
return true;
}

/* ====================== servidor de teste ====================== */
const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".md": "text/markdown; charset=utf-8"
};

/* ---------- dados simulados (mesma estrutura do Simulador da aplicação) ---------- */
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


/* ---------- HTTP ---------- */
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

/* ---------- WebSocket mínimo (somente envio de texto) ---------- */
function frame(text) {
  const data = Buffer.from(text);
  const len = data.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, data]);
}
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
  console.log(`  Exemplo    node coi-tools.mjs exemplo mock coi-mock.json${PORT === 8787 ? "" : " " + PORT}  → importe em Configurações`);
});
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
else if (cmd === "verificar") {
  // antes do commit: sintaxe do código, configuração padrão e exemplos (em memória, sem gravar arquivos)
  const ok = [sintaxe(), validar(), validar("exemplo mock", exemplo("mock")), validar("exemplo 3x3", exemplo("3x3"))];
  console.log(ok.every(Boolean) ? "\n✓ Tudo certo para o commit." : "\n✗ Corrija os problemas acima antes do commit.");
  process.exit(ok.every(Boolean) ? 0 : 1);
}
else {
  console.log(`COI Forge — ferramentas
  node coi-tools.mjs servidor [porta]
  node coi-tools.mjs validar [arquivo.json]
  node coi-tools.mjs exemplo <mock|3x3> [saida.json] [porta]
  node coi-tools.mjs verificar`);
  process.exit(cmd && cmd !== "ajuda" && cmd !== "--help" ? 2 : 0);
}
