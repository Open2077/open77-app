/**
 * The docs translate control in a real browser, with a mocked Translator.
 *
 * Headless Chrome has no on-device translation model, so `self.Translator` is
 * replaced before any page script runs by a fake that upper-cases letters and
 * leaves `{N}` placeholders alone (or, per scenario, mangles them, drops them,
 * throws, or is missing altogether). Upper case makes every translated word
 * visible to the checks, and anything the engine must never send (code) would
 * come back upper-cased too.
 *
 * Against `next dev` or `next start`, this checks:
 *
 * - who sees the control (the language cookie when it is not English, else the
 *   browser's first language; nothing for English readers) and in which
 *   language it speaks;
 * - the banner, its dismissal (remembered in localStorage) and the fallback
 *   panel (how-to and Google Translate link) when the API is missing or
 *   cannot translate the language;
 * - translation in place: code, keys, identifiers and function names are never
 *   sent nor changed, links keep their targets, translated text is marked with
 *   the target `lang`, the docs title is rebuilt word by word with its glitch
 *   layers;
 * - "Show original" restores the exact original markup;
 * - the placeholder fallbacks (pairs lost, every placeholder lost);
 * - the model download flow (progress, user activation) and failure handling;
 * - the session memory: a client-side navigation and a full reload translate
 *   the next page by themselves;
 * - the API explorer and an API namespace page;
 * - no console error or exception anywhere (React would complain first if the
 *   engine broke its DOM).
 *
 * Usage: node scripts/check-docs-translate-browser.mjs [origin]
 */

import { spawn } from "node:child_process";
import { setMaxListeners } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9353;
const GUIDE = "/docs/server-resources";
const HANDWRITTEN = "/docs/platform";
const NAMESPACE = "/docs/api/server/open77-npcs";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next one.
    }
  }
  throw new Error("No Chrome binary found.");
}

class Session {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.sessionId = null;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      if (message.sessionId && message.sessionId !== this.sessionId) return;
      for (const handler of this.listeners.get(message.method) ?? []) handler(message.params);
    });
  }

  send(method, params = {}, useSession = true) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, handler) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), handler]);
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
    return result.result.value;
  }
}

function connect(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(new Session(socket)));
    socket.addEventListener("error", () => reject(new Error(`Cannot connect to ${url}`)));
  });
}

async function waitForDevTools() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome never opened its debugging port.");
}

/**
 * Installed before any page script. `config.availability` is what
 * `Translator.availability()` answers ("none" removes the API); `config.mode`
 * picks the fake translation.
 */
const fakeTranslator = (config, languages) => `(() => {
  const config = ${JSON.stringify(config)};
  const languages = ${JSON.stringify(languages)};
  Object.defineProperty(Navigator.prototype, "languages", { get: () => languages, configurable: true });
  Object.defineProperty(Navigator.prototype, "language", { get: () => languages[0], configurable: true });
  const log = (window.__translator = { inputs: [], creates: [], availability: [], destroyed: 0 });
  if (config.availability === "none") {
    // Headless Chrome ships the real API: remove it, as in Firefox or Safari.
    delete globalThis.Translator;
    return;
  }
  const transform = (text) => {
    if (config.mode === "fail") throw new Error("model crashed");
    let out = text.replace(/\\p{L}+/gu, (word) => word.toUpperCase());
    if (config.mode === "mangle") out = out.replace(/\\{\\/\\d+\\}/g, "");
    if (config.mode === "drop") out = out.replace(/\\{\\/?\\d+\\}/g, "");
    return out;
  };
  self.Translator = class {
    static async availability(options) {
      log.availability.push(options);
      return config.availability;
    }
    static async create(options) {
      const activation = navigator.userActivation ? navigator.userActivation.isActive : null;
      log.creates.push({ sourceLanguage: options.sourceLanguage, targetLanguage: options.targetLanguage, activation });
      if (config.availability === "downloadable" && !activation) throw new DOMException("Requires a user gesture.", "NotAllowedError");
      if (config.availability === "downloadable" && options.monitor) {
        const monitor = new EventTarget();
        options.monitor(monitor);
        for (const loaded of [0, 0.25, 0.5, 0.75, 1]) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          monitor.dispatchEvent(Object.assign(new Event("downloadprogress"), { loaded, total: 1 }));
        }
      }
      config.availability = "available";
      return {
        async translate(text, options = {}) {
          log.inputs.push(text);
          await new Promise((resolve) => setTimeout(resolve, 1));
          if (options.signal && options.signal.aborted) throw new DOMException("Aborted", "AbortError");
          return transform(text);
        },
        destroy() {
          log.destroyed += 1;
        },
      };
    }
  };
})();`;

/** What the checks read on a page: kept in the page so every scenario measures the same way. */
const PROBE = `
  window.__probe = {
    roots: () => [...document.querySelectorAll("[data-docs-translate]")],
    /** Text the reader sees, outside code: [text, element] pairs. */
    visibleText(root) {
      const out = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue.trim()) continue;
        if (parent.closest("pre, code, kbd, samp, var, [translate=no], script, style, [aria-hidden=true], button, select")) continue;
        if (!parent.getClientRects().length) continue;
        out.push(node.nodeValue);
      }
      return out;
    },
    lowercaseShare() {
      const keep = /OPEN\\/\\/77|Open2077|Open77|NCWE Studio|NCWE|Workshop|Warden|Discord|GitHub|WolvenKit|ArchiveXL|TweakXL|RED4ext|REDengine|Cyberpunk 2077|Night City|CD PROJEKT RED|Open Alpha|Lua/g;
      let lower = 0;
      let letters = 0;
      const samples = [];
      for (const root of this.roots()) {
        for (const text of this.visibleText(root)) {
          for (const word of text.replace(keep, " ").split(/\\s+/)) {
            // Lone identifiers are left untranslated on purpose.
            if (!word || /[._/\\\\:@$#<>=()\\[\\]{}|\`~^*+]/.test(word.replace(/[.:!?,;]+$/, "")) || /\\p{Ll}\\p{Lu}/u.test(word)) continue;
            const l = (word.match(/\\p{Ll}/gu) || []).length;
            lower += l;
            letters += (word.match(/\\p{L}/gu) || []).length;
            if (l && samples.length < 8) samples.push(word);
          }
        }
      }
      return { share: letters ? lower / letters : 0, letters, samples };
    },
    codeTexts() {
      return this.roots().flatMap((root) => [...root.querySelectorAll("pre, code, kbd, samp, [translate=no]")].map((el) => el.textContent));
    },
    visibleCode() {
      return this.roots().flatMap((root) => [...root.querySelectorAll("code, pre")].filter((el) => el.getClientRects().length && !el.parentElement.closest("pre, code")).map((el) => el.textContent));
    },
    visibleLinks() {
      return this.roots().flatMap((root) => [...root.querySelectorAll("a[href]")].filter((el) => el.getClientRects().length).map((el) => el.getAttribute("href"))).sort();
    },
    markup() {
      return this.roots().map((root) => root.innerHTML).join("\\n<!--root-->\\n");
    },
  };
`;

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-docs-translate-"));
const child = spawn(
  await findChrome(),
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--force-device-scale-factor=1",
    "--lang=en-US",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

let failures = 0;
let passes = 0;
const errors = [];
const check = (name, ok, detail) => {
  if (ok) passes++;
  else {
    failures++;
    console.log(`FAIL ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
  }
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let browser;
try {
  browser = await connect(await waitForDevTools());
  // One message listener per tab on the shared socket.
  setMaxListeners(64, browser.socket);

  /** A fresh tab with its own init scripts. Storage is shared by the profile, so each scenario clears it. */
  async function tab({ cookie, languages, translator }) {
    const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" }, false);
    const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true }, false);
    const page = new Session(browser.socket);
    page.nextId = 100000 * (browser.tabs = (browser.tabs ?? 0) + 1);
    page.sessionId = sessionId;
    // Responses and events for this tab arrive on the shared socket.
    browser.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.sessionId !== sessionId) return;
      if (message.id !== undefined) {
        const entry = page.pending.get(message.id);
        if (!entry) return;
        page.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      for (const handler of page.listeners.get(message.method) ?? []) handler(message.params);
    });
    page.url = "";
    page.on("Runtime.exceptionThrown", (params) => errors.push(`${page.url}: ${params.exceptionDetails.exception?.description ?? params.exceptionDetails.text}`));
    page.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") errors.push(`${page.url}: ${params.args.map((a) => a.value ?? a.description).join(" ")}`);
    });
    await page.send("Runtime.enable");
    await page.send("Page.enable");
    await page.send("Network.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send("Network.clearBrowserCookies");
    if (cookie) await page.send("Network.setCookie", { name: "op77_lang", value: cookie, url: origin, path: "/" });
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: fakeTranslator(translator, languages) });
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    page.close = () => browser.send("Target.closeTarget", { targetId }, false);
    return page;
  }

  async function visit(page, url, { clear = true } = {}) {
    page.url = url;
    if (clear) {
      await page.send("Page.navigate", { url: `${origin}/docs.md` });
      await delay(300);
      await page.evaluate("try { localStorage.clear(); sessionStorage.clear(); } catch {} return true;");
    }
    await page.send("Page.navigate", { url: origin + url });
    await settle(page);
  }

  async function settle(page) {
    for (let i = 0; i < 240; i++) {
      await delay(125);
      try {
        if (await page.evaluate("return document.readyState === 'complete' && !!document.querySelector('main') && !!window.__probe;")) break;
      } catch {
        // Navigation in progress.
      }
    }
    await page.evaluate("await document.fonts.ready; return true;");
    await delay(1200);
  }

  async function waitFor(page, expression, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try {
        const value = await page.evaluate(expression);
        if (value) return value;
      } catch {
        // Navigation in progress.
      }
      await delay(100);
    }
    return null;
  }

  /** A real mouse click (user activation included) on the first visible match. */
  async function click(page, selector, text) {
    const box = await page.evaluate(`
      const items = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((el) => el.getClientRects().length && (${JSON.stringify(text ?? null)} === null || el.textContent.trim() === ${JSON.stringify(text ?? "")}));
      const el = items[0];
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 150));
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    `);
    if (!box) return false;
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await page.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: type === "mouseMoved" ? 0 : 1 });
    }
    return true;
  }

  const ui = (page) =>
    page.evaluate(`
      const dock = document.querySelector("[data-docs-translate-ui]");
      if (!dock) return null;
      const control = dock.querySelector("[data-docs-translate-control]");
      return {
        lang: dock.getAttribute("lang"),
        banner: dock.querySelector("[data-docs-translate-banner]")?.innerText ?? null,
        phase: control?.dataset.phase ?? null,
        control: control?.innerText ?? null,
        title: dock.querySelector("button[title]")?.getAttribute("title") ?? null,
        panel: dock.querySelector("section")?.innerText ?? null,
        google: dock.querySelector("section a[href]")?.getAttribute("href") ?? null,
      };
    `);

  /* ---------------------------------------------------------------------- */

  {
    const page = await tab({ languages: ["en-US", "en"], translator: { availability: "available", mode: "good" } });
    await visit(page, HANDWRITTEN);
    check("English reader: no control at all", (await ui(page)) === null);
    check("docs stay <html lang=en>", (await page.evaluate("return document.documentElement.lang")) === "en");
    check("API not even queried for English", (await page.evaluate("return __translator.availability.length")) === 0);
    await page.close();
  }

  {
    // The cookie names French; the browser says English: the cookie wins.
    const page = await tab({ cookie: "fr", languages: ["en-US", "en"], translator: { availability: "available", mode: "good" } });
    await visit(page, HANDWRITTEN);
    let state = await ui(page);
    check("cookie fr: control in French", state?.lang === "fr" && state.banner?.includes("Cette page est en anglais.") && state.banner.includes("Traduire automatiquement"), state);
    check("server HTML untouched: still English", (await page.evaluate("return __probe.lowercaseShare().share")) > 0.5);
    check("availability asked for en → fr", (await page.evaluate("return JSON.stringify(__translator.availability[0])")) === JSON.stringify({ sourceLanguage: "en", targetLanguage: "fr" }));

    const original = await page.evaluate("return __probe.markup()");
    const codeBefore = await page.evaluate("return __probe.codeTexts()");
    const visibleCodeBefore = await page.evaluate("return __probe.visibleCode()");
    const linksBefore = await page.evaluate("return __probe.visibleLinks()");
    const preLines = await page.evaluate(`return [...document.querySelectorAll("[data-docs-translate] pre")].map((pre) => pre.textContent.split("\\n").find((line) => line.trim().length > 10)).filter(Boolean)`);

    check("banner button clicked", await click(page, "[data-docs-translate-banner] button", "Traduire automatiquement"));
    state = await waitFor(page, `const c = document.querySelector("[data-docs-translate-control]"); return c && c.dataset.phase === "translated" ? true : null;`, 60000);
    check("translation finishes", Boolean(state), await ui(page));
    state = await ui(page);
    check("control says what happened, in French", state?.control?.includes("Traduit en français") && state.control.includes("Voir l’original"), state);

    const share = await page.evaluate("return __probe.lowercaseShare()");
    check("visible text translated (upper-cased by the fake)", share.share < 0.03, share);
    const inputs = await page.evaluate("return __translator.inputs");
    check("code blocks never sent", preLines.every((line) => !inputs.some((input) => input.includes(line.trim()))), preLines.filter((line) => inputs.some((input) => input.includes(line.trim()))));
    check("no request sends raw markup", inputs.every((input) => !/<\/?[a-z][^>]*>/i.test(input)), inputs.filter((input) => /<\/?[a-z][^>]*>/i.test(input)).slice(0, 3));
    const codeAfter = await page.evaluate("return __probe.codeTexts()");
    check("code, keys and identifiers unchanged", codeAfter.every((text) => codeBefore.includes(text)), codeAfter.filter((text) => !codeBefore.includes(text)).slice(0, 5));
    check("every inline code still shown", JSON.stringify((await page.evaluate("return __probe.visibleCode()")).sort()) === JSON.stringify([...visibleCodeBefore].sort()));
    check("every link kept with its target", JSON.stringify(await page.evaluate("return __probe.visibleLinks()")) === JSON.stringify(linksBefore));
    check("translations carry lang=fr", await page.evaluate(`return [...document.querySelectorAll("[data-op77-translation]")].every((el) => el.lang === "fr")`));
    const title = await page.evaluate(`
      const h1 = document.querySelector("article h1");
      const words = [...h1.querySelectorAll("[data-op77-translation] [data-glitch]")];
      return { text: h1.innerText, words: words.length, synced: words.every((w) => w.dataset.glitch === w.textContent) };
    `);
    check("title rebuilt word by word, glitch layers in step", title.words > 0 && title.synced && title.text === title.text.toUpperCase(), title);
    check("docs still <html lang=en>", (await page.evaluate("return document.documentElement.lang")) === "en");
    check("session remembers fr", (await page.evaluate("return sessionStorage.getItem('open77.docs-translate.auto')")) === "fr");

    check("show original clicked", await click(page, "[data-docs-translate-control] button", "Voir l’original"));
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "idle"`);
    const restored = await page.evaluate("return __probe.markup()");
    check("show original restores the exact markup", restored === original, restored.length - original.length);
    check("session memory cleared", (await page.evaluate("return sessionStorage.getItem('open77.docs-translate.auto')")) === null);

    const sent = inputs.length;
    check("translate again (the banner is back)", await click(page, "[data-docs-translate-banner] button", "Traduire automatiquement"));
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 30000);
    check("second pass reuses this visit's translations", (await page.evaluate("return __translator.inputs.length")) === sent);

    // Client-side navigation from a translated link: the next page translates itself.
    await page.evaluate("window.__sameDocument = true; return true;");
    const target = await page.evaluate(`
      const link = [...document.querySelectorAll("[data-op77-translation] a[href^='/docs/']")].find((a) => a.getClientRects().length && !a.getAttribute("href").includes("#"));
      return link ? link.getAttribute("href") : null;
    `);
    check("a translated in-docs link exists", Boolean(target));
    if (target) {
      await click(page, `[data-op77-translation] a[href='${target}']`);
      const moved = await waitFor(page, `return location.pathname === ${JSON.stringify(target.split("#")[0])}`, 30000);
      check("translated link navigates", Boolean(moved), await page.evaluate("return location.pathname"));
      check("…client-side (no reload)", (await page.evaluate("return window.__sameDocument === true")) === true);
      await delay(800);
      await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
      const next = await page.evaluate("return __probe.lowercaseShare()");
      check("next page translated by itself", next.share < 0.03, next);
      check("no stale span from the previous page", await page.evaluate(`return [...document.querySelectorAll("[data-op77-translation]")].every((span) => span.parentElement && span.isConnected)`));
    }

    // Full reload: the session memory translates without a click.
    page.url = `${HANDWRITTEN} (reload)`;
    await page.send("Page.navigate", { url: origin + HANDWRITTEN });
    await settle(page);
    const auto = await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
    check("reload: translated automatically", Boolean(auto), await ui(page));
    check("…without a click (create had no activation)", (await page.evaluate("return __translator.creates.at(-1)?.activation")) === false);
    check("…and no banner", (await ui(page))?.banner === null);
    await page.close();
  }

  {
    // A guide: Markdown HTML with inline code, links, tables and headings.
    const page = await tab({ cookie: "de", languages: ["en-US"], translator: { availability: "available", mode: "good" } });
    await visit(page, GUIDE);
    const original = await page.evaluate("return __probe.markup()");
    const codeBefore = await page.evaluate("return __probe.codeTexts()");
    await click(page, "[data-docs-translate-banner] button", "Automatisch übersetzen");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 90000);
    const share = await page.evaluate("return __probe.lowercaseShare()");
    check("guide translated", share.share < 0.03, share);
    const codeAfter = await page.evaluate("return __probe.codeTexts()");
    check("guide code unchanged", codeAfter.every((text) => codeBefore.includes(text)));
    const heading = await page.evaluate(`
      const h = [...document.querySelectorAll("article h2")].find((el) => el.querySelector("a.doc-anchor"));
      return h ? { text: h.innerText, anchors: h.querySelectorAll("a.doc-anchor").length, visible: [...h.querySelectorAll("a.doc-anchor")].filter((a) => a.getClientRects().length).length } : null;
    `);
    check("heading anchor kept once", heading && heading.visible === 1, heading);
    const pairs = await page.evaluate("return __translator.inputs.filter((input) => /\\{\\/\\d+\\}/.test(input)).length");
    check("links and emphasis sent as placeholder pairs", pairs > 0, pairs);
    await click(page, "[data-docs-translate-control] button", "Original anzeigen");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "idle"`);
    check("guide restored exactly", (await page.evaluate("return __probe.markup()")) === original);
    await page.close();
  }

  for (const mode of ["mangle", "drop"]) {
    const page = await tab({ cookie: "es", languages: ["en-US"], translator: { availability: "available", mode } });
    await visit(page, GUIDE);
    const original = await page.evaluate("return __probe.markup()");
    const linksBefore = await page.evaluate("return __probe.visibleLinks()");
    const codeBefore = await page.evaluate("return __probe.visibleCode()");
    await click(page, "[data-docs-translate-banner] button", "Traducir automáticamente");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 90000);
    const share = await page.evaluate("return __probe.lowercaseShare()");
    check(`${mode}: page still translated through the fallback`, share.share < 0.03, share);
    check(`${mode}: links kept`, JSON.stringify(await page.evaluate("return __probe.visibleLinks()")) === JSON.stringify(linksBefore));
    check(`${mode}: inline code kept`, JSON.stringify((await page.evaluate("return __probe.visibleCode()")).sort()) === JSON.stringify([...codeBefore].sort()));
    await click(page, "[data-docs-translate-control] button", "Ver original");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "idle"`);
    check(`${mode}: restored exactly`, (await page.evaluate("return __probe.markup()")) === original);
    await page.close();
  }

  {
    // Model download: progress, then the translation; the click is the user activation.
    const page = await tab({ cookie: "pt-BR", languages: ["en-US"], translator: { availability: "downloadable", mode: "good" } });
    await visit(page, HANDWRITTEN);
    await click(page, "[data-docs-translate-banner] button", "Traduzir automaticamente");
    const seen = await waitFor(page, `const c = document.querySelector("[data-docs-translate-control]"); return c && c.dataset.phase === "downloading" && /\\d+%/.test(c.innerText) ? c.innerText : null;`, 10000);
    check("download progress shown", Boolean(seen), seen);
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
    const create = await page.evaluate("return __translator.creates[0]");
    check("create called inside the click, for pt", create?.activation === true && create.targetLanguage === "pt-BR", create);
    await page.close();
  }

  {
    // The translator keeps failing: stop, say so, offer the alternatives.
    const page = await tab({ cookie: "pl", languages: ["en-US"], translator: { availability: "available", mode: "fail" } });
    await visit(page, HANDWRITTEN);
    await click(page, "[data-docs-translate-banner] button", "Przetłumacz automatycznie");
    const failed = await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "error"`, 30000);
    const state = await ui(page);
    check("failure reported in Polish", Boolean(failed) && state?.control?.includes("Tłumaczenie zatrzymało się przed końcem.") && state.control.includes("Spróbuj ponownie"), state);
    await click(page, "[data-docs-translate-control] button", "Inne opcje");
    const panel = await waitFor(page, `return document.querySelector("[data-docs-translate-ui] section")?.innerText ?? null`);
    check("other options open the fallback panel", Boolean(panel?.includes("Otwórz w Tłumaczu Google")), panel);
    await page.close();
  }

  {
    // No Translator API (Firefox, Safari, mobile): how-to and Google Translate, in German from the browser language.
    const page = await tab({ languages: ["de-DE", "de"], translator: { availability: "none" } });
    await visit(page, HANDWRITTEN);
    let state = await ui(page);
    check("browser language de: banner in German", state?.banner?.includes("Diese Seite ist auf Englisch."), state);
    await click(page, "[data-docs-translate-banner] button", "Automatisch übersetzen");
    state = await ui(page);
    check("no API: fallback panel instead of a translation", state?.panel?.toLowerCase().includes("mit deinem browser übersetzen") && state.panel.includes("keinen eingebauten Übersetzer"), state);
    check("how-to for this browser", state?.panel?.includes("Chrome: Rechtsklick"), state?.panel);
    check(
      "Google Translate link to the public page",
      state?.google === `https://translate.google.com/translate?sl=en&tl=de&u=${encodeURIComponent(`https://open2077.net${HANDWRITTEN}`)}`,
      state?.google,
    );
    check("the page was not touched", (await page.evaluate("return document.querySelectorAll('[data-op77-translation]').length")) === 0);
    await click(page, "[data-docs-translate-ui] section button");
    await click(page, "[data-docs-translate-banner] button[aria-label]");
    state = await ui(page);
    check("banner dismissed, control stays", state?.banner === null && state.control?.includes("Diese Seite übersetzen"), state);
    check("dismissal stored", (await page.evaluate("return localStorage.getItem('open77.docs-translate.banner-dismissed')")) === "1");
    await visit(page, HANDWRITTEN, { clear: false });
    state = await ui(page);
    check("dismissal remembered after reload", state?.banner === null && state.control !== null, state);
    await page.close();
  }

  {
    // A language the site does not have and the browser cannot translate into.
    const page = await tab({ languages: ["eo"], translator: { availability: "unavailable" } });
    await visit(page, HANDWRITTEN);
    let state = await ui(page);
    check("other languages: English labels", state?.lang === "en" && state.banner?.includes("This page is in English."), state);
    await click(page, "[data-docs-translate-banner] button", "Translate automatically");
    state = await ui(page);
    check("unavailable language explained", state?.panel?.includes("cannot translate English into Esperanto"), state?.panel);
    check("Google link for eo", state?.google?.includes("tl=eo&"), state?.google);
    await page.close();
  }

  {
    // Vietnamese: no dictionary, but the browser translator is offered all the same.
    const page = await tab({ languages: ["vi-VN"], translator: { availability: "available", mode: "good" } });
    await visit(page, HANDWRITTEN);
    await click(page, "[data-docs-translate-banner] button[aria-label]");
    const state = await ui(page);
    check("Vietnamese reader: English control naming Vietnamese", state?.control?.includes("Translate this page") && state.title === "English → Vietnamese", state);
    await click(page, "[data-docs-translate-control] button", "Translate this page");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
    check("Vietnamese translation marked lang=vi-VN", await page.evaluate(`const spans = [...document.querySelectorAll("[data-op77-translation]")]; return spans.length > 0 && spans.every((el) => el.lang === "vi-VN")`));
    await page.close();
  }

  {
    // The API explorer: only the selected function is translated, and follows the selection.
    const page = await tab({ cookie: "ru", languages: ["en-US"], translator: { availability: "available", mode: "good" } });
    await visit(page, "/docs/api");
    const name = await page.evaluate(`return document.querySelector("[data-api-detail] h2")?.textContent`);
    await click(page, "[data-docs-translate-banner] button", "Перевести автоматически");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
    let detail = await page.evaluate(`const d = document.querySelector("[data-api-detail]"); return { name: d.querySelector("h2").textContent, share: (() => { let l = 0, a = 0; for (const t of __probe.visibleText(d)) { l += (t.match(/\\p{Ll}/gu) || []).length; a += (t.match(/\\p{L}/gu) || []).length; } return a ? l / a : 0; })() }`);
    check("explorer: function name untouched", detail.name === name, detail);
    check("explorer: detail translated", detail.share < 0.05, detail);
    check("explorer: list left in English", (await page.evaluate(`return document.querySelectorAll("[data-api-list] [data-op77-translation]").length`)) === 0);
    const rows = await page.evaluate(`return [...document.querySelectorAll("[data-api-row]")].slice(3, 4).map((a) => a.querySelector("code").firstChild.textContent)`);
    await page.evaluate(`document.querySelectorAll("[data-api-row]")[3].click(); return true;`);
    await delay(500);
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 30000);
    await delay(400);
    detail = await page.evaluate(`const d = document.querySelector("[data-api-detail]"); return { name: d.querySelector("h2").textContent, share: (() => { let l = 0, a = 0; for (const t of __probe.visibleText(d)) { l += (t.match(/\\p{Ll}/gu) || []).length; a += (t.match(/\\p{L}/gu) || []).length; } return a ? l / a : 0; })() }`);
    check("explorer: another function selected", rows[0]?.endsWith(detail.name), { rows, detail });
    check("explorer: new selection translated", detail.share < 0.05, detail);
    await page.close();
  }

  {
    // An API namespace page: names, signatures, parameters and the outline stay as written.
    const page = await tab({ cookie: "tr", languages: ["en-US"], translator: { availability: "available", mode: "good" } });
    await visit(page, NAMESPACE);
    const before = await page.evaluate(`return { names: [...document.querySelectorAll("[data-api-entry] h3")].map((h) => h.textContent), toc: [...document.querySelectorAll("[data-docs-translate] li a[href^='#']")].map((a) => a.textContent) }`);
    await click(page, "[data-docs-translate-banner] button", "Otomatik çevir");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 120000);
    const after = await page.evaluate(`return { names: [...document.querySelectorAll("[data-api-entry] h3")].map((h) => h.textContent), toc: [...document.querySelectorAll("[data-docs-translate] li a[href^='#']")].filter((a) => a.getClientRects().length || true).map((a) => a.textContent) }`);
    check("namespace: function names untouched", JSON.stringify(after.names) === JSON.stringify(before.names) && before.names.length > 0);
    check("namespace: outline untouched", JSON.stringify(after.toc) === JSON.stringify(before.toc));
    const share = await page.evaluate("return __probe.lowercaseShare()");
    check("namespace: prose translated", share.share < 0.03, share);
    await page.close();
  }

  {
    // The docs home: display titles keep their glitch layers in step; button labels stay.
    const page = await tab({ cookie: "fr", languages: ["en-US"], translator: { availability: "available", mode: "good" } });
    await visit(page, "/docs");
    const original = await page.evaluate("return __probe.markup()");
    await click(page, "[data-docs-translate-banner] button", "Traduire automatiquement");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "translated"`, 60000);
    const glitch = await page.evaluate(`return [...document.querySelectorAll("#docs-home-title [data-glitch]")].map((el) => ({ attr: el.dataset.glitch, text: el.textContent }))`);
    check("home title glitch layers follow the translation", glitch.length > 0 && glitch.every((g) => g.attr === g.text), glitch);
    const share = await page.evaluate("return __probe.lowercaseShare()");
    check("docs home translated", share.share < 0.05, share);
    await click(page, "[data-docs-translate-control] button", "Voir l’original");
    await waitFor(page, `return document.querySelector("[data-docs-translate-control]")?.dataset.phase === "idle"`);
    check("docs home restored exactly", (await page.evaluate("return __probe.markup()")) === original);
    await page.close();
  }

  check("no console error or exception", errors.length === 0, errors.slice(0, 8));
} catch (error) {
  failures++;
  console.log(`FAIL harness — ${error.stack ?? error}`);
} finally {
  try {
    browser?.socket.close();
  } catch {
    // Already closed.
  }
  child.kill();
  await delay(500);
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}

console.log(`docs translate (mocked Translator): ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
