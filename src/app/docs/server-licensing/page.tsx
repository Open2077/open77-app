import Link from "next/link";

import { SlashMark } from "@/components/brand";
import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocToc } from "@/components/docs/doc-toc";
import { DocsShell } from "@/components/docs/docs-shell";
import { ArrowRightIcon, InfoIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { getDocsNeighbours, highlightCode, type TocEntry } from "@/lib/docs";
import {
  AUTH_INTRO,
  AUTH_NOTE,
  AUTH_STEPS,
  CONFIG_INTRO,
  CONFIG_SAMPLE,
  ENV_INTRO,
  ENV_SAMPLE,
  KEY_FACTS,
  KEY_SHAPE,
  LICENSING_DESCRIPTION,
  LICENSING_LEDE,
  LICENSING_OVERVIEW,
  LICENSING_TITLE,
  LINKING_INTRO,
  LINKING_OUTRO,
  MANAGE_INTRO,
  ONBOARDING_STEPS,
} from "@/lib/licensing-content";
import { breadcrumbNode, jsonLdGraph, pageMetadata, techArticleNode } from "@/lib/seo";

export const metadata = pageMetadata({
  title: LICENSING_TITLE,
  description: LICENSING_DESCRIPTION,
  path: "/docs/server-licensing",
  type: "article",
  markdownPath: "/docs/server-licensing.md",
});

const TOC: TocEntry[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "onboarding", text: "From zero to a listed server", depth: 2 },
  { id: "your-key", text: "Your license key", depth: 2 },
  { id: "linking-the-key", text: "Linking the key to your server", depth: 2 },
  { id: "authorisation", text: "How the master authorises your server", depth: 2 },
  { id: "managing", text: "Managing your keys", depth: 2 },
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

export default async function ServerLicensingPage() {
  const [envHtml, configHtml, neighbours] = await Promise.all([
    highlightCode(ENV_SAMPLE, "bash"),
    highlightCode(CONFIG_SAMPLE, "jsonc"),
    getDocsNeighbours("server-licensing"),
  ]);

  return (
    <>
      <DocsShell
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Server licensing" }]}
        title="Server licensing."
        lede={LICENSING_LEDE}
        toc={<DocToc entries={TOC} />}
      >
        <section className="docs-section" id="overview">
          <h2 className="docs-title">
            <SlashMark /> Overview
          </h2>
          <p className="docs-p">{LICENSING_OVERVIEW}</p>
        </section>

        <section className="docs-section" id="onboarding">
          <h2 className="docs-title">
            <SlashMark /> From zero to a listed server
          </h2>
          <ol className="steps steps-2">
            {ONBOARDING_STEPS.map((step) => (
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

        <section className="docs-section" id="your-key">
          <h2 className="docs-title">
            <SlashMark /> Your license key
          </h2>
          <p className="docs-p">{KEY_SHAPE}</p>
          {KEY_FACTS.map((fact) => (
            <p className="docs-p" key={fact.label}>
              <strong>{fact.label}.</strong> {fact.body}
            </p>
          ))}
        </section>

        <section className="docs-section" id="linking-the-key">
          <h2 className="docs-title">
            <SlashMark /> Linking the key to your server
          </h2>
          <p className="docs-p">{LINKING_INTRO}</p>
          <p className="docs-p">{ENV_INTRO}</p>
          <Snippet filename="shell" badge="ENVIRONMENT" html={envHtml} />
          <p className="docs-p">{CONFIG_INTRO}</p>
          <Snippet filename="server.jsonc" badge="SERVER CONFIG" html={configHtml} />
          <p className="status-note" role="note">
            <InfoIcon />
            <span>{LINKING_OUTRO}</span>
          </p>
        </section>

        <section className="docs-section" id="authorisation">
          <h2 className="docs-title">
            <SlashMark /> How the master authorises your server
          </h2>
          <p className="docs-p">{AUTH_INTRO}</p>
          <ol className="steps steps-2">
            {AUTH_STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="status-note" role="note">
            <InfoIcon />
            <span>
              <strong>Honest status:</strong> {AUTH_NOTE}
            </span>
          </p>
        </section>

        <section className="docs-section" id="managing">
          <h2 className="docs-title">
            <SlashMark /> Managing your keys
          </h2>
          <p className="docs-p">{MANAGE_INTRO}</p>
          <p className="docs-p">
            <Link className="doc-inline-link" href="/account/keys">
              Open the keymaster
              <ArrowRightIcon size={14} />
            </Link>
          </p>
        </section>

        <AgentNote markdownHref="/docs/server-licensing.md" />
        <DocPager {...neighbours} />
      </DocsShell>

      <JsonLd
        data={jsonLdGraph(
          techArticleNode({
            headline: LICENSING_TITLE,
            description: LICENSING_DESCRIPTION,
            path: "/docs/server-licensing",
            section: "Getting started",
            wordCount: 900,
          }),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Docs", path: "/docs" },
            { name: "Server licensing", path: "/docs/server-licensing" },
          ]),
        )}
      />
    </>
  );
}
