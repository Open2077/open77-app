export const categories = [
  ["gameplay", "Gameplay"], ["multiplayer", "Multiplayer"], ["scripting", "Scripting & API"],
  ["launcher", "Launcher"], ["website", "Website & community"], ["quality_of_life", "Quality of life"], ["other", "Other"],
] as const;
export const states = [
  ["proposed", "Community review"], ["approved", "Validated"], ["planned", "Planned"], ["in_progress", "In development"],
  ["testing", "Testing"], ["shipped", "Shipped"], ["declined", "Not planned"], ["withdrawn", "Withdrawn"],
] as const;
export const stages = states.slice(1, 6);
export const stateLabel = (state: string) => states.find(([id]) => id === state)?.[1] ?? state;
export const categoryLabel = (category: string) => categories.find(([id]) => id === category)?.[1] ?? category;
export type Idea = { id: string; authorId: string; authorName: string; title: string; body: string; category: string; state: string;
  revision: number; hidden: boolean; locked: boolean; feedbackStarted: boolean; createdAtUtc: string; updatedAtUtc: string; upvotes: number; downvotes: number; comments: number; myVote: number };
export type Comment = { id: string; ideaId: string; authorId: string; authorName: string; parentId: string | null; body: string | null;
  hidden: boolean; deleted: boolean; staff: boolean; revision: number; createdAtUtc: string; updatedAtUtc: string };
export type Update = { id: string; authorName: string; state: string; message: string; createdAtUtc: string };
export type Detail = { idea: Idea; updates: Update[] };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type Quota = { remaining: number; nextSubmissionAtUtc: string | null; ideasPerWeek: number; ideaCooldownMinutes: number };
export type Catalog = { categories: string[]; states: string[]; limits: { ideasPerWeek: number; ideaCooldownMinutes: number; commentsPerHour: number; commentCooldownSeconds: number } };
export const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
export const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const dateTime = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";
export const canVote = (idea: Idea, accountId?: string) => !!accountId && accountId !== idea.authorId && !idea.hidden && !idea.locked && !["declined", "withdrawn", "shipped"].includes(idea.state);
export const canEdit = (idea: Idea, accountId?: string) => idea.authorId === accountId && idea.state === "proposed" && !idea.locked && !idea.hidden && !idea.feedbackStarted && idea.upvotes + idea.downvotes + idea.comments === 0;
export function reviewStates(current: string) { return states.filter(([state]) => !["proposed", "declined", "withdrawn"].includes(current) || !["planned", "in_progress", "testing", "shipped"].includes(state)); }
