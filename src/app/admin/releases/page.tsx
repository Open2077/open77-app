import type { Metadata } from "next";

import { ReleasesPanel } from "@/components/admin/releases-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Releases",
    description: "OPEN//77 operations console: live builds, distribution and the anti-crack allowlist.",
    path: "/admin/releases",
  }),
  robots: { index: false, follow: false },
};

export default function AdminReleasesPage() {
  return <ReleasesPanel />;
}
