import Link from "next/link";

import { CodeIcon } from "@/components/icons";

/**
 * Points machine readers at the machine-readable copy of the page.
 *
 * Answer engines and coding agents do better with Markdown than with a parsed
 * DOM, and there is no discovery mechanism for it beyond saying so: the same
 * URL is also advertised in the page metadata as an `alternate` of type
 * `text/markdown`, but a visible link is what actually gets followed.
 */
export function AgentNote({ markdownHref }: { markdownHref: string }) {
  return (
    <p className="dx-agent-note">
      <CodeIcon size={13} />
      For agents and LLMs:{" "}
      <a href={markdownHref}>this page as Markdown</a>
      {" · "}
      <Link href="/llms.txt">llms.txt</Link>
      {" · "}
      <Link href="/llms-full.txt">llms-full.txt</Link>
    </p>
  );
}
