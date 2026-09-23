import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SERVICES, probe } from "./probes.mjs";
import { openStore, prune, record, snapshot, validateMaintenance } from "./store.mjs";

const directory = resolve(process.env.OP77_STATUS_DATA_DIR ?? "./artifacts/status-monitor");
const output = resolve(process.env.OP77_STATUS_OUTPUT ?? `${directory}/public/v1.json`);
await mkdir(directory, { recursive: true });
await mkdir(dirname(output), { recursive: true });
const db = openStore(`${directory}/history.sqlite`);
let stopping = false;
let timer;
let maintenance = [];
let lastPrunedDay = null;
const stop = () => { stopping = true; clearTimeout(timer); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function tick() {
  const started = Date.now();
  try {
    // Fixed fan-out, 12 seconds for each entire check; never overlap collection cycles.
    await Promise.all(SERVICES.map(async (service) => {
      const result = await probe(service);
      record(db, service.id, result, started);
      if (result.state !== "operational") console.warn(JSON.stringify({ service: service.id, ...result }));
    }));
    const maintenancePath = process.env.OP77_STATUS_MAINTENANCE;
    if (maintenancePath) {
      try { maintenance = validateMaintenance(JSON.parse(await readFile(maintenancePath, "utf8"))); }
      catch { console.error("Invalid maintenance file; retaining last valid notices"); }
    }
    const day = new Date().toISOString().slice(0, 10);
    if (lastPrunedDay !== day) { prune(db); lastPrunedDay = day; }
    const data = snapshot(db, { maintenance, region: process.env.OP77_STATUS_REGION ?? "Single operator probe" });
    // Write beside destination, then rename: visitors never read a half-written snapshot.
    await writeFile(`${output}.tmp`, JSON.stringify(data), { mode: 0o644 });
    await rename(`${output}.tmp`, output);
    process.stdout.write(JSON.stringify({ event: "status_snapshot", at: data.generatedAt, services: data.services.length }) + "\n");
  } catch (error) {
    // Do not replace the last good feed with a fabricated green snapshot.
    console.error("Status collection failed:", error.code ?? error.name);
  }
  if (stopping || process.argv.includes("--once")) { db.close(); return; }
  timer = setTimeout(tick, Math.max(1000, 60000 - (Date.now() - started)));
}
await tick();
