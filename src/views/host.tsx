import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { CtaLink } from "@/components/downloads/cta-link";
import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import {
  ArrowLink,
  Checklist,
  Faq,
  FeatureGrid,
  ReleaseStatus,
  SpecStrip,
  Steps,
  UnavailableRelease,
} from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { ServerBuilds } from "@/components/host/server-builds";
import { UnstableDownloads } from "@/components/host/unstable-downloads";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, code, key01, serverStack01, shield01, tick02, userGroup } from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow } from "@/components/ui/typography";
import { LOCALE_INFO, localizeHref, type Locale } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { GAME_BUILD } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease } from "@/lib/server-release";

import styles from "./host.module.css";

export function hostMetadata(locale: Locale) {
  const m = getMessages(locale).host;
  return pageMetadata({ title: m.metaTitle, description: m.metaDescription, path: "/host", locale });
}

const TOOL_LINKS = [
  { icon: shield01, href: "/docs/warden" },
  { icon: code, href: "/docs/api" },
  { icon: serverStack01, href: "/docs/server-resources" },
  { icon: windowsGlyph, href: "/download" },
];

export async function HostView({ locale }: { locale: Locale }) {
  // Never bake a mutable release pointer into an ISR/build-time snapshot.
  await connection();
  const [release, unstable] = await Promise.all([fetchLatestServerRelease(), fetchLatestServerRelease("unstable")]);
  const messages = getMessages(locale);
  const m = messages.host;
  const common = messages.common;
  const languageTag = LOCALE_INFO[locale].tag;
  const link = (href: string) =>
    function LinkTag(chunk: ReactNode) {
      return <Link href={localizeHref(href, locale)}>{chunk}</Link>;
    };
  const tags = {
    strong: (chunk: ReactNode) => <strong>{chunk}</strong>,
    code: (chunk: ReactNode) => <code>{chunk}</code>,
    keys: link("/account/keys"),
    guide: link("/docs/host-a-server"),
    status: link("/status"),
    licensing: link("/docs/server-licensing"),
  };
  const vars = { requirement: fill(common.requirementShort, { build: GAME_BUILD, expansion: common.expansion }) };

  return (
    <Page tone="blue">
      <ProductHero
        titleId="host-title"
        eyebrow={m.eyebrow}
        title={m.title}
        accent={m.accent}
        lead={rich(m.lead, tags)}
        className={styles.hero}
        art={{ src: "/home/img/creators-bg.webp", position: "30% 50%" }}
        figure={{ src: "/home/img/server-creators.webp", width: 1827, height: 1423, kind: "object" }}
        strip={
          <SpecStrip
            label={common.atAGlance}
            facts={[
              { icon: windowsGlyph, label: m.facts.windowsLabel, value: m.facts.windowsValue },
              { icon: linuxGlyph, label: m.facts.linuxLabel, value: m.facts.linuxValue },
              { icon: userGroup, label: m.facts.whoLabel, value: m.facts.whoValue },
              { icon: serverStack01, label: m.facts.runsLabel, value: m.facts.runsValue },
            ]}
          />
        }
      >
        <div className={styles.actions}>
          <CtaLink href="#download" icon={arrowDown01} lines size="lg">
            {m.getServer}
          </CtaLink>
          <Button color="blue" border lines="none" icon={key01} iconPosition="left" href="/account/keys">
            {m.licenseKeys}
          </Button>
        </div>
        <div className={styles.heroFoot}>
          <ArrowLink href="/docs/host-a-server">{m.fullGuide}</ArrowLink>
          <p className={styles.heroNote}>
            <Icon glyph={shield01} />
            {m.officialNote}
          </p>
        </div>
      </ProductHero>

      <Section id="download" className={styles.download}>
        <div className={styles.downloadHead}>
          <div className={styles.downloadIntro}>
            <Eyebrow>{m.download.eyebrow}</Eyebrow>
            <Display size="md" lines={m.download.title} accent={m.download.accent} />
            <p className={styles.downloadLead}>{m.download.lead}</p>
            <ArrowLink href="/create">{m.download.createLink}</ArrowLink>
          </div>
          <ul className={styles.archive}>
            {m.download.archive.map((item) => (
              <li key={item}>
                <span className={styles.archiveTick} aria-hidden="true">
                  <Icon glyph={tick02} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {release ? (
          <ServerBuilds release={release} m={m.builds} languageTag={languageTag} common={common} />
        ) : (
          <UnavailableRelease kind="server" text={common.unavailable} />
        )}
        <UnstableDownloads key={unstable?.version ?? "unavailable"} available={Boolean(unstable)} m={m.unstable}>
          {unstable ? <ServerBuilds release={unstable} m={m.builds} languageTag={languageTag} common={common} /> : null}
        </UnstableDownloads>
        <ReleaseStatus className={styles.status} note={m.download.statusNote}>
          <ReleaseRefresh labels={common.releaseRefresh} />
        </ReleaseStatus>
      </Section>

      <Section id="start" eyebrow={m.start.eyebrow} title={m.start.title} lead={m.start.lead}>
        <Steps steps={m.start.steps.map((step) => ({ title: step.title, body: <p>{rich(step.body, tags)}</p> }))} />
        <Notice kind="info" title={m.start.noticeTitle} className={styles.notice}>
          {rich(m.start.notice, tags)}
        </Notice>
      </Section>

      <Section id="requirements" eyebrow={m.requirements.eyebrow} title={m.requirements.title}>
        <div className={styles.requirementsGrid}>
          <Checklist
            items={m.requirements.items.map((item) => ({ title: item.title, body: rich(item.body, tags, vars) }))}
          />
          <div>
            <Eyebrow muted className={styles.faqLabel}>
              {m.requirements.questions}
            </Eyebrow>
            <Faq items={m.requirements.faq.map((entry) => ({ q: entry.q, a: rich(entry.a, tags, vars) }))} />
          </div>
        </div>
      </Section>

      <Section id="tools" eyebrow={m.tools.eyebrow} title={m.tools.title}>
        <FeatureGrid
          items={m.tools.items.map((item, index) => ({
            icon: TOOL_LINKS[index]?.icon ?? code,
            href: TOOL_LINKS[index]?.href,
            title: item.title,
            body: item.body,
            action: item.action,
          }))}
          columns={4}
        />
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode(
            [
              { name: messages.meta.home, path: "/" },
              { name: m.breadcrumb, path: "/host" },
            ],
            locale,
          ),
        )}
      />
    </Page>
  );
}
