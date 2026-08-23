import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shared chrome of the operations console. The client-side role gate lives in
 * AdminShell; the master's admin routes are the real enforcement and answer
 * 403 admin_required regardless of what this shell chooses to render.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="adm-main" id="main">
        <div className="adm-inner">
          <AdminShell>{children}</AdminShell>
        </div>
      </main>
      <SiteFooter fineprint="Operations console — staff only." />
    </>
  );
}
