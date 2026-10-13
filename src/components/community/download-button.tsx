"use client";

import { useState } from "react";

import { Button, type ButtonColor } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";
import { download02, fileDownload } from "@/components/ui/icons";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import { requestDownload, requestReviewDownload } from "@/lib/community/client-api";

import styles from "./download-button.module.css";

/**
 * Two steps, because a download is a short-lived signed grant: "Get ZIP" asks
 * the master for a delivery, then a real link to the file takes its place until
 * the grant expires.
 *
 * `primary` draws the speed lines (the one main action of a view); `fullWidth`
 * fills a side panel; `compact` is the small size for lists; `color` follows
 * the page that hosts it (Workshop blue by default).
 */
export function DownloadButton({ releaseId, version, review, primary = false, fullWidth = false, compact = false, color = "blue" }: {
  releaseId: string; version: string; review?: { token: string; revision: number };
  primary?: boolean; fullWidth?: boolean; compact?: boolean; color?: Exclude<ButtonColor, "neutral">;
}) {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ url: string; expires: number } | null>(null);
  async function prepare() {
    setBusy(true); setError(""); setReady(null);
    try {
      const delivery = review ? await requestReviewDownload(review.token, releaseId, review.revision) : await requestDownload(releaseId, session?.token);
      const url = new URL(delivery.downloadUrl);
      if (url.username || url.password || !(url.protocol === "https:" ||
        url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Invalid delivery URL");
      const expires = Date.parse(delivery.expiresAtUtc);
      if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error("Expired delivery grant");
      setReady({ url: url.href, expires });
    } catch (failure) {
      setError(failure instanceof MasterApiError ? failure.message : "The download could not be prepared. Please try again.");
    } finally { setBusy(false); }
  }
  // The Button label stays constant (busy pulses it); the status line says what is happening.
  const label = review ? `Inspect ZIP · ${version}` : `Get ZIP · ${version}`;
  return (
    <div className={cx(styles.action, fullWidth && styles.full)} data-download-action>
      {ready ? (
        <a
          className={cx(styles.ready, compact && styles.compact, color !== "blue" && styles[color])}
          href={ready.url}
          referrerPolicy="no-referrer"
          onClick={event => {
            if (Date.now() >= ready.expires) { event.preventDefault(); setReady(null); setError("This link expired. Prepare a new download."); }
          }}
        >
          <Icon glyph={fileDownload} />
          <Glitch>{`Download ZIP · ${version}`}</Glitch>
        </a>
      ) : (
        <Button color={color} lines={primary ? "right" : "none"} icon={download02} iconPosition="left" busy={busy} fullWidth={fullWidth} size={compact ? "sm" : "md"} onClick={() => void prepare()}>
          {label}
        </Button>
      )}
      <span role="status" className={styles.status}>
        {ready ? "Your download is ready." : busy ? "Checking release availability…" : ""}
      </span>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}
