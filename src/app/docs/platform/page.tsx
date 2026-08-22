import Link from "next/link";

import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { SlashMark } from "@/components/brand";
import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
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

function Snippet({ filename, badge, html }: { filename: string; badge: string; html: string }) {
  return (
    <div className="code-window docs-code">
      <div className="code-titlebar">
        <span className="client-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="code-filename">{filename}</span>
        <span className="client-badge">{badge}</span>
      </div>
      {/* Highlighted by Shiki at build time from the same theme the guides use. */}
      <div className="dx-snippet" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

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
        title="How OPEN//77 works."
        lede={PLATFORM_LEDE}
        toc={<DocToc entries={TOC} />}
      >
        <section className="docs-section" id="overview">
          <h2 className="docs-title">
            <SlashMark /> Overview
          </h2>
          <p className="docs-p">{PLATFORM_OVERVIEW}</p>
          <div className="distinction-grid">
            <div className="distinction-card is-not">
              <p className="distinction-label">OPEN//77 is not</p>
              <ul className="distinction-list">
                {IS_NOT.map((item) => (
                  <li key={item}>
                    <CrossIcon className="li-icon" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="distinction-card is-yes">
              <p className="distinction-label">OPEN//77 is</p>
              <ul className="distinction-list">
                {IS.map((item) => (
                  <li key={item}>
                    <CheckIcon className="li-icon" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="docs-section" id="how-it-works">
          <h2 className="docs-title">
            <SlashMark /> How it works (for players)
          </h2>
          <ol className="steps steps-2 docs-steps">
            {PLAYER_STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="docs-section" id="requirements">
          <h2 className="docs-title">
            <SlashMark /> Requirements
          </h2>
          <p className="docs-p">{REQUIREMENTS_INTRO}</p>
          <h3 className="docs-subtitle">To play</h3>
          <ul className="dedicated-points">
            {PLAYER_REQUIREMENTS.map((item) => (
              <li key={item.label}>
                <h3>{item.label}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
          <h3 className="docs-subtitle">To host a server</h3>
          <p className="docs-p">{REQUIREMENTS_SERVER_INTRO}</p>
          <ul className="dedicated-points">
            {SERVER_REQUIREMENTS.map((item) => (
              <li key={item.label}>
                <h3>{item.label}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="docs-section" id="dedicated-servers">
          <h2 className="docs-title">
            <SlashMark /> Dedicated servers
          </h2>
          <p className="docs-p">{DEDICATED_INTRO}</p>
          <ul className="dedicated-points">
            {SERVER_POINTS.map((point) => (
              <li key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </li>
            ))}
          </ul>
          <div
            className="dedicated-diagram docs-diagram"
            aria-label="Diagram: players connect to a community-run dedicated server which owns the world state"
          >
            <div className="diagram">
              <ArchitectureDiagram />
            </div>
          </div>
        </section>

        <section className="docs-section" id="resources">
          <h2 className="docs-title">
            <SlashMark /> Resources &amp; scripting
          </h2>
          <p className="docs-p">
            {RESOURCES_INTRO_PARTS.lead}
            <Link href={RESOURCES_INTRO_PARTS.linkHref}>{RESOURCES_INTRO_PARTS.linkLabel}</Link>
            {RESOURCES_INTRO_PARTS.tail}
          </p>
          <ul className="creators-list">
            {SCRIPTABLE.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <strong>{item.label}</strong>
                </Link>{" "}
                — {item.body}
              </li>
            ))}
          </ul>

          <Snippet filename="resources/hello/open77.lua" badge="MANIFEST" html={manifestHtml} />
          <Snippet
            filename="resources/hello/server/main.lua"
            badge="SERVER&nbsp;RUNTIME"
            html={serverHtml}
          />

          <p className="creators-note">
            That is the real API, not a sketch — every registered function is listed in the{" "}
            <Link href="/docs/api">Lua API reference</Link>, separated by runtime so a client
            projection is never mistaken for server authority. The surface will still change while
            the project is in pre-alpha.
          </p>
        </section>

        <section className="docs-section" id="roadmap">
          <h2 className="docs-title">
            <SlashMark /> Roadmap
          </h2>
          <p className="docs-p">{ROADMAP_INTRO}</p>
          <ol className="roadmap">
            {ROADMAP.map((item, index) => (
              <li className={`roadmap-item${index === 0 ? " is-now" : ""}`} key={item.stage}>
                <div className="roadmap-marker" aria-hidden="true" />
                <div className="roadmap-body">
                  <p className="roadmap-stage">
                    {item.stage}
                    {item.chip ? <span className="roadmap-chip">{item.chip}</span> : null}
                  </p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="docs-section" id="faq">
          <h2 className="docs-title">
            <SlashMark /> FAQ
          </h2>
          <div className="faq-list">
            {FAQ.map((entry) => (
              <details className="faq-item" key={entry.question}>
                <summary>{entry.question}</summary>
                <p>{entry.answer}</p>
              </details>
            ))}
          </div>
          <p className="docs-p">
            Still curious about running a world of your own?{" "}
            <Link href="/create">Create a Server</Link> covers what hosting will involve.
          </p>
        </section>

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
