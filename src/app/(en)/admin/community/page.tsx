import { permanentRedirect } from "next/navigation";

export const metadata = { title: "Workshop review queue", robots: { index: false, follow: false } };
export default function CommunityReviewPage() { permanentRedirect("/admin/resources"); }
