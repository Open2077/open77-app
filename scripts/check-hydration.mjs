/**
 * Drives the built site in a real browser and fails on console noise.
 *
 * The static HTML is verified elsewhere; this covers the other half. Every
 * interactive part of this site is a client component hydrating over
 * server-rendered markup, and the two ways that goes wrong — a hydration
 * mismatch, or state read from the browser during render — produce a console
 * error and otherwise look fine in a screenshot.
 *
 * It also exercises the interactions themselves, because a filter that silently
 * stops filtering is not something a build can notice.
 *
 * Usage: node scripts/check-hydration.mjs [origin]
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const DEBUG_PORT = 9333;

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

/**
 * Helpers made available to every expression evaluated in the page.
 *
 * `parseSuggestions` pulls the example queries out of a search placeholder like
 * "Filter functions — try camera, vehicles, TriggerServerEvent…", so the tests
 * check whatever the UI currently advertises rather than a copy that drifts.
 */
const PAGE_HELPERS = `
  const parseSuggestions = (placeholder) =>
    (placeholder.split('\\u2014')[1] ?? '')
      .replace(/^\\s*try\\s+/i, '')
      .split(',')
      .map((part) => part.replace('\\u2026', '').trim())
      .filter(Boolean);
`;

/* -------------------------------------------------------------------------- */
/* Minimal CDP client                                                         */
/* -------------------------------------------------------------------------- */

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
      const handlers = this.listeners.get(message.method);
      if (handlers) for (const handler of handlers) handler(message.params);
    });
  }

  send(method, params = {}, useSession = true) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${PAGE_HELPERS}\n${expression} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
    }
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

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

const chrome = await findChrome();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-cdp-"));
const child = spawn(
  chrome,
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

let failures = 0;
const session = await connect(await waitForDevTools());

try {
  const { targetId } = await session.send(
    "Target.createTarget",
    { url: "about:blank" },
    false,
  );
  const attached = await session.send(
    "Target.attachToTarget",
    { targetId, flatten: true },
    false,
  );
  session.sessionId = attached.sessionId;

  /** Console output for the page currently under test. */
  let messages = [];
  session.on("Runtime.consoleAPICalled", (params) => {
    if (params.type !== "error" && params.type !== "warning") return;
    messages.push({
      level: params.type,
      text: params.args
        .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
        .join(" "),
    });
  });
  session.on("Runtime.exceptionThrown", (params) => {
    messages.push({
      level: "exception",
      text: params.exceptionDetails.exception?.description ?? "uncaught exception",
    });
  });

  await session.send("Runtime.enable");
  await session.send("Page.enable");

  async function visit(pathname) {
    messages = [];
    await session.send("Page.navigate", { url: origin + pathname });
    // React hydrates after the load event; poll for the marker Next sets rather
    // than sleeping a guessed duration.
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ready = await session.evaluate(
        "return document.readyState === 'complete' && !!document.querySelector('#main, main');",
      );
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // Give React a few frames to hydrate and report any mismatch.
    await session.evaluate(
      "await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));" +
        "await new Promise(r => setTimeout(r, 400)); return true;",
    );
  }

  function reportConsole(label) {
    const relevant = messages.filter(
      (message) =>
        // Chrome complains about a missing favicon variant and about the
        // download attribute on cross-origin links; neither is ours to fix.
        !/favicon|Download is not allowed/i.test(message.text),
    );
    if (relevant.length === 0) {
      console.log(`ok   ${label} — console clean`);
      return;
    }
    failures += 1;
    console.error(`FAIL ${label} — ${relevant.length} console message(s):`);
    for (const message of relevant.slice(0, 6)) {
      console.error(`       [${message.level}] ${message.text.slice(0, 300)}`);
    }
  }

  function check(label, condition, detail) {
    if (condition) {
      console.log(`ok   ${label}`);
    } else {
      failures += 1;
      console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    }
  }

  /* ---------------------------------------------------------------- home --- */

  if (!process.argv.includes("--docs")) {
  await visit("/");
  reportConsole("/");
  check(
    "/ header height published",
    await session.evaluate(
      "return getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim() !== '';",
    ),
    "--header-h was never set by the header's ResizeObserver",
  );

  /* ------------------------------------------------------------- servers --- */

  await visit("/servers");
  reportConsole("/servers");

  const rows = await session.evaluate(
    "return document.querySelectorAll('.sb-row').length;",
  );
  check("/servers rows hydrated", rows === 14, `saw ${rows} rows, expected 14`);

  // Search narrows the list.
  const searched = await session.evaluate(`
    const input = document.querySelector('.client-search input, .sb-search input, input[type="search"]');
    if (!input) return { error: 'no search input' };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'badlands');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const names = [...document.querySelectorAll('.sb-name')].map(n => n.textContent.trim());
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return { names, restored: document.querySelectorAll('.sb-row').length };
  `);
  check(
    "/servers search filters",
    !searched.error && searched.names.length > 0 && searched.names.length < 14,
    searched.error ?? `matched ${searched.names?.length} rows: ${searched.names?.join(", ")}`,
  );
  check(
    "/servers search clears",
    searched.restored === 14,
    `after clearing saw ${searched.restored} rows`,
  );

  // Mode chips filter, which is the state that used to be set inside an effect.
  const chipped = await session.evaluate(`
    const chips = [...document.querySelectorAll('.filter-chip')];
    const target = chips.find(c => c.textContent.trim() === 'Roleplay');
    if (!target) return { error: 'no Roleplay chip', chips: chips.map(c => c.textContent.trim()) };
    target.click();
    await new Promise(r => setTimeout(r, 300));
    return {
      pressed: target.getAttribute('aria-pressed'),
      rows: document.querySelectorAll('.sb-row').length,
    };
  `);
  check(
    "/servers mode chip filters",
    !chipped.error && chipped.pressed === "true" && chipped.rows < 14 && chipped.rows > 0,
    chipped.error
      ? `${chipped.error} (chips: ${chipped.chips?.join(", ")})`
      : `pressed=${chipped.pressed}, rows=${chipped.rows}`,
  );

  // Favourites: the store starts empty to match the server, then persists.
  const favourited = await session.evaluate(`
    const button = document.querySelector('.sb-fav, [aria-label*="avourite"], [aria-label*="avorite"]');
    if (!button) return { error: 'no favourite control' };
    const before = window.localStorage.getItem('open77.favorites');
    button.click();
    await new Promise(r => setTimeout(r, 300));
    const after = window.localStorage.getItem('open77.favorites');
    const pressed = button.getAttribute('aria-pressed');
    button.click();
    await new Promise(r => setTimeout(r, 200));
    return { before, after, pressed, cleared: window.localStorage.getItem('open77.favorites') };
  `);
  check(
    "/servers favourite persists",
    !favourited.error && favourited.after && favourited.after !== favourited.before,
    favourited.error ?? `storage went from ${favourited.before} to ${favourited.after}`,
  );
  check(
    "/servers favourite toggles off",
    favourited.cleared === "{}" || favourited.cleared === null,
    `storage left as ${favourited.cleared}`,
  );

  /* -------------------------------------------------- deep-linked filter --- */

  await visit("/servers?mode=Roleplay");
  reportConsole("/servers?mode=Roleplay");
  const deepLinked = await session.evaluate(`
    const active = [...document.querySelectorAll('.filter-chip')]
      .filter(c => c.getAttribute('aria-pressed') === 'true')
      .map(c => c.textContent.trim());
    return { active, rows: document.querySelectorAll('.sb-row').length };
  `);
  check(
    "?mode= deep link applies",
    deepLinked.active.length === 1 && deepLinked.active[0] === "Roleplay",
    `active chips: ${deepLinked.active.join(", ") || "none"}`,
  );
  check(
    "?mode= deep link narrows the list",
    deepLinked.rows > 0 && deepLinked.rows < 14,
    `${deepLinked.rows} rows visible`,
  );

  // The home-page racing card deep-links this mode specifically.
  await visit("/servers?mode=Racing");
  reportConsole("/servers?mode=Racing");
  const racingLinked = await session.evaluate(`
    const active = [...document.querySelectorAll('.filter-chip')]
      .filter(c => c.getAttribute('aria-pressed') === 'true')
      .map(c => c.textContent.trim());
    const names = [...document.querySelectorAll('.sb-name')].map(n => n.textContent.trim());
    return { active, names, rows: document.querySelectorAll('.sb-row').length };
  `);
  check(
    "?mode=Racing deep link applies",
    racingLinked.active.length === 1 && racingLinked.active[0] === "Racing",
    `active chips: ${racingLinked.active.join(", ") || "none"}`,
  );
  check(
    "?mode=Racing deep link narrows the list",
    racingLinked.rows > 0 &&
      racingLinked.rows < 14 &&
      racingLinked.names.some((name) => /racing/i.test(name)),
    `${racingLinked.rows} rows: ${racingLinked.names.join(", ")}`,
  );

  }

  /* Documentation: run independently with --docs during local development. */
  await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await visit("/docs");
  reportConsole("/docs");
  check("main site navigation and official logo remain available", await session.evaluate(`
    return !!document.querySelector('.site-header a[href="/servers"]') &&
      !!document.querySelector('.site-header img[src="/brand/logo/open77-logo-light.png"]');
  `));
  const theme = await session.evaluate(`
    document.querySelector('.docs-theme-toggle').click();
    await new Promise(r => setTimeout(r, 150));
    return document.querySelector('.docs-site').dataset.theme;
  `);
  check("theme switches to dark", theme === "dark", theme);
  await visit("/docs");
  check("theme survives reload", await session.evaluate("return document.querySelector('.docs-site').dataset.theme === 'dark';"));
  if (process.argv.includes("--docs")) {
    await fs.mkdir(".shots", { recursive: true });
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/docs-dark.png", Buffer.from(data, "base64"));
  }
  const sticky = await session.evaluate(`
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 900);
    await new Promise(r => setTimeout(r, 200));
    const site = document.querySelector('.site-header').getBoundingClientRect();
    const docs = document.querySelector('.docs-header').getBoundingClientRect();
    const nav = document.querySelector('.dx-nav').getBoundingClientRect();
    return { y: scrollY, site: site.top, docs: docs.top, siteBottom: site.bottom, nav: nav.top, docsBottom: docs.bottom };
  `);
  check("site header stays at viewport top when scrolled", sticky.y > 0 && Math.abs(sticky.site) < 2, JSON.stringify(sticky));
  check("docs header stays below site navigation", Math.abs(sticky.docs - sticky.siteBottom) < 2, JSON.stringify(sticky));
  check("sidebar stays below both headers", Math.abs(sticky.nav - sticky.docsBottom) < 2, JSON.stringify(sticky));
  await session.evaluate("window.scrollTo(0, 0); document.querySelector('.docs-theme-toggle').click();");
  const docsSearch = await session.evaluate(`
    const input = document.querySelector('.docs-global-search input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'vehicles');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return [...document.querySelectorAll('.docs-search-results a')].map(a => a.textContent);
  `);
  check("global search returns guides and API functions", docsSearch.some(text => /Vehicles/i.test(text)) && docsSearch.some(text => /API/.test(text)), JSON.stringify(docsSearch));
  const expanded = await session.evaluate(`
    const toggle = document.querySelector('[aria-controls="nav-server"]');
    toggle.click();
    await new Promise(r => setTimeout(r, 100));
    return !document.getElementById('nav-server').hidden;
  `);
  check("guide categories expand", expanded);

  await visit("/docs/api");
  reportConsole("/docs/api");
  const total = await session.evaluate("return document.querySelectorAll('.api-function-row').length;");
  check("API includes native cards and the server guide", total > 600, String(total));
  const serverOnly = await session.evaluate(`
    document.querySelectorAll('.api-runtime-filter button')[1].click();
    await new Promise(r => setTimeout(r, 150));
    return { count: document.querySelectorAll('.api-function-row').length,
      sides: [...document.querySelectorAll('.api-function-row .api-side')].map(n => n.textContent) };
  `);
  check("server filter shows only server functions", serverOnly.count > 200 && serverOnly.sides.every(side => side === 'server'), JSON.stringify({ count: serverOnly.count }));
  const category = await session.evaluate(`
    const select = document.querySelector('[aria-label="API category"]');
    select.value = 'players';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const target = [...document.querySelectorAll('.api-function-row')].find(a => a.textContent.includes('Open77.players.disconnect'));
    target?.click();
    await new Promise(r => setTimeout(r, 150));
    return { hash: location.hash, title: document.querySelector('.api-detail h2').textContent,
      source: document.querySelector('.api-source').textContent, groups: document.querySelectorAll('.api-function-group').length };
  `);
  check("category filter selects a documented server function", category.title === "disconnect" && category.groups === 1 && category.source.includes("server-api.md"), JSON.stringify(category));
  await visit("/docs/api?side=server&category=players#server/open77-players/disconnect");
  check("filters and selection survive a direct visit", await session.evaluate(`
    return document.querySelector('.api-detail h2').textContent === 'disconnect' &&
      document.querySelector('[aria-label="API category"]').value === 'players';
  `));
  const back = await session.evaluate(`
    const target = [...document.querySelectorAll('.api-function-row')].find(a => a.textContent.includes('Open77.players.ban('));
    target.click();
    await new Promise(r => setTimeout(r, 150));
    const changed = document.querySelector('.api-detail h2').textContent;
    history.back();
    await new Promise(r => setTimeout(r, 300));
    return { changed, restored: document.querySelector('.api-detail h2').textContent };
  `);
  check("browser Back restores the selected function", back.changed === "ban" && back.restored === "disconnect", JSON.stringify(back));
  const empty = await session.evaluate(`
    const input = document.querySelector('[aria-label="Search API functions"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'no_such_function_97531');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const absent = !!document.querySelector('.api-no-results');
    document.querySelector('.api-no-results button').click();
    await new Promise(r => setTimeout(r, 150));
    return { absent, restored: document.querySelectorAll('.api-function-row').length };
  `);
  check("empty search can reset all filters", empty.absent && empty.restored === total, JSON.stringify(empty));
  await visit("/docs/api#server/open77-vehicles/create");
  check("generated vehicle deep links select server version", await session.evaluate(`
    return document.querySelector('.api-detail h2').textContent === 'create' &&
      document.querySelector('.api-detail-meta .api-side').textContent === 'server';
  `));
  await session.send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }, false);
  const copied = await session.evaluate(`
    document.querySelector('.api-detail-links [aria-label="Copy link"]').click();
    await new Promise(r => setTimeout(r, 200));
    return await navigator.clipboard.readText();
  `);
  check("copy link retains runtime and function", copied.endsWith("/docs/api#server/open77-vehicles/create"), copied);
  await session.evaluate("document.querySelector('.docs-theme-toggle').click();");
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/api-dark.png", Buffer.from(data, "base64"));
  }
  reportConsole("API interactions");
  await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await visit("/docs/api#server/open77-vehicles/create");
  check("mobile deep link opens function details", await session.evaluate(`
    return getComputedStyle(document.querySelector('.api-detail')).display !== 'none' &&
      document.documentElement.scrollWidth <= innerWidth;
  `));
  await session.evaluate("document.querySelectorAll('.api-mobile-switch button')[0].click();");
  check("mobile can switch back to functions", await session.evaluate("return getComputedStyle(document.querySelector('.api-function-list')).display !== 'none';"));
  await visit("/docs/vehicles");
  check("mobile documentation has no horizontal page overflow", await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
  const mobile = await session.evaluate(`
    document.querySelector('.docs-mobile-nav').click();
    await new Promise(r => setTimeout(r, 150));
    return getComputedStyle(document.querySelector('.docs-guide-navigation')).display !== 'none';
  `);
  check("mobile guide navigation opens", mobile);
  await session.evaluate("document.querySelector('.docs-mobile-nav').click();");
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/docs-mobile-dark.png", Buffer.from(data, "base64"));
  }
  reportConsole("mobile docs");
  await session.evaluate("document.querySelector('.docs-theme-toggle').click();");
  if (!process.argv.includes("--docs")) {
  /* -------------------------------------------------------- mobile menu --- */

  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 860,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await visit("/servers");
  reportConsole("/servers (mobile)");
  const menu = await session.evaluate(`
    const toggle = document.querySelector('#nav-toggle');
    const nav = document.querySelector('#mobile-nav');
    if (!toggle || !nav) return { error: 'no mobile nav' };
    toggle.click();
    await new Promise(r => setTimeout(r, 250));
    const opened = { hidden: nav.hasAttribute('hidden'), body: document.body.classList.contains('nav-open') };
    // Navigating with the menu open is what the render-time reset exists for.
    nav.querySelector('a[href="/create"]').click();
    await new Promise(r => setTimeout(r, 900));
    return {
      opened,
      afterNav: {
        path: location.pathname,
        hidden: document.querySelector('#mobile-nav').hasAttribute('hidden'),
        body: document.body.classList.contains('nav-open'),
      },
    };
  `);
  check(
    "mobile menu opens",
    !menu.error && menu.opened.hidden === false && menu.opened.body === true,
    menu.error ?? JSON.stringify(menu.opened),
  );
  check(
    "mobile menu closes on navigation",
    menu.afterNav?.path === "/create" &&
      menu.afterNav.hidden === true &&
      menu.afterNav.body === false,
    JSON.stringify(menu.afterNav),
  );
  reportConsole("client navigation to /create");
  }
} finally {
  child.kill();
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}

console.log(failures === 0 ? "\nAll browser checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
