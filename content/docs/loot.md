# Server loot and ground drops

In a CyberM session, ground loot is server-authoritative. Vanilla bodies, bags, containers,
collectibles, and physical drops never hand an item to the player directly. An item visible on the
ground is a local projection, presented through Cyberpunk's own interface — contents, rarity, detail
card, `Take` and `Take All`. Selecting an item there sends a request to the server, which checks the
drop, the dimension, and the distance before allowing the pickup. The local `TransactionSystem`
removes nothing until the reply arrives.

The official `cyberm_loot` resource must stay started. Its manifest asks for `network.events` and
`world.loot`, and its client is distributed with the server's resource set.

Use this guide to place items in the world from a server resource, and to credit them to a player's
inventory when they are picked up.

## Server API

Server resources that declare `world.loot` get `CyberM.loot`:

```lua
permissions { "network.events", "world.loot" }
```

```lua
local dropId, reason = CyberM.loot.create({
    item = "Items.money",             -- TweakDB record
    quantity = 250,
    position = { x = -1450.2, y = 117.8, z = 12.4 },
    bucket = 0,                        -- routing bucket
    radius = 2.0,                      -- 0.5 to 10 metres
    label = "Eurodollars",
    visualItem = "Items.MoneyShard",  -- record used only for the 3D entity
    ttlMs = 300000                     -- optional, seven days maximum
})

assert(dropId, reason)

CyberM.loot.update(dropId, {
    quantity = 300,
    position = { x = -1450.0, y = 118.1, z = 12.4 },
    radius = 2.5
})

local drop = CyberM.loot.get(dropId)
local bucketDrops = CyberM.loot.all(0)
CyberM.loot.remove(dropId)
```

A player's authoritative position is available server-side too:

```lua
local position = CyberM.players.position(playerId)
-- { x, y, z, bucket }, or nil when the player or snapshot is unavailable.
```

A drop belongs to the resource that created it. Another resource can neither change nor delete it,
and stopping the owning resource cleans up its drops. The registry is capped at 4,096 entries,
quantities at 1,000,000, and positions at the world bounds the protocol accepts.

`item` and `visualItem` play distinct roles. `item` is the authoritative content actually granted
once the pickup is validated. `visualItem` is a TweakDB record that owns a `dropObject` and serves
only to create the physical `gameItemDropObject`. For a weapon, leaving `visualItem` empty uses the
weapon's own record directly. Since `Items.money` is abstract currency, CyberM automatically picks
`Items.MoneyShard` (`smallItemDrop`, entity `money`) when no override is supplied.

After an accepted pickup, every server VM receives:

```lua
AddEventHandler("onLootPickup", function(playerId, dropId, item, quantity, ownerResource)
    if ownerResource ~= GetCurrentResourceName() then return end

    -- Write the authoritative persistent inventory here (database, weight,
    -- transaction log, and so on). The client never decides the outcome.
    print(playerId, dropId, item, quantity)
end)
```

The pickup is atomic within the registry: two players cannot consume the same id. Validation uses a
`PlayerSnapshot` received less than two seconds ago, requires the same routing bucket, and accepts
at most `radius + 0.75 m` to absorb network latency.

## Testing from the CyberM terminal

These commands are genuinely declared in `cyberm_loot/server/main.lua` with `RegisterCommand`, just
as in a FiveM resource:

```text
loot.create.player 1 Items.money 250 1.0 2.0 Items.MoneyShard
loot.create Items.money 250 -1450.2 117.8 12.4 0 2.0
loot.create.player 1 Items.Preset_Lexington_Default 1
loot.list 0
loot.remove 1
```

Type these lines into the developer terminal opened with `²` in Cyberpunk. `loot.list` is public.
The mutations `loot.create`, `loot.create.player`, and `loot.remove` are registered with
`restricted=true` and require the ACL permissions `command.loot.create`,
`command.loot.create.player`, and `command.loot.remove` respectively (or a suitable wildcard).

`loot.create` expects `<item> <quantity> <x> <y> <z> [bucket] [radius] [visualItem]`. Decimal numbers
use a dot. The drop is replicated to the bucket's players immediately; its prompt should disappear on
every client as soon as a pickup is accepted.

`loot.create.player` uses the player's latest fresh snapshot and adds one metre in Z by default, so
the item falls in front of them. Its full form is
`loot.create.player <playerId> <item> <quantity> [offsetZ] [radius] [visualItem]`.

The representation is a real native entity produced by `LootManager.SpawnItemDrop`: the record's
mesh, a `gameItemDropObject` wrapper, placement, physics, highlight, and REDengine UI. CyberM binds
the native `EntityID` to the server id when the child object appears, then fills the native inventory
with `item` and `quantity`. There is no separate CyberM anchor or prompt any more.

## Client API

Gameplay clients read the projection through `cyberm_loot`'s exports:

```lua
CreateThread(function()
    local promise, err = CyberM.exports.call("cyberm_loot", "all")
    if not promise then return print(err) end
    local drops = assert(promise:await())
    for _, drop in ipairs(drops) do
        print(drop.id, drop.item, drop.quantity)
    end
end)

-- The native prompt already performs this. Useful for a custom UI.
CreateThread(function()
    local promise = CyberM.exports.call("cyberm_loot", "requestPickup", 42)
    if promise then print(promise:await()) end
end)
```

Available exports:

- `get(id)` — returns the local drop, or `nil`;
- `all()` — snapshot sorted by id;
- `requestPickup(id)` — sends the request to the server.

This local event lets you show feedback without touching authority:

```lua
AddEventHandler("cyberm:loot:result", function(id, accepted, reason, item, quantity)
    if not accepted then
        print("Pickup refused: " .. tostring(reason))
    end
end)
```

Do not call `CyberM.loot.upsert`, `acceptPickup`, or `setAuthorityEnabled` directly from a gameplay
resource. Those are the internal primitives of the distributed projection, guarded by `world.loot`.

## The boundary between native UI and server authority

- `Inventory` choices stay visible only for entities bound to a server drop;
- `Inventory.OnInteractionUsed` is intercepted before its local `RemoveItem` and becomes a
  `cyberm:loot:pickup` request;
- the native pickup condition is re-enabled only for bound `gameItemDropObject`s;
- legacy placed pickups (`HealthConsumable`, `VirtualItem_TEMP`) and the `Loot` choices of
  inspectable objects;
- the container role of bodies, bags, ground items, and static containers;
- the vanilla backpack's "drop" action;
- the normal held-weapon drop path when an NPC dies;
- drops already present when authority activates, purged before the server projection.

The global purge runs only when authority activates. After that, a pickup, a removal, or an update
empties only the inventory of the entity concerned. Cyberpunk then receives its normal
`OnInventoryEmptyEvent` and cleanly removes the HUD, the interaction, and the visual without
recreating the other ground items.

CyberM items therefore use the same presentation as vanilla: the physical mesh resolved by the
TweakDB record falls with the game's physics, and the `Inventory` component builds the list and the
item card. That entity holds no authority though: removal and granting only happen after the server
answers positively.

## Scope

**A drop holds one stack** — one `item` and one `quantity`. Containers holding several stacks, and
corpses carrying an authoritative inventory, belong to the container API and are not part of this
one.

**Persistent inventory is yours to write.** This subsystem decides *who may take what*, and stops
there. `onLootPickup` is where you credit an account, apply weight, or write a transaction log.

**Quest collectibles that bypass `Inventory`** are not intercepted. A handful of highly specialised
pickups take neither the `Inventory` path nor the standard loot conditions; those still grant
locally. If you meet one, its class can be identified with the CyberM inspector.
