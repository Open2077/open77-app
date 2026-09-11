# NPC record catalogue

Browse **6,582 `Character.*` records** extracted from Cyberpunk 2077 **2.31**, including
Phantom Liberty. Search, filter and copy a record ID in the interactive catalogue.
This is a discovery index, **not a spawn allowlist or a list of multiplayer-tested NPCs**.
Custom records are also accepted when their assets are installed on every client.
The full CSV contains 6,668 entries; 86 internal `TEST.*` IDs are excluded from the browser
and compact JSON because the spawn API accepts the `Character.*` namespace only.

## Use a record

Pass the exact record ID to the server, not the entity template path or its hash:

```lua
-- Server manifest: permission "world.npcs"
local id, reason = Open77.npcs.create({
    record = "Character.cpz_maelstrom_grunt1_ranged1_lexington_wa",
    position = { x = 381.0, y = -2400.0, z = 182.0 },
    behavior = { combatEnabled = false, voiceEnabled = false },
})
if not id then print(reason) end
```

Creating an ID does not confirm that the body spawned. Check readiness and spawn-failure
events as explained in [Server-owned NPCs](npcs.md). For passive characters, task control
and silent NPCs, read [AI, combat and voice control](npc-behavior.md).

## Understand the warnings

The extraction classifies records structurally, not through in-game testing:

| Classification | Meaning |
| --- | --- |
| Candidate | A starting point for testing; not guaranteed to work or be damageable. |
| Quest / scene | May require quest setup, special graphs or invulnerability settings. |
| Special rig | Animals, robots, photo-mode and other nonstandard rigs need extra care. |
| Vendor | May depend on vendor-specific setup. |
| Child | Special child records; not ordinary combat NPCs. |
| Player | Player-body records; not ordinary NPC spawn candidates. |
| Missing template | No entity template was resolved by this extraction. |

An appearance is not a record ID. Appearance names and entity paths help investigate assets;
they do not certify rig compatibility. Reusing a quest character for armed combat can be unsafe.
The `tweakdb_ep1.bin` source describes the extracted database, **not a reliable per-record DLC
requirement**: it also contains base-game entries. Ensure the record and assets exist on every
observing client. This catalogue excludes third-party mod archives.

## Download the data

Use the [compact JSON catalogue](/data/npc-records-2.31.json) for tooling and agents, or the
[complete extraction CSV](/data/npc-records-2.31.csv) for all raw fields. The JSON records the
game version, source path and CSV SHA-256 so tools can identify the exact dataset.

`Open77.npcs.templates()` still returns the small set of **legacy aliases**, not this catalogue.
Neither the catalogue nor an alias registration is required to spawn a valid `Character.*` record.
