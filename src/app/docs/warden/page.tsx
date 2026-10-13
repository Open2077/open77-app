import { AgentNote } from "@/components/docs/agent-note";
import { DocPager } from "@/components/docs/doc-pager";
import { DocLink, DocNote, DocSection, DocText, Facts, FeatureGrid, Snippet, Steps } from "@/components/docs/docs-blocks";
import { DocsShell } from "@/components/docs/docs-shell";
import { JsonLd } from "@/components/json-ld";
import {
  commandLine,
  informationCircle,
  notification03,
  refresh,
  settings02,
  shield01,
  userGroup,
} from "@/components/ui/icons";
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

const CAP_GLYPHS: Record<string, string> = {
  console: commandLine,
  reload: refresh,
  players: userGroup,
  announce: notification03,
  config: settings02,
  roles: shield01,
};

export default async function WardenPage() {
  const [enableHtml, neighbours] = await Promise.all([
    highlightCode(ENABLE_SAMPLE, "jsonc"),
    getDocsNeighbours("warden"),
  ]);

  return (
    <>
      <DocsShell
        tone="blue"
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Warden" }]}
        eyebrow="Server administration"
        title="Warden."
        lede={WARDEN_LEDE}
        meta={<a href="/docs/warden.md">Markdown</a>}
        toc={TOC}
      >
        <DocSection id="overview" title="Overview" intro={WARDEN_OVERVIEW} />

        <DocSection id="enable" title="Enabling Warden" intro={ENABLE_INTRO}>
          <Snippet filename="server.jsonc" badge="Server config" code={ENABLE_SAMPLE} html={enableHtml} />
          <DocNote>{ENABLE_NOTE}</DocNote>
        </DocSection>

        <DocSection id="first-run" title="First run: the setup PIN" intro={PIN_INTRO}>
          <Steps items={PIN_STEPS.map((step) => ({ num: step.num, title: step.title, body: step.body }))} />
        </DocSection>

        <DocSection id="capabilities" title="What you can do" intro={CAPABILITIES_INTRO}>
          <FeatureGrid
            items={CAPABILITIES.map((cap) => ({
              glyph: CAP_GLYPHS[cap.icon] ?? informationCircle,
              title: cap.title,
              body: cap.body,
            }))}
          />
        </DocSection>

        <DocSection id="security" title="Keeping Warden secure" intro={SECURITY_INTRO}>
          <Facts items={SECURITY_POINTS.map((point) => ({ label: point.label, body: point.body }))} />
          <DocText>
            <DocLink href="/docs/host-a-server">Back to hosting a server</DocLink>
          </DocText>
        </DocSection>

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
