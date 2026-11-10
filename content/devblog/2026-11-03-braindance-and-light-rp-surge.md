---
title: "Braindance arrives, joins get smoother, Light RP explodes with new content"
date: "2026-11-03"
description: "OPEN//77 adds scriptable Braindance, smoother joins, stability fixes, and a huge Light RP expansion for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-rp-server", "night-city-online", "cyberpunk-2077-online"]
---
OPEN//77 had a huge development day across both the core game and Light RP. The short version: **Braindance is now a real scripted gameplay tool**, core multiplayer got another round of important stability and polish fixes, and Light RP gained enough systems to feel much closer to a living **Cyberpunk 2077 multiplayer mod** rather than a test playground.

## Braindance becomes a real tool for servers

The biggest new feature in the base game is Braindance support as a scriptable sequence. Servers can now trigger the signature braindance-style entry flow, including the whiteout and transition effects that make the mode feel native to Cyberpunk 2077.

On top of the entry sequence, new Braindance vision-layer controls were added. That includes thermal-style highlighting and heatmap tools that can mark bodies and points of interest around the player. For players, that means custom investigations, events, story moments and training scenarios can look and feel much more authentic. For server creators, this opens the door to a lot of stylish mission design without faking the whole effect in UI.

This is one of those features that matters because it adds identity. A lot of multiplayer projects can make people move around the same world. Fewer can make custom content feel like real **Cyberpunk 2077 online** gameplay.

## Smoother joins and a more stable world

A lot of work also went into the less flashy side of the experience: getting into the world cleanly and staying there without weird glitches.

The connection cover now stays on screen until the joining player is actually placed into gameplay. That should reduce awkward moments where the loading veil disappears too early and the player sees half-finished world state.

Another fix targets a nasty spawn state where players could end up with a bad camera angle after joining through certain roleplay flows. That state is now handled much more safely, helping the character properly stand back up after a forced collapse-style spawn.

There was also a major pass on entity streaming and cleanup. NPCs and bodies are now buffered and paced more carefully on the client side, very young bodies are not removed too aggressively, and stalled spawn submissions no longer clog the whole queue. In plain terms: fewer streaming spikes, fewer "why did the city just break" moments, and better odds of avoiding engine crashes when many entities are being created or removed at once.

Pedestrian spawning was also capped more tightly per player, which should help keep new arrivals from flooding the area with too many fresh NPC bodies in one go.

## Better AI driving, combat cleanup and props that behave properly

Vehicle AI got several practical fixes. Driving orders now keep empty fields correctly, which matters because some orders rely on those exact positions in the data. That means chase, route-following and destination-driving behavior can reach the game properly instead of breaking on the way.

Road snapping was also fixed for roads under decks and overpasses. Before, a target point under a raised structure could end up snapping onto the structure above. Now the lane target lands on the actual road below, which is especially important for races, pursuits and traffic logic.

Melee state cleanup also improved. Players should no longer stay stuck in a visible fists-up guard after putting their fists away in third person.

Another very visible fix: scaled props now have collision that follows the scale players see. If an object is made larger or smaller, its physical presence now matches much better instead of keeping the old invisible size.

## In-world screens look better

Media and world-screen work also moved forward. Television and display images now land much more accurately inside the visible frame, and the system can use a live session camera overlay where needed.

The team also pushed the picture placement forward by a tick in the no-frame-generation path, which helps reduce that distracting feeling where the image looks like it is sliding outside the TV during movement. For players walking around social spaces, hubs or event venues, that should make world screens feel more grounded and less janky.

## Light RP grows into a much bigger game

The biggest content burst happened in Light RP.

### Crews, Street Cred and better progression

Squads have been reworked into full **crews**, with invites, leadership actions, UI support and crew-based entry into missions, raids and activities. A proper crew frame now shows useful status in the HUD, and players can manage crews through panels and quick interactions.

Light RP also now has a five-tier Street Cred ladder: Street, Merc, Operator, Edgerunner and Legend. Those tiers gate PvE difficulties, gigs, missions and higher cyberware ranks. Importantly, a lower-tier crew member can still come along on a harder activity chosen by the leader, but their rewards are handled according to their own progression. That keeps friends playing together without completely flattening progression.

### Cyberware gets much deeper

Ripperdocs gained capacity limits, implant storage and iconic implants. The UI now shows how much capacity a body has, how many points each implant costs, and which options are locked behind Street Cred.

That gives cyberware a real build layer instead of just being a shopping list. It is a meaningful step toward a more complete **Cyberpunk 2077 RP server** economy and progression loop.

### Dogtown becomes a real PvP zone

Dogtown is now an open PvP area in the city bucket, with its own ruleset. Players who qualify for combat there get combat tagging, cash loss and drop rules, crew-aware rewards, bounty systems, anti-gank rules and hospital exceptions. There is also a two-minute entry protection window so stepping into Dogtown is not instant death.

The zone is also drawn on the 3D map and minimap, so it reads more like a designed district than a hidden rules box.

### Activities become a proper online loop

Activities now have a stronger lobby and matchmaking layer. That includes ranked search, friendly crew matches, bot-fill options where allowed, PvE difficulty picks, a queue strip on the HUD, and a proper last-match recap dialog.

The recap system is especially nice because it gives players a clean post-match summary instead of dumping them back into the world with no closure. That kind of loop matters for long-term retention in any **Cyberpunk 2077 co-op** or competitive experience.

## The Crossing becomes a social hub

The Crossing got a lot of personality in one day.

There is now a Hall of Fame board, a TV events board showing city activity, Johnny as a guide NPC with an interactive FAQ-style dialogue, and Adam Smasher running the activities terminal. These are not tiny flavor changes. They make the space feel intentional and readable, which is essential for any future **Cyberpunk 2077 dedicated server** community hub.

## Casino content and world-boss fixes

Light RP also received its casino content package, including a dedicated casino world and table/cabinet games such as slots, blackjack, roulette and a fortune wheel.

World bosses got key fixes too. Enemy hits now land correctly on players again, and bosses can no longer be dragged across the entire city by aggro behavior. That should make open-world boss events much more reliable.

## More polished presentation

A few smaller but high-impact presentation changes are worth calling out:

- Staff voice broadcasts now use a new pixelated cyber-signal overlay.
- Hunger and thirst warnings are clearer and more persistent on the HUD.
- Players can turn the camera while eating, drinking or refueling.
- Vanilla safe areas that forcibly block weapons and sprinting are disabled in Light RP, preventing several annoying stuck states.

## What this day means

This update was not just one feature. It was a stack of improvements that move OPEN//77 closer to a believable **CP2077 multiplayer** experience: better joins, fewer crashes, stronger world simulation, more complete roleplay systems, richer progression and more identity.

Braindance gives creators a stylish new tool. Stability work helps the city hold together. Light RP now has more structure, more goals and more reasons to keep playing.

Night City is starting to feel online in the way people actually imagine it.

---

## About OPEN//77

[OPEN//77](https://open2077.net) is a free, in-development **multiplayer mod for
Cyberpunk 2077**: play online with other players in Night City on
community-hosted **dedicated servers**, with synced combat, vehicles and world
state, an account-backed launcher, and Lua-scriptable servers for co-op,
freeroam and RP. Browse [servers](https://open2077.net/servers), read the
[docs](https://open2077.net/docs) to host your own, or join the
[Discord](https://discord.gg/open77) to follow development. This devblog is
published daily, straight from the work the team shipped that day.
