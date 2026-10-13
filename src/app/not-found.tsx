import NextLink from "next/link";

import { ProductHero } from "@/components/downloads/product-hero";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { arrowRight01 } from "@/components/ui/icons";
import { Page } from "@/components/ui/page";
import { Eyebrow } from "@/components/ui/typography";
import { mainNav } from "@/lib/site";

import styles from "./not-found.module.css";

export const metadata = {
  title: "Page not found · OPEN//77",
  description: "This page does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Page tone="yellow">
      <ProductHero
        titleId="not-found-title"
        titleSize="lg"
        eyebrow="Error 404 · Page not found"
        title={["Signal", "lost."]}
        accent={[1]}
        lead="This page does not exist. It may have moved during the site rebuild, or it may never have existed. The project is in Alpha and things do move."
        art={{ src: "/assets/home/night-city-wallpaper-v3.webp", position: "50% 40%" }}
        figure={{ src: "/home/img/hero-v-left.webp", width: 1092, height: 1251 }}
        watermark="404"
      >
        <div className={styles.actions}>
          <Button lines="left" href="/">
            Back to the home page
          </Button>
          <Button border lines="none" href="/docs">
            Documentation
          </Button>
        </div>
        <nav className={styles.more} aria-label="Main sections">
          <Eyebrow muted as="h2" className={styles.moreTitle}>
            Or try
          </Eyebrow>
          <ul className={styles.links}>
            {mainNav.map((item) => (
              <li key={item.href}>
                <NextLink href={item.href} className={styles.link}>
                  <span>{item.label}</span>
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
