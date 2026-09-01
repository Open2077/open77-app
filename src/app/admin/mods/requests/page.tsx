import type { Metadata } from "next";

import { ModRequestsPanel } from "@/components/admin/mod-requests-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Mod review queue",
    description: "OPEN//77 operations console: owner-submitted mod review requests.",
    path: "/admin/mods/requests",
  }),
  robots: { index: false, follow: false },
};

export default function AdminModRequestsPage() {
  return <ModRequestsPanel />;
}
