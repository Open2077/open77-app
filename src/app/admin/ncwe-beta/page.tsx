import type { Metadata } from "next";
import { NcweBetaPanel } from "@/components/admin/ncwe-beta-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Admin · NCWE beta", description: "Review NCWE closed beta applications.", path: "/admin/ncwe-beta" }),
  robots: { index: false, follow: false },
};

export default function AdminNcweBetaPage() {
  return <NcweBetaPanel />;
}
