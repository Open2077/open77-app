# Public documentation

Public guides are maintained in this repository. The platform wiki remains the technical source for implementation contracts, but it is not public copy to paste verbatim.

## Writing

- Start with the feature's purpose and runtime. Follow with prerequisites, a minimal example, options/events, errors, lifecycle and relevant limitations.
- Use concise, neutral English. Explain behavior directly; avoid conversational asides, self-evaluation and repeated warnings.
- Document current contracts. Keep test runs, review dates, benchmark diaries, implementation phases and deployment/CDN status in internal engineering notes.
- Keep real version requirements, permissions, limits and failure semantics. Removing a test diary must not turn uncertain behavior into a guarantee; state the compatibility limit or mark the feature experimental.
- Preserve exact symbols, signatures, record IDs, examples and units. A prose edit must not change runtime behavior.
- Dates inside configuration or data examples, release metadata and internal provenance are not editorial notes and can remain.

## Wiki updates

The reviewed guides are listed in `scripts/curated-docs.json`. Full and scoped wiki sync preserve their site copies. Merge relevant upstream technical changes manually and review the resulting public text. New guides still pass the editorial checks before import.

`scripts/doc-api-editorial.json` contains reviewed API descriptions and the digest of the upstream wording they replace. Sync changes prose only; signatures and other contract fields continue to come from upstream. A changed source description stops sync for review rather than silently retaining potentially obsolete wording.

An optional `sourceOverlaySha256` records the source overlay separately when the generated entry appends runtime-specific text. Overlay checks accept only the reviewed replacement paired with an exact known source digest.

After editing a guide, update its `content/docs/_manifest.json` byte count and SHA-256 (LF text). Keep upstream provenance and record site-owned amendments separately; do not invent a new upstream sync date. Authored guides in `content/guides` have no upstream manifest record.

Run `npm run verify:docs`, `npm run verify:content`, the affected contract checks and `npm run build`. Check both HTML and Markdown routes for public wording and links. API descriptions also feed Markdown and agent-facing documentation.
