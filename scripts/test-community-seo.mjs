import assert from "node:assert/strict";
import test from "node:test";
import { communitySitemapDocument, communitySitemapIndex, validSitemapShard } from "../src/lib/community/sitemap.ts";
import { communityStructuredData } from "../src/lib/community/structured-data.ts";

test("sitemap pages follow bounded cursors and emit canonical public URLs", async () => {
  const calls = [];
  const result = await communitySitemapDocument("projects", "https://open2077.net", async cursor => {
    calls.push(cursor);
    return cursor ? { items: [{ path: "/resources/second", lastModifiedUtc: "2026-09-11T00:00:00Z" }], nextCursor: null }
      : { items: [{ path: "/resources/first", lastModifiedUtc: "2026-09-10T00:00:00Z" }], nextCursor: "next" };
  });
  assert.deepEqual(calls, [undefined, "next"]);
  assert.match(result, /https:\/\/open2077.net\/resources\/first/);
  assert.match(result, /<lastmod>2026-09-11T00:00:00.000Z<\/lastmod>/);
  assert.equal((result.match(/<url>/g) ?? []).length, 2);
});

test("sitemaps reject private paths, invalid dates, loops and oversized shards", async () => {
  for (const entry of [
    { path: "/account/creations/private", lastModifiedUtc: "2026-09-11" },
    { path: "/resources/escape?token=secret", lastModifiedUtc: "2026-09-11" },
    { path: "/creators/someone", lastModifiedUtc: "2026-09-11" },
    { path: "/resources/example", lastModifiedUtc: "invalid" },
  ]) await assert.rejects(communitySitemapDocument("projects", "https://open2077.net", async () => ({ items: [entry], nextCursor: null })));
  await assert.rejects(communitySitemapDocument("projects", "https://open2077.net", async () => ({ items: [], nextCursor: "loop" })), /Repeated/);
  let page = 0;
  await assert.rejects(communitySitemapDocument("projects", "https://open2077.net", async () => ({ items: [], nextCursor: String(++page) })), /50000/);
  assert.equal(page, 50);
});

test("sitemap index validates shards and excludes arbitrary URL data", () => {
  assert.equal(validSitemapShard("projects", "ab"), true);
  assert.equal(validSitemapShard("creators", "ff"), true);
  assert.equal(validSitemapShard("accounts", "ab"), false);
  assert.throws(() => communitySitemapIndex([{ kind: "projects", bucket: "../../private" }], "https://open2077.net"));
  const result = communitySitemapIndex([{ kind: "creators", bucket: "ab" }, { kind: "creators", bucket: "ab" }], "https://open2077.net");
  assert.equal((result.match(/<sitemap>/g) ?? []).length, 1);
  assert.match(result, /\/community\/sitemaps\/creators\/ab\/sitemap.xml/);
});

test("community structured data cannot terminate its script and invents no offers", () => {
  const title = '</script><script>alert("x")</script>';
  const result = communityStructuredData({ slug: "safe-project", content: { title, summary: "A & B", sourceUrl: "https://github.com/example/source" }, creatorHandle: "creator", publishedAtUtc: "2026-09-11T00:00:00Z" }, "https://open2077.net");
  assert.equal(result.includes("<"), false); assert.equal(result.includes("&"), false);
  const data = JSON.parse(result); assert.equal(data.name, title); assert.equal(data["@type"], "CreativeWork");
  assert.equal(data.url, "https://open2077.net/resources/safe-project"); assert.equal(data.offers, undefined); assert.equal(data.aggregateRating, undefined);
});
