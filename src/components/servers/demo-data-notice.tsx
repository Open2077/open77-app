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
        PRE-ALPHA{" "}
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
        OPEN//77 is in pre-alpha and the public alpha has not opened, so no live public servers
        exist yet.
        Every listing here is illustrative demo data showing how the live browser will work — player
        counts, pings and communities are not real. Live listings replace this the moment the first
        public alpha ships. <Link href="/docs/platform#roadmap">See the roadmap</Link>.
      </p>
    </>
  );
}
