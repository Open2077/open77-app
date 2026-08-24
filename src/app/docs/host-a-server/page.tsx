import Link from "next/link";

import { SlashMark } from "@/components/brand";
import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import {
  ArrowRightIcon,
  InfoIcon,
  LinuxIcon,
  ShieldIcon,
  WindowsIcon,
} from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { getDocsNeighbours, highlightCode, type TocEntry } from "@/lib/docs";
import {
  APPEARS_INTRO,
  APPEARS_NOTE,
  APPEARS_STEPS,
  BUILD_INTRO,
  BUILD_NOTE,
  BUILD_ROWS,
  CONFIG_FIELDS,
  CONFIG_INTRO,
  CONFIG_SAMPLE,
  ENV_INTRO,
  ENV_SAMPLE,
  FIRSTRUN_BODY,
  FIRSTRUN_INTRO,
  FIRSTRUN_NOTE,
  HOSTING_DESCRIPTION,
  HOSTING_LEDE,
  HOSTING_OVERVIEW,
  HOSTING_STEPS,
  HOSTING_TITLE,
  NEED_INTRO,
  NEED_POINTS,
  NEXT_INTRO,
  RUN_INTRO,
  RUN_SAMPLE,
} from "@/lib/hosting-content";
import { breadcrumbNode, jsonLdGraph, pageMetadata, techArticleNode } from "@/lib/seo";

export const metadata = pageMetadata({
  title: HOSTING_TITLE,
  description: HOSTING_DESCRIPTION,
  path: "/docs/host-a-server",
  type: "article",
  markdownPath: "/docs/host-a-server.md",
});

const TOC: TocEntry[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "steps", text: "From download to open doors", depth: 2 },
  { id: "what-you-need", text: "What the host needs", depth: 2 },
  { id: "get-the-build", text: "Get the build", depth: 2 },
  { id: "first-run", text: "First-run setup", depth: 2 },
  { id: "configure", text: "Configure server.jsonc", depth: 2 },
  { id: "set-the-key", text: "Set the license key", depth: 2 },
  { id: "run", text: "Run it", depth: 2 },
  { id: "appears", text: "It appears automatically", depth: 2 },
  { id: "next", text: "Next: run it live with Warden", depth: 2 },
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
      <div className="dx-snippet" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default async function HostAServerPage() {
  const [configHtml, envHtml, runHtml, neighbours] = await Promise.all([
    highlightCode(CONFIG_SAMPLE, "jsonc"),
    highlightCode(ENV_SAMPLE, "bash"),
    highlightCode(RUN_SAMPLE, "bash"),
    getDocsNeighbours("host-a-server"),
  ]);

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Host your own server" }]}
        title="Host your own server."
        lede={HOSTING_LEDE}
        toc={<DocToc entries={TOC} />}
      >
        <section className="docs-section" id="overview">
          <h2 className="docs-title">
            <SlashMark /> Overview
          </h2>
          <p className="docs-p">{HOSTING_OVERVIEW}</p>
        </section>

        <section className="docs-section" id="steps">
          <h2 className="docs-title">
            <SlashMark /> From download to open doors
          </h2>
          <ol className="steps steps-2">
            {HOSTING_STEPS.map((step) => (
              <li className="step" key={step.num}>
                <span className="step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <Link className="doc-inline-link" href={step.href}>
                  {step.linkText}
                  <ArrowRightIcon size={14} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="docs-section" id="what-you-need">
          <h2 className="docs-title">
            <SlashMark /> What the host needs
          </h2>
          <p className="docs-p">{NEED_INTRO}</p>
          {NEED_POINTS.map((point) => (
            <p className="docs-p" key={point.label}>
              <strong>{point.label}.</strong> {point.body}
            </p>
          ))}
        </section>

        <section className="docs-section" id="get-the-build">
          <h2 className="docs-title">
            <SlashMark /> Get the build
          </h2>
          <p className="docs-p">{BUILD_INTRO}</p>
          <ol className="steps steps-2">
            {BUILD_ROWS.map((row) => {
              const OsIcon = row.os.startsWith("Windows") ? WindowsIcon : LinuxIcon;
              return (
                <li className="step" key={row.os}>
                  <span className="step-num" aria-hidden="true">
                    <OsIcon size={20} />
                  </span>
                  <h3>{row.os}</h3>
                  <p>
                    Archive: {row.archive}
                    <br />
                    Run: <code>{row.run}</code>
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="docs-p">
            <Link className="doc-inline-link" href="/host">
              Open the download page
              <ArrowRightIcon size={14} />
            </Link>
          </p>
          <p className="status-note" role="note">
            <ShieldIcon />
            <span>
              <strong>Official builds only.</strong> {BUILD_NOTE}
            </span>
          </p>
        </section>

        <section className="docs-section" id="first-run">
          <h2 className="docs-title">
            <SlashMark /> First-run setup
          </h2>
          <p className="docs-p">{FIRSTRUN_INTRO}</p>
          <p className="docs-p">{FIRSTRUN_BODY}</p>
          <p className="status-note" role="note">
            <InfoIcon />
            <span>{FIRSTRUN_NOTE}</span>
          </p>
        </section>

        <section className="docs-section" id="configure">
          <h2 className="docs-title">
            <SlashMark /> Configure server.jsonc
          </h2>
          <p className="docs-p">{CONFIG_INTRO}</p>
          <Snippet filename="server.jsonc" badge="SERVER CONFIG" html={configHtml} />
          {CONFIG_FIELDS.map((field) => (
            <p className="docs-p" key={field.label}>
              <strong>
                <code>{field.label}</code>.
              </strong>{" "}
              {field.body}
            </p>
          ))}
        </section>

        <section className="docs-section" id="set-the-key">
          <h2 className="docs-title">
            <SlashMark /> Set the license key
          </h2>
          <p className="docs-p">{ENV_INTRO}</p>
          <Snippet filename="shell" badge="ENVIRONMENT" html={envHtml} />
          <p className="docs-p">
            Need a key, or want the full detail on how the master authorises your server?{" "}
            <Link className="doc-inline-link" href="/docs/server-licensing">
              Read about server licensing
              <ArrowRightIcon size={14} />
            </Link>
          </p>
        </section>

        <section className="docs-section" id="run">
          <h2 className="docs-title">
            <SlashMark /> Run it
          </h2>
          <p className="docs-p">{RUN_INTRO}</p>
          <Snippet filename="shell" badge="LAUNCH" html={runHtml} />
        </section>

        <section className="docs-section" id="appears">
          <h2 className="docs-title">
            <SlashMark /> It appears automatically
          </h2>
          <p className="docs-p">{APPEARS_INTRO}</p>
          <ol className="steps steps-2">
            {APPEARS_STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="status-note" role="note">
            <InfoIcon />
            <span>{APPEARS_NOTE}</span>
          </p>
        </section>

        <section className="docs-section" id="next">
          <h2 className="docs-title">
            <SlashMark /> Next: run it live with Warden
          </h2>
          <p className="docs-p">{NEXT_INTRO}</p>
          <p className="docs-p">
            <Link className="doc-inline-link" href="/docs/warden">
              Meet Warden, your server control room
              <ArrowRightIcon size={14} />
            </Link>
          </p>
        </section>

        <AgentNote markdownHref="/docs/host-a-server.md" />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          techArticleNode({
            headline: HOSTING_TITLE,
            description: HOSTING_DESCRIPTION,
            path: "/docs/host-a-server",
            section: "Getting started",
            wordCount: 1100,
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "Host your own server", path: "/docs/host-a-server" },
          ]),
        )}
      />
    </>
  );
}
