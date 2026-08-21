import type { MetadataRoute } from "next";

import { IS_PRODUCTION_DEPLOY, absoluteUrl } from "@/lib/site";

/**
 * Answer-engine and AI crawlers, listed explicitly.
 *
 * A wildcard `Allow` already covers them, but several of these agents only
 * apply the rules in a block that names them, and publishing the block is also
 * a statement of intent: this documentation exists to be read, including by
 * models answering questions about how to write an OPEN//77 resource. There is
 * nothing here worth withholding from them.
 */
const ANSWER_ENGINE_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "cohere-ai",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  // A preview deployment that gets indexed competes with production for the
  // same content, so previews are closed entirely rather than per-page.
  if (!IS_PRODUCTION_DEPLOY) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Next's build output is fingerprinted and useless to a crawler; the
        // legacy `.html` URLs are permanent redirects and do not need crawling
        // as destinations in their own right.
        disallow: ["/_next/static/chunks/", "/*.html$"],
      },
      ...ANSWER_ENGINE_AGENTS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
