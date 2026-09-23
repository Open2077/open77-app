# Community Dev Tracker

The website consumes the Master's `/api/v1/dev-tracker` API. It does not keep a
second account database, store proposals in local storage, or use the Workshop's
package approval queue. All text is rendered as plain text, never supplied HTML.

## Player and staff workflow

- `/dev-tracker`: public proposals; search, category/status filters and sorting
  by date, activity or vote score. Sign in with a verified account to contribute.
- `/dev-tracker/new`: one focused proposal, a title, category and description.
  The live allowance and next permitted submission time come from the Master.
- `/dev-tracker/mine`: the account's proposals, including its moderated ideas.
- `/dev-tracker/:id`: upvote/downvote, discussion with one level of replies,
  and a public timeline of staff decisions and progress updates.
- `/dev-tracker/approved`: only validated ideas and later development stages.
- `/dev-tracker/roadmap`: Validated → Planned → In development → Testing →
  Shipped. Each column is paginated; counts are not limited to the visible cards.
- `/admin/dev-tracker`: proposed ideas first, searchable moderation directory.
  Open a proposal to access staff controls, also visible on its public detail
  page when signed in as an administrator.

Votes express interest, not deadlines. Validation means accepted for consideration,
not a promise to ship. Staff must explicitly validate before scheduling work.
Staff may publish an update without changing the stage, decline an idea, hide it
or lock its discussion and new votes. Every review requires a public explanation.
Hidden ideas remain accessible to their author and current administrators only.
Comment moderation reasons are private audit records; the message becomes a
tombstone for players. Authors may delete their own text permanently; replies remain.

Authors may edit an unlocked proposal only before approval and before votes or
comments arrive. They may withdraw a proposed idea without refunding their quota.
Once feedback exists, clarifications belong in the discussion. One vote per account
can be changed or removed; authors cannot vote for themselves. Closed ideas allow
removal of an existing vote but no new vote.

## Anti-spam and failure handling

Default Master policy: 3 ideas per rolling 7 days, 30 minutes between ideas;
20 comments per rolling hour, 20 seconds between comments. These are configurable
server-side, persisted through timestamps, account-wide and checked transactionally.
Hidden, withdrawn or deleted contributions still count. Verified accounts are
required, including staff; voting has a separate transport write limit.

Creation requests retain a UUID across a retry with unchanged content. A timeout
does not create another proposal/comment when retried. On a confirmed successful
comment the key resets for the next message. Optimistic revisions protect edits
from overwriting a concurrent moderator's work. Stale edits ask the user to refresh.
The UI preserves draft text after request failure and displays the Master's exact
cooldown, not a generic promise that waiting one minute will suffice.

No seed proposals are inserted on deployment. Empty and unavailable states are
distinct. The public board is a staff-maintained view, not an automatic Git tracker.

## Rollout and verification

Deploy the companion Master branch with schema migration **41** first. The Master
repository's `docs/dev-tracker.md` describes configuration and the coordinated
rollout for schema-dependent community services. Confirm `/api/v1/dev-tracker/catalog`
responds and the website origin is allowed by the existing Master CORS configuration.
Then deploy this website. `NEXT_PUBLIC_OP77_MASTER_URL` follows the existing account
client configuration; no additional secret is needed in the website.

Run `npm run test:dev-tracker`, `npm run check`, and `npm run build`.
With a local website on `localhost:3219`, run `npm run verify:dev-tracker:browser`.
The browser suite intercepts only its own API requests with isolated fixtures;
it exercises the rendered desktop/mobile UI without writing to a real Master.
Screenshots go to ignored `.shots/tracker-*.png`. Master integration tests separately
exercise the real HTTP handlers and MariaDB transactions in disposable test databases.

This document describes the implementation, not a claim that it has been deployed.
