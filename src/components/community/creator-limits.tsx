"use client";

import { useEffect, useState } from "react";
import { myQuotas, uploadLimits, type AccountQuota, type UploadLimits } from "@/lib/community/quotas";

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
  return <details className="hub-notice"><summary>Your publishing limits</summary>
    {error && <p role="alert">{error}</p>}
    {!value && !error && <p role="status">Loading your current allowances…</p>}
    {value && <><p>Up to {value.account.effective.draftProjectsPerAccount} unpublished projects, {value.account.effective.activeUploadsPerAccount} active uploads and {(value.account.effective.pendingBytesPerAccount / 1048576).toLocaleString()} MiB reserved at once. GitHub imports: {value.account.effective.gitHubImportsPerDay} per day.</p>
      <p>New ZIPs: {(value.limits.packageBytes / 1048576).toLocaleString()} MiB. Images: {(value.limits.imageBytes / 1048576).toLocaleString()} MiB and {(value.limits.imagePixels / 1000000).toLocaleString()} megapixels. Expanded packages: {(value.limits.expandedBytes / 1048576).toLocaleString()} MiB across {value.limits.archiveEntries.toLocaleString()} entries, including nested preloads.</p>
      <p>These are allowances, not remaining usage. Existing reservations keep their reviewed inspection limits. The server checks current availability when you submit.</p></>}
    <button type="button" className="btn btn-ghost" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Refresh limits</button>
  </details>;
}
