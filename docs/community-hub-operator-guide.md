# Hub documentation and operator handoff

This is the implementation handoff for the free Hub release candidate, not a
production deployment announcement. The public beginner and creator guide is
[Share and use community resources](../content/guides/community-hub.md), registered
at `/docs/community-hub`. The hand-maintained navigation metadata registers it as
`source: authored`; wiki sync must not copy it into generated Markdown.

## Documentation ownership

| Topic | Canonical source |
| --- | --- |
| ZIP/GitHub publishing, media, review, inbox, reports, appeals, collaboration | [Website user guide](../content/guides/community-hub.md) |
| Host export, scoped creator credentials, durable transfer replay and spool cleanup | [Base export guide](../../hub-base/docs/community-hub-warden-export.md) |
| Archive metadata, dependency identities and explicit configuration mappings | [Base package metadata](../../hub-base/docs/community-hub-package-metadata.md) |
| Shared outer/nested archive content inspection | [Base shared inspection](../../hub-base/docs/community-hub-shared-inspection.md) |
| Installed-job backup retention, compaction and interrupted cleanup | [Base retention guide](../../hub-base/docs/community-hub-retention.md) |
| Acceptance status and evidence | [Execution ledger](community-hub-execution.md) |

Sibling `hub-base` links are for this review worktree. Public source links in the
authored guide currently name `feat/community-hub`; replace them with the released
base revision or synced wiki routes during an authorized release. Do not push a
branch just to make a release-candidate documentation link public. Runtime guide
authoring and wiki synchronization remain base-owned; do not hand-edit synced
`content/docs/*.md`. Historical investigation notes are not current capability
statements. The package metadata guide describes the current integration; the
Warden research notes preserve the chronology of earlier implementation stages.

## Operator checks before enabling access

Use the master repository's prepared deployment and rollback artifacts. Verify
the actual enabled capabilities and configured authorities rather than inferring
availability from an installed website page. The website, master, private file
gateway, worker, database, object storage and scanner must agree on the release.
GitHub adds its own provider credentials/callback configuration. Never place any
of these credentials in public client configuration, guides or exported packages.

Warden needs the configured Hub catalog and file gateway plus successful startup
recovery before installation can be offered. A Warden session is not a creator
account session: `hub.view`, `hub.manage` and `hub.publish` are separate local
permissions, and creator publication uses a scoped connection approved on the
website. Revocation must end that scope without deleting accepted private drafts.

Assign a moderation operator before public intake. Review the exact submitted
revision, discovered manifests/files, inspection results and media. Record a
reason for decisions. Do not approve a changed revision using an older review or
edit immutable artifact bytes. Report investigation, assignment, resolution and
appeals belong in the moderation workspace; private investigation notes are not
creator-facing explanations. Contributor rights/license/appeal wording still
requires project-owner review before public acceptance.

Back up database, private objects and the server's private Hub state using the
existing secret-handling procedure. Retention policy is not a backup strategy.
An uncertain journal, malformed inventory or unique changed backup is a reason
to preserve evidence and resolve recovery, not to delete state until startup
proceeds. Follow the prepared rollback runbook rather than downgrading a migrated
database or replacing live resource trees ad hoc.

## Validation boundaries

- Real local services have exercised scoped creator connection/revocation,
  inspected private publication, ambiguous create/PUT response recovery and
  persisted transfer restart/resume. These are private drafts, not public release
  publication or evidence of production configuration.
- Ordinary resource install/update/rollback has real Warden/runtime evidence.
  Preload staging, pending restart, launcher preparation and player reconnection
  have a separate acceptance gate; consult the latest ledger rather than treating
  `awaiting_restart` as `committed`.
- Shared inspection, frontend type/lint/build checks and isolated browser fixtures
  are useful but do not replace running the actual Next application. The prior
  automatic approval rejection of Next startup remains a browser-validation
  blocker. No alternative server should be used to bypass it.
- Real GitHub OAuth/provider behavior needs configured-provider evidence. An
  implemented picker or mock-provider test does not close this gate.
- Complete the actual creator A publish / creator B discover-download / moderator
  decision journeys, keyboard/focus and 390/768/1440-width checks before declaring
  the website release-ready. Recheck screenshot/video failure states, interrupted
  upload recovery, revision conflicts, subscriptions and appeals in those journeys.

These are remaining validation or operational gates, not declarations that the
implemented features are deferred. Paid packages and the other features explicitly
excluded by the approved plans remain out of scope. Do not deploy or publish this
candidate until separately authorized.
