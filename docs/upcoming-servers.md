# Upcoming announcements in the server admin

The server directory at `/admin/servers` manages upcoming announcements for the
native Rust launcher. Enable **Upcoming server** and use **Edit announcement** to
edit its community, formatted name, language tags, opening time, Discord invite,
website, description and artwork. The editor expands below the server's row and
has save actions at both ends. Opening times use the administrator's local
timezone and are submitted as UTC; leaving the date blank means to be announced.

**Upcoming** is also a list filter. Plain server/community names and language
tags are searchable. Names and announcement previews share the public site's
safe `ServerText` formatter, including colors and styles; HTML is never executed.
Accessible labels and saved notices use the plain name.

Announcements persist without a live session. Hidden overrides publication, and
clearing Upcoming only restores a fresh server to the ordinary live directory.
The existing revision conflict handling and audited administrator authorization
are preserved. Unmodified profiles are omitted from label-only edits so old
operator metadata cannot interfere with unrelated visibility changes.

This requires Master schema 50 and the new optional `upcoming` property on
`GET /api/v1/admin/servers`. An older Master disables announcement editing.
It does not make the browser the authority for publication. The Rust launcher
reads the separate public `/api/v1/servers/upcoming` feed.

Verified with the actual local Master and isolated MariaDB in a real browser:
formatted names, plain-name search, offline licensed identities, date/languages/
links, persistence, hide/unhide and the server update request. Production build,
TypeScript, source lint and i18n checks pass. The public site has not been updated
with this feature yet.
