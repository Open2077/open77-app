import type { BlogPostMeta } from "./devblog";

/** Client-safe presentation metadata. The digest's Markdown contract stays unchanged. */
export const BLOG_TOPICS = [
  { id: "gameplay", label: "Gameplay", match: /\b(gameplay|gamemodes?|races?|racing|pursuit|vehicles?|avs?|npc|npcs|combat|gorilla|deathmatch|battle royale|wardrobe|emotes?|poses?|respawn|reviv|freeroam|cordon|slow.mo)/i },
  { id: "networking", label: "Networking", match: /\b(sync|replication|network|latency|buckets?|co.op|sessions?|joins?|joining|integrity|stability)/i },
  { id: "server", label: "Server & tools", match: /\b(server|servers|warden|admin|scripting|lua|api|polyzone|tooling|tools|setup)\b/i },
  { id: "platform", label: "Platform", match: /\b(launcher|platform|website|browser|directory|discovery|ui|ux|alpha|signups|accounts?|mod support)\b/i },
  { id: "community", label: "Community", match: /\b(workshop|community|communities|creator|creators|recap)\b/i },
] as const;

export type BlogTopicId = (typeof BLOG_TOPICS)[number]["id"];
export type BlogFilters = { topic: BlogTopicId | "all"; month: string; query: string };

export function postTopics(post: BlogPostMeta) {
  // Broad SEO tags such as "cyberpunk-2077-dedicated-server" describe the whole
  // project, not an article's subject. Classify its actual title + summary.
  const text = `${post.title} ${post.description}`;
  const matches = BLOG_TOPICS.filter(topic => topic.match.test(text));
  return matches.length ? matches : [BLOG_TOPICS[3]];
}

export function blogDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function blogArchives(posts: readonly BlogPostMeta[]) {
  const months = new Map<string, number>();
  for (const post of posts) { const key = post.date.slice(0, 7); months.set(key, (months.get(key) ?? 0) + 1); }
  return [...months].sort(([a], [b]) => b.localeCompare(a)).map(([id, count]) => ({ id, count, label: new Date(`${id}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) }));
}

export function parseBlogFilters(search: string): BlogFilters {
  const params = new URLSearchParams(search);
  const topic = params.get("topic");
  const month = params.get("month") ?? "";
  return { topic: BLOG_TOPICS.some(item => item.id === topic) ? topic as BlogTopicId : "all", month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "", query: (params.get("q") ?? "").slice(0, 160) };
}

function searchable(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function filterBlogPosts(posts: readonly BlogPostMeta[], { topic, month, query }: BlogFilters) {
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  return posts.filter(post => (topic === "all" || postTopics(post).some(item => item.id === topic)) && (!month || post.date.startsWith(`${month}-`)) && words.every(word => searchable(`${post.title} ${post.description} ${post.tags.join(" ")} ${postTopics(post).map(item => item.label).join(" ")}`).includes(word)));
}
