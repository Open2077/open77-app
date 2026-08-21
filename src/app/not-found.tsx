import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { mainNav } from "@/lib/site";

export const metadata = {
  title: "Page not found — OPEN//77",
  description: "This page does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <main id="main" className="page-hero page-hero-plain">
        <div className="section-inner">
          <Eyebrow>404</Eyebrow>
          <h1 className="page-title">Signal lost.</h1>
          <p className="section-lead">
            This page does not exist. It may have moved during the site rebuild, or it may never have
            existed — the project is pre-alpha and things do move.
          </p>
          <p className="hero-actions">
            <Link className="btn btn-primary" href="/">
              Back to the home page
            </Link>
            <Link className="btn btn-ghost" href="/docs">
              Documentation
            </Link>
          </p>
          <nav className="docs-sidebar" aria-label="Main sections">
            <p className="footer-col-title">Or try</p>
            {mainNav.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
