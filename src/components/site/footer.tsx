"use client";

import { useEffect, useRef } from "react";

import { footerNav, site } from "@/lib/site";

import { Container } from "@/components/ui/container";
import { SmartLink } from "@/components/ui/smart-link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { discord, newTwitter, tiktok, twitch, youtube } from "@/components/ui/icons";
import { NUIXW_PATHS } from "@/components/ui/svg-data";

import styles from "./footer.module.css";
import socialStyles from "./socials.module.css";


const SOCIALS: Array<{ label: string; href: string | null; icon: string }> = [
  { label: "Discord", href: site.links.discord, icon: discord },
  { label: "X", href: site.links.x, icon: newTwitter },
  { label: "TikTok", href: site.links.tiktok, icon: tiktok },
  { label: "Twitch", href: site.links.twitch, icon: twitch },
  { label: "YouTube", href: site.links.youtube, icon: youtube },
];

/** The first three footer groups, each tinted with one scene colour. */
const COLUMNS = footerNav.slice(0, 3).map((group, index) => ({
  ...group,
  color: (["yellow", "blue", "red"] as const)[index],
}));

function Socials() {
  return (
    <ul className={socialStyles.socials} aria-label="Follow OPEN//77">
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
              <span data-glitch="Cyberpunk 2077 multiplayer.">Cyberpunk 2077 multiplayer.</span>
              <span data-glitch="Find a world to play in,">Find a world to play in,</span>
              <span data-glitch="or build your own.">or build your own.</span>
            </p>
            <Socials />
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title} className={styles.right} data-color={column.color}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <SmartLink href={link.href} glitch>
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className={styles.copyright}>
            <span> © 2026-2077. All rights reserved.</span>
            <span>
              {" "}
              Concept &amp; design by
              <SmartLink href="https://dribbble.com/nuixw" className={styles.nuixw} aria-label="nuixw on Dribbble">
                <svg viewBox="0 0 78 16">
                  <path d={NUIXW_PATHS[0]} />
                  <path d={NUIXW_PATHS[1]} className={styles.x} />
                </svg>
              </SmartLink>
            </span>
          </p>
        </div>
        <p className={styles.bottom}>
          OPEN//77 is an unofficial, independent community project. It is not affiliated with, endorsed by, or
          sponsored by CD PROJEKT S.A. “Cyberpunk”, “Cyberpunk 2077” and related marks are trademarks of CD PROJEKT
          S.A. Game imagery is used for illustration of a fan project. Playing on OPEN//77 will always require your own
          legal copy of Cyberpunk 2077. The platform does not accept piracy, and pirated or cracked copies are neither
          supported nor welcome.
        </p>
      </Container>
      <div ref={logoRef} className={styles.logo}>
        <Logo ref={markRef} className={styles.svg} />
      </div>
    </footer>
  );
}
