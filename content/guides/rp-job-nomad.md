# Nomad smuggler: Aldecaldos runs

A nomad takes a smuggling run at the Aldecaldos camp in the Badlands, carries the contraband crates
into a truck bed, drives past the NCPD checkpoints into Night City and hands the crates to a fence.
The fence pays per crate and the camp keeps its cut. An NCPD officer can stop the truck and search
it, and a crate left alone can be stolen.

The job is the [`rp_nomade`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_nomade)
resource, version 2.0, from the Open2077/open77-resources repository. The truck beds come from
[`rp_cargo`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_cargo), the same beds the
[CHOOH2 chain](rp-job-chooh2.md) uses. It is built on the [world-interaction libraries](world-interaction.md)
and is experimental like them.

| | |
|---|---|
| Where | The Aldecaldos camp around V's nomad tent in the Badlands, the street outside the Afterlife in Watson, and the street outside Lizzie's Bar in Kabuki |
| Who works | Players with the `rp_jobs` job `nomade` (label "Nomad"), on duty; NCPD officers on duty for the searches |
| Who pays | The fence, or a player who buys a crate |
| Who is paid | The nomad who took the run, and the `nomade` society (the camp's cut) |
| What is moved | Crates of smuggled goods, carried by hand and driven in a truck bed |
| Runs on | Server and client (the client draws the map pins and the GPS route) |

## How a run plays

### The nomad

You need the `nomade` job and must be on duty: type `/service` to clock in.

1. **Take a run.** At the Aldecaldos contracts board, the card offers one run per route:
   **E** *Run to the Afterlife street, 3 crates*, **F** *Run to Lizzie's, Kabuki, 2 crates*. A
   4-second bar, *Signing the manifest*, plays while you sign. The camp's stash supplies the goods:
   when it is empty the run is refused before the bar. The crates appear at the loading points
   north of the board, and chat confirms the run:

   ```text
   Run signed: 3 crates of smuggled goods for Afterlife street, Watson, 25 minutes. Load them in a
   truck you hold a key for (the bay is south-east of the board) and drive. The pay is 600 eddies
   per crate, the camp keeps 20%.
   ```

   A pin marks the drop on the map, and each NCPD checkpoint gets a pin.
2. **Carry the crates.** Press **E** on **Pick up nomad crate**. A crate needs both hands: put your
   weapon away first. While you carry it you walk: you cannot sprint or jump, and a click does not
   draw your fists. **G** puts the crate down in front of you. Drawing a weapon, getting into a
   vehicle, dying or disconnecting drops it at your feet.
3. **Load the truck.** Park a truck you may use in the convoy truck bay, 12 m south-east of the
   board, and stand behind its bed with a crate: **E** *Load into the truck*. The prompt follows the
   truck parked in the bay, one metre past the bed; with no truck in the bay it stays at the bay.
   `/nomad load` loads the crate into any truck you may use within 6 m. The truck must be one you
   own, hold a key for, or that belongs to your society, and it must stand still. The crate then
   rides in the bed for everyone to see. When the last crate is in, the GPS route to the drop
   starts:

   ```text
   Crate 3/3 loaded on NC-H5W9. Everything is in. Drive to Afterlife street, Watson: the GPS route
   is on your map. Mind the NCPD checkpoints.
   ```

4. **Drive past the checkpoints.** The run has a deadline: 25 minutes on both routes. Two NCPD
   checkpoints sit on the way into the city. Each one decides once per run whether to search: the
   answer depends on the run and the checkpoint, so the same run always meets the same answer at
   the same checkpoint. Waved through, you read *NCPD checkpoint, Badlands highway: the cops wave you
   through.* Searched, every crate of the run in that truck is emptied into the NCPD evidence stash,
   the driver pays a fine, gets an NCPD wanted level and a criminal record, and the run is over.
   With the default chances, a run is searched at one checkpoint or the other about one time in two.
5. **Deliver.** At the drop, park at the unload bay and stand behind the bed: **E** *Unload a
   crate* (a 1.5-second bar), or `/nomad unload` next to the truck. The crate comes out of the bed
   into your hands. Walk it to the fence and press **E** *Hand over to Rook* (on the Kabuki route,
   *Hand over to Mama Tsu*). The fence pays in one operation:

   ```text
   Rook takes crate 1: 600 eddies, 480 eddies to the run's nomad, 120 eddies to the camp.
   ```

   When the last crate is handed over, you read `Run complete: 3 crate(s) delivered.`
6. **Or sell to a player.** Put the crate down next to you (**G**) and type
   `/nomad sell <playerId> <price>`, with the buyer within 3 m. The buyer sees an offer card,
   *Ada Kovac: a crate of smuggled goods for 500 eddies*, and answers **Y** to take it and pay or
   **N** to decline, within 20 seconds. Both keys can be rebound under Pause > Settings > Key
   bindings. The goods go into the buyer's pockets and the price is split like a delivery.

Any on-duty nomad of the crew can carry, load, unload and deliver your crates: the pay still goes
to the nomad who took the run. `/nomad status` shows where your crates are:

```text
Run to Afterlife street, Watson: 2 of 3 crate(s) still carry goods.
Time left: 14 min.
Crates: truck NC-H5W9, truck NC-H5W9, delivered.
Delivered 1, sold 0, seized 0, returned 0.
```

### The NCPD officer

You need the `ncpd` job and must be on duty.

1. **Ask to search.** Stand within 6 m of a truck and type `/nomad search`. With a warrant on the
   plate (an `rp_garage` wanted flag or a police grant), the search starts at once. Otherwise the
   driver, or the nomad whose run rides in the truck, must consent, on foot within 5 m. They read
   *NCPD: Ada Kovac asks to search the truck NC-H5W9. Y to let them search, N to refuse.* and see
   the offer card *NCPD Ada Kovac: search your truck NC-H5W9*. While the driver is still at the
   wheel, the officer reads "Have the driver step out of the truck first."
2. **Search.** After a **Y**, an 8-second bar, *Searching*, runs while you examine the bed. **X**
   stops it and nothing is seized. When it ends, the goods of every camp crate in the bed go to the
   evidence stash in one operation, and the nomad gets a criminal record:

   ```text
   Contraband found: 3 crate(s) seized into evidence.
   ```

   A truck with none of the camp's crates is reported clean: "Clean: nothing of the camp's in
   there."
3. **Crates on the ground.** A camp crate left on the ground within 3 m can be searched without
   consent.

The officer's search takes no fine by default: fine the nomad with `rp_ncpd`'s `/amende`.

### What everyone nearby sees

The nomad signing the manifest on a phone, the crates carried against the chest, the crates
stacked in the truck bed, the fence standing at the drop, and the officer examining the truck. The
camp is dressed with a table under the board and loaded pallets, because the game's own Aldecaldos
camp does not appear in the multiplayer world. The server plays every posture and places every prop,
so every player sees the same scene.

| Command | What it does |
|---|---|
| `/nomad` | The usage line. |
| `/nomad status` | Your run: crates, time left, what was delivered, sold, seized or returned. |
| `/nomad load` | Load the crate you carry into a truck you may use within 6 m. |
| `/nomad unload` | Take the top crate out of a truck you may use within 6 m. |
| `/nomad sell <playerId> <price>` | Offer the crate on the ground next to you to a player within 3 m. |
| `/nomad search` | NCPD: search the nearest truck, or a camp crate on the ground. |
| `/nomad camp` | Where the camp is, from where you stand. |

## Money, crates and what can go wrong

Every move of goods and money is one `open77_transactions` operation, saved with the crate it
concerns. A delivery, a sale, a search and a fine each run once: a retried payment returns its
first receipt instead of paying again.

| What happens | Money | Goods |
|---|---|---|
| A run is signed | Nothing is paid | 4 units per crate leave the camp's stash for the crates |
| A crew member hands a crate of a live run to the route's fence | The fence pays the crate's price (600 on the Afterlife route, 550 on the Kabuki route): 20% to the `nomade` society, the rest to the cash of the nomad who took the run | The goods go to the fence and are gone |
| A crate of a failed or late run, a stolen crate, or a crate handed to the wrong route's fence | The fence pays half the price, all of it to the seller; the camp gets nothing and no delivery is counted | The goods go to the fence |
| A player buys a crate | The buyer pays the agreed price in cash: on a live run sold by the crew, 20% to the society and the rest to the run's nomad; otherwise all to the seller | The goods go into the buyer's pockets |
| A checkpoint searches the truck | The driver pays a 1,500-eddie fine, cash then bank, to the `ncpd` society | Every crate of that run in the truck is emptied into the NCPD evidence stash |
| An officer searches | No fine by default | The camp's crates in the bed, or the crate on the ground, are emptied into evidence |
| A crate is returned to the camp's stash | Nothing is paid | The goods go back into the stash |
| A crate lies on the ground two hours after its run ended | Nothing is paid | The goods go back into the stash |

The fence creates the money it pays, within the hourly limit `rp_economy` sets for this resource,
and the goods it receives are destroyed. A price is for a full crate: a crate missing goods pays
in proportion. The camp's stash is refilled by a supplier: every 10 minutes, 24 units while it
holds fewer than 24. An unpaid checkpoint fine becomes an `rp_ncpd` warrant.

A run ends early, and the nomad is told why, when:

| Cause | The nomad reads |
|---|---|
| The deadline passes | "Too late: the run is off. Bring the crates back to the camp's stash; the fence pays hot prices only now." |
| Someone outside the crew lifts one of the crates | "Someone else is carrying one of your crates: the run is off." |
| The truck is wrecked | "The truck is wrecked: the run is off." |
| The truck is impounded | "The truck was impounded: the run is off." |
| The truck leaves the world for another reason | "The truck is gone: the run is off." |

A run that is off keeps its crates and their goods. The map pin and route turn back to the camp,
where **E** *Return to the stash* puts the goods back: `Crate back in the stash: 4 smuggled goods
returned. Nothing paid.` A searched crate stays in the bed, empty, until it is unloaded: then it is
thrown away. Storing the truck in a garage keeps its crates in the bed.

### After a disconnect or a restart

- **Disconnect while carrying.** The crate drops where you stood and stays there. The run goes on,
  and its deadline keeps running; the pins come back when you return.
- **Restart of `rp_nomade`.** Crates on the ground and in beds are rebuilt where they were. A crate
  in a player's hands is dropped at their feet and found on the ground afterwards.
- **Server restart.** Every crate comes back on the ground or in its bed. A crate that was being
  carried is back at the spot where it was last put down.
- **The run's tally**, what was delivered, sold, seized or returned, is kept in the resource's
  key-value store and survives restarts.
- **Offers.** A sale or a search consent waiting for an answer is dropped on a disconnect or a
  restart; nothing was paid.
- **A payment cut short.** A delivery or a sale writes its terms into the crate before paying.
  After a crash, the sale is either found paid and the crate retired, or tried again on the same
  terms. Nothing is paid twice.

## Routes and checkpoints

| Route | Crates | Goods per crate | Price per crate | Time | Drop | Fence |
|---|---|---|---|---|---|---|
| `afterlife` | 3 | 4 | 600 | 25 min | The street outside the Afterlife's ramp, Watson: the truck in the lane against the east curb | Rook, on the sidewalk |
| `kabuki` | 2 | 4 | 550 | 25 min | The street outside Lizzie's Bar, Kabuki | Mama Tsu |

| Checkpoint | Where | Search chance |
|---|---|---|
| `badlands_toll`, "NCPD checkpoint, Badlands highway" | Where the Badlands end on the way from the camp | 25% |
| `watson_ramp`, "NCPD checkpoint, Watson entry" | Where the way enters Watson | 35% |

Smuggled goods weigh 2.5 kg a unit and are illegal: `rp_ncpd`'s `/fouille` names them in a
player's pockets.

## Set up the runs

### Requirements

- A [MySQL or MariaDB database](database.md) for `open77_transactions`.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_containers`,
  `open77_player_interactions` and `open77_notifications`, with the libraries `open77_actions`
  depends on (`open77_props`, `open77_animations`, `open77_interactions`) and `open77_uikit`.
- The RP pack resources `rp_jobs`, `rp_inventory`, `rp_economy`, `rp_garage` and `rp_cargo`.
  `rp_ncpd` is optional: it keeps the criminal records and the warrant for an unpaid fine.
  `rp_identity` is optional: offer cards then show character names.
- A truck with a bed layout in `rp_cargo`. The Thorton Mackinaw's bed is measured (4 slots, 2
  crates high); the other shipped layouts are starting values.

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first:

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_transactions", "open77_props", "open77_animations", "open77_interactions",
    "open77_uikit", "open77_notifications", "open77_player_interactions",
    "open77_actions", "open77_containers",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_garage", "rp_cargo", "rp_ncpd", "rp_identity",
    "rp_nomade"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### Let the camp write and the fence pay

Two `open77_transactions` settings decide which resources may change which accounts and who may
create value ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set them in
the server console:

```text
tunable.set open77_transactions writers rp_nomade:world+stash+char, rp_cargo:veh/cargo, rp_economy:cash+bank+soc, rp_inventory, open77_containers:world, <your other writers>
tunable.set open77_transactions mint1 rp_nomade sys:nomad nomad_crate 500; rp_nomade sys:nomad.supplier nomad_contraband 2000; rp_economy sys:* money 2000000
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses a
  list, add these entries to it: the camp writes its crates, its stash, the evidence stash and the
  buyer's pockets; `rp_cargo` writes the truck beds; `rp_economy` the wallets and societies;
  `open77_containers` opens the crates. Keep your other jobs' entries. Without `stash`, the camp
  does not start: the log repeats `still waiting for the camp's stashes`.
- **mint rules.** One rule lets the camp create a token for each crate, one lets the supplier
  refill the stash, and one lets `rp_economy` create the money the fence pays. Use any free `mint1`
  to `mint6`, or append the rules to an existing one with `;`, and size the caps to your server.
  If your server already has an `rp_economy` money rule, keep it.

`rp_nomade` is already on `rp_economy`'s own money list (`EconomyConfig.mint.callers`, 100,000
eddies an hour): over that, the fence answers "The fence is out of cash for this hour."

`transactions mints` in the server console lists every mint rule with this hour's use.

### Start the runs

```text
ensure open77_transactions
ensure open77_actions
ensure open77_containers
ensure rp_cargo
ensure rp_nomade
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
    "ensure rp_nomade"
  ]
}
```

The server log then shows:

```text
[rp_nomade] coordinator ready (store=sql)
[rp_nomade] items defined through rp_inventory: 2
[rp_nomade] crates rebuilt: 0 (ground 0, in a bed 0, empty 0, sold 0, orphans closed 0); 0 run(s) going
[rp_nomade] ready: 2 route(s), 2 checkpoint(s), board, truck bay, stash (job nomade)
[rp_nomade] camp supply: +24 goods (stash had 0)
```

The run tallies live in the resource's key-value store, in the `data` folder inside the resource.
When you update `rp_nomade`, keep that folder.

### Staff the camp

The `nomade` job ships with `rp_jobs` and is a civil job: players join it at the employment agency
with `/agence`, then clock in with `/service`. The `ncpd` job is not civil: a boss hires officers,
or an admin gives the job with `setjob <playerId> ncpd <grade>` in the server console. Nomads need
a truck: their own, one they hold a key for, or one owned by the `nomade` society.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `nomad.status` | The stash, the runs, the crates by state and the counters |
| `nomad.stock <count>` | Put goods into the camp's stash, under the supplier's mint rule |
| `nomad.op.setup <playerId> [nomade\|ncpd]` | Give the job at grade 0 and put the player on duty |
| `nomad.op.truck <playerId> <plate>` | Bring that player's owned truck next to them |
| `nomad.op.take <playerId> [route]` | Take a run for the player, as the board does |
| `nomad.op.pickup <playerId>` | Lift the nearest camp crate within 3 m |
| `nomad.op.load <playerId>`, `nomad.op.unload <playerId>` | Load the carried crate into the nearest truck, or take the top crate out |
| `nomad.op.deliver <playerId> [route]` | Hand the carried crate to that route's fence |
| `nomad.op.checkpoint <playerId> <checkpoint> [search\|pass]` | The player's truck enters that checkpoint now; without the last word, the run's own answer decides |
| `nomad.op.expire <playerId>` | The player's run is past its deadline now, until the next restart |
| `nomad.op.search <playerId>`, `nomad.op.sell <seller> <buyer> <price>` | `/nomad search` or `/nomad sell` for that player |

The `nomad.op.*` commands drive the same path as the prompts, to test a route without driving it.
To let an admin use them in game, add the permission to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.nomad.*"
]
```

The player commands (`/nomad` and its words) need no ACL: the camp checks the job and duty itself.

## Configuration

Everything is in the resource's `server/config.lua` (`NomadConfig`). Prices are in eddies,
durations in milliseconds and positions in metres. After an edit, run `restart rp_nomade`.

| Key | Default | Meaning |
|---|---|---|
| `job`, `society`, `policeJob` | `nomade`, `nomade`, `ncpd` | The job that runs, the society that takes the camp's cut, the job that searches |
| `routes` | `afterlife`, `kabuki` | Per route: `crates`, `goodsPerCrate`, `price` per crate, `timeLimitMs`, the drop's `unloadBay` and `fence`. Up to four routes on the board |
| `campCut` | `0.20` | The camp's share of a live sale |
| `hotRatio` | `0.5` | What the fence pays for hot goods; `0` makes the fence refuse them |
| `maxRunsPerNomad`, `maxOpenCrates` | `1`, `64` | Runs per nomad, and crates out on the whole server |
| `checkpoints` | 2 | Per checkpoint: a zone (a cylinder, `radius` 120 m) and `searchChance` in percent |
| `search.fine`, `wanted`, `unpaidWarrant` | `1500`, `2`, `1` | The checkpoint fine, the NCPD wanted level, the `rp_ncpd` warrant level when the fine cannot be paid |
| `officer.reachM`, `crateReachM` | `6.0`, `3.0` | How close the officer stands to a truck, or to a crate |
| `officer.durationMs`, `consentDistance` | `8000`, `5.0` | The search bar, and how close the consenting player must stand |
| `officer.fine` | `0` | A fine taken with every officer search; `0` leaves fines to `/amende` |
| `restock` | every 10 min, 24 below 24 | The supplier; `amount = 0` leaves the stash to `nomad.stock` |
| `camp.board`, `loadingPoints`, `truckBay`, `returnBay` | Aldecaldos camp | The board, the four loading points, the truck bay, the stash |
| `camp.decor` | a table, two pallets | Props dressing the camp; `{}` for none |
| `bayPrompt.followTruck`, `behindBedM` | `true`, `1.0` | The load and unload prompts follow the parked truck, this far behind the bed |
| `crate.model`, `bedModel` | `crate.ammo_box` | The crate carried, and the one drawn in the bed |
| `crate.pickupBy` | `anyone` | `crew` lets only on-duty nomads lift the crates, so they cannot be stolen |
| `playerSale.minPrice`, `maxPrice` | `100`, `5000` | The price range of a sale to a player |
| `navigation.gpsFrom` | `loaded` | The GPS route starts when every crate is loaded; `accepted` starts it with the run |
| `abandonMs` | 2 hours | How long a crate may lie on the ground after its run ended |

### Change the pay

To pay more for a longer run and give the camp a bigger cut:

```lua
-- server/config.lua
C.campCut = 0.25      -- the camp keeps 25% of a live sale
C.hotRatio = 0.0      -- fences refuse hot goods

-- in C.routes, the Afterlife route
{
    id = "afterlife", label = "Run to the Afterlife street",
    description = "Smuggled goods for a fence on the Afterlife street, Watson.",
    crates = 3, goodsPerCrate = 4, price = 750, timeLimitMs = 30 * 60 * 1000,
    destination = {
        -- ...unchanged...
    },
},
```

Raise the cap of the `rp_economy` money rule if a busier camp pays out more in an hour.

### Move a checkpoint onto the road

The checkpoint centres are placed on the straight line from the camp to Watson, not on a road.
Drive the GPS route, stop where the road really crosses into the city, type `/pos` in the truck and
paste the position:

```lua
-- server/config.lua, in C.checkpoints
{
    id = "watson_ramp", label = "NCPD checkpoint, Watson entry",
    zone = { shape = "cylinder", position = { x = -500.0, y = 1700.0, z = 40.0 },   -- from /pos
             radius = 120.0, maxHeight = 200.0 },
    searchChance = 20,                                                               -- percent
    measured = true,
},
```

Keep the zone wide: the camp checks the truck's position once a second, and a narrow zone can be
crossed between two checks.

### Draw the crates in the bed

`rp_cargo` measures each bed slot with a reference box, `crate.small`. A smaller box rests lower and
stacks lower, so `rp_cargo/shared/config.lua` gives it a seat and a stack height:

```lua
-- rp_cargo/shared/config.lua
Config.stackHeights = {
    ["crate.ammo_box"] = 0.32,   -- one ammo box takes 0.32 m in a stack
}
Config.seats = {
    ["crate.ammo_box"] = -0.40,  -- it rests 0.40 m below a crate.small on the same floor
}
```

To draw another model in the beds, set `C.crate.bedModel` in `rp_nomade` and, if it does not sit
like `crate.small`, give it an entry in both tables. Run `restart rp_cargo` after an edit to its
configuration.

## For resource authors

The camp publishes a host-wide event after every completed step, and exposes read-only exports:

```lua
-- server, after every committed step
AddEventHandler("rp:job:completed", function(ev)
    -- ev.job == "nomad"; ev.kind is "pickup", "checkpoint_passed", "confiscated" or "deliver"
    -- ev.playerId: the run's nomad; ev.ref: the operation id, the same on a retry
    -- deliver:     ev.data = { run, route, crate, of, pay, cut, buyer = "fence" | "player", complete }
    -- confiscated: ev.data = { run, route, crates, by = "checkpoint" | "officer", checkpoint, officer }
end)

exports.rp_nomade:activeRun(playerId)  -- { run, route, crates, deadline, failed, left, where, ... } or nil
exports.rp_nomade:hasRun(playerId)     -- boolean: a live run
```

`ref` stays the same when a step is retried, so a listener counts each step once. A sale of hot
goods fires nothing. `activeContract` and `hasContract` remain for resources written for
`rp_nomade` 1.x.

## When something is refused

The camp explains every refusal in words, in chat and as a toast. The ones an operator can fix:

| The player reads | Fix |
|---|---|
| "The camp is not configured for this (server ledger rules). Tell an admin." | Add the camp's [writers and mint rules](#let-the-camp-write-and-the-fence-pay). |
| "The camp is not configured to pay for this. Tell an admin." | A mint rule is missing. |
| "The camp hit its hourly limit. Try again later." | A mint rule's hourly cap is used up: wait, or raise it. |
| "The fence is out of cash for this hour." | `rp_economy`'s hourly money limit for `rp_nomade` is used up. |
| "The camp's ledger is not ready. Try again in a moment." | Check `open77_transactions`, `open77_containers` and the database. |
| "The camp has nothing to move right now. Come back after the next supply drop." | The stash is empty: wait for the supplier, or `nomad.stock`. |
| "Too many crates are out already. Bring some home first." | `maxOpenCrates` is reached. |
| "That vehicle has no bed the camp knows." | Add the vehicle to `rp_cargo`'s `data/layouts.json`. |
| "That vehicle has no plate on file: use a registered truck." | The truck must be registered in `rp_garage`. |
| "The fence does not touch hot goods." | `hotRatio` is `0`. |

The ones players fix themselves:

| The player reads | Why |
|---|---|
| "Clock in first (/service)." | Off duty. |
| "Nomad work only, choom. Sign up at the agency." | No job: join at `/agence`. |
| "You already have a run going. /nomad status." | One run at a time. |
| "No truck you hold a key for is parked here." | No usable truck in the bay or within 6 m. |
| "You hold no key for that truck." | Not your truck. |
| "The bed is full." | The bed's slots are taken. |
| "Stop the truck first." | The truck is moving. |
| "Get closer." | Too far from the truck, the crate or the fence. |
| "Put your weapon away first: you need both hands for the crate." | A weapon is drawn. |
| "Only the crew lifts these crates." | `pickupBy` is `crew` and you are not an on-duty nomad. |
| "Put the crate down next to you first, then make the offer." | A sale needs the crate on the ground within 3 m. |
| "Name a price between the camp's limits." | The price is outside 100 to 5,000. |
| "Only an NCPD officer on duty can search a truck." | `/nomad search` is for officers. |
| "No warrant on that plate: the driver or the run's nomad has to consent, on foot, next to you." | Nobody who may consent is within 5 m. |
| "They refused the search." | The consenting player pressed **N**. |

## Limits

- **One run per nomad**, and at most 64 camp crates out on the server.
- **Unwalked points.** The Afterlife drop and its fence were placed by walking them in game; the
  camp's points and the Kabuki drop at Lizzie's Bar are marked `measured = false`. Check them on
  your server.
- **Checkpoints are not on roads.** Their centres sit on a straight line from the camp to Watson:
  [move them](#move-a-checkpoint-onto-the-road) onto the roads your players drive. The truck's
  position is read once a second.
- **The NCPD wanted level** after a checkpoint search is the driver's own game: the police it sends
  are local to that player.
- **The officer's search** knows only the camp's crates: a truck carrying none is reported clean.
- **Trucks.** Any `rp_garage` vehicle with an `rp_cargo` bed layout works, but only the Mackinaw's
  bed is measured. `rp_garage` has no way to take a society's truck out of storage: nomads bring
  their own, or one they hold a key for.
- **Crates on one spot.** Crates put down on exactly the same spot share one card; set them down a
  step apart.
- **Carrying.** The walk pace and the blocked sprint, jump and fists are applied by the player's
  client. A client too old to block melee or sprinting carries the crate without those two limits.
- **Restarting `rp_cargo`** logs a burst of `task quota exceeded` errors; the beds are drawn again
  correctly.
- **No ambush.** The road's only risk is the NCPD.
