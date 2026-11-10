import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import { ArrowLink, ArtCard, FeatureGrid, SpecStrip, Steps } from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Icon } from "@/components/ui/icon";
import { code, discord, informationCircle, serverStack01, shield01, userGroup } from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Video } from "@/components/ui/video";
import { localizeHref, type Locale } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { GAME_BUILD } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

import styles from "./create.module.css";

function requirement(locale: Locale): string {
  const common = getMessages(locale).common;
  return fill(common.requirementShort, { build: GAME_BUILD, expansion: common.expansion });
}

export function createMetadata(locale: Locale) {
  const m = getMessages(locale).create;
  return pageMetadata({
    title: m.metaTitle,
    description: fill(m.metaDescription, { requirement: requirement(locale) }),
    path: "/create",
    locale,
  });
}

const EXPERIENCE_IMAGES = [
  "/home/img/server-roleplay.webp",
  "/home/img/server-racing.webp",
  "/home/img/server-custom-worlds.webp",
];

const BENEFIT_LINKS = [
  { icon: serverStack01, href: "/docs/host-a-server" },
  { icon: shield01, href: "/docs/warden" },
  { icon: code, href: "/docs/server-resources" },
  { icon: userGroup, href: "/servers" },
];

export function CreateView({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const m = messages.create;
  const link = (href: string) =>
    function LinkTag(chunk: ReactNode) {
      return <Link href={localizeHref(href, locale)}>{chunk}</Link>;
    };
  const tags = {
    strong: (chunk: ReactNode) => <strong>{chunk}</strong>,
    host: link("/host"),
    keys: link("/account/keys"),
    licensing: link("/docs/server-licensing"),
    requirements: link("/docs/platform#requirements"),
  };

  return (
    <Page tone="blue">
      <ProductHero
        titleId="create-title"
        eyebrow={m.eyebrow}
        title={m.title}
        accent={m.accent}
        lead={rich(m.lead, tags)}
        className={styles.hero}
        art={{ src: "/home/img/creators-bg.webp", position: "70% 50%" }}
        figure={{ src: "/home/img/creators-character.webp", width: 1261, height: 1253 }}
        strip={
          <SpecStrip
            label={messages.common.atAGlance}
            facts={[
              { icon: windowsGlyph, label: m.facts.windowsLabel, value: m.facts.windowsValue },
              { icon: linuxGlyph, label: m.facts.linuxLabel, value: m.facts.linuxValue },
              { icon: code, label: m.facts.scriptingLabel, value: m.facts.scriptingValue },
              { icon: serverStack01, label: m.facts.hostingLabel, value: m.facts.hostingValue },
            ]}
          />
        }
      >
        <div className={styles.actions}>
          {/* The direct, account-free download entry point (scripts/check-host-access.mjs). */}
          <Button color="blue" lines="left" href="/host">{m.downloadServer}</Button>
          <Button color="blue" border lines="none" href="/docs/host-a-server">
            {m.hostingGuide}
          </Button>
          <ArrowLink href="/docs/platform#dedicated-servers">{m.technicalDocs}</ArrowLink>
        </div>
        <p className={styles.heroNote}>
          <Icon glyph={informationCircle} />
          {fill(m.requirementsNote, { requirement: requirement(locale) })}
        </p>
      </ProductHero>

      <Section id="experiences" eyebrow={m.experiences.eyebrow} title={m.experiences.title} lead={m.experiences.lead}>
        <div className={styles.experiences}>
          {m.experiences.cards.map((experience, index) => (
            <ArtCard
              key={experience.title}
              image={EXPERIENCE_IMAGES[index] ?? EXPERIENCE_IMAGES[0]!}
              sub={experience.sub}
              title={experience.title}
            >
              <p>{experience.body}</p>
            </ArtCard>
          ))}
        </div>
        <ul className={styles.modes} aria-label={m.experiences.modesLabel}>
          {m.experiences.modes.map((mode) => (
            <li key={mode}>
              <Tag tone="neutral">{mode}</Tag>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="benefits" className={styles.benefitsSection}>
        <div className={styles.benefits}>
          <div className={styles.benefitsCopy}>
            <Eyebrow>{m.benefits.eyebrow}</Eyebrow>
            <Display size="lg" lines={m.benefits.title} accent={m.benefits.accent} className={styles.benefitsTitle} />
            <FeatureGrid
              items={m.benefits.items.map((item, index) => ({
                icon: BENEFIT_LINKS[index]?.icon ?? code,
                href: BENEFIT_LINKS[index]?.href,
                title: item.title,
                body: item.body,
                action: item.action,
              }))}
              columns={2}
            />
          </div>
          <div className={styles.rack} aria-hidden="true">
            <GlitchFrame>
              <Image
                src="/home/img/server-creators.webp"
                alt=""
                width={1827}
                height={1423}
                sizes="(max-width: 1084px) 90vw, 40vw"
                quality={100}
                draggable={false}
              />
            </GlitchFrame>
          </div>
        </div>
      </Section>

      <Section id="how" eyebrow={m.how.eyebrow} title={m.how.title}>
        <Steps steps={m.how.steps.map((step) => ({ title: step.title, body: <p>{rich(step.body, tags)}</p> }))} />
        <Notice kind="info" title={m.how.noticeTitle} className={styles.notice}>
          {rich(m.how.notice, tags)}
        </Notice>
      </Section>

      <section id="alpha-access" className={styles.band} aria-labelledby="alpha-title">
        <div className={styles.bandArt} aria-hidden="true">
          <Video id="hero" />
        </div>
        <div className={styles.bandInner}>
          <Eyebrow>{m.band.eyebrow}</Eyebrow>
          <Display id="alpha-title" size="lg" lines={m.band.title} accent={m.band.accent} />
          <p className={styles.bandText}>{m.band.text}</p>
          <div className={styles.actions}>
            <Button
              color="blue"
              lines="left"
              icon={discord}
              iconPosition="left"
              href={site.links.discord ?? "https://discord.gg/open77"}
            >
              {m.band.discord}
            </Button>
            <Button color="blue" border lines="none" href="/docs/alpha-access">
              {m.band.guide}
            </Button>
          </div>
        </div>
      </section>

      <Section id="builders" eyebrow={m.builders.eyebrow} title={m.builders.title} lead={m.builders.lead}>
        <div className={styles.actions}>
          <Button color="blue" border lines="none" href="/docs/server-resources">
            {m.builders.serverDocs}
          </Button>
          <Button color="neutral" border lines="none" href="/docs/server-licensing">
            {m.builders.licensing}
          </Button>
          <ArrowLink href="/docs/api">{m.builders.api}</ArrowLink>
        </div>
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode(
            [
              { name: messages.meta.home, path: "/" },
              { name: m.breadcrumb, path: "/create" },
            ],
            locale,
          ),
        )}
      />
    </Page>
  );
}
