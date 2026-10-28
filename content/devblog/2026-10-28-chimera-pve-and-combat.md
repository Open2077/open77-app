---
title: "Chimera PvE enters Night City"
date: "2026-10-28"
description: "OPEN//77 adds Chimera PvE, sharper melee fixes, steadier voice chat, and richer holograms for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-online", "cyberpunk-2077-dedicated-server"]
---
OPEN//77 made a big gameplay step forward today: a player-hosted Chimera PvE encounter is now in the build, alongside important melee fixes, better voice-chat stability, and a major hologram content pass. For anyone following Cyberpunk 2077 multiplayer, this is one of those updates that makes the world feel more like a real online sandbox and less like a tech demo.

## Chimera PvE arrives in OPEN//77

The headline change is a new **player-hosted Chimera PvE encounter**. This adds a proper boss-style activity to OPEN//77, with controls exposed to Lua so server owners can build gameplay around it instead of treating it like a one-off scripted showcase.

The encounter includes a dedicated lab-style menu to launch and manage the activity, plus proportional difficulty scaling. In plain terms, the fight can better adapt to the size of the group instead of feeling tuned for only one exact player count. That matters a lot for Cyberpunk 2077 co-op and Cyberpunk 2077 online play, where a boss fight needs to stay interesting whether a small squad or a larger group shows up.

The Chimera work also includes combat presentation replication and death-collapse handling. The practical result is that the encounter should look more coherent across clients and read more clearly during the chaos of a multiplayer fight.

There is still at least one unresolved piece on the native side of the boss feature, so this is not being sold as "finished forever." But it is a real, meaningful leap: OPEN//77 now has the foundation for shared PvE set pieces on dedicated servers.

## Melee keeps getting more believable

Several combat fixes landed around melee, and they are the kind of changes players feel even if they never read a technical note.

Third-person melee hit origin was corrected, which helps attacks come from the right place visually and logically. When a swing appears to come from one spot but the game calculates it from another, combat starts to feel slippery. This fix pulls those back toward each other.

Melee contact handling was also improved so hits are identified more cleanly per swing and per target. That should reduce some of the strange edge cases where melee interactions can feel inconsistent, especially in a multiplayer environment where timing and replication always make close-range combat harder than it looks.

A broader checkpoint of ongoing melee defense work was also merged forward. That includes multiplayer handling for defense outcomes, authored action timing, and visual presentation for cyberware arms and Monowire guard or charge states. This is still active work, but it shows a clear direction: OPEN//77 is not only trying to make melee function, it is trying to make it readable and stylish in multiplayer.

## Voice chat should be less eager to punish normal players

One of the most practical fixes in this update is on voice chat stability. The server was sometimes disconnecting players for apparent voice-ingress abuse when the real cause was much less dramatic: open microphones, network jitter, client hitches, or a busy server tick causing a brief burst of queued voice frames.

That behavior has been adjusted so honest players are less likely to get kicked just for speaking continuously during a rough moment. For any Cyberpunk 2077 RP server or social server, this is a quality-of-life improvement with a very real impact. Good voice chat is not glamorous, but bad voice chat ruins sessions fast.

## Movement and animation polish continues

The latest build also adds new animation improvements, including updated female idle and jump animations plus refreshed male jog and sprint motion. These are not headline systems on their own, but they matter because OPEN//77 is a third-person-and-observed multiplayer experience as much as it is a first-person one.

When people spend time in hubs, scenes, roleplay spaces, or co-op activities, character motion sells the illusion. Better idles, better jumps, and cleaner running loops make Night City online feel more alive.

## Holograms get a major content and quality pass

Outside core combat, the hologram feature set took a huge step forward. Support now covers many holograms at once, more accurate colors, face rigs, finger rigs, and improved lip-sync timing that stays matched to spoken lines more convincingly.

A long list of hologram characters and presentation upgrades landed together, including better in-world staging and easier access to the in-game editor. For server owners, this means more ways to build memorable scenes, venue dressing, interactive roleplay spaces, or dramatic set pieces on a Cyberpunk 2077 dedicated server.

This is the kind of feature that can easily sound cosmetic until you picture the result: clubs, ads, ambient performances, guided experiences, and story moments that feel much more like Night City and much less like static props.

## Why this update matters

Today’s changes connect several important layers of OPEN//77 at once. The Chimera encounter adds a real multiplayer activity. The melee fixes make close combat more trustworthy. The voice chat fix improves session stability. The hologram pass gives server owners better world-building tools.

Taken together, this is strong progress for a Cyberpunk 2077 multiplayer mod aiming to support both action and roleplay. The short version: more to do, fewer frustrating edge cases, and a more convincing Night City to do it in.

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
