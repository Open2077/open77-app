"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function HubRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="btn btn-ghost" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Trying again…" : "Try again"}</button>;
}
