import type { ReactNode } from "react";

/**
 * Renders the inline Markdown found in the API JSON's prose fields.
 *
 * Those summaries and descriptions are authored as Markdown, because their
 * other destination is a Markdown file. Rendered as plain text they show their
 * own syntax: 181 of the 258 descriptions put backticks around an identifier,
 * so most of the reference would read `` `world.vehicles` `` instead of
 * `world.vehicles`.
 *
 * Only the two constructs that actually occur are handled — inline code and
 * bold — rather than running 500 short strings through the full remark
 * pipeline. `scripts/check-api-markup.mjs` fails if anything else shows up, so
 * the shortcut cannot quietly stop being true.
 *
 * The result is React nodes rather than an HTML string, so nothing in this path
 * can inject markup.
 */
const TOKEN = /`([^`]+)`|\*\*([^*]+)\*\*/g;

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

    const [, code, bold] = match;
    if (code !== undefined) nodes.push(<code key={key++}>{code}</code>);
    else if (bold !== undefined) nodes.push(<strong key={key++}>{renderInlineMarkdown(bold)}</strong>);

    cursor = start + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
