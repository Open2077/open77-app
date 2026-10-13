# CHOOH2: from the corn rows to the fuel depot

In Night City, CHOOH2 is the alcohol fuel every car burns: Petrochem makes it from the corn
Biotechnica grows outside the city. This job runs the whole chain. Farmhands harvest corn into
crates at the Biotechnica protein farm, haulers truck the crates to the Petrochem refinery,
operators ferment the corn into CHOOH2 canisters, and the canisters are sold to the fuel depot or
poured into a car's tank.

The job is the [`rp_chooh2`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_chooh2)
resource, version 0.1.0, from the Open2077/open77-resources repository, with
[`rp_cargo`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_cargo) for the truck beds.
It is built on the [world-interaction libraries](world-interaction.md) and is experimental like
them.

| | |
|---|---|
| Where | The corn rows along the outer wall of the Biotechnica protein farm, on the northern edge of Northside. The refinery is the Petrochem tank farm of the North Sunrise Oil Field in the Badlands, about 1.2 km up the road, with the Sunrise fuel depot beside it. |
| Who works | Farmhands (`rp_jobs` job `farmhand`) and refinery operators (job `refinery`), on duty. Farmhands, operators and nomads (`nomade`) on duty may haul crates. |
| Who pays | The fuel depot, when an operator sells canisters |
| Who is paid | The seller (90 %) and the `refinery` society (10 %) |
| What is made | Biotechnica corn, corn crates and CHOOH2 canisters |
| Runs on | Server |

## How the chain plays

### Farmhands: harvest the corn

You need the `farmhand` job. It is a civil job: anyone may join it at the employment agency with
`/agence`.

1. **Clock in.** At the Biotechnica farm office, press **E** on **Clock in**. You read "On duty at
   the farm." `/service` from anywhere does the same.
2. **Harvest.** Walk up to one of the five corn rows and press **E** on **Harvest corn**. You kneel
   for 8 seconds, then read, for example, "+4 corn into your crate." A harvest yields 3 to 5 corn.
   Your first harvest at a row opens a corn crate on the ground, 1.4 m from the row towards the
   sidewalk; the next harvests at that row fill the same crate.
3. **Check.** **F** on the row (**Check the row**, 3 seconds) tells you what your crate holds and
   what the row has left:

   ```text
   Your crate: 18 corn (18.0 / 20 kg). Corn row 1: 0 / 4 harvests left.
   ```

4. **Move on.** A row gives 4 harvests, then grows one back every 5 minutes. A picked-clean row only
   offers **Check the row** until it grows back. A crate holds 20 kg of corn: once it has no room
   for another harvest, the row refuses with "Your crate here is full: carry it to the truck first."

You may have up to 4 crates out at once, on the ground, in your hands or in a truck bed.

### Haulers: truck the crates

Farmhands, refinery operators and nomads on duty may haul. By default anyone in those jobs may lift
any corn crate, not only the harvester's.

1. **Pick up.** Walk up to a crate and press **E** on **Pick up corn crate**. You carry it in both
   hands at walking pace; jumping, sprinting and attacking are blocked while you carry. **G** sets
   it down in front of you.
2. **Load.** Park a truck you hold a key for at the farm loading bay, on the road beside the rows.
   Carrying the crate, press **E** on **Load into the truck** at the bay, or type `/chooh2 load`
   next to any of your trucks. You read "Corn crate loaded on NC-1234, slot 1." and the crate sits in
   the bed. A Thorton Mackinaw carries 8 crates: 4 slots, 2 high.
3. **Drive.** Take the road north to the North Sunrise Oil Field. The crates stay in the bed,
   held by the truck's plate.
4. **Unload.** Park at the refinery unloading bay, west of the storage tank, and press **E** on
   **Unload a crate** (1.5 seconds), or type `/chooh2 unload` next to the truck. The top corn crate
   lands in your hands. Unloading also needs the truck's key.
5. **Deliver.** Carry the crate to the corn intake hopper and press **E** on **Empty into the
   intake**. Every corn in the crate goes into the intake and the crate is gone:

   ```text
   19 corn into the intake (intake: 19).
   ```

The truck must be a vehicle the server tracks by plate (from `rp_garage`) with a cargo bed that
`rp_cargo` knows. Without the key, the hauler keeps the crate and reads "You hold no key for that
truck."

### Operators: run the refinery

You need the `refinery` job (label "Petrochem operator"), also joined at the agency with `/agence`.

1. **Clock in** at the Petrochem shift office (**E** on **Clock in**): "On duty at the refinery."
2. **Run a batch.** At the fermenter control station, at the foot of the storage tank, press **E**
   on **Run a batch**. You stand at the console for 15 seconds, working on a tablet. The batch takes
   10 corn from the intake and puts 2 canisters on the rack:

   ```text
   Batch done: 10 corn in, 2 CHOOH2 canister(s) on the rack.
   ```

   **F** on the same card (**Read the gauges**) shows the intake and the rack without running
   anything. The station takes one operator at a time.
3. **Take canisters.** At the CHOOH2 output rack, press **E** on **Take canisters** (2.5 seconds).
   Up to 3 canisters move into your pockets per take: "+2 CHOOH2 canister(s) in your pockets." A
   canister weighs 5 kg.
4. **Sell.** At the Sunrise fuel depot counter, on the south side of the tank, press **E** on
   **Sell canisters** (2 seconds). Up to 10 canisters are sold at once:

   ```text
   Sold 2 canister(s) to the depot clerk: 300 eddies (270 to you, 30 to the refinery society).
   ```

Only an operator on duty may sell at the depot.

### Anyone: refuel a car

Anyone with a canister may pour it into a car, with no job and no key:

- at the depot fuel pump, **E** on **Refuel the nearest car**: the car nearest to the pump, within
  7 m;
- anywhere, `/chooh2 refuel`: the car nearest to you, within 4 m.

The pour takes 5 seconds and adds up to 15 L: "Poured a CHOOH2 canister: +15.0 L, tank 35.0 L."
The car must stand still and have at least 3 L of room in its tank.

### What everyone nearby sees

The farmhand kneeling with both hands in the corn, the hauler carrying the crate across their
hands, the crates in the truck bed, the operator at the console. The server plays the postures and
draws the crates, so every player nearby sees the same scene.

| Command | What it does |
|---|---|
| `/chooh2` | The chain in one help line. |
| `/chooh2 load` | Load the crate you carry into your truck, standing next to it. |
| `/chooh2 unload` | Lift the top corn crate out of your truck within 6 m (haul jobs, on duty). |
| `/chooh2 refuel` | Pour a canister into the car next to you. |
| `/chooh2 crates` | Your crates and where they are. |
| `/service` | Clock in or out of your job (from `rp_jobs`). |
| `/agence` | The employment agency: join `farmhand` or `refinery` (from `rp_jobs`). |

## Money, goods and what can go wrong

Every step that moves value is one operation of
[`open77_transactions`](transactions.md) with its own id, so a retry, a double press or a restart
never pays, creates or burns twice.

| Step | What moves, in one operation |
|---|---|
| Harvest | 3 to 5 corn are created into your crate, and the crate itself on its first harvest |
| Load, unload | The crate moves between the ground and the truck's bed, held by the plate |
| Empty into the intake | Every corn of the crate moves into the intake; the crate is closed |
| Batch | 10 corn are burned from the intake and 2 canisters are created on the rack |
| Take canisters | Up to 3 canisters move from the rack into your pockets |
| Sale | The canisters go to the depot; their price is created and paid, 90 % to the seller's cash and 10 % to the `refinery` society |
| Refuel | One canister is burned; the car gets up to 15 L |

The chain pays at one point: the depot sale. Corn and crates carry no price on the way; farmhands
and haulers earn their `rp_jobs` salary while on duty. The depot's money is created by `rp_economy`
on behalf of `rp_chooh2`, within an hourly cap, and nothing else in the chain creates money.

| What happens | Result |
|---|---|
| **X** during a bar, walking off, getting into a vehicle, drawing a weapon, dying or disconnecting | The step stops. Nothing is taken or paid, the row keeps its charge, and a crate opened for that harvest is closed again. |
| A second press of **E**, or a sale retried after a database hiccup | The first receipt is returned; nothing is paid or created twice |
| The carrier dies, disconnects, gets into a vehicle or draws a weapon | The crate falls at their feet, with its corn, and anyone on duty in a haul job can pick it up |
| A delivery is cut by a restart | At the next start the server checks the operation: a delivery that went through is closed and reported once, one that did not leaves the crate as it was |
| The car disappears between the burned canister and the fuel | "The canister was poured, but the car is gone: the fuel is lost." |

### After a disconnect or a restart

- **Survives a restart:** the rows' charges and regrowth, the ground crates with their corn at the
  place they were set down, the crates in truck beds, the intake, the rack and the canisters in
  pockets.
- **A crate in someone's hands** at a restart goes back to where it was last set down.
- **A truck that is stored** keeps its crates: they are drawn in the bed again when it is taken
  out.
- **After a disconnect** the canisters stay in your pockets and a carried crate stays where it fell.
  You come back off duty: clock in again.

## Set up the chain

### Requirements

- A [MySQL or MariaDB database](database.md). The crates, the corn, the stashes and the canisters
  are saved by `open77_transactions`, which needs it.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_containers` (the corn
  rows) and `open77_notifications`, with the libraries `open77_actions` depends on
  (`open77_props`, `open77_animations`, `open77_interactions`) and `open77_uikit`.
- The RP pack resources `rp_jobs`, `rp_inventory`, `rp_economy`, `rp_garage` (truck keys) and
  `rp_cargo` (truck beds).
- Optional: `open77_fuel` for refuelling. Without it the pump and `/chooh2 refuel` refuse and
  nothing is taken.
- Clients with the RP animation archive for the postures: `scavenge` for the harvest, and
  `examine`, `tablet2` and `mechanic` for checking a row, running a batch and refuelling
  ([animation catalogue](rp-animation-catalogue.md)). The last three are optional: the step runs
  without the posture.

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first:

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_transactions", "open77_props", "open77_animations", "open77_interactions",
    "open77_uikit", "open77_notifications", "open77_actions", "open77_containers", "open77_fuel",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_garage", "rp_cargo",
    "rp_chooh2"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`. Canisters
in pockets are invisible to the chain without it:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### The jobs and the depot's cash

The `rp_jobs` and `rp_economy` that ship with the RP pack already contain what the chain needs.
If your copies are older or edited, check two entries:

```lua
-- rp_jobs/shared/config.lua, in RpJobsConfig.Jobs
{ name = "farmhand", label = "Biotechnica farmhand", color = "#8BC34A", civil = true, description = "Corn rows, crates and the farm truck.", salary = { [0] = 150, [1] = 220, [2] = 300, [3] = 420 } },
{ name = "refinery", label = "Petrochem operator", color = "#E0A030", civil = true, description = "Fermenters, CHOOH2 canisters and the depot.", salary = { [0] = 180, [1] = 260, [2] = 360, [3] = 500 } },

-- rp_economy/server/config.lua, in EconomyConfig.mint.callers
rp_chooh2 = 30000,         -- CHOOH2 canister sales at the depot
```

- Without the jobs, the server log says `WARNING: rp_jobs has no job farmhand, refinery` and
  players read "The server has no farmhand or refinery job yet. Tell an admin." To use jobs you
  already have instead, see [Use your own jobs](#use-your-own-jobs).
- The `rp_economy` entry is the most the depot may pay in an hour, in eddies: 30000 is 200
  canisters at the default price. Without it, every sale is refused.

### Let the chain write and create goods

Two `open77_transactions` settings decide which resources may change which accounts and who may
create items ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set them
once in the server console:

```text
tunable.set open77_transactions writers rp_chooh2:world+stash+char, rp_cargo:veh/cargo, rp_economy:cash+bank+soc, rp_inventory, open77_containers:world, <your other writers>
tunable.set open77_transactions mint1 rp_chooh2 sys:chooh2.fields * 2000; rp_chooh2 sys:chooh2.refinery chooh2_canister 400; rp_inventory sys:* * 2000; rp_economy sys:* money 2000000
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add these entries to it: the chain writes ground crates (`world`), the refinery's
  stashes and the players' pockets; `rp_cargo` writes truck beds; `open77_containers` keeps the
  rows. Without `open77_containers:world`, the rows stay dark and the log says
  `row row1 (node.row1) unavailable: namespace_denied`. Keep your other jobs' entries.
- **mint rules.** `sys:chooh2.fields` creates the corn and the crates (2000 an hour here),
  `sys:chooh2.refinery` the canisters (400 an hour). The `rp_inventory` and `rp_economy` rules are
  shared by every RP job and are needed once per server. Use any free `mint1` to `mint6`, or append
  the rules to an existing one with `;`. Size the caps to your server. Burning corn in a batch and a
  canister in a refuel needs no rule.

`transactions mints` in the server console lists every mint rule with this hour's use.

### Start the chain

```text
ensure open77_transactions
ensure open77_actions
ensure open77_containers
ensure rp_cargo
ensure rp_chooh2
```

These declare `auto_start false`. To start them with the server, put the same lines in
`server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure open77_containers",
    "ensure rp_cargo",
    "ensure rp_chooh2"
  ]
}
```

The server log then shows:

```text
[rp_chooh2] coordinator ready (store=sql)
[rp_chooh2] items defined through rp_inventory: 3
[rp_chooh2] 5 corn row(s) ready (5 created)
[rp_chooh2] crates rebuilt from the coordinator: 0 (ground 0, in a bed 0, delivered 0, new 0, orphans closed 0)
[rp_chooh2] ready: 5 corn rows, farm office and bay, refinery (intake open, control, rack), depot, pump
```

On later starts the rows line reads `(0 created)`: the rows already exist and keep their charges.
If `open77_fuel` is not running, the log says so once and refuelling is refused until it starts.

### Staff the chain

`farmhand` and `refinery` are civil jobs: players join them at the employment agency with
`/agence` and clock in at their office or with `/service`. Nomads on duty may haul without joining.
Haulers need a truck of their own: a vehicle registered in `rp_garage` that they hold a key for.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `chooh2.status` | Crates by state, counters, the intake and the rack, each row's charges |
| `chooh2.state <playerId>` | A player's crates, canisters, cash, the society and their last receipts |
| `chooh2.setup <playerId> <job>` | Give that job at grade 0 and put the player on duty |
| `chooh2.clock <playerId> on\|off` | Duty in the player's own job |
| `chooh2.reset [row\|all]` | Refill rows to full charges, in place |
| `chooh2.stock <count>` | Put corn straight into the intake |
| `chooh2.give <playerId> <item> <count>` | Give chain items, for example canisters to try a sale or a refuel |
| `chooh2.truck <playerId> [plate]` | Bring that plate's truck out next to the player |
| `chooh2.drop <playerId>` | Make a player drop the crate they carry |

The README lists a few more console commands that run one prompt for a given player
(`chooh2.harvest`, `chooh2.refine`, `chooh2.sell` and others), for testing.

To let an admin use them in game, add the permission to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.chooh2.*"
]
```

The player command `/chooh2` needs no ACL: the chain checks the job and duty itself.

## Configuration

Everything is in the resource's `server/config.lua` (`Chooh2Config`). Prices are in eddies,
durations in milliseconds and positions in metres. After an edit, run `restart rp_chooh2` while
nobody is carrying a crate or running a bar.

| Key | Default | Meaning |
|---|---|---|
| `jobs.harvest`, `jobs.refine`, `jobs.haul` | `farmhand`, `refinery`, `farmhand`/`refinery`/`nomade` | Who harvests, who runs the refinery and sells, who may lift, load and unload crates |
| `offices` | farm: `farmhand`, refinery: `refinery` | Which jobs clock in at which office |
| `society` | `refinery` | The society that receives the share of a sale |
| `nodes` | 5 rows | Each row's `key`, `label`, `position` and `yaw`; `containerKey` gives a closed row a new key |
| `nodeDefaults` | 4 charges, regrowth `300000` | Harvests per row and the time to grow one back, applied when a row is first created |
| `harvest` | 3 to 5 corn | What one harvest yields |
| `crateOffsetM`, `laneCentre` | `1.4`, the sidewalk | Where a new crate is set down: this far from its row, towards `laneCentre` |
| `farmOffice`, `farmBay` | Biotechnica farm | The farm's clock-in point and the truck bay (`truckRadius` 8 m) |
| `refineryOffice`, `unloadBay`, `intake`, `control`, `outputRack` | Petrochem tank farm | The refinery's stations; `control.promptAt` is where its card is drawn |
| `depot`, `pump` | Sunrise fuel depot | The sale counter, the clerk and the fuel pump (`vehicleRadius` 7 m) |
| `crate.contentsKg` | `20` | Corn one crate holds |
| `crate.maxPerPlayer`, `crate.maxOpen` | `4`, `48` | Crates out per player, and on the server |
| `crate.pickupBy` | `crew` | `crew`: anyone on duty in a haul job lifts any crate. `owner`: only the harvester |
| `crate.model` | `crate.ammo_box` | The prop drawn for a crate |
| `refine` | 10 corn to 2 canisters | One batch |
| `collectMax` | `3` | Canisters per take at the rack |
| `stashes` | intake 400 kg, rack 200 kg | The refinery's two stashes: 400 corn, 40 canisters |
| `prices.chooh2_canister` | `150` | The depot's price for one canister |
| `saleMax`, `societyShare` | `10`, `0.10` | Canisters per sale, and the society's share of the price |
| `refuel` | 15 L, 3 L of room, 4 m, `1.0` m/s | Litres per canister, the room the tank needs, the reach of `/chooh2 refuel`, the speed above which a car counts as moving |
| `actions` | see the file | Each step's label, bar text, duration and posture |
| `truckNearM` | `6.0` | How far `/chooh2 load` and `/chooh2 unload` look for a truck |
| `items` | 3 items | Corn (1 kg), the canister (5 kg) and the crate token (2 kg) |

### Move the corn rows

To grow corn somewhere else, record the new points in game, then edit the rows:

1. Stand where the farmhand should kneel, facing the plants. Type `/pos` to copy your position and
   `/rot` for your yaw ([clipboard commands](clipboard.md)).
2. Paste them into `nodes`, keeping `z` at ground level. On a slope, each row has its own height.
3. Move `laneCentre` to the open ground beside the rows, where new crates should appear, and
   `farmBay` to the road where the truck parks.
4. Mark the points as walked (`measured = true`), then `restart rp_chooh2`.

```lua
-- server/config.lua
C.nodes = {
    { key = "row1", label = "Corn row 1", position = { x = -977.71, y = 3000.01, z = 16.55 }, yaw = -70.8, measured = true },
    { key = "row2", label = "Corn row 2", position = { x = -980.14, y = 3007.01, z = 15.65 }, yaw = -70.8, measured = true },
    -- a sixth row (example values: use your own /pos and /rot): a new key creates a new row
    { key = "row6", label = "Corn row 6", position = { x = -989.90, y = 3035.00, z = 11.10 }, yaw = -70.8, measured = true },
}
C.laneCentre = { x = -989.0, y = 3014.0, z = 14.0 }   -- the sidewalk beside the bed
C.farmBay = {
    position = { x = -994.0, y = 3010.0, z = 14.04 }, label = "Farm loading bay", truckRadius = 8.0, measured = true,
}
```

A row keeps its charges under its key: moving `position` moves the prompt, and the row stays as
picked as it was. `charges` and `regrowMs` apply only when a row is first created; give a row its
own with `charges = 6, regrowMs = 600000` in its entry before its first start, or refill existing
rows with `chooh2.reset`.

Measure the refinery's points the same way, standing on them. The game's physics queries
(`Open77.world.raycast`, `Open77.world.groundZ`) find no ground in the North Sunrise Oil Field, so a
script cannot measure heights there.

### Change the price and the society's share

```lua
-- server/config.lua
C.prices = { chooh2_canister = 200 }   -- eddies per canister at the depot
C.saleMax = 10                         -- canisters per sale
C.societyShare = 0.25                  -- 25 % of each sale to the society
C.society = "refinery"
```

Two canisters now sell for 400: 300 to the seller, 100 to the `refinery` society. A higher price
reaches the depot's hourly cap sooner: at 200 eddies, `rp_chooh2 = 30000` in `rp_economy` pays for
150 canisters an hour. Raise it there if needed.

To change how much corn a canister costs, change the batch, and the canister mint rule if more
canisters an hour can now come out:

```lua
C.refine = { cornIn = 8, canistersOut = 2 }   -- 4 corn per canister instead of 5
```

### Use your own jobs

To run the chain with jobs your server already has, map the roles onto them:

```lua
-- server/config.lua
C.jobs = {
    harvest = "nomade",
    refine = "mecano",
    haul = { "nomade", "mecano" },
}
C.offices = {
    farm = { "nomade" },
    refinery = { "mecano" },
}
C.society = "mecano"
```

Every name must exist in `rp_jobs`. The log names the missing ones at start.

## For resource authors

The chain publishes a host-wide server event after every committed step, for example for a fixer
board:

```lua
-- server
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "chooh2"
    -- e.kind: "harvest", "deliver_intake", "refine", "sell" or "refuel"
    -- e.playerId: the player, or nil for a delivery found committed after a restart
    -- e.ref: the operation id, unique per step: deduplicate on it
    -- e.data.subject, plus per kind:
    --   harvest:        row, corn, crate
    --   deliver_intake: corn, crate, harvester (recovered = true after a restart)
    --   refine:         corn, canisters
    --   sell:           canisters, total, society
    --   refuel:         vehicleId, litres
end)
```

## When something is refused

The chain explains every refusal in words. The ones you may meet:

| The player reads | Why, and the fix |
|---|---|
| "The plant is not configured for this (server ledger rules). Tell an admin." | A `writers` entry or a mint rule is missing. Add [them](#let-the-chain-write-and-create-goods). |
| "The plant is not configured to pay for that. Tell an admin." | The sale's money cannot be created: check `rp_chooh2` in `EconomyConfig.mint.callers` and the `rp_economy` mint rule. |
| "The depot is out of cash for this hour." | The depot's hourly cap in `rp_economy` is used up: wait, or raise it. |
| "The plant hit its hourly limit. Try again later." | A mint rule's hourly cap is used up: wait, or raise the cap. |
| "The plant's ledger is offline: nothing was taken or paid." | Check `open77_transactions` and the database. |
| "The plant's ledger is not ready. Try again in a moment." | The chain is still starting. |
| "The server has no farmhand or refinery job yet. Tell an admin." | Add the [jobs](#the-jobs-and-the-depots-cash) to `rp_jobs`. |
| "You do not work on the CHOOH2 line. The employment agency hires farmhands and operators." | The player has no job: `/agence`. |
| "Clock in at your office first." | The player is off duty. |
| "Clock in at your own employer's office." | A farmhand at the refinery office, or the reverse. |
| "That is not your job." | For example an operator at a corn row. |
| "The fuel gauge does not answer (open77_fuel is not running). Nothing was taken." | Start `open77_fuel`. |
| "No truck you can load is parked here." | Park a truck with a known bed within 8 m of the bay. |
| "You hold no key for that truck." | The hauler needs the truck's key in `rp_garage`. |
| "That vehicle has no plate on file: use a registered truck." | The truck is not registered in `rp_garage`. |
| "That vehicle has no cargo bed the farm knows." | The vehicle has no layout in `rp_cargo`. |
| "The bed is full." | Unload, or use a second truck. |
| "Your crate here is full: carry it to the truck first." | Take the crate away; the next harvest opens a new one. |
| "This row is picked clean for now. Try another one, it grows back." | One charge grows back every 5 minutes. |
| "You already have too many crates out. Deliver or load some first." | 4 crates per player. |
| "Not enough corn in the intake for a batch." | A batch needs 10 corn in the intake. |
| "The intake hopper is full: run a batch first." | The intake holds 400 corn. |
| "The output rack is full: take canisters out first." | The rack holds 40 canisters. |
| "Someone is already working there." | Another operator is running a batch. |
| "Someone is standing there." | Another player stands on the station's spot. |
| "That tank is full." | The tank has less than 3 L of room. |
| "Stop the car first." | The car is moving. |
| "You carry no CHOOH2 canister." | Nothing to sell or pour. |

## Limits

- **Refuelling is two steps.** The canister is burned first, then the litres are added through
  `open77_fuel`. If the car disappears in between, the fuel is lost and the player is told.
- **Fuel lives in the car's state.** A car stored and taken out again comes back with a full tank.
- **No key to refuel.** Anyone may pour their own canister into any car. A car has no prompt of its
  own: use the depot pump or `/chooh2 refuel`.
- **Truck beds.** Only the Thorton Mackinaw bed is measured. The Mackinaw 02, the Chevalier
  Legatus and the Thorton Colby pickup have starting layouts, where crates may float or clip. A
  crate in a bed counts its 2 kg against the bed's capacity; its corn stays in the crate.
- **A crate in someone's hands at a restart** goes back to where it was last set down, not to the
  carrier's feet.
- **Crate limits.** 48 crates on the server and 4 per player.
- **One operator per station.** A second operator waits until the first one leaves the station's
  spot.
- **Never close a row** with `open77_containers` directly: a closed key is never reused and the row
  stays dark until it gets a new `containerKey`. Use `chooh2.reset` to refill it in place.
- **Restarting `rp_cargo`** restarts the resources that depend on it, this chain included, and
  logs a burst of `task quota exceeded` errors for the crates' attachment events. The beds are drawn
  again afterwards.
- **The depot clerk** is decoration: the counter works without the NPC.
