"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand";
import { DiscordIcon, MenuIcon } from "@/components/icons";
import { mainNav, site } from "@/lib/site";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The header element survives navigation, so the menu has to close itself.
  // Adjusting during render rather than in an effect means the closed menu is
  // part of the same render as the new route, instead of a second pass that
  // briefly paints the old page's open menu over the new one.
  const [navigatedFrom, setNavigatedFrom] = useState(pathname);
  if (pathname !== navigatedFrom) {
    setNavigatedFrom(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Full-viewport sections subtract the real header height rather than guessing.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const publish = () => {
      document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} id="top">
      <div className="header-inner">
        <Wordmark />
        <nav className="main-nav" id="main-nav" aria-label="Main">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              {...(isActive(pathname, item.href) ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <span className="stage-chip" title="Current development stage">
            {site.stage}
          </span>
          {site.links.discord ? (
            <a
              className="header-discord"
              href={site.links.discord}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Join our Discord"
              title="Join our Discord"
            >
              <DiscordIcon size={17} />
            </a>
          ) : null}
          <Link className="btn btn-small btn-primary" href="/community#alpha">
            Join alpha
          </Link>
          <button
            className="nav-toggle"
            id="nav-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      <div className="header-rule" aria-hidden="true" />
      <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile" hidden={!menuOpen}>
        <Link href="/" {...(pathname === "/" ? { "aria-current": "page" as const } : {})}>
          Home
        </Link>
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            {...(isActive(pathname, item.href) ? { "aria-current": "page" as const } : {})}
          >
            {item.label}
          </Link>
        ))}
        <Link className="btn btn-primary" href="/community#alpha">
          Join alpha
        </Link>
        {site.links.discord ? (
          <a
            className="btn btn-discord"
            href={site.links.discord}
            target="_blank"
            rel="noreferrer noopener"
          >
            <DiscordIcon size={16} />
            Join our Discord
          </a>
        ) : null}
      </nav>
    </header>
  );
}
