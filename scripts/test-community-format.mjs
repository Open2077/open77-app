import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug } from "../src/lib/community/slug.ts";
import { validCreatedProject } from "../src/lib/community/create-response.ts";
import { formatBytes, formatCount, pickLatestStable } from "../src/lib/community/format.ts";

test("slugs normalize while typing and finalize without a trailing hyphen", () => {
  assert.equal(normalizeSlug("Auto Taxi RP"), "auto-taxi-rp");
  assert.equal(normalizeSlug("  Night__City--Map! "), "night-city-map-");
  assert.equal(normalizeSlug("  Night__City--Map! ", { final: true }), "night-city-map");
  assert.equal(normalizeSlug("---"), "");
  assert.equal(normalizeSlug("a".repeat(120)).length, 80);
});

test("a normalized slug from the master is accepted; a malformed one is not", () => {
  const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const content = { title: "Chairs", summary: "Two chairs", category: "maps", description: "Details", installation: "Guide", kind: "resource", maturity: "experimental", tags: [] };
  assert.equal(validCreatedProject({ projectId: id, slug: "chairs", revision: 1, content }, "Chairs-"), true);
  assert.equal(validCreatedProject({ projectId: id, slug: "Chairs", revision: 1, content }, "chairs"), false);
  assert.equal(validCreatedProject({ projectId: id, slug: "", revision: 1, content }, "chairs"), false);
  assert.equal(validCreatedProject({ projectId: id, slug: "chairs", revision: 1, content }, ""), false);
});

test("the latest stable release is the newest published one, never a prerelease or a withdrawn version", () => {
  const release = (version, extra) => ({ releaseId: version, projectId: "p", version, state: "published", channel: "stable", revision: 1,
    metadata: { changelog: "", license: "", installation: "", testedBuilds: [], requiredResources: [] }, sha256: null, sizeBytes: 1, createdAtUtc: "2026-09-01T00:00:00Z",
    publishedAtUtc: "2026-09-02T00:00:00Z", revokedAtUtc: null, resources: [], inspection: null, ...extra });
  const releases = [
    release("1.0.0", { publishedAtUtc: "2026-09-01T00:00:00Z" }),
    release("1.0.1", { publishedAtUtc: "2026-09-05T00:00:00Z" }),
    release("2.0.0-beta", { channel: "prerelease", publishedAtUtc: "2026-09-09T00:00:00Z" }),
    release("1.0.2", { state: "revoked", revokedAtUtc: "2026-09-10T00:00:00Z", publishedAtUtc: "2026-09-08T00:00:00Z" }),
  ];
  assert.equal(pickLatestStable(releases)?.version, "1.0.1");
  assert.equal(pickLatestStable([]), null);
  assert.equal(pickLatestStable([release("0.1.0", { channel: "prerelease" })]), null);
});

test("sizes and counters stay short", () => {
  assert.equal(formatBytes(3072), "3 KiB");
  assert.equal(formatBytes(1536 * 1024), "1.5 MiB");
  assert.equal(formatBytes(null), "—");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1234), "1.2k");
  assert.equal(formatCount(12345), "12k");
});
