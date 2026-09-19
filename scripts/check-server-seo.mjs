import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = process.argv[2] ?? "http://localhost:3113";
const id = process.argv[3] ?? "6b611fe7-f168-4959-8b28-2a7cdb673b24";
const route = `/servers/${id}`;
const master = "https://master.open2077.net";
const response = await fetch(`${master}/api/v1/servers/${id}`);
assert.equal(response.status, 200);
const server = await response.json();
const decode = value => value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
for (const userAgent of ["Mozilla/5.0", "Googlebot", "Twitterbot", "facebookexternalhit/1.1"]) {
  const page = await fetch(origin + route, { headers: { "User-Agent": userAgent } });
  assert.equal(page.status, 200);
  const html = await page.text();
  const head = html.slice(0, html.indexOf("</head>"));
  const meta = key => decode(head.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"<>]*)"`))?.[1] ?? "");
  assert.ok(decode(head.match(/<title>(.*?)<\/title>/)?.[1] ?? "").includes(server.name));
  assert.equal(meta("description"), server.description.trim().replace(/\s+/g, " "));
  assert.equal(meta("og:description"), meta("description"));
  assert.equal(meta("twitter:description"), meta("description"));
  assert.equal(meta("og:image"), new URL(server.bannerUrl || server.iconUrl, master).href);
  assert.equal(meta("twitter:image"), meta("og:image"));
  assert.ok(head.includes(`rel="canonical" href="https://open2077.net${route}"`));
  assert.ok(!meta("robots").includes("noindex"));
  const visible = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ""));
  assert.ok(visible.includes(server.name));
  assert.ok(visible.includes(server.description));
  assert.ok(!visible.includes("LOADING SERVER"));
  const schemas = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])["@graph"] ?? []);
  assert.ok(schemas.some(node => node["@type"] === "WebPage" && node.name === server.name));
  console.log(`PASS ${userAgent}: real HTML, title, description, image, canonical, robots and schema`);
}
const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
assert.ok(sitemap.includes(`https://open2077.net${route}`));
assert.ok(!sitemap.includes("/account/"));
console.log("PASS public server in sitemap; private routes excluded");
if (new URL(origin).hostname === "localhost") {
  const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
  assert.equal(manifest.routes[route]?.initialRevalidateSeconds, 300);
  const staticHtml = await readFile(`.next/server/app${route}.html`, "utf8");
  assert.ok(staticHtml.includes(server.name));
  console.log("PASS build contains static profile HTML with five-minute ISR");
}
