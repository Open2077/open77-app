"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/data";
import { Notice } from "@/components/ui/feedback";
import { refresh } from "@/components/ui/icons";
import { myQuotas, uploadLimits, type AccountQuota, type UploadLimits } from "@/lib/community/quotas";
import { Disclosure, Fine, Pending } from "@/components/account/kit";

const mib = (bytes: number) => `${(bytes / 1048576).toLocaleString()} MiB`;

export function CreatorLimits({ token }: { token: string }) {
  const [value, setValue] = useState<{ account: AccountQuota; limits: UploadLimits } | null>(null);
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    Promise.all([myQuotas(token, signal), uploadLimits(signal)]).then(([account, catalog]) => {
      if (!controller.signal.aborted) { setValue({ account, limits: catalog.limits }); setError(""); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Your current limits could not be loaded."); });
    return () => controller.abort();
  }, [token, attempt]);
  return (
    <Disclosure summary="Your publishing limits">
      {error ? <Notice kind="danger">{error}</Notice> : null}
      {!value && !error ? <Pending label="Loading your current allowances" /> : null}
      {value ? (
        <>
          <DefinitionList
            items={[
              { label: "Unpublished projects", value: value.account.effective.draftProjectsPerAccount },
              { label: "Active uploads", value: value.account.effective.activeUploadsPerAccount },
              { label: "Reserved at once", value: mib(value.account.effective.pendingBytesPerAccount) },
              { label: "GitHub imports / day", value: value.account.effective.gitHubImportsPerDay },
              { label: "New ZIPs", value: mib(value.limits.packageBytes) },
              { label: "Images", value: `${mib(value.limits.imageBytes)} · ${(value.limits.imagePixels / 1000000).toLocaleString()} MP` },
              ...(value.limits.clipBytes ? [{ label: "Hover clips", value: `${mib(value.limits.clipBytes)} · ${value.limits.clipSeconds ?? 8} s` }] : []),
              { label: "Expanded packages", value: `${mib(value.limits.expandedBytes)} · ${value.limits.archiveEntries.toLocaleString()} entries` },
            ]}
          />
          <Fine>Expanded package limits include nested preloads. These are allowances, not remaining usage. Existing reservations keep their reviewed inspection limits. The server checks current availability when you submit.</Fine>
        </>
      ) : null}
      <div>
        <Button lines="none" color="neutral" border size="sm" icon={refresh} iconPosition="left" onClick={() => { setError(""); setAttempt(value => value + 1); }}>
          Refresh limits
        </Button>
      </div>
    </Disclosure>
  );
}
