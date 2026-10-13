import { Button } from "@/components/ui/button";
import { arrowRight01 } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { CommunityReadError } from "@/lib/community/public-api";
import { hubReadFailure } from "@/lib/community/read-failure";
import { HubRetry } from "./hub-retry";

import styles from "./hub-read-failure.module.css";

// Only fixed copy crosses the rendering boundary; API bodies and error messages
// may contain private details and must never appear here.
export function HubReadFailure({ error }: { error: unknown }) {
  const status = error instanceof CommunityReadError ? error.status : undefined;
  const failure = hubReadFailure(status);
  return (
    <div className={styles.failure} role="status" data-retry={failure.retry} data-hub-failure>
      <span className={styles.code} aria-hidden="true">
        {status && status >= 400 ? status : "!?"}
      </span>
      <div className={styles.copy}>
        <Eyebrow>{failure.label}</Eyebrow>
        <Display as="h2" size="sm">
          {failure.title}
        </Display>
        <p className={styles.text}>{failure.description}</p>
        <div className={styles.action}>
          {failure.retry ? (
            <HubRetry />
          ) : (
            <Button color="blue" border lines="none" size="sm" icon={arrowRight01} href="/workshop/browse">
              Explore public resources
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
