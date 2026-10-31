import { masterCall } from "./api";

export type HighlightAction = { label: string; kind: "web" | "connect"; url: string | null; serverId: string | null };
export type Highlight = {
  id: string; revision: number; name: string; title: string | null; text: string | null;
  imageUrl: string | null; imageAlt: string | null; startsAtUtc: string; expiresAtUtc: string;
  published: boolean; priority: number; actions: HighlightAction[];
};
export const listHighlights = (token: string): Promise<Highlight[]> => masterCall("/api/v1/admin/highlights", { token });
export const saveHighlight = (token: string, value: Highlight): Promise<Highlight> => masterCall(
  `/api/v1/admin/highlights${value.id ? `/${value.id}` : ""}`,
  { token, method: value.id ? "PUT" : "POST", body: { ...value, id: value.id || "00000000-0000-0000-0000-000000000000" } },
);
export const deleteHighlight = (token: string, value: Highlight): Promise<void> => masterCall(
  `/api/v1/admin/highlights/${value.id}?revision=${value.revision}`, { token, method: "DELETE" },
);

export function highlightStatus(value: Highlight, now: number): string {
  if (Date.parse(value.expiresAtUtc) <= now) return "Expired";
  if (!value.published) return "Draft";
  return Date.parse(value.startsAtUtc) > now ? "Scheduled" : "Live";
}
