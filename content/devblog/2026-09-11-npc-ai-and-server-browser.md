---
title: "NPCs get smarter, server browser gets sharper"
date: "2026-09-11"
description: "OPEN//77 added stronger NPC controls, native screen fades, and a smarter server browser for Cyberpunk 2077 multiplayer and dedicated servers."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-dedicated-server", "night-city-online"]
---
OPEN//77 made progress on two fronts today: the game gained more powerful NPC and presentation tools, and the website got a much more usable server directory. For anyone following Cyberpunk 2077 multiplayer, this is one of those updates where the building blocks matter: better AI control for creators, smoother moment-to-moment presentation for players, and faster server discovery for everybody.

## Better NPC control for Cyberpunk 2077 multiplayer

The biggest gameplay-facing change is a new release of native systems for NPC behavior. OPEN//77 now supports direct Character record spawning along with server-authoritative control over NPC AI, combat, perception, and voice policy.

That wording is technical, but the result is easy to picture. A server owner or gamemode creator can define exactly which characters appear and how they behave, while the server remains the authority. That is important for consistent encounters in a Cyberpunk 2077 multiplayer mod, because it helps keep scenes reliable for everyone connected to the same session.

This opens the door to more convincing Night City online experiences: guards that actually react like guards, gangs that can be placed intentionally instead of only faked through simple logic, ambient characters that fit the area, and mission setups that feel structured instead of improvised. It also gives creators stronger foundations for co-op content, faction scenarios, and eventually richer Cyberpunk 2077 RP server design.

The same release also preserves the previously published work around passenger camera support, mounted weapons, and native map and vehicle AI systems. That means the broader sandbox for scripted scenes and armed vehicle gameplay keeps getting more complete instead of arriving as isolated one-off features.

## Native screen fades make scenes feel smoother

Another useful addition landed on the client side: native screen fades are now exposed to Lua.

This is the kind of feature that players may not notice directly, but they will feel the difference. Screen fades let creators hide awkward edges during teleports, respawns, cutovers, scripted transitions, and other moments where the game world needs a clean visual handoff. Instead of abrupt pops or rough camera changes, creators can now wrap those moments in something that feels much closer to a finished online game.

For a Cyberpunk 2077 co-op or online server experience, small presentation upgrades like this matter. They make custom flows feel intentional, especially when moving players between interiors, missions, and event spaces.

## A full-window server browser built for faster discovery

On the website side, the server browser received a major redesign. The directory now uses a full-window, launcher-style layout that puts the list front and center. Search, filters, sorting, and server details are arranged more like a dedicated game browser and less like a standard web page.

The team also tightened the row density so more servers fit on screen at once. That sounds minor until you use it: denser rows make it much easier to scan names, player counts, tags, and descriptions without excessive scrolling. It is a practical upgrade for anyone hunting for the right CP2077 multiplayer server.

Default server artwork also looks better now. Servers that do not upload custom branding no longer fall back to a plain placeholder style, so the directory feels more polished and more consistent overall.

## “Near you” sorting should make good servers easier to find

One of the most player-friendly changes is the new default sorting mode: “Near you.”

Instead of throwing every server into one generic order, the browser now tries to rank servers closer to the player using country, language, and regional signals. That does not guarantee the perfect pick every time, but it should improve first impressions in a very real way. Players opening the directory are more likely to see relevant servers near the top instead of having to dig.

For a Cyberpunk 2077 online platform that plans to support many communities and server styles, smarter ranking is a big quality-of-life win.

## New docs for server owners and creators

Today also brought a fresh batch of public documentation. New guides and references were published for armed vehicles, native map AI, networked vehicle AI, NPC behavior APIs, a searchable Character catalogue, and native screen fades.

This matters because features are only truly useful when creators can learn them quickly. Better docs shorten the gap between “the system exists” and “a server is actually using it.” For future Cyberpunk 2077 dedicated server operators, that means more examples to study and a clearer path to building custom content.

## Why this day matters

Today’s work was not about one flashy trailer feature. It was about core foundations: stronger NPC systems, smoother player-facing transitions, and a server browser that feels more like a real multiplayer product.

That combination is important. Better AI tools help shape the world, screen fades help polish the experience, and a smarter directory helps players actually find the worlds people are building. For OPEN//77, that is a solid step toward a more believable and more playable Cyberpunk 2077 multiplayer future.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.open2077.net) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
