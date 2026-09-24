export type CommunityDraft = Readonly<{ text: string; revision?: number; originalBody?: string; notify?: boolean; requestId?: string }>;

/** Tab-memory only. Never stores sessions, tokens, or a draft under another account. */
export class CommunityDraftStore {
  private entries = new Map<string, CommunityDraft>();
  private listeners = new Set<() => void>();
  private maximum: number;
  constructor(maximum = 64) { this.maximum = maximum; }
  private key(account: string, form: string) { return JSON.stringify([account, form]); }
  get(account: string, form: string) { return this.entries.get(this.key(account, form)) ?? null; }
  get size() { return this.entries.size; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  set(account: string, form: string, draft: CommunityDraft) {
    if (!account || draft.text.length > 5000 || (draft.originalBody?.length ?? 0) > 5000) return false;
    const key = this.key(account, form);
    if (!this.entries.has(key) && this.entries.size >= this.maximum) return false;
    this.entries.set(key, Object.freeze({ ...draft }));
    this.listeners.forEach(listener => listener()); return true;
  }
  remove(account: string, form: string) {
    if (this.entries.delete(this.key(account, form))) this.listeners.forEach(listener => listener());
  }
}

export const communityDrafts = new CommunityDraftStore();
