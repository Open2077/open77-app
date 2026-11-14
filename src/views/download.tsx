import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { DownloadAction } from "@/components/downloads/download-action";
import { windowsGlyph } from "@/components/downloads/glyphs";
import {
  ArrowLink,
  ArtCard,
  Checklist,
  Faq,
  FileDetails,
  JumpLink,
  ReleaseStatus,
  SpecStrip,
  Steps,
} from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { JsonLd } from "@/components/json-ld";
import { ReleaseRefresh } from "@/components/release-refresh";
import { Tag } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Icon } from "@/components/ui/icon";
import {
  checkmarkBadge01,
  checkmarkCircle02,
  download02,
  gameController03,
  layers01,
  play,
  shield01,
} from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow, Lead } from "@/components/ui/typography";
import { localizeHref, type Locale } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import type { Messages } from "@/i18n/types";
import type { LauncherRelease } from "@/lib/launcher-release";
import { GAME_BUILD } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, launcherApplicationNode, pageMetadata } from "@/lib/seo";
import { fetchLatestServerRelease } from "@/lib/server-release";
import { site } from "@/lib/site";

import styles from "./download.module.css";

export function downloadMetadata(locale: Locale) {
  const m = getMessages(locale).download;
  return pageMetadata({ title: m.metaTitle, description: m.metaDescription, path: "/download", locale });
}

const DISCORD = site.links.discord ?? "https://discord.gg/open77";

const LAUNCHER_VERSION = "0.2.9";
const LAUNCHER_BASE = `https://cdn.open77.dev/launcher-rune/${LAUNCHER_VERSION}`;
const WINDOWS_FILE = `OPEN77-Setup-${LAUNCHER_VERSION}-x64.exe`;
const release: LauncherRelease = {
  version: LAUNCHER_VERSION,
  url: `${LAUNCHER_BASE}/${WINDOWS_FILE}`,
  fileName: WINDOWS_FILE,
  sha256: null,
  sizeBytes: null,
  publishedAtUtc: null,
};

const JOB_ICONS = [shield01, checkmarkCircle02, download02, layers01, play];

/** The tags translators can use in this page's rich messages, and what they render. */
function pageTags(locale: Locale) {
  const link = (href: string) =>
    function LinkTag(chunk: ReactNode) {
      return <Link href={localizeHref(href, locale)}>{chunk}</Link>;
    };
  return {
    strong: (chunk: ReactNode) => <strong>{chunk}</strong>,
    em: (chunk: ReactNode) => <em>{chunk}</em>,
    code: (chunk: ReactNode) => <code>{chunk}</code>,
    guide: link("/docs/launcher"),
    authorize: link("/launcher"),
    servers: link("/servers"),
    host: link("/host"),
    create: link("/create"),
    alpha: link("/docs/alpha-access"),
    discord: (chunk: ReactNode) => (
      <a href={DISCORD} target="_blank" rel="noreferrer noopener">
        {chunk}
      </a>
    ),
  };
}

export async function DownloadView({ locale }: { locale: Locale }) {
  // Read each channel independently at request time; never substitute one version for another.
  await connection();
  const serverRelease = await fetchLatestServerRelease();
  const messages = getMessages(locale);
  const m = messages.download;
  const common = messages.common;
  const tags = pageTags(locale);
  const vars = {
    build: GAME_BUILD,
    expansion: common.expansion,
    requirement: fill(common.requirementShort, { build: GAME_BUILD, expansion: common.expansion }),
  };

  return (
    <Page tone="yellow">
        <ProductHero
          titleId="download-title"
          eyebrow={m.eyebrow}
          title={m.title}
          accent={m.accent}
          lead={rich(m.lead, tags, vars)}
          className={styles.hero}
          art={{ src: "/home/img/players-bg.webp", position: "60% 50%" }}
          figure={{ src: "/home/img/hero-v-right.webp", width: 1784, height: 2048 }}
          strip={
            <SpecStrip
              label={common.atAGlance}
              facts={[
                { icon: windowsGlyph, label: m.facts.platformLabel, value: "Windows / Linux · x64" },
                { icon: gameController03, label: m.facts.buildLabel, value: fill(m.facts.buildValue, vars) },
                { icon: checkmarkBadge01, label: m.facts.expansionLabel, value: common.expansion },
              ]}
            />
          }
        >
          <div id="get" className={styles.get}>
            <LauncherDownload m={m.preview} details={m.release} />
          </div>
          <div className={styles.heroLinks}>
            <JumpLink href="#requirements">{m.jump.requirements}</JumpLink>
            <JumpLink href="#alpha">{m.jump.alpha}</JumpLink>
            <ArrowLink href="/docs/launcher">{m.jump.guide}</ArrowLink>
          </div>
        </ProductHero>

        <Section id="alpha" eyebrow={m.alpha.eyebrow} title={m.alpha.title} lead={rich(m.alpha.lead, tags, vars)}>
          <div className={styles.channels}>
            <ArtCard
              image="/home/img/server-roleplay.webp"
              sub={m.alpha.cardSub}
              title={m.alpha.cardTitle}
              href="/docs/alpha-access"
              action={m.alpha.cardAction}
            >
              <p>{m.alpha.cardBody}</p>
            </ArtCard>
            <div id="server" data-release-channel="server" data-release-version={serverRelease?.version}>
              <ArtCard
                image="/home/img/creators-bg.webp"
                tone="blue"
                sub={m.alpha.serverSub}
                title={serverRelease?.version ?? m.alpha.serverUnavailable}
                titleAs="h2"
                href={localizeHref("/host", locale)}
                action={m.alpha.serverAction}
                data-channel-summary="server"
              >
                <p>{serverRelease ? m.alpha.serverBody : m.alpha.serverBodyUnavailable}</p>
              </ArtCard>
            </div>
          </div>
          <ReleaseStatus className={styles.status} note={m.alpha.statusNote}>
            <ReleaseRefresh labels={common.releaseRefresh} />
          </ReleaseStatus>
        </Section>

        <Section id="what-it-does" className={styles.jobsSection}>
          <div className={styles.jobs}>
            <div className={styles.jobsIntro}>
              <Eyebrow>{m.jobs.eyebrow}</Eyebrow>
              <Display size="lg" lines={m.jobs.title} accent={m.jobs.accent} />
              <Lead>{m.jobs.lead}</Lead>
              <div className={styles.jobsFigure} aria-hidden="true">
                <GlitchFrame>
                  <Image
                    src="/home/img/players-character.webp"
                    alt=""
                    width={1202}
                    height={1818}
                    sizes="(max-width: 1084px) 70vw, 34vw"
                    quality={100}
                    draggable={false}
                  />
                </GlitchFrame>
              </div>
            </div>
            <ol className={styles.jobList}>
              {m.jobs.items.map((job, index) => (
                <li key={job.title} className={styles.job}>
                  <span className={styles.jobIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon glyph={JOB_ICONS[index] ?? play} className={styles.jobIcon} />
                  <div>
                    <Display as="h3" size="sm" className={styles.jobTitle}>
                      {job.title}
                    </Display>
                    <p className={styles.jobBody}>{fill(job.body, vars)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section id="first-run" eyebrow={m.firstRun.eyebrow} title={m.firstRun.title} lead={m.firstRun.lead}>
          <Steps steps={m.firstRun.steps.map((step) => ({ title: step.title, body: <p>{rich(step.body, tags, vars)}</p> }))} />
        </Section>

        <Section id="requirements" eyebrow={m.requirements.eyebrow} title={m.requirements.title} className={styles.requirements}>
          <div className={styles.requirementsGrid}>
            <Checklist
              items={m.requirements.items.map((item) => ({ title: fill(item.title, vars), body: fill(item.body, vars) }))}
            />
            <div>
              <Eyebrow muted className={styles.faqLabel}>
                {m.requirements.questions}
              </Eyebrow>
              <Faq items={m.requirements.faq.map((entry) => ({ q: entry.q, a: rich(entry.a, tags, vars) }))} />
            </div>
          </div>
          <Notice kind="warning" title={m.requirements.alphaTitle} className={styles.alphaNotice}>
            {rich(m.requirements.alphaBody, tags, vars)}
          </Notice>
        </Section>

        <JsonLd
          data={jsonLdGraph(
            breadcrumbNode(
              [
                { name: messages.meta.home, path: "/" },
                { name: m.breadcrumb, path: "/download" },
              ],
              locale,
            ),
            ...(release ? [launcherApplicationNode(release)] : []),
          )}
        />
      </Page>
  );
}

function LauncherDownload({ m, details }: { m: Messages["download"]["preview"]; details: Messages["download"]["release"] }) {
  return (
    <div className={styles.release} data-release-channel="launcher" data-release-version={LAUNCHER_VERSION} data-channel-summary="launcher">
      <div className={styles.releaseHead}>
        <Tag tone="yellow" variant="solid">New</Tag>
        <h2 className={styles.releaseVersion}>OPEN//77 Launcher · {LAUNCHER_VERSION}</h2>
      </div>
      <div className={styles.downloadActions}>
        <DownloadAction href={release.url} label={m.windows} meta={`${LAUNCHER_VERSION} · x64 · NSIS`} lines={false} size="md" fullWidth />
        <DownloadAction href={`${LAUNCHER_BASE}/OPEN77-${LAUNCHER_VERSION}-linux-x86_64.AppImage`} label={m.linux} meta={`${LAUNCHER_VERSION} · x86_64 · AppImage`} lines={false} size="md" tone="blue" fullWidth />
      </div>
      <FileDetails summary={details.details}>
        <a href={`https://github.com/Open2077/op77-launcher/releases/download/v${LAUNCHER_VERSION}/SHA256SUMS`}>SHA-256 · {LAUNCHER_VERSION}</a>
        <p>{details.official}</p>
      </FileDetails>
      <a className={styles.previewSource} href={`${LAUNCHER_BASE}/OPEN77-XboxAuth-${LAUNCHER_VERSION}-source.zip`}>{m.source}</a>
    </div>
  );
}
