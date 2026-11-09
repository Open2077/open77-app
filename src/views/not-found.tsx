import NextLink from "next/link";

import { ProductHero } from "@/components/downloads/product-hero";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { arrowRight01 } from "@/components/ui/icons";
import { Page } from "@/components/ui/page";
import { Eyebrow } from "@/components/ui/typography";
import { localizeHref, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

import styles from "./not-found.module.css";

/** The main sections offered from a 404, labelled like the header. */
const SECTIONS = [
  { href: "/download", key: "download" },
  { href: "/servers", key: "servers" },
  { href: "/create", key: "create" },
  { href: "/docs", key: "docs" },
  { href: "/devblog", key: "devblog" },
  { href: "/ncwe", key: "ncwe" },
  { href: "/status", key: "status" },
  { href: "/dev-tracker", key: "devTracker" },
] as const;

export function notFoundMetadata(locale: Locale) {
  const m = getMessages(locale).notFound;
  return {
    // Absolute: the message already ends with the site name, and the 404 renders
    // both inside the layouts' "%s · OPEN//77" template and outside it.
    title: { absolute: m.metaTitle },
    description: m.metaDescription,
    robots: { index: false, follow: true },
  };
}

export function NotFoundView({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const m = messages.notFound;
  return (
    <Page tone="yellow">
      <ProductHero
        titleId="not-found-title"
        titleSize="lg"
        eyebrow={m.eyebrow}
        title={m.title}
        accent={m.accent}
        lead={m.lead}
        art={{ src: "/assets/home/night-city-wallpaper-v3.webp", position: "50% 40%" }}
        figure={{ src: "/home/img/hero-v-left.webp", width: 1092, height: 1251 }}
        watermark="404"
      >
        <div className={styles.actions}>
          <Button lines="left" href="/">
            {m.home}
          </Button>
          <Button border lines="none" href="/docs">
            {m.docs}
          </Button>
        </div>
        <nav className={styles.more} aria-label={m.sections}>
          <Eyebrow muted as="h2" className={styles.moreTitle}>
            {m.orTry}
          </Eyebrow>
          <ul className={styles.links}>
            {SECTIONS.map((item) => (
              <li key={item.href}>
                <NextLink href={localizeHref(item.href, locale)} className={styles.link}>
                  <span>{messages.chrome.nav[item.key]}</span>
                  <Icon glyph={arrowRight01} />
                </NextLink>
              </li>
            ))}
          </ul>
        </nav>
      </ProductHero>
    </Page>
  );
}
