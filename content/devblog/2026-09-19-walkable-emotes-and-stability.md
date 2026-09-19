---
title: "Walkable emotes, smoother play, fewer crashes"
date: "2026-09-19"
description: "OPEN//77 adds walkable emotes, better first-person carry, and major stability and performance fixes for Cyberpunk 2077 multiplayer."
tags: ["cyberpunk-2077-multiplayer", "cp2077-multiplayer", "cyberpunk-2077-rp-server", "cyberpunk-2077-online", "dedicated-server"]
---
OPEN//77 had a very player-facing day: more animations you can use while walking, much better first-person carry behavior, and a stack of fixes aimed at smoother, more stable sessions. For anyone following Cyberpunk 2077 multiplayer progress, this is the kind of update that makes Night City online feel more alive moment to moment.

## Walkable emotes arrive in the animation menu

The biggest visible addition is a new **On the move** section in the `/anim` menu. This category lists the animation profiles that can play while a character keeps moving instead of locking into a stationary pose.

That includes walkable gestures, walkable holds, and the carry set. In practice, that means more believable roleplay during travel, deliveries, conversations, and job flows. Instead of stopping dead to perform an emote, a player can now keep walking through the scene while the upper body handles the action.

This is especially important for a Cyberpunk 2077 RP server, where small body-language details do a lot of worldbuilding. Moving through a market, a garage, or a deal location now looks less gamey and more natural.

## Carrying feels much better in first person

Carry interactions got another major pass. The new carry, carry pickup, and carry putdown actions were already useful for job scenes, but first-person behavior still needed polish.

Today’s work improved how the local player sees those animations. The camera is no longer being forced into a bad temporary presentation, local arm behavior has been corrected, and attachment placement for the local player now matches first-person reality much better. That matters because offsets that look right on another player’s body rig do not automatically look right on your own first-person view.

The result is a more convincing crate-carrying experience for jobs and scripted server activities. The example RP content was updated alongside this work, including first-person crate placement for the Nomad flow.

## Hand props now show up during moving holds

Another big immersion win: walking hold animations can now carry visible props properly.

The team proved out real hand-held items for these moving animations and then fixed the path so props actually render in hand where expected. That means actions like smoking or holding a phone can finally sell the scene instead of looking empty.

This sounds small, but it is a huge upgrade for Cyberpunk 2077 co-op and RP presentation. A walkable animation without the item can feel broken. A walkable animation with the right prop immediately reads correctly to nearby players.

## A nasty apartment crash was tracked down and blocked

On the stability side, a serious interior crash related to native loot objects received a full fix pass.

The team investigated repeated crashes around apartment and interior loot interactions, identified that some vanilla world objects were entering the multiplayer loot path when they should not, and added broader retirement and sweep handling for problem drops and nearby targets. The fix also expanded coverage to cases that were not seen by the original spawn hook.

For players, the important part is simple: interior play should be safer, especially in spaces where lootable world objects were causing client crashes.

## Performance work targets real RP server hotspots

There was also strong performance work today, focused on problems seen in live RP sessions.

One source of visible hitching came from resource hot-reload work happening on the render path. That work has now been moved away from the render thread, restoring the intended client budget and reducing stutter while moving around the world.

Interaction scanning also got multiple optimization passes. Busy RP setups with lots of prompts, NPC targets, and world interaction rings were spending too much time every frame resolving possible targets. The new changes cut unnecessary body reads, improved how roster lookups work, and made Open77-only global NPC targets resolve from the registry instead of expensive crowd queries.

That is the kind of fix future server owners should care about. It helps crowded scenes scale better and keeps interaction-heavy areas from becoming hidden frame-time traps on a Cyberpunk 2077 dedicated server.

## Useful fixes for scripting and server content

A few other fixes matter for server operators and content authors.

`world.nearby` is now working properly again on the current 2.31 build, instead of failing its layout check. That restores a useful world-query tool for scripted gameplay.

Passive library resources are also now accepted correctly even if they have shared files but no client script. That is a practical quality-of-life fix for modular server content.

Finally, the expanded animation catalogue grew large enough to break one listing path. That regression is fixed, so animation listings work again even with the much bigger set of available profiles.

## RP examples kept pace with the new systems

The Night City RP example project also moved forward with the platform changes.

The Nomad convoy run was validated on the latest build, first-person crate placement was updated, and gang interactions were switched over to the new registry-only NPC target approach. Buyer and fence prompts are back on with the new target resolution path.

That is a good sign for the larger OPEN//77 goal: not just isolated engine features, but playable loops that prove those features work together inside a living Cyberpunk 2077 multiplayer mod.

## Why this day matters

This was not a flashy trailer day. It was a “make the game feel real” day.

Walkable emotes make characters more expressive. First-person carry fixes make jobs feel grounded. Visible props sell the performance. Crash fixes protect interior gameplay. Performance work reduces stutter in actual RP conditions.

Put together, those changes move OPEN//77 closer to a version of Cyberpunk 2077 online that feels stable enough to inhabit, not just test. For players waiting to jump into CP2077 multiplayer, and for future community hosts planning their own servers, that is real progress.

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
