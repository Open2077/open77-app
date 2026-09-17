# Player morph catalogue

Browse **6,582 `Character.*` records** extracted from Cyberpunk 2077 **2.31** with
Phantom Liberty. Each ID can be passed to the player-model API; this catalogue
is a discovery index, **not a guarantee that every record is playable**. The 86
internal `TEST.*` records are excluded because they are outside the API namespace.

The website provides searchable records, categories, asset details and a Copy ID
button. The [complete record list](https://github.com/Open2077/open77-base/blob/main/docs/generated/player-models-2.31.md)
also lists every ID in one Markdown table for repository users and AI agents.

## Morph and restore

```lua
-- Server resource manifest:
-- permissions { "players.model.control", "players.model.read" }
local ok, revision = SetPlayerModel(playerId, "Character.Rogue")
if not ok then print("Morph refused: " .. tostring(revision)) end

-- Optional explicit appearance: it must belong to the chosen template.
-- SetPlayerModel(playerId, record, { appearance = "exact_appearance_name" })

-- When the roleplay/admin action ends:
local restored, reason = ResetPlayerModel(playerId)
```

Wait for `onPlayerModelReady` before assuming the body is visible. A record may
validate but fail to load its appearance or support a requested action. See
[Player models](player-models.md) for ownership, events, permissions and failures.
Custom `Character.*` records do not need to be added to this catalogue; install
their assets on every observing client.

## Choosing a body

| Starting point | Record | Model notes |
| --- | --- | --- |
| Rogue | `Character.Rogue` | Humanoid local/remote presentation and vehicle seating. |
| Johnny | `Character.JohnnyNPC_Puppet_Photomode` | Humanoid local/remote presentation and vehicle seating. |
| Adam Smasher | `Character.Smasher` | Special skeleton; vehicle poses can T-pose or intersect the car. |

Quest, scene, player-body, child, animal and robot records can have incompatible rigs or behavior.
Extraction labels describe database records, not supported player actions.
The visual body does not grant NPC AI, faction, boss powers, health or weapons.
Appearance names are not record IDs. The extracted database source is not a
reliable per-record DLC indicator: `tweakdb_ep1.bin` contains base-game entries too.

## In-game admin menu

Open `/admin` → **Self** → **Morph / original character**:

- Search all records or browse categories, 20 results per page.
- Confirm a record, or enter a custom `Character.*` ID directly.
- Optionally set an appearance override, or clear it to use the record's default.
- Choose **Unmorph — original character** to restore the current player appearance.

Opening the menu requires `command.admin`. The server checks
`command.admin.self.morph`, `command.admin.self.unmorph` and
`command.admin.self.morph.search` separately. A read-only catalogue grant cannot
morph anyone. These actions affect only the operator, not a supplied player ID.
Morphing remains server-authoritative and replicated. The admin cannot replace
or reset an override owned by another resource. Revoking the morph permission,
death, disconnect or stopping the admin resource releases its own override.

## Downloads and reproducibility

- [Searchable catalogue JSON](/data/npc-records-2.31.json): all 6,582 `Character.*` IDs and extracted metadata.
- [Raw extraction CSV](/data/npc-records-2.31.csv): 6,668 entries, including the excluded internal records.
- [Complete morph list, Markdown](/data/player-models-2.31.md): all accepted-namespace IDs in one file.

The admin index and Markdown list are generated from the same CSV by
`resources/system/open77_admin/tools/build-models.py`. Their source SHA-256 is
recorded in the generated files. Run the generator with `--check` to detect drift.
Neither the documentation nor the menu is a runtime allowlist.
