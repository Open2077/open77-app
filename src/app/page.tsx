import { Background } from "@/components/home/background";
import { Closing } from "@/components/home/closing";
import { Creators } from "@/components/home/creators";
import { Developers } from "@/components/home/developers";
import { Hero } from "@/components/home/hero";
import { HomeShell } from "@/components/home/home-shell";
import { HorizontalScroll } from "@/components/home/horizontal-scroll";
import { Players } from "@/components/home/players";
import { Progress } from "@/components/home/progress";
import { Section } from "@/components/home/section";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbNode, jsonLdGraph, pageMetadata, softwareApplicationNode } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({ description: site.description, path: "/" });

/**
 * Home page: the hero, the three audience columns, then the players, server
 * creators and developers scenes on one horizontal track.
 */
export default function HomePage() {
  return (
    <HomeShell>
      <Background>
        <Hero />
        <Section />
        <HorizontalScroll footer={<Progress />}>
          <Players />
          <Creators />
          <Developers />
        </HorizontalScroll>
        <Closing />
      </Background>
      <JsonLd data={jsonLdGraph(softwareApplicationNode(), breadcrumbNode([{ name: "Home", path: "/" }]))} />
    </HomeShell>
  );
}
