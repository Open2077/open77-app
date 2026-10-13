import Link from "next/link";

import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocSection, DocSubheading, DocText, Facts, FeatureGrid, Snippet, Steps } from "@/components/docs/docs-blocks";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { Tag } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { cancelCircle, checkmarkCircle02, database01, serverStack02, userGroup } from "@/components/ui/icons";
import { getDocsNeighbours, highlightCode, type TocEntry } from "@/lib/docs";
import {
  DEDICATED_INTRO,
  FAQ,
  IS,
  IS_NOT,
  MANIFEST_SAMPLE,
  PLATFORM_DESCRIPTION,
  PLATFORM_LEDE,
  PLATFORM_OVERVIEW,
  PLATFORM_TITLE,
  PLAYER_STEPS,
  REQUIREMENTS_INTRO,
  REQUIREMENTS_SERVER_INTRO,
  RESOURCES_INTRO_PARTS,
  ROADMAP,
  ROADMAP_INTRO,
  SCRIPTABLE,
  SERVER_POINTS,
  SERVER_SAMPLE,
} from "@/lib/platform-content";
import { PLAYER_REQUIREMENTS, SERVER_REQUIREMENTS } from "@/lib/requirements";
import {
  breadcrumbNode,
  faqNode,
  jsonLdGraph,
  pageMetadata,
  softwareApplicationNode,
  techArticleNode,
} from "@/lib/seo";

import styles from "./platform.module.css";

export const metadata = pageMetadata({
  title: PLATFORM_TITLE,
  description: PLATFORM_DESCRIPTION,
  path: "/docs/platform",
  type: "article",
  markdownPath: "/docs/platform.md",
});

const TOC: TocEntry[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "how-it-works", text: "How it works (for players)", depth: 2 },
  { id: "requirements", text: "Requirements", depth: 2 },
  { id: "dedicated-servers", text: "Dedicated servers", depth: 2 },
  { id: "resources", text: "Resources & scripting", depth: 2 },
  { id: "roadmap", text: "Roadmap", depth: 2 },
  { id: "faq", text: "FAQ", depth: 2 },
];

/** One glyph per dedicated-server point, in the order of `SERVER_POINTS`. */
const SERVER_GLYPHS = [database01, serverStack02, userGroup];

export default async function PlatformPage() {
  const [manifestHtml, serverHtml, neighbours] = await Promise.all([
    highlightCode(MANIFEST_SAMPLE, "lua"),
    highlightCode(SERVER_SAMPLE, "lua"),
    getDocsNeighbours("platform"),
  ]);

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "How the platform works" }]}
        eyebrow="Start here"
        title="How OPEN//77 works."
        lede={PLATFORM_LEDE}
        meta={<a href="/docs/platform.md">Markdown</a>}
        toc={TOC}
      >
        <DocSection id="overview" title="Overview" intro={PLATFORM_OVERVIEW}>
          <div className={styles.distinction}>
            <div className={styles.isNot}>
              <p className={styles.distinctionLabel}>OPEN//77 is not</p>
              <ul>
                {IS_NOT.map((item) => (
                  <li key={item}>
                    <Icon glyph={cancelCircle} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.is}>
              <p className={styles.distinctionLabel}>OPEN//77 is</p>
              <ul>
                {IS.map((item) => (
                  <li key={item}>
                    <Icon glyph={checkmarkCircle02} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DocSection>

        <DocSection id="how-it-works" title="How it works (for players)">
          <Steps items={PLAYER_STEPS.map((step) => ({ title: step.title, body: step.body }))} />
        </DocSection>

        <DocSection id="requirements" title="Requirements" intro={REQUIREMENTS_INTRO}>
          <DocSubheading>To play</DocSubheading>
          <Facts items={PLAYER_REQUIREMENTS.map((item) => ({ label: item.label, body: item.body }))} />
          <DocSubheading>To host a server</DocSubheading>
          <DocText>{REQUIREMENTS_SERVER_INTRO}</DocText>
          <Facts items={SERVER_REQUIREMENTS.map((item) => ({ label: item.label, body: item.body }))} />
        </DocSection>

        <DocSection id="dedicated-servers" title="Dedicated servers" intro={DEDICATED_INTRO}>
          <FeatureGrid
            items={SERVER_POINTS.map((point, index) => ({ glyph: SERVER_GLYPHS[index], title: point.title, body: point.body }))}
          />
          <figure
            className={styles.diagram}
            aria-label="Diagram: players connect to a community-run dedicated server which owns the world state"
          >
            <ArchitectureDiagram />
            <figcaption>{"// Connection model"}</figcaption>
          </figure>
        </DocSection>

        <DocSection id="resources" title="Resources & scripting">
          <DocText>
            {RESOURCES_INTRO_PARTS.lead}
            <Link href={RESOURCES_INTRO_PARTS.linkHref}>{RESOURCES_INTRO_PARTS.linkLabel}</Link>
            {RESOURCES_INTRO_PARTS.tail}
          </DocText>
          <Facts
            items={SCRIPTABLE.map((item) => ({
              label: <Link href={item.href}>{item.label}</Link>,
              body: item.body,
            }))}
          />

          <Snippet filename="resources/hello/open77.lua" badge="Manifest" code={MANIFEST_SAMPLE} html={manifestHtml} />
          <Snippet filename="resources/hello/server/main.lua" badge="Server runtime" code={SERVER_SAMPLE} html={serverHtml} />

          <DocText className={styles.outro}>
            That is the real API, not a sketch: every registered function is listed in the{" "}
            <Link href="/docs/api">Lua API reference</Link>, separated by runtime so a client projection is never mistaken
            for server authority. The surface will still change while the project is in Alpha. Read the{" "}
            <Link href="/docs/alpha-access">access guide and limitations</Link>.
          </DocText>
        </DocSection>

        <DocSection id="roadmap" title="Roadmap" intro={ROADMAP_INTRO}>
          <ol className={styles.roadmap}>
            {ROADMAP.map((item, index) => (
              <li className={index === 0 ? `${styles.stage} ${styles.now}` : styles.stage} key={item.stage}>
                <span className={styles.marker} aria-hidden="true" />
                <p className={styles.stageLabel}>
                  {item.stage}
                  {item.chip ? <Tag variant="solid">{item.chip}</Tag> : null}
                </p>
                <h3>{item.title}</h3>
                <p className={styles.stageBody}>{item.body}</p>
              </li>
            ))}
          </ol>
        </DocSection>

        <DocSection id="faq" title="FAQ">
          <div className={styles.faq}>
            {FAQ.map((entry) => (
              <details key={entry.question}>
                <summary>{entry.question}</summary>
                <p>{entry.answer}</p>
              </details>
            ))}
          </div>
          <DocText className={styles.outro}>
            Still curious about running a world of your own? <Link href="/create">Create a Server</Link> covers what
            hosting will involve.
          </DocText>
        </DocSection>

        <AgentNote markdownHref="/docs/platform.md" />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          techArticleNode({
            headline: PLATFORM_TITLE,
            description: PLATFORM_DESCRIPTION,
            path: "/docs/platform",
            section: "Introduction",
          }),
          softwareApplicationNode(),
          faqNode(FAQ),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "How the platform works", path: "/docs/platform" },
          ]),
        )}
      />
    </>
  );
}
