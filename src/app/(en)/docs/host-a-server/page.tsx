import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocLink, DocNote, DocSection, DocText, Facts, Snippet, Steps } from "@/components/docs/docs-blocks";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import { terminal } from "@/components/ui/icons";
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
  STARTUP_DOC,
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

/** Four panes: the Windows mark in the stroke style of the icon set. */
const WINDOWS_GLYPH =
  '<path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="M3 5.6 10.5 4.5v7H3zm9.5-1.4L21 3v8.5h-8.5zM3 13h7.5v6.5L3 18.4zm9.5 0H21v8l-8.5-1.2z"/>';

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
        tone="blue"
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Host your own server" }]}
        eyebrow="Hosting & administration"
        title="Host your own server."
        lede={HOSTING_LEDE}
        meta={
          <>
            <span>Windows &amp; Linux</span>
            <span>6 steps</span>
            <a href="/docs/host-a-server.md">Markdown</a>
          </>
        }
        toc={TOC}
      >
        <DocSection id="overview" title="Overview" intro={HOSTING_OVERVIEW} />

        <DocSection id="steps" title="From download to open doors">
          <Steps
            items={HOSTING_STEPS.map((step) => ({
              num: step.num,
              title: step.title,
              body: step.body,
              link: { href: step.href, label: step.linkText },
            }))}
          />
        </DocSection>

        <DocSection id="what-you-need" title="What the host needs" intro={NEED_INTRO}>
          <Facts items={NEED_POINTS.map((point) => ({ label: point.label, body: point.body }))} />
        </DocSection>

        <DocSection id="get-the-build" title="Get the build" intro={BUILD_INTRO}>
          <Steps
            items={BUILD_ROWS.map((row) => ({
              glyph: row.os.startsWith("Windows") ? WINDOWS_GLYPH : terminal,
              title: row.os,
              body: (
                <>
                  Archive: {row.archive}
                  <br />
                  Run: <code>{row.run}</code>
                </>
              ),
            }))}
          />
          <DocText>
            <DocLink href="/host">Open the download page</DocLink>
          </DocText>
          <DocNote title="Official builds only.">{BUILD_NOTE}</DocNote>
        </DocSection>

        <DocSection id="first-run" title="First-run setup" intro={FIRSTRUN_INTRO}>
          <DocText>{FIRSTRUN_BODY}</DocText>
          <DocNote>{FIRSTRUN_NOTE}</DocNote>
        </DocSection>

        <DocSection id="configure" title="Configure server.jsonc" intro={CONFIG_INTRO}>
          <Snippet filename="server.jsonc" badge="Server config" code={CONFIG_SAMPLE} html={configHtml} />
          <Facts items={CONFIG_FIELDS.map((field) => ({ label: <code>{field.label}</code>, body: field.body }))} />
        </DocSection>

        <DocSection id="set-the-key" title="Set the license key" intro={ENV_INTRO}>
          <Snippet filename="shell" badge="Environment" code={ENV_SAMPLE} html={envHtml} />
          <DocText>
            Need a key, or want the full detail on how the master authorises your server?{" "}
            <DocLink href="/docs/server-licensing">Read about server licensing</DocLink>
          </DocText>
        </DocSection>

        <DocSection id="run" title="Run it" intro={RUN_INTRO}>
          <Snippet filename="shell" badge="Launch" code={RUN_SAMPLE} html={runHtml} />
          <DocText>
            <DocLink href={STARTUP_DOC.href}>{STARTUP_DOC.label}</DocLink>
          </DocText>
        </DocSection>

        <DocSection id="appears" title="It appears automatically" intro={APPEARS_INTRO}>
          <Steps items={APPEARS_STEPS.map((step) => ({ title: step.title, body: step.body }))} columns={3} />
          <DocNote>{APPEARS_NOTE}</DocNote>
        </DocSection>

        <DocSection id="next" title="Next: run it live with Warden" intro={NEXT_INTRO}>
          <DocText>
            <DocLink href="/docs/warden">Meet Warden, your server control room</DocLink>
          </DocText>
        </DocSection>

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
