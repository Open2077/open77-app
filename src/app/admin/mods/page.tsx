import type { Metadata } from "next";

import { ModsPanel } from "@/components/admin/mods-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Mods",
    description: "OPEN//77 operations console: the mod whitelist, by SHA-256.",
    path: "/admin/mods",
  }),
  robots: { index: false, follow: false },
};

export default function AdminModsPage() {
  return <ModsPanel />;
}
