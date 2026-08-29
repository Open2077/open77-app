import { apiNamespaceToMarkdown, getApiIndex } from "@/lib/api-reference";
import { getDocsManifest, getDocsNav, getGuideMarkdown } from "@/lib/docs";
import { textResponse } from "@/lib/markdown-response";
import { platformToMarkdown } from "@/lib/platform-content";
import { absoluteUrl, site } from "@/lib/site";

/**
 * `llms-full.txt` — every guide and the whole API reference in one file.
 *
 * One fetch instead of sixty. Each document keeps a source URL above it so a
 * model quoting a passage can cite the page it came from, and the whole thing is
 * assembled in sidebar order so the narrative sequence of the documentation
 * survives the concatenation.
 *
 * Generated at build time from the same content the pages render, so it cannot
 * describe a version of the docs that is no longer published.
 */
export const dynamic = "force-static";

const SEPARATOR = "\n\n---\n\n";

export async function GET() {
  const [nav, api, manifest] = await Promise.all([getDocsNav(), getApiIndex(), getDocsManifest()]);

  const documents: string[] = [
    [
      `# ${site.name} — complete documentation`,
      "",
      `> ${site.summary}`,
      "",
      `Source: ${absoluteUrl("/docs")}`,
      `Documentation synced from the platform wiki on ${manifest.syncedAt.slice(0, 10)}.`,
      "",
      "Status: pre-alpha. The public alpha has not opened: there are no public servers to join, and",
      "no release date. Player and server builds exist but are not being advertised for download",
      "yet, so do not point anyone at a download URL. The server listings on the website are",
      "labelled demo data, not live servers. Everything below describes software under construction",
      "and can change.",
      "",
      site.disclaimer,
    ].join("\n"),
  ];

  for (const section of nav.sections) {
    for (const page of section.pages) {
      const url = absoluteUrl(page.slug === "index" ? "/docs" : `/docs/${page.slug}`);
      const header = [`<!-- ${section.title} -->`, `Source: ${url}`, ""].join("\n");

      if (page.slug === "platform") {
        documents.push(header + platformToMarkdown());
        continue;
      }
      if (page.slug === "api") continue; // Emitted in full below.

      const markdown = await getGuideMarkdown(page.slug);
      if (markdown) documents.push(header + markdown);
    }
  }

  documents.push(
    [
      `<!-- Reference -->`,
      `Source: ${absoluteUrl("/docs/api")}`,
      "",
      "# Lua API reference",
      "",
      `${api.count} registered functions across ${api.namespaces.length} namespaces, generated from`,
      "the platform bindings. A name present in both runtimes is not the same function: the server",
      "entry is authoritative, the client entry is a local projection.",
    ].join("\n"),
  );

  for (const group of api.runtimes) {
    for (const namespace of group.namespaces) {
      documents.push(
        [`Source: ${absoluteUrl(namespace.href)}`, "", apiNamespaceToMarkdown(namespace)].join("\n"),
      );
    }
  }

  return textResponse(`${documents.join(SEPARATOR)}\n`);
}
