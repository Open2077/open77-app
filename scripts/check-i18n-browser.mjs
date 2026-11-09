/**
 * The translated pages in a real browser, in every language.
 *
 * Text that fits in English can overflow in German or Russian, a glyph the
 * brand fonts lack can fall back to a system face, and a language switch can
 * land on the wrong page: none of that shows in the HTML. Against `next start`,
 * this:
 *
 * - loads every translated page in every language at desktop, laptop, tablet
 *   and phone widths and compares it with English: text that overflows its box,
 *   a header that no longer fits, header labels that run into each other (or
 *   into the logo) or a page wider than the viewport only in the translation
 *   is a failure; labels that wrap only in the translation are
 *   listed for review;
 * - asks Chrome which fonts actually drew each text node (CSS.getPlatformFontsForNode)
 *   and fails on any glyph drawn by a system font where English used none;
 * - checks Japanese and Thai typography: no tracking, no Japanese or Thai text
 *   clipped by a box that hides its overflow (Thai marks reach far above and
 *   below the Latin line), phrase-aware Japanese titles, no synthetic oblique;
 * - checks Turkish capitals (i → İ), the selector (cookie, same page, query
 *   kept, English-only notice), first-visit Accept-Language, the mobile menu,
 *   quick navigation and the server profile round trip in a prefixed language;
 * - fails on any console error (a hydration mismatch shows up there first).
 *
 * Usage: node scripts/check-i18n-browser.mjs [origin] [--shots dir] [--locales fr,de] [--routes /,/create]
 * With --shots, also writes full-page screenshots of home, download, servers
 * and account at 1440 and 390 px for the chosen locales (fr, de, ru, tr, pl by
 * default) into that directory. --routes limits the layout pass to some pages.
 *
 * The server browser reads the directory from the master in the browser, and
 * the production master only answers the site's own origin (CORS). Against a
 * local build the list is therefore empty; --cross-origin starts Chrome with
 * web security off so the rows (and the profile round trip) are exercised too.
 * Local runs only: that profile is throwaway and visits nothing but the origin.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args.splice(index, 2)[1] : undefined;
};
const shotsDir = option("--shots");
const shotLocales = (option("--locales") ?? "fr,de,ru,tr,pl").split(",");
const onlyRoutes = option("--routes")?.split(",");
const crossOrigin = args.includes("--cross-origin");
if (crossOrigin) args.splice(args.indexOf("--cross-origin"), 1);
const origin = args[0] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9347;

const LOCALES = [
  { locale: "en", segment: "", tag: "en", name: "English" },
  { locale: "fr", segment: "fr", tag: "fr", name: "Français" },
  { locale: "es", segment: "es", tag: "es", name: "Español" },
  { locale: "pt-BR", segment: "pt-br", tag: "pt-BR", name: "Português (Brasil)" },
  { locale: "de", segment: "de", tag: "de", name: "Deutsch" },
  { locale: "pl", segment: "pl", tag: "pl", name: "Polski" },
  { locale: "ru", segment: "ru", tag: "ru", name: "Русский" },
  { locale: "tr", segment: "tr", tag: "tr", name: "Türkçe" },
  { locale: "ja", segment: "ja", tag: "ja", name: "日本語" },
  { locale: "th", segment: "th", tag: "th", name: "ไทย" },
];
const ALL_ROUTES = ["/", "/download", "/servers", "/create", "/host", "/ncwe", "/status", "/account", "/verify-email", "/forgot-password", "/reset-password", "/launcher", "/missing-page"];
const ROUTES = onlyRoutes ? ALL_ROUTES.filter((route) => onlyRoutes.includes(route)) : ALL_ROUTES;
const WIDTHS = [1440, 1280, 1024, 390];
const localized = (route, segment) => (segment ? `/${segment}${route === "/" ? "" : route}` : route);

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
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
  throw new Error("No Chrome or Edge binary found.");
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
 * Measured in the page: text that overflows its own box (innermost element
 * only), labels that wrap onto a second line, whether the header fits and
 * whether the page is wider than the viewport. Elements are keyed by their
 * tag-and-class chain, so the same component compares across languages even
 * when a translated title splits into a different number of lines.
 */
const MEASURE = `
  const keyOf = (el) => {
    const parts = [];
    for (let a = el; a && a !== document.body; a = a.parentElement) parts.unshift(a.tagName.toLowerCase() + [...a.classList].map((c) => "." + c).join(""));
    return parts.join(">");
  };
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const scope = [...document.querySelectorAll("header *, main *, footer *")];
  const over = [];
  for (const el of scope) {
    if (!visible(el) || !el.textContent.trim()) continue;
    const style = getComputedStyle(el);
    if (style.display === "inline" || style.display === "contents") continue;
    if (["auto", "scroll"].includes(style.overflowX)) continue;
    if (el.closest("pre, code, svg, canvas, video, [aria-hidden=true], [hidden]")) continue;
    const excess = el.scrollWidth - el.clientWidth;
    if (el.clientWidth > 0 && excess > 1) over.push(el);
  }
  const innermost = over.filter((el) => !over.some((other) => other !== el && el.contains(other)));
  const wraps = [];
  for (const el of document.querySelectorAll("header a, header button, nav a, main button, main a[class], [role=tab], th, dt, label")) {
    if (!visible(el) || !el.textContent.trim() || el.closest("[hidden], [aria-hidden=true]")) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    // A rect whose middle sits inside the current line belongs to it: a small
    // code beside a larger name on a shared baseline does not end on the same
    // pixel, while a wrapped line's middle is always below the line above, even
    // with a line height tighter than the glyph boxes.
    const rects = [...range.getClientRects()].filter((r) => r.width > 0).sort((a, b) => a.top - b.top);
    let lines = 0;
    let bottom = -Infinity;
    for (const r of rects) {
      if ((r.top + r.bottom) / 2 > bottom) {
        lines += 1;
        bottom = r.bottom;
      } else bottom = Math.max(bottom, r.bottom);
    }
    if (lines > 1) wraps.push({ key: keyOf(el), text: el.textContent.trim().slice(0, 60) });
  }
  const header = document.querySelector("header");
  const controls = header ? [...header.querySelectorAll("a, button")].filter(visible) : [];
  // What a control visibly draws: its text (screen-reader-only text excluded)
  // and its icons. Two controls whose drawings intersect collide on screen,
  // like a long label running into the logo.
  const drawn = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!node.textContent.trim() || !parent || parent.closest(".sr-only")) continue;
      const box = parent.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
    }
    for (const icon of el.querySelectorAll("svg, img")) {
      const r = icon.getBoundingClientRect();
      if (r.width > 0) rects.push(r);
    }
    if (!rects.length) return null;
    return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)), top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
  };
  const boxes = controls.map(drawn);
  const clashes = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (!a || !b || controls[i].contains(controls[j]) || controls[j].contains(controls[i])) continue;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (overlap > 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) clashes.push({ key: i + "-" + j, text: (controls[i].textContent.trim() || "icon") + " × " + (controls[j].textContent.trim() || "icon"), overlap: Math.round(overlap) });
    }
  }
  return {
    overflow: innermost.map((el) => ({ key: keyOf(el), text: el.textContent.trim().slice(0, 80), excess: el.scrollWidth - el.clientWidth })),
    wraps,
    headerClashes: clashes,
    headerFits: controls.every((x) => { const r = x.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }),
    pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
    lang: document.documentElement.lang,
    path: location.pathname,
  };
`;

const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-i18n-check-"));
const child = spawn(
  await findChrome(),
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--force-device-scale-factor=1",
    ...(crossOrigin ? ["--disable-web-security"] : []),
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

let failures = 0;
let passes = 0;
const errors = [];
const review = [];
const notes = [];
const check = (name, ok, detail) => {
  if (ok) passes++;
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
  }
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const session = await connect(await waitForDevTools());
  const { targetId } = await session.send("Target.createTarget", { url: "about:blank" }, false);
  session.sessionId = (await session.send("Target.attachToTarget", { targetId, flatten: true }, false)).sessionId;
  let currentUrl = "";
  session.on("Runtime.exceptionThrown", (params) => errors.push(`${currentUrl}: ${params.exceptionDetails.exception?.description ?? "exception"}`));
  session.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") errors.push(`${currentUrl}: ${params.args.map((a) => a.value ?? a.description).join(" ")}`);
  });
  await session.send("Runtime.enable");
  await session.send("Page.enable");
  await session.send("Network.enable");
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const userAgent = (await session.send("Browser.getVersion", {}, false)).userAgent.replace("HeadlessChrome", "Chrome");
  const acceptLanguage = (value) => session.send("Network.setUserAgentOverride", { userAgent, acceptLanguage: value });
  await acceptLanguage("en-US,en;q=0.9");

  const resize = (width, height = 900) =>
    session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  const reducedMotion = (on) =>
    session.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: on ? "reduce" : "no-preference" }] });

  async function visit(url) {
    currentUrl = url;
    await session.send("Page.navigate", { url: origin + url });
    await settle();
  }
  async function settle() {
    for (let i = 0; i < 160; i++) {
      await delay(125);
      try {
        if (await session.evaluate("return document.readyState === 'complete' && !!document.querySelector('main');")) break;
      } catch {
        // Navigation in progress.
      }
    }
    await session.evaluate("await document.fonts.ready; return true;");
    // A page still fetching (the status refresh) shows transient classes and labels.
    await session.evaluate("for (let i = 0; i < 60 && document.querySelector('main [aria-busy=true]'); i++) await new Promise((r) => setTimeout(r, 200)); return true;");
    await delay(900);
  }
  const cookie = async () => (await session.send("Network.getCookies", { urls: [origin] })).cookies.find((c) => c.name === "op77_lang")?.value;

  /** Which fonts drew the text of this page; system faces only. */
  async function systemFonts() {
    const { root } = await session.send("DOM.getDocument", { depth: -1, pierce: false });
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "header *, main *, footer *" });
    const found = new Map();
    for (const nodeId of nodeIds.slice(0, 1500)) {
      let fonts;
      try {
        ({ fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId }));
      } catch {
        continue;
      }
      for (const font of fonts ?? []) {
        if (font.isCustomFont || !font.glyphCount) continue;
        const entry = found.get(font.familyName) ?? { glyphs: 0, sample: "" };
        entry.glyphs += font.glyphCount;
        if (!entry.sample) {
          const { outerHTML } = await session.send("DOM.getOuterHTML", { nodeId });
          entry.sample = outerHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
        }
        found.set(font.familyName, entry);
      }
    }
    return found;
  }

  /* ---------------------------------------------------- layout and fonts --- */

  await reducedMotion(false);
  const english = new Map();
  const englishFonts = new Map();
  for (const route of ROUTES) {
    for (const { locale, segment, tag } of LOCALES) {
      const url = localized(route, segment);
      await resize(WIDTHS[0]);
      await visit(url);
      check(`${url} renders in ${tag}`, (await session.evaluate("return document.documentElement.lang;")) === tag);
      for (const width of WIDTHS) {
        await resize(width);
        await delay(350);
        const result = await session.evaluate(MEASURE);
        const id = `${route}@${width}`;
        if (locale === "en") {
          english.set(id, result);
          continue;
        }
        const base = english.get(id);
        const baseOverflow = new Set(base.overflow.map((item) => item.key));
        const added = result.overflow.filter((item) => !baseOverflow.has(item.key));
        check(`${url} @${width}: no text overflows its box`, added.length === 0, added.slice(0, 4).map((item) => `"${item.text}" +${item.excess}px`).join("; "));
        check(`${url} @${width}: header fits`, result.headerFits || !base.headerFits);
        const baseClashes = new Set(base.headerClashes.map((item) => item.key));
        const clashes = result.headerClashes.filter((item) => !baseClashes.has(item.key));
        check(`${url} @${width}: header labels do not collide`, clashes.length === 0, clashes.map((item) => `${item.text} (${item.overlap}px)`).join("; "));
        check(`${url} @${width}: page no wider than the viewport`, result.pageFits || !base.pageFits);
        const baseWraps = new Set(base.wraps.map((item) => item.key));
        for (const item of result.wraps) if (!baseWraps.has(item.key)) review.push(`${url} @${width} wraps: "${item.text}"`);
      }
      if (["/", "/download", "/servers", "/account", "/missing-page"].includes(route)) {
        await resize(1440);
        await delay(300);
        const fonts = await systemFonts();
        if (locale === "en") englishFonts.set(route, fonts);
        else {
          const added = [...fonts].filter(([family]) => !englishFonts.get(route).has(family));
          check(`${url}: every glyph drawn by the site fonts or their fallbacks`, added.length === 0, added.map(([family, e]) => `${family} ×${e.glyphs} ("${e.sample}")`).join("; "));
        }
      }
    }
  }

  /* ------------------------------------------------- client-side 404s --- */

  // Misses that end in a page's notFound() render in the browser: the site's
  // 404 in the right language, never Next's bare "This page could not be found".
  for (const [url, tag] of [["/docs/download", "en"], ["/xx/download", "en"], ["/docs/servers/abc", "en"], ["/fr/nope/deeper", "fr"]]) {
    await resize(1440);
    await visit(url);
    const page = await session.evaluate("return { lang: document.documentElement.lang, main: !!document.querySelector('main h1'), title: document.title };");
    check(`${url}: the site's ${tag} 404`, page.lang === tag && page.main && !/could not be found/.test(page.title), page);
  }

  /* --------------------------------------------------- Turkish capitals --- */

  await resize(1440);
  await visit("/tr");
  const capitals = await session.evaluate(`
    const items = [...document.querySelectorAll("header *, main *, footer *")].filter((el) =>
      getComputedStyle(el).textTransform === "uppercase" && [...el.childNodes].some((n) => n.nodeType === 3 && /i/.test(n.textContent)));
    return { count: items.length, dotless: items.filter((el) => /I/.test(el.innerText) && !/İ/.test(el.innerText)).map((el) => el.textContent.trim().slice(0, 40)) };
  `);
  check("tr: CSS capitals keep the dotted İ", capitals.count > 0 && capitals.dotless.length === 0, capitals);

  /* ------------------------------------------- Japanese and Thai type --- */

  // Ink is measured with canvas in the element's own font (fallback faces
  // included) and placed on the DOM line from the primary font's ascent, so a
  // tone mark above a tight label is caught even though the line box ignores it.
  const SCRIPT_TYPE = `
    const script = document.documentElement.lang === "th" ? /[\u0E00-\u0E7F]/ : /[\u3000-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/;
    const canvas = document.createElement("canvas").getContext("2d");
    const tracked = new Set();
    const clipped = [];
    const titles = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !script.test(node.nodeValue) || el.closest("[aria-hidden=true], [hidden], script, style, noscript, .sr-only")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || !el.getClientRects().length) continue;
      if (style.letterSpacing !== "normal" && parseFloat(style.letterSpacing) !== 0) tracked.add(el.tagName.toLowerCase() + "." + [...el.classList].join(".") + " " + style.letterSpacing + " “" + node.nodeValue.trim().slice(0, 24) + "”");
      canvas.font = style.fontStyle + " " + style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
      const ink = canvas.measureText(node.nodeValue.trim());
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      const found = [];
      let hidden = false;
      for (let box = el; box && box !== document.body; box = box.parentElement) {
        const boxStyle = getComputedStyle(box);
        if (boxStyle.overflowY === "visible") continue; // clips sideways only (overflow-x: clip)
        const r = box.getBoundingClientRect();
        // Visually hidden text (a 1 px clipped box) is for screen readers only.
        if (r.width <= 2 || r.height <= 2) {
          hidden = true;
          break;
        }
        const top = r.top + parseFloat(boxStyle.borderTopWidth);
        const bottom = r.bottom - parseFloat(boxStyle.borderBottomWidth);
        const scroller = ["auto", "scroll"].includes(boxStyle.overflowY);
        for (const line of rects) {
          // A line the box hides on purpose (clamp, marquee, a track panel off
          // screen) or a line a scroller has half scrolled away: layout, not type.
          const middle = (line.top + line.bottom) / 2;
          if (middle <= top || middle >= bottom || (scroller && (line.top < top || line.bottom > bottom))) continue;
          const baseline = line.top + ink.fontBoundingBoxAscent;
          const over = Math.max(top - (baseline - ink.actualBoundingBoxAscent), baseline + ink.actualBoundingBoxDescent - bottom);
          if (over > 1.5) {
            found.push("“" + node.nodeValue.trim().slice(0, 30) + "” by " + box.tagName.toLowerCase() + "." + [...box.classList].join(".") + " (" + Math.round(over) + "px)");
            break;
          }
        }
      }
      if (!hidden) clipped.push(...found);
    }
    for (const title of document.querySelectorAll("h1, h2")) {
      if (!script.test(title.textContent) || !title.getClientRects().length) continue;
      const style = getComputedStyle(title);
      titles.push({ text: title.textContent.trim().slice(0, 30), wordBreak: style.wordBreak, synthesis: style.fontSynthesisStyle ?? style.fontSynthesis });
    }
    return { tracked: [...tracked].slice(0, 8), clipped: [...new Set(clipped)].slice(0, 8), titles };
  `;
  for (const segment of ["ja", "th"]) {
    for (const route of ["/", "/download", "/servers", "/create", "/host", "/ncwe", "/status", "/account", "/launcher"]) {
      const url = localized(route, segment);
      for (const width of [1440, 390]) {
        await resize(width);
        await visit(url);
        const type = await session.evaluate(SCRIPT_TYPE);
        check(`${url} @${width}: no letter-spacing on ${segment} text`, type.tracked.length === 0, type.tracked.join("; "));
        check(`${url} @${width}: no ${segment} glyph clipped by its box`, type.clipped.length === 0, type.clipped.join("; "));
        check(`${url} @${width}: titles never slanted by synthesis`, type.titles.every((title) => title.synthesis === "none"), type.titles);
        if (segment === "ja") check(`${url} @${width}: Japanese titles break between phrases`, type.titles.every((title) => title.wordBreak === "auto-phrase"), type.titles.filter((title) => title.wordBreak !== "auto-phrase"));
      }
    }
  }

  /* ------------------------------------------------------------ selector --- */

  await session.send("Network.clearBrowserCookies");
  await visit("/fr/download?channel=test#faq");
  await session.evaluate(`
    const link = document.querySelector('header a[hreflang="de"]');
    link.closest("ul").parentElement.parentElement.querySelector("button").click();
    await new Promise((r) => setTimeout(r, 150));
    link.click();
    return true;
  `);
  await settle();
  const switched = await session.evaluate("return { path: location.pathname, search: location.search, hash: location.hash, lang: document.documentElement.lang };");
  check("selector: same page in the chosen language, query and fragment kept", switched.path === "/de/download" && switched.search === "?channel=test" && switched.hash === "#faq" && switched.lang === "de", switched);
  check("selector: choice stored in op77_lang", (await cookie()) === "de");
  await visit("/");
  check("selector: the stored choice wins on the next visit", (await session.evaluate("return location.pathname;")) === "/de");
  await session.evaluate(`
    const link = document.querySelector('header a[hreflang="en"]');
    link.closest("ul").parentElement.parentElement.querySelector("button").click();
    await new Promise((r) => setTimeout(r, 150));
    link.click();
    return true;
  `);
  await settle();
  check("selector: choosing English goes to the unprefixed page", (await session.evaluate("return location.pathname;")) === "/" && (await cookie()) === "en");
  await acceptLanguage("de-DE,de;q=0.9");
  await visit("/download");
  check("selector: English, once chosen, beats a German browser", (await session.evaluate("return location.pathname;")) === "/download");

  await session.send("Network.clearBrowserCookies");
  await acceptLanguage("en-US,en;q=0.9");
  await visit("/docs");
  await session.evaluate(`
    const link = document.querySelector('header a[hreflang="fr"]');
    link.closest("ul").parentElement.parentElement.querySelector("button").click();
    await new Promise((r) => setTimeout(r, 150));
    link.click();
    await new Promise((r) => setTimeout(r, 300));
    return true;
  `);
  const notice = await session.evaluate("return { path: location.pathname, toast: document.querySelector('header [role=status]')?.textContent ?? '' };");
  check("selector on an English-only page: stays, explains, remembers", notice.path === "/docs" && notice.toast.length > 0 && (await cookie()) === "fr", notice);
  await session.evaluate("document.querySelector('header a[href=\"/download\"]').click(); return true;");
  await delay(500);
  await settle();
  const followed = await session.evaluate("return { path: location.pathname, lang: document.documentElement.lang };");
  check("from an English-only page, a header link lands on the chosen language", followed.path === "/fr/download" && followed.lang === "fr", followed);

  /* --------------------------------------------------------- first visit --- */

  await session.send("Network.clearBrowserCookies");
  await acceptLanguage("ru-RU,ru;q=0.9,en;q=0.5");
  await visit("/");
  check("first visit: Accept-Language picks Russian", (await session.evaluate("return location.pathname + ' ' + document.documentElement.lang;")) === "/ru ru");
  await acceptLanguage("en-US,en;q=0.9");
  await session.send("Network.clearBrowserCookies");

  /* ---------------------------------------- mobile menu, quick navigation --- */

  await resize(390, 844);
  await visit("/de");
  await session.evaluate("document.querySelector('button[aria-controls=site-menu]').click(); return true;");
  await delay(250);
  const menu = await session.evaluate(`
    const links = [...document.querySelectorAll("#site-menu a")].map((a) => a.getAttribute("href"));
    return { open: !document.getElementById("site-menu").hidden, download: links.includes("/de/download"), docs: links.some((h) => h.startsWith("/docs")), prefixedDocs: links.some((h) => /^\\/de\\/docs/.test(h)), languages: document.querySelectorAll("#site-menu a[hreflang]").length };
  `);
  check("de mobile menu: localized links, English docs, language row", menu.open && menu.download && menu.docs && !menu.prefixedDocs && menu.languages === LOCALES.length, menu);

  await resize(1440);
  await visit("/fr/servers");
  await session.evaluate("document.activeElement?.blur(); return true;");
  await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "k", code: "KeyK", windowsVirtualKeyCode: 75, modifiers: 2 });
  await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "k", code: "KeyK", windowsVirtualKeyCode: 75, modifiers: 2 });
  await delay(300);
  const quick = await session.evaluate(`
    const links = [...document.querySelectorAll("dialog[open] a")].map((a) => a.getAttribute("href"));
    return { open: links.length > 0, localized: links.includes("/fr/download"), english: links.filter((h) => /^\\/fr\\/(docs|devblog|workshop)/.test(h)) };
  `);
  check("fr quick navigation: localized and English-only destinations", quick.open && quick.localized && quick.english.length === 0, quick);
  await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });

  /* ---------------------------------------------- server profile round trip --- */

  await visit("/fr/servers?lang=en");
  check("fr server browser keeps the ?lang= filter", (await session.evaluate("return location.pathname + location.search;")) === "/fr/servers?lang=en");
  await visit("/fr/servers");
  await delay(2500);
  // A click selects a row; a double-click on its name opens the profile.
  const opened = await session.evaluate(`
    const row = document.querySelector('main [data-server-id] a[href^="/fr/servers/"]');
    if (!row) return null;
    row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1200));
    return location.pathname;
  `);
  if (opened === null) notes.push("server profile round trip: no server listed at test time (a local origin cannot read the production master without --cross-origin)");
  else {
    check("fr server row opens /fr/servers/<id>", /^\/fr\/servers\/[^/]+$/.test(opened), opened);
    await session.evaluate("history.back(); return true;");
    await delay(800);
    check("back returns to /fr/servers", (await session.evaluate("return location.pathname;")) === "/fr/servers");
    await visit(opened);
    check(`${opened} renders in French`, (await session.evaluate("return document.documentElement.lang;")) === "fr");
  }

  /* --------------------------------------------------------- screenshots --- */

  if (shotsDir) {
    await fs.mkdir(shotsDir, { recursive: true });
    const capture = async (file, full) => {
      const layout = await session.send("Page.getLayoutMetrics");
      const height = Math.min(Math.ceil(layout.cssContentSize.height), 16000);
      const image = await session.send("Page.captureScreenshot", {
        format: "png",
        ...(full ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width: layout.cssLayoutViewport.clientWidth, height, scale: 1 } } : {}),
      });
      await fs.writeFile(path.join(shotsDir, file), Buffer.from(image.data, "base64"));
    };
    for (const locale of shotLocales) {
      const { segment } = LOCALES.find((entry) => entry.locale === locale) ?? {};
      if (segment === undefined) continue;
      for (const [page, route] of [["home", "/"], ["download", "/download"], ["servers", "/servers"], ["account", "/account"]]) {
        for (const width of [1440, 390]) {
          await resize(width, width < 600 ? 844 : 900);
          // Full motion for the first screen, as visitors see it.
          await reducedMotion(false);
          await visit(localized(route, segment));
          if (route === "/servers") await delay(2000);
          await capture(`${locale}-${page}-${width}.png`, false);
          // Reduced motion for the whole page: reveal effects off, every section painted.
          await reducedMotion(true);
          await visit(localized(route, segment));
          if (route === "/servers") await delay(2000);
          await capture(`${locale}-${page}-${width}-full.png`, true);
        }
      }
    }
    await reducedMotion(false);
    console.log(`Screenshots written to ${shotsDir}`);
  }

  check("no browser errors", errors.length === 0, errors.slice(0, 8).join("\n"));
  session.socket.close();
} finally {
  child.kill();
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith("open77-i18n-check-")) {
    await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
  }
}

if (review.length) {
  console.log(`\nFor review (labels that wrap only in the translation, ${review.length}):`);
  for (const line of review) console.log(`  ${line}`);
}
for (const note of notes) console.log(`\nNot exercised: ${note}`);
console.log(`\n${passes}/${passes + failures} browser i18n checks passed.`);
process.exitCode = failures ? 1 : 0;
