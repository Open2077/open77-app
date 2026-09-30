# Networked world doors

`open77_doors` synchronizes native doors through a server-owned registry. Automatic doors use routing-bucket proximity; elevator landing doors follow the cabin. Native animations, sound and collision are retained.

## Installation

### Context menu administration

With `open77_admin` and `open77_contextmenu`, ALT-click a streamed door to copy
its exact ID, inspect its state, open/close it manually, change its lock/seal,
or restore automatic proximity opening. The menu framework defines no actions;
the admin package supplies them. See [context menu integrations](context-menu.md).

Door ID/inspector access requires `command.admin.dev.doors.inspect`; controls
require `command.admin.dev.doors.control` (and `command.admin` for the UI).
The restricted command is `/admin.dev.doors.control <hex-id> <open|close|lock|unlock|seal|unseal|automatic>`.
Its server-only cooperative `open77_doors.adminControl(playerId, id, action)`
export accepts **only** `open77_admin`, rechecks the actual operator's ACL,
and uses the server's routing bucket and 12m distance limit. It does not let a
client choose a bucket or claim somebody else's resource-owned door.
Manual opening still honors locks/seals and auto-close; unlock/unseal first when
needed. Lift opening remains elevator-controlled and is not offered manually.

### Runtime requirements

Requires client and server **2.31.13+op77.58** or later, including the native door projection bridge.

Use a client containing the native door projection bridge and a server supporting
[server exports](server-exports.md). Add this dependency to your gamemode:

```lua
dependency 'open77_doors >=1.0.0'
```

Freeroam includes it. The service depends on `open77_elevators`. If your server
uses an explicit `resources.load` allowlist, include both system resources.
Other gamemodes can opt in without importing Freeroam.

No new network protocol version is required. Deploying only Lua is **not** enough
for clients which do not have the new projection bridge.

## Discovery and authority

The client periodically discovers real `Door` entities and their live
`DoorControllerPS` within 80 metres. It proposes an opaque entity ID, position,
door type and optional elevator topology. The server validates player proximity,
rate and capacity, selects the routing bucket, and owns all subsequent state.

- IDs are **strings** such as `0xFC85EAE29622BAC2`, never numeric Lua values.
- The same world door in two buckets has two independent states.
- Discovered doors start closed, unlocked and unsealed. A player's quest/save
  locks are not imported into the multiplayer world.
- Automatic doors open within 3.5 m of an authorized player, remain open within
  5 m, and close 1.2 seconds after the last qualifying player leaves.
- Interactive doors submit a request; they cannot change everyone else's state
  directly. Closing through a player standing within 1.5 m is rejected.
- Landing doors open only when the linked elevator is powered, idle, at that
  floor and not marked `doorsClosed`. An unresolved link remains closed and
  discovery retries when the elevator registry becomes available.
- Late streaming applies the current state quietly. Later changes animate;
  an unchanged state does not restart its animation or sound.

Discovery is not a world attestation: a dedicated server cannot independently
prove an arbitrary game-record hash. Security-sensitive servers should disable
discovery and register their approved doors from server-owned data. Static
scenery without a live door controller is not moved or removed. An NPC's local
proximity does not open a door by itself: a network NPC goes through the
[NPC passage](#npc-passage) rule instead.

An interactive door that the player may open starts opening on that player's
screen as soon as it is used, before the server accepts the request; a refusal
closes it again. This is the `door` family of [prediction](prediction.md).
Automatic, lift, locked and sealed doors never predict.

For player elevator trips use native buttons or the elevator resource's
`requestCall` / `requestFloor` exports: native arrival confirms completion to
the server. Administrative timed `goTo` operations keep their existing deadline
semantics; do not configure a deadline shorter than the native travel time.
Door synchronization does not repair a quest-specific cabin's authored geometry
or floor markers.

## Calling the server API

Browsable function reference: [server door exports](https://open2077.net/docs/api/server/resource-open77-doors)
and [client door exports](https://open2077.net/docs/api/client/resource-open77-doors).

The service exposes asynchronous **server exports**, not a second mutable
client-side `Open77.doors` registry. The native client namespace remains useful
for inspecting local entities. Use exports for synchronized state:

```lua
local function doors(method, ...)
    local pending, error = Open77.exports.call('open77_doors', method, ...)
    if not pending then return nil, error end
    return pending:await()
end

CreateThread(function()
    local id = '0xFC85EAE29622BAC2' -- replace with a captured world door ID
    local door, error = doors('get', id, 0)
    if not door then print(error or 'Door has not been discovered'); return end

    -- Claim the discovered door for this resource. Ownership uses the caller
    -- identity supplied by the runtime, never an owner string in the arguments.
    local owned, reason = doors('register', {
        id = id, bucket = 0, position = door.position,
    })
    if not owned then print(reason); return end
    local ok, reason = doors('configure', id, 0, {
        automatic = true, autoClose = true,
        openRadius = 3.5, closeRadius = 5.0, closeDelay = 1.2,
        defaultAccess = false,
    })
    if not ok then print(reason); return end
    -- Example: grant the authenticated server player ID 12 access.
    doors('setAccess', id, 0, 12, true)
end)
```

Run awaited calls from a thread, event or command handler, not at file scope.
Do not forward arbitrary client arguments to privileged server exports.

### Server exports

| Export | Arguments | Result / purpose |
| --- | --- | --- |
| `get` | `id, bucket=0` | Door snapshot or nil. |
| `list` | `bucket=nil, offset=0, limit=16` | `{doors, total, nextOffset?}`; limit 1–16. |
| `near` | `position, bucket, radius` | `{doors, total, truncated}`; nearest 16, radius ≤120 m. |
| `register` | `descriptor` | New or claimed door snapshot; fails if another resource owns it. |
| `configure` | `id, bucket, patch` | Atomic validated update; `true` or `false, reason`. |
| `setOpen` | `id, bucket, boolean` | Set a non-lift door target state. Disable automatic mode for persistent manual control. |
| `setLocked` | `id, bucket, boolean` | Lock/unlock; locking closes the door. |
| `setSealed` | `id, bucket, boolean` | Seal/unseal; sealing closes the door. |
| `setAutomatic` | `id, bucket, boolean` | Enable/disable server player-proximity opening. |
| `setAccess` | `id, bucket, playerId, booleanOrNil` | Grant, deny, or remove a player override. |
| `setActions` | `id, bucket, actions` | Declare which [door actions](#door-actions-force-pay-and-hack) (force, pay, hack) the door accepts; `nil` or `{}` withdraws them all. |
| `resolveAction` | `ticket, accept, reason?` | Owner verdict on a pending action. `true` means the door opened (charge now); `false, reason` means nothing opened, including your own refusal, which answers `false, "refused_by_owner"`. |
| `setNpcPassage` | `id, bucket, mode` | Which network NPCs may open the door: `'public'` (default), `'resource'`, `'always'` or `'never'`; `nil` restores `'public'`. See [NPC passage](#npc-passage). |
| `npcStats` | — | `{accepted, refused = {reason = count}}`: NPC openings admitted and refused since the service started. |
| `linkElevator` | `id, bucket, elevatorId, floor` | Link a registered landing door to a valid same-bucket lift and zero-based floor. |
| `remove` | `id, bucket` | Release a door owned by this resource. Discovery may subsequently adopt it again. |
| `setDiscoveryEnabled` | `boolean` | Stop/start accepting new discovered doors; existing registered doors remain managed. |
| `changes` | `cursor` | `{cursor, reset, events}`; up to eight events per page. |

`register` descriptors require `id` and `position={x,y,z}` for a new door;
`bucket` defaults to zero. Optional `automatic`, `autoClose`, `lift`,
`elevatorId` and `elevatorFloor` describe its initial topology. Claiming an
existing door preserves topology and state; configure it separately.

`configure` accepts only `open`, `locked`, `sealed`, `automatic`, `autoClose`,
`defaultAccess`, `openRadius`, `closeRadius`, `closeDelay` and `npcPassage`
(the same values as `setNpcPassage`). Radii are 1–12 m,
closing radius must not be smaller than opening radius, and delay is 0.2–60 s.
An invalid field rejects the entire patch. Locked/sealed doors cannot stay open.
Lift doors reject direct open/automatic control, including from their owner.

An explicit per-player denial overrides `defaultAccess`. A global lock or seal
blocks everyone, including granted players. This is a shared physical door:
once it opens for an authorized player, another player can follow through it.
Door permissions are not an anti-tailgating collision boundary.

Owners are resource name + runtime generation. A restart/stop releases its
doors and rules. Player-specific grants are cleared on disconnect. The registry
is in memory; initialize durable rules from your own resource/database at start.

### Observing server changes

`changes(cursor)` offers a bounded data-only feed compatible with isolated
server Lua VMs. Events contain `cursor`, `kind` (`changed`, `removed`, `request`,
`action`, `npc_request`), `door`, `reason` and optional `value`. For `request`,
reason is the authenticated player ID and value is the requested open boolean;
for `action`, reason is the player ID and value is the action record described
below; for `npc_request`, reason is the NPC ID and value is the player whose
client simulates it. Read subsequent pages using the returned cursor. When
`reset` is true, rescan `list` and resume from the returned cursor: older events
expired or the service restarted. Door state changes are not published on the
host-wide event bus; door actions are (`open77:doors:action`, below).

List pagination is not a transactional snapshot. Rescan if the registry changes
while traversing pages. Pages are bounded to fit the runtime's export budget.

### Door actions: force, pay and hack

A locked door, or one closed to a player by `defaultAccess = false`, refuses an
ordinary open request. The game offers three other ways in: **force** (the Body
and Tech skill checks), **pay** (the paid door prompt) and **hack** (the door
quickhack and the breach minigame). On a network door each of them is a request
to the server carrying its kind. **Nothing is allowed by default**: a door
accepts only the actions its owning resource declared with `setActions`, and
without a declaration the client does not offer them on a locked door. Declare
them from the resource that `register`ed the door, and depend on
`open77_doors >=1.1.0`. Players need a client whose native door bridge carries
action intents; an older client offers none of these on a locked network door,
so declaring actions never breaks it.

```lua
CreateThread(function()
    local id = '0xFC85EAE29622BAC2' -- a door this resource registered
    local ok, reason = doors('setActions', id, 0, {
        force = true,                          -- accepted by the door service itself
        hack  = { approval = 'owner', range = 25 },
        pay   = { price = 500 },               -- always approved by the owner
    })
    if not ok then print(reason) end
end)
```

| Field | Values | Meaning |
|---|---|---|
| `force`, `hack` | `true` or a table | Offer the action. `true` means `{ approval = 'auto' }`. |
| `pay` | table with `price` | Offer the paid prompt. `price` is an integer 1–1,000,000,000 in your own currency. |
| `approval` | `'auto'` (force/hack default) or `'owner'` (required for pay) | `auto`: the service applies it after its own checks. `owner`: your resource decides each request. |
| `keepUnlocked` | boolean, default `false` | `false`: the lock returns when the door next shuts. `true`: the lock stays open, as in single player. |
| `range` | 1–60 m (hack only, default 30) | Remote reach of a door hack. Force and pay use the 6 m manual range. |

An invalid field rejects the whole declaration. Lift doors take no actions.

**Checks before an action does anything.** The player is in the door's bucket
and within range, the door is neither sealed nor a lift door, the action is
declared, and the player is not explicitly denied with `setAccess(..., false)`:
an action bypasses the lock and `defaultAccess`, never an explicit per-player
denial. Requests share the ordinary limit of six per second. An action on a door
the player could open anyway is an ordinary opening: it is not charged and never
reaches the owner.

**What an accepted action does.** It unlocks and opens the door (an automatic
door then follows proximity as usual), and the player holds it open like a
granted player for ten seconds. Unless `keepUnlocked` is set, the lock returns
when the door shuts. Another player can still walk through while it is open.

**Owner approval.** An `owner` action creates a *ticket* and publishes one
host-wide event; the requesting client gets its answer only when you resolve it:

```lua
local balances = {}                                   -- your own ledger, by player ID
local function isPolice(playerId) return false end    -- replace with your job check

AddEventHandler('open77:doors:action', function(a)
    if a.owner ~= GetCurrentResourceName() or a.stage ~= 'requested' then return end
    if a.kind == 'pay' then
        local balance = balances[a.player] or 0
        if balance < a.price then
            doors('resolveAction', a.ticket, false, 'insufficient_funds')
            return
        end
        balances[a.player] = balance - a.price             -- reserve first
        if not doors('resolveAction', a.ticket, true) then
            balances[a.player] = balances[a.player] + a.price -- nothing opened: refund
        end
    elseif a.kind == 'force' then
        doors('resolveAction', a.ticket, isPolice(a.player), 'not_police')
    end
end)
```

`resolveAction(ticket, true)` re-checks range, seal, declaration and price before
applying, and answers `true` only if the door actually opened; `false, reason`
means nothing opened, so never keep a charge on `false`. A refusal you pass
(`accept = false`) answers `false, "refused_by_owner"`, never `true`, so an owner
that charges on `true` cannot charge a refused player. A ticket answers once,
only to the door's owner, and expires after five seconds (`action_timeout`). One
pending action per player, 256 in total. A refusal reason you pass is sent to the
client when it matches `[A-Za-z0-9_.:-]{1,48}`, otherwise `action_refused`.

The event payload is one table: `stage` (`requested`, `accepted`, `refused`),
`kind`, `player`, `id`, `bucket`, `owner`, and `ticket`/`price` for owner actions,
`reason` for `accepted` (`auto`/`owner`) and `refused`. `auto` actions publish only
`accepted`. Any resource can publish an event with this name; that is harmless,
because only a live ticket resolves. The same records appear in `changes` as
`action` entries.

**What the client does not decide.** The Body/Tech check result, the wallet and
the RAM pool are the player's own client state and are not trusted: a passed
skill check is only a force *request*. On a network door no local cost is
spent (no eddies for pay, no RAM for the door quickhack), so a refusal costs the
player nothing. Charge your own ledger when you approve. The paid prompt still
displays the price authored on the door's payment record, which is not
necessarily your `price`: use the same value or tell the player. The pry-open
animation of a Body check is not played; the door's own opening animation
follows the server's acceptance.

### NPC passage

A network NPC ([`Open77.npcs.create`](npcs.md)) walks through network doors the
way it does in single player: its own AI asks the door to open when its path
crosses it. Exactly one client simulates each network NPC, and only that client
forwards the request, as a request *for that NPC*. The service then decides with
its own data, never the requesting player's position or rights:

- the requesting client is the NPC's current simulator, with a live lease and
  the same authority epoch ([`Open77.npcs.presence`](/docs/api/server/open77-npcs#presence)
  answers this; the service declares `world.npcs` and `npcs.foreign` to read it);
- the NPC is alive, in the door's bucket and within 6 m of it (its canonical
  position, the one the server accepted from the simulator);
- the door is not a lift door, not sealed, and its NPC passage rule admits it.

| `npcPassage` | Who opens the door |
|---|---|
| `'public'` (default) | Any network NPC, on a door that is unlocked and open to everyone (`defaultAccess` true). |
| `'resource'` | As `public`, and the owning resource's own NPCs also pass its locked or private doors. |
| `'always'` | Any network NPC, locked or private doors included. |
| `'never'` | No NPC. |

```lua
CreateThread(function()
    local hideout, backRoom = '0xFC85EAE29622BAC2', '0x1B2C3D4E5F607182' -- captured door IDs
    local door = doors('get', hideout, 0)
    if not door then return end
    -- The gang's own NPCs walk in and out of the locked hideout; nobody else does.
    doors('register', { id = hideout, bucket = 0, position = door.position })
    doors('configure', hideout, 0, { locked = true, npcPassage = 'resource' })
    -- A shop's back room (already registered by this resource) stays shut to every NPC.
    local ok, reason = doors('setNpcPassage', backRoom, 0, 'never')
    if not ok then print(reason) end
end)
```

An admitted NPC opens the door for everyone, like a player. When a `resource` or
`always` rule lets an NPC through a locked door, the lock is lifted only until
the door shuts. The NPC holds the doorway open while it stands within the door's
`closeRadius`, for at most ten seconds per request, and a player's close request
is refused while it is in the threshold (`doorway_occupied`). Once it has walked
through, the door's own timer closes it (`closeDelay` after the last NPC or
player left). A dead NPC, or one that left, holds nothing.

A refused NPC request changes nothing (no reply, no revision), so the door stays
shut without a flicker. The refusal reason is counted in `npcStats` (`locked`,
`npc_passage_denied`, ...):

```lua
RegisterCommand('doornpcstats', function()
    local stats, reason = doors('npcStats')
    if not stats then print(reason); return end
    print('NPC openings admitted: ' .. stats.accepted)
    for why, count in pairs(stats.refused) do print(why, count) end
end, true)
```

A locked door also removes the NPC path through it in the engine, so an NPC's AI
never walks up to it on its own. A `moveTo` whose destination is behind one is
therefore probed first: the NPC walks to the closest reachable point, in front
of the door, and asks the door to open for it, admitted or refused by the rule
above. A `resource` or `always` rule opens it and the walk goes on through;
otherwise the NPC stays there, re-checking once a second, and after about five
seconds the task fails with reason `path_blocked`. It never passes through a
closed door (see [NPC tasks](npcs.md#move-follow-and-patrol)). Requests are
limited to two per NPC per second (counted only once the sender proved it
simulates that NPC, so nobody can use up another client's budget) and twelve per
simulating client per second; at most eight NPCs hold one door at a time.
Admitted openings appear in `changes` as `npc_request`.

NPC passage needs `open77_doors >=1.2.0` and players on a client with the
NPC door bridge. The server advertises the rule in every snapshot
(`npcPassage`); an older server advertises none, and a newer client then sends no
NPC request at all. An older client never sends one: its NPCs keep stopping at
managed doors. Vanilla crowd NPCs are not network NPCs and never open a managed
door.

## Client exports and events

Call `Open77.exports.call('open77_doors', name, ...)` and await as above:

| Export | Arguments | Result |
| --- | --- | --- |
| `get` | `id` | Interested server snapshot or nil; not proof the native object is streamed. |
| `list` | `offset=0, limit=16` | `{doors, total, nextOffset?}` within this client's interest. |
| `requestOpen` | `id, boolean` | Queue player intent; server acceptance arrives separately. |

Client events:

```lua
AddEventHandler('open77:doors:streamedIn', function(id, state) end)
AddEventHandler('open77:doors:updated', function(id, state) end)
AddEventHandler('open77:doors:streamedOut', function(id) end)
RegisterNetEvent('open77:doors:requestResult', function(id, accepted, reason) end)
```

Here "streamed" means server interest, not REDengine object residency. An
interested state can arrive before the native door; the service retries after
the object streams. Snapshots contain ID, bucket, position, revision, open,
locked, sealed, automatic, autoClose, lift, elevatorId and elevatorFloor, plus
`canOpen` (this player may open it with an ordinary request), `npcPassage` (the
door's [NPC passage](#npc-passage) rule) and, when the owner declared door
actions this player may attempt, `actions`: `{ force = true, hack = true,
pay = price }` with only the declared keys.

Native `Open77.doors.near(radius)` and `Open77.doors.state(id)` now also expose
`networkInstance`, `elevatorId` and `elevatorFloor` alongside existing local
fields. Local state may briefly lag its authoritative target during transport.
Existing local door mutations return `false, 'server_authority_required'` for
managed doors. Internal projection methods (`setNetworkEnabled`,
`applyNetworkState`, `forgetNetworkState`, `takeNetworkRequests`,
`setNetworkPredictionPolicy`, `setNetworkActionPolicy`, `requestNetworkOpen`,
`resolveNetworkRequest`) are restricted to the `open77_doors` system resource
and are not gameplay APIs.

## Limits and diagnostics

The service bounds the registry to 4096 doors, interest to 256 nearest doors
per player, discovery to 20 proposals/second/player, and requests to
6/second/player. Inactive unowned doors expire after ten minutes out of interest.
State sends retry on queue backpressure; bucket resets precede the new state.

Typical rejections: `too_far`, `access_denied`, `doorway_occupied`,
`elevator_controlled`, `proximity_controlled`, `not_owner`, `invalid_lift`,
`invalid_hysteresis`, `topology_conflict`, `registry_full`, `rate_limited`.
Door actions add `action_not_allowed`, `invalid_action`, `sealed`,
`action_pending`, `action_busy`, `action_timeout`, `price_changed`,
`unknown_ticket`, `unknown_door`, `refused_by_owner` and the owner's own refusal
reason. NPC requests, counted in `npcStats` rather than answered, add
`not_npc_authority`, `unknown_npc`, `npc_not_alive`, `wrong_bucket`, `locked`,
`npc_passage_denied` and `invalid_npc_request`; an invalid rule value is refused
with `invalid_npc_passage`.

For local validation, `server/server.doors-local.jsonc` enables the explicit
`open77_doors_test` laboratory. It is masterless and loopback-only. Never deploy
that profile as a public server configuration.

The profile uses your local `acl.jsonc`. Grant only the required test commands
to the test account (`command.doors.test.rule`, and optionally
`command.elevator.goto` / `command.elevator.list`). Do not publish identities,
private keys or a permissive test ACL with a server release.
