import type { ReactNode } from "react";

/**
 * Renders the inline Markdown found in the API JSON's prose fields.
 *
 * Those summaries and descriptions are authored as Markdown, because their
 * other destination is a Markdown file. Rendered as plain text they show their
 * own syntax: 937 of the 1,190 descriptions put backticks around an identifier,
 * so most of the reference would read `` `world.vehicles` `` instead of
 * `world.vehicles`.
 *
 * Only the three constructs that actually occur are handled — inline code,
 * bold and a link to another guide — rather than running 1,200 short strings
 * through the full remark pipeline. `scripts/check-api-markup.mjs` fails if
 * anything else shows up, so the shortcut cannot quietly stop being true.
 *
 * The result is React nodes rather than an HTML string, so nothing in this path
 * can inject markup.
 */
const TOKEN = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * The site route for a link the extractor copied out of a wiki guide.
 *
 * Those read `vehicles.md#seats`, exactly as they do in the Markdown pipeline
 * (`remarkRewriteWikiLinks` in `src/lib/docs.ts`). A target this function does
 * not recognise gets no link at all rather than a guessed URL: the label still
 * reads correctly, and the reference never ships a 404.
 */
function guideHref(target: string): string | null {
  if (/^(https?:|\/)/.test(target)) return target;
  if (target.startsWith("#")) return target;
  const [file = "", hash] = target.split("#");
  if (!file.endsWith(".md") || file.includes("/")) return null;
  const slug = file.slice(0, -3);
  const base = slug === "README" ? "/docs" : `/docs/${slug}`;
  return hash ? `${base}#${hash}` : base;
}

export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInlineMarkdown(text)}</>;
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));

    const [, code, bold, linkText, linkTarget] = match;
    if (code !== undefined) nodes.push(<code key={key++}>{code}</code>);
    else if (bold !== undefined) nodes.push(<strong key={key++}>{renderInlineMarkdown(bold)}</strong>);
    else if (linkText !== undefined) {
      const href = guideHref(linkTarget ?? "");
      nodes.push(
        href
          ? <a key={key++} href={href}>{renderInlineMarkdown(linkText)}</a>
          : <span key={key++}>{renderInlineMarkdown(linkText)}</span>,
      );
    }

    cursor = start + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
