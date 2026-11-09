import type { Metadata } from "next";
import { HighlightsPanel } from "@/components/admin/highlights-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Admin · Highlights", description: "Schedule launcher events and server promotions.", path: "/admin/highlights" }),
  robots: { index: false, follow: false },
};
export default function AdminHighlightsPage() { return <HighlightsPanel />; }
