"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { InfoIcon } from "@/components/icons";

/**
 * The standing disclosure for the server directory.
 *
 * Every surface that renders `servers-demo.ts` must render this. The listings
 * are invented, and a browser full of plausible player counts is exactly the
 * kind of thing a reader would otherwise take as evidence that the platform
 * already has a population.
 */
export function DemoDataNotice({ scope = "listings" }: { scope?: "listings" | "page" }) {
  const [expanded, setExpanded] = useState(false);
  const noteId = useId();

  return (
    <>
      <p className="sb-status" role="note">
        <InfoIcon size={13} />
        DEMO VIEW{" "}
        <span className="sb-status-dim">
          {scope === "page"
            ? "// this server page uses demo data"
            : "// server listings currently use demo data"}
        </span>
        <button
          className="sb-status-more"
          type="button"
          aria-expanded={expanded}
          aria-controls={noteId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Hide" : "What does this mean?"}
        </button>
      </p>
      <p className="sb-status-note" id={noteId} hidden={!expanded}>
        This view uses illustrative demo data — its player counts, pings and communities are not
        real. Alpha is active; use the <Link href="/servers">live directory</Link> for
        actual listings. Joining a world requires an approved account.
      </p>
    </>
  );
}
