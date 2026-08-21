import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main id="main" className="dx">
        {children}
      </main>
      <SiteFooter fineprint="Pre-alpha. The documentation is synced from the platform wiki and describes software still under construction — APIs can change." />
    </>
  );
}
