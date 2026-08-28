# Branding your server

Two images decide how your server looks to a player who has never heard of it:
a square **icon** on its row in the launcher and on the website, and a wide
**banner** across the top of its detail page. Both are optional, and a server
without them is drawn with a generated gradient placeholder — which is exactly
what most servers in the list look like today, because branding used to mean
editing files on the box.

It does not any more. Upload both from the Warden panel, and the icon goes live
without restarting your server.

## What the two images are

| | Icon | Banner |
|---|---|---|
| Where it appears | server row in the launcher, server card and detail page on the site | hero strip above the server name on its detail page |
| Shape | square | wide |
| Format | PNG only | PNG, JPEG or WebP |
| Recommended | **256×256** | **1200×400** (3:1) |

They are files that live next to your `server.jsonc`, referenced by
`identity.icon` and `identity.banner` as **relative paths** — not URLs. Your
server reads the bytes, sends them to the master inside its registration, and
the master stores them by content hash and serves them from
`/api/v1/icons/{sha256}` and `/api/v1/banners/{sha256}`. You never upload
anything to a CDN, and there is nothing to host yourself.

## The rules that actually apply

Several guards sit between your file and a picture on a page, and they are not
all equally strict. The bounds below are the **intersection** — an image that
satisfies them works everywhere. Warden enforces exactly this list, so if the
panel accepts your file, the website will draw it.

### Icon

| Rule | Value |
|---|---|
| Format | PNG |
| Size | **64×64 to 512×512** pixels |
| Shape | square (the site hides any icon more lopsided than 1.2:1) |
| File size | at most 256 KiB |

The 64 px floor is the one that catches people. A 32×32 icon is accepted by an
older server build and by the master, and then silently shows a placeholder on
the website. Warden refuses it up front and tells you the size you gave it.

### Banner

| Rule | Value |
|---|---|
| Format | PNG, JPEG or WebP |
| Width | 320 to 4096 pixels |
| Aspect ratio | between 2.0:1 and 5.0:1 |
| File size | at most 2 MiB |

### The one that is easy to miss: the pair has a combined budget

Both images travel base64-encoded inside a **single registration request** to
the master, and that request is capped at 512 KiB. So the two files together
must stay under about **378 KiB of raw bytes** — well below the 2 MiB a banner
is allowed on its own.

This matters more than it looks. Going over does not produce a missing image:
the whole registration is refused, and **your server does not appear in the
server list at all**. Warden checks the pair before it writes anything and
tells you how much to shave off; a server started with an over-budget pair
already on disk logs an explicit error instead of failing silently.

A PNG exported at a sensible palette is nowhere near this. A photographic
banner saved as a 24-bit PNG easily is — export it as JPEG or WebP.

## Uploading from Warden

1. Open your panel and sign in (see [Warden](/docs/warden) if you have not set
   it up yet). You need the `config.edit` permission — the owner account has it.
2. Go to **Config**. Under *Identity* there is a picker for the icon and one
   for the banner, each with the rules printed next to it and a preview of what
   is currently set.
3. Choose a file. The panel decodes it in your browser and checks it
   immediately, so a wrong size is refused before anything is uploaded — with
   the bound and your file's actual dimensions in the message, for example
   *"Icon must be at least 64×64 px; yours is 48×48."*
4. Under the two pickers, a line shows how much of the combined budget you are
   using.
5. Press **Apply changes**.

Your server writes the file next to its config (`server-icon.png`,
`server-banner.png`) and updates `server.jsonc` to point at it.

## What happens next, and what needs a restart

**Images do not need a restart.** Applying them re-sends your server's
registration to the master straight away, with the new pictures in it. The
panel tells you what happened — *"images written; published to the master"* —
and the launcher and website pick the change up on their next refresh, within
about a minute.

Everything else in that form — name, description, tags, visibility, player cap,
public endpoint — is baked into the options your server started with, and those
**do** need a restart. Warden only shows the "restart required" banner when a
restart is genuinely required, so when you see it, it means something.

To remove an image, use **Remove icon** / **Remove banner** and apply. That
clears the reference; the file stays on disk.

## Doing it by hand instead

Warden is not required. Put the files next to `server.jsonc` and name them in
the identity block:

```jsonc
"identity": {
  "name": "My Server",
  "icon": "server-icon.png",
  "banner": "server-banner.png"
}
```

The paths are relative to the config file and may not escape its directory or
be symlinks. Restart the server to pick them up. If an image is outside the
bounds above, the server still starts and logs a warning saying which bound it
missed — worth reading, because that is the difference between a picture and a
placeholder.

## Banner support needs a recent master

Banners are newer than icons. A master that predates them accepts the
registration and stores the icon, but its catalogue response carries no banner
field, so nothing shows the banner anywhere — no error, just no hero image. If
your icon appears and your banner does not, and everything above checks out,
this is almost certainly why. Icons are unaffected.

## When something does not show up

| Symptom | Likely cause |
|---|---|
| Placeholder gradient instead of your icon | icon under 64 px, or not square — the site's display guard hides it silently |
| Server missing from the list entirely, right after a branding change | the icon and banner together exceed the master's registration limit; check the server log for a 413 |
| Icon shows, banner does not | the master is older than banner support (see above) |
| Nothing changed after Apply | check the panel's message — an error is shown in full, and a "restart required" banner means the field you edited was not an image |
