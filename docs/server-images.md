# Server images (icon + banner) — end-to-end design spec

How a server owner's **icon** and **banner** travel from their server config to the
website and launcher, and where each image is validated. The website's runtime
display guard (already shipped, see below) is deliberately **not** the only guard —
it is defense-in-depth. The real validation belongs to the server and the master.

## The pipeline

```
Owner (server config)          Server                    Master                       Site / Launcher
─────────────────────  ─────────────────────  ──────────────────────────  ────────────────────────────
identity.icon    ─────▶ validate (type/size/  ─▶ receive in registration ─▶ store + serve via CDN ─▶ iconUrl   ─▶ render
identity.banner  ─────▶  dimensions per slot)     metadata (content/hash/     return validated URLs    bannerUrl     (+ client
  file (preferred)       reject on failure         w/h/data)                  in the catalog                         display
  or URL                 publish to master                                                                          guard)
```

Each hop tightens the guarantee: the **server** is the trusted uploader (it owns the
config and the license), the **master** is the authority that re-checks and is the
only thing that ever hands a URL to clients, and the **site/launcher** render only
what the master blessed — then still guard at display time.

## What exists vs. what to build

| Piece | Status |
|---|---|
| Master registration metadata **already carries an icon** (contentType / sha256 / width / height / data) | **Exists** |
| Server config **`identity.icon`** | **Exists** |
| Site catalog `iconUrl`, rendered on card + detail | **Exists** (this change wires it end-to-end with a guard) |
| Site display-guard for icon **and** banner | **Exists** (this change — `src/lib/server-images.ts`) |
| Site catalog `bannerUrl` field (forward-compatible, optional) | **Exists in the type** (`CatalogServer.bannerUrl`), master does not populate it yet |
| Server config **`identity.banner`** + per-slot validation | **To build** |
| Master **banner** store + validated **`bannerUrl`** in catalog + single-server responses | **To build** |
| Editing icon/banner in the server config UI | **To build — belongs in the upcoming "Warden" admin panel** |

## Slot constraints (single source of truth)

These MUST match the site's display guard in `src/lib/server-images.ts`
(`ICON_CONSTRAINTS` / `BANNER_CONSTRAINTS`). Server-side validation should be the
strict version; the client guard is the lenient last line.

**Allowed types (both slots):** `image/png`, `image/jpeg`, `image/webp`.

### Icon

- **Shape:** square. Client guard tolerates skew up to `longer/shorter ≤ 1.2`;
  server SHOULD require exact square (1:1).
- **Dimensions:** min **64×64**, max **1024×1024**. Recommended stored size **256×256**.
- **Max bytes (recommended server cap):** 512 KB.

### Banner

- **Shape:** wide. Client guard requires aspect **2.0–5.0**; server SHOULD target
  a fixed ratio (recommend **3:1**, e.g. **1200×400**).
- **Dimensions:** min width **320**, max any side **4096**. Recommended stored size
  **1200×400**.
- **Max bytes (recommended server cap):** 2 MB.

## Server-side validation (to build)

On config load / update, for each provided slot:

1. Resolve the source — a **file** (preferred: bytes the server owns and hashes) or
   a **URL** (fetch once, then treat as a file; never hand a raw third-party URL
   straight to the master).
2. Sniff the real content type from magic bytes; reject anything outside the allowed
   set (do not trust the extension).
3. Decode and read exact pixel dimensions; enforce the per-slot bounds above.
4. Enforce the byte cap.
5. Optionally re-encode/normalize to the recommended stored size.
6. Compute `sha256`, and publish `{ contentType, sha256, width, height, data }` to the
   master in the registration metadata — the **same envelope the icon already uses**,
   extended with a `banner` entry.

Reject with a clear per-slot error; a bad image must fail the config validation loudly,
not silently drop the server from the directory.

## Master-side (to build for banner; icon exists)

1. Receive icon (exists) and **banner** (new) in registration metadata.
2. Re-validate independently — the master trusts no uploader: content type, size,
   dimensions, and that `sha256` matches the bytes.
3. Store and serve via the CDN, addressed by content hash (immutable, cacheable).
4. Return validated **`iconUrl`** (exists) and **`bannerUrl`** (new) in
   `GET /api/v1/servers` and `GET /api/v1/servers/{id}`.
5. If a slot fails re-validation, omit that URL (`null`) rather than serving a bad asset —
   clients already fall back to a placeholder.

## Site / launcher rendering (exists)

- The site reads `iconUrl` (card + detail) and `bannerUrl` (detail hero), both optional.
- The **display guard** (`ServerImage` + `src/lib/server-images.ts`) renders an image
  only after it (a) actually decodes and (b) passes the dimension/aspect check for its
  slot. On load-failure or non-conformance it shows a themed gradient placeholder —
  never a broken or distorted image. This holds even if the master ever regresses.
- The launcher SHOULD apply the same guarantee (validate-then-render, placeholder on
  failure) so both surfaces behave identically.

## Note

Because `bannerUrl` is optional and absent today, the detail page already renders the
themed placeholder for it with no code change once the master starts populating it —
the field, the guard, and the constants are in place waiting for the server + master work.
