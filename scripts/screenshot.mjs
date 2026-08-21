/**
 * Captures full-page screenshots of the built site.
 *
 * Usage: node scripts/screenshot.mjs [origin] [outDir]
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const outDir = process.argv[3] ?? path.join(os.tmpdir(), "open77-shots");
const DEBUG_PORT = 9334;

const SHOTS = [
  { path: "/", name: "home", width: 1440, height: 1000 },
  { path: "/servers", name: "servers", width: 1440, height: 1100 },
  { path: "/servers/nc-roleplay", name: "server-detail", width: 1440, height: 1000 },
  { path: "/create", name: "create", width: 1440, height: 1000 },
  { path: "/community", name: "community", width: 1440, height: 900 },
  { path: "/brand", name: "brand", width: 1440, height: 1000 },
  { path: "/docs", name: "docs-index", width: 1440, height: 1100 },
  { path: "/docs/vehicles", name: "docs-guide", width: 1440, height: 1100 },
  { path: "/docs/platform", name: "docs-platform", width: 1440, height: 1100 },
  { path: "/docs/api", name: "docs-api", width: 1440, height: 1000 },
  {
    path: "/docs/api/server/cyberm-vehicles",
    name: "docs-api-namespace",
    width: 1440,
    height: 1100,
  },
  { path: "/servers", name: "servers-mobile", width: 420, height: 900, mobile: true },
  { path: "/docs/vehicles", name: "docs-mobile", width: 420, height: 900, mobile: true },
];

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* next */
    }
  }
  throw new Error("No Chrome or Edge binary found.");
}

class Session {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.sessionId = null;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id === undefined) return;
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
  }

  send(method, params = {}, useSession = true) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

function connect(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(new Session(socket)));
    socket.addEventListener("error", () => reject(new Error("cannot connect")));
  });
}

async function waitForDevTools() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome never opened its debugging port.");
}

await fs.mkdir(outDir, { recursive: true });
const chrome = await findChrome();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "open77-shot-"));
const child = spawn(
  chrome,
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const session = await connect(await waitForDevTools());

try {
  const { targetId } = await session.send("Target.createTarget", { url: "about:blank" }, false);
  const attached = await session.send(
    "Target.attachToTarget",
    { targetId, flatten: true },
    false,
  );
  session.sessionId = attached.sessionId;
  await session.send("Page.enable");
  await session.send("Runtime.enable");

  for (const shot of SHOTS) {
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.mobile ? 2 : 1,
      mobile: Boolean(shot.mobile),
    });
    await session.send("Page.navigate", { url: origin + shot.path });
    await new Promise((resolve) => setTimeout(resolve, 1400));
    // Images below the fold are lazy, so scroll through to make them decode and
    // then return to the top. The site sets `scroll-behavior: smooth`, which
    // would leave the capture mid-animation, so it is turned off first.
    await session.send("Runtime.evaluate", {
      expression: `(async () => {
        const style = document.createElement('style');
        style.textContent = 'html { scroll-behavior: auto !important; }';
        document.head.append(style);
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 250));
        return window.scrollY;
      })()`,
      awaitPromise: true,
    });

    const { data } = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const file = path.join(outDir, `${shot.name}.png`);
    await fs.writeFile(file, Buffer.from(data, "base64"));
    console.log(`wrote ${file}`);
  }
} finally {
  child.kill();
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
