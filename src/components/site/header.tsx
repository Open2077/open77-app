"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { LanguageSelect } from "@/components/site/language-select";
import { MusicToggle } from "@/components/site/music-toggle";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";
import { arrowRight01, discord, download02, menu09, search01, shield01, user02 } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { SmartLink } from "@/components/ui/smart-link";
import { useSession } from "@/lib/account/session";
import { site } from "@/lib/site";
import { toneForPath } from "@/lib/tone";
import { useLocale, useLocalizeHref, useMessages, useRoutePath } from "@/i18n/client";
import { rich } from "@/i18n/format";

import styles from "./header.module.css";

/** Split around the centred logo: four links on each side. */
const NAV = {
  left: [
    { key: "download", href: "/download" },
    { key: "servers", href: "/servers" },
    { key: "create", href: "/create" },
    { key: "docs", href: "/docs" },
  ],
  right: [
    { key: "devblog", href: "/devblog" },
    { key: "status", href: "/status" },
    { key: "devTracker", href: "/dev-tracker" },
    { key: "ncwe", href: "/ncwe" },
  ],
} as const;

/** Everything the menu lists beyond the bar. */
const MORE = [
  { key: "workshop", href: "/workshop" },
  { key: "host", href: "/host" },
  { key: "luaApi", href: "/docs/api" },
  { key: "alpha", href: "/docs/alpha-access" },
] as const;

/** Destinations for quick navigation (Ctrl / ⌘ K). The words come from the dictionary. */
const SHORTCUTS = [
  { href: "/servers", key: "servers" },
  { href: "/download", key: "download" },
  { href: "/create", key: "create" },
  { href: "/host", key: "host" },
  { href: "/docs", key: "docs" },
  { href: "/docs/api", key: "api" },
  { href: "/workshop", key: "workshop" },
  { href: "/ncwe", key: "ncwe" },
  { href: "/dev-tracker", key: "devTracker" },
  { href: "/status", key: "status" },
  { href: "/devblog", key: "devblog" },
  { href: "/docs/alpha-access", key: "alpha" },
  { href: "/account", key: "account" },
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function Header() {
  // Routes compare without the language prefix; links get it back through `localize`.
  const pathname = useRoutePath();
  const locale = useLocale();
  const localize = useLocalizeHref();
  const m = useMessages("chrome");
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

  const terms = query.trim().toLocaleLowerCase(locale);
  const shortcuts = SHORTCUTS.map((item) => ({ href: item.href, ...m.shortcuts[item.key] }));
  const results = shortcuts.filter((item) =>
    `${item.title} ${item.detail} ${item.keywords}`.toLocaleLowerCase(locale).includes(terms),
  );
  const menuLinks = [...NAV.left, ...NAV.right].map((item) => ({ href: item.href, label: m.nav[item.key] }));

  return (
    <>
      <header className={cx(styles.header, menuOpen && styles.menuOpen)} style={style}>
        <SmartLink href="/" className={styles.logo} aria-label={m.homeLabel}>
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
            aria-label={m.discord}
          />
          <Button
            lines="none"
            icon={download02}
            iconOnly
            className={styles.button}
            href="/download"
            aria-label={m.downloadLauncherLabel}
          />
          <MusicToggle className={styles.button} />
        </div>
        <nav className={styles.nav} aria-label={m.mainNav}>
          {Object.entries(NAV).map(([side, items]) => (
            <ul key={side} className={styles.list}>
              {items.map((item) => (
                <li key={item.href}>
                  <SmartLink href={item.href} glitch aria-current={current(item.href)}>
                    {m.nav[item.key]}
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
              aria-label={menuOpen ? m.closeMenu : m.openMenu}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
            />
          </div>
          {isAdmin ? (
            <Button
              lines="none"
              icon={shield01}
              iconOnly
              className={cx(styles.button, styles.admin)}
              href="/admin"
              aria-label={m.adminConsole}
              title={m.adminConsole}
              aria-current={current("/admin")}
            />
          ) : null}
          <Button
            lines="none"
            icon={user02}
            iconOnly
            className={styles.button}
            border
            href="/account"
            aria-label={session ? m.yourAccount : m.signIn}
            title={session ? m.yourAccount : m.signIn}
          />
          <LanguageSelect className={styles.button} />
        </div>
      </header>

      <div id="site-menu" className={styles.menu} hidden={!menuOpen} style={style}>
        <nav className={styles.menuNav} aria-label={m.menuNav}>
          <ol className={styles.menuList}>
            {menuLinks.map((item, index) => (
              <li key={item.href}>
                <NextLink href={localize(item.href)} aria-current={current(item.href)} onClick={() => setMenuOpen(false)}>
                  <span className={styles.menuIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.menuLabel} data-glitch={item.label}>
                    {item.label}
                  </span>
                </NextLink>
              </li>
            ))}
          </ol>
          <ul className={styles.menuMore}>
            {[
              ...MORE.map((item) => ({ href: item.href, label: m.more[item.key] })),
              ...(isAdmin ? [{ label: m.more.admin, href: "/admin" }] : []),
              { label: session ? m.more.account : m.more.signIn, href: "/account" },
            ].map(
              (item) => (
                <li key={item.href}>
                  <NextLink href={localize(item.href)} aria-current={current(item.href)} onClick={() => setMenuOpen(false)}>
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
                <Glitch>{m.more.search}</Glitch>
                <Icon glyph={search01} />
              </button>
            </li>
          </ul>
          <div className={styles.menuCta}>
            <Button lines="left" href="/download" size="lg">
              {m.downloadLauncher}
            </Button>
            <LanguageSelect className={styles.menuLanguage} variant="menu" />
          </div>
        </nav>
      </div>

      <Dialog ref={searchRef} eyebrow={m.search.eyebrow} title={m.search.title} onClose={() => setQuery("")}>
        <label className={styles.searchField}>
          <Icon glyph={search01} />
          <span className="sr-only">{m.search.label}</span>
          <input
            autoFocus
            type="search"
            placeholder={m.search.placeholder}
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
              <NextLink key={item.href} href={localize(item.href)} onClick={() => searchRef.current?.close()}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <Icon glyph={arrowRight01} />
              </NextLink>
            ))
          ) : (
            <p className={styles.searchEmpty}>{m.search.empty}</p>
          )}
        </div>
        <p className={styles.searchHint}>{rich(m.search.hint, { kbd: (chunk) => <kbd>{chunk}</kbd> })}</p>
      </Dialog>
    </>
  );
}
