# Workshop — public experience

The public Workshop follows the navy/cyan, soft-glass visual language of the
home, download, account and devblog pages. Existing local artwork is reused; no
new asset download or third-party font dependency is required.

## Scope

- `/workshop`: illustrated discovery hero, search, category shortcuts, real
  editorial/trending/new/updated shelves and creator/installation links.
- `/workshop/browse`: document-scrolling catalog, illustrated cards, list view,
  URL-backed filters, paginated results and modal quick view.
- Resource overview, versions, discussion and public creator profiles share
  the same surface. Resource tabs make the sub-pages directly accessible.
- The shared site navbar remains the only sticky navigation. Workshop links
  scroll with the document; no stacked fixed bars.
- Styling is isolated by `.workshop-surface` and `WorkshopShell`. Account
  publishing forms, creator management and admin surfaces are unchanged.

API endpoints, permissions, signed download grants, sanitized Markdown,
canonical URLs, release rules and gallery behavior remain in place. Sorting is
server-ranked; other filters still apply to loaded pages, explicitly indicated
when more pages are available. Later sort requests cancel earlier ones, and a
failed refresh retains loaded cards with an error notice.

Quick view uses a native modal with explicit Tab wrapping and trigger-focus
restoration. Native link/button keyboard behavior is preserved. Reduced motion
disables card transitions and existing hover-media playback.

## Verification

```sh
npm run typecheck
npm run lint
npm run test:hub
npm run build
npm run verify:workshop:browser
```

The browser check starts its own temporary production preview at
`http://127.0.0.1:3114`, a loopback fixture API, and an isolated headless Chrome
profile. It refuses an occupied preview port. API calls in the browser are
intercepted: fixture projects and downloads are never written to the master.
Both servers and the browser are stopped afterward. Screenshots are written to
the ignored `.shots/` directory.

Coverage: SSR shelves, responsive layouts (320–1680px), search, categories,
combined filters, pagination, grid/list switch, guest gates, keyboard modal
behavior, rapid sorting, failed refresh, resource/gallery/version/discussion
navigation, download preparation, creator profiles, empty/offline states and
reduced motion. `test:hub` additionally covers the existing Markdown/security,
draft, release, PKCE, SEO and input guards.
