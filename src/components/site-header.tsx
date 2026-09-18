"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand";
import { ArrowRightIcon, CrossIcon, DiscordIcon, DownloadIcon, MenuIcon, SearchIcon, ShieldIcon } from "@/components/icons";
import { useSession } from "@/lib/account/session";
import { mainNav, site } from "@/lib/site";

const SHORTCUTS = [
  { href: "/download", title: "Download launcher", detail: "Install Open//77 and start playing", keywords: "play client windows install" },
  { href: "/servers", title: "Community servers", detail: "Find your next Night City", keywords: "browse roleplay racing pvp" },
  { href: "/create", title: "Create your server", detail: "Your world. Your rules.", keywords: "build host hosting" },
  { href: "/host", title: "Download dedicated server", detail: "Windows & Linux · Alpha access", keywords: "hosting release" },
  { href: "/docs", title: "Documentation", detail: "Guides, resources and getting started", keywords: "help learn tutorial lua" },
  { href: "/docs/api", title: "Lua API reference", detail: "Search the client and server APIs", keywords: "functions vehicles players native scripting" },
  { href: "/workshop", title: "Workshop", detail: "Explore community creations", keywords: "mods packages resources community" },
  { href: "/devblog", title: "Devblog", detail: "Follow the project", keywords: "news updates" },
  { href: "/docs/alpha-access", title: "Alpha access", detail: "How to play, host and build", keywords: "apply discord join access" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

export function SiteHeader() {
  const pathname = usePathname();
  const isDocumentation = pathname === "/docs" || pathname.startsWith("/docs/");
  const { session } = useSession();
  const isAdmin = session?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDialogElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [navigatedFrom, setNavigatedFrom] = useState(pathname);
  if (pathname !== navigatedFrom) {
    setNavigatedFrom(pathname);
    setMenuOpen(false);
  }

  useEffect(() => { searchRef.current?.close(); }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    if (!menuOpen) return () => document.body.classList.remove("nav-open");
    const onKey = (event: KeyboardEvent) => {
      if (searchRef.current?.open) return;
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
      if (event.key === "Tab") {
        const elements = Array.from(headerRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [])
          .filter((element) => element.getClientRects().length > 0 && !element.closest("dialog"));
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const onResize = () => { if (window.innerWidth > 1270) setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    // Documentation has its own single navigation bar. Re-measure the main
    // header when returning to the site, including through client navigation.
    if (isDocumentation) {
      document.documentElement.style.setProperty("--header-h", "0px");
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 16);
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        // The docs have their own search shortcut. Never steal keys from an editor.
        if (window.location.pathname.startsWith("/docs") || (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable=true]"))) return;
        event.preventDefault();
        searchRef.current?.showModal();
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    const header = headerRef.current;
    const publish = () => {
      if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    };
    publish();
    const observer = new ResizeObserver(publish);
    if (header) observer.observe(header);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [isDocumentation]);

  const results = SHORTCUTS.filter((item) => (item.title + " " + item.detail + " " + item.keywords).toLowerCase().includes(query.trim().toLowerCase()));
  const current = (href: string) => isActive(pathname, href) ? "page" as const : undefined;

  if (isDocumentation) return null;

  return (
    <header ref={headerRef} className={"site-header liquid-header" + (scrolled ? " is-scrolled" : "") + (menuOpen ? " is-open" : "")} id="top">
      <svg className="liquid-optics" aria-hidden="true" focusable="false" width="0" height="0">
        <defs>
          <filter id="open77-nav-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.028" numOctaves="1" seed="8" result="glass-noise" />
            <feGaussianBlur in="glass-noise" stdDeviation="2" result="glass-flow" />
            <feDisplacementMap in="SourceGraphic" in2="glass-flow" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div className="liquid-bar" onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--glass-x", ((event.clientX - rect.left) / rect.width * 100).toFixed(1) + "%");
      }}>
        <Wordmark tone="dark" />
        <nav className="liquid-nav" id="main-nav" aria-label="Main">
          {mainNav.map((item) => <Link key={item.href} href={item.href} aria-current={current(item.href)}>{item.label}</Link>)}
        </nav>
        <div className="liquid-actions">
          <button className="liquid-icon liquid-search-trigger" aria-label="Search the site" title="Quick navigation (Ctrl / ⌘ K)" onClick={() => searchRef.current?.showModal()}><SearchIcon size={19} /></button>
          <span className="liquid-divider" aria-hidden="true" />
          {site.links.discord && <a className="liquid-icon liquid-discord" href={site.links.discord} target="_blank" rel="noreferrer noopener" aria-label="Join our Discord"><DiscordIcon size={24} /></a>}
          <Link className="liquid-pill liquid-alpha" href="/docs/alpha-access">Alpha<span aria-hidden="true" /></Link>
          {isAdmin && <Link className="liquid-pill liquid-admin" href="/admin" aria-label="Admin" aria-current={current("/admin")}><ShieldIcon size={16} />Admin</Link>}
          <Link className="liquid-pill liquid-account" href="/account" aria-label="Account" aria-current={current("/account")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
            Account
          </Link>
          <Link className="liquid-download" href="/download">Download launcher<DownloadIcon size={17} /></Link>
          <button ref={menuToggleRef} className="liquid-icon liquid-toggle" id="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <CrossIcon size={21} /> : <MenuIcon size={22} />}</button>
        </div>
      </div>
      <nav className="liquid-mobile" id="mobile-nav" aria-label="Mobile" hidden={!menuOpen}>
        <p>YOUR NEXT DESTINATION</p>
        {[{ href: "/", label: "Home" }, ...mainNav, { href: "/docs/alpha-access", label: "Alpha access" }, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []), { href: "/account", label: "Account" }].map((item) => <Link key={item.href} href={item.href} aria-current={current(item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRightIcon /></Link>)}
        <Link className="liquid-download" href="/download" onClick={() => setMenuOpen(false)}>Download launcher<DownloadIcon size={18} /></Link>
      </nav>
      <dialog ref={searchRef} className="liquid-search" aria-labelledby="quick-nav-title" onClose={() => setQuery("")}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); searchRef.current?.close(); } }}
        onClick={(event) => { if (event.target === event.currentTarget) searchRef.current?.close(); }}>
        <div className="liquid-search-head"><h2 id="quick-nav-title">Where to next?</h2><button className="liquid-icon" aria-label="Close search" onClick={() => searchRef.current?.close()}><CrossIcon size={20} /></button></div>
        <label className="liquid-search-field"><SearchIcon size={20} /><span className="sr-only">Search pages and tools</span><input autoFocus type="search" placeholder="Search pages and tools…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="liquid-search-results" aria-live="polite">
          {results.length ? results.map((item) => <Link key={item.href} href={item.href} onClick={() => searchRef.current?.close()}><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRightIcon size={18} /></Link>) : <p>No destination found. Try “server”, “Lua” or “Alpha”.</p>}
        </div>
        <div className="liquid-search-foot"><span>OPEN//77 · QUICK NAVIGATION</span><span><kbd>esc</kbd> to close</span></div>
      </dialog>
    </header>
  );
}
