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

  if (process.argv.includes("--remote-camera")) {
    for (const width of [1440, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
      });
      await visit("/docs/remote-camera");
      check(`remote camera ${width}px guide, contracts and warnings render`, await session.evaluate(`
        return !!document.querySelector('#server-service') &&
          !!document.querySelector('#limits-and-troubleshooting') &&
          document.querySelector('main').textContent.includes('intermittent engine crashes') &&
          !!document.querySelector('a[href="/docs/api/client/open77-remotecamera"]') &&
          document.querySelector('.dx-nav a[aria-current="page"]')?.getAttribute('href') === '/docs/remote-camera';
      `));
      check(`remote camera ${width}px fits viewport`, await session.evaluate(
        "return document.documentElement.scrollWidth <= innerWidth;",
      ));
      reportConsole(`remote camera guide ${width}px`);
      await visit("/docs/api?side=client&namespace=Open77.remoteCamera#client/open77-remotecamera/bindwebui");
      const api = await session.evaluate(`
        const detail = document.querySelector('.api-detail');
        return { name: detail?.querySelector('h2')?.textContent,
          count: document.querySelectorAll('.api-function-row').length,
          guide: detail?.querySelector('a[href="/docs/remote-camera"]')?.getAttribute('href') };
      `);
      check(`remote camera ${width}px explorer exposes 15 cards and guide`,
        api.name === "bindWebUI" && api.count === 15 && api.guide === "/docs/remote-camera", JSON.stringify(api));
      reportConsole(`remote camera explorer ${width}px`);
    }
  } else if (process.argv.includes("--navigation")) {
    await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await visit("/docs");
    check("sidebar has four collections, 18 topics and one API shortcut", await session.evaluate(`
      const nav = document.querySelector('.dx-nav');
      return nav.querySelectorAll('.docs-nav-collection').length === 4 &&
        nav.querySelectorAll('.docs-group-toggle').length === 18 &&
        nav.querySelectorAll('a[href="/docs/api"]').length === 1 &&
        nav.querySelectorAll('.docs-group-toggle[aria-expanded="true"]').length === 1;
    `));
    check("home directory matches sidebar themes", await session.evaluate(`
      return document.querySelectorAll('.docs-topic-directory').length === 4 &&
        document.querySelectorAll('.docs-category-directory h4').length === 18;
    `));
    await session.send("Page.bringToFront");
    await session.evaluate(`document.querySelector('[aria-controls="nav-vehicles"]').focus();`);
    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 });
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await session.evaluate("await new Promise(r => setTimeout(r, 150));");
    const keyboardTopic = await session.evaluate(`
      return { expanded: document.querySelector('[aria-controls="nav-vehicles"]').getAttribute('aria-expanded'),
        height: document.querySelector('#nav-vehicles').getBoundingClientRect().height,
        focused: document.activeElement.getAttribute('aria-controls') };
    `);
    check("keyboard opens the vehicle topic", keyboardTopic.expanded === 'true' && keyboardTopic.height > 0, JSON.stringify(keyboardTopic));
    await fs.mkdir(".shots", { recursive: true });
    const screenshot = async (name) => {
      const shot = await session.send("Page.captureScreenshot", { format: "png" });
      await fs.writeFile(path.join(".shots", name + ".png"), Buffer.from(shot.data, "base64"));
    };
    await screenshot("docs-navigation-desktop");
    await visit("/docs/native-map");
    check("deep link opens only its topic and marks current guide", await session.evaluate(`
      return document.querySelectorAll('.docs-group-toggle[aria-expanded="true"]').length === 1 &&
        document.querySelector('[aria-controls="nav-map"]').getAttribute('aria-expanded') === 'true' &&
        document.querySelector('.dx-nav a[aria-current="page"]').getAttribute('href') === '/docs/native-map';
    `));
    const filter = async (value) => session.evaluate(`
      const input = document.querySelector('[aria-label="Filter documentation topics"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
    `);
    await filter("vehicles");
    check("filter finds the whole vehicle theme", await session.evaluate(`
      return document.querySelectorAll('.docs-group-toggle').length === 1 &&
        document.querySelectorAll('#nav-vehicles a').length === 5 &&
        document.querySelector('.docs-nav-results').textContent === '5 pages found';
    `));
    await filter("nothingmatcheszz");
    check("filter has an explicit empty state", await session.evaluate(`return !!document.querySelector('.docs-nav-empty');`));
    await session.evaluate(`document.querySelector('[aria-label="Clear topic filter"]').click(); await new Promise(r => setTimeout(r, 100));`);
    check("clearing filter restores topics and input focus", await session.evaluate(`
      return document.querySelectorAll('.docs-group-toggle').length === 18 &&
        document.activeElement.getAttribute('aria-label') === 'Filter documentation topics';
    `));
    reportConsole("desktop topic navigation");
    await session.evaluate(`document.querySelector('.docs-theme-toggle').click(); await new Promise(r => setTimeout(r, 100));`);
    await screenshot("docs-navigation-dark");
    await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await visit("/docs/native-map");
    await session.evaluate(`document.querySelector('.docs-mobile-nav').click(); await new Promise(r => setTimeout(r, 100));`);
    check("mobile navigation opens and fits viewport", await session.evaluate(`
      return document.querySelector('.docs-mobile-nav').getAttribute('aria-expanded') === 'true' &&
        document.documentElement.scrollWidth <= innerWidth;
    `));
    await filter("NPC");
    check("mobile filter finds NPCs and player models", await session.evaluate(`
      return document.querySelectorAll('#nav-characters a').length === 5 &&
        document.querySelectorAll('.docs-group-toggle').length === 1;
    `));
    await screenshot("docs-navigation-mobile");
    await session.evaluate(`document.querySelector('#nav-characters a[href="/docs/npcs"]').click();`);
    for (let i = 0; i < 50; i++) {
      if (await session.evaluate(`return location.pathname === '/docs/npcs' && document.querySelector('.docs-mobile-nav')?.getAttribute('aria-expanded') === 'false';`)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    check("mobile guide navigation closes drawer and clears filter", await session.evaluate(`
      return location.pathname === '/docs/npcs' &&
        document.querySelector('.docs-mobile-nav').getAttribute('aria-expanded') === 'false' &&
        document.querySelector('[aria-label="Filter documentation topics"]').value === '';
    `));
    reportConsole("mobile topic navigation");
  } else if (process.argv.includes("--native-map")) {
    for (const width of [1440, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
      });
      await visit("/docs/native-map");
      check(`native map ${width}px guide and ready handshake render`, await session.evaluate(`
        return !!document.querySelector('#customize-the-map-screen') &&
          document.querySelector('main').textContent.includes("Open77.emit('open77:map:ready'") &&
          !!document.querySelector('a[href="/docs/api/client/open77-map"]');
      `));
      check(`native map ${width}px fits viewport`, await session.evaluate(
        "return document.documentElement.scrollWidth <= innerWidth;",
      ));
      reportConsole(`native map ${width}px`);
      await visit("/docs/api?side=client&namespace=Open77.map#client/open77-map/addtab");
      const api = await session.evaluate(`
        const detail = document.querySelector('.api-detail');
        return { name: detail?.querySelector('h2')?.textContent,
          count: document.querySelectorAll('.api-function-row').length,
          guide: detail?.querySelector('a[href="/docs/native-map"]')?.getAttribute('href'),
          text: detail?.textContent ?? '' };
      `);
      check(`native map ${width}px deep link selects addTab among 21 functions`,
        api.name === "addTab" && api.count === 21 && api.guide === "/docs/native-map" &&
        api.text.includes("map.control") && api.text.includes("id, page"), JSON.stringify(api));
      reportConsole(`native map API ${width}px`);
    }
  } else {
  if (process.argv.includes("--npcs")) {
    await fs.mkdir(".shots", { recursive: true });
    await session.send("Network.enable");
    await session.send("Network.setBlockedURLs", { urls: ["*npc-records-2.31.json*"] });
    await visit("/docs/npc-catalogue");
    check("NPC catalogue has recoverable download error", await session.evaluate(`
      return document.querySelector('.npc-catalogue [role="alert"]')?.textContent.includes('Retry download');
    `));
    await session.send("Network.setBlockedURLs", { urls: [] });
    await session.evaluate(`document.querySelector('.npc-catalogue [role="alert"] button').click();`);
    for (let i = 0; i < 60; i++) {
      if (await session.evaluate(`return document.querySelectorAll('.npc-catalogue-list > li').length === 40;`)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    check("NPC retry loads 40 of 6582 records", await session.evaluate(`
      return document.querySelectorAll('.npc-catalogue-list > li').length === 40 && document.querySelector('.npc-catalogue-results').textContent.includes('6,582');
    `));
    messages = []; // The intentionally blocked fetch above is expected.
    const pageChanged = await session.evaluate(`
      const first = document.querySelector('.npc-catalogue-record code').textContent;
      document.querySelector('.npc-catalogue-pagination button:last-child').click();
      await new Promise(r => setTimeout(r, 100));
      return first !== document.querySelector('.npc-catalogue-record code').textContent;
    `);
    check("NPC pagination changes records", pageChanged);
    const search = async (value) => session.evaluate(`
      const input = document.querySelector('.npc-catalogue input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      return document.querySelectorAll('.npc-catalogue-list > li').length;
    `);
    check("NPC search finds exact spawn example", await search("Character.cpz_maelstrom_grunt1_ranged1_lexington_wa") === 1);
    await session.send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }, false);
    check("NPC copy uses exact Character ID", await session.evaluate(`
      document.querySelector('.npc-catalogue-record button').click();
      await new Promise(r => setTimeout(r, 150));
      return await navigator.clipboard.readText() === 'Character.cpz_maelstrom_grunt1_ranged1_lexington_wa';
    `));
    await session.evaluate(`document.querySelector('.npc-catalogue summary').click();`);
    check("NPC details expose template and appearance", await session.evaluate(`return document.querySelector('.npc-catalogue details[open] dd').textContent.includes('.ent');`));
    for (const width of [1440, 900, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      for (const theme of ['light', 'dark']) {
        await session.evaluate(`
          if (document.querySelector('.docs-site').dataset.theme !== '${theme}') document.querySelector('.docs-theme-toggle').click();
          document.querySelector('.npc-catalogue').scrollIntoView({ behavior: 'instant', block: 'start' });
          await new Promise(r => setTimeout(r, 150));
        `);
        check(`NPC catalogue ${width}px ${theme} no overflow`, await session.evaluate(`return document.documentElement.scrollWidth <= innerWidth;`));
        if (width !== 900) {
          const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          await fs.writeFile(`.shots/npc-${width}-${theme}.png`, Buffer.from(data, "base64"));
        }
      }
    }
    check("NPC empty search is explicit", await search("__no_such_character__") === 0);
    await session.evaluate(`document.querySelector('.npc-catalogue-empty button').click(); await new Promise(r => setTimeout(r, 100));`);
    check("NPC reset restores catalogue", await session.evaluate(`return document.querySelectorAll('.npc-catalogue-list > li').length === 40;`));
    check("NPC classification filter works", await session.evaluate(`
      const select = document.querySelectorAll('.npc-catalogue select')[1];
      select.value = 'candidate'; select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      return [...document.querySelectorAll('.npc-catalogue-tags [data-risk]')].every(el => el.dataset.risk === 'candidate') && document.querySelectorAll('.npc-catalogue-list > li').length === 40;
    `));
    reportConsole("NPC interactions");
    await session.evaluate(`if (document.querySelector('.docs-site').dataset.theme !== 'light') document.querySelector('.docs-theme-toggle').click();`);
    await session.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  }

  if (process.argv.includes("--alpha")) {
    await fs.mkdir(".shots", { recursive: true });
    for (const width of [1440, 1100, 420]) {
      await session.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      for (const route of ["/", "/create", "/download", "/docs/alpha-access", "/host"]) {
        await visit(route);
        check(`Alpha ${route} ${width}px has no page overflow`, await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
        check(`Alpha ${route} ${width}px has current access guidance`, await session.evaluate(`
          const text = document.body.innerText;
          return text.includes('/alpha apply') && !/developer[ -]?preview|preview access|join preview/i.test(text) &&
            !document.querySelector('a[href*="docs.google.com/forms"]');
        `));
        reportConsole(`Alpha ${route} ${width}px`);
        if (route === "/create" && width !== 1100) {
          await session.evaluate("document.getElementById('alpha-access').scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise(r => requestAnimationFrame(r)); return true;");
          const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          await fs.writeFile(`.shots/alpha-build-${width}.png`, Buffer.from(data, "base64"));
        }
      }
    }
    await session.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const fixture of [
      { name: "approved non-staff", role: "user", storedRole: "user", alphaAccess: true, allowed: true },
      { name: "staff", role: "admin", storedRole: "admin", alphaAccess: false, allowed: true },
      { name: "unapproved", role: "user", storedRole: "user", alphaAccess: false, allowed: false },
      { name: "stale stored admin", role: "user", storedRole: "admin", alphaAccess: false, allowed: false },
      { name: "master unavailable", role: "user", storedRole: "user", alphaAccess: true, allowed: false, offline: true },
      { name: "signed out", allowed: false, signedOut: true },
    ]) {
      // Browser-only fixtures: /me is intercepted before fetch so no fake token
      // reaches the real master, and no account or production policy is changed.
      const { identifier } = await session.send("Page.addScriptToEvaluateOnNewDocument", { source: `
        (() => {
          const fixture = ${JSON.stringify(fixture)};
          localStorage.removeItem('open77.session');
          if (!fixture.signedOut) localStorage.setItem('open77.session', JSON.stringify({
            token: 'host-access-browser-fixture', accountId: 'host-fixture',
            expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
            displayName: 'Alpha test', role: fixture.storedRole, emailVerified: true
          }));
          const originalFetch = window.fetch.bind(window);
          window.fetch = async (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            if (new URL(url, location.href).pathname === '/api/v1/accounts/me') {
              if (fixture.offline) throw new TypeError('Simulated unavailable master');
              return new Response(JSON.stringify({accountId:'host-fixture', displayName:'Alpha test',
                role:fixture.role, alphaAccess:fixture.alphaAccess, alphaGateActive:true,
                email:'alpha@example.test', emailVerified:true, identities:[]}),
                {status:200, headers:{'Content-Type':'application/json'}});
            }
            return originalFetch(input, init);
          };
        })();
      ` });
      try {
        await visit("/host");
        const access = await session.evaluate(`
          for (let i=0; i<50 && document.querySelector('.ac-loading'); i++) await new Promise(r => setTimeout(r, 100));
          return { downloads: document.querySelectorAll('a[href*="cdn.open2077.net/server/"]').length,
            locked: !!document.querySelector('.host-locked'), text: document.body.innerText };
        `);
        check(`host gate: ${fixture.name}`, fixture.allowed ? access.downloads >= 2 && !access.locked : access.downloads === 0 && access.locked);
        if (fixture.offline) check("host gate reports an availability error", access.text.includes("Unable to verify Alpha access."));
        if (!fixture.allowed) check(`host gate ${fixture.name} explains Discord access`, access.text.includes('/alpha apply'));
        reportConsole(`host gate ${fixture.name}`);
      } finally {
        await session.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
      }
    }
    await session.evaluate("localStorage.removeItem('open77.session');");
  }

  if (!process.argv.includes("--alpha")) {
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

  for (const slug of ["cyberware", "gorilla-arms"]) {
    await visit(`/docs/${slug}`);
    reportConsole(`${slug} guide`);
    check(`${slug} guide exposes both runtime references`, await session.evaluate(`
      return !!document.querySelector('.dx-prose a[href="/docs/api/server/open77-cyberware"]') &&
        !!document.querySelector('.dx-prose a[href="/docs/api/client/open77-cyberware"]');
    `));
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${slug}-guide.png`, Buffer.from(data, "base64"));
    }
  }
  for (const [runtime, method, expected] of [
    ["server", "install", "players.cyberware.manage"],
    ["client", "projectLocal", "player.cyberware.project"],
  ]) {
    await visit(`/docs/api?side=${runtime}&category=cyberware&namespace=Open77.cyberware#${runtime}/open77-cyberware/${method.toLowerCase()}`);
    reportConsole(`Cyberware ${runtime} API`);
    check(`Cyberware ${runtime} filtering, permission and tutorial`, await session.evaluate(`
      const detail = document.querySelector('.api-detail');
      const rows = [...document.querySelectorAll('.api-function-row')];
      return detail.querySelector('h2').textContent === '${method}' &&
        detail.querySelector('.api-side').textContent === '${runtime}' &&
        detail.textContent.includes('${expected}') &&
        !!detail.querySelector('a[href="/docs/gorilla-arms"]') && rows.length > 0 &&
        rows.every(row => row.textContent.includes('Open77.cyberware.'));
    `));
  }

  for (const [slug, namespace] of [["attachments", "open77-props"], ["player-interactions", "open77-playerinteractions"]]) {
    await visit(`/docs/${slug}`);
    reportConsole(`${slug} guide`);
    check(`${slug} tutorial exposes both runtime references`, await session.evaluate(`
      return !!document.querySelector('.dx-meta a[href="/docs/api/client/${namespace}"]') &&
        !!document.querySelector('.dx-meta a[href="/docs/api/server/${namespace}"]') &&
        !!document.getElementById('server-api') && document.documentElement.scrollWidth <= innerWidth;
    `));
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${slug}-guide.png`, Buffer.from(data, "base64"));
    }
  }
  for (const [runtime, method, count, expected] of [
    ["client", "accept", 9, "Open77.Promise"],
    ["server", "request", 6, "players.interactions.control"],
  ]) {
    await visit(`/docs/api?side=${runtime}&category=players&namespace=Open77.playerInteractions#${runtime}/open77-playerinteractions/${method}`);
    reportConsole(`player interactions ${runtime} API`);
    check(`player interactions ${runtime} category, contract and guide`, await session.evaluate(`
      const detail = document.querySelector('.api-detail');
      return detail.querySelector('h2').textContent === '${method}' &&
        detail.querySelector('.api-side').textContent === '${runtime}' &&
        document.querySelectorAll('.api-function-row').length === ${count} &&
        detail.textContent.includes('${expected}') &&
        !!detail.querySelector('a[href="/docs/player-interactions#${runtime}-api"]');
    `));
  }
  for (const runtime of ["client", "server"]) {
    await visit(`/docs/api?side=${runtime}&category=world&namespace=Open77.props#${runtime}/open77-props/attach`);
    reportConsole(`attachments ${runtime} API`);
    check(`attachments ${runtime} has the correct runtime and guide`, await session.evaluate(`
      const detail = document.querySelector('.api-detail');
      return detail.querySelector('h2').textContent === 'attach' &&
        detail.querySelector('.api-side').textContent === '${runtime}' &&
        !!detail.querySelector('a[href^="/docs/attachments#${runtime}"]');
    `));
  }

  await visit("/docs/rp-animations");
  reportConsole("RP animation guide");
  check("RP tutorial links to both runtime references and the catalogue", await session.evaluate(`
    return !!document.getElementById('quick-start-your-first-client-action') &&
      !!document.querySelector('a[href="/docs/api/client/open77-animations"]') &&
      !!document.querySelector('a[href="/docs/api/server/open77-animations"]') &&
      !!document.querySelector('.dx-prose a[href="/docs/rp-animation-catalogue"]');
  `));
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/rp-animation-guide.png", Buffer.from(data, "base64"));
  }
  for (const [runtime, method, count, expected] of [
    ["client", "request", 11, "Open77.Promise"],
    ["server", "play", 6, "players.animations.control"],
  ]) {
    await visit(`/docs/api?side=${runtime}&category=players&namespace=Open77.animations#${runtime}/open77-animations/${method}`);
    reportConsole(`RP ${runtime} API`);
    const animation = await session.evaluate(`
      const detail = document.querySelector('.api-detail');
      return {
        title: detail.querySelector('h2').textContent,
        runtime: detail.querySelector('.api-side').textContent,
        count: document.querySelectorAll('.api-function-row').length,
        text: detail.textContent,
        guide: detail.querySelector('a[href^="/docs/rp-animations#"]')?.getAttribute('href'),
      };
    `);
    check(`RP ${runtime} namespace filters and deep link`, animation.title === method && animation.runtime === runtime && animation.count === count, JSON.stringify(animation));
    check(`RP ${runtime} contract and tutorial link`, animation.text.includes(expected) && animation.guide === `/docs/rp-animations#${runtime}-lua-api`);
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/rp-animation-${runtime}-api.png`, Buffer.from(data, "base64"));
    }
  }

  for (const route of ["/docs/vehicle-weapons", "/docs/armed-vehicles"]) {
    await visit(route);
    reportConsole(route);
    check(`${route} is in the vehicle navigation with working reference links`, await session.evaluate(`
      return !document.getElementById('nav-world').hidden &&
        !!document.querySelector('#nav-world a[aria-current="page"]') &&
        !!document.querySelector('a[href="/docs/api/client/open77-vehicles"]') &&
        !!document.querySelector('a[href="/data/vehicle-weapons-2.31.json"]') &&
        document.documentElement.scrollWidth <= innerWidth;
    `));
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${route.split("/").at(-1)}.png`, Buffer.from(data, "base64"));
    }
  }
  await visit("/docs/api?side=client&namespace=Open77.vehicles#client/open77-vehicles/getweaponammo");
  reportConsole("mounted weapon client API");
  check("weapon API has the correct client contract, example and guide label", await session.evaluate(`
    const detail = document.querySelector('.api-detail');
    return detail.querySelector('h2').textContent === 'getWeaponAmmo' &&
      detail.querySelector('.api-side').textContent === 'client' &&
      detail.textContent.includes('not_replicated') && detail.textContent.includes('weapon') &&
      detail.querySelector('a[href="/docs/vehicle-weapons#function-reference"]')?.textContent.includes('Armed vehicle guide') &&
      !detail.textContent.includes('RP animation guide');
  `));

  await visit("/docs/server-exports");
  reportConsole("server export guide");
  check("server export tutorial links back to the API", await session.evaluate(`
    return !!document.getElementById('publish-a-service') &&
      !!document.querySelector('.dx-prose a[href="/docs/server-api#cross-resource-exports"]');
  `));
  await visit("/docs/api?side=server&namespace=Open77.exports#server/open77-exports/call");
  reportConsole("server export reference");
  check("export explorer separates the server runtime", await session.evaluate(`
    return document.querySelector('.api-detail h2').textContent === 'call' &&
      document.querySelector('.api-detail-meta .api-side').textContent === 'server' &&
      document.querySelectorAll('.api-function-row').length === 1 &&
      document.querySelector('.api-detail').textContent.includes('Promise');
  `));
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/server-export-api.png", Buffer.from(data, "base64"));
  }

  await visit("/docs/doors");
  reportConsole("networked door guide");
  check("door guide explains installation, authority and native landing doors", await session.evaluate(`
    const prose = document.querySelector('.dx-prose');
    return prose.textContent.includes('open77_doors >=1.0.0') &&
      prose.textContent.includes('doorsClosed') && prose.textContent.includes('pending:await()') &&
      !!document.querySelector('.docs-site a[href="/docs/doors"]');
  `));
  for (const theme of ["light", "dark"]) {
    await session.evaluate(`
      if (document.querySelector('.docs-site').dataset.theme !== '${theme}') document.querySelector('.docs-theme-toggle').click();
      await new Promise(r => setTimeout(r, 180));
    `);
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/doors-${theme}.png`, Buffer.from(data, "base64"));
    }
  }
  for (const [runtime, method, count] of [["server", "setaccess", 14], ["client", "requestopen", 3]]) {
    await visit(`/docs/api?side=${runtime}&namespace=open77_doors#${runtime}/resource-open77-doors/${method}`);
    reportConsole(`${runtime} door exports`);
    check(`${runtime} door exports show real call syntax and correct runtime`, await session.evaluate(`
      const detail = document.querySelector('.api-detail');
      return document.querySelectorAll('.api-function-row').length === ${count} &&
        detail.querySelector('.api-side').textContent === '${runtime}' &&
        detail.querySelector('.api-signature-block').textContent.includes('Open77.exports.call("open77_doors"') &&
        detail.textContent.includes('Promise') && !!detail.querySelector('a[href="/docs/doors"]');
    `));
  }
  await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await visit("/docs/doors");
  check("door guide contains wide tables within mobile viewport", await session.evaluate(`
    return document.documentElement.scrollWidth <= window.innerWidth + 1;
  `));
  reportConsole("mobile door guide");
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/doors-mobile.png", Buffer.from(data, "base64"));
  }
  await session.evaluate(`if (document.querySelector('.docs-site').dataset.theme !== 'light') document.querySelector('.docs-theme-toggle').click();`);
  await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

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
  await visit("/docs/rp-animations");
  check("RP tutorial fits a mobile viewport", await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
  reportConsole("mobile RP guide");
  await visit("/docs/server-exports");
  check("server export tutorial fits a mobile viewport", await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
  reportConsole("mobile server export guide");
  for (const route of ["/docs/vehicle-weapons", "/docs/armed-vehicles"]) {
    await visit(route);
    check(`${route} fits mobile in dark mode`, await session.evaluate(`
      return document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector('.docs-site').dataset.theme === 'dark';
    `));
    reportConsole(`mobile ${route}`);
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${route.split("/").at(-1)}-mobile.png`, Buffer.from(data, "base64"));
    }
  }
  await visit("/docs/api?side=client&namespace=Open77.animations#client/open77-animations/request");
  check("mobile RP deep link opens client request", await session.evaluate(`
    return document.querySelector('.api-detail h2').textContent === 'request' &&
      getComputedStyle(document.querySelector('.api-detail')).display !== 'none' &&
      document.documentElement.scrollWidth <= innerWidth;
  `));
  reportConsole("mobile RP API");
  for (const slug of ["cyberware", "gorilla-arms", "attachments", "player-interactions"]) {
    await visit(`/docs/${slug}`);
    check(`${slug} mobile guide has no page overflow`, await session.evaluate(`
      return document.documentElement.scrollWidth <= innerWidth;
    `));
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${slug}-mobile.png`, Buffer.from(data, "base64"));
    }
  }
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
  }
  }
} finally {
  child.kill();
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}

console.log(failures === 0 ? "\nAll browser checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
