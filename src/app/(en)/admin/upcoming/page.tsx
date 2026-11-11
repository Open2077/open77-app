import type { Metadata } from "next";
import { UpcomingReviewsPanel } from "@/components/admin/upcoming-reviews-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Admin · Upcoming requests", description: "Review owner-submitted upcoming community server announcements.", path: "/admin/upcoming" }),
  robots: { index: false, follow: false },
};
export default function AdminUpcomingPage() { return <UpcomingReviewsPanel />; }
