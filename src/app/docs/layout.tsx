import type { ReactNode } from "react";

import Link from "next/link";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsTheme } from "@/components/docs/docs-theme";
import { getDocsSearchIndex } from "@/lib/docs";
import { getApiIndex, stripInlineMarkdown } from "@/lib/api-reference";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const [guides, api] = await Promise.all([getDocsSearchIndex(), getApiIndex()]);
  const search = [
    ...guides.map((guide) => ({ title: guide.nav, description: guide.description, category: guide.section, href: guide.href })),
    ...api.entries.map((entry) => ({ title: entry.qualified, description: stripInlineMarkdown(entry.summary), category: `${entry.runtime} API`, href: `/docs/api#${entry.runtime}/${entry.namespaceSlug}/${entry.anchor}` })),
  ];
  return (
    <DocsTheme>
      <DocsHeader entries={search} />
      <main id="main" className="dx">
        {children}
      </main>
      <footer className="docs-footer">
        <span>OPEN//77 documentation <span aria-hidden="true">·</span> Built for creators.</span>
        <div><Link href="/">Back to website ↗</Link><a href="/docs.md">Markdown</a><span>Pre-alpha</span></div>
      </footer>
    </DocsTheme>
  );
}
