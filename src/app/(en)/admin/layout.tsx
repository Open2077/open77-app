import type { ReactNode } from "react";

import { AuthMessages } from "@/components/account/auth-messages";
import { AdminShell } from "@/components/admin/admin-shell";
import { Page } from "@/components/ui/page";

/**
 * Shared chrome of the operations console. The client-side role gate lives in
 * AdminShell; the master's admin routes are the real enforcement and answer
 * 403 admin_required regardless of what this shell chooses to render.
 *
 * Staff pages take the developers' tone (red); the root layout renders the
 * site header and footer around them.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Page tone="red">
      {/* Signed out, the console shows the account sign-in panel. */}
      <AuthMessages locale="en">
        <AdminShell>{children}</AdminShell>
      </AuthMessages>
    </Page>
  );
}
