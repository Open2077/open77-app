import type { Metadata } from "next";
import { IncidentsPanel } from "@/components/admin/incidents-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Admin — Crash reports", description: "Private Open77 incident investigation workspace.", path: "/admin/incidents" }),
  robots: { index: false, follow: false },
};
export default async function AdminIncidentsPage({ searchParams }: { searchParams: Promise<{ incidentId?: string }> }) {
  const { incidentId = "" } = await searchParams;
  const validId = /^[a-f0-9-]{36}$/i.test(incidentId) ? incidentId : "";
  return <IncidentsPanel key={validId} initialIncidentId={validId} />;
}
