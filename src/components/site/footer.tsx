"use client";

import { useEffect, useRef } from "react";

import { site } from "@/lib/site";
import { useMessages } from "@/i18n/client";

import { Container } from "@/components/ui/container";
import { SmartLink } from "@/components/ui/smart-link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { discord, newTwitter, tiktok, twitch, youtube } from "@/components/ui/icons";
import { NUIXW_PATHS } from "@/components/ui/svg-data";
import { LanguageSelect } from "@/components/site/language-select";

import styles from "./footer.module.css";
import socialStyles from "./socials.module.css";


const SOCIALS: Array<{ label: string; href: string | null; icon: string }> = [
  { label: "Discord", href: site.links.discord, icon: discord },
  { label: "X", href: site.links.x, icon: newTwitter },
  { label: "TikTok", href: site.links.tiktok, icon: tiktok },
  { label: "Twitch", href: site.links.twitch, icon: twitch },
  { label: "YouTube", href: site.links.youtube, icon: youtube },
];

/** The three footer groups, each tinted with one scene colour. Labels come from the dictionary. */
const COLUMNS = [
  {
    key: "play",
    color: "yellow",
    links: [
      { key: "download", href: "/download" },
      { key: "servers", href: "/servers" },
      { key: "howItWorks", href: "/docs/platform#how-it-works" },
      { key: "faq", href: "/docs/platform#faq" },
    ],
  },
  {
    key: "create",
    color: "blue",
    links: [
      { key: "create", href: "/create" },
      { key: "host", href: "/host" },
      { key: "dedicated", href: "/docs/platform#dedicated-servers" },
      { key: "resources", href: "/docs/server-resources" },
      { key: "ncwe", href: "/ncwe" },
    ],
  },
  {
    key: "project",
    color: "red",
    links: [
      { key: "status", href: "/status" },
      { key: "devTracker", href: "/dev-tracker" },
      { key: "roadmap", href: "/docs/platform#roadmap" },
      { key: "devblog", href: "/devblog" },
      { key: "workshop", href: "/workshop" },
      { key: "docs", href: "/docs" },
      { key: "brand", href: "/brand" },
    ],
  },
] as const;

function Socials({ label }: { label: string }) {
  return (
    <ul className={socialStyles.socials} aria-label={label}>
      {SOCIALS.filter((social) => social.href).map((social) => (
        <li key={social.label}>
          <SmartLink href={social.href!}>
            <Icon glyph={social.icon} />
            <span>{social.label}</span>
          </SmartLink>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  const m = useMessages("chrome").footer;
  const logoRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  // The mark rises from half-hidden to seated as the foot of the page scrolls in
  // (top of the logo band at the bottom of the screen → its bottom there). Read
  // from the band's live position on every frame, never from cached offsets: the
  // footer outlives page changes, and pages grow after they load.
  useEffect(() => {
    const logo = logoRef.current;
    const mark = markRef.current;
    if (!logo || !mark) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = logo.getBoundingClientRect();
      const progress = box.height ? Math.min(1, Math.max(0, (innerHeight - box.top) / box.height)) : 1;
      mark.style.transform = `translateY(${(1 - progress) * 50}%)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <footer className={styles.footer}>
      <Container className={styles.container}>
        <div className={styles.top}>
          <div className={styles.left}>
            <p className={styles.title}>
              {m.title.map((line, index) => (
                <span key={index} data-glitch={line}>
                  {line}
                </span>
              ))}
            </p>
            <Socials label={m.follow} />
            <LanguageSelect variant="footer" className={styles.languages} />
          </div>
          {COLUMNS.map((column) => {
            const labels: Record<string, string> = m.columns[column.key];
            return (
              <div key={column.key} className={styles.right} data-color={column.color}>
                <h3>{m.columns[column.key].title}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <SmartLink href={link.href} glitch>
                        {labels[link.key] ?? link.key}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className={styles.copyright}>
            <span> {m.copyright}</span>
            <span>
              {" "}
              {m.design}
              <SmartLink href="https://dribbble.com/nuixw" className={styles.nuixw} aria-label={m.designLabel}>
                <svg viewBox="0 0 78 16">
                  <path d={NUIXW_PATHS[0]} />
                  <path d={NUIXW_PATHS[1]} className={styles.x} />
                </svg>
              </SmartLink>
            </span>
          </p>
        </div>
        <p className={styles.bottom}>{m.disclaimer}</p>
      </Container>
      <div ref={logoRef} className={styles.logo}>
        <Logo ref={markRef} className={styles.svg} />
      </div>
    </footer>
  );
}
