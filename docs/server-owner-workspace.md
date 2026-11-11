# Server owner workspace

Owner entry: `/account/keys`. Staff queue: `/admin/upcoming`.

The master enforces a maximum of five active licenses and five successful creations per UTC day, including subsequently revoked/deleted keys. The site displays both authoritative counters and the local time of the next UTC reset. Existing keys remain valid. Revoked licenses are hidden by default in both owner and administrator views, with explicit status filters.

Each license shows its last attached server, stable ID, last address, online/offline observation and last-seen time. Details remain available after an offline server leaves the live directory. Owner history uses ten cards per page; search covers the full loaded license collection.

Owners can prepare an upcoming announcement for an available license that has enrolled a server: formatted name, community, language tags, opening date, Discord invitation, website, description and artwork. Submission requires acknowledgment that approval permanently locks the content. Pending requests cannot be edited. Staff rejection requires a visible reason; the owner can correct and resubmit using the current revision. One approval is allowed per license.

Staff review and filter pending/approved/rejected/launched requests on the paginated queue. Decisions require a second click. Approval rechecks the license and publishes through the existing Rust launcher Upcoming feed. Staff can mark an approved launch complete; its announcement leaves Upcoming and the actual online server can return to the live directory. This does not unlock owner edits or another submission. A hidden server, revoked license or suspended owner cannot publish an announcement.

The browser client is `src/lib/account/server-owner-api.ts`; state/security rules live in the master. The old flat license API remains compatible. Deploy master schema 51 before this UI, and keep auxiliary community services on the matching schema.

Validation: `npm run verify:owner-workspace:browser -- http://127.0.0.1:3132` uses an isolated Chrome profile and intercepts every API request, including all writes. It tests hidden revoked history, last-server display, quotas, one-time key display, owner submission, refusal/reason/resubmission, approval locks, staff launch completion, admin status filters and mobile pointer interaction. No fixture writes reach production.
