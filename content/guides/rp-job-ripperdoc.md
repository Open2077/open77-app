# Ripperdoc: Viktor's clinic

A ripperdoc quotes a patient, the patient accepts on an offer card, sits in Vik's operating chair
and gets real platform cyberware installed. The patient pays once, after the chrome is in. The
clinic's implants come out of a stock the ripperdoc keeps filled at a chrome dealer, or by buying
boxes from other players.

The job is the [`rp_ripperdoc`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_ripperdoc)
resource, version 2.0, from the Open2077/open77-resources repository. It is built on the
[world-interaction libraries](world-interaction.md) and is experimental like them.

| | |
|---|---|
| Where | Viktor Vektor's clinic, under the Misty's Esoterica alley in Little China (Watson). The chrome dealer is in Kabuki Market. |
| Who works | Players with the `rp_jobs` job `ripper` (label "Ripperdoc"), on duty |
| Who pays | The patient, from cash first, then bank |
| Who is paid | The `ripper` society |
| What is installed | Gorilla Arms, Reinforced Tendons, Cyberdeck, Self-ICE and Active Purge, in seven grades |
| Runs on | Server and client |

## How a procedure plays

### The patient

1. **Find a ripperdoc.** Type `/ripper` to list your implants and the ripperdocs on duty, then go
   to Vik's clinic.
2. **Take the chair.** Press **E** on **Sit in the operating chair** at the white reclining chair,
   or type `/ripper lie` next to it. Walk away to get up. You can also wait standing and sit down
   after the quote.
3. **Read the quote.** Stand near the ripperdoc and ask for a quote. It arrives in chat and as a
   toast, with the implant, the grade, the price, the time under the knife and the cyberpsychosis
   risk:

   ```text
   QUOTE from Ada Kovac: install Gorilla Arms (Street) for 1500 eddies, 15 s under the knife.
   Risk: cyberpsychosis past 4 implants (you carry 0). Nothing is paid until the chrome is in.
   Answer on the offer card within 30 s.
   ```

   An offer card opens in the middle of the screen at the same time.
4. **Answer.** Press **Y** to accept or **N** to decline, within 30 seconds. Both keys can be
   rebound under Pause > Settings > Key bindings; `/interaction accept` and `/interaction decline`
   in chat also work. If you were already in the chair, you are stood up to answer and seated
   again after accepting. Accepting pays nothing yet: the price and the implant are put on hold.
5. **Stay in the chair.** While the ripperdoc operates, a bar shows the time under the knife.
   Press **X** to stop it; nothing is charged. Getting off the chair also stops it.
6. **Done.** Chat and a toast confirm the new chrome, and `/implants` lists your implants as the
   platform reports them. A patient who now carries more than four implants gets a 60-second
   screen effect and a cyberpsychosis warning.

### The ripperdoc

You need the `ripper` job and must be on duty: type `/service` to clock in.

1. **Quote.** Inside the clinic, within 4 m of the patient, hold **ALT**, click the patient and pick
   **Quote** (or type `/ripper quote <playerId>`). The catalogue opens: one row per implant grade
   with its price, the clinic's stock and the time under the knife. An implant the patient already
   carries shows **Remove** at half its grade's price. Picking a row sends the quote.
   `/ripper quote <playerId> arms street` skips the menu.
2. **Wait for the answer.** When the patient accepts, the operating station beside the chair offers
   the procedure, for example **E Install Gorilla Arms (Street)**. Its card is drawn over the
   patient, in front of you.
3. **Operate.** Once the patient is in the chair, stand at the station and press **E** (or type
   `/ripper operate`). You kneel beside the patient and a bar runs on both screens, 12 to 22
   seconds depending on the implant. **X** stops it and nothing is charged. When the bar ends, the
   implant is installed and then the patient pays: the price goes to the `ripper` society and the
   implant box leaves the clinic's stock. Once the implant is going in, it cannot be stopped.
4. **Keep track.** `/ripper` shows your board: duty, the current procedure, the stock, the
   society's balance and the last 24 hours of procedures.

| Command | What it does |
|---|---|
| `/ripper` | Ripperdoc: the board. Anyone else: their implants and the ripperdocs on duty. |
| `/ripper quote <playerId> [implant] [grade]` | Send a quote; without an implant, open the catalogue. |
| `/ripper remove <playerId> <implant>` | Quote the removal of an installed implant. |
| `/ripper operate` | Start the accepted procedure, standing at the station. |
| `/ripper cancel` | Withdraw a quote, or stop a procedure before the implant goes in. Patients can use it too. |
| `/ripper restock [implant] [grade] [count]` | Order boxes at the chrome dealer. |
| `/ripper buy <playerId> <implant> [grade] [count]` | Buy implant boxes from a player in the clinic. |
| `/ripper stock` | The clinic's stock. |
| `/ripper lie` | Sit in the operating chair. |
| `/ripper help` | The usage line. |
| `/operer <playerId>` | Same as `/ripper quote <playerId>`. |
| `/implants` | Your installed implants. |

Implant names for the commands are `arms`, `legs`, `deck`, `ice` and `purge`. Grades are `street`
and `industrial` for arms, `training` and `athlete` for legs, and `street` for the other three.

### What everyone nearby sees

The patient sitting in the chair and the ripperdoc kneeling at work beside them. The server plays
both postures, so every player in the clinic sees the same scene.

## Money, implants and what can go wrong

Accepting a quote puts the price and one implant box on hold in a single operation. Nothing is
paid and nothing leaves the stock until the implant is installed. Only then is the hold paid, once.

| What happens | Money | Implant box |
|---|---|---|
| The implant is installed | The price is taken from the patient's cash, then bank, and paid to the `ripper` society | Leaves the clinic's stock |
| An implant is removed | Half the installed grade's price, paid the same way | Nothing returns to the stock |
| The patient presses **N** or does not answer within 30 s | Nothing is taken | Stays in stock |
| Either player presses **X** during the operation, or types `/ripper cancel` | Nothing is taken | Stays in stock |
| The patient walks more than 25 m from the chair, or gets off the chair during the operation | Nothing is taken | Stays in stock |
| The patient dies or disconnects | Nothing is taken | Stays in stock |
| The ripperdoc disconnects or clocks out | Nothing is taken | Stays in stock |
| The accepted quote waits more than 3 minutes for the operation | Nothing is taken | Stays in stock |
| The cyberware system refuses the implant or does not answer in time | Nothing is taken | Stays in stock |

When a procedure ends without the implant, both players are told why. There is never a refund to
make, because nothing was paid.

A procedure charges exactly once. A second press of **E** is refused, and a payment retried after a
database hiccup returns the first receipt instead of charging again.

### After a restart

Holds do not survive a restart, so the clinic keeps a small journal of open procedures:

- **The implant had not gone in.** The procedure is released at the next start and both players
  are told. Nothing was paid; the box is still in stock.
- **The implant was going in.** The clinic settles it from the patient's cyberware record when they
  are back: if the implant is installed, the price is charged once; if it is still not installed
  30 seconds after the start, the procedure is released. A wallet that cannot pay at that point is
  logged as unpaid, and the implant stays.

## Stocking the clinic

### The chrome dealer

At the chrome dealer in Kabuki Market, an on-duty ripperdoc presses **E** on **Buy chrome for the
clinic** to open the order menu, or types `/ripper restock arms industrial 2`.

- An order holds up to 5 boxes and takes a 6-second bar at the vendor's counter.
- The dealer charges 60% of the retail price, paid by the `ripper` society, or by the ripperdoc's
  cash when the society is short. One Gorilla Arms (Street) box costs 900 eddies.
- The boxes are delivered to the clinic's stash in the same operation. The stash holds 30 boxes.

The dealer creates the boxes within an hourly limit you set (the
[mint rule](#let-the-clinic-write-and-the-dealer-sell)), and the
money it is paid is burned. The clinic never creates money: the patient pays the society, and the
society pays the dealer.

### Buying from players

In the clinic, `/ripper buy <playerId> <implant> [grade] [count]` offers to buy up to 5 implant
boxes from a player within 3 m. The seller accepts the hand-over on the offer card; the boxes go
into the clinic's stash and the seller receives half the retail price per box, paid by the society,
or by the ripperdoc's cash when the society is short.

Implant boxes weigh 2 kg each. Carrying one is illegal unless the holder has the `ripper` job.

## Prices

| Implant | Grade | Price | Time | Dealer price | Buy-back |
|---|---|---|---|---|---|
| Gorilla Arms | Street | 1500 | 15 s | 900 | 750 |
| Gorilla Arms | Industrial | 3200 | 22 s | 1920 | 1600 |
| Reinforced Tendons | Training | 1200 | 12 s | 720 | 600 |
| Reinforced Tendons | Athlete | 2500 | 18 s | 1500 | 1250 |
| Cyberdeck | Street | 2000 | 20 s | 1200 | 1000 |
| Self-ICE | Street | 1800 | 14 s | 1080 | 900 |
| Active Purge | Street | 1600 | 14 s | 960 | 800 |

Prices are in eddies. A removal costs half the installed grade's price. A patient carries one
implant per slot: to change grade, remove the installed implant first.

## Set up the clinic

### Requirements

- A [MySQL or MariaDB database](database.md). The coordinator and the cyberware records need it.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_player_interactions`,
  `open77_cyberware`, `open77_uikit`, `open77_contextmenu` and `open77_notifications`, with the
  libraries `open77_actions` depends on (`open77_animations`, `open77_props`,
  `open77_interactions`).
- The RP pack resources `rp_jobs`, `rp_inventory` and `rp_economy`. `rp_zones` and `rp_identity`
  are optional.
- Optional: `open77_hacking` for the Cyberdeck, Self-ICE and Active Purge, which otherwise show as
  unavailable; `open77_seating` and `open77_furniture` for a seating-mode chair.
- Clients with the RP animation archive for the postures: `seatedsleep` or `seated` for the
  patient, `repair`, `examine` or `tablet2` for the ripperdoc
  ([animation catalogue](rp-animation-catalogue.md)).

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first:

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_animations", "open77_props", "open77_interactions",
    "open77_transactions", "open77_actions", "open77_player_interactions", "open77_cyberware",
    "open77_uikit", "open77_contextmenu", "open77_notifications",
    "open77_hacking",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_zones", "rp_identity",
    "rp_ripperdoc"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### Let the clinic write and the dealer sell

Two `open77_transactions` settings decide which resources may change which accounts and who may
create items ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set them
once in the server console:

```text
tunable.set open77_transactions writers rp_ripperdoc:cash+bank+soc+char+stash/stock, rp_economy:cash+bank+soc, rp_inventory, <your other writers>
tunable.set open77_transactions mint3 rp_ripperdoc sys:ripperdoc.supplier * 40
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add the three entries above to it: the clinic writes the patient's wallets, the society,
  the seller's pockets and its own stock stash. Keep your other jobs' entries.
- **mint rule.** Lets the clinic create up to 40 implant boxes an hour at the dealer. Use any free
  `mint1` to `mint6`, or append the rule to an existing one with `;`. Size the cap to your server.
  Without it, every order is refused with "The dealer cannot sell that (operator: mint rule
  missing)."

`transactions mints` in the server console lists every mint rule with this hour's use.

### Start the clinic

```text
ensure open77_transactions
ensure open77_actions
ensure rp_ripperdoc
```

These three declare `auto_start false`. To start them with the server, put the same lines in
`server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure rp_ripperdoc"
  ]
}
```

The server log then shows:

```text
[rp_ripperdoc] coordinator ready (store=sql)
[rp_ripperdoc] boxed implants defined through rp_inventory: 7
[rp_ripperdoc] catalogue arms defined (arms/gorilla_arms, 2 grade(s))
[rp_ripperdoc] history=sql table=rp_ripperdoc_operations
[rp_ripperdoc] ready: clinics viktor (placed chair), 3 targets, supplier kabuki_chrome, job ripper; recovery: 0 released, 0 to settle
```

Every finished procedure is also written as a row of the SQL table `rp_ripperdoc_operations`.

### Staff the clinic and fill the stock

The `ripper` job ships with `rp_jobs`; a boss or an admin hands it out. In the server console:

```text
setjob 12 ripper 3            # player 12 becomes the clinic's boss
ripper.seed viktor all 1      # one box of each implant into the clinic's stock
```

The boss then hires staff with `/embaucher <playerId> [grade]`, or by ALT+clicking a player and
picking **Hire into Ripperdoc**, and everyone clocks in with `/service`. For a quick test,
`ripper.setup <playerId>` gives a player the job and puts them on duty in one step.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `ripper.status` | Counters and the procedures in progress |
| `ripper.seed [clinic] [item or all] [count]` | Put boxes into a clinic's stock, under the dealer's mint rule |
| `ripper.setup <playerId>` | Give the `ripper` job and put the player on duty |
| `ripper.journal` | The open procedures a restart would settle |

To let an admin use them in game, add the permissions to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.ripper.*",
  "command.setjob"
]
```

The player commands (`/ripper`, `/operer`, `/implants`) need no ACL: the clinic checks the job and
duty itself.

## Configuration

Everything is in the resource's `shared/config.lua` (`RpRipperConfig`). Prices are in eddies,
durations in milliseconds and positions in metres. After an edit, run `restart rp_ripperdoc`
between procedures.

| Key | Default | Meaning |
|---|---|---|
| `job`, `society` | `ripper`, `ripper` | The `rp_jobs` job that may work here, and the society that is paid |
| `clinics.viktor.chair.mode` | `placed` | `placed`: the patient sits at the chair point. `seating`: a furniture seat through `open77_seating` (`chair.furniture`, optional `chair.spot`) |
| `clinics.viktor.chair.position`, `yaw` | `-1546.92, 1234.22, 11.6`, `145` | Vik's reclining chair; `z` is the floor and `yaw` the way the patient faces |
| `clinics.viktor.chair.arrivalRadius` | `1.0` | How close the body must arrive to the chair point |
| `clinics.viktor.chair.profiles` | `seatedsleep`, `seated` | The patient's posture: the first one the server knows is played |
| `clinics.viktor.chair.actionLabel` | `Sit in the operating chair` | The chair's prompt |
| `clinics.viktor.chair.lieMaxMs` | `300000` | A seated patient is stood up after this long |
| `clinics.viktor.station.position`, `yaw` | `-1546.40, 1233.74, 11.6`, `55` | Where the ripperdoc stands to operate, beside the patient and facing them |
| `clinics.viktor.zone`, `zoneRadius` | `viktor_clinic`, `12.0` | The `rp_zones` zone to work in; without `rp_zones`, the distance to the chair |
| `clinics.viktor.stockCapacityG` | `60000` | The stock's capacity in grams: 30 boxes |
| `supplier.position`, `yaw` | `-1172.45, 2024.30, 7.764`, `-60` | The chrome dealer's counter, Kabuki Market |
| `supplier.mode` | `mint` | `mint` sells boxes for money. `components` burns the parts listed in each grade's `components` instead; the shipped grades list none |
| `supplier.payFrom`, `priceFactor` | `society, cash`, `0.6` | Who pays an order, and the dealer's share of the retail price |
| `supplier.maxCount`, `durationMs` | `5`, `6000` | Boxes per order, and the order's bar |
| `quote.distance` | `4.0` | How close the ripperdoc must be to quote |
| `quote.inviteTimeoutMs` | `30000` | Time the patient has to answer |
| `quote.validMs` | `180000` | How long an accepted quote waits for the operation |
| `quote.leashM` | `25.0` | How far an accepted patient may walk from the chair |
| `operation.profiles` | `repair`, `examine`, `tablet2` | The ripperdoc's posture at the station: the first one the server knows is played |
| `operation.installTimeoutMs`, `holdTtlMs` | `20000`, `600000` | How long the cyberware system may take to answer, and the longest hold |
| `payFrom` | `cash, bank` | The patient's wallets, in order |
| `removalPriceFactor` | `0.5` | A removal's share of the grade's price |
| `buyback.ratio`, `maxCount`, `payFrom` | `0.5`, `5`, `society, cash` | Buying boxes from players |
| `cyberpsychosisThreshold` | `4` | More implants than this after an install shows the effect below; `0` shows it on the first |
| `cyberpsychosis` | `drugged`, strength `0.5`, 60 s | The screen effect |
| `catalogue` | 5 implants, 7 grades | Per grade: price, time under the knife, the boxed item and the platform's grade settings |
| `items` | 7 boxes | The implant boxes: label, weight, and the job allowed to carry them |

### Move the chair

To use another chair, record the new points in game, then edit the clinic:

1. Stand where the patient's body should sit. Type `/pos` to copy your position, and `/rot` for
   your yaw.
2. Paste them into `chair`, keeping `z` at floor level, with `yaw` facing the way the patient
   should look.
3. Move `station` next to the new seat, on a side free of furniture, facing the patient. About
   0.7 m from the seat lets the ripperdoc reach the patient's arm.
4. For a flat bed, put `lie` or `bedsidelie` first in `profiles`. Those postures float on a
   reclining chair, which is why the default uses `seatedsleep`.
5. Mark the points as walked (`measured = true`, and a `source` note), then `restart rp_ripperdoc`.

```lua
-- shared/config.lua, in C.clinics.viktor
chair = {
    mode = "placed",
    position = { x = -1546.92, y = 1234.22, z = 11.6 },   -- from /pos, z at floor level
    yaw = 145.0,                                         -- the way the patient faces
    arrivalRadius = 1.0,
    profiles = { "seatedsleep", "seated" },
    actionLabel = "Sit in the operating chair",
    -- ...the other chair fields unchanged...
    measured = true,
    source = "walked in game",
},
station = {
    position = { x = -1546.40, y = 1233.74, z = 11.6 },   -- beside the seat, facing the patient
    yaw = 55.0,
    label = "Operating station",
    measured = true,
    source = "walked in game",
},
```

A chair outside Vik's clinic also needs a zone: the ripperdoc must stand inside `zone` to quote and
operate. Point `zone` to an `rp_zones` zone around the new room.

## For resource authors

The clinic publishes a host-wide event after every completed step and exposes read-only exports:

```lua
-- server, after every committed step
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "ripperdoc"; e.kind is "operation" or "restock"
    -- operation: e.data = { action = "install" | "remove", implant, grade, price, patient, clinic, ... }
    -- restock:   e.data = { source = "supplier" | "player", item, count, cost, paidBy, clinic }
end)
AddEventHandler("rp_ripperdoc:operation", function(ripperId, patientId, action, implantKey, gradeId, price) end)

exports.rp_ripperdoc:isOnChair(playerId)     -- boolean
exports.rp_ripperdoc:implantCount(playerId)  -- integer, or nil and a reason
exports.rp_ripperdoc:catalogue()             -- the implants, their grades and availability
exports.rp_ripperdoc:procedure(playerId)     -- the player's procedure, or nil
```

For a smaller clinic written from scratch, see `open77_ripperdoc_example` in
[Cyberware](cyberware.md#optional-resources).

## When something is refused

The clinic explains every refusal in words. The ones an operator can fix:

| The player reads | Fix |
|---|---|
| "The dealer cannot sell that (operator: mint rule missing)." | Add the dealer's [mint rule](#let-the-clinic-write-and-the-dealer-sell). |
| "The dealer is out of chrome for this hour." | The hourly cap is used up: wait, or raise the cap. |
| "The clinic's accounts are not writable (operator: writers policy)." | Add the clinic to `writers`. |
| "The clinic is closed for now (its ledger is not ready)." | Check `open77_transactions` and the database. |
| "That implant is not available on this server right now." | For the hacking implants, start `open77_hacking`. |
| "Clock in first: /service." | The ripperdoc is off duty. |
| "Work inside the clinic." | The ripperdoc is outside the clinic's zone. |
| "The patient must sit in the operating chair first (E on the chair)." | The patient has to sit before the operation. |
| "The clinic has no box of that implant left: restock at the chrome dealer." | Restock, or `ripper.seed`. |

## Limits

- **One procedure per clinic at a time**, and one stock per clinic.
- **Prompts close together.** The default chair and station are less than a metre apart, and a card
  answers the nearest player. Move `station` if the wrong card shows.
- **Seating mode** needs a furniture id near the clinic (`chair.furniture`) and the seating prompt
  for it; until then, keep the chair `placed`.
- **Postures.** A server whose animation catalogue lacks a configured posture runs the action
  without it and logs that once at start.
- **Hacking implants** need `open77_hacking`.
- **No refunds.** A procedure that ends without the implant releases the hold. Nothing was paid, so
  nothing is refunded.
