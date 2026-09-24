import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { ArrowRightIcon, ServerRackIcon, WindowsIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import styles from "./download-surface.module.css";

export function DownloadSurface({ children, active, artwork }: {
  children: ReactNode;
  active: "launcher" | "server";
  artwork: string;
}) {
  return (
    <>
      <main id="main" className={styles.surface}>
        <div className={styles.backdrop} aria-hidden="true">
          <Image src={artwork} alt="" fill preload sizes="100vw" />
        </div>
        <div className={styles.container}>
          <nav className={styles.switcher} aria-label="Download type">
            <Link href="/download" aria-current={active === "launcher" ? "page" : undefined}>
              <WindowsIcon size={16} /> For players <span>Launcher</span>
            </Link>
            <Link href="/host" aria-current={active === "server" ? "page" : undefined}>
              <ServerRackIcon size={16} /> For server owners <span>Dedicated server</span>
            </Link>
          </nav>
          {children}
        </div>
      </main>
      <div className={styles.footer}><SiteFooter tone="dark" /></div>
    </>
  );
}

export function SurfaceEyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span>{children}</p>;
}

export function QuickFacts({ facts }: {
  facts: { label: string; value: ReactNode; icon: ComponentType<{ size?: number }> }[];
}) {
  return (
    <ul className={styles.facts} aria-label="At a glance">
      {facts.map(({ label, value, icon: Icon }) => (
        <li key={label}><Icon size={26} /><div><span>{label}</span><strong>{value}</strong></div></li>
      ))}
    </ul>
  );
}

export function ArtworkCard({ image, label, title, children, href, action, icon: Icon, channel }: {
  image: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
  href: string;
  action: string;
  icon: ComponentType<{ size?: number }>;
  channel?: string;
}) {
  return (
    <article className={styles.artworkCard} data-channel-summary={channel}>
      <Image src={image} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" />
      <div className={styles.cardLabel}><Icon size={23} /><span>{label}</span></div>
      <h2>{title}</h2>
      <div className={styles.cardBody}>{children}</div>
      <Link href={href} className={styles.textLink}>{action}<ArrowRightIcon size={17} /></Link>
    </article>
  );
}

export function SurfaceHeading({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return <div className={styles.sectionHeading}><div><SurfaceEyebrow>{label}</SurfaceEyebrow><h2>{title}</h2></div>{children}</div>;
}

export function UnavailableRelease({ kind }: { kind: "launcher" | "server" }) {
  return <div className={styles.empty} role="status"><ServerRackIcon size={28} /><h3>{kind === "launcher" ? "Launcher" : "Server"} release temporarily unavailable.</h3><p>We couldn’t verify the current release from the CDN. No older build is substituted. Use “Check for updates” to retry.</p></div>;
}
