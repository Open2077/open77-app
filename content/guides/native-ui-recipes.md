# NativeUI recipes

Complete, copyable patterns. Each one assumes a client script, the files declared in the manifest,
and the [Open77 design system](native-ui-effects.md#the-open77-design-system) linked in the
document.

## A keyboard and mouse menu

A list the player can browse with the arrows or the mouse, confirm with Enter or a click, and close
with Escape. The selection lives in the data model; `scrollTo(..., "nearest")` keeps it visible.

```html
<!-- ui/menu.rml -->
<rml>
<head>
    <link type="text/rcss" href="nui://open77/open77.rcss"/>
    <link type="text/rcss" href="menu.rcss"/>
</head>
<body data-model="menu">
<div id="root" class="center">
    <div id="panel" class="panel col gap-8">
        <span class="eyebrow">{{subtitle}}</span>
        <h2>{{title}}</h2>
        <div id="list" class="col gap-4">
            <div class="entry row" data-for="e, i : entries" data-attr-id="'entry' + i"
                 data-class-selected="i == selected" data-event-mouseover="hover(i)" data-event-click="pick(i)">
                <span class="grow">{{e.label}}</span>
                <span class="muted">{{e.hint}}</span>
            </div>
        </div>
        <span class="muted">↑ ↓ to choose · Enter to confirm · Esc to close</span>
    </div>
</div>
</body>
</rml>
```

```css
/* ui/menu.rcss */
body, #root { width: 100%; height: 100%; }
#panel { width: 420dp; max-height: 520dp; }
#list { overflow-y: auto; }
.entry { padding: 8dp 12dp; cursor: pointer; }
.entry span { flex-shrink: 0; }
.entry.selected { background-color: #22d8e222; color: #6ff0f6; }
```

```lua
-- client/menu.lua
local ENTRIES = {
    { id = "garage", label = "Garage", hint = "G" },
    { id = "wardrobe", label = "Wardrobe", hint = "W" },
    { id = "phone", label = "Phone", hint = "P" },
}

local menu = assert(Open77.ui.create({
    document = "ui/menu.rml", layer = "menu", visible = false,
    models = { menu = { title = "Quick menu", subtitle = "Night City", entries = ENTRIES, selected = 0 } },
    events = { menu = { "hover", "pick" } },
}))
local selected, open = 0, false

local function select(i)
    selected = (i + #ENTRIES) % #ENTRIES                 -- data-for indices are 0-based
    menu:set("menu", "selected", selected)
    menu:scrollTo("#entry" .. selected, "nearest", true)
end

local function close()
    if not open then return end
    open = false
    menu:blur()
    menu:animate("#panel", { to = { opacity = 0, scale = 0.97 }, preset = "snappy" }, function()
        if not open then menu:hide() end
    end)
end

local function confirm(i)
    local entry = ENTRIES[i + 1]
    close()
    TriggerServerEvent("quickmenu:pick", entry.id)
end

local function openMenu()
    if open then return end
    open = true
    menu:show()
    menu:animate("#panel", { from = { opacity = 0, scale = 0.97 }, to = { opacity = 1, scale = 1 }, preset = "snappy" })
    local ok, reason = menu:focus()
    if not ok then print("[menu] focus refused: " .. tostring(reason)) end
    select(selected)
end

menu:onModel("hover", function(i) if i ~= selected then select(i) end end)
menu:onModel("pick", function(i) confirm(i) end)
menu:on("keydown", function(e)
    if e.key == "up" then select(selected - 1)
    elseif e.key == "down" then select(selected + 1)
    elseif e.key == "enter" then confirm(selected)
    elseif e.key == "escape" then close() end
end)
menu:onEvent("focus", function(name, detail)
    if name == "blur" and detail and detail.reason == "taken" then close() end
end)

RegisterCommand("quickmenu", function() openMenu() end)
```

The document is created once and only shown and hidden: its model, listeners and selection survive
between openings.

## Notification toasts

New toasts slide in at the top, the others make room, and each leaves after a delay. `ui:layout`
animates the siblings; `enter` and the exit spec animate the toast itself.

```html
<!-- ui/toasts.rml -->
<rml>
<head>
    <link type="text/rcss" href="nui://open77/open77.rcss"/>
    <style>
        body, #root { width: 100%; height: 100%; pointer-events: none; }
        #toasts { position: absolute; right: 32dp; top: 120dp; width: 320dp; }
        .toast { margin-bottom: 8dp; }
        .toast .ui { display: block; }
        .toast.danger { border-color: #ff4d5e88; }
    </style>
</head>
<body><div id="root"><div id="toasts" class="col"></div></div></body>
</rml>
```

```lua
local ui = assert(Open77.ui.create({ document = "ui/toasts.rml", layer = "hud", zIndex = 50 }))
ui:layout("#toasts", { preset = "growth" })

local live = {}

local function toast(title, text, kind, seconds)
    local id = ui:create("#toasts", {
        class = "glass toast " .. (kind or ""),
        rml = ('<span class="ui">%s</span><span>%s</span>'):format(title, text),
        before = live[1],                                -- newest on top
        enter = { from = { x = 40, opacity = 0 }, to = { x = 0, opacity = 1 }, preset = "snappy" },
    })
    table.insert(live, 1, id)
    if #live > 4 then                                    -- at most four on screen
        ui:remove(table.remove(live), { to = { opacity = 0 }, preset = "snappy" })
    end
    SetTimeout((seconds or 4) * 1000, function()
        for i, other in ipairs(live) do
            if other == id then
                table.remove(live, i)
                ui:remove(id, { to = { x = 40, opacity = 0 }, preset = "calm" })
                break
            end
        end
    end)
end

RegisterNetEvent("toasts:show", function(title, text, kind) toast(title, text, kind) end)
```

Text passed through `rml` is not escaped. Escape player-provided strings first (replace `&`, `<`
and `>`), or use `text` with a single line.

## A keyboard-only composer

A text box that takes the keyboard but leaves the mouse and the HUD to the game, like the chat.

```html
<!-- ui/composer.rml -->
<rml>
<head>
    <link type="text/rcss" href="nui://open77/open77.rcss"/>
    <style>
        body, #root { width: 100%; height: 100%; pointer-events: none; }
        #box { position: absolute; left: 32dp; bottom: 220dp; width: 480dp; }
        #input { width: 100%; }
    </style>
</head>
<body><div id="root"><div id="box" class="glass"><input id="input" type="text" maxlength="200"/></div></div></body>
</rml>
```

```lua
local box = assert(Open77.ui.create({ document = "ui/composer.rml", layer = "menu", visible = false }))

local function closeComposer()
    box:value("#input", "")
    box:blur()
    box:hide()
end

local function openComposer()
    box:show()
    if box:focus({ keyboard = true, cursor = false }) then
        box:focusElement("#input")
    else
        box:hide()
    end
end

box:on("keydown", "#input", function(e)
    if e.key == "enter" then
        local text = e.value or ""
        if #text > 0 then TriggerServerEvent("composer:say", text) end
        closeComposer()
    elseif e.key == "escape" then
        closeComposer()
    end
end)

RegisterCommand("say", function() openComposer() end)
```

With `cursor = false`, `Open77.input.isCaptured()` reports the cursor as free, so HUDs that hide
under cursor interfaces stay visible while the player types.

## A server-driven scoreboard

The server owns the data; the client merges what changed into the model. One `data-for` renders any
number of rows.

```html
<!-- ui/scores.rml (excerpt) -->
<body data-model="scores">
<div id="root" class="center">
    <div class="panel col" style="width: 560dp;">
        <h3>{{mode}} · {{players.size}} players</h3>
        <div class="row" data-for="p : players" data-class-me="p.id == me">
            <span style="width: 40dp; flex-shrink: 0;">{{p.rank}}</span>
            <span class="grow">{{p.name}}</span>
            <span class="value" style="width: 80dp; flex-shrink: 0;">{{p.kills}} / {{p.deaths}}</span>
        </div>
    </div>
</div>
</body>
```

```lua
local board = assert(Open77.ui.create({
    document = "ui/scores.rml", layer = "menu", visible = false,
    models = { scores = { mode = "Deathmatch", me = 0, players = {} } },
}))

RegisterNetEvent("scores:update", function(mode, players, me)
    board:merge("scores", { mode = mode, players = players, me = me })
end)

RegisterCommand("scores", function()
    if board:state().visible then board:hide() else board:show() end
end)
```

`{{players.size}}` is RmlUi's array length. The scoreboard never takes the input: it is shown and
hidden by a command, so the player keeps control.

## A themed panel the player can recolour

```lua
local ACCENTS = { cyan = "#22d8e2", red = "#ff2e3c", amber = "#ffcc00", green = "#3ef0a1" }

local function setAccent(name)
    local c = ACCENTS[name] or ACCENTS.cyan
    ui:stylesheet("accent", ([[
        .accent, h2 { color: %s; }
        button { decorator: fx(chamfer-solid 6 0 0 0 %s); }
        .panel { decorator: fx(chamfer 10 1 0.9 6 %s); }
    ]]):format(c, c, c))
end

RegisterCommand("accent", function(_, args) setAccent(args[1]) end)
```

The layer survives `ui:reload()`, so the choice stays while you edit the document with hot reload.
