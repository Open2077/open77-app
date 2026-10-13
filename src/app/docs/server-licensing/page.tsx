import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocLink, DocNote, DocSection, DocText, Facts, Snippet, Steps } from "@/components/docs/docs-blocks";
import { DocsShell } from "@/components/docs/docs-shell";
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

export default async function ServerLicensingPage() {
  const [envHtml, configHtml, neighbours] = await Promise.all([
    highlightCode(ENV_SAMPLE, "bash"),
    highlightCode(CONFIG_SAMPLE, "jsonc"),
    getDocsNeighbours("server-licensing"),
  ]);

  return (
    <>
      <DocsShell
        tone="blue"
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Server licensing" }]}
        eyebrow="Hosting & administration"
        title="Server licensing."
        lede={LICENSING_LEDE}
        meta={<a href="/docs/server-licensing.md">Markdown</a>}
        toc={TOC}
      >
        <DocSection id="overview" title="Overview" intro={LICENSING_OVERVIEW} />

        <DocSection id="onboarding" title="From zero to a listed server">
          <Steps
            items={ONBOARDING_STEPS.map((step) => ({
              num: step.num,
              title: step.title,
              body: step.body,
              link: { href: step.href, label: step.linkText },
            }))}
          />
        </DocSection>

        <DocSection id="your-key" title="Your license key" intro={KEY_SHAPE}>
          <Facts items={KEY_FACTS.map((fact) => ({ label: fact.label, body: fact.body }))} />
        </DocSection>

        <DocSection id="linking-the-key" title="Linking the key to your server" intro={LINKING_INTRO}>
          <DocText>{ENV_INTRO}</DocText>
          <Snippet filename="shell" badge="Environment" code={ENV_SAMPLE} html={envHtml} />
          <DocText>{CONFIG_INTRO}</DocText>
          <Snippet filename="server.jsonc" badge="Server config" code={CONFIG_SAMPLE} html={configHtml} />
          <DocNote>{LINKING_OUTRO}</DocNote>
        </DocSection>

        <DocSection id="authorisation" title="How the master authorises your server" intro={AUTH_INTRO}>
          <Steps items={AUTH_STEPS.map((step) => ({ title: step.title, body: step.body }))} />
          <DocNote title="Honest status:">
            {AUTH_NOTE}
          </DocNote>
        </DocSection>

        <DocSection id="managing" title="Managing your keys" intro={MANAGE_INTRO}>
          <DocText>
            <DocLink href="/account/keys">Open the keymaster</DocLink>
          </DocText>
        </DocSection>

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
