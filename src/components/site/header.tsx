"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { MusicToggle } from "@/components/site/music-toggle";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";
import { arrowRight01, discord, download02, menu09, search01, user02 } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { SmartLink } from "@/components/ui/smart-link";
import { useSession } from "@/lib/account/session";
import { site } from "@/lib/site";
import { toneForPath } from "@/lib/tone";

import styles from "./header.module.css";

/** Split around the centred logo: four links on each side. */
const NAV = {
  left: [
    { label: "Download", href: "/download" },
    { label: "Servers", href: "/servers" },
    { label: "Create server", href: "/create" },
    { label: "Docs", href: "/docs" },
  ],
  right: [
    { label: "Devblog", href: "/devblog" },
    { label: "Status", href: "/status" },
    { label: "Dev Tracker", href: "/dev-tracker" },
    { label: "NCWE", href: "/ncwe" },
  ],
} as const;

/** Everything the menu lists beyond the bar. */
const MORE = [
  { label: "Workshop", href: "/workshop" },
  { label: "Host a server", href: "/host" },
  { label: "Lua API", href: "/docs/api" },
  { label: "Alpha access", href: "/docs/alpha-access" },
] as const;

/** Destinations for quick navigation (Ctrl / ⌘ K). */
const SHORTCUTS = [
  { href: "/servers", title: "Server browser", detail: "Every community server, live", keywords: "browse roleplay racing pvp servers" },
  { href: "/download", title: "Download launcher", detail: "Signs you in, checks your game, installs the mod", keywords: "play client windows install" },
  { href: "/create", title: "Create a server", detail: "Run your own Night City", keywords: "build host hosting" },
  { href: "/host", title: "Download dedicated server", detail: "Windows & Linux · Alpha access", keywords: "hosting release" },
  { href: "/docs", title: "Documentation", detail: "Play, host and build: every guide", keywords: "help learn tutorial lua" },
  { href: "/docs/api", title: "Lua API reference", detail: "Search the client and server APIs", keywords: "functions vehicles players native scripting" },
  { href: "/workshop", title: "Workshop", detail: "Community resources, ready to install", keywords: "resources scripts mods library" },
  { href: "/ncwe", title: "Map Editor", detail: "NCWE, the Night City World Editor · open beta", keywords: "ncwe editor mapping world builder maps download archivexl" },
  { href: "/dev-tracker", title: "Dev Tracker", detail: "Ideas, community votes and development progress", keywords: "roadmap feedback suggestions forum" },
  { href: "/status", title: "Service status", detail: "Live health, uptime and incidents", keywords: "outage availability cdn master downloads maintenance" },
  { href: "/devblog", title: "Devblog", detail: "What shipped, one post per working day", keywords: "news updates" },
  { href: "/docs/alpha-access", title: "Alpha access", detail: "/alpha apply on Discord to play, host and build", keywords: "apply discord join access" },
  { href: "/account", title: "Account", detail: "Profile, keys, saved servers and creations", keywords: "login sign in profile settings" },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function Header() {
  const pathname = usePathname();
  const { session } = useSession();
  const isAdmin = session?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<DialogHandle>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState(pathname);
  if (route !== pathname) {
    setRoute(pathname);
    setMenuOpen(false);
  }

  // The home page drives the active colour from its scenes; every other page
  // takes the tone of its section.
  const style = pathname === "/" ? undefined : ({ "--active-color": `var(--${toneForPath(pathname)})` } as CSSProperties);
  const current = (href: string) => (isCurrent(pathname, href) ? ("page" as const) : undefined);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      // The docs keep this shortcut for their own search; never steal it from a field.
      if (window.location.pathname.startsWith("/docs")) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      searchRef.current?.open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.querySelector("button")?.focus();
    };
    const onResize = () => {
      if (window.innerWidth > 1250) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  const terms = query.trim().toLowerCase();
  const results = SHORTCUTS.filter((item) =>
    `${item.title} ${item.detail} ${item.keywords}`.toLowerCase().includes(terms),
  );
  const menuLinks = [...NAV.left, ...NAV.right];

  return (
    <>
      <header className={cx(styles.header, menuOpen && styles.menuOpen)} style={style}>
        <SmartLink href="/" className={styles.logo} aria-label={`${site.name} home`}>
          <Logo />
        </SmartLink>
        <div className={cx(styles.buttons, styles.buttonsLeft)}>
          <Button
            lines="none"
            icon={discord}
            iconOnly
            className={styles.button}
            border
            href={site.links.discord ?? undefined}
            aria-label="Discord"
          />
          <Button
            lines="none"
            icon={download02}
            iconOnly
            className={styles.button}
            href="/download"
            aria-label="Download the launcher"
          />
          <MusicToggle className={styles.button} />
        </div>
        <nav className={styles.nav} aria-label="Main">
          {Object.entries(NAV).map(([side, items]) => (
            <ul key={side} className={styles.list}>
              {items.map((item) => (
                <li key={item.href}>
                  <SmartLink href={item.href} glitch aria-current={current(item.href)}>
                    {item.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          ))}
        </nav>
        <div className={styles.buttons}>
          <div ref={menuButtonRef} className={styles.menuToggle}>
            <Button
              lines="none"
              icon={menu09}
              iconOnly
              className={cx(styles.button, styles.buttonNav)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
            />
          </div>
          <Button
            lines="none"
            icon={user02}
            iconOnly
            className={styles.button}
            border
            href="/account"
            aria-label={session ? "Your account" : "Sign in"}
            title={session ? "Your account" : "Sign in"}
          />
        </div>
      </header>

      <div id="site-menu" className={styles.menu} hidden={!menuOpen} style={style}>
        <nav className={styles.menuNav} aria-label="Menu">
          <ol className={styles.menuList}>
            {menuLinks.map((item, index) => (
              <li key={item.href}>
                <NextLink href={item.href} aria-current={current(item.href)} onClick={() => setMenuOpen(false)}>
                  <span className={styles.menuIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.menuLabel} data-glitch={item.label}>
                    {item.label}
                  </span>
                </NextLink>
              </li>
            ))}
          </ol>
          <ul className={styles.menuMore}>
            {[...MORE, ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []), { label: session ? "Account" : "Sign in", href: "/account" }].map(
              (item) => (
                <li key={item.href}>
                  <NextLink href={item.href} aria-current={current(item.href)} onClick={() => setMenuOpen(false)}>
                    <Glitch>{item.label}</Glitch>
                    <Icon glyph={arrowRight01} />
                  </NextLink>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  searchRef.current?.open();
                }}
              >
                <Glitch>Search</Glitch>
                <Icon glyph={search01} />
              </button>
            </li>
          </ul>
          <div className={styles.menuCta}>
            <Button lines="left" href="/download" size="lg">
              Download launcher
            </Button>
          </div>
        </nav>
      </div>

      <Dialog ref={searchRef} eyebrow="Quick navigation" title="Go to" onClose={() => setQuery("")}>
        <label className={styles.searchField}>
          <Icon glyph={search01} />
          <span className="sr-only">Search pages and tools</span>
          <input
            autoFocus
            type="search"
            placeholder="Search pages and tools…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // A search field clears itself on the first Escape; the hint promises one press closes.
              if (event.key === "Escape") {
                event.preventDefault();
                searchRef.current?.close();
              }
            }}
          />
        </label>
        <div className={styles.searchResults} aria-live="polite">
          {results.length ? (
            results.map((item) => (
              <NextLink key={item.href} href={item.href} onClick={() => searchRef.current?.close()}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <Icon glyph={arrowRight01} />
              </NextLink>
            ))
          ) : (
            <p className={styles.searchEmpty}>No destination found. Try “server”, “Lua” or “Alpha”.</p>
          )}
        </div>
        <p className={styles.searchHint}>
          <kbd>esc</kbd> to close · <kbd>Ctrl</kbd> <kbd>K</kbd> to open from anywhere
        </p>
      </Dialog>
    </>
  );
}
