import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { HubBar } from "./hub-bar";

/** Public Workshop only: creator/admin workspaces keep their existing layout. */
export function WorkshopShell({ children }: { children: ReactNode }) {
  return <><main id="main" className="hub-main workshop-surface">
    <HubBar /><div className="hub-wrap">{children}</div>
  </main><SiteFooter tone="dark" /></>;
}
