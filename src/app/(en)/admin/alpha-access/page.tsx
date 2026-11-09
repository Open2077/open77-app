import type { Metadata } from "next";

import { AlphaAccessPanel } from "@/components/admin/alpha-access-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin · Access history",
    description: "OPEN//77 operations console: historical grants and Open Alpha configuration.",
    path: "/admin/alpha-access",
  }),
  robots: { index: false, follow: false },
};

export default function AdminAlphaAccessPage() {
  return <AlphaAccessPanel />;
}
