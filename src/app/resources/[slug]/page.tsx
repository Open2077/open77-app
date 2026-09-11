import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { HubShell, HubUnavailable } from "@/components/community/hub-shell";
import { CommunityReadError, getProject } from "@/lib/community/public-api";
import { categoryLabel } from "@/lib/community/types";
import { communityMarkdown } from "@/lib/community/markdown";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return project ? pageMetadata({ title: project.content.title, description: project.content.summary, path: `/resources/${project.slug}` }) :
    { title: "Resource unavailable", robots: { index: false, follow: false } };
}
export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProject(slug).catch((error: unknown) => error);
  if (result instanceof CommunityReadError && result.status === 404) notFound();
  if (!result || typeof result !== "object" || !("projectId" in result)) return <HubShell><HubUnavailable /></HubShell>;
  const project = result as Awaited<ReturnType<typeof getProject>>;
  if (project.slug !== slug) permanentRedirect(`/resources/${project.slug}`);
  const { content } = project;
  const [description, installation, license] = await Promise.all([
    communityMarkdown(content.description), communityMarkdown(content.installation), communityMarkdown(content.license ?? ""),
  ]);
  return <HubShell><header className="hub-directory-head"><Link href="/resources">← Community resources</Link>
    <p className="hub-kicker">{categoryLabel(content.category)} / {content.kind === "showcase" ? "SHOWCASE" : "RESOURCE"}</p>
    <h1>{content.title}</h1><p>{content.summary}</p><div className="hub-tags">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div></header>
    <div className="hub-detail"><article className="hub-prose"><h2>About this creation</h2><div dangerouslySetInnerHTML={{ __html: description }} />
      {content.installation && <><h2>Installation</h2><div dangerouslySetInnerHTML={{ __html: installation }} /></>}
      {content.license && <><h2>License</h2><div dangerouslySetInnerHTML={{ __html: license }} /></>}
    </article><aside className="hub-detail-panel"><p className="hub-kicker">{content.maturity.toUpperCase()}</p>
      <h2>{content.kind === "showcase" ? "A look at what’s possible." : "Release information"}</h2>
      <p>{content.kind === "showcase" ? "This creation is a showcase. Its author hasn’t attached a downloadable release." : "Check the author’s installation instructions and compatibility before adding this resource to your server."}</p>
      {content.sourceUrl && <a className="btn btn-ghost" href={content.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc">View source ↗</a>}
      {content.issueUrl && <p><a href={content.issueUrl} target="_blank" rel="noopener noreferrer nofollow ugc">Issue tracker ↗</a></p>}
    </aside></div></HubShell>;
}
