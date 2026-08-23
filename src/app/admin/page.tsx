import type { Metadata } from "next";

import { OverviewPanel } from "@/components/admin/overview-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Overview",
    description: "OPEN//77 operations console: platform metrics and latest activity.",
    path: "/admin",
  }),
  robots: { index: false, follow: false },
};

export default function AdminOverviewPage() {
  return <OverviewPanel />;
}
