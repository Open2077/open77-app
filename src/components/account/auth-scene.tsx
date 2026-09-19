import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, ShieldIcon } from "@/components/icons";
import { AuthIcon } from "@/components/account/auth-icon";

const scenes = {
  account: { label: "PLATFORM ACCOUNT", title: "Your", accent: "account.", description: "One account for the whole platform — the server browser, your game identities, your Workshop creations, and the license keys your servers run on." },
  forgot: { label: "PLATFORM ACCOUNT", title: "Forgot your", accent: "password?", description: "It happens. We'll e-mail you a single-use link to choose a new one." },
  reset: { label: "PLATFORM ACCOUNT", title: "Set a new", accent: "password.", description: "You followed a reset link from your inbox — choose the new password for your account and sign in with it." },
  verify: { label: "PLATFORM ACCOUNT", title: "Verify your", accent: "e-mail.", description: "One click and your address is confirmed — verification is required before you can create server license keys." },
  launcher: { label: "LAUNCHER", title: "Authorize your", accent: "launcher.", description: "Connect the OPEN//77 launcher running on this device to your platform account. The launcher never sees your password." },
  github: { label: "CREATOR CONNECTIONS", title: "Connect", accent: "GitHub.", description: "Verify your public identity and import release assets into the Workshop, without granting write access to your repositories." },
  warden: { label: "CREATOR CONNECTIONS", title: "Connect your", accent: "Warden.", description: "Let your server's Warden prepare Workshop resource drafts under your account. Review exactly what it asks for before you approve it." },
} as const;

export function AuthScene({ kind, children }: { kind: keyof typeof scenes; children: ReactNode }) {
  const scene = scenes[kind];
  const features = kind === "account" ? [
    { icon: "user", title: "One account", text: "Your profile, your linked game identities, your Workshop creations." },
    { icon: "server", title: "Server license keys", text: "Mint, inspect and revoke the keys your dedicated servers register with." },
    { icon: "game", title: "Alpha access", text: "Play on community servers and download the dedicated server." },
  ] : kind === "github" || kind === "warden" || kind === "launcher" ? [
    { icon: "shield", title: "Approve only what you started", text: "If you did not open this page from the launcher, GitHub or your Warden, close it." },
    { icon: "link", title: "What is exchanged", text: kind === "github" ? "Read access to your public identity and releases — no write permissions." : kind === "warden" ? "A scoped token for the project you pick, revocable from your account." : "A short-lived code; your password never leaves this page." },
  ] : [
    { icon: "mail", title: "Use the latest e-mail", text: "Links are single-use and expire after a short while." },
    { icon: "shield", title: "Keep the link to yourself", text: "Nobody from OPEN//77 will ever ask you for it." },
  ];
  return <main id="main" className="auth-scene" data-auth-scene={kind}>
    <div className="auth-scenery" aria-hidden="true"><Image src="/assets/auth/night-city-login-v2.webp" alt="" fill sizes="100vw" preload /></div>
    <div className="auth-layout">
      <section className="auth-intro" aria-labelledby="auth-title">
        <p className="auth-eyebrow"><span aria-hidden="true">{"//"}</span>{scene.label}</p>
        <h1 id="auth-title">{scene.title}<span>{scene.accent}</span></h1>
        <p className="auth-description">{scene.description}</p>
        <ul className="auth-benefits">{features.map(feature => <li key={feature.title}>
          <span className="auth-benefit-icon"><AuthIcon name={feature.icon} /></span>
          <span><strong>{feature.title}</strong><span>{feature.text}</span></span>
        </li>)}</ul>
      </section>
      <div className="auth-stage">
        {children}
        <p className="auth-stage-note"><ShieldIcon size={13} /> Accounts run against the OPEN//77 master server.</p>
      </div>
    </div>
    <footer className="auth-footer"><span><i aria-hidden="true" />Creating an account is free. Alpha access is a separate step to play and host.</span><Link href="/docs/alpha-access">How Alpha access works <ArrowRightIcon size={13} /></Link></footer>
  </main>;
}

export function AuthLoading({ children = "Loading your account…" }: { children?: ReactNode }) {
  return <div className="auth-panel ac-card auth-loading" role="status"><span className="auth-spinner" aria-hidden="true" />{children}</div>;
}
