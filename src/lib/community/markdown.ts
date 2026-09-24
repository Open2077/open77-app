import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root } from "hast";

// HTML is discarded by remark-rehype (allowDangerousHtml is never enabled).
// External images belong in the processed media gallery, not author Markdown.
function communityLinks() {
  return (tree: Root) => {
    visit(tree, "element", node => {
      if (node.tagName === "img") {
        const alt = typeof node.properties.alt === "string" ? node.properties.alt : "";
        node.tagName = "span"; node.properties = {}; node.children = [{ type: "text", value: alt }];
      }
      if (node.tagName !== "a") return;
      const href = typeof node.properties.href === "string" ? node.properties.href : "";
      let valid = href.startsWith("#");
      try {
        const url = new URL(href);
        valid = url.protocol === "https:" && !url.username && !url.password;
      } catch { /* Only same-page anchors or absolute HTTPS links are accepted. */ }
      if (!valid) { node.tagName = "span"; node.properties = {}; }
      else node.properties.rel = ["nofollow", "ugc", "noopener", "noreferrer"];
    });
  };
}

export async function communityMarkdown(source: string) {
  if (source.length > 50_000) throw new Error("Community description is too large.");
  return String(await unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
    .use(communityLinks).use(rehypeStringify).process(source));
}
