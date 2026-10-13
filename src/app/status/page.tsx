import { StatusDashboard } from "@/components/status/status-dashboard";
import { Page } from "@/components/ui/page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Service status",
  description: "Live Open//77 service health, 90-day availability, response times, detected incidents and scheduled maintenance for the Master, CDN, launcher, website and Workshop.",
  path: "/status",
});

export default function StatusPage() {
  return (
    <Page tone="yellow">
      <StatusDashboard />
    </Page>
  );
}
