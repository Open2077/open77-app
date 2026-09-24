import { CommunityQuotaPanel } from "@/components/admin/community-quota-panel";

export const metadata = { title: "Creator publishing allowances", robots: { index: false, follow: false } };
export default function QuotasPage() { return <CommunityQuotaPanel />; }
