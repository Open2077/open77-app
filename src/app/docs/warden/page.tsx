import Link from "next/link";
import type { ComponentType } from "react";

import { SlashMark } from "@/components/brand";
import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import {
  ArrowRightIcon,
  CodeIcon,
  GlobeIcon,
  InfoIcon,
  PeopleIcon,
  PlugIcon,
  ServerRackIcon,
  ShieldIcon,
} from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { getDocsNeighbours, highlightCode, type TocEntry } from "@/lib/docs";
import { breadcrumbNode, jsonLdGraph, pageMetadata, techArticleNode } from "@/lib/seo";
import {
  CAPABILITIES,
  CAPABILITIES_INTRO,
  ENABLE_INTRO,
  ENABLE_NOTE,
  ENABLE_SAMPLE,
  PIN_INTRO,
  PIN_STEPS,
  SECURITY_INTRO,
  SECURITY_POINTS,
  WARDEN_DESCRIPTION,
  WARDEN_LEDE,
  WARDEN_OVERVIEW,
  WARDEN_TITLE,
} from "@/lib/warden-content";

export const metadata = pageMetadata({
  title: WARDEN_TITLE,
  description: WARDEN_DESCRIPTION,
  path: "/docs/warden",
  type: "article",
  markdownPath: "/docs/warden.md",
});

const TOC: TocEntry[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "enable", text: "Enabling Warden", depth: 2 },
  { id: "first-run", text: "First run: the setup PIN", depth: 2 },
  { id: "capabilities", text: "What you can do", depth: 2 },
  { id: "security", text: "Keeping Warden secure", depth: 2 },
];

const CAP_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  console: CodeIcon,
  reload: PlugIcon,
  players: PeopleIcon,
  announce: GlobeIcon,
  config: ServerRackIcon,
  roles: ShieldIcon,
};

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

export default async function WardenPage() {
  const [enableHtml, neighbours] = await Promise.all([
    highlightCode(ENABLE_SAMPLE, "jsonc"),
    getDocsNeighbours("warden"),
  ]);

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Warden" }]}
        title="Warden."
        lede={WARDEN_LEDE}
        toc={<DocToc entries={TOC} />}
      >
        <section className="docs-section" id="overview">
          <h2 className="docs-title">
            <SlashMark /> Overview
          </h2>
          <p className="docs-p">{WARDEN_OVERVIEW}</p>
        </section>

        <section className="docs-section" id="enable">
          <h2 className="docs-title">
            <SlashMark /> Enabling Warden
          </h2>
          <p className="docs-p">{ENABLE_INTRO}</p>
          <Snippet filename="server.jsonc" badge="SERVER CONFIG" html={enableHtml} />
          <p className="status-note" role="note">
            <InfoIcon />
            <span>{ENABLE_NOTE}</span>
          </p>
        </section>

        <section className="docs-section" id="first-run">
          <h2 className="docs-title">
            <SlashMark /> First run: the setup PIN
          </h2>
          <p className="docs-p">{PIN_INTRO}</p>
          <ol className="steps steps-2">
            {PIN_STEPS.map((step) => (
              <li className="step" key={step.num}>
                <span className="step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="docs-section" id="capabilities">
          <h2 className="docs-title">
            <SlashMark /> What you can do
          </h2>
          <p className="docs-p">{CAPABILITIES_INTRO}</p>
          <div className="benefit-grid">
            {CAPABILITIES.map((cap) => {
              const Icon = CAP_ICONS[cap.icon] ?? InfoIcon;
              return (
                <article className="benefit-card" key={cap.title}>
                  <Icon size={22} className="feat-icon" />
                  <h3>{cap.title}</h3>
                  <p>{cap.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="docs-section" id="security">
          <h2 className="docs-title">
            <SlashMark /> Keeping Warden secure
          </h2>
          <p className="docs-p">{SECURITY_INTRO}</p>
          {SECURITY_POINTS.map((point) => (
            <p className="docs-p" key={point.label}>
              <strong>{point.label}.</strong> {point.body}
            </p>
          ))}
          <p className="docs-p">
            <Link className="doc-inline-link" href="/docs/host-a-server">
              Back to hosting a server
              <ArrowRightIcon size={14} />
            </Link>
          </p>
        </section>

        <AgentNote markdownHref="/docs/warden.md" />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          techArticleNode({
            headline: WARDEN_TITLE,
            description: WARDEN_DESCRIPTION,
            path: "/docs/warden",
            section: "Getting started",
            wordCount: 900,
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "Warden", path: "/docs/warden" },
          ]),
        )}
      />
    </>
  );
}
