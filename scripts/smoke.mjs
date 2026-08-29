/**
 * Post-build smoke test.
 *
 * Checks that every public URL shape resolves the way it is supposed to against
 * a running `next start`, including the legacy redirects and the Markdown
 * rewrites — neither of which shows up in the build output, so a broken pattern
 * would otherwise only be discovered in production.
 *
 * Usage: node scripts/smoke.mjs [origin]
 */

const origin = process.argv[2] ?? "http://127.0.0.1:3000";

/**
 * @type {{
 *   path: string,
 *   expect: number,
 *   contains?: string,
 *   absent?: string,
 *   type?: string,
 *   location?: string,
 *   locationPath?: string,
 * }[]}
 */
const CHECKS = [
  { path: "/", expect: 200, contains: "OPEN//77", type: "text/html" },
  { path: "/", expect: 200, contains: "Phantom Liberty" },
  { path: "/", expect: 200, contains: "Develop in Lua" },
  // The launcher page's version and digest come from the CDN at build time, so
  // the assertions are on the copy that is always there, not on a build number.
  // The headline rather than the button: the button reads "Download for Windows"
  // when a release resolves and "Get the launcher" when none does, and this has
  // to hold in both states.
  { path: "/download", expect: 200, contains: "OPEN//77 launcher.", type: "text/html" },
  { path: "/download", expect: 200, contains: "SHA-256" },
  { path: "/servers", expect: 200, contains: "Night City Roleplay", type: "text/html" },
  { path: "/servers/nc-roleplay", expect: 200, contains: "Online now" },
  { path: "/create", expect: 200, contains: "Create" },
  { path: "/create", expect: 200, contains: "Phantom Liberty" },
  // `open77-base` is private, so no rendered page may link to it. These guard
  // against a wiki link, a `sameAs` entry or a hand-written href reintroducing
  // a guaranteed 404.
  { path: "/community", expect: 200, absent: "open77-base" },
  { path: "/brand", expect: 200 },
  { path: "/docs", expect: 200, contains: "Filter pages", absent: "open77-base" },
  { path: "/docs/vehicles", expect: 200, contains: "authority", absent: "open77-base" },
  { path: "/docs/npcs", expect: 200, absent: "open77-base" },
  { path: "/docs/data-reference", expect: 200, absent: "open77-base" },
  { path: "/docs/platform", expect: 200, contains: "dedicated servers" },
  // A real signature, not a word from the search placeholder — the earlier
  // version of this check passed against a suggested function that did not
  // exist, which is exactly the failure it was supposed to catch.
  { path: "/docs/api", expect: 200, contains: "Open77.vehicles.breakGlass" },
  { path: "/docs/api/client/globals", expect: 200, contains: "AddEventHandler" },
  { path: "/docs/api/server/open77-vehicles", expect: 200, contains: "routing bucket" },

  // Markdown twins, reached through the rewrites.
  { path: "/docs.md", expect: 200, type: "text/markdown", contains: "# Open77" },
  { path: "/docs/vehicles.md", expect: 200, type: "text/markdown", contains: "```lua" },
  { path: "/docs/platform.md", expect: 200, type: "text/markdown", contains: "## FAQ" },
  { path: "/docs/api.md", expect: 200, type: "text/markdown", contains: "Lua API reference" },
  {
    path: "/docs/api/client/open77-camera.md",
    expect: 200,
    type: "text/markdown",
    contains: "camera",
  },

  // Agent surfaces.
  {
    path: "/llms.txt",
    expect: 200,
    type: "text/plain",
    contains: "llms-full.txt",
    absent: "open77-base",
  },
  { path: "/llms-full.txt", expect: 200, type: "text/plain", contains: "Lua API reference" },
  { path: "/robots.txt", expect: 200, contains: "GPTBot" },
  { path: "/sitemap.xml", expect: 200, contains: "/docs/api/client/globals" },

  // Legacy URLs.
  { path: "/index.html", expect: 308, location: "/" },
  { path: "/servers.html", expect: 308, location: "/servers" },
  { path: "/create.html", expect: 308, location: "/create" },
  { path: "/community.html", expect: 308, location: "/community" },
  { path: "/brand.html", expect: 308, location: "/brand" },
  { path: "/docs.html", expect: 308, location: "/docs/platform" },
  // Next re-appends the source query string to a redirect destination, so the
  // legacy `?id=` rides along. Harmless — the detail page ignores it and
  // declares the clean URL as canonical — but it means matching on the path.
  {
    path: "/server.html?id=nc-roleplay",
    expect: 308,
    locationPath: "/servers/nc-roleplay",
  },
  { path: "/server.html", expect: 308, location: "/servers" },

  // Assets that moved into public/.
  { path: "/assets/favicon.svg", expect: 200 },
  { path: "/brand/social/og-card-1200x630.png", expect: 200 },

  { path: "/does-not-exist", expect: 404 },
];

let failures = 0;

for (const check of CHECKS) {
  let response;
  try {
    response = await fetch(origin + check.path, { redirect: "manual" });
  } catch (error) {
    console.error(`FAIL ${check.path} — request failed: ${error.message}`);
    failures += 1;
    continue;
  }

  const problems = [];
  if (response.status !== check.expect) {
    problems.push(`status ${response.status}, expected ${check.expect}`);
  }
  if (check.location) {
    const location = response.headers.get("location") ?? "";
    if (location !== check.location) {
      problems.push(`location "${location}", expected "${check.location}"`);
    }
  }
  if (check.locationPath) {
    const location = (response.headers.get("location") ?? "").split("?")[0];
    if (location !== check.locationPath) {
      problems.push(`location path "${location}", expected "${check.locationPath}"`);
    }
  }
  if (check.type) {
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith(check.type)) {
      problems.push(`content-type "${type}", expected ${check.type}`);
    }
  }
  if (check.contains || check.absent) {
    const body = await response.text();
    if (check.contains && !body.includes(check.contains)) {
      problems.push(`body missing "${check.contains}"`);
    }
    if (check.absent && body.includes(check.absent)) {
      problems.push(`body still contains "${check.absent}"`);
    }
  }

  if (problems.length > 0) {
    console.error(`FAIL ${check.path} — ${problems.join("; ")}`);
    failures += 1;
  } else {
    console.log(`ok   ${check.path}`);
  }
}

console.log(`\n${CHECKS.length - failures}/${CHECKS.length} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
