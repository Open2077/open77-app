import type { Metadata } from "next";

import { AuditPanel } from "@/components/admin/audit-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Audit log",
    description: "OPEN//77 operations console: the platform audit trail.",
    path: "/admin/audit",
  }),
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return <AuditPanel />;
}
