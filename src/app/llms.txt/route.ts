import { getApiIndex } from "@/lib/api-reference";
import { blogMarkdownHref, getBlogPosts } from "@/lib/devblog";
import {
  docHref,
  docMarkdownHref,
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
 * Preview availability and account approval are stated together. Downloads,
 * directory visibility and permission to join a world are different things.
 */
export const dynamic = "force-static";

export async function GET() {
  const [nav, pages, api, posts] = await Promise.all([
    getDocsNav(),
    getDocsPages(),
    getApiIndex(),
    getBlogPosts(),
  ]);

  const lines: string[] = [
    `# ${site.name}`,
    "",
    `> ${site.summary}`,
    "",
    "## Status",
    "",
    `- ${site.previewNotice}`,
    "- The Windows player launcher is available at /download. Approved preview accounts and staff",
    "  can access Windows/Linux dedicated-server downloads at /host, with Freeroam and system resources.",
    "- /servers reads the live master directory. Any explicitly labelled demo view is illustrative only.",
    "- Account registration or downloading the launcher does not grant approval to join worlds.",
    "- Unaffiliated with CD PROJEKT RED. Playing requires your own legal copy of Cyberpunk 2077.",
    "",
    "## Site",
    "",
    `- [Home](${absoluteUrl("/")}): what the platform is, for players and for server owners.`,
    `- [Download](${absoluteUrl("/download")}): the current Windows launcher, requirements and first run; joining requires account approval.`,
    `- [Server browser](${absoluteUrl("/servers")}): live master directory.`,
    `- [Create a server](${absoluteUrl("/create")}): Developer Preview applications and hosting.`,
    `- [Host a server](${absoluteUrl("/host")}): Windows/Linux server downloads for approved preview accounts and staff.`,
    `- [Workshop](${absoluteUrl("/workshop")}): community-made resources, gamemodes, maps and tools for servers, free to download.`,
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

  let previousGroup = "";
  for (const section of nav.sections) {
    if (section.group !== previousGroup) {
      lines.push(`## ${section.group}`, "");
      previousGroup = section.group;
    }
    lines.push(`### ${section.title}`, "", section.description, "");
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
