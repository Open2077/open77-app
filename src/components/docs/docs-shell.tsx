import Link from "next/link";
import type { ReactNode } from "react";

import { DocsNav, type DocsNavGroup } from "@/components/docs/docs-nav";
import { getApiIndex } from "@/lib/api-reference";
import { docHref, getDocsNav } from "@/lib/docs";

/**
 * Builds the sidebar tree.
 *
 * `meta.json` is the source of truth for guides; the API namespaces are
 * generated, so they are attached as children of the reference entry rather
 * than hand-listed, and they only expand while the reader is inside `/docs/api`.
 */
async function buildNavGroups(): Promise<DocsNavGroup[]> {
  const [nav, api] = await Promise.all([getDocsNav(), getApiIndex()]);

  const apiChildren = api.runtimes.flatMap((group) =>
    group.namespaces.map((namespace) => ({
      href: namespace.href,
      label: `${group.label.toLowerCase()} · ${namespace.label}`,
    })),
  );

  return nav.sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.pages.map((page) => ({
      href: docHref(page.slug),
      label: page.nav,
      ...(page.slug === "api" ? { children: apiChildren } : {}),
    })),
  }));
}

export type Breadcrumb = { label: string; href?: string };

/**
 * The documentation page frame: sidebar, header block, body and optional table
 * of contents. Pages without headings worth listing pass no `toc`, which
 * collapses the grid to two columns instead of leaving a dead gutter.
 */
export async function DocsShell({
  breadcrumbs,
  title,
  lede,
  meta,
  toc,
  children,
}: {
  breadcrumbs: Breadcrumb[];
  title: string;
  lede?: string;
  meta?: ReactNode;
  toc?: ReactNode;
  children: ReactNode;
}) {
  const groups = await buildNavGroups();

  return (
    <div className={`section-inner section-inner-wide dx-grid${toc ? "" : " dx-grid-wide"}`}>
      <DocsNav groups={groups} />

      <div className="dx-main">
        <header className="dx-head">
          <nav className="dx-crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 ? <span className="dx-crumbs-sep">/</span> : null}{" "}
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
              </span>
            ))}
          </nav>
          <h1 className="dx-title">{title}</h1>
          {lede ? <p className="dx-lede">{lede}</p> : null}
          {meta ? <div className="dx-meta">{meta}</div> : null}
        </header>
        {children}
      </div>

      {toc ? (
        <aside className="dx-toc" aria-label="On this page">
          <p className="dx-nav-title">On this page</p>
          {toc}
        </aside>
      ) : null}
    </div>
  );
}
