import type { Metadata } from "next";

import { BansPanel } from "@/components/admin/bans-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Bans",
    description: "OPEN//77 operations console: platform and server bans.",
    path: "/admin/bans",
  }),
  robots: { index: false, follow: false },
};

export default function AdminBansPage() {
  return <BansPanel />;
}
