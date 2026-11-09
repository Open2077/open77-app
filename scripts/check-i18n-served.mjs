/**
 * The translated site as served: languages, redirects and SEO, over HTTP.
 *
 * Runs against `next start`. For every translated page in every language:
 * `<html lang>`, the canonical URL, hreflang alternates (x-default included),
 * og:locale, JSON-LD `inLanguage`, a translated title, and links that stay in
 * the page's language (a French page links to `/fr/download` and to the
 * English-only `/docs`, never to `/fr/docs` or to the English `/download`).
 * Then the language proxy: the selector cookie beats Accept-Language, Accept-
 * Language only acts on English URLs, crawlers and requests without the header
 * are never redirected, `?lang=` (the server browser's filter) passes through
 * untouched. Then the redirects, the localized 404s and the sitemap.
 *
 * Usage: node scripts/check-i18n-served.mjs [origin]
 */

const origin = process.argv[2] ?? "http://127.0.0.1:3000";

/** Mirrors LOCALE_INFO in src/i18n/config.ts. */
const LOCALES = [
  { locale: "en", segment: "", tag: "en", og: "en_US" },
  { locale: "fr", segment: "fr", tag: "fr", og: "fr_FR" },
  { locale: "es", segment: "es", tag: "es", og: "es_ES" },
  { locale: "pt-BR", segment: "pt-br", tag: "pt-BR", og: "pt_BR" },
  { locale: "de", segment: "de", tag: "de", og: "de_DE" },
  { locale: "pl", segment: "pl", tag: "pl", og: "pl_PL" },
  { locale: "ru", segment: "ru", tag: "ru", og: "ru_RU" },
  { locale: "tr", segment: "tr", tag: "tr", og: "tr_TR" },
];
const INDEXED = ["/", "/download", "/servers", "/create", "/host", "/ncwe", "/status"];
const NOINDEX = ["/account", "/verify-email", "/forgot-password", "/reset-password", "/launcher"];
/** Mirrors LOCALIZED_ROUTES: English paths that have a version in every language. */
const isLocalized = (path) => [...INDEXED, ...NOINDEX].includes(path) || /^\/servers\/[^/]+$/.test(path);
const localized = (path, segment) => (segment ? `/${segment}${path === "/" ? "" : path}` : path);

let failures = 0;
let passes = 0;
function check(name, ok, detail = "") {
  if (ok) passes++;
  else {
    failures++;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function get(path, headers = {}, method = "GET") {
  const response = await fetch(origin + path, { method, redirect: "manual", headers: { "accept-language": "", ...headers } });
  const body = method === "HEAD" ? "" : await response.text();
  return { status: response.status, headers: response.headers, body };
}

const decode = (text) =>
  text.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&#39;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const attr = (tag, name) => decode(new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? "");
const tagsOf = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[0]);
const pathOf = (href) => {
  try {
    const url = new URL(href, origin);
    return url.pathname.length > 1 && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  } catch {
    return "";
  }
};

/* ---------------------------------------------------------------- pages --- */

const englishTitles = new Map();
for (const route of [...INDEXED, ...NOINDEX]) {
  for (const { locale, segment, tag, og } of LOCALES) {
    const url = localized(route, segment);
    const { status, body } = await get(url);
    check(`${url} answers 200`, status === 200, `status ${status}`);
    if (status !== 200) continue;
    const head = body.slice(0, body.indexOf("</head>") + 7);

    check(`${url} <html lang="${tag}">`, new RegExp(`<html[^>]*\\slang="${tag}"`).test(body), /<html[^>]*>/.exec(body)?.[0]);

    const title = decode(/<title>([^<]*)<\/title>/.exec(head)?.[1] ?? "");
    if (locale === "en") englishTitles.set(route, title);
    else check(`${url} title is translated`, title && title !== englishTitles.get(route), title);

    const canonical = tagsOf(head, /<link[^>]*rel="canonical"[^>]*>/g)[0] ?? "";
    check(`${url} canonical is itself`, pathOf(attr(canonical, "href")) === url, attr(canonical, "href"));

    const ogLocale = tagsOf(head, /<meta[^>]*property="og:locale"[^>]*>/g)[0] ?? "";
    check(`${url} og:locale ${og}`, attr(ogLocale, "content") === og, attr(ogLocale, "content"));
    const ogUrl = tagsOf(head, /<meta[^>]*property="og:url"[^>]*>/g)[0];
    if (ogUrl) check(`${url} og:url is itself`, pathOf(attr(ogUrl, "content")) === url, attr(ogUrl, "content"));

    const robots = attr(tagsOf(head, /<meta[^>]*name="robots"[^>]*>/g)[0] ?? "", "content");
    if (NOINDEX.includes(route)) {
      check(`${url} is noindex`, /noindex/.test(robots), robots);
    } else {
      check(`${url} is indexable`, !/noindex/.test(robots), robots);
      const alternates = new Map(
        tagsOf(head, /<link[^>]*rel="alternate"[^>]*hrefLang="[^"]*"[^>]*>/gi).map((link) => [attr(link, "hreflang"), pathOf(attr(link, "href"))]),
      );
      for (const other of LOCALES) {
        const expected = localized(route, other.segment);
        check(`${url} hreflang ${other.tag}`, alternates.get(other.tag) === expected, `${alternates.get(other.tag)} ≠ ${expected}`);
      }
      check(`${url} hreflang x-default`, alternates.get("x-default") === route, alternates.get("x-default"));
    }

    const languages = [...body.matchAll(/\\?"inLanguage\\?":\\?"([^"\\]+)/g)].map((match) => match[1]);
    check(`${url} JSON-LD inLanguage`, languages.every((value) => value === tag), [...new Set(languages)].join(","));

    // Links stay in the page's language. The selector's entries carry hreflang and are exempt.
    const leaks = [];
    for (const anchor of tagsOf(body, /<a\b[^>]*>/g)) {
      const href = attr(anchor, "href");
      if (!href.startsWith("/") || href.startsWith("//") || /\shreflang=/i.test(anchor)) continue;
      const path = pathOf(href);
      const prefix = /^\/(fr|es|pt-br|de|pl|ru|tr)(\/.*)?$/.exec(path);
      if (prefix) {
        const rest = prefix[2] ?? "/";
        if (!isLocalized(rest)) leaks.push(`${href} (English-only page under a prefix)`);
        else if (prefix[1] !== segment) leaks.push(`${href} (another language)`);
      } else if (segment && isLocalized(path)) {
        leaks.push(`${href} (English version)`);
      }
    }
    check(`${url} links stay in ${tag}`, leaks.length === 0, [...new Set(leaks)].slice(0, 6).join(", "));
  }
}

/* ---------------------------------------------------------------- proxy --- */

const proxy = [
  // [path, headers, expected status, expected location]
  ["/", { "accept-language": "de-DE,de;q=0.9,en;q=0.8" }, 307, "/de"],
  ["/download", { "accept-language": "pt-PT,pt;q=0.9" }, 307, "/pt-br/download"],
  ["/servers?lang=fr&q=rp", { "accept-language": "ru" }, 307, "/ru/servers?lang=fr&q=rp"],
  ["/servers/nc-roleplay", { "accept-language": "tr-TR" }, 307, "/tr/servers/nc-roleplay"],
  ["/account", { "accept-language": "pl-PL,pl" }, 307, "/pl/account"],
  ["/", { "accept-language": "es-419,es;q=0.9" }, 307, "/es"],
  ["/", { "accept-language": "en-GB,fr;q=0.8" }, 200],
  ["/", { "accept-language": "ja,zh;q=0.8" }, 200],
  ["/", { "accept-language": "fr;q=0" }, 200],
  ["/", {}, 200],
  ["/", { "accept-language": "fr", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }, 200],
  ["/", { "accept-language": "fr", cookie: "op77_lang=en" }, 200],
  ["/", { cookie: "op77_lang=pl" }, 307, "/pl"],
  ["/", { cookie: "op77_lang=xx", "accept-language": "de" }, 307, "/de"],
  ["/fr/download", { cookie: "op77_lang=de" }, 307, "/de/download"],
  ["/fr/download", { cookie: "op77_lang=en" }, 307, "/download"],
  ["/fr/download", { "accept-language": "en-US" }, 200],
  ["/fr/download", { "accept-language": "de", cookie: "op77_lang=xx" }, 200],
  ["/fr/servers?lang=de", { cookie: "op77_lang=fr" }, 200],
  ["/docs/platform", { "accept-language": "fr" }, 200],
  ["/devblog", { cookie: "op77_lang=de" }, 200],
];
for (const [path, headers, status, location] of proxy) {
  const response = await get(path, headers);
  const name = `proxy ${path} ${JSON.stringify(headers)}`;
  check(`${name} → ${status}`, response.status === status, `status ${response.status}`);
  if (location) {
    check(`${name} → ${location}`, (response.headers.get("location") ?? "").replace(origin, "") === location, response.headers.get("location") ?? "");
    check(`${name} is never cached`, /no-store/.test(response.headers.get("cache-control") ?? "") && /accept-language/i.test(response.headers.get("vary") ?? ""));
  }
}
check("proxy HEAD / with Accept-Language", (await get("/", { "accept-language": "fr" }, "HEAD")).status === 307);

/* ------------------------------------------------------------ redirects --- */

const redirects = [
  ["/en", "/"],
  ["/en/download", "/download"],
  ["/en/servers/nc-roleplay", "/servers/nc-roleplay"],
  ["/fr/docs/platform", "/docs/platform"],
  ["/de/devblog", "/devblog"],
  ["/pt-br/workshop", "/workshop"],
  ["/ru/account/keys", "/account/keys"],
];
for (const [from, to] of redirects) {
  const response = await get(from);
  const location = (response.headers.get("location") ?? "").replace(origin, "");
  check(`${from} redirects to ${to}`, [307, 308].includes(response.status) && location === to, `${response.status} ${location}`);
}

// Misses render the whole 404 page on the server (not Next's empty error
// shell), in the prefix's language. A language header sent by the client is
// ignored on English URLs that reach the proxy, and harmless elsewhere.
const misses = [
  ["/fr/nope/x", "fr"],
  ["/ru/nope", "ru"],
  ["/tr/servers/a/b", "tr"],
  ["/pt-br/nope", "pt-BR"],
  ["/nope", "en"],
  ["/xx/create", "en"],
  ["/docs/does-not-exist", "en"],
  ["/devblog/nope-post", "en"],
  ["/docs/api/client/nope", "en"],
];
for (const [path, tag] of misses) {
  const response = await get(path);
  const rendered = response.status === 404 && new RegExp(`<html[^>]*\\slang="${tag}"`).test(response.body) && response.body.includes("<main");
  check(`${path} is a rendered ${tag} 404`, rendered, `${response.status} ${/<html[^>]*>/.exec(response.body)?.[0]}`);
}
// Misses that reach a [lang] route rendered on demand (download, host, server
// profiles) end in that page's notFound(), which this Next version renders in
// the browser, like every page-level 404 on the site: the status is what HTTP
// can check (scripts/check-i18n-browser.mjs checks what the visitor sees).
for (const path of ["/xx/download", "/docs/download", "/devblog/host", "/docs/servers/abc"]) {
  check(`${path} answers 404`, (await get(path)).status === 404);
}
const spoofed = await get("/fr/nope", { "x-open77-locale": "de" });
check("/fr/nope ignores a client-sent language header", /<html[^>]*\slang="fr"/.test(spoofed.body));

/* -------------------------------------------------------------- sitemap --- */

const sitemap = (await get("/sitemap.xml")).body;
for (const { tag, segment } of LOCALES.slice(1)) {
  check(`sitemap lists /${segment}/download`, sitemap.includes(`/${segment}/download</loc>`));
  check(`sitemap hreflang ${tag}`, new RegExp(`hreflang="${tag}"[^>]*href="[^"]*/${segment}/servers"`).test(sitemap));
}
check("sitemap x-default", /hreflang="x-default"[^>]*href="[^"]*\/download"/.test(sitemap));
check("sitemap has no prefixed English-only page", !/\/(fr|es|pt-br|de|pl|ru|tr)\/(docs|devblog|workshop|brand)/.test(sitemap));
check("sitemap keeps the English docs", sitemap.includes("/docs/platform</loc>"));

console.log(`${passes}/${passes + failures} i18n checks passed.`);
process.exitCode = failures ? 1 : 0;
