"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { footerNav, site } from "@/lib/site";

import { Container } from "@/components/ui/container";
import { SmartLink } from "@/components/ui/smart-link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { discord, newTwitter, tiktok, twitch, youtube } from "@/components/ui/icons";
import { NUIXW_PATHS } from "@/components/ui/svg-data";

import styles from "./footer.module.css";
import socialStyles from "./socials.module.css";

gsap.registerPlugin(ScrollTrigger);

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

  useGSAP(() => {
    gsap.fromTo(
      markRef.current,
      { yPercent: 50 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: logoRef.current, start: "top bottom", end: "bottom bottom", scrub: true },
      },
    );
  });

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
