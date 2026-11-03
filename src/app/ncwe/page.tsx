import type { Metadata } from "next";

import { NcweLanding } from "@/components/ncwe/ncwe-landing";
import { Page } from "@/components/ui/page";
import { NCWE_RELEASE, NCWE_TRAILER } from "@/lib/ncwe-release";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `NCWE ${NCWE_RELEASE.version}, the Night City World Editor`,
  description:
    `Download NCWE Studio ${NCWE_RELEASE.version}, the stable world editor for Cyberpunk 2077. Edit Night City, build with roads, terrain, lights and your own models, and export ArchiveXL mods or OPEN//77 multiplayer worlds. Free, no account needed.`,
  path: "/ncwe",
  image: NCWE_TRAILER.poster,
});

export default function NcwePage() {
  return (
    <Page tone="blue">
      <NcweLanding />
    </Page>
  );
}
