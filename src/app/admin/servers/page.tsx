import type { Metadata } from "next";

import { ServersPanel } from "@/components/admin/servers-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Servers",
    description: "OPEN//77 operations console: live servers, licenses and owners.",
    path: "/admin/servers",
  }),
  robots: { index: false, follow: false },
};

export default function AdminServersPage() {
  return <ServersPanel />;
}
