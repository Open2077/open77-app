import type { Metadata } from "next";

import { LicensesPanel } from "@/components/admin/licenses-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Licenses",
    description: "OPEN//77 operations console: server licenses and revocation.",
    path: "/admin/licenses",
  }),
  robots: { index: false, follow: false },
};

export default function AdminLicensesPage() {
  return <LicensesPanel />;
}
