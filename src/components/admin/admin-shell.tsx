"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthPanel } from "@/components/account/auth-panel";
import { Eyebrow } from "@/components/brand";
import { ShieldIcon } from "@/components/icons";
import { useSession } from "@/lib/account/session";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/servers", label: "Servers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/licenses", label: "Licenses" },
  { href: "/admin/bans", label: "Bans" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

/**
 * Chrome and gate of the operations console.
 *
 * The role check here is presentation only — every admin route on the master
 * re-checks the session per request and answers 403 `admin_required`. The
 * gate's job is a clean staff experience: sign-in when signed out, an honest
 * denial for non-administrators, and the console for staff.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const pathname = usePathname();

  const head = (
    <header>
      <Eyebrow>OPERATIONS</Eyebrow>
      <div className="adm-head">
        <h1 className="adm-title">Admin console.</h1>
        {session ? (
          <p className="adm-operator">
            operator: <strong>{session.email ?? session.displayName}</strong>
          </p>
        ) : null}
      </div>
      <div className="adm-rule" aria-hidden="true" />
    </header>
  );

  if (!ready) {
    return (
      <>
        {head}
        <p className="ac-loading">Loading…</p>
      </>
    );
  }

  if (!session) {
    return (
      <>
        {head}
        <p className="ac-notice" style={{ marginBottom: 16 }}>
          <ShieldIcon size={15} />
          <span>The operations console requires a staff sign-in.</span>
        </p>
        <AuthPanel />
      </>
    );
  }

  if (session.role !== "admin") {
    return (
      <>
        {head}
        <div className="adm-denied">
          <h2>
            <ShieldIcon size={19} />
            Administrator account required
          </h2>
          <p>
            You are signed in as <strong>{session.email ?? session.displayName}</strong>, which is
            not an administrator account. If you believe you should have access, contact the
            platform team. Your own account lives at <Link href="/account">/account</Link>.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <nav className="adm-nav" aria-label="Admin sections">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            {...(pathname === item.href ? { "aria-current": "page" as const } : {})}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
