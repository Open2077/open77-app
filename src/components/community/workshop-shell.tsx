import type { ReactNode } from "react";

import { Page } from "@/components/ui/page";
import { HubBar } from "./hub-bar";

import styles from "./workshop-shell.module.css";

/** Public Workshop only: creator/admin workspaces keep their own layout. */
export function WorkshopShell({ children }: { children: ReactNode }) {
  return (
    <Page tone="blue" className={styles.shell}>
      <HubBar />
      <div className={styles.body} data-workshop-surface>
        {children}
      </div>
    </Page>
  );
}
