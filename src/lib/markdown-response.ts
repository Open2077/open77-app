import { absoluteUrl } from "@/lib/site";

/**
 * Serves a Markdown twin of an HTML page.
 *
 * `X-Robots-Tag: noindex` is deliberate: these documents are byte-for-byte the
 * same content as the page they mirror, and letting both into the index is
 * textbook duplicate content. `follow` is kept so the links inside still carry
 * weight, and `Link: rel=canonical` names the page a crawler should prefer.
 * None of this stops an agent or an answer engine from fetching the file, which
 * is the whole reason it exists.
 */
export function markdownResponse(body: string | null, canonicalPath: string): Response {
  if (body === null) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
      Link: `<${absoluteUrl(canonicalPath)}>; rel="canonical"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/** Serves a plain-text agent surface such as `llms.txt`. */
export function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
