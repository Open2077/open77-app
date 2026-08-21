/**
 * Prints what a crawler actually receives for a handful of pages.
 *
 * The point is to check the *prerendered* HTML, not the hydrated DOM: if a
 * server listing or an API signature is only added by JavaScript, it will be
 * missing here, which is exactly the failure this port set out to fix.
 *
 * Usage: node scripts/inspect-output.mjs [origin]
 */

const origin = process.argv[2] ?? "http://127.0.0.1:3000";

async function get(path) {
  const response = await fetch(origin + path);
  return response.text();
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function jsonLdTypes(html) {
  const types = new Set();
  for (const match of html.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  )) {
    try {
      const parsed = JSON.parse(match[1]);
      for (const node of parsed["@graph"] ?? [parsed]) types.add(node["@type"]);
    } catch {
      types.add("UNPARSEABLE");
    }
  }
  return [...types];
}

function meta(html, name) {
  const match =
    html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) ??
    html.match(new RegExp(`<meta property="${name}" content="([^"]*)"`));
  return match ? match[1] : null;
}

function canonical(html) {
  const match = html.match(/<link rel="canonical" href="([^"]*)"/);
  return match ? match[1] : null;
}

const home = await get("/");
console.log("=== / ===");
console.log("title       :", home.match(/<title>(.*?)<\/title>/)?.[1]);
console.log("description :", meta(home, "description")?.slice(0, 90), "…");
console.log("canonical   :", canonical(home));
console.log("og:image    :", meta(home, "og:image"));
console.log("json-ld     :", jsonLdTypes(home).join(", "));
console.log("h1 count    :", count(home, "<h1"));

const servers = await get("/servers");
console.log("\n=== /servers ===");
console.log("canonical   :", canonical(servers));
console.log("json-ld     :", jsonLdTypes(servers).join(", "));
console.log("rows in HTML:", count(servers, 'class="sb-row"'));
console.log("connect btns:", count(servers, 'class="sb-connect"'));
console.log("demo notice :", servers.includes("demo data"));
console.log("first name  :", servers.match(/class="sb-name">([^<]*)/)?.[1]);

const guide = await get("/docs/vehicles");
console.log("\n=== /docs/vehicles ===");
console.log("canonical   :", canonical(guide));
console.log("markdown alt:", guide.match(/type="text\/markdown" href="([^"]*)"/)?.[1]);
console.log("json-ld     :", jsonLdTypes(guide).join(", "));
console.log("shiki blocks:", count(guide, "shiki"));
console.log("tables      :", count(guide, "dx-table-wrap"));
console.log("anchors     :", count(guide, "doc-anchor"));
console.log("toc entries :", count(guide, "dx-toc-list") ? count(guide, 'class="dx-toc-depth') : 0);
console.log("sidebar link:", count(guide, 'class="dx-nav-list"'));
console.log("wiki .md    :", count(guide, 'href="/docs/'), "internal doc links");
console.log("raw .md left:", guide.includes(".md#") || / href="[^"]*\.md"/.test(guide));

const api = await get("/docs/api/server/cyberm-vehicles");
console.log("\n=== /docs/api/server/cyberm-vehicles ===");
console.log("canonical   :", canonical(api));
console.log("json-ld     :", jsonLdTypes(api).join(", "));
console.log("functions   :", count(api, 'class="dx-fn"'));
console.log("signatures  :", count(api, "dx-fn-sig"));

const apiIndex = await get("/docs/api");
console.log("\n=== /docs/api ===");
console.log("hits in HTML:", count(apiIndex, 'class="dx-hit"'));
console.log("namespaces  :", count(apiIndex, "dx-ns-card"));

const platform = await get("/docs/platform");
console.log("\n=== /docs/platform ===");
console.log("json-ld     :", jsonLdTypes(platform).join(", "));
console.log("faq items   :", count(platform, 'class="faq-item"'));
console.log("old TS API  :", platform.includes("@open77/server"));
console.log("lua manifest:", platform.includes("auto_start"));

const docsIndex = await get("/docs");
console.log("\n=== /docs ===");
console.log("canonical   :", canonical(docsIndex));
console.log("json-ld     :", jsonLdTypes(docsIndex).join(", "));
console.log("cards in HTML:", count(docsIndex, 'class="dx-card"'));
console.log("filter input:", docsIndex.includes("Filter pages"));

const sitemap = await get("/sitemap.xml");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
console.log("\n=== /sitemap.xml ===");
console.log("urls        :", locations.length);
console.log("has lastmod :", count(sitemap, "<lastmod>"));
console.log("root entry  :", locations[0]);
console.log(
  "trailing '/' :",
  locations.filter((url) => url.endsWith("/")).length,
  "of",
  locations.length,
);

// A canonical tag and a sitemap entry that disagree about the same page — even
// only about a trailing slash — is the sort of thing that quietly splits a
// URL's signals in two.
console.log("\n=== canonical vs sitemap ===");
const mismatches = [];
for (const path of ["/", "/servers", "/docs", "/docs/api"]) {
  const tag = canonical(await get(path));
  const inSitemap = locations.filter((url) => url === tag).length === 1;
  if (!inSitemap) mismatches.push(`${path}: canonical ${tag} is not a sitemap entry`);
}
console.log(mismatches.length === 0 ? "consistent" : mismatches.join("\n"));

const llms = await get("/llms.txt");
console.log("\n=== /llms.txt ===");
console.log("bytes       :", llms.length);
console.log("links       :", count(llms, "](https://"));

const llmsFull = await get("/llms-full.txt");
console.log("\n=== /llms-full.txt ===");
console.log("bytes       :", llmsFull.length);
console.log("documents   :", count(llmsFull, "\nSource: "));
