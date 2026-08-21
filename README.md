# OPEN//77 — Frontend

Marketing and server-browser frontend for OPEN//77, a multiplayer project for Cyberpunk 2077.

This is a dependency-free static site: plain HTML, CSS and vanilla JavaScript. There is no build
step and no package manager — the files in this directory are exactly what gets served.

## Pages

| File             | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `index.html`     | Landing page                                       |
| `servers.html`   | Server browser, driven by `servers-data.js`        |
| `server.html`    | Individual server detail view                      |
| `create.html`    | Guide to hosting your own server                   |
| `docs.html`      | Documentation                                      |
| `community.html` | Community links and alpha signup                   |
| `brand.html`     | Brand kit reference, renders assets from `brand/`  |

## Scripts

- `script.js` — shared site behaviour (navigation, interactions)
- `servers.js` / `servers-data.js` — server browser rendering and its data source
- `server-page.js` — server detail page logic

## Directories

- `assets/` — imagery used by the site
- `brand/` — logos, favicons and social cards (shipped, used by `brand.html`)
- `references/` — design system notes, mood boards and competitor research
- `attachments/` — screenshots gathered during design

`references/` and `attachments/` are kept in version control as design source material but are
excluded from deployments via `.vercelignore`.

## Running locally

Any static file server works, for example:

```bash
npx serve .
```

Opening `index.html` directly from the filesystem also works, since nothing depends on a server.

## Deployment

Deployed on Vercel from this repository. There is no build command; Vercel serves the repository
root as static output. Configuration lives in `vercel.json`.
