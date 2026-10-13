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
const apiCards = JSON.parse(await fs.readFile(new URL("../content/api/api.json", import.meta.url), "utf8"));
const namespaceCount = (runtime, namespace) => apiCards.filter(entry => entry.runtime === runtime && entry.namespace === namespace).length;

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
    (placeholder.split(/[\\u2014:]/)[1] ?? '')
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

  if (process.argv.includes("--rtti")) {
    for (const width of [1440, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
      });
      await visit("/docs/rtti");
      check(`RTTI ${width}px guide, debugging and navigation render`, await session.evaluate(`
        return document.querySelector('h1')?.textContent === 'RTTI calls and hooks' &&
          !!document.querySelector('#debugging-in-the-game') &&
          document.querySelector('main').textContent.includes('rtti.native') &&
          !!document.querySelector('a[href="/docs/rtti.md"]') &&
          document.querySelector('[data-docs-nav] a[aria-current="page"]')?.getAttribute('href') === '/docs/rtti';
      `));
      check(`RTTI ${width}px code and tables fit viewport`, await session.evaluate(
        "return document.documentElement.scrollWidth <= innerWidth;",
      ));
      check(`RTTI ${width}px table of contents resolves`, await session.evaluate(`
        const links = [...document.querySelectorAll('a[href^="#"]')];
        return links.length > 5 && links.every(a => a.hash.length < 2 || !!document.getElementById(decodeURIComponent(a.hash.slice(1))));
      `));
      reportConsole(`RTTI guide ${width}px`);
      if (width < 600) await session.evaluate(`document.querySelector('[aria-controls=docs-guide-navigation]').click();`);
      await session.evaluate(`
        const input = document.querySelector('[aria-label="Filter documentation topics"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'RTTI');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 150));
      `);
      check(`RTTI ${width}px topic search finds the guide`, await session.evaluate(`
        return document.querySelector('#nav-reference a[href="/docs/rtti"]')?.getBoundingClientRect().height > 0;
      `));
      await visit("/docs/api?side=client&namespace=Open77.rtti#client/open77-rtti/hook");
      const api = await session.evaluate(`
        const detail = document.querySelector('[data-api-detail]');
        return { name: detail?.querySelector('h2')?.textContent,
          count: document.querySelectorAll('[data-api-row]').length,
          guide: detail?.querySelector('a[href="/docs/rtti"]')?.getAttribute('href'),
          text: detail?.textContent ?? '' };
      `);
      check(`RTTI ${width}px explorer exposes five contracts, permission and guide`,
        api.name === "hook" && api.count === 5 && api.guide === "/docs/rtti" &&
        api.text.includes("rtti.native"), JSON.stringify(api));
      reportConsole(`RTTI explorer ${width}px`);
    }
  } else if (process.argv.includes("--metrics")) {
    for (const width of [1440, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", {
        width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
      });
      await visit("/docs/metrics");
      check(`metrics ${width}px guide and active navigation render`, await session.evaluate(`
        return document.querySelector('h1')?.textContent === 'Prometheus metrics' &&
          !!document.querySelector('#enable-the-endpoint') &&
          !!document.querySelector('#custom-gameplay-counters-from-lua') &&
          !!document.querySelector('a[href="/docs/metrics.md"]') &&
          document.querySelector('[data-docs-nav] a[aria-current="page"]')?.getAttribute('href') === '/docs/metrics';
      `));
      check(`metrics ${width}px tables and code fit viewport`, await session.evaluate(
        "return document.documentElement.scrollWidth <= innerWidth;",
      ));
      check(`metrics ${width}px all table-of-contents links resolve`, await session.evaluate(`
        const links = [...document.querySelectorAll('a[href^="#"]')];
        return links.length > 5 && links.every(a => a.hash.length < 2 || !!document.getElementById(decodeURIComponent(a.hash.slice(1))));
      `));
      reportConsole(`Prometheus guide ${width}px`);
      if (width < 600) await session.evaluate(`document.querySelector('[aria-controls=docs-guide-navigation]').click();`);
      await session.evaluate(`
        const input = document.querySelector('[aria-label="Filter documentation topics"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Prometheus');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 150));
      `);
      check(`metrics ${width}px is discoverable in topic search`, await session.evaluate(`
        return document.querySelector('#nav-server-administration a[href="/docs/metrics"]')?.getBoundingClientRect().height > 0;
      `));
    }
  } else if (process.argv.includes("--remote-camera")) {
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
          document.querySelector('[data-docs-nav] a[aria-current="page"]')?.getAttribute('href') === '/docs/remote-camera';
      `));
      check(`remote camera ${width}px fits viewport`, await session.evaluate(
        "return document.documentElement.scrollWidth <= innerWidth;",
      ));
      reportConsole(`remote camera guide ${width}px`);
      await visit("/docs/api?side=client&namespace=Open77.remoteCamera#client/open77-remotecamera/bindwebui");
      const api = await session.evaluate(`
        const detail = document.querySelector('[data-api-detail]');
        return { name: detail?.querySelector('h2')?.textContent,
          count: document.querySelectorAll('[data-api-row]').length,
          guide: detail?.querySelector('a[href="/docs/remote-camera"]')?.getAttribute('href') };
      `);
      check(`remote camera ${width}px explorer exposes 15 cards and guide`,
        api.name === "bindWebUI" && api.count === 15 && api.guide === "/docs/remote-camera", JSON.stringify(api));
      reportConsole(`remote camera explorer ${width}px`);
    }
  } else if (process.argv.includes("--navigation")) {
    await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    // The landing page carries the full directory; guides carry the sidebar.
    await visit("/docs");
    check("home directory matches sidebar themes", await session.evaluate(`
      return document.querySelectorAll('[data-docs-directory]').length === 4 &&
        document.querySelectorAll('[data-docs-directory] h4').length === 21;
    `));
    await visit("/docs/platform");
    check("sidebar has four collections, 21 topics and one API shortcut", await session.evaluate(`
      const nav = document.querySelector('[data-docs-nav]');
      return nav.querySelectorAll('[data-docs-collection]').length === 4 &&
        nav.querySelectorAll('[data-docs-topic]').length === 21 &&
        nav.querySelectorAll('a[href="/docs/api"]').length === 1 &&
        nav.querySelectorAll('[data-docs-topic][aria-expanded="true"]').length === 1;
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
      return document.querySelectorAll('[data-docs-topic][aria-expanded="true"]').length === 1 &&
        document.querySelector('[aria-controls="nav-map"]').getAttribute('aria-expanded') === 'true' &&
        document.querySelector('[data-docs-nav] a[aria-current="page"]').getAttribute('href') === '/docs/native-map';
    `));
    const filter = async (value) => session.evaluate(`
      const input = document.querySelector('[aria-label="Filter documentation topics"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
    `);
    await filter("vehicles");
    check("filter finds the whole vehicle theme", await session.evaluate(`
      return document.querySelectorAll('[data-docs-topic]').length === 1 &&
        document.querySelectorAll('#nav-vehicles a').length === 7 &&
        document.querySelector('[data-docs-results]').textContent === '7 pages found';
    `));
    await filter("nothingmatcheszz");
    check("filter has an explicit empty state", await session.evaluate(`return !!document.querySelector('[data-docs-empty]');`));
    await session.evaluate(`document.querySelector('[aria-label="Clear topic filter"]').click(); await new Promise(r => setTimeout(r, 100));`);
    check("clearing filter restores topics and input focus", await session.evaluate(`
      return document.querySelectorAll('[data-docs-topic]').length === 21 &&
        document.activeElement.getAttribute('aria-label') === 'Filter documentation topics';
    `));
    reportConsole("desktop topic navigation");
    await screenshot("docs-navigation-dark");
    await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await visit("/docs/native-map");
    await session.evaluate(`document.querySelector('[aria-controls=docs-guide-navigation]').click(); await new Promise(r => setTimeout(r, 100));`);
    check("mobile navigation opens and fits viewport", await session.evaluate(`
      return document.querySelector('[aria-controls=docs-guide-navigation]').getAttribute('aria-expanded') === 'true' &&
        document.documentElement.scrollWidth <= innerWidth;
    `));
    await filter("NPC");
    check("mobile filter finds NPCs and player models", await session.evaluate(`
      return document.querySelectorAll('#nav-characters a').length === 5 &&
        document.querySelectorAll('[data-docs-topic]').length === 1;
    `));
    await screenshot("docs-navigation-mobile");
    await session.evaluate(`document.querySelector('#nav-characters a[href="/docs/npcs"]').click();`);
    for (let i = 0; i < 50; i++) {
      if (await session.evaluate(`return location.pathname === '/docs/npcs' && document.querySelector('[aria-controls=docs-guide-navigation]')?.getAttribute('aria-expanded') === 'false';`)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    check("mobile guide navigation closes drawer and clears filter", await session.evaluate(`
      return location.pathname === '/docs/npcs' &&
        document.querySelector('[aria-controls=docs-guide-navigation]').getAttribute('aria-expanded') === 'false' &&
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
        const detail = document.querySelector('[data-api-detail]');
        return { name: detail?.querySelector('h2')?.textContent,
          count: document.querySelectorAll('[data-api-row]').length,
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
      return document.querySelector('[data-npc-catalogue] [role="alert"]')?.textContent.includes('Retry download');
    `));
    await session.send("Network.setBlockedURLs", { urls: [] });
    await session.evaluate(`document.querySelector('[data-npc-catalogue] [role="alert"] button').click();`);
    for (let i = 0; i < 60; i++) {
      if (await session.evaluate(`return document.querySelectorAll('[data-npc-list] > li').length === 40;`)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    check("NPC retry loads 40 of 6582 records", await session.evaluate(`
      return document.querySelectorAll('[data-npc-list] > li').length === 40 && document.querySelector('[data-npc-results]').textContent.includes('6,582');
    `));
    messages = []; // The intentionally blocked fetch above is expected.
    const pageChanged = await session.evaluate(`
      const first = document.querySelector('[data-npc-list] > li code').textContent;
      document.querySelector('nav[aria-label="NPC catalogue pages"] > :last-child').click();
      await new Promise(r => setTimeout(r, 100));
      return first !== document.querySelector('[data-npc-list] > li code').textContent;
    `);
    check("NPC pagination changes records", pageChanged);
    const search = async (value) => session.evaluate(`
      const input = document.querySelector('[data-npc-catalogue] input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      return document.querySelectorAll('[data-npc-list] > li').length;
    `);
    check("NPC search finds exact spawn example", await search("Character.cpz_maelstrom_grunt1_ranged1_lexington_wa") === 1);
    await session.send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }, false);
    check("NPC copy uses exact Character ID", await session.evaluate(`
      document.querySelector('[data-npc-list] > li button').click();
      await new Promise(r => setTimeout(r, 150));
      return await navigator.clipboard.readText() === 'Character.cpz_maelstrom_grunt1_ranged1_lexington_wa';
    `));
    await session.evaluate(`document.querySelector('[data-npc-catalogue] summary').click();`);
    check("NPC details expose template and appearance", await session.evaluate(`return document.querySelector('[data-npc-catalogue] details[open] dd').textContent.includes('.ent');`));
    for (const width of [1440, 900, 390]) {
      await session.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      for (const theme of ['dark']) {
        await session.evaluate(`
          document.querySelector('[data-npc-catalogue]').scrollIntoView({ behavior: 'instant', block: 'start' });
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
    await session.evaluate(`document.querySelector('[data-npc-empty] button').click(); await new Promise(r => setTimeout(r, 100));`);
    check("NPC reset restores catalogue", await session.evaluate(`return document.querySelectorAll('[data-npc-list] > li').length === 40;`));
    check("NPC classification filter works", await session.evaluate(`
      const select = document.querySelectorAll('[data-npc-catalogue] select')[1];
      select.value = 'candidate'; select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      return [...document.querySelectorAll('[data-npc-catalogue] [data-risk]')].every(el => el.dataset.risk === 'candidate') && document.querySelectorAll('[data-npc-list] > li').length === 40;
    `));
    reportConsole("NPC interactions");
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
    "/ site header rendered",
    await session.evaluate(
      "return !!document.querySelector('header nav[aria-label=Main]') && document.querySelectorAll('header nav[aria-label=Main] a').length === 8;",
    ),
    "the main navigation is missing from the site header",
  );

  /* ------------------------------------------------------------- servers --- */

  await visit("/servers");
  reportConsole("/servers");

  // The directory is fetched client-side from the master, so rows arrive after
  // hydration and their number is whatever the directory holds right now.
  const waitRows = `
    for (let i = 0; i < 150 && !document.querySelector('[data-server-id]'); i++) await new Promise(r => setTimeout(r, 100));
    return document.querySelectorAll('[data-server-id]').length;
  `;
  const rows = await session.evaluate(waitRows);
  check("/servers rows hydrated", rows > 1, `saw ${rows} rows`);

  // Search narrows the list.
  const searched = await session.evaluate(`
    // By label first: the header's quick navigation also holds a search field, earlier in the document.
    const input = document.querySelector('input[aria-label="Search servers"]') ?? document.querySelector('main input[type="search"]');
    if (!input) return { error: 'no search input' };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    // A word from a real listing, so the query matches whatever the directory holds.
    const term = [...document.querySelectorAll('[data-server-name]')].map(n => n.textContent.trim())
      .flatMap(n => n.split(/\s+/)).find(w => w.length > 4 && /^[a-z]+$/i.test(w)) ?? 'open';
    setter.call(input, term);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const names = [...document.querySelectorAll('[data-server-name]')].map(n => n.textContent.trim());
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return { names, restored: document.querySelectorAll('[data-server-id]').length };
  `);
  check(
    "/servers search filters",
    !searched.error && searched.names.length > 0 && searched.names.length < rows,
    searched.error ?? `matched ${searched.names?.length} rows: ${searched.names?.join(", ")}`,
  );
  check(
    "/servers search clears",
    searched.restored === rows,
    `after clearing saw ${searched.restored} rows`,
  );

  // Mode chips filter, which is the state that used to be set inside an effect.
  const chipped = await session.evaluate(`
    const chips = [...document.querySelectorAll('[data-mode-chips] button')];
    const target = chips.find(c => (c.querySelector('span')?.textContent ?? c.textContent).trim() === 'Roleplay');
    if (!target) return { error: 'no Roleplay chip', chips: chips.map(c => (c.querySelector('span')?.textContent ?? c.textContent).trim()) };
    target.click();
    await new Promise(r => setTimeout(r, 300));
    return {
      pressed: target.getAttribute('aria-pressed'),
      rows: document.querySelectorAll('[data-server-id]').length,
    };
  `);
  check(
    "/servers mode chip filters",
    !chipped.error && chipped.pressed === "true" && chipped.rows < rows && chipped.rows > 0,
    chipped.error
      ? `${chipped.error} (chips: ${chipped.chips?.join(", ")})`
      : `pressed=${chipped.pressed}, rows=${chipped.rows}`,
  );

  // Favourites: the store starts empty to match the server, then persists.
  const favourited = await session.evaluate(`
    const button = document.querySelector('[data-favorite], [aria-label*="avourite"], [aria-label*="avorite"]');
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
    const active = [...document.querySelectorAll('[data-mode-chips] button')]
      .filter(c => c.getAttribute('aria-pressed') === 'true')
      .map(c => (c.querySelector('span')?.textContent ?? c.textContent).trim());
    for (let i = 0; i < 150 && !document.querySelector('[data-server-id], [data-list-view] [data-empty]'); i++) await new Promise(r => setTimeout(r, 100));
    return { active, rows: document.querySelectorAll('[data-server-id]').length };
  `);
  check(
    "?mode= deep link applies",
    deepLinked.active.length === 1 && deepLinked.active[0] === "Roleplay",
    `active chips: ${deepLinked.active.join(", ") || "none"}`,
  );
  check(
    "?mode= deep link narrows the list",
    deepLinked.rows > 0 && deepLinked.rows < rows,
    `${deepLinked.rows} rows visible`,
  );

  // The home-page racing card deep-links this mode specifically.
  await visit("/servers?mode=Racing");
  reportConsole("/servers?mode=Racing");
  const racingLinked = await session.evaluate(`
    const active = [...document.querySelectorAll('[data-mode-chips] button')]
      .filter(c => c.getAttribute('aria-pressed') === 'true')
      .map(c => (c.querySelector('span')?.textContent ?? c.textContent).trim());
    for (let i = 0; i < 150 && !document.querySelector('[data-server-id], [data-list-view] [data-empty]'); i++) await new Promise(r => setTimeout(r, 100));
    const names = [...document.querySelectorAll('[data-server-name]')].map(n => n.textContent.trim());
    const modes = [...document.querySelectorAll('[data-server-id]')].map(r => r.getAttribute('data-mode'));
    return { active, names, modes, rows: document.querySelectorAll('[data-server-id]').length };
  `);
  check(
    "?mode=Racing deep link applies",
    racingLinked.active.length === 1 && racingLinked.active[0] === "Racing",
    `active chips: ${racingLinked.active.join(", ") || "none"}`,
  );
  check(
    "?mode=Racing deep link narrows the list",
    racingLinked.rows < rows && racingLinked.modes.every((mode) => mode === null || mode === "Racing"),
    `${racingLinked.rows} rows: ${racingLinked.names.join(", ")}`,
  );

  }

  /* Documentation: run independently with --docs during local development. */
  await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await visit("/docs");
  reportConsole("/docs");
  check("docs keep the site header; the landing carries the topic directory", await session.evaluate(`
    return !!document.querySelector('body > header nav[aria-label="Main"]') &&
      document.querySelectorAll('[data-docs-directory]').length === 4 && !document.querySelector('.docs-header, .docs-site');
  `));
  if (process.argv.includes("--docs")) {
    await fs.mkdir(".shots", { recursive: true });
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/docs-home.png", Buffer.from(data, "base64"));
  }
  await visit("/docs/vehicles");
  const sticky = await session.evaluate(`
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 1600);
    await new Promise(r => setTimeout(r, 200));
    const header = document.querySelector('body > header').getBoundingClientRect();
    const nav = document.querySelector('[data-docs-nav]').getBoundingClientRect();
    return { y: scrollY, header: header.bottom, nav: nav.top };
  `);
  check("sidebar sticks right under the site header", sticky.y > 0 && Math.abs(sticky.nav - sticky.header) < 2, JSON.stringify(sticky));
  await session.evaluate("window.scrollTo(0, 0);");
  const docsSearch = await session.evaluate(`
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const input = document.querySelector('[aria-label="Search documentation and API"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'vehicles');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const found = [...document.querySelectorAll('#docs-search-results a')].map(a => a.textContent);
    document.querySelector('dialog[open]')?.close();
    return found;
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
      return !!document.querySelector('[data-docs-meta] a[href="/docs/api/server/open77-cyberware"]') &&
        !!document.querySelector('[data-docs-meta] a[href="/docs/api/client/open77-cyberware"]');
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
      const detail = document.querySelector('[data-api-detail]');
      const rows = [...document.querySelectorAll('[data-api-row]')];
      return detail.querySelector('h2').textContent === '${method}' &&
        detail.querySelector('[data-api-runtime]').textContent === '${runtime}' &&
        detail.textContent.includes('${expected}') &&
        !!detail.querySelector('a[href="/docs/gorilla-arms"]') && rows.length > 0 &&
        rows.every(row => row.textContent.includes('Open77.cyberware.'));
    `));
  }

  for (const [slug, namespace] of [["attachments", "open77-props"], ["player-interactions", "open77-playerinteractions"]]) {
    await visit(`/docs/${slug}`);
    reportConsole(`${slug} guide`);
    check(`${slug} tutorial exposes both runtime references`, await session.evaluate(`
      return !!document.querySelector('[data-docs-meta] a[href="/docs/api/client/${namespace}"]') &&
        !!document.querySelector('[data-docs-meta] a[href="/docs/api/server/${namespace}"]') &&
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
      const detail = document.querySelector('[data-api-detail]');
      return detail.querySelector('h2').textContent === '${method}' &&
        detail.querySelector('[data-api-runtime]').textContent === '${runtime}' &&
        document.querySelectorAll('[data-api-row]').length === ${count} &&
        detail.textContent.includes('${expected}') &&
        !!detail.querySelector('a[href="/docs/player-interactions#${runtime}-api"]');
    `));
  }
  for (const runtime of ["client", "server"]) {
    await visit(`/docs/api?side=${runtime}&category=world&namespace=Open77.props#${runtime}/open77-props/attach`);
    reportConsole(`attachments ${runtime} API`);
    check(`attachments ${runtime} has the correct runtime and guide`, await session.evaluate(`
      const detail = document.querySelector('[data-api-detail]');
      return detail.querySelector('h2').textContent === 'attach' &&
        detail.querySelector('[data-api-runtime]').textContent === '${runtime}' &&
        !!detail.querySelector('a[href^="/docs/attachments#${runtime}"]');
    `));
  }

  await visit("/docs/rp-animations");
  reportConsole("RP animation guide");
  check("RP tutorial links to both runtime references and the catalogue", await session.evaluate(`
    return !!document.getElementById('quick-start-your-first-client-action') &&
      !!document.querySelector('a[href="/docs/api/client/open77-animations"]') &&
      !!document.querySelector('a[href="/docs/api/server/open77-animations"]') &&
      !!document.querySelector('[data-docs-prose] a[href="/docs/rp-animation-catalogue"]');
  `));
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/rp-animation-guide.png", Buffer.from(data, "base64"));
  }
  for (const [runtime, method, count, expected] of [
    ["client", "request", namespaceCount("client", "Open77.animations"), "Open77.Promise"],
    ["server", "play", namespaceCount("server", "Open77.animations"), "players.animations.control"],
  ]) {
    await visit(`/docs/api?side=${runtime}&category=players&namespace=Open77.animations#${runtime}/open77-animations/${method}`);
    reportConsole(`RP ${runtime} API`);
    const animation = await session.evaluate(`
      const detail = document.querySelector('[data-api-detail]');
      return {
        title: detail.querySelector('h2').textContent,
        runtime: detail.querySelector('[data-api-runtime]').textContent,
        count: document.querySelectorAll('[data-api-row]').length,
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
      return !document.getElementById('nav-vehicles').hidden &&
        !!document.querySelector('#nav-vehicles a[aria-current="page"]') &&
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
    const detail = document.querySelector('[data-api-detail]');
    return detail.querySelector('h2').textContent === 'getWeaponAmmo' &&
      detail.querySelector('[data-api-runtime]').textContent === 'client' &&
      detail.textContent.includes('not_replicated') && detail.textContent.includes('weapon') &&
      detail.querySelector('a[href="/docs/vehicle-weapons#function-reference"]')?.textContent.includes('Armed vehicle guide') &&
      !detail.textContent.includes('RP animation guide');
  `));

  await visit("/docs/server-exports");
  reportConsole("server export guide");
  check("server export tutorial links back to the API", await session.evaluate(`
    return !!document.getElementById('publish-a-service') &&
      !!document.querySelector('[data-docs-prose] a[href="/docs/server-api#cross-resource-exports"]');
  `));
  await visit("/docs/api?side=server&namespace=Open77.exports#server/open77-exports/call");
  reportConsole("server export reference");
  check("export explorer separates the server runtime", await session.evaluate(`
    return document.querySelector('[data-api-detail] h2').textContent === 'call' &&
      document.querySelector('[data-api-detail] [data-api-runtime]').textContent === 'server' &&
      document.querySelectorAll('[data-api-row]').length === ${namespaceCount("server", "Open77.exports")} &&
      document.querySelector('[data-api-detail]').textContent.includes('Promise');
  `));
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/server-export-api.png", Buffer.from(data, "base64"));
  }

  await visit("/docs/doors");
  reportConsole("networked door guide");
  check("door guide explains installation, authority and native landing doors", await session.evaluate(`
    const prose = document.querySelector('[data-docs-prose]');
    return prose.textContent.includes('open77_doors >=1.0.0') &&
      prose.textContent.includes('doorsClosed') && prose.textContent.includes('pending:await()') &&
      !!document.querySelector('main a[href="/docs/doors"]');
  `));
  for (const theme of ["dark"]) {
    await session.evaluate(`
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
      const detail = document.querySelector('[data-api-detail]');
      return document.querySelectorAll('[data-api-row]').length === ${count} &&
        detail.querySelector('[data-api-runtime]').textContent === '${runtime}' &&
        detail.querySelector('[data-api-signature]').textContent.includes('Open77.exports.call("open77_doors"') &&
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
  await session.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await visit("/docs/api");
  reportConsole("/docs/api");
  const total = await session.evaluate("return document.querySelectorAll('[data-api-row]').length;");
  check("API includes native cards and the server guide", total > 600, String(total));
  const serverOnly = await session.evaluate(`
    document.querySelectorAll('[data-api-runtime-filter] button')[1].click();
    await new Promise(r => setTimeout(r, 150));
    return { count: document.querySelectorAll('[data-api-row]').length,
      sides: [...document.querySelectorAll('[data-api-row] [data-api-runtime]')].map(n => n.textContent) };
  `);
  check("server filter shows only server functions", serverOnly.count > 200 && serverOnly.sides.every(side => side === 'server'), JSON.stringify({ count: serverOnly.count }));
  const category = await session.evaluate(`
    const select = document.querySelector('[aria-label="API category"]');
    select.value = 'players';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const target = [...document.querySelectorAll('[data-api-row]')].find(a => a.textContent.includes('Open77.players.disconnect'));
    target?.click();
    await new Promise(r => setTimeout(r, 150));
    return { hash: location.hash, title: document.querySelector('[data-api-detail] h2').textContent,
      source: document.querySelector('[data-api-source]').textContent, groups: document.querySelectorAll('[data-api-group]').length };
  `);
  const disconnectSource = apiCards.find(entry => entry.namespace === "Open77.players" && entry.name === "disconnect" && entry.runtime === "server").source;
  check("category filter selects a documented server function", category.title === "disconnect" && category.groups === 1 && category.source.includes(disconnectSource), JSON.stringify(category));
  await visit("/docs/api?side=server&category=players#server/open77-players/disconnect");
  check("filters and selection survive a direct visit", await session.evaluate(`
    return document.querySelector('[data-api-detail] h2').textContent === 'disconnect' &&
      document.querySelector('[aria-label="API category"]').value === 'players';
  `));
  const back = await session.evaluate(`
    const target = [...document.querySelectorAll('[data-api-row]')].find(a => a.textContent.includes('Open77.players.ban('));
    target.click();
    await new Promise(r => setTimeout(r, 150));
    const changed = document.querySelector('[data-api-detail] h2').textContent;
    history.back();
    await new Promise(r => setTimeout(r, 300));
    return { changed, restored: document.querySelector('[data-api-detail] h2').textContent };
  `);
  check("browser Back restores the selected function", back.changed === "ban" && back.restored === "disconnect", JSON.stringify(back));
  const empty = await session.evaluate(`
    const input = document.querySelector('[aria-label="Search API functions"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'no_such_function_97531');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const absent = !!document.querySelector('[data-api-empty]');
    document.querySelector('[data-api-empty] button').click();
    await new Promise(r => setTimeout(r, 150));
    return { absent, restored: document.querySelectorAll('[data-api-row]').length };
  `);
  check("empty search can reset all filters", empty.absent && empty.restored === total, JSON.stringify(empty));
  await visit("/docs/api#server/open77-vehicles/create");
  check("generated vehicle deep links select server version", await session.evaluate(`
    return document.querySelector('[data-api-detail] h2').textContent === 'create' &&
      document.querySelector('[data-api-detail] [data-api-runtime]').textContent === 'server';
  `));
  await session.send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }, false);
  const copied = await session.evaluate(`
    document.querySelector('[data-api-links] button').click();
    await new Promise(r => setTimeout(r, 200));
    return await navigator.clipboard.readText();
  `);
  check("copy link retains runtime and function", copied.endsWith("/docs/api#server/open77-vehicles/create"), copied);
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/api-dark.png", Buffer.from(data, "base64"));
  }
  reportConsole("API interactions");
  await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await visit("/docs/api#server/open77-vehicles/create");
  check("mobile deep link opens function details", await session.evaluate(`
    return getComputedStyle(document.querySelector('[data-api-detail]')).display !== 'none' &&
      document.documentElement.scrollWidth <= innerWidth;
  `));
  await session.evaluate("document.querySelectorAll('[data-api-switch] button')[0].click();");
  check("mobile can switch back to functions", await session.evaluate("return getComputedStyle(document.querySelector('[data-api-list]')).display !== 'none';"));
  await visit("/docs/rp-animations");
  check("RP tutorial fits a mobile viewport", await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
  reportConsole("mobile RP guide");
  await visit("/docs/server-exports");
  check("server export tutorial fits a mobile viewport", await session.evaluate("return document.documentElement.scrollWidth <= innerWidth;"));
  reportConsole("mobile server export guide");
  for (const route of ["/docs/vehicle-weapons", "/docs/armed-vehicles"]) {
    await visit(route);
    check(`${route} fits mobile in dark mode`, await session.evaluate(`
      return document.documentElement.scrollWidth <= innerWidth;
    `));
    reportConsole(`mobile ${route}`);
    if (process.argv.includes("--docs")) {
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await fs.writeFile(`.shots/${route.split("/").at(-1)}-mobile.png`, Buffer.from(data, "base64"));
    }
  }
  await visit("/docs/api?side=client&namespace=Open77.animations#client/open77-animations/request");
  check("mobile RP deep link opens client request", await session.evaluate(`
    return document.querySelector('[data-api-detail] h2').textContent === 'request' &&
      getComputedStyle(document.querySelector('[data-api-detail]')).display !== 'none' &&
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
    document.querySelector('[aria-controls=docs-guide-navigation]').click();
    await new Promise(r => setTimeout(r, 150));
    return getComputedStyle(document.querySelector('#docs-guide-navigation')).display !== 'none';
  `);
  check("mobile guide navigation opens", mobile);
  await session.evaluate("document.querySelector('[aria-controls=docs-guide-navigation]').click();");
  if (process.argv.includes("--docs")) {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(".shots/docs-mobile-dark.png", Buffer.from(data, "base64"));
  }
  reportConsole("mobile docs");
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
    const toggle = document.querySelector('button[aria-controls=site-menu]');
    const nav = document.querySelector('#site-menu');
    if (!toggle || !nav) return { error: 'no mobile nav' };
    toggle.click();
    await new Promise(r => setTimeout(r, 250));
    const opened = { hidden: nav.hasAttribute('hidden'), body: document.documentElement.style.overflow === 'hidden' };
    // Navigating with the menu open is what the render-time reset exists for.
    nav.querySelector('a[href="/create"]').click();
    await new Promise(r => setTimeout(r, 900));
    return {
      opened,
      afterNav: {
        path: location.pathname,
        hidden: document.querySelector('#site-menu').hasAttribute('hidden'),
        body: document.documentElement.style.overflow === 'hidden',
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
