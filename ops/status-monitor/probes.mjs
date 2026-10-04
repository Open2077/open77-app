// Only public, read-only endpoints. Never accept a URL from an HTTP request.
const CDN_ORIGIN = "https://cdn.open77.dev";
// Historical signed manifests can still point at the old compatibility origin.
// Permit only these two explicit HTTPS origins, including at every redirect hop.
const CDN_ORIGINS = new Set([CDN_ORIGIN, "https://cdn.open2077.net"]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
export const SERVICES = [
  { id: "master", name: "Master API", description: "Platform API and database health. Does not exercise account sign-in.", kind: "health", url: "https://master.open2077.net/healthz" },
  { id: "directory", name: "Server directory", description: "Discovery of community servers in the launcher and on the website.", kind: "list", url: "https://master.open2077.net/api/v1/servers?pageSize=1" },
  { id: "client", name: "Client CDN", description: "Client release manifest and a real partial download from the CDN.", kind: "client", url: "https://master.open2077.net/api/v1/mod/manifest" },
  { id: "launcher", name: "Launcher downloads", description: "Latest launcher release and download availability.", kind: "launcher", url: `${CDN_ORIGIN}/launcher/latest.json` },
  { id: "server", name: "Server downloads", description: "Latest Windows and Linux dedicated-server downloads.", kind: "server", url: `${CDN_ORIGIN}/server/latest.json` },
  { id: "website", name: "Website & documentation", description: "Public website delivery. Does not exercise authenticated pages.", kind: "html", url: "https://open2077.net/" },
  { id: "workshop", name: "Workshop API", description: "Public resource catalogue. Private uploads are not tested.", kind: "list", url: "https://master.open2077.net/api/v1/community/projects?limit=1" },
];

export class ProbeError extends Error {}

export async function boundedBody(response, limit) {
  if (!response.body) throw new ProbeError("Empty response");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new ProbeError("Response exceeds check limit");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

function cdnUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new ProbeError("Invalid download address"); }
  if (!CDN_ORIGINS.has(url.origin) || url.username || url.password || url.search || url.hash) {
    throw new ProbeError("Unexpected download origin or path");
  }
  return url;
}

export function artifactUrl(value) {
  const url = cdnUrl(value);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { throw new ProbeError("Invalid download path"); }
  // Reject encoded traversal/separators as well as non-release paths. Do not
  // loosen path validation merely to allow the new delivery origin.
  if (/[\\%?#]/.test(path) || /%2f|%5c/i.test(url.pathname) || [...path].some(char => char.charCodeAt(0) < 32) ||
      path.split("/").slice(1).some(part => !part || part === "." || part === "..") ||
      !/^\/(mod|launcher|server)\/[0-9][A-Za-z0-9.+_-]*\/.+$/.test(path)) {
    throw new ProbeError("Unexpected download origin or path");
  }
  return url;
}

function releaseMetadataUrl(value, kind) {
  const url = cdnUrl(value);
  if (url.pathname !== `/${kind}/latest.json`) throw new ProbeError("Unexpected release metadata path");
  return url;
}

export async function probe(service, fetcher = fetch, timeoutMs = 12000) {
  const started = performance.now();
  const signal = AbortSignal.timeout(timeoutMs);
  const request = async (url, headers = {}) => fetcher(url, {
    signal, redirect: "manual", headers: { "User-Agent": "Open77-Status/1.0", ...headers },
  });
  const metadata = async () => {
    if (!["launcher", "server"].includes(service.kind)) return request(service.url, { "Cache-Control": "no-cache" });
    let url = releaseMetadataUrl(service.url, service.kind);
    for (let hop = 0; hop < 4; hop++) {
      const response = await request(url, { "Cache-Control": "no-cache" });
      if (!REDIRECTS.has(response.status)) return response;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new ProbeError("Invalid release metadata redirect");
      url = releaseMetadataUrl(new URL(location, url), service.kind);
    }
    throw new ProbeError("Too many release metadata redirects");
  };
  const download = async (value) => {
    let url = artifactUrl(value);
    let response;
    for (let hop = 0; hop < 4; hop++) {
      response = await request(url, { Range: "bytes=0-4095", "Accept-Encoding": "identity" });
      if (!REDIRECTS.has(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new ProbeError("Invalid download redirect");
      url = artifactUrl(new URL(location, url));
    }
    if (response?.status !== 206 || !/^bytes 0-4095\/[0-9]+$/.test(response.headers.get("content-range") ?? "")) {
      await response?.body?.cancel();
      throw new ProbeError(`Partial download unavailable (HTTP ${response?.status ?? 0})`);
    }
    const bytes = await boundedBody(response, 4096);
    if (bytes.length !== 4096) throw new ProbeError("Incomplete download");
  };
  try {
    const response = await metadata();
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new ProbeError(`HTTP ${response.status}`);
    }
    const body = (await boundedBody(response, 1024 * 1024)).toString("utf8");
    if (service.kind === "html") {
      if (!/<!doctype html/i.test(body) || !/OPEN.{0,10}77/i.test(body)) throw new ProbeError("Unexpected website response");
    } else {
      let data;
      try { data = JSON.parse(body); } catch { throw new ProbeError("Unreadable JSON response"); }
      if (!data || typeof data !== "object") throw new ProbeError("Unexpected response format");
      if (service.kind === "health" && data.status !== "healthy") throw new ProbeError("Health check not healthy");
      if (service.kind === "list" && !Array.isArray(data.items)) throw new ProbeError("Catalogue unavailable");
      if (["client", "launcher", "server"].includes(service.kind) && typeof data.version !== "string") throw new ProbeError("Invalid release metadata");
      if (service.kind === "client") {
        const file = data.files?.find((item) => typeof item.path === "string" && item.size >= 4096);
        if (!file || typeof data.baseUrl !== "string") throw new ProbeError("Missing client artifact");
        await download(new URL(file.path, data.baseUrl));
      }
      if (service.kind === "launcher") await download(data.url);
      if (service.kind === "server") {
        for (const platform of ["windows-x64", "linux-x64"]) await download(data.builds?.[platform]?.url);
      }
    }
    const latencyMs = Math.round(performance.now() - started);
    return { state: latencyMs > 2500 ? "degraded" : "operational", latencyMs, detail: latencyMs > 2500 ? "Check exceeded 2.5 seconds" : "Check passed" };
  } catch (error) {
    return { state: "outage", latencyMs: null, detail: signal.aborted ? "Check timed out (12s budget)" : error instanceof ProbeError ? error.message : "Connection, DNS or TLS check failed" };
  }
}
