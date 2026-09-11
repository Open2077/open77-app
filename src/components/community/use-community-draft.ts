"use client";
import { useSyncExternalStore } from "react";
import { communityDrafts, type CommunityDraft } from "@/lib/community/drafts";

let warningInstalled = false;
export function useCommunityDraft(accountId: string | undefined, form: string) {
  const draft = useSyncExternalStore(communityDrafts.subscribe,
    () => accountId ? communityDrafts.get(accountId, form) : null, () => null);
  return {
    draft,
    save(value: CommunityDraft) {
      if (!accountId) return false;
      if (!warningInstalled && typeof window !== "undefined") {
        window.addEventListener("beforeunload", event => { if (communityDrafts.size) event.preventDefault(); });
        warningInstalled = true;
      }
      return communityDrafts.set(accountId, form, value);
    },
    discard() { if (accountId) communityDrafts.remove(accountId, form); },
  };
}
