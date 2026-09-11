"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/account/session";
import { recordProjectView } from "@/lib/community/client-api";

export function ProjectView({ id }: { id: string }) {
  const { session, ready } = useSession();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || sent.current === id) return;
    const controller = new AbortController();
    function record() {
      if (document.visibilityState !== "visible" || sent.current === id) return;
      sent.current = id;
      void recordProjectView(id, session?.token, AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])).catch(() => {});
    }
    record(); document.addEventListener("visibilitychange", record);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", record); };
  }, [id, ready, session?.token]);
  return null;
}
