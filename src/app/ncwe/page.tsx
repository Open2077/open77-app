import type { Metadata } from "next";

import { NcweBeta } from "@/components/ncwe/ncwe-beta";
import { SiteFooter } from "@/components/site-footer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "NCWE closed beta",
  description:
    "NCWE, the Night City World Editor: edit Cyberpunk 2077's city, import your own models and export ArchiveXL mods or OPEN//77 worlds. Apply to the closed beta with your OPEN//77 account.",
  path: "/ncwe",
});

export default function NcwePage() {
  return <>
    <NcweBeta />
    <SiteFooter tone="dark" fineprint="NCWE is in closed beta. Applications are reviewed by the OPEN//77 team; access is given through the OPEN//77 Discord." />
  </>;
}
