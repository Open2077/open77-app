import Link from "next/link";
import type { ComponentType } from "react";

import { Logotype } from "@/components/brand";
import { DiscordIcon, TikTokIcon, XIcon } from "@/components/icons";
import { footerNav, site } from "@/lib/site";

/** Social links carry their mark; every other footer link stays plain text. */
const SOCIAL_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  Discord: DiscordIcon,
  "X / Twitter": XIcon,
  TikTok: TikTokIcon,
};

/**
 * `fineprint` is the one line that changes per page: each surface states which
 * of its own contents are not real yet, next to the content in question.
 */
export function SiteFooter({ fineprint }: { fineprint?: string }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="wordmark" href="/" aria-label="OPEN//77 home">
            <Logotype />
          </Link>
          <p className="footer-tag">{site.tagline}</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          {footerNav.map((column) => (
            <div className="footer-col" key={column.title}>
              <p className="footer-col-title">{column.title}</p>
              {column.links.map((link) => {
                if (!link.href.startsWith("http")) {
                  return (
                    <Link key={link.href + link.label} href={link.href}>
                      {link.label}
                    </Link>
                  );
                }
                const Icon = SOCIAL_ICONS[link.label];
                return (
                  <a
                    key={link.href + link.label}
                    className="footer-social"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {Icon ? <Icon size={13} /> : null}
                    {link.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="footer-legal">
        <p>{site.disclaimer}</p>
        <p className="footer-fine">
          {fineprint ?? "Pre-alpha. No public build exists yet."}
        </p>
      </div>
    </footer>
  );
}
