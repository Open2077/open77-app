# WebUI budget and performance

Every WebUI page is a browser of its own, and a client caps how many can be alive at once. A
server whose resources create more pages than that sees the extra pages refused, in whatever
order they happen to start. This page explains what one page costs, the limits a page is
counted against, how to read a refusal, and how to keep a server with many interfaces inside
the budget.

The two pools, the refusal log line and `Open77.webui.budget()` need a client build that
contains them. On an older client every page, the built-in ones included, shares a single pool
of 32, a refusal is not logged, and `budget` does not exist: test for `WebUI.budget` before
calling it.

## What one page costs

A page created with `WebUI.create` (or `Open77.webui.create`) is one Chromium browser with its
own renderer process, plus GPU textures the size of the player's game window. Every Open77 page
is a full-viewport overlay, whatever its content: `width` and `height` only choose the CSS pixel
size the page lays out in, and the browser paints at the game's real output resolution so the
text stays sharp. A small declared size, a transparent page and a page cropped with
`drawBounds` cost the same as a full-screen menu. The same page therefore costs more on a
bigger screen:

| Player's resolution | GPU memory per page |
|---|---:|
| 1920x1080 | ~32 MiB |
| 2560x1440 | ~56 MiB |
| 3440x1440 | ~76 MiB |
| 3840x2160 | ~127 MiB |

These figures are computed from how the client allocates a page's frames, not measured
residency. Each page's renderer process also costs system memory on top of them.

A **hidden** page stops painting but keeps its browser, its textures and its slot. Only
`destroy()`, or stopping the resource that owns the page, gives them back. A page counts from
the moment `create` returns it, and stops counting as soon as `destroy()` is called.

## The limits

A page is counted against two limits at once:

| Limit | Value | Refusal |
|---|---:|---|
| Pages per resource | 24 | `webui_surface_limit` |
| Pages per client, for **all** of the connected server's resources together | 32 | `webui_surface_quota` |

The 32 is a pool, chosen by the host that created the page and never by anything the page asks
for. There are two pools, counted apart:

| Pool | Who | Cap |
|---|---|---:|
| `server` | every resource the connected server loads, **Open77's own server-side resources included**: chat, notifications, voice, interaction prompts, the context menu, the admin panel and its compact menu, the 3D map (minimap, full map and holo GPS are three pages), and any other Open77 resource with a page that the server loads | 32 |
| `system` | the client's built-in pages: the shell, the server load screen, the pause menu, blips, the reticle, and the debug inspector once it is opened | 8 |

A server can neither use nor fill the `system` pool, so a server that holds all 32 of its pages
cannot starve the load screen or the pause menu, and the built-in pages do not take a server's
slots.

Count Open77's own pages when you plan. A server that loads chat, notifications, voice,
interaction prompts, the context menu, the admin panel and the 3D map spends 10 of its 32 slots
on them, for every player, before its own resources start. Two built-in tools are created only
the first time they are opened, and then kept: the debug inspector (in the `system` pool) and
the remote camera placement editor (in the `server` pool).

## Reading a refusal

Past the cap, `create` answers `nil, "webui_surface_quota"`, and the client log
(`red4ext/logs/open77-*.log` in the game folder) names who holds the pool:

```text
Open77 WebUI surface refused for cv_multichar: webui_surface_quota, server 32/32: cv_phone 3, op77_map3d 3, cv_hud 2, ...
```

- `cv_multichar` is the resource whose page was refused.
- `server 32/32` is the pool and how full it is.
- Then every holder with its page count, largest first and then by name. At most 16 holders are
  named; the rest are folded into `+N more`.

The line is written at most once every 10 seconds per resource, so a resource retrying in a loop
does not flood the log. A refusal of the per-resource limit (`webui_surface_limit`) has no such
line: it is the resource's own 24 pages, and the resource knows how many it created.

## Reading the budget from Lua: `WebUI.budget()`

`Open77.webui.budget()`, also `WebUI.budget()`, answers the same thing to your own code, for the
pool your pages are counted in. It runs on the client and needs no permission. It reports counts
only: no URL, size or content of anybody's page crosses this call.

```lua
-- client/main.lua: print the pool this resource's pages count against, once, at start
AddEventHandler("onClientResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    if not WebUI.budget then return end             -- older client: no budget()
    local budget, reason = WebUI.budget()
    if not budget then print("no WebUI: " .. reason) return end
    print(("%s pool: %d/%d used, %d free, %d mine"):format(
        budget.pool, budget.used, budget.limit, budget.free, budget.own))
    for _, holder in ipairs(budget.pages) do
        print(("  %s %d"):format(holder.resource, holder.count))
    end
end)
```

| Field | Meaning |
|---|---|
| `pool` | `"server"` for a resource the server sent, `"system"` for a built-in page |
| `used` | live pages in that pool, hidden pages included |
| `limit` | 32 for `server`, 8 for `system` |
| `free` | `limit - used`, never below 0 |
| `own` | how many of those pages are this resource's |
| `pages` | `{ resource, count }` for every holder, largest first, then by name |

It answers `nil, "webui_backend_unavailable"` when the client has no WebUI running.

Check before creating a page that most players do not need, and tell the operator who holds the
slots when there is none left:

```lua
local function openPhone()
    if WebUI.budget then
        local budget = WebUI.budget()
        if budget and budget.free == 0 then
            local holders = {}
            for _, holder in ipairs(budget.pages) do
                holders[#holders + 1] = holder.resource .. " " .. holder.count
            end
            print(("no WebUI slot left (%d/%d): %s"):format(
                budget.used, budget.limit, table.concat(holders, ", ")))
            return nil
        end
    end
    local page, reason = WebUI.create({ entry = "web/phone.html", layer = "menu" })
    if not page then print("phone page refused: " .. tostring(reason)) end
    return page
end
```

`budget()` is a snapshot. Another resource can take the last slot between the check and
`create`, so always check what `create` returned as well.

## Keeping a big server inside the budget

- **Put small HUD pieces on one page.** A speedometer, a status bar and a hint line can be
  three `<div>`s of one transparent `hud` page. Three pages cost three browsers.
- **Create rarely used pages when they are first opened**, then keep them. An admin tool, an
  editor or a character creator that most players never open should not cost every player a
  browser from the moment they join. Wait for the page's own ready event (`Open77.ready()` in
  the page, `page:on("ui:ready", ...)` in Lua) before sending its first state: anything sent
  before the page loaded is dropped.
- **Keep created only the pages that must react instantly** (phone, inventory, radio,
  dispatch). Reopening a page that already exists is a repaint, not a page load, but a hidden
  page still holds its slot and its memory.
- **Destroy a page you are done with.** `page:destroy()` frees the slot at once; hiding it does
  not.
- **Always check what `create` returned**, and print the reason. A page that silently failed is
  the usual cause of "my script does not load".
- **Mind image sizes.** A page holds every image it shows decoded at width x height x 4 bytes,
  whatever the file size: a 3840x2160 background is about 32 MiB in that page's process even if
  the PNG is 800 KB.

## See also

- [`Open77.webui.budget`](/docs/api/client/open77-webui#budget) and
  [`Open77.webui.create`](/docs/api/client/open77-webui#create) in the Lua API reference.
- [The UI kit](ui-kit.md): progress bars, prompts, menus and radials drawn from one shared page.
