import type { ReactNode } from "react";
import { TrackerShell } from "@/components/dev-tracker/shared";
import { SiteFooter } from "@/components/site-footer";
export default function DevTrackerLayout({ children }: { children: ReactNode }) {
  return <><TrackerShell>{children}</TrackerShell><SiteFooter fineprint="Community proposals and staff-maintained development progress. Votes express interest, not a delivery commitment." /></>;
}
