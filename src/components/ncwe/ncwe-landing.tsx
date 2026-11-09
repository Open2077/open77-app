import type { ReactNode } from "react";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { ArrowLink, Faq, FeatureGrid, SpecStrip, Steps } from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import {
  arrowUp01,
  cursor01,
  discord,
  dollarCircle,
  folderOpen,
  gameController03,
  gridView,
  image01,
  layers01,
  maps,
  packageBox,
  road,
  serverStack01,
  squareUnlock02,
  sun03,
  tick02,
  trafficLight,
  user,
  video01,
  wrench01,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { megabytes, NCWE_ARCHIVEXL, NCWE_RELEASE, NCWE_TRAILER } from "@/lib/ncwe-release";
import { site } from "@/lib/site";
import { NcweTrailerButton, NcweTrailerPoster } from "./ncwe-trailer";

import styles from "./ncwe-landing.module.css";

/**
 * Stills from the trailer, taken where no caption is burned in (the YouTube
 * thumbnail, NCWE_TRAILER.poster, carries a giant "THEN GO BIGGER."):
 * the glass arcade at 0:04, graded and widened with a dark left side for the
 * copy, and the night-preview street at 1:16 for the reel.
 */
const HERO_ART = "/assets/ncwe/hero-glass-arcade.webp";
const REEL_POSTER = "/assets/ncwe/reel-night-street.webp";

const TOOL_ICONS = [cursor01, road, maps, sun03, squareUnlock02, arrowUp01, gridView, trafficLight, folderOpen];
const ASSET_ICONS = [layers01, image01, video01];
const EXPORT_ICONS = [packageBox, serverStack01, wrench01];

const external = (href: string) =>
  function ExternalTag(chunk: ReactNode) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {chunk}
      </a>
    );
  };

/** Title and description of /ncwe in a language. */
export function ncweMetadataText(locale: Locale) {
  const m = getMessages(locale).ncwe;
  return {
    title: fill(m.metaTitle, { version: NCWE_RELEASE.version }),
    description: fill(m.metaDescription, { version: NCWE_RELEASE.version }),
  };
}

function CheckList({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <ul className={styles.checks}>
      {items.map((item) => (
        <li key={item.title}>
          <span className={styles.tick} aria-hidden="true">
            <Icon glyph={tick02} />
          </span>
          <span>
            <strong>{item.title}</strong> {item.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** /ncwe: what the Night City World Editor is, and its download. Renders inside a blue <Page>. */
export function NcweLanding({ locale }: { locale: Locale }) {
  const m = getMessages(locale).ncwe;
  const size = megabytes(NCWE_RELEASE.bytes, LOCALE_INFO[locale].intl);
  const vars = { version: NCWE_RELEASE.version, game: NCWE_RELEASE.game, size, archivexlVersion: NCWE_ARCHIVEXL.version };
  const trailerLabels = {
    watch: m.trailer.watch,
    watchLength: fill(m.trailer.watchLength, { length: NCWE_TRAILER.length }),
    eyebrow: fill(m.trailer.eyebrow, { length: NCWE_TRAILER.length }),
  };
  return (
    <>
      <ProductHero
        titleId="ncwe-title"
        eyebrow={
          <>
            {m.eyebrow} <Tag tone="blue" variant="solid">{fill(m.stableTag, vars)}</Tag>
          </>
        }
        title={m.title}
        accent={m.accent}
        lead={rich(m.lead, { strong: (chunk) => <strong>{chunk}</strong> })}
        art={{ src: HERO_ART, position: "79% 35%" }}
        strip={
          <SpecStrip
            label={m.facts.label}
            facts={[
              { icon: dollarCircle, label: m.facts.priceLabel, value: m.facts.priceValue },
              { icon: user, label: m.facts.accountLabel, value: m.facts.accountValue },
              { icon: gameController03, label: m.facts.gameLabel, value: fill(m.facts.gameValue, vars) },
              { icon: packageBox, label: m.facts.shipsLabel, value: m.facts.shipsValue },
            ]}
          />
        }
        wide
      >
        <div className={styles.heroActions}>
          <DownloadAction
            href={NCWE_RELEASE.url}
            label={m.heroDownload}
            meta={`${NCWE_RELEASE.version} · ${size}`}
            note={fill(m.heroNote, vars)}
          />
          <NcweTrailerButton
            videoId={NCWE_TRAILER.id}
            title={NCWE_TRAILER.title}
            length={NCWE_TRAILER.length}
            labels={trailerLabels}
          />
        </div>
      </ProductHero>

      <Section id="city" eyebrow={m.city.eyebrow} title={m.city.title} lead={m.city.lead}>
        <Steps steps={m.city.points.map((point) => ({ title: point.title, body: <p>{point.body}</p> }))} />
      </Section>

      <Section id="tools" eyebrow={m.tools.eyebrow} title={m.tools.title} lead={m.tools.lead}>
        <FeatureGrid
          items={m.tools.items.map((item, index) => ({ ...item, icon: TOOL_ICONS[index] ?? cursor01 }))}
          columns={3}
          className={styles.tools}
        />
      </Section>

      <Section id="reel" width="wide" className={styles.reelSection}>
        <div className={styles.reelHead}>
          <Eyebrow>{m.reel.eyebrow}</Eyebrow>
          <Display size="md" lines={m.reel.title} accent={m.reel.accent} />
        </div>
        <div className={styles.reelFrame}>
          <NcweTrailerPoster
            videoId={NCWE_TRAILER.id}
            title={NCWE_TRAILER.title}
            poster={REEL_POSTER}
            length={NCWE_TRAILER.length}
            labels={trailerLabels}
          />
        </div>
      </Section>

      <Section id="content" eyebrow={m.content.eyebrow} title={m.content.title} lead={m.content.lead}>
        <FeatureGrid
          items={m.content.items.map((item, index) => ({ ...item, icon: ASSET_ICONS[index] ?? layers01 }))}
          columns={3}
        />
      </Section>

      <Section id="together">
        <div className={styles.duo}>
          <Panel as="article" brackets padding="lg" aria-labelledby="together-title">
            <Eyebrow>{m.together.eyebrow}</Eyebrow>
            <Display as="h2" size="sm" id="together-title" className={styles.duoTitle}>
              {m.together.title}
            </Display>
            <CheckList items={m.together.items} />
            <p className={styles.duoNote}>{m.together.note}</p>
          </Panel>
          <Panel as="article" brackets padding="lg" aria-labelledby="agents-title">
            <Eyebrow>{m.agents.eyebrow}</Eyebrow>
            <Display as="h2" size="sm" id="agents-title" className={styles.duoTitle}>
              {m.agents.title}
            </Display>
            <CheckList items={m.agents.items} />
            <p className={styles.duoNote}>{m.agents.note}</p>
          </Panel>
        </div>
      </Section>

      <Section id="ship" eyebrow={m.ship.eyebrow} title={m.ship.title} lead={m.ship.lead}>
        <FeatureGrid
          items={m.ship.items.map((item, index) => ({ ...item, icon: EXPORT_ICONS[index] ?? packageBox }))}
          columns={3}
        />
        <p className={styles.aside}>
          {m.ship.server} <ArrowLink href="/create">{m.ship.serverLink}</ArrowLink>
        </p>
      </Section>

      <Section id="download" className={styles.downloadSection}>
        <div className={styles.download}>
          <div className={styles.downloadCopy}>
            <Eyebrow>{m.download.eyebrow}</Eyebrow>
            <Display size="md" lines={m.download.title} accent={m.download.accent} />
            <p className={styles.downloadText}>{m.download.text}</p>
            <p className={styles.aside}>
              <ArrowLink href={NCWE_RELEASE.notes}>{fill(m.download.notes, vars)}</ArrowLink>
            </p>
            <DownloadAction
              href={NCWE_RELEASE.url}
              label={fill(m.download.button, vars)}
              meta={fill(m.download.meta, vars)}
            />
            <div className={styles.checksum}>
              <span className={styles.checksumLabel}>SHA-256</span>
              <CopyLine value={NCWE_RELEASE.sha256} label={m.download.copySha} />
            </div>
            {site.links.discord ? (
              <span className={styles.discord}>
                <Button color="neutral" border lines="none" icon={discord} iconPosition="left" href={site.links.discord}>
                  {m.download.discord}
                </Button>
              </span>
            ) : null}
          </div>
          <div className={styles.downloadSteps}>
            <Eyebrow muted>{m.download.stepsLabel}</Eyebrow>
            <Steps
              steps={m.download.steps.map((step) => ({ title: step.title, body: <p>{step.body}</p> }))}
              className={styles.stepsStacked}
            />
          </div>
        </div>
      </Section>

      <Section id="faq" eyebrow={m.faq.eyebrow} title={m.faq.title} width="narrow">
        <Faq
          items={m.faq.items.map((entry) => ({
            q: entry.q,
            a: rich(
              entry.a,
              { archivexl: (chunk) => <a href={NCWE_ARCHIVEXL.url}>{chunk}</a>, source: external(NCWE_ARCHIVEXL.source) },
              vars,
            ),
          }))}
        />
      </Section>

      <Section width="narrow" className={styles.closing}>
        <p className={styles.thanks}>
          {rich(m.thanks, {
            wolvenkit: external("https://github.com/WolvenKit/WolvenKit"),
            archivexl: external("https://github.com/psiberx/cp2077-archive-xl"),
          })}
        </p>
        <p className={styles.fineprint}>{m.fineprint}</p>
      </Section>
    </>
  );
}
