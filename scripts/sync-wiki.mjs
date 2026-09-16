/**
 * Vendors the Open77 wiki into this repository.
 *
 * The documentation is authored in the platform repository (`open77-base`,
 * under `wiki/`) because it has to stay next to the code it documents. This
 * website is a separate repository deployed on its own, so the content is
 * copied in and committed: the build then needs no access to the platform
 * checkout, and every documentation change arrives as a reviewable diff.
 *
 * The script writes `content/docs/_manifest.json` recording the origin, byte
 * size and SHA-256 of every file it copied. `--check` re-runs the comparison
 * without writing, which is what CI should call to detect drift.
 *
 * Usage:
 *   node scripts/sync-wiki.mjs [--from ../base/wiki] [--check]
 */

import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

import { APP_OWNED_GUIDES, EXCLUDED_GUIDES, isAppOwned, isExcluded } from "./wiki-exclusions.mjs";
import { buildNpcCatalogue } from "./npc-catalogue.mjs";

const DEFAULT_SOURCE = process.env.OPEN77_WIKI_SOURCE ?? ["CyberM", "open77-base", "base"]
  .map((directory) => path.join("..", directory, "wiki"))
  .find((directory) => existsSync(directory)) ?? path.join("..", "base", "wiki");
const DOCS_OUT = path.join("content", "docs");
const API_OUT = path.join("content", "api");
const VEHICLE_CATALOGUE_SOURCE = "server/src/Open77.Server.Core/Vehicles/vehicle-weapons-2.31.json";
const VEHICLE_CATALOGUE_OUT = "public/data/vehicle-weapons-2.31.json";


function parseArgs(argv) {
  const args = { from: DEFAULT_SOURCE, check: false, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--from") args.from = argv[++i] ?? args.from;
    else if (argv[i] === "--check") args.check = true;
    else if (argv[i] === "--only") {
      if (args.only !== null) throw new Error("--only may be specified once");
      args.only = argv[++i];
      if (!args.only || !/^[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(args.only) || isExcluded(args.only))
        throw new Error("--only requires one non-excluded wiki Markdown filename, without directories");
    }
  }
  return args;
}

/** Refresh one base-owned guide without claiming to refresh the rest of a newer
 * vendored snapshot. Full sync deliberately retains its strict source contract. */
async function syncSelected(args, sourceDir) {
  const selected = args.only;
  const sourceFile = path.join(sourceDir, selected);
  const markdown = (await readFile(sourceFile, "utf8")).replace(/\r\n/g, "\n");
  const target = `${DOCS_OUT}/${selected}`.replace(/\\/g, "/");
  const manifestPath = path.join(DOCS_OUT, "_manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.files)) throw new Error("Scoped sync requires an existing manifest");
  const slug = selected === "README.md" ? "index" : selected.replace(/\.md$/, "");
  const previous = manifest.files.filter((record) => record.target === target);
  if (previous.length > 1) throw new Error("Duplicate selected manifest record");
  if (existsSync(path.join("content", "guides", selected))) throw new Error("Selected guide collides with authored content");
  const digest = sha256(markdown);
  const revision = execFileSync("git", ["-C", sourceDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Source revision is unavailable");
  execFileSync("git", ["-C", sourceDir, "ls-files", "--error-unmatch", "--", selected], { encoding: "utf8" });
  const sourceStatus = execFileSync("git", ["-C", sourceDir, "status", "--porcelain", "--", selected], { encoding: "utf8" }).trim();
  if (sourceStatus) throw new Error("Commit the selected wiki source before recording its provenance");
  if (args.check) {
    const current = existsSync(target) ? await readFile(target, "utf8") : null;
    const record = previous[0];
    if (current !== markdown || !record || record.sha256 !== digest || record.bytes !== Buffer.byteLength(markdown, "utf8") ||
        record.source !== `wiki/${selected}` || !/^[a-f0-9]{40}$/.test(record.sourceRevision ?? "") || !record.sourceSyncedAt)
      throw new Error(`Selected guide or provenance differs: ${target}`);
    console.log(`up to date: selected guide ${selected}; unrelated source drift was not checked`);
    return;
  }
  const record = { source: `wiki/${selected}`, target, slug, title: extractTitle(markdown, slug),
    bytes: Buffer.byteLength(markdown, "utf8"), sha256: digest, sourceRevision: revision, sourceSyncedAt: new Date().toISOString() };
  manifest.files = previous.length ? manifest.files.map((entry) => entry.target === target ? record : entry) : [...manifest.files, record];
  manifest.guides = manifest.files.filter((entry) => "slug" in entry).length;
  // Preserve the full-snapshot timestamp and all unselected record metadata.
  await writeFile(target, markdown, "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`synced selected guide ${selected} from ${revision}; unrelated files preserved`);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** First `# ` heading, which the wiki uses as the canonical page title. */
function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

async function collectMarkdown(sourceDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (isExcluded(entry.name)) continue;
    files.push(entry.name);
  }
  return files.sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = path.resolve(args.from);

  if (args.only) return syncSelected(args, sourceDir);

  if (!existsSync(sourceDir)) {
    // The vendored content is committed precisely so a build needs no platform
    // checkout, so its absence is a normal deployment state rather than an
    // error. Drift cannot be judged without the reference: skip instead of
    // failing, so `--check` is safe to wire into a general verification gate.
    if (args.check) {
      console.log(
        `sync-wiki: no wiki source at ${sourceDir} — skipping the drift check.\n` +
          "  Pass --from <path-to-open77-base/wiki> to check against a checkout elsewhere.",
      );
      return;
    }
    throw new Error(
      `wiki source not found at ${sourceDir}\n` +
        "Pass --from <path-to-open77-base/wiki> if the platform checkout lives elsewhere.",
    );
  }

  const markdownFiles = await collectMarkdown(sourceDir);
  if (markdownFiles.length === 0) {
    throw new Error(`no markdown guides found in ${sourceDir}`);
  }

  const apiSource = path.join(sourceDir, "data", "api.json");
  if (!existsSync(apiSource)) {
    throw new Error(
      `API reference data not found at ${apiSource}\n` +
        "Run `python wiki/tools/extract-api.py --json` in the platform repository first.",
    );
  }

  const records = [];
  const writes = [];

  // A site-owned guide keeps the record it already has: this sync never reads
  // or writes its file, so it has no bytes or digest of its own to compute.
  const manifestPath = path.join(DOCS_OUT, "_manifest.json");
  const previousManifest = existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, "utf8"))
    : null;

  for (const name of markdownFiles) {
    // A guide the site maintains itself keeps its manifest record -- it is
    // still published and still counted -- but is never written or compared:
    // its site copy differing from the wiki is the point, not drift.
    if (isAppOwned(name)) {
      const target = `${DOCS_OUT}/${name}`.split(path.sep).join("/");
      const existing = previousManifest?.files?.find((record) => record.target === target);
      if (existing) records.push(existing);
      continue;
    }
    const text = await readFile(path.join(sourceDir, name), "utf8");
    const normalised = text.replace(/\r\n/g, "\n");
    const slug = name === "README.md" ? "index" : name.replace(/\.md$/, "");
    records.push({
      source: `wiki/${name}`,
      target: `${DOCS_OUT}/${name}`.replace(/\\/g, "/"),
      slug,
      title: extractTitle(normalised, slug),
      bytes: Buffer.byteLength(normalised, "utf8"),
      sha256: sha256(normalised),
    });
    writes.push({ file: path.join(DOCS_OUT, name), text: normalised });
  }

  const apiText = (await readFile(apiSource, "utf8")).replace(/\r\n/g, "\n");
  const apiEntries = JSON.parse(apiText);
  if (!Array.isArray(apiEntries)) {
    throw new Error("api.json is expected to be an array of API entries");
  }
  records.push({
    source: "wiki/data/api.json",
    target: `${API_OUT}/api.json`.replace(/\\/g, "/"),
    entries: apiEntries.length,
    bytes: Buffer.byteLength(apiText, "utf8"),
    sha256: sha256(apiText),
  });
  writes.push({ file: path.join(API_OUT, "api.json"), text: apiText });

  // Resource exports are not native namespace bindings. Keep their reviewed
  // contracts separate, but vendor them so deployments need no base checkout.
  const doorsText = (await readFile(path.join(sourceDir, "door-service-api.json"), "utf8"))
    .replace(/\r\n/g, "\n");
  const doorExports = JSON.parse(doorsText);
  if (!Array.isArray(doorExports) || doorExports.length === 0) {
    throw new Error("door-service-api.json must contain resource export contracts");
  }
  records.push({
    source: "wiki/door-service-api.json", target: `${API_OUT}/door-service-api.json`,
    entries: doorExports.length, bytes: Buffer.byteLength(doorsText, "utf8"), sha256: sha256(doorsText),
  });
  writes.push({ file: path.join(API_OUT, "door-service-api.json"), text: doorsText });

  // Published alongside its guide: exact typed TweakDB extraction, not a
  // hand-maintained list or a claim that every appearance has been tested.
  const catalogueText = (await readFile(path.resolve(sourceDir, "..", VEHICLE_CATALOGUE_SOURCE), "utf8"))
    .replace(/\r\n/g, "\n");
  const catalogue = JSON.parse(catalogueText);
  if (!Number.isInteger(catalogue.gameBuild) || !Array.isArray(catalogue.mounts)
      || !catalogue.vehicles || Array.isArray(catalogue.vehicles)) {
    throw new Error("invalid vehicle-weapon catalogue shape");
  }
  records.push({
    source: VEHICLE_CATALOGUE_SOURCE,
    target: VEHICLE_CATALOGUE_OUT,
    gameBuild: catalogue.gameBuild,
    vehicleRecords: Object.keys(catalogue.vehicles).length,
    mountDefinitions: catalogue.mounts.length,
    bytes: Buffer.byteLength(catalogueText, "utf8"),
    sha256: sha256(catalogueText),
  });
  writes.push({ file: VEHICLE_CATALOGUE_OUT, text: catalogueText });

  const npcSource = "docs/generated/npc-records-2.31.csv";
  const npcCsv = await readFile(path.resolve(sourceDir, "..", npcSource), "utf8");
  const npcs = buildNpcCatalogue(npcCsv);
  for (const [target, text] of [
    ["public/data/npc-records-2.31.csv", npcCsv],
    ["public/data/npc-records-2.31.json", `${JSON.stringify(npcs)}\n`],
  ]) {
    records.push({ source: npcSource, target, records: target.endsWith(".csv") ? npcs.sourceCount : npcs.count, bytes: Buffer.byteLength(text), sha256: sha256(text) });
    writes.push({ file: target, text });
  }

  const manifest = {
    $comment:
      "Generated by scripts/sync-wiki.mjs. Do not edit by hand — edit the wiki in " +
      "the open77-base repository and re-run `npm run sync:wiki`. Vehicle and NPC catalogues come from the platform's extracted TweakDB data.",
    source: "https://github.com/Open2077/open77-base",
    sourcePath: "wiki",
    syncedAt: new Date().toISOString(),
    guides: records.filter((record) => "slug" in record).length,
    apiEntries: apiEntries.length,
    files: records,
  };

  if (args.check) {
    let drift = 0;
    for (const write of writes) {
      const current = existsSync(write.file) ? await readFile(write.file, "utf8") : null;
      if (current !== write.text) {
        drift += 1;
        console.error(`out of date: ${write.file.replace(/\\/g, "/")}`);
      }
    }
    if (drift > 0) {
      throw new Error(`${drift} vendored file(s) differ from the wiki — run \`npm run sync:wiki\``);
    }
    console.log(`up to date: ${manifest.guides} guides, ${manifest.apiEntries} API entries`);
    for (const [name, owner] of APP_OWNED_GUIDES) {
      console.log(`  site-owned, not compared: ${name} — ${owner}`);
    }
    return;
  }

  // Drop guides that were removed upstream so deletions propagate. A
  // site-owned guide is kept: it is not written by this sync, but it is also
  // not stale.
  if (existsSync(DOCS_OUT)) {
    const keep = new Set(markdownFiles);
    for (const entry of await readdir(DOCS_OUT, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md") && !keep.has(entry.name)) {
        await rm(path.join(DOCS_OUT, entry.name));
        console.log(`removed stale guide: ${entry.name}`);
      }
    }
  }

  await mkdir(DOCS_OUT, { recursive: true });
  await mkdir(API_OUT, { recursive: true });
  await mkdir(path.dirname(VEHICLE_CATALOGUE_OUT), { recursive: true });
  for (const write of writes) {
    await writeFile(write.file, write.text, "utf8");
  }
  await writeFile(
    path.join(DOCS_OUT, "_manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`synced ${manifest.guides} guides and ${manifest.apiEntries} API entries`);
  for (const [name, reason] of EXCLUDED_GUIDES) {
    console.log(`  held back: ${name} — ${reason}`);
  }
  for (const [name, owner] of APP_OWNED_GUIDES) {
    console.log(`  site-owned, left untouched: ${name} — ${owner}`);
  }
  console.log(`  from ${sourceDir}`);
  const totalKb = (
    records.reduce((sum, record) => sum + record.bytes, 0) / 1024
  ).toFixed(1);
  console.log(`  ${totalKb} KB written to ${DOCS_OUT} and ${API_OUT}`);
}

main().catch((error) => {
  console.error(`sync-wiki: ${error.message}`);
  process.exitCode = 1;
});
