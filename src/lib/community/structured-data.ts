import type { CommunityProject } from "./types";

export function communityStructuredData(project: CommunityProject, origin: string) {
  const url = `${origin}/resources/${project.slug}`;
  return JSON.stringify({ "@context": "https://schema.org", "@type": "CreativeWork", "@id": `${url}#creation`, url,
    name: project.content.title, description: project.content.summary,
    ...(project.publishedAtUtc ? { datePublished: project.publishedAtUtc } : {}),
    ...(project.creatorHandle ? { author: { "@type": "Person", name: `@${project.creatorHandle}`, url: `${origin}/creators/${project.creatorHandle}` } } : {}),
    ...(project.content.sourceUrl ? { sameAs: project.content.sourceUrl } : {}),
  }).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}
