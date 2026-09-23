import { SiteFooter } from "@/components/site-footer";
import { StatusDashboard } from "@/components/status/status-dashboard";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Service status",
  description: "Live Open//77 service health, 90-day availability, response times, detected incidents and scheduled maintenance for the Master, CDN, launcher, website and Workshop.",
  path: "/status",
});

export default function StatusPage() {
  return <>
    <StatusDashboard />
    <SiteFooter fineprint="Status reflects automated checks from the stated monitoring location, not a guarantee of availability from every network." />
  </>;
}
