import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, ShieldIcon } from "@/components/icons";
import { AuthIcon } from "@/components/account/auth-icon";

const scenes = {
  account: { label: "PLATFORM ACCOUNT", title: "Your city.", accent: "Your account.", description: "A single home for your Open//77 identity, your creations and the servers you bring to life." },
  forgot: { label: "ACCOUNT RECOVERY", title: "Let's get", accent: "you back in.", description: "Forgot your password? Your next chapter in Night City is still here. We'll help you pick up where you left off." },
  reset: { label: "ACCOUNT RECOVERY", title: "A fresh", accent: "start.", description: "Choose a new password, then return to your account. Your profile, creations and connections stay with you." },
  verify: { label: "E-MAIL VERIFICATION", title: "Make it", accent: "official.", description: "Confirm your e-mail to finish setting up your identity and unlock server license creation." },
  launcher: { label: "DEVICE AUTHORIZATION", title: "Ready to", accent: "connect.", description: "Connect the launcher on this device to your Open//77 account. Your password stays out of the hand-off." },
  github: { label: "GITHUB CONNECTION", title: "Your work.", accent: "Connected.", description: "Link your GitHub identity to Open//77. Verify repository access and bring your releases into the Workshop." },
  warden: { label: "WARDEN AUTHORIZATION", title: "Your server.", accent: "Your control.", description: "Connect your Warden to the Workshop. Review the requested access before allowing it to prepare resource drafts." },
} as const;

export function AuthScene({ kind, children }: { kind: keyof typeof scenes; children: ReactNode }) {
  const scene = scenes[kind];
  const features = kind === "account" ? [
    { icon: "user", title: "One identity", text: "Your profile, game identities and community." },
    { icon: "server", title: "Build your world", text: "Manage server licenses and share your creations." },
    { icon: "game", title: "Find your people", text: "A different Night City on every server." },
  ] : kind === "github" || kind === "warden" || kind === "launcher" ? [
    { icon: "shield", title: "You're in control", text: "Only approve a connection you started yourself." },
    { icon: "link", title: "A clear hand-off", text: kind === "github" ? "No repository write permissions requested." : kind === "warden" ? "Choose the project and review the permissions." : "A short-lived code connects this device." },
  ] : [
    { icon: "mail", title: "Check your inbox", text: "Use the most recent e-mail from Open//77." },
    { icon: "shield", title: "Keep it personal", text: "Never share a verification or password-reset link." },
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
        <p className="auth-stage-note"><ShieldIcon size={13} /> Your account. Your control.</p>
      </div>
    </div>
    <footer className="auth-footer"><span><i aria-hidden="true" />Night City is better together.</span><Link href="/docs/alpha-access">About Alpha access <ArrowRightIcon size={13} /></Link></footer>
  </main>;
}

export function AuthLoading({ children = "Loading your account…" }: { children?: ReactNode }) {
  return <div className="auth-panel ac-card auth-loading" role="status"><span className="auth-spinner" aria-hidden="true" />{children}</div>;
}
