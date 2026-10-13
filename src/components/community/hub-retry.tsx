"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { refresh } from "@/components/ui/icons";

/** Re-reads the current page from the server, for transient read failures. */
export function HubRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button color="blue" border lines="none" size="sm" icon={refresh} iconPosition="left" busy={pending} onClick={() => startTransition(() => router.refresh())}>
      Try again
    </Button>
  );
}
