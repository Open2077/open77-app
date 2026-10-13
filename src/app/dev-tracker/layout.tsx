import type { ReactNode } from "react";

import { TrackerShell } from "@/components/dev-tracker/shared";

export default function DevTrackerLayout({ children }: { children: ReactNode }) {
  return <TrackerShell>{children}</TrackerShell>;
}
