/*!
 * COE Agro — plataforma
 * ------------------------------------------------------------------
 * Complementa o COE (index.html, script.js e style.css) com:
 *  1. Identidade configurável: nome da cooperativa, sigla, logo, unidade
 *     principal, demais unidades, municípios dos cooperados, prefixo dos
 *     códigos e cor de destaque. Padrão em coe-config.js; ajuste pela tela
 *     no botão IDENTIDADE (vale para o navegador e pode ser exportado).
 *  2. Videowall editável: matriz de monitores, telas mescladas, playlists
 *     por TV, modelos, desfazer/refazer, atalhos e modo TV por link.
 *
 * Cada TV do videowall é a própria página do COE aberta em um quadro no
 * modo “só a tela” (?vw-embed=1): gráficos, câmeras, mapas e o ajuste de
 * escala funcionam como nas telas, e o que for editado no botão EDITAR
 * aparece também nas TVs. Trocar a tela de uma playlist não recarrega o quadro.
 *
 * Endereços:
 *   index.html?videowall=1                      abre o editor do videowall
 *   index.html?videowall=1&tv=1&layout=<id>     abre direto no modo TV
 * Licença MIT.
 */
(function () {
  "use strict";
  if (window.__coePlataforma) return;
  window.__coePlataforma = true;

  const params = new URLSearchParams(location.search);
  const EMBED = params.get("vw-embed") === "1";

  function injectCss(css) {
    const st = document.createElement("style");
    st.id = EMBED ? "vwEmbedCss" : "vwCss";
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ==================================================================
     IDENTIDADE DA COOPERATIVA
     As telas usam nomes de exemplo (tokens). Aqui eles são trocados pelos
     nomes configurados, em todo o texto da página e das TVs, inclusive no
     que for inserido depois (troca de tela, editor, restaurar layout).
     ================================================================== */
  const ID_KEY = "coe:identidade:v1", ID_APLICADA = "coe:identidade:aplicada:v1";
  const TOK = { cooperativa: "Cooperativa Agroindustrial", nomeCurto: "Coop. Agroindustrial", unidade: "Central", codigo: "UNC" };
  const UNID0 = ["Matriz", "Unidade 2", "Unidade 3", "Unidade 4", "Unidade 5", "Unidade 6"];
  const MUN0 = ["Município A", "Município B", "Município C", "Município D", "Município E"];
  const BASE = window.COE_CONFIG || {};
  const txt = (v, d, max) => { const t = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max); return t || d; };
  function safeLogo(v) {
    const u = String(v ?? "").trim();
    if (!u) return "";
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(u) && u.length < 700000) return u;
    if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith("//") && !/[\s"'<>]/.test(u)) return u; // caminho relativo
    return "";
  }
  function normId(x) {
    x = x || {};
    const map = (src, keys) => { const o = {}; keys.forEach(k => { o[k] = txt(src && src[k], k, 40); }); return o; };
    return {
      cooperativa: txt(x.cooperativa, TOK.cooperativa, 60),
      nomeCurto: txt(x.nomeCurto, TOK.nomeCurto, 40),
      sigla: txt(x.sigla, "CA", 5).toLocaleUpperCase("pt-BR"),
      logo: "logo" in x ? safeLogo(x.logo) : "logo.svg",
      unidade: txt(x.unidade, TOK.unidade, 30),
      codigo: (String(x.codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)) || TOK.codigo,
      destaque: /^#[0-9a-f]{6}$/i.test(x.destaque || "") ? x.destaque.toLowerCase() : "",
      unidades: map(x.unidades, UNID0),
      municipios: map(x.municipios, MUN0)
    };
  }
  const idPadrao = () => normId(BASE);
  function idLoad() {
    try { const s = JSON.parse(localStorage.getItem(ID_KEY)); if (s) return normId(Object.assign({}, idPadrao(), s)); } catch (e) { /* padrão */ }
    return idPadrao();
  }
  let ID = idLoad();

  // pares token → valor (e valores aplicados antes → valor atual)
  function idPairs(id) {
    const p = [[TOK.cooperativa, id.cooperativa], [TOK.nomeCurto, id.nomeCurto], [TOK.unidade, id.unidade],
      [TOK.unidade.toUpperCase(), id.unidade.toLocaleUpperCase("pt-BR")], [TOK.codigo + "-", id.codigo + "-"]];
    UNID0.forEach(k => p.push([k, id.unidades[k]]));
    MUN0.forEach(k => p.push([k, id.municipios[k]]));
    return p;
  }
  let rx = null, rmap = null;
  // nomes que estão no texto agora (layout salvo pelo EDITAR ou aplicação anterior), por documento
  let applied = (() => { try { return JSON.parse(localStorage.getItem(ID_APLICADA)) || {}; } catch (e) { return {}; } })();
  const currentPairs = () => { const o = {}; idPairs(ID).forEach(([k, v]) => { if (k !== v) o[k] = v; }); return o; };
  function buildMap() {
    const prev = applied;
    const m = new Map(), all = new Set();
    idPairs(ID).forEach(([k, v]) => {
      all.add(k); all.add(v);
      if (k !== v) m.set(k, v);
      const old = prev[k];
      if (old && old !== v && old !== k) { m.set(old, v); all.add(old); }
    });
    rmap = m;
    if (!m.size) { rx = null; return; }
    const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rx = new RegExp([...all].filter(Boolean).sort((a, b) => b.length - a.length).map(esc).join("|"), "g");
  }
  function rememberApplied() {
    if (EMBED) return;
    try { localStorage.setItem(ID_APLICADA, JSON.stringify(applied)); } catch (e) { /* noop */ }
  }
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"]);
  const ATTRS = ["title", "aria-label", "alt", "placeholder", "data-unidade", "data-codigo"];
  function swap(t) { return t.replace(rx, x => rmap.has(x) ? rmap.get(x) : x); }
  function renameIn(root) {
    if (!rx || !root) return;
    if (root.nodeType === 3) { const v = swap(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    const el0 = root.nodeType === 9 ? root.body : root;
    if (!el0 || SKIP.has(el0.tagName)) return;
    const w = document.createTreeWalker(el0, NodeFilter.SHOW_TEXT, {
      acceptNode: n => { const p = n.parentNode; return p && !SKIP.has(p.nodeName) && !(p.isContentEditable && p === document.activeElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const list = [];
    while (w.nextNode()) { rx.lastIndex = 0; if (rx.test(w.currentNode.nodeValue)) list.push(w.currentNode); }
    list.forEach(n => { const v = swap(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
    const els = [el0, ...el0.querySelectorAll("[title],[aria-label],[alt],[placeholder],[data-unidade],[data-codigo]")];
    els.forEach(el => ATTRS.forEach(a => {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const nv = swap(v); if (nv !== v) el.setAttribute(a, nv); }
    }));
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  }
  function applyLook() {
    // logo e sigla
    const box = document.querySelector(".header .logo");
    if (box) {
      const fb = box.querySelector(".logo-fallback");
      if (fb) fb.textContent = ID.sigla;
      let img = box.querySelector("img.logo-img");
      if (!ID.logo) { if (img) img.remove(); box.classList.add("logo--fallback"); }
      else {
        if (!img) { img = document.createElement("img"); img.className = "logo-img"; box.insertBefore(img, box.firstChild); }
        img.removeAttribute("onerror");
        img.onerror = () => { box.classList.add("logo--fallback"); img.remove(); };
        img.alt = "Logo · " + ID.cooperativa;
        box.classList.remove("logo--fallback");
        if (img.getAttribute("src") !== ID.logo) img.setAttribute("src", ID.logo);
      }
    }
    // ícone da aba e título
    let ic = document.querySelector('link[rel="icon"]');
    if (!ic) { ic = document.createElement("link"); ic.rel = "icon"; document.head.appendChild(ic); }
    ic.href = ID.logo || "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15803d"/><text x="32" y="41" font-family="Arial" font-size="${ID.sigla.length > 3 ? 18 : 24}" font-weight="700" fill="#fff" text-anchor="middle">${ID.sigla.replace(/[<&]/g, "")}</text></svg>`);
    if (!EMBED) document.title = "COE · " + ID.cooperativa;
    // cor de destaque
    let st = document.getElementById("coeAccent");
    if (!ID.destaque) { if (st) st.remove(); }
    else {
      if (!st) { st = document.createElement("style"); st.id = "coeAccent"; document.head.appendChild(st); }
      const c = ID.destaque, n = parseInt(c.slice(1), 16), rgb = `${n >> 16}, ${(n >> 8) & 255}, ${n & 255}`;
      // só na “moldura” (cabeçalho, menu, selos, botões, videowall): as cores dos gráficos não mudam
      const vars = `--accent: ${c}; --accent-strong: ${shade(c, -0.2)}; --accent-soft: rgba(${rgb}, .16);`;
      st.textContent = `body.theme-dark, body.theme-light { --header-line: ${c}; }
        .header, .sidebar, .sidebar-reveal, .screen-badge, .vw-app, .vw-drawer, .editor-bar, .editor-modal { ${vars} }`;
    }
  }
  function applyIdentity(full) {
    buildMap();
    applyLook();
    if (full) { renameIn(document.body); applied = currentPairs(); }
  }
  // nomes também no que for inserido depois (troca de tela, editor, restaurar)
  let pend = [], pendT = 0;
  new MutationObserver(ms => {
    if (!rx) return;
    ms.forEach(m => m.addedNodes.forEach(n => pend.push(n)));
    if (pend.length && !pendT) pendT = requestAnimationFrame(() => { const l = pend; pend = []; pendT = 0; l.forEach(n => n.isConnected && renameIn(n)); });
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", e => { if (e.key === ID_KEY) { ID = idLoad(); applyIdentity(true); } });
  applyIdentity(true);
  rememberApplied();
  window.COE = { identidade: () => JSON.parse(JSON.stringify(ID)), marca: () => ID.cooperativa };

  if (EMBED) embedMode();
  else composer();

  /* ==================================================================
     MODO TELA (dentro de cada TV): só o conteúdo da tela pedida
     ================================================================== */
  function embedMode() {
    document.documentElement.classList.add("vw-embed");
    injectCss(`
      html.vw-embed .header, html.vw-embed .sidebar, html.vw-embed .sidebar-reveal,
      html.vw-embed .sidebar-backdrop, html.vw-embed .btn-menu-mobile,
      html.vw-embed .editor-bar, html.vw-embed .editor-toast, html.vw-embed #btnVideowall, html.vw-embed #btnIdentidade, html.vw-embed #btnPortal, html.vw-embed .coe-cfg { display: none !important; }
      html.vw-embed .container { height: 100vh !important; }
      html.vw-embed, html.vw-embed body { overflow: hidden !important; }
      html.vw-embed .content { overflow: hidden !important; }
      html.vw-embed .screen { animation-duration: .5s; }
    `);
    function setTema(t) {
      if (t !== "light" && t !== "dark") return;
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add("theme-" + t);
    }
    function show(key) {
      if (!key || key === "none") return;
      const alerts = document.getElementById("alertsPage");
      if (key === "alertas") {
        const btn = document.getElementById("btnAlertas");
        if (alerts && alerts.hidden && btn) btn.click();
        return;
      }
      const sel = '.menu-item[data-screen="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]';
      const item = document.querySelector(sel);
      const alvo = document.getElementById("screen-" + key);
      if (item && !item.disabled) {
        if (!item.classList.contains("active") || (alerts && !alerts.hidden)) item.click();
      } else if (alvo) {
        document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s === alvo));
      }
      window.dispatchEvent(new Event("resize"));
    }
    setTema(params.get("tema"));
    show(params.get("tela"));
    window.addEventListener("message", e => {
      if (e.source !== window.parent) return;
      const d = e.data;
      if (!d || d.vw !== 1) return;
      if (d.tema) setTema(d.tema);
      if (d.tela) show(d.tela);
    });
  }

  /* ==================================================================
     EDITOR DO VIDEOWALL (página principal)
     ================================================================== */
  function composer() {
    const KEY = "coe:videowall:v1";
    const HIST_MAX = 40;
    const ASPECTS = ["16:9", "16:10", "21:9", "4:3", "9:16"];
    const MIN = 5, MAX = 3600;

    /* ---------------- utilitários ---------------- */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const num = (v, f = 0) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : f; };
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const clone = o => JSON.parse(JSON.stringify(o));
    const uid = p => (p || "t") + Math.random().toString(36).slice(2, 8);
    const cssEsc = v => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'));
    const slug = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "layout";
    const duration = d => clamp(Math.round(Number(d) || 30), MIN, MAX);

    /* ---------------- telas disponíveis (lidas do menu do COE) ---------------- */
    const SOURCES = [];
    const navs = $$(".sidebar nav.menu"), mainUnit = navs.length ? navs[0].getAttribute("data-unidade") : "";
    navs.forEach(nav => {
      const unit = nav.getAttribute("data-unidade") || "", aria = nav.getAttribute("aria-label") || "";
      const group = aria || unit || "Telas";
      // prefixo para diferenciar telas de mesmo nome (ex.: “Visão geral” da unidade e das demais unidades)
      const prefix = !aria ? "" : unit && unit !== mainUnit ? unit : aria;
      $$(".menu-item[data-screen]", nav).forEach(it => {
        const parent = it.closest(".menu-group");
        const pName = parent ? (($(".menu-parent .menu-text", parent) || {}).textContent || "").trim() : "";
        const name = (($(".menu-text", it) || it).textContent || "").trim();
        let label = pName && pName !== name ? pName + " · " + name : name;
        if (prefix && !label.toLowerCase().includes(prefix.toLowerCase())) label = prefix + " · " + label;
        SOURCES.push({ key: it.getAttribute("data-screen"), group, label, short: pName || name });
      });
    });
    if (document.getElementById("alertsPage")) SOURCES.push({ key: "alertas", group: "Painéis", label: "Painel de alertas", short: "Alertas" });
    const KEYS = new Set(SOURCES.map(s => s.key));
    const srcOf = key => SOURCES.find(s => s.key === key);
    const srcName = key => key === "none" ? "Sem sinal" : (srcOf(key) || {}).label || "Tela " + key;

    /* ---------------- geometria (mesma lógica do COI Forge) ---------------- */
    const PRESETS = [
      { id: "2x2", name: "2×2", cols: 2, rows: 2 },
      { id: "3x2", name: "3×2", cols: 3, rows: 2 },
      { id: "3x3", name: "3×3", cols: 3, rows: 3 },
      { id: "4x2", name: "4×2", cols: 4, rows: 2 },
      { id: "4x3", name: "4×3", cols: 4, rows: 3 },
      { id: "4x2-destaque", name: "4×2 destaque", cols: 4, rows: 2, rects: [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 1, 1], [3, 1, 1, 1]] },
      { id: "3x3-destaque", name: "3×3 destaque", cols: 3, rows: 3, rects: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
      { id: "4x3-central", name: "4×3 central", cols: 4, rows: 3, rects: [[1, 0, 2, 2], [0, 0, 1, 1], [3, 0, 1, 1], [0, 1, 1, 1], [3, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1], [3, 2, 1, 1]] },
      { id: "3x2-faixa", name: "3×2 faixa", cols: 3, rows: 2, rects: [[0, 0, 3, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]] }
    ];
    const W = {
      overlaps: (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h,
      inside: (r, rows, cols) => r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= cols && r.y + r.h <= rows,
      ordered: tiles => tiles.slice().sort((a, b) => a.y - b.y || a.x - b.x),
      hasContent: t => t.items.some(it => it.tela !== "none"),
      canPlace(tiles, r, rows, cols, ignore) { return W.inside(r, rows, cols) && !tiles.some(t => t.id !== ignore && W.overlaps(t, r)); },
      fit(tiles, rows, cols) {
        const out = []; let removed = 0;
        W.ordered(tiles).forEach(t => {
          const r = clone(t);
          r.x = Math.max(0, r.x); r.y = Math.max(0, r.y);
          r.w = Math.min(r.w, cols - r.x); r.h = Math.min(r.h, rows - r.y);
          if (r.w < 1 || r.h < 1 || out.some(o => W.overlaps(o, r))) { if (W.hasContent(t)) removed++; return; }
          out.push(r);
        });
        return { tiles: out, removed };
      },
      freeCells(tiles, rows, cols) {
        const c = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!tiles.some(t => W.overlaps(t, { x, y, w: 1, h: 1 }))) c.push({ x, y });
        return c;
      },
      firstFree(tiles, rows, cols, w = 1, h = 1) {
        for (let y = 0; y + h <= rows; y++) for (let x = 0; x + w <= cols; x++) if (W.canPlace(tiles, { x, y, w, h }, rows, cols)) return { x, y, w, h };
        return null;
      },
      move(tiles, id, x, y, rows, cols) {
        const t = tiles.find(o => o.id === id);
        if (!t) return null;
        if (W.canPlace(tiles, { x, y, w: t.w, h: t.h }, rows, cols, id)) return tiles.map(o => o.id === id ? Object.assign(clone(o), { x, y }) : clone(o));
        const other = tiles.find(o => o.id !== id && o.x === x && o.y === y && o.w === t.w && o.h === t.h);
        if (other) return tiles.map(o => o.id === id ? Object.assign(clone(o), { x, y }) : o.id === other.id ? Object.assign(clone(o), { x: t.x, y: t.y }) : clone(o));
        return null;
      },
      resize(tiles, id, w, h, rows, cols) {
        const t = tiles.find(o => o.id === id);
        if (!t) return null;
        return W.canPlace(tiles, { x: t.x, y: t.y, w, h }, rows, cols, id) ? tiles.map(o => o.id === id ? Object.assign(clone(o), { w, h }) : clone(o)) : null;
      },
      split(tiles, id) {
        const t = tiles.find(o => o.id === id);
        if (!t || t.w * t.h === 1) return null;
        const out = tiles.filter(o => o.id !== id).map(clone);
        for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) {
          const first = x === t.x && y === t.y;
          out.push(Object.assign(clone(t), { id: first ? t.id : uid(), x, y, w: 1, h: 1, title: first ? t.title : "", items: first ? clone(t.items) : [{ tela: "none", duration: 30 }] }));
        }
        return out;
      },
      preset(tiles, p) {
        const rects = p.rects || Array.from({ length: p.rows * p.cols }, (_, k) => [k % p.cols, Math.floor(k / p.cols), 1, 1]);
        const src = W.ordered(tiles).filter(W.hasContent).concat(W.ordered(tiles).filter(t => !W.hasContent(t)));
        const out = rects.map(([x, y, w, h], k) => Object.assign(src[k] ? clone(src[k]) : blankTile(), { x, y, w, h }));
        return { tiles: out, lost: src.slice(rects.length).filter(W.hasContent).length };
      },
      // item atual da playlist pelo tempo decorrido (sincroniza as telas e corrige atrasos sozinho)
      current(items, elapsed) {
        const list = items && items.length ? items : [{ tela: "none", duration: 30 }];
        if (list.length === 1) return { index: 0, item: list[0], remaining: null, progress: null, count: 1 };
        const total = list.reduce((s, it) => s + duration(it.duration), 0);
        let pos = ((elapsed % total) + total) % total;
        for (let i = 0; i < list.length; i++) {
          const d = duration(list[i].duration);
          if (pos < d) return { index: i, item: list[i], remaining: d - pos, progress: pos / d, count: list.length };
          pos -= d;
        }
        return { index: list.length - 1, item: list[list.length - 1], remaining: 0, progress: 1, count: list.length };
      }
    };
    let epoch = Date.now();
    const elapsed = () => (Date.now() - epoch) / 1000;
    function blankTile(r) { return Object.assign({ id: uid(), x: 0, y: 0, w: 1, h: 1, title: "", header: true, fit: "fill", items: [{ tela: "none", duration: 30 }] }, r); }

    /* ---------------- configuração padrão ---------------- */
    const I = (tela, d = 30) => ({ tela, duration: d });
    const T = (id, x, y, w, h, items, title = "") => ({ id, x, y, w, h, title, header: true, fit: "fill", items });
    const LOOK = { aspect: "16:9", bezel: 6, seams: true, background: "#04090f", labels: true, progressTv: false };
    const DEFAULTS = {
      version: 1,
      activeLayout: "sala-coe",
      layouts: [
        Object.assign({ id: "sala-coe", name: "Sala COE · Central", rows: 2, cols: 4 }, LOOK, { tiles: [
          T("geral", 0, 0, 2, 2, [I("geral", 40), I("du-geral", 20)], "Visão geral"),
          T("recepcao", 2, 0, 1, 1, [I("0"), I("fluxo")], "Recepção"),
          T("secagem", 3, 0, 1, 1, [I("3"), I("4")], "Secagem"),
          T("armazenagem", 2, 1, 1, 1, [I("5"), I("6")], "Silos · Armazém"),
          T("cameras", 3, 1, 1, 1, [I("cameras", 30), I("alertas", 20)], "Câmeras · Alertas")
        ] }),
        Object.assign({ id: "cameras", name: "Câmeras", rows: 2, cols: 3 }, LOOK, { tiles: [
          T("c1", 0, 0, 1, 1, [I("cam-recepcao")]), T("c2", 1, 0, 1, 1, [I("cam-classificacao")]), T("c3", 2, 0, 1, 1, [I("cam-moegas")]),
          T("c4", 0, 1, 1, 1, [I("cam-fornalha")]), T("c5", 1, 1, 1, 1, [I("cam-silos")]), T("c6", 2, 1, 1, 1, [I("cam-expedicao")])
        ] }),
        Object.assign({ id: "fluxo-turno", name: "Turno · Recepção e expedição", rows: 2, cols: 2 }, LOOK, { tiles: [
          T("f1", 0, 0, 1, 1, [I("0")]), T("f2", 1, 0, 1, 1, [I("fluxo")]),
          T("f3", 0, 1, 1, 1, [I("7")]), T("f4", 1, 1, 1, 1, [I("exp-fluxo")])
        ] }),
        Object.assign({ id: "demais-unidades", name: "Demais unidades", rows: 2, cols: 3 }, LOOK, { tiles: [
          T("d1", 0, 0, 2, 2, [I("du-geral")], "Demais unidades"),
          T("d2", 2, 0, 1, 1, [I("du-recebimento"), I("du-armazenagem")]),
          T("d3", 2, 1, 1, 1, [I("du-termometria"), I("du-secagem"), I("du-clima")])
        ] })
      ]
    };

    /* ---------------- normalização e armazenamento ---------------- */
    function normTile(t, k) {
      t = t || {};
      const list = Array.isArray(t.items) ? t.items : [];
      const items = list.slice(0, 12).map(it => ({ tela: KEYS.has(String(it && it.tela)) ? String(it.tela) : "none", duration: duration(it && it.duration) }));
      return {
        id: String(t.id || "t" + (k + 1)).slice(0, 24),
        x: Math.round(num(t.x)), y: Math.round(num(t.y)),
        w: clamp(Math.round(num(t.w, 1)), 1, 8), h: clamp(Math.round(num(t.h, 1)), 1, 6),
        title: String(t.title || "").slice(0, 40), header: t.header !== false,
        fit: t.fit === "contain" ? "contain" : "fill",
        items: items.length ? items : [{ tela: "none", duration: 30 }]
      };
    }
    function normLayout(l, i) {
      l = l || {};
      const rows = clamp(Math.round(num(l.rows, 2)), 1, 6), cols = clamp(Math.round(num(l.cols, 3)), 1, 8);
      const tiles = W.fit((Array.isArray(l.tiles) ? l.tiles : []).map(normTile), rows, cols).tiles;
      const seen = new Set();
      tiles.forEach(t => { let id = t.id, n = 2; while (seen.has(id)) id = t.id + "-" + n++; t.id = id; seen.add(id); });
      return {
        id: String(l.id || "layout-" + (i + 1)).slice(0, 40), name: String(l.name || "Layout " + (i + 1)).slice(0, 40),
        rows, cols, aspect: ASPECTS.includes(l.aspect) ? l.aspect : "16:9",
        bezel: clamp(Math.round(num(l.bezel, 6)), 0, 24), seams: l.seams !== false,
        background: /^#[0-9a-f]{6}$/i.test(l.background || "") ? l.background : "#04090f",
        labels: l.labels !== false, progressTv: l.progressTv === true, tiles
      };
    }
    function normalize(s) {
      const layouts = (s && Array.isArray(s.layouts) && s.layouts.length ? s.layouts : DEFAULTS.layouts).slice(0, 20).map(normLayout);
      const seen = new Set();
      layouts.forEach(l => { let id = l.id, n = 2; while (seen.has(id)) id = l.id + "-" + n++; l.id = id; seen.add(id); });
      return { version: 1, activeLayout: layouts.some(l => l.id === (s && s.activeLayout)) ? s.activeLayout : layouts[0].id, layouts };
    }
    function load() {
      try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.layouts)) return normalize(s); } catch (e) { /* padrão */ }
      return normalize(DEFAULTS);
    }
    let state = load();
    const ui = { open: false, editing: false, tv: false, override: null, sel: null, drawer: null };
    const curLayout = () => state.layouts.find(l => l.id === ui.override) || state.layouts.find(l => l.id === state.activeLayout) || state.layouts[0];
    const findTile = id => curLayout().tiles.find(t => t.id === id);

    /* ---------------- desfazer / refazer ---------------- */
    const hist = { past: [], future: [], last: JSON.stringify(state) };
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Não foi possível salvar: armazenamento indisponível.", "bad"); }
      const now = JSON.stringify(state);
      if (now !== hist.last) { hist.past.push(hist.last); if (hist.past.length > HIST_MAX) hist.past.shift(); hist.future = []; hist.last = now; }
    }
    function restore(json) {
      state = normalize(JSON.parse(json)); hist.last = json;
      try { localStorage.setItem(KEY, json); } catch (e) { /* noop */ }
      if (ui.sel && !findTile(ui.sel)) ui.sel = null;
      closeDrawer(); render();
    }
    function undo() { if (!hist.past.length) return toast("Nada para desfazer."); hist.future.push(hist.last); restore(hist.past.pop()); toast("Alteração desfeita."); }
    function redo() { if (!hist.future.length) return toast("Nada para refazer."); hist.past.push(hist.last); restore(hist.future.pop()); toast("Alteração refeita."); }
    function commit(msg) { save(); render(); if (msg) toast(msg); }

    /* ---------------- estilos (seguem os tokens do tema do COE) ---------------- */
    injectCss(`
      body.vw-open { overflow: hidden; }
      .vw-app { position: fixed; inset: 0; z-index: 900; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 16px;
        font-family: var(--font-ui, Inter, "Segoe UI", Arial, sans-serif); color: var(--text, #e9eff7); font-size: 13px; line-height: 1.4;
        background: linear-gradient(160deg, var(--bg-top, #081221) 0%, var(--bg-bottom, #0d1c30) 100%); overflow: auto; }
      .vw-app[hidden] { display: none; }
      .vw-app * { box-sizing: border-box; }
      .vw-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px;
        background: var(--header-bg, #0b1a2c); border-bottom: 2px solid var(--header-line, #1f6feb); box-shadow: var(--shadow-soft, none); }
      .vw-brand { display: flex; flex-direction: column; gap: 3px; padding-right: 12px; margin-right: 4px; border-right: 1px solid var(--panel-border, #ffffff22); }
      .vw-brand b { font-size: 14px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; }
      .vw-brand small { font-size: 10px; color: var(--muted, #8ea3ba); letter-spacing: .16em; text-transform: uppercase; }
      .vw-grow { flex: 1; }
      .vw-app .btn-header { font-size: 11px; }
      .vw-app .btn-header:disabled { opacity: .4; cursor: not-allowed; }
      .vw-app .btn-header.vw-primary { background: linear-gradient(135deg, var(--accent, #3b82f6) 0%, var(--accent-strong, #2563eb) 100%); color: #fff; border-color: transparent; }
      .vw-app .btn-header.vw-danger { color: var(--danger, #e74c3c); }
      .vw-panel { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--panel-bg, #101f34); border: 1px solid var(--panel-border, #ffffff22); }
      .vw-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
      .vw-row + .vw-row { padding-top: 10px; border-top: 1px solid var(--row-line, #ffffff18); }
      .vw-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted, #8ea3ba); }
      .vw-field { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted, #8ea3ba); }
      .vw-app select, .vw-app input[type="text"], .vw-app input[type="number"] { font: inherit; font-size: 12.5px; color: var(--text, #e9eff7); background: var(--section-bg, #0b1829);
        border: 1px solid var(--panel-border, #ffffff22); border-radius: 8px; padding: 6px 8px; letter-spacing: 0; text-transform: none; }
      .vw-app select:focus, .vw-app input:focus { outline: 2px solid var(--accent, #3b82f6); outline-offset: 1px; }
      .vw-app input[type="color"] { width: 36px; height: 28px; padding: 2px; border-radius: 6px; border: 1px solid var(--panel-border, #ffffff22); background: transparent; }
      .vw-app input[type="range"] { width: 110px; accent-color: var(--accent, #3b82f6); }
      .vw-check { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--text, #e9eff7); cursor: pointer; }
      .vw-check input { accent-color: var(--accent, #3b82f6); width: 15px; height: 15px; }
      .vw-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--panel-border, #ffffff22); border-radius: 999px; overflow: hidden; }
      .vw-seg button { border: 0; border-right: 1px solid var(--panel-border, #ffffff22); background: transparent; color: var(--muted, #8ea3ba);
        padding: 6px 11px; font: 700 11px var(--font-ui, Inter, sans-serif); letter-spacing: .04em; cursor: pointer; }
      .vw-seg button:last-child { border-right: 0; }
      .vw-seg button:hover { background: var(--accent-soft, #3b82f629); color: var(--text, #fff); }
      .vw-seg button.is-on { background: var(--accent, #3b82f6); color: #fff; }
      .vw-meta { margin-left: auto; font-size: 11.5px; color: var(--faint, #6d8199); }
      .vw-editbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 12px;
        border: 1px dashed var(--accent, #3b82f6); background: var(--accent-soft, #3b82f629); }
      .vw-editbar[hidden] { display: none; }
      .vw-tag { font-size: 10.5px; font-weight: 800; letter-spacing: .14em; color: #fff; background: var(--accent, #3b82f6); padding: 4px 9px; border-radius: 6px; }
      .vw-hint { flex: 1 1 360px; font-size: 11.5px; color: var(--muted, #8ea3ba); }
      .vw-frame { flex: 1; min-height: 260px; display: grid; place-items: center; padding: 12px; border-radius: 14px; background: var(--wallbg, #04090f); border: 1px solid var(--panel-border, #ffffff22); }
      .vw-wall { position: relative; display: grid; gap: var(--bezel, 6px); width: 100%; background: var(--wallbg, #04090f);
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
        aspect-ratio: calc(var(--cols) * var(--ar)) / calc(var(--rows) * var(--br)); max-height: calc(100vh - 260px); max-width: calc((100vh - 260px) * var(--cols) * var(--ar) / (var(--rows) * var(--br))); }
      .vw-tile { position: relative; min-width: 0; min-height: 0; overflow: hidden; border-radius: 3px; border: 1px solid #1b2a40; background: #07101c; }
      .vw-screen { position: absolute; inset: 0; overflow: hidden; }
      .vw-screen iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; pointer-events: none; background: transparent; }
      .vw-nosignal, .vw-empty { display: grid; place-items: center; color: #4b5d75; font: 600 11px ui-monospace, Consolas, monospace; letter-spacing: .22em;
        background: repeating-linear-gradient(45deg, #07101c 0 10px, #0a1525 10px 20px); }
      .vw-nosignal { position: absolute; inset: 0; }
      .vw-empty { position: relative; border-radius: 3px; min-width: 0; min-height: 0; }
      .vw-empty button { width: 44px; height: 44px; border-radius: 50%; border: 1px dashed #64748b; background: #0f172acc; color: #cbd5e1; font-size: 22px; cursor: pointer; }
      .vw-empty button:hover { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); color: #fff; }
      .vw-label { position: absolute; top: 6px; left: 6px; z-index: 3; max-width: calc(100% - 12px); padding: 3px 8px; border-radius: 6px;
        background: #000000b3; color: #cbd5e1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .vw-label b { color: #fff; margin-right: 5px; letter-spacing: .04em; }
      .vw-label .pl { color: #93c5fd; margin-left: 6px; font-variant-numeric: tabular-nums; }
      .vw-label .sp { color: #fbbf24; margin-left: 6px; font-size: 10px; }
      .vw-title { outline: none; }
      .vw-wall.is-edit .vw-label { z-index: 6; }
      .vw-wall.is-edit .vw-title[contenteditable] { cursor: text; border-bottom: 1px dashed #93c5fd88; padding: 0 2px; }
      .vw-wall.is-edit .vw-title[contenteditable]:focus { background: #1e293b; border-bottom-color: #93c5fd; }
      .vw-prog { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #ffffff14; z-index: 3; }
      .vw-prog i { display: block; height: 100%; width: 0; background: var(--accent, #3b82f6); transition: width 1s linear; }
      .vw-seams { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
      .vw-seams i { position: absolute; background: var(--wallbg, #04090f); }
      .vw-seams i.v { top: 0; bottom: 0; width: var(--bezel, 6px); transform: translateX(-50%); }
      .vw-seams i.h { left: 0; right: 0; height: var(--bezel, 6px); transform: translateY(-50%); }
      .vw-tools { position: absolute; top: 6px; right: 6px; z-index: 7; display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
      .vw-tile:hover .vw-tools, .vw-tile.is-sel .vw-tools, .vw-tile:focus-within .vw-tools { opacity: 1; }
      .vw-tools button, .vw-tools span { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 6px; border: 1px solid #334155;
        background: #0f172ae6; color: #e2e8f0; font-size: 12px; cursor: pointer; }
      .vw-tools span { cursor: grab; font-size: 14px; }
      .vw-tools button:hover, .vw-tools span:hover { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); color: #fff; }
      .vw-resize { position: absolute; right: 2px; bottom: 2px; z-index: 7; width: 22px; height: 22px; display: grid; place-items: center;
        border-radius: 6px 0 3px 0; background: var(--accent, #3b82f6); color: #fff; font-size: 13px; cursor: nwse-resize; touch-action: none; }
      .vw-wall:not(.is-edit) .vw-tools, .vw-wall:not(.is-edit) .vw-resize { display: none; }
      .vw-wall.is-edit .vw-tile { cursor: grab; touch-action: none; }
      .vw-wall.is-edit .vw-tile:hover { border-color: #60a5fa; }
      .vw-wall.is-edit .vw-tile.is-sel { border-color: var(--accent, #3b82f6); box-shadow: 0 0 0 2px var(--accent, #3b82f6), 0 0 22px #3b82f673; z-index: 4; outline: none; }
      .vw-wall.is-edit .vw-tile.is-drag { opacity: .45; }
      .vw-cells { position: absolute; inset: 0; z-index: 5; pointer-events: none; display: grid; gap: var(--bezel, 6px);
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); }
      .vw-cells i { border: 1px dashed #ffffff26; border-radius: 3px; }
      .vw-ghost { z-index: 8; pointer-events: none; border-radius: 4px; display: grid; place-items: center; font: 700 14px ui-monospace, Consolas, monospace; color: #fff; }
      .vw-ghost[hidden] { display: none; }
      .vw-ghost.ok { background: #2ecc7140; border: 2px solid var(--ok, #2ecc71); }
      .vw-ghost.bad { background: #e74c3c40; border: 2px solid var(--danger, #e74c3c); }
      .vw-scrim { position: fixed; inset: 0; z-index: 940; background: #0008; }
      .vw-scrim[hidden] { display: none; }
      .vw-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 950; width: min(440px, 100%); display: flex; flex-direction: column;
        background: var(--header-bg, #0b1a2c); border-left: 1px solid var(--panel-border, #ffffff22); box-shadow: -18px 0 40px #0006;
        transform: translateX(105%); visibility: hidden; transition: transform .2s ease, visibility .2s; font-family: var(--font-ui, Inter, sans-serif); color: var(--text, #e9eff7); font-size: 13px; }
      .vw-drawer.is-open { transform: none; visibility: visible; }
      .vw-dhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--panel-border, #ffffff22); }
      .vw-dhead strong { display: block; font-size: 14px; }
      .vw-dhead small { color: var(--muted, #8ea3ba); }
      .vw-dbody { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
      .vw-dfoot { display: flex; justify-content: space-between; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--panel-border, #ffffff22); }
      .vw-drawer label.vw-f { display: flex; flex-direction: column; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted, #8ea3ba); }
      .vw-drawer select, .vw-drawer input[type="text"], .vw-drawer input[type="number"] { font: inherit; font-size: 12.5px; color: var(--text, #e9eff7);
        background: var(--section-bg, #0b1829); border: 1px solid var(--panel-border, #ffffff22); border-radius: 8px; padding: 7px 8px; width: 100%; min-width: 0; letter-spacing: 0; text-transform: none; }
      .vw-drawer .btn-header:disabled { opacity: .4; cursor: not-allowed; }
      .vw-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: end; }
      .vw-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .vw-sec { font-size: 10.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--faint, #6d8199); margin-top: 4px; }
      .vw-msg { min-height: 16px; font-size: 12px; }
      .vw-msg.bad { color: var(--danger, #e74c3c); }
      .vw-pl { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .vw-pl li { display: grid; grid-template-columns: 18px minmax(0, 1fr) 70px auto; gap: 8px; align-items: center; padding: 8px; border-radius: 10px;
        background: var(--section-bg, #0b1829); border: 1px solid var(--panel-border, #ffffff22); }
      .vw-pl .n { font-weight: 800; color: var(--muted, #8ea3ba); text-align: center; }
      .vw-pl .acts { display: flex; gap: 4px; }
      .vw-ib { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 7px; border: 1px solid var(--panel-border, #ffffff22);
        background: transparent; color: var(--text, #e9eff7); cursor: pointer; font-size: 12px; }
      .vw-ib:hover:not(:disabled) { border-color: var(--accent, #3b82f6); color: var(--accent, #3b82f6); }
      .vw-ib:disabled { opacity: .3; cursor: not-allowed; }
      .vw-note { font-size: 11.5px; color: var(--muted, #8ea3ba); }
      .vw-toast { position: fixed; left: 50%; bottom: 22px; z-index: 990; transform: translate(-50%, 16px); padding: 10px 16px; border-radius: 10px;
        background: #0f172a; color: #fff; font: 600 13px var(--font-ui, Inter, sans-serif); box-shadow: 0 10px 30px #0006; opacity: 0; pointer-events: none; transition: .2s; }
      .vw-toast.show { opacity: 1; transform: translate(-50%, 0); }
      .vw-toast.bad { background: #7f1d1d; }
      .vw-toast.good { background: #14532d; }
      .vw-exit { position: fixed; top: 14px; right: 14px; z-index: 980; opacity: 0; pointer-events: none; transition: opacity .2s; }
      .vw-app.is-tv { padding: 0; gap: 0; background: #000; overflow: hidden; }
      .vw-app.is-tv .vw-top, .vw-app.is-tv .vw-panel, .vw-app.is-tv .vw-editbar { display: none; }
      .vw-app.is-tv .vw-frame { padding: 0; border: 0; border-radius: 0; height: 100vh; background: #000; }
      .vw-app.is-tv .vw-wall { max-height: 100vh; max-width: calc(100vh * var(--cols) * var(--ar) / (var(--rows) * var(--br))); }
      .vw-app.is-tv .vw-wall:not(.prog-tv) .vw-prog { display: none; }
      .vw-app.is-tv.show-ui .vw-exit { opacity: 1; pointer-events: auto; }
      #btnVideowall .btn-icon, #btnIdentidade .btn-icon, #btnPortal .btn-icon { width: .875rem; height: .875rem; }
      .vw-group { display: inline-flex; gap: 4px; padding: 3px; border-radius: 999px; border: 1px solid var(--panel-border, #ffffff22); }
      .vw-app .btn-header svg { vertical-align: -2px; }
      .vw-empty button svg { width: 20px; height: 20px; }
      .vw-ib--h { width: 30px; height: 30px; border-radius: 999px; border: 0; font-size: 14px; }
      .vw-ib--h:hover:not(:disabled) { background: var(--accent-soft, #3b82f629); }
      .vw-ib--danger:hover:not(:disabled) { color: var(--danger, #e74c3c); border-color: var(--danger, #e74c3c); }
      .vw-clock { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted, #8ea3ba); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .vw-loading { position: absolute; inset: 0; z-index: 2; display: none; place-items: center; align-content: center; gap: 10px; color: var(--muted, #8ea3ba);
        font-size: 11px; letter-spacing: .14em; text-transform: uppercase; background: #07101ccc; }
      .vw-tile.is-loading .vw-loading { display: grid; }
      .vw-loading i { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff22; border-top-color: var(--accent, #3b82f6); animation: vwspin .9s linear infinite; }
      @keyframes vwspin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .vw-loading i { animation: none; } }
      @media (max-width: 1500px) { .vw-brand { display: none; } }
      @media (max-width: 1280px) { .vw-clock { display: none; } }
      /* painel de identidade */
      .coe-logo-prev { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: var(--section-bg, #0b1829); border: 1px solid var(--panel-border, #ffffff22); }
      .coe-logo-prev .pv { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; overflow: hidden; flex: none;
        background: var(--accent, #3b82f6); color: #fff; font-weight: 800; letter-spacing: .04em; }
      .coe-logo-prev .pv img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
      .coe-logo-prev .acts { display: flex; flex-wrap: wrap; gap: 6px; }
      .coe-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
      .coe-grid2 small { font-size: 10px; color: var(--faint, #6d8199); letter-spacing: 0; text-transform: none; font-weight: 500; }
      .coe-color { display: flex; align-items: center; gap: 10px; }
      .vw-drawer label.vw-f small, .vw-drawer label.vw-f .vw-note { font-size: 11px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--faint, #6d8199); }
      .vw-dfoot { align-items: center; flex-wrap: wrap; }
      .vw-dfoot > span { display: flex; flex-wrap: wrap; gap: 6px; }
      .vw-dfoot .btn-header { white-space: nowrap; }
      @media (max-width: 760px) {
        .vw-app { padding: 8px; }
        .vw-hint { display: none; }
        .vw-meta { margin-left: 0; }
        .vw-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .coe-grid2 { grid-template-columns: 1fr; }
        .vw-group { order: 2; }
        .vw-pl li { grid-template-columns: 18px minmax(0, 1fr) 64px; }
        .vw-pl .acts { grid-column: 2 / -1; justify-content: flex-end; }
        .vw-wall { max-height: none; max-width: 100%; }
      }
    `);

    /* ---------------- estrutura ---------------- */
    const app = document.createElement("div");
    app.className = "vw-app"; app.id = "vwApp"; app.hidden = true;
    app.setAttribute("role", "dialog"); app.setAttribute("aria-label", "Videowall editável");
    app.innerHTML = `
      <div class="vw-top" id="vwTop"></div>
      <section class="vw-panel" id="vwPanel"></section>
      <div class="vw-editbar" id="vwEditbar" role="toolbar" aria-label="Editor do videowall" hidden></div>
      <section class="vw-frame" id="vwFrame"><div class="vw-wall" id="vwWall"><div class="vw-ghost" id="vwGhost" hidden></div></div></section>
      <button type="button" class="btn-header vw-primary vw-exit" id="vwExit">✕ SAIR DO MODO TV</button>`;
    document.body.appendChild(app);
    const scrim = document.createElement("div"); scrim.className = "vw-scrim"; scrim.hidden = true; document.body.appendChild(scrim);
    const drawer = document.createElement("aside"); drawer.className = "vw-drawer"; drawer.setAttribute("aria-label", "Configurar tela"); document.body.appendChild(drawer);
    const toastEl = document.createElement("div"); toastEl.className = "vw-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); document.body.appendChild(toastEl);
    const fileIn = document.createElement("input"); fileIn.type = "file"; fileIn.accept = "application/json,.json"; fileIn.hidden = true; document.body.appendChild(fileIn);
    const wallEl = $("#vwWall"), ghost = $("#vwGhost");

    // botão no cabeçalho do COE, no mesmo estilo dos demais
    const controls = $(".header-controls");
    if (controls) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn-header"; b.id = "btnVideowall"; b.title = "Montar o videowall com as telas (layout editável)";
      b.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="9" height="8" rx="1"></rect><rect x="13" y="3" width="9" height="8" rx="1"></rect><rect x="2" y="13" width="9" height="8" rx="1"></rect><rect x="13" y="13" width="9" height="8" rx="1"></rect></svg><span>VIDEOWALL</span>';
      b.addEventListener("click", () => openApp());
      const live = $("#btnLive", controls);
      controls.insertBefore(b, live || controls.firstChild);
    }

    let toastT = null;
    function toast(msg, tone = "") {
      toastEl.textContent = msg; toastEl.className = "vw-toast show " + tone;
      clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = "vw-toast"), 2600);
    }
    const tema = () => document.body.classList.contains("theme-light") ? "light" : "dark";


    /* ícones (SVG: aparecem iguais em qualquer computador, sem depender de fonte) */
    const svg = p => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    const IC = {
      plus: svg('<path d="M12 5v14M5 12h14"/>'),
      copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
      edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
      trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
      grip: svg('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>'),
      gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
      split: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/>'),
      close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
      resize: svg('<path d="M21 15v6h-6M21 21l-7-7M3 9V3h6M3 3l7 7"/>')
    };
    /* ---------------- barra superior e controles ---------------- */
    function renderTop() {
      $("#vwTop").innerHTML = `
        <div class="vw-brand"><b>VIDEOWALL</b><small>COE · Cooperativa Agroindustrial</small></div>
        <label class="vw-field">Layout <select id="vwLayout" data-act="layout-select">${state.layouts.map(l => `<option value="${esc(l.id)}" ${l.id === curLayout().id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>
        <span class="vw-group" role="group" aria-label="Gerenciar layouts">
          <button type="button" class="vw-ib vw-ib--h" data-act="layout-new" title="Novo layout" aria-label="Novo layout">${IC.plus}</button>
          <button type="button" class="vw-ib vw-ib--h" data-act="layout-dup" title="Duplicar layout" aria-label="Duplicar layout">${IC.copy}</button>
          <button type="button" class="vw-ib vw-ib--h" data-act="layout-rename" title="Renomear layout" aria-label="Renomear layout">${IC.edit}</button>
          <button type="button" class="vw-ib vw-ib--h vw-ib--danger" data-act="layout-del" title="Excluir layout" aria-label="Excluir layout" ${state.layouts.length < 2 ? "disabled" : ""}>${IC.trash}</button>
        </span>
        <span class="vw-clock" id="vwClock" aria-live="off"></span>
        <span class="vw-grow"></span>
        <button type="button" class="btn-header ${ui.editing ? "active" : ""}" data-act="edit" aria-pressed="${ui.editing}">${ui.editing ? "✓ CONCLUIR" : "✎ EDITAR LAYOUT"}</button>
        <button type="button" class="btn-header" data-act="tv-link" title="Copia o endereço que abre este layout direto no modo TV">LINK TV</button>
        <button type="button" class="btn-header vw-primary" data-act="tv">▶ MODO TV</button>
        <button type="button" class="btn-header" data-act="close" title="Voltar às telas (Esc)">✕ FECHAR</button>`;
      tickClock();
    }
    function tickClock() {
      const c = $("#vwClock");
      if (c) c.textContent = new Date().toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    }
    setInterval(() => { if (ui.open) tickClock(); }, 15000);
    function renderPanel() {
      const L = curLayout();
      const opt = (n, max) => Array.from({ length: max }, (_, i) => `<option value="${i + 1}" ${n === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("");
      const allOne = L.tiles.every(t => t.w * t.h === 1);
      const pres = PRESETS.map(p => `<button type="button" data-act="preset" data-preset="${p.id}" class="${!p.rects && allOne && p.cols === L.cols && p.rows === L.rows && L.tiles.length === p.cols * p.rows ? "is-on" : ""}">${p.name}</button>`).join("");
      const merged = L.tiles.filter(t => t.w * t.h > 1).length, pls = L.tiles.filter(t => t.items.length > 1).length;
      $("#vwPanel").innerHTML = `
        <div class="vw-row">
          <label class="vw-field">Linhas <select data-act="rows">${opt(L.rows, 6)}</select></label>
          <label class="vw-field">Colunas <select data-act="cols">${opt(L.cols, 8)}</select></label>
          <span class="vw-lbl">Modelos</span><div class="vw-seg" role="group" aria-label="Modelos de matriz">${pres}</div>
          <span class="vw-meta">${L.rows * L.cols} monitores · ${L.tiles.length} telas · ${merged} mescladas · ${pls} com playlist · ${W.freeCells(L.tiles, L.rows, L.cols).length} livres</span>
        </div>
        <div class="vw-row">
          <label class="vw-field">Monitor <select data-act="aspect">${ASPECTS.map(a => `<option ${a === L.aspect ? "selected" : ""}>${a}</option>`).join("")}</select></label>
          <label class="vw-field">Moldura <input type="range" min="0" max="24" value="${L.bezel}" data-act="bezel" aria-label="Moldura entre monitores"><output>${L.bezel} px</output></label>
          <label class="vw-field">Fundo <input type="color" value="${esc(L.background)}" data-act="bg" aria-label="Cor de fundo"></label>
          <label class="vw-check"><input type="checkbox" data-act="seams" ${L.seams ? "checked" : ""}> Emendas nas telas mescladas</label>
          <label class="vw-check"><input type="checkbox" data-act="labels" ${L.labels ? "checked" : ""}> Identificar telas</label>
          <label class="vw-check"><input type="checkbox" data-act="progtv" ${L.progressTv ? "checked" : ""}> Progresso no modo TV</label>
          <span class="vw-grow"></span>
          <button type="button" class="btn-header" data-act="export" title="Baixar os layouts em JSON">⇩ EXPORTAR</button>
          <button type="button" class="btn-header" data-act="import" title="Carregar layouts de um JSON">⇧ IMPORTAR</button>
        </div>`;
    }
    function renderEditbar() {
      const bar = $("#vwEditbar");
      bar.hidden = !ui.editing;
      if (!ui.editing) { bar.innerHTML = ""; return; }
      bar.innerHTML = `
        <span class="vw-tag">MODO EDIÇÃO</span>
        <button type="button" class="btn-header vw-primary" data-act="tile-add">${IC.plus} ADICIONAR TV</button>
        <button type="button" class="btn-header" data-act="undo" ${hist.past.length ? "" : "disabled"} title="Desfazer (Ctrl+Z)">DESFAZER</button>
        <button type="button" class="btn-header" data-act="redo" ${hist.future.length ? "" : "disabled"} title="Refazer (Ctrl+Shift+Z)">REFAZER</button>
        <button type="button" class="btn-header" data-act="layout-restore" title="Voltar este layout ao padrão">RESTAURAR LAYOUT</button>
        <span class="vw-hint">Clique no nome da TV para renomear · arraste a TV para mover (soltar sobre outra do mesmo tamanho troca as duas) · alça no canto inferior direito redimensiona e mescla monitores · botões da TV: configurar, duplicar, dividir e remover · teclado: setas movem, Shift+setas redimensionam, Del remove, Ctrl+D duplica, Enter configura</span>`;
    }

    /* ---------------- videowall: telas preservam o quadro (sem recarregar) ---------------- */
    const ar = L => { const [a, b] = L.aspect.split(":").map(Number); return { a: a || 16, b: b || 9 }; };
    function virtualSize(L, t) {
      if (t.fit === "contain") return { w: 1600, h: 900 };
      const { a, b } = ar(L), ratio = (t.w * a) / (t.h * b);
      let h = 900, w = Math.round(900 * ratio);
      if (w < 1280) { w = 1280; h = Math.round(1280 / ratio); }
      if (w > 3200) { w = 3200; h = Math.round(3200 / ratio); }
      return { w, h };
    }
    function embedUrl(tela) {
      const u = new URL(location.href);
      u.hash = ""; u.search = "";
      u.searchParams.set("vw-embed", "1"); u.searchParams.set("tela", tela); u.searchParams.set("tema", tema());
      return u.href;
    }
    function send(fr, msg) { try { fr.contentWindow.postMessage(Object.assign({ vw: 1 }, msg), "*"); } catch (e) { /* quadro ainda carregando */ } }
    function scaleFrame(screen) {
      const fr = $("iframe", screen);
      if (!fr || !screen.clientWidth) return;
      const w = parseFloat(fr.style.width), h = parseFloat(fr.style.height);
      const s = Math.min(screen.clientWidth / w, screen.clientHeight / h);
      const x = (screen.clientWidth - w * s) / 2, y = (screen.clientHeight - h * s) / 2;
      fr.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    }
    function ensureScreen(node, L, t, cur) {
      const screen = $(".vw-screen", node), tela = cur.item.tela;
      let fr = $("iframe", screen), ns = $(".vw-nosignal", screen);
      if (tela === "none") {
        if (fr) fr.style.visibility = "hidden";
        if (!ns) { ns = document.createElement("div"); ns.className = "vw-nosignal"; ns.textContent = "SEM SINAL"; screen.appendChild(ns); }
        return;
      }
      if (ns) ns.remove();
      const vs = virtualSize(L, t);
      if (!fr) {
        fr = document.createElement("iframe");
        fr.title = "TV · " + srcName(tela); fr.tabIndex = -1; fr.setAttribute("aria-hidden", "true");
        fr.dataset.tela = tela;
        node.classList.add("is-loading");
        fr.addEventListener("load", () => {
          send(fr, { tela: fr.dataset.tela, tema: tema() });
          setTimeout(() => node.classList.remove("is-loading"), 350);
        });
        fr.style.width = vs.w + "px"; fr.style.height = vs.h + "px";
        fr.src = embedUrl(tela);
        screen.appendChild(fr);
      } else {
        if (fr.style.width !== vs.w + "px" || fr.style.height !== vs.h + "px") { fr.style.width = vs.w + "px"; fr.style.height = vs.h + "px"; }
        if (fr.dataset.tela !== tela) { fr.dataset.tela = tela; fr.title = "TV · " + srcName(tela); send(fr, { tela }); }
      }
      fr.style.visibility = "";
      scaleFrame(screen);
    }
    function labelHtml(n, t, cur) {
      const pl = cur.count > 1 ? `<span class="pl">${cur.index + 1}/${cur.count} · ${Math.max(1, Math.ceil(cur.remaining))} s</span>` : "";
      const sp = t.w * t.h > 1 ? `<span class="sp">${t.w}×${t.h}</span>` : "";
      const name = t.title || srcName(cur.item.tela);
      const title = ui.editing
        ? `<span class="vw-title" contenteditable="plaintext-only" spellcheck="false" data-title-for="${esc(t.id)}" title="Clique para renomear (vazio = nome da tela)">${esc(name)}</span>`
        : `<span class="vw-title">${esc(name)}</span>`;
      return `<b>TV ${String(n).padStart(2, "0")}</b>${title}${sp}${pl}`;
    }
    function updateTile(node, L, t, n, el) {
      const cur = W.current(t.items, el);
      node.style.gridColumn = `${t.x + 1} / span ${t.w}`;
      node.style.gridRow = `${t.y + 1} / span ${t.h}`;
      node.classList.toggle("is-sel", ui.editing && ui.sel === t.id);
      node.tabIndex = ui.editing ? 0 : -1;
      ensureScreen(node, L, t, cur);
      const lab = $(".vw-label", node), showLab = L.labels && t.header;
      lab.hidden = !showLab;
      if (showLab && !lab.contains(document.activeElement)) lab.innerHTML = labelHtml(n, t, cur);
      let seams = "";
      if (L.seams && t.w * t.h > 1) {
        for (let k = 1; k < t.w; k++) seams += `<i class="v" style="left:${(k / t.w * 100).toFixed(4)}%"></i>`;
        for (let k = 1; k < t.h; k++) seams += `<i class="h" style="top:${(k / t.h * 100).toFixed(4)}%"></i>`;
      }
      $(".vw-seams", node).innerHTML = seams;
      const prog = $(".vw-prog", node);
      prog.hidden = cur.count < 2;
      if (cur.count > 1) {
        const bar = $("i", prog), pct = cur.progress * 100, prev = parseFloat(bar.style.width) || 0;
        if (pct < prev) { bar.style.transition = "none"; bar.style.width = pct.toFixed(1) + "%"; void bar.offsetWidth; bar.style.transition = ""; }
        else bar.style.width = pct.toFixed(1) + "%";
      }
      const id = esc(t.id);
      const tools = $(".vw-tools", node);
      const sig = `${ui.editing}|${t.w * t.h > 1}`;
      if (tools.dataset.sig !== sig) {
        tools.dataset.sig = sig;
        tools.innerHTML = ui.editing ? `<span data-drag="${id}" title="Arraste para mover">${IC.grip}</span>
          <button type="button" data-act="tile-cfg" data-tile="${id}" title="Playlist, nome e posição" aria-label="Configurar">${IC.gear}</button>
          <button type="button" data-act="tile-dup" data-tile="${id}" title="Duplicar (Ctrl+D)" aria-label="Duplicar">${IC.copy}</button>
          ${t.w * t.h > 1 ? `<button type="button" data-act="tile-split" data-tile="${id}" title="Dividir em monitores individuais" aria-label="Dividir">${IC.split}</button>` : ""}
          <button type="button" data-act="tile-del" data-tile="${id}" title="Remover (Del)" aria-label="Remover">${IC.close}</button>` : "";
      }
    }
    function render() {
      if (!ui.open) return;
      renderTop(); renderPanel(); renderEditbar();
      const L = curLayout(), { a, b } = ar(L), el = elapsed();
      app.classList.toggle("is-tv", ui.tv);
      $("#vwFrame").style.setProperty("--wallbg", L.background);
      wallEl.classList.toggle("is-edit", ui.editing && !ui.tv);
      wallEl.classList.toggle("prog-tv", L.progressTv);
      wallEl.style.cssText = `--cols:${L.cols};--rows:${L.rows};--ar:${a};--br:${b};--bezel:${L.bezel}px;--wallbg:${L.background}`;
      if (wallEl.dataset.layout !== L.id) { $$(".vw-tile", wallEl).forEach(n => n.remove()); wallEl.dataset.layout = L.id; }
      const want = new Set(L.tiles.map(t => t.id));
      $$(".vw-tile", wallEl).forEach(n => { if (!want.has(n.dataset.id)) n.remove(); });
      W.ordered(L.tiles).forEach((t, k) => {
        let node = wallEl.querySelector(`.vw-tile[data-id="${cssEsc(t.id)}"]`);
        if (!node) {
          node = document.createElement("div");
          node.className = "vw-tile"; node.dataset.id = t.id;
          node.innerHTML = `<div class="vw-screen"></div><div class="vw-loading" aria-hidden="true"><i></i><span>Carregando tela…</span></div><div class="vw-seams" aria-hidden="true"></div><div class="vw-label"></div>
            <div class="vw-prog" hidden><i></i></div><div class="vw-tools"></div><span class="vw-resize" data-resize="${esc(t.id)}" title="Arraste para redimensionar / mesclar">${IC.resize}</span>`;
          wallEl.insertBefore(node, ghost);
        }
        updateTile(node, L, t, k + 1, el);
      });
      $$(".vw-empty, .vw-cells", wallEl).forEach(n => n.remove());
      W.freeCells(L.tiles, L.rows, L.cols).forEach(c => {
        const e = document.createElement("div");
        e.className = "vw-empty"; e.style.gridColumn = String(c.x + 1); e.style.gridRow = String(c.y + 1);
        e.innerHTML = ui.editing && !ui.tv ? `<button type="button" data-act="tile-add" data-x="${c.x}" data-y="${c.y}" title="Criar TV nesta posição" aria-label="Criar TV">${IC.plus}</button>` : "SEM SINAL";
        wallEl.insertBefore(e, ghost);
      });
      if (ui.editing && !ui.tv) {
        const cells = document.createElement("div");
        cells.className = "vw-cells"; cells.setAttribute("aria-hidden", "true");
        cells.innerHTML = "<i></i>".repeat(L.rows * L.cols);
        wallEl.insertBefore(cells, ghost);
      }
      requestAnimationFrame(() => $$(".vw-screen", wallEl).forEach(scaleFrame));
    }
    new ResizeObserver(() => { if (ui.open) $$(".vw-screen", wallEl).forEach(scaleFrame); }).observe(wallEl);

    // a cada segundo: troca só o conteúdo das telas cuja vez chegou
    setInterval(() => {
      if (!ui.open || drag) return;
      const L = curLayout(), el = elapsed();
      W.ordered(L.tiles).forEach((t, k) => {
        const node = wallEl.querySelector(`.vw-tile[data-id="${cssEsc(t.id)}"]`);
        if (node) updateTile(node, L, t, k + 1, el);
      });
    }, 1000);

    // tema claro/escuro do COE também vale para as TVs
    new MutationObserver(() => $$("iframe", wallEl).forEach(fr => send(fr, { tema: tema() })))
      .observe(document.body, { attributes: true, attributeFilter: ["class"] });

    /* ---------------- abrir / fechar / modo TV ---------------- */
    let wake = null, uiT = null;
    async function wakeOn() {
      try { if (ui.tv && "wakeLock" in navigator && document.visibilityState === "visible" && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } }
      catch (e) { wake = null; }
    }
    function wakeOff() { try { if (wake) wake.release(); } catch (e) { /* noop */ } wake = null; }
    function openApp() { ui.open = true; app.hidden = false; document.body.classList.add("vw-open"); render(); }
    function closeApp() {
      if (ui.tv) exitTv();
      ui.open = false; ui.editing = false; ui.sel = null; closeDrawer();
      app.hidden = true; document.body.classList.remove("vw-open");
      $$(".vw-tile, .vw-empty, .vw-cells", wallEl).forEach(n => n.remove()); // descarrega os quadros
      wallEl.dataset.layout = "";
    }
    function showUi() { if (!ui.tv) return; app.classList.add("show-ui"); clearTimeout(uiT); uiT = setTimeout(() => app.classList.remove("show-ui"), 3000); }
    function enterTv() {
      ui.tv = true; ui.editing = false; ui.sel = null; closeDrawer(); render();
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      wakeOn(); showUi();
    }
    function exitTv() {
      ui.tv = false; ui.override = null; wakeOff();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      try { const u = new URL(location.href); ["tv", "layout"].forEach(k => u.searchParams.delete(k)); history.replaceState(null, "", u.href); } catch (e) { /* file:// */ }
      render();
    }
    function tvLink() {
      const u = new URL(location.href);
      u.search = ""; u.hash = "";
      u.searchParams.set("videowall", "1"); u.searchParams.set("tv", "1"); u.searchParams.set("layout", curLayout().id);
      return u.href;
    }
    $("#vwExit").addEventListener("click", exitTv);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wakeOn(); });
    document.addEventListener("fullscreenchange", () => setTimeout(() => $$(".vw-screen", wallEl).forEach(scaleFrame), 80));
    app.addEventListener("mousemove", showUi, { passive: true });

    /* ---------------- painel da tela ---------------- */
    function closeDrawer() { drawer.classList.remove("is-open"); scrim.hidden = true; ui.drawer = null; }
    function srcOptions(sel) {
      let html = `<option value="none" ${sel === "none" ? "selected" : ""}>Sem sinal</option>`;
      const groups = [...new Set(SOURCES.map(s => s.group))];
      groups.forEach(g => {
        html += `<optgroup label="${esc(g)}">` + SOURCES.filter(s => s.group === g).map(s => `<option value="${esc(s.key)}" ${s.key === sel ? "selected" : ""}>${esc(s.label)}</option>`).join("") + `</optgroup>`;
      });
      return html;
    }
    function openTile(id, focusSel) {
      const L = curLayout(), t = L.tiles.find(o => o.id === id);
      if (!t) return;
      const n = W.ordered(L.tiles).indexOf(t) + 1, k = t.items.length;
      const total = t.items.reduce((s, it) => s + duration(it.duration), 0);
      const rows = t.items.map((it, q) => `<li><span class="n">${q + 1}</span>
          <select aria-label="Tela ${q + 1}" data-pl="tela" data-k="${q}">${srcOptions(it.tela)}</select>
          <input type="number" min="${MIN}" max="${MAX}" step="1" aria-label="Duração em segundos" data-pl="dur" data-k="${q}" value="${duration(it.duration)}" ${k < 2 ? "disabled" : ""}>
          <span class="acts"><button type="button" class="vw-ib" data-act="pl-up" data-k="${q}" ${q === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
          <button type="button" class="vw-ib" data-act="pl-down" data-k="${q}" ${q === k - 1 ? "disabled" : ""} aria-label="Descer">↓</button>
          <button type="button" class="vw-ib" data-act="pl-del" data-k="${q}" ${k < 2 ? "disabled" : ""} aria-label="Remover">✕</button></span></li>`).join("");
      const geo = (key, label, max) => `<label class="vw-f">${label}<input type="number" min="1" max="${max}" step="1" data-geo="${key}" value="${key === "x" || key === "y" ? t[key] + 1 : t[key]}"></label>`;
      drawer.innerHTML = `
        <div class="vw-dhead"><div><strong>TV ${String(n).padStart(2, "0")} · ${esc(t.title || srcName(t.items[0].tela))}</strong><small>Layout “${esc(L.name)}” · ${t.w}×${t.h} monitor${t.w * t.h > 1 ? "es" : ""}</small></div>
          <button type="button" class="vw-ib" data-act="drawer-close" aria-label="Fechar">✕</button></div>
        <form class="vw-dbody" id="vwTileForm" data-tile="${esc(t.id)}" novalidate>
          <div class="vw-sec">Tela</div>
          <label class="vw-f">Nome exibido<input type="text" maxlength="40" data-tp="title" value="${esc(t.title)}" placeholder="Automático (nome da tela)"></label>
          <div class="vw-2">
            <label class="vw-f">Ajuste<select data-tp="fit">
              <option value="fill" ${t.fit === "fill" ? "selected" : ""}>Ocupar a TV toda (reorganiza a tela)</option>
              <option value="contain" ${t.fit === "contain" ? "selected" : ""}>Manter 16:9 (com bordas)</option></select></label>
            <label class="vw-check"><input type="checkbox" data-tp="header" ${t.header ? "checked" : ""}> Mostrar rótulo</label>
          </div>
          <div class="vw-sec">Posição e tamanho · matriz ${L.cols}×${L.rows}</div>
          <div class="vw-4">${geo("x", "Coluna", L.cols)}${geo("y", "Linha", L.rows)}${geo("w", "Largura", L.cols)}${geo("h", "Altura", L.rows)}</div>
          <p class="vw-msg" id="vwGeoMsg" role="status" aria-live="polite"></p>
          <div class="vw-sec">Playlist</div>
          <p class="vw-note">${k} tela${k === 1 ? "" : "s"}${k > 1 ? ` · ciclo de ${total} s. As telas alternam na ordem abaixo, sem recarregar a página.` : ". Com uma única tela a TV fica fixa; adicione outras para formar a playlist."}</p>
          <ol class="vw-pl">${rows}</ol>
          <button type="button" class="btn-header" data-act="pl-add" ${k >= 12 ? "disabled" : ""}>${IC.plus} ADICIONAR TELA À PLAYLIST</button>
          <p class="vw-note">Duração de ${MIN} a ${MAX.toLocaleString("pt-BR")} segundos, até 12 telas por TV. O conteúdo de cada tela continua sendo editado no botão EDITAR do COE.</p>
        </form>
        <div class="vw-dfoot"><span><button type="button" class="btn-header vw-danger" data-act="tile-del" data-tile="${esc(t.id)}">REMOVER TV</button>
          ${t.w * t.h > 1 ? `<button type="button" class="btn-header" data-act="tile-split" data-tile="${esc(t.id)}">DIVIDIR</button>` : ""}</span>
          <button type="button" class="btn-header vw-primary" data-act="drawer-close">CONCLUIR</button></div>`;
      drawer.classList.add("is-open"); scrim.hidden = false; ui.drawer = id;
      const f = focusSel && $(focusSel, drawer);
      if (f) f.focus();
    }
    const formTile = () => { const f = $("#vwTileForm", drawer); return f ? findTile(f.dataset.tile) : null; };
    function tileChanged(t, focusSel) { commit(); openTile(t.id, focusSel); }

    /* ---------------- ações ---------------- */
    function setMatrix(L, rows, cols) {
      rows = clamp(rows, 1, 6); cols = clamp(cols, 1, 8);
      if (rows === L.rows && cols === L.cols) return false;
      const r = W.fit(L.tiles, rows, cols);
      if (r.removed && !confirm(`${r.removed} TV(s) com conteúdo ficarão fora da nova matriz e serão removidas. Continuar?`)) return false;
      L.tiles = r.tiles; L.rows = rows; L.cols = cols;
      return true;
    }
    function addTile(x, y) {
      const L = curLayout();
      const r = x !== undefined ? { x: +x, y: +y, w: 1, h: 1 } : W.firstFree(L.tiles, L.rows, L.cols);
      if (!r || !W.canPlace(L.tiles, r, L.rows, L.cols)) return toast("Não há monitor livre. Aumente a matriz ou divida uma TV.", "bad");
      const t = blankTile(r); L.tiles.push(t); ui.sel = t.id;
      commit("TV criada. Escolha a tela em ⚙.");
    }
    function dupTile(id) {
      const L = curLayout(), t = L.tiles.find(o => o.id === id);
      if (!t) return;
      const r = W.firstFree(L.tiles, L.rows, L.cols, t.w, t.h) || W.firstFree(L.tiles, L.rows, L.cols);
      if (!r) return toast("Sem monitor livre para duplicar. Aumente a matriz.", "bad");
      const c = Object.assign(clone(t), { id: uid() }, r); L.tiles.push(c); ui.sel = c.id;
      commit(r.w === t.w && r.h === t.h ? "TV duplicada." : "TV duplicada em 1×1 (não havia espaço do mesmo tamanho).");
    }
    function delTile(id) {
      const L = curLayout();
      if (!L.tiles.some(t => t.id === id)) return;
      L.tiles = L.tiles.filter(t => t.id !== id); if (ui.sel === id) ui.sel = null;
      closeDrawer(); commit("TV removida (Ctrl+Z desfaz).");
    }
    function splitTile(id) {
      const L = curLayout(), out = W.split(L.tiles, id);
      if (!out) return;
      L.tiles = out; closeDrawer(); commit("TV dividida em monitores individuais.");
    }
    function moveTile(id, x, y) { const L = curLayout(), o = W.move(L.tiles, id, x, y, L.rows, L.cols); if (!o) return false; L.tiles = o; return true; }
    function resizeTile(id, w, h) { const L = curLayout(), o = W.resize(L.tiles, id, w, h, L.rows, L.cols); if (!o) return false; L.tiles = o; return true; }
    function select(id, focus) {
      ui.sel = id || null;
      $$(".vw-tile", wallEl).forEach(n => n.classList.toggle("is-sel", ui.editing && n.dataset.id === ui.sel));
      if (focus && id) { const n = wallEl.querySelector(`.vw-tile[data-id="${cssEsc(id)}"]`); if (n) n.focus({ preventScroll: true }); }
    }

    const ACTIONS = {
      "close": closeApp,
      "edit": () => { ui.editing = !ui.editing; if (!ui.editing) { ui.sel = null; closeDrawer(); toast("Layout salvo neste navegador.", "good"); } render(); },
      "tv": enterTv,
      "tv-link": () => {
        const link = tvLink(), fb = () => prompt("Copie o link do modo TV:", link);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(() => toast("Link do modo TV copiado.", "good"), fb); else fb();
      },
      "layout-new": () => {
        const name = (prompt("Nome do novo layout:", "Novo layout") || "").trim().slice(0, 40);
        if (!name) return;
        if (state.layouts.length >= 20) return toast("Limite de 20 layouts.", "bad");
        const L = curLayout(), id = slug(name) + "-" + Math.random().toString(36).slice(2, 5);
        state.layouts.push(normLayout({ id, name, rows: L.rows, cols: L.cols, aspect: L.aspect, bezel: L.bezel, background: L.background,
          tiles: Array.from({ length: L.rows * L.cols }, (_, k) => blankTile({ x: k % L.cols, y: Math.floor(k / L.cols) })) }, 0));
        state.activeLayout = id; ui.override = null; epoch = Date.now();
        commit(`Layout “${name}” criado.`);
      },
      "layout-dup": () => {
        if (state.layouts.length >= 20) return toast("Limite de 20 layouts.", "bad");
        const c = clone(curLayout()); c.name = (c.name + " (cópia)").slice(0, 40); c.id = slug(c.name) + "-" + Math.random().toString(36).slice(2, 5);
        state.layouts.push(c); state.activeLayout = c.id; ui.override = null; epoch = Date.now();
        commit("Layout duplicado.");
      },
      "layout-rename": () => {
        const L = curLayout(), name = (prompt("Novo nome do layout:", L.name) || "").trim().slice(0, 40);
        if (name) { L.name = name; commit(); }
      },
      "layout-del": () => {
        const L = curLayout();
        if (state.layouts.length < 2 || !confirm(`Excluir o layout “${L.name}”?`)) return;
        state.layouts = state.layouts.filter(l => l !== L); state.activeLayout = state.layouts[0].id; ui.override = null; epoch = Date.now();
        commit("Layout excluído.");
      },
      "layout-restore": () => {
        const L = curLayout(), def = DEFAULTS.layouts.find(l => l.id === L.id);
        if (!def) return toast("Este layout não existe no padrão. Use DESFAZER para voltar alterações.", "bad");
        if (!confirm(`Restaurar o layout “${L.name}” como no padrão?`)) return;
        const i = state.layouts.indexOf(L); state.layouts[i] = normLayout(clone(def), i); ui.sel = null;
        commit("Layout restaurado.");
      },
      "preset": el => {
        const L = curLayout(), p = PRESETS.find(x => x.id === el.dataset.preset);
        if (!p) return;
        const r = W.preset(L.tiles, p);
        if (r.lost && !confirm(`${r.lost} TV(s) com conteúdo não cabem no modelo “${p.name}” e serão removidas. Continuar?`)) return;
        L.rows = p.rows; L.cols = p.cols; L.tiles = r.tiles; ui.sel = null;
        commit(`Modelo “${p.name}” aplicado.`);
      },
      "undo": undo, "redo": redo,
      "export": () => exportAll(),
      "import": () => fileIn.click(),
      "tile-add": el => addTile(el.dataset.x, el.dataset.y),
      "tile-dup": el => dupTile(el.dataset.tile),
      "tile-del": el => delTile(el.dataset.tile),
      "tile-split": el => splitTile(el.dataset.tile),
      "tile-cfg": el => { select(el.dataset.tile); openTile(el.dataset.tile); },
      "drawer-close": closeDrawer,
      "pl-add": () => { const t = formTile(); if (!t || t.items.length >= 12) return; t.items.push({ tela: "none", duration: 30 }); tileChanged(t, `[data-pl="tela"][data-k="${t.items.length - 1}"]`); },
      "pl-up": el => { const t = formTile(), k = +el.dataset.k; if (!t || k < 1) return; [t.items[k - 1], t.items[k]] = [t.items[k], t.items[k - 1]]; tileChanged(t, `[data-act="pl-up"][data-k="${k - 1}"]`); },
      "pl-down": el => { const t = formTile(), k = +el.dataset.k; if (!t || k >= t.items.length - 1) return; [t.items[k + 1], t.items[k]] = [t.items[k], t.items[k + 1]]; tileChanged(t, `[data-act="pl-down"][data-k="${k + 1}"]`); },
      "pl-del": el => { const t = formTile(); if (!t || t.items.length < 2) return; t.items.splice(+el.dataset.k, 1); tileChanged(t); }
    };
    function onClick(e) {
      const el = e.target.closest && e.target.closest("[data-act]");
      if (!el || el.tagName === "SELECT" || el.tagName === "INPUT" || !ACTIONS[el.dataset.act]) return;
      e.preventDefault();
      ACTIONS[el.dataset.act](el);
    }
    app.addEventListener("click", onClick);
    drawer.addEventListener("click", onClick);
    scrim.addEventListener("click", closeDrawer);

    app.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.act === "bezel") { wallEl.style.setProperty("--bezel", t.value + "px"); if (t.nextElementSibling) t.nextElementSibling.textContent = t.value + " px"; }
    });
    app.addEventListener("change", e => {
      const t = e.target, a = t.dataset.act, L = curLayout();
      if (a === "layout-select") { state.activeLayout = t.value; ui.override = null; ui.sel = null; epoch = Date.now(); }
      else if (a === "rows" || a === "cols") { if (!setMatrix(L, a === "rows" ? +t.value : L.rows, a === "cols" ? +t.value : L.cols)) { render(); return; } }
      else if (a === "aspect") L.aspect = ASPECTS.includes(t.value) ? t.value : "16:9";
      else if (a === "bezel") L.bezel = clamp(Math.round(num(t.value, 6)), 0, 24);
      else if (a === "bg") { if (/^#[0-9a-f]{6}$/i.test(t.value)) L.background = t.value; }
      else if (a === "seams") L.seams = t.checked;
      else if (a === "labels") L.labels = t.checked;
      else if (a === "progtv") L.progressTv = t.checked;
      else return;
      commit();
    });
    drawer.addEventListener("change", e => {
      const el = e.target, t = formTile();
      if (!t) return;
      if (el.dataset.pl) {
        const it = t.items[+el.dataset.k];
        if (!it) return;
        if (el.dataset.pl === "tela") it.tela = KEYS.has(el.value) ? el.value : "none"; else it.duration = duration(el.value);
        return tileChanged(t, `[data-pl="${el.dataset.pl}"][data-k="${el.dataset.k}"]`);
      }
      if (el.dataset.tp) {
        const k = el.dataset.tp;
        if (k === "title") t.title = el.value.trim().slice(0, 40);
        else if (k === "header") t.header = el.checked;
        else if (k === "fit") t.fit = el.value === "contain" ? "contain" : "fill";
        return tileChanged(t, `[data-tp="${k}"]`);
      }
      if (el.dataset.geo) {
        const L = curLayout(), v = k => Math.round(num($(`[data-geo="${k}"]`, drawer).value, 1));
        let o = W.move(L.tiles, t.id, v("x") - 1, v("y") - 1, L.rows, L.cols);
        if (o) o = W.resize(o, t.id, v("w"), v("h"), L.rows, L.cols);
        if (!o) { const m = $("#vwGeoMsg", drawer); m.className = "vw-msg bad"; m.textContent = `Não cabe: ${v("w")}×${v("h")} na coluna ${v("x")}, linha ${v("y")} sai da matriz ou cobre outra TV.`; return; }
        L.tiles = o;
        return tileChanged(t, `[data-geo="${el.dataset.geo}"]`);
      }
    });
    fileIn.addEventListener("change", () => {
      const f = fileIn.files[0]; fileIn.value = "";
      if (!f) return;
      if (f.size > 1024 * 1024) return toast("Arquivo muito grande (máx. 1 MB).", "bad");
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          const vw = d && d.videowall ? d.videowall : d && Array.isArray(d.layouts) ? d : null;
          const ident = d && d.identidade ? d.identidade : null;
          if (!vw && !ident) throw new Error();
          if (ident) saveIdentity(normId(ident), false);
          if (vw && Array.isArray(vw.layouts) && vw.layouts.length) { state = normalize(vw); ui.sel = null; ui.override = null; epoch = Date.now(); save(); }
          if (ui.open) render();
          if (ui.drawer === "identidade") openIdentity();
          toast(ident && vw ? "Identidade e layouts importados." : ident ? "Identidade importada." : "Layouts importados.", "good");
        } catch (e) { toast("Arquivo inválido para o COE.", "bad"); }
      };
      rd.readAsText(f);
    });

    /* ---------------- identidade: painel e exportação ---------------- */
    function exportAll() {
      const data = { app: "coe-agro", versao: 1, exportadoEm: new Date().toISOString(), identidade: ID, videowall: state };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coe-configuracao.json";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("Configuração exportada (identidade e layouts).", "good");
    }
    function saveIdentity(next, msg = true) {
      ID = next;
      try { localStorage.setItem(ID_KEY, JSON.stringify(ID)); } catch (e) { toast("Não foi possível salvar: armazenamento indisponível.", "bad"); }
      applyIdentity(true);
      rememberApplied();
      if (msg) toast("Identidade aplicada.", "good");
    }
    const logoIn = document.createElement("input"); logoIn.type = "file"; logoIn.accept = "image/png,image/jpeg,image/svg+xml,image/webp"; logoIn.hidden = true; document.body.appendChild(logoIn);
    logoIn.addEventListener("change", () => {
      const f = logoIn.files[0]; logoIn.value = "";
      if (!f) return;
      if (f.size > 400 * 1024) return toast("Imagem muito grande (máx. 400 KB). Prefira SVG ou PNG pequeno.", "bad");
      const rd = new FileReader();
      rd.onload = () => { const v = safeLogo(rd.result); if (!v) return toast("Formato de imagem não aceito.", "bad"); saveIdentity(Object.assign({}, ID, { logo: v })); openIdentity(); };
      rd.readAsDataURL(f);
    });
    function openIdentity(focusSel) {
      const f = (k, label, max, hint) => `<label class="vw-f">${label}<input type="text" maxlength="${max}" data-id="${k}" value="${esc(ID[k])}" spellcheck="false">${hint ? `<small class="vw-note">${hint}</small>` : ""}</label>`;
      const pairs = (grp, keys) => keys.map(k => `<label class="vw-f">${esc(k)} <small>(nome de exemplo)</small><input type="text" maxlength="40" data-idg="${grp}" data-k="${esc(k)}" value="${esc(ID[grp][k])}"></label>`).join("");
      const logoTxt = ID.logo.startsWith("data:") ? "" : ID.logo;
      drawer.innerHTML = `
        <div class="vw-dhead"><div><strong>Identidade da cooperativa</strong><small>Nomes, logo e cor usados em todas as telas e TVs</small></div>
          <button type="button" class="vw-ib" data-act="drawer-close" aria-label="Fechar">✕</button></div>
        <form class="vw-dbody coe-cfg" id="coeIdForm" novalidate>
          <div class="vw-sec">Cooperativa</div>
          ${f("cooperativa", "Nome completo", 60)}
          <div class="coe-grid2">${f("nomeCurto", "Nome curto", 40, "Tabelas e contratos")}${f("sigla", "Sigla", 5, "Selo quando não há logo")}</div>
          <div class="coe-logo-prev">
            <span class="pv">${ID.logo ? `<img src="${esc(ID.logo)}" alt="">` : esc(ID.sigla)}</span>
            <span class="acts">
              <button type="button" class="btn-header" data-act="id-logo-up">ENVIAR LOGO</button>
              <button type="button" class="btn-header" data-act="id-logo-none" ${ID.logo ? "" : "disabled"}>USAR SIGLA</button>
            </span>
          </div>
          <label class="vw-f">Endereço do logo<input type="text" maxlength="500" data-id="logo" value="${esc(logoTxt)}" placeholder="${ID.logo.startsWith("data:") ? "Imagem enviada (salva neste navegador)" : "logo.svg ou https://…"}"><small class="vw-note">Caminho no repositório (ex.: logo.svg) ou endereço https. SVG ou PNG com fundo transparente funcionam melhor.</small></label>
          <div class="vw-sec">Unidade principal</div>
          <div class="coe-grid2">${f("unidade", "Nome da unidade", 30, "Aparece como “Unidade …” e no menu")}${f("codigo", "Prefixo dos códigos", 6, "Ex.: UNC-VG-A nos cards")}</div>
          <div class="vw-sec">Demais unidades</div>
          <div class="coe-grid2">${pairs("unidades", UNID0)}</div>
          <div class="vw-sec">Municípios dos cooperados</div>
          <div class="coe-grid2">${pairs("municipios", MUN0)}</div>
          <div class="vw-sec">Cor de destaque</div>
          <div class="coe-color">
            <input type="color" data-id="destaque" value="${esc(ID.destaque || "#3b82f6")}" aria-label="Cor de destaque" ${ID.destaque ? "" : "disabled"}>
            <label class="vw-check"><input type="checkbox" data-id="destaque-on" ${ID.destaque ? "checked" : ""}> Usar cor própria (senão, a cor padrão do tema)</label>
          </div>
          <p class="vw-note">As alterações valem para este navegador e para as TVs do videowall. Para levar a outro computador, use EXPORTAR e, lá, IMPORTAR. Para definir o padrão de todos, edite <b>coe-config.js</b>.</p>
        </form>
        <div class="vw-dfoot">
          <span><button type="button" class="btn-header vw-danger" data-act="id-reset">PADRÃO</button>
          <button type="button" class="btn-header" data-act="export" title="Identidade e layouts em um arquivo JSON">⇩ EXPORTAR</button>
          <button type="button" class="btn-header" data-act="import">⇧ IMPORTAR</button></span>
          <button type="button" class="btn-header vw-primary" data-act="drawer-close">CONCLUIR</button></div>`;
      drawer.classList.add("is-open"); scrim.hidden = false; ui.drawer = "identidade";
      const el = focusSel ? $(focusSel, drawer) : $('[data-id="cooperativa"]', drawer);
      if (el) el.focus();
    }
    Object.assign(ACTIONS, {
      "id-logo-up": () => logoIn.click(),
      "id-logo-none": () => { saveIdentity(Object.assign({}, ID, { logo: "" })); openIdentity(); },
      "id-reset": () => {
        if (!confirm("Voltar a identidade ao padrão do coe-config.js?")) return;
        try { localStorage.removeItem(ID_KEY); } catch (e) { /* noop */ }
        saveIdentity(idPadrao(), false); openIdentity(); toast("Identidade padrão restaurada.");
      }
    });
    drawer.addEventListener("change", e => {
      const el = e.target;
      if (!el.closest("#coeIdForm")) return;
      const next = JSON.parse(JSON.stringify(ID));
      if (el.dataset.idg) next[el.dataset.idg][el.dataset.k] = el.value;
      else if (el.dataset.id === "destaque-on") next.destaque = el.checked ? ($('[data-id="destaque"]', drawer).value || "#3b82f6") : "";
      else if (el.dataset.id === "logo") next.logo = el.value.trim() || (ID.logo.startsWith("data:") ? ID.logo : "");
      else if (el.dataset.id) next[el.dataset.id] = el.value;
      const n = normId(next);
      if (el.dataset.id === "logo" && el.value.trim() && !n.logo) {
        toast("Endereço do logo não aceito: use um caminho do repositório ou https://", "bad");
        return;
      }
      const sel = el.dataset.idg ? `[data-idg="${el.dataset.idg}"][data-k="${cssEsc(el.dataset.k)}"]` : `[data-id="${el.dataset.id}"]`;
      saveIdentity(n);
      openIdentity(sel);
    });
    // botão de volta ao portal (ex.: COI Forge), quando configurado
    const portal = safeLogo(BASE.portal);
    if (controls && portal && !EMBED && window.top === window) {
      const a = document.createElement("a");
      a.className = "btn-header"; a.id = "btnPortal"; a.href = portal;
      a.title = "Voltar para " + txt(BASE.portalNome, "a plataforma", 30);
      a.style.textDecoration = "none";
      a.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg><span></span>';
      a.querySelector("span").textContent = txt(BASE.portalNome, "PORTAL", 30).toLocaleUpperCase("pt-BR");
      controls.insertBefore(a, controls.firstChild);
    }
    if (controls) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn-header"; b.id = "btnIdentidade"; b.title = "Nome, logo, unidades e cor da cooperativa";
      b.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"></path><path d="M5 21V8l7-5 7 5v13"></path><path d="M9 21v-6h6v6"></path><path d="M9 11h.01M15 11h.01"></path></svg><span>IDENTIDADE</span>';
      b.addEventListener("click", () => openIdentity());
      const vwb = $("#btnVideowall", controls);
      controls.insertBefore(b, vwb ? vwb.nextSibling : controls.firstChild);
    }

    // renomear direto no rótulo
    wallEl.addEventListener("focusout", e => {
      const tt = e.target.closest && e.target.closest("[data-title-for]");
      if (!tt) return;
      const t = findTile(tt.dataset.titleFor);
      if (!t || tt.dataset.cancel) { delete (tt.dataset || {}).cancel; render(); return; }
      const auto = srcName(W.current(t.items, elapsed()).item.tela);
      const v = tt.textContent.replace(/\s+/g, " ").trim().slice(0, 40);
      const next = v === auto ? "" : v;
      if (next !== t.title) { t.title = next; commit(); } else render();
    });

    /* ---------------- arrastar: mover, trocar, redimensionar ---------------- */
    let drag = null;
    function cellAt(e) {
      const L = curLayout(), r = wallEl.getBoundingClientRect();
      return { x: clamp(Math.floor((e.clientX - r.left) / (r.width / L.cols)), 0, L.cols - 1), y: clamp(Math.floor((e.clientY - r.top) / (r.height / L.rows)), 0, L.rows - 1) };
    }
    wallEl.addEventListener("pointerdown", e => {
      if (!ui.editing || ui.tv) return;
      const rs = e.target.closest("[data-resize]"), mv = e.target.closest("[data-drag]");
      const body = !rs && !mv && e.target.closest(".vw-tile");
      if (body && e.target.closest("button, [contenteditable]")) return;
      const h = rs || mv || body;
      if (!h || e.button !== 0) return;
      const id = rs ? rs.dataset.resize : mv ? mv.dataset.drag : body.dataset.id, t = findTile(id);
      if (!t) return;
      select(id);
      e.preventDefault();
      const c = cellAt(e);
      drag = { id, mode: rs ? "resize" : "move", dx: c.x - t.x, dy: c.y - t.y, rect: { x: t.x, y: t.y, w: t.w, h: t.h }, moved: false, pid: e.pointerId };
      wallEl.querySelector(`.vw-tile[data-id="${cssEsc(id)}"]`).classList.add("is-drag");
    });
    document.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.pid) return;
      const L = curLayout(), t = findTile(drag.id), c = cellAt(e);
      const r = drag.mode === "move"
        ? { x: clamp(c.x - drag.dx, 0, L.cols - t.w), y: clamp(c.y - drag.dy, 0, L.rows - t.h), w: t.w, h: t.h }
        : { x: t.x, y: t.y, w: Math.max(1, c.x - t.x + 1), h: Math.max(1, c.y - t.y + 1) };
      if (r.x !== drag.rect.x || r.y !== drag.rect.y || r.w !== drag.rect.w || r.h !== drag.rect.h) drag.moved = true;
      drag.rect = r;
      if (!drag.moved) return;
      const ok = drag.mode === "move" ? !!W.move(L.tiles, t.id, r.x, r.y, L.rows, L.cols) : !!W.resize(L.tiles, t.id, r.w, r.h, L.rows, L.cols);
      ghost.hidden = false; ghost.className = "vw-ghost " + (ok ? "ok" : "bad");
      ghost.style.gridColumn = `${r.x + 1} / span ${r.w}`; ghost.style.gridRow = `${r.y + 1} / span ${r.h}`; ghost.textContent = `${r.w}×${r.h}`;
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null; ghost.hidden = true;
      $$(".is-drag", wallEl).forEach(n => n.classList.remove("is-drag"));
      if (!d.moved || e.type === "pointercancel") return;
      const t = findTile(d.id), r = d.rect;
      if (r.x === t.x && r.y === t.y && r.w === t.w && r.h === t.h) return;
      const ok = d.mode === "move" ? moveTile(d.id, r.x, r.y) : resizeTile(d.id, r.w, r.h);
      if (ok) commit(d.mode === "resize" && r.w * r.h > 1 ? `TV ocupando ${r.w}×${r.h} monitores.` : "");
      else toast(d.mode === "move" ? "Posição ocupada. Solte em área livre ou sobre uma TV do mesmo tamanho para trocar." : "Não há espaço livre para esse tamanho.", "bad");
    }
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);

    /* ---------------- teclado (só enquanto o videowall está aberto) ---------------- */
    window.addEventListener("keydown", e => {
      if (!ui.open && ui.drawer && e.key === "Escape") { e.stopPropagation(); e.preventDefault(); closeDrawer(); return; }
      if (!ui.open) return;
      e.stopPropagation(); // atalhos do COE (Ctrl+B, Ctrl+Z, Esc) não agem por trás do videowall
      const tt = e.target.closest && e.target.closest("[data-title-for]");
      if (tt) {
        if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); if (e.key === "Escape") tt.dataset.cancel = "1"; tt.blur(); }
        return;
      }
      const typing = e.target.closest && e.target.closest("input, select, textarea, [contenteditable]");
      if (ui.tv) { if (e.key === "Escape") showUi(); return; }
      if (e.key === "Escape") {
        e.preventDefault();
        if (ui.drawer) closeDrawer(); else if (ui.sel) select(null); else if (ui.editing) ACTIONS.edit(); else closeApp();
        return;
      }
      if (typing || ui.drawer) return;
      if (ui.editing && (e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) { e.preventDefault(); return undo(); }
        if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); return redo(); }
      }
      if (!ui.editing || !ui.sel) return;
      const t = findTile(ui.sel);
      if (!t) return;
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (dir) {
        e.preventDefault();
        if (e.shiftKey ? resizeTile(t.id, t.w + dir[0], t.h + dir[1]) : moveTile(t.id, t.x + dir[0], t.y + dir[1])) { commit(); select(t.id, true); }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); return delTile(t.id); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); return dupTile(t.id); }
      if (e.key === "Enter") { e.preventDefault(); openTile(t.id); }
    }, true);

    /* ---------------- abertura por endereço ---------------- */
    if (params.get("videowall") === "1") {
      const id = params.get("layout");
      if (id && state.layouts.some(l => l.id === id)) ui.override = id;
      openApp();
      if (params.get("tv") === "1") { ui.tv = true; render(); wakeOn(); showUi(); }
      if (id && !ui.override) toast(`Layout “${id}” não encontrado — exibindo o layout ativo.`, "bad");
    }

    // ponto de acesso para testes e automação
    window.VideowallEditavel = { open: openApp, close: closeApp, state: () => clone(state), sources: () => clone(SOURCES), geometry: W, identidade: openIdentity };
    if (params.get("identidade") === "1") openIdentity();
  }
})();
