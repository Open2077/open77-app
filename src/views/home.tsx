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
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { breadcrumbNode, jsonLdGraph, pageMetadata, softwareApplicationNode, withLanguage } from "@/lib/seo";

export function homeMetadata(locale: Locale) {
  return pageMetadata({ description: getMessages(locale).meta.description, path: "/", locale });
}

/**
 * Home page: the hero, the three audience columns, then the players, server
 * creators and developers scenes on one horizontal track.
 */
export function HomeView({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={{ home: messages.home }}>
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
        <JsonLd
          data={jsonLdGraph(
            withLanguage(softwareApplicationNode(), locale),
            breadcrumbNode([{ name: messages.home.breadcrumb, path: "/" }], locale),
          )}
        />
      </HomeShell>
    </I18nProvider>
  );
}
