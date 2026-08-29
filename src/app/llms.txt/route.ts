import { getApiIndex } from "@/lib/api-reference";
import { blogMarkdownHref, getBlogPosts } from "@/lib/devblog";
import {
  docHref,
  docMarkdownHref,
  getDocsManifest,
  getDocsNav,
  getDocsPages,
} from "@/lib/docs";
import { textResponse } from "@/lib/markdown-response";
import { absoluteUrl, site } from "@/lib/site";

/**
 * `llms.txt` — a map of the site for language models.
 *
 * Follows the llms.txt convention: an H1 with the project name, a blockquote
 * summary, then link lists grouped by section. It is an index, not a corpus;
 * `llms-full.txt` is the corpus.
 *
 * Every entry points at the Markdown twin rather than the HTML page, because a
 * model that follows one of these links should get the text, not a parsed DOM.
 * The pre-alpha status and the demo-data caveat are stated up front: an answer
 * engine summarising this site should not tell someone they can download and
 * play it tonight.
 */
export const dynamic = "force-static";

export async function GET() {
  const [nav, pages, api, manifest, posts] = await Promise.all([
    getDocsNav(),
    getDocsPages(),
    getApiIndex(),
    getDocsManifest(),
    getBlogPosts(),
  ]);

  const lines: string[] = [
    `# ${site.name}`,
    "",
    `> ${site.summary}`,
    "",
    "## Status",
    "",
    "- Stage: pre-alpha. The Windows launcher is downloadable at /download; the public alpha has",
    "  not opened and there is no release date.",
    "- The server browser at /servers is populated with clearly labelled demo data, not live servers.",
    "- The documentation describes software under construction; APIs can change.",
    "- Unaffiliated with CD PROJEKT RED. Playing requires your own legal copy of Cyberpunk 2077.",
    `- Documentation synced from the platform wiki on ${manifest.syncedAt.slice(0, 10)}.`,
    "",
    "## Site",
    "",
    `- [Home](${absoluteUrl("/")}): what the platform is, for players and for server owners.`,
    `- [Download](${absoluteUrl("/download")}): the Windows launcher — current version, SHA-256, requirements and first run.`,
    `- [Server browser](${absoluteUrl("/servers")}): directory UI, currently demo listings.`,
    `- [Create a server](${absoluteUrl("/create")}): what hosting an OPEN//77 world will involve.`,
    `- [Community](${absoluteUrl("/community")}): how to follow the project and join the alpha.`,
    `- [Brand kit](${absoluteUrl("/brand")}): logo, mark, colours and social assets.`,
    `- [Devblog](${absoluteUrl("/devblog")}): development updates as they ship, one post per working day.`,
    "",
  ];

  if (posts.length > 0) {
    lines.push("## Devblog", "");
    for (const post of posts) {
      lines.push(
        `- [${post.title}](${absoluteUrl(blogMarkdownHref(post.slug))}): ${post.description}`,
      );
    }
    lines.push("");
  }

  for (const section of nav.sections) {
    lines.push(`## ${section.title}`, "");
    for (const page of section.pages) {
      lines.push(
        `- [${page.title ?? page.nav}](${absoluteUrl(docMarkdownHref(page.slug))}): ${page.description}`,
      );
    }
    lines.push("");
  }

  lines.push("## API reference by namespace", "");
  for (const group of api.runtimes) {
    lines.push(`### ${group.label} runtime — ${group.count} functions`, "", group.blurb, "");
    for (const namespace of group.namespaces) {
      lines.push(
        `- [${namespace.label}](${absoluteUrl(namespace.markdownHref)}): ${
          namespace.entries.length
        } function${namespace.entries.length === 1 ? "" : "s"}.`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Optional",
    "",
    `- [Complete documentation in one file](${absoluteUrl("/llms-full.txt")}): every guide and the whole API reference concatenated.`,
    `- [Complete API reference](${absoluteUrl("/docs/api.md")}): all ${api.count} functions in one Markdown document.`,
    `- [HTML documentation index](${absoluteUrl(docHref("index"))}): the same content as web pages.`,
    `- [Site source](${site.links.siteRepo}): the repository this site is built from.`,
    ...(site.links.platformRepo
      ? [`- [Platform source](${site.links.platformRepo}): the repository the documentation is generated from.`]
      : [
          "- The platform repository is not public yet, so guides that reference files outside the wiki name the path instead of linking to it.",
        ]),
    "",
    `Pages indexed: ${pages.length} documentation pages, ${api.namespaces.length} API namespaces.`,
    "",
  );

  return textResponse(lines.join("\n"));
}
