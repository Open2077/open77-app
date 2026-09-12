import Link from "next/link";
import { CommunityReadError } from "@/lib/community/public-api";
import { hubReadFailure } from "@/lib/community/read-failure";
import { HubRetry } from "./hub-retry";

// Only fixed copy crosses the rendering boundary; API bodies and error messages
// may contain private details and must never appear here.
export function HubReadFailure({ error }: { error: unknown }) {
  const failure = hubReadFailure(error instanceof CommunityReadError ? error.status : undefined);
  return <div className="hub-empty" role="status"><span className="hub-kicker">{failure.label}</span>
    <h2>{failure.title}</h2><p>{failure.description}</p>
    {failure.retry ? <HubRetry /> : <Link className="btn btn-ghost" href="/resources">Explore public resources</Link>}
  </div>;
}
