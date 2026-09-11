import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("./sync-wiki.mjs", import.meta.url));
test("scoped wiki sync preserves unrelated content, records provenance and rejects drift or unsafe selections", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "open77-wiki-sync-"));
  try {
    const source = path.join(root, "base", "wiki");
    const app = path.join(root, "app");
    await mkdir(source, { recursive: true }); await mkdir(path.join(app, "content", "docs"), { recursive: true });
    await writeFile(path.join(source, "selected.md"), "# Selected guide\n\nReviewed content.\n");
    const git = (...args) => {
      const result = spawnSync("git", ["-C", path.dirname(source), ...args], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
    };
    git("init"); git("add", "wiki/selected.md");
    git("-c", "user.name=Wiki test", "-c", "user.email=wiki-test@example.invalid", "commit", "-m", "Fixture");
    const original = { syncedAt: "2020-01-01T00:00:00Z", guides: 1, apiEntries: 42,
      files: [{ source: "wiki/other.md", target: "content/docs/other.md", slug: "other", sha256: "old-record", bytes: 7 }] };
    const manifest = path.join(app, "content", "docs", "_manifest.json");
    await writeFile(manifest, JSON.stringify(original));
    await writeFile(path.join(app, "content", "docs", "other.md"), "keep me");
    const run = (...args) => spawnSync(process.execPath, [script, "--from", source, ...args], { cwd: app, encoding: "utf8" });
    for (const selected of ["../outside.md", "folder/selected.md", "missing.md"]) {
      assert.notEqual(run("--only", selected).status, 0);
      assert.deepEqual(JSON.parse(await readFile(manifest, "utf8")), original);
    }
    assert.equal(run("--only", "selected.md").status, 0);
    const updated = JSON.parse(await readFile(manifest, "utf8"));
    assert.deepEqual(updated.files[0], original.files[0]); assert.equal(updated.syncedAt, original.syncedAt);
    assert.equal(updated.apiEntries, 42); assert.equal(updated.guides, 2);
    assert.equal(updated.files[1].sourceRevision, git("rev-parse", "HEAD"));
    assert.equal(await readFile(path.join(app, "content", "docs", "other.md"), "utf8"), "keep me");
    assert.equal(run("--only", "selected.md", "--check").status, 0);
    await writeFile(path.join(app, "content", "docs", "selected.md"), "tampered");
    assert.notEqual(run("--only", "selected.md", "--check").status, 0);
    assert.equal(run("--only", "selected.md").status, 0);
    await writeFile(path.join(source, "selected.md"), "# Uncommitted source\n");
    assert.notEqual(run("--only", "selected.md").status, 0);
    // The scoped option does not weaken full sync's required API/catalog source contract.
    assert.notEqual(run().status, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
