"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DocsNavItem = {
  href: string;
  label: string;
  /** Rendered nested and collapsed unless the reader is inside this branch. */
  children?: { href: string; label: string }[];
};

export type DocsNavGroup = { id: string; title: string; items: DocsNavItem[] };

/**
 * The documentation sidebar.
 *
 * A client component purely so the active entry can be derived from the current
 * path; the markup is still part of the prerendered HTML, so the full set of
 * documentation links is crawlable from every docs page.
 */
export function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="dx-nav" aria-label="Documentation">
      {groups.map((group) => (
        <div className="dx-nav-group" key={group.id}>
          <p className="dx-nav-title">{group.title}</p>
          <ul className="dx-nav-list">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const inBranch = active || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} {...(active ? { "aria-current": "page" } : {})}>
                    {item.label}
                  </Link>
                  {inBranch && item.children && item.children.length > 0 ? (
                    <ul className="dx-nav-sub">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            {...(pathname === child.href ? { "aria-current": "page" } : {})}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
