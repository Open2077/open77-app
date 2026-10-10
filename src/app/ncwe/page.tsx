import type { Metadata } from "next";

import { NcweLanding } from "@/components/ncwe/ncwe-landing";
import styles from "@/components/ncwe/ncwe-landing.module.css";
import { SiteFooter } from "@/components/site-footer";
import { NCWE_TRAILER } from "@/lib/ncwe-release";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "NCWE, the Night City World Editor",
  description:
    "NCWE is the free world editor for Cyberpunk 2077, in open beta: fly through the real Night City, move what is there, build with roads, terrain, lights and your own models, and export ArchiveXL mods or OPEN//77 multiplayer worlds. No account needed.",
  path: "/ncwe",
  image: NCWE_TRAILER.poster,
});

export default function NcwePage() {
  return <>
    <NcweLanding />
    <div className={styles.footer}><SiteFooter tone="dark" fineprint="NCWE is in open beta and free software (GPL-3.0). It is an independent community project, unaffiliated with CD PROJEKT RED; Cyberpunk 2077 is a trademark of CD PROJEKT S.A. No game data is included." /></div>
  </>;
}
