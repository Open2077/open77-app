# Techie: the Kabuki west workshop

A techie buys salvage, strips it at a real workbench into components, assembles weapon mods and
cyberware components from them, and sells the result to a shop in Kabuki Market or to another
player. Every stage is a timed job at the bench: the parts it uses and the components it makes
change hands in one operation, or not at all.

The job is the [`rp_techie`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_techie)
resource, version 0.1.0, from the Open2077/open77-resources repository. It is built on the
[world-interaction libraries](world-interaction.md) and is experimental like them.

| | |
|---|---|
| Where | The Kabuki west workshop, on the upper floor west of Kabuki Market (Watson). Sparks, the parts dealer, stands by the workbench. The buyers are Wilson at the 2nd Amendment stall (East Row) and Dr. Osei at Med-Point (The Stalls). |
| Who works | Players with the `rp_jobs` job `techie` (label "Techie"), on duty |
| Who else plays | Anyone: a scrapper sells parts to an on-duty techie, a buyer takes mods or components from one |
| Who pays | The techie for parts (cash); a shop or a player for products |
| Who is paid | The techie, and 10% of every shop sale to the `techie` society |
| What is made | Three weapon mods and three cyberware components, through nine recipes in two stages |
| Runs on | Server |

## How the work plays

### The techie

You need the `techie` job and must be on duty. It is a civil job: join it at the employment
agency (`/agence`), then type `/service` to clock in.

1. **Get parts.** At Sparks' counter, a few steps from the workbench, the card offers
   **E** *Buy 3 Scrap metal (75 eddies)*, **F** *Buy 2 Copper wire (90 eddies)* and **R**
   *Buy 1 Data chip (220 eddies)*. A 2-second gesture, then the parts are in your pockets and the
   price has left your cash. You can also buy from a player standing next to you:
   `/techie buy <playerId> scrap_metal 3 66` sends them an offer for 3 Scrap metal at 66 eddies.
2. **Strip (stage 1).** At the **workbench**, **E** opens *Work at the bench*: every recipe of
   that bench, with what you are missing. **F**, **R** and **Y** start the bench's first three
   recipes directly. *Cut scrap into alloy plates* kneels you with a welding torch for 8 seconds and
   turns 3 Scrap metal into 2 Alloy plates. At the **electronics bench**, the wall panel at the end
   of the same scaffold, a standing drill turns 1 Data chip and 1 Copper wire into a Logic board.
   Stage 1 takes the parts from your pockets and leaves the components on the **workshop tray**,
   which both benches share.
3. **Assemble (stage 2).** Stage 2 takes the components from the tray and puts the product in
   your pockets: a suppressor, a magazine or a sight at the workbench (kneeling, with a drill), a
   servo actuator, a neural link chip or an optic lens array at the electronics bench (standing,
   with a tablet). Some recipes need a higher grade; see [Recipes](#recipes).
4. **Sell.** Next to Wilson, **E** *Sell to 2nd Amendment* sells every weapon mod in your pockets
   in one sale. Next to Dr. Osei, **E** *Sell to Med-Point* sells every cyberware component. To a
   player within 3 m: `/techie sell <playerId> <item> [count] [price]`.

While a stage runs, a bar shows its name, for example *Cutting scrap*, and **X** stops it. When the
bar ends, chat and a toast confirm the result:

```text
Cut scrap into alloy plates: 2 Alloy plate on the tray of Kabuki west workshop.
Assemble a suppressor kit: 1 Suppressor kit in your pockets.
Sold to 2nd Amendment: 1 Suppressor kit for 240 eddies (216 eddies to you, 24 eddies to the techie society).
```

A bench holds one techie at a time. The workshop's other bench stays free.

### Scrappers and buyers

Any player can trade with an on-duty techie. Parts (`scrap_metal`, `copper_wire`, `chip`) flow
towards the techie; products flow away from them.

- **Selling parts.** A scrapper standing within 3 m of the techie types
  `/techie sell <techieId> scrap_metal 3 66`, or accepts the techie's `/techie buy` offer.
- **Buying products.** The techie offers with `/techie sell <buyerId> tch_mod_suppressor 1 300`,
  or the buyer asks with `/techie buy <techieId> tch_mod_suppressor 1 300`.

The player who must answer sees an offer card naming the other player and the deal, and a line in
chat:

```text
Ada Kovac: 1 Suppressor kit for 300 eddies
Ada Kovac offers to sell you 1 Suppressor kit for 300 eddies. Y to take it and pay, N to decline.
```

When the techie is the buyer, the card reads *Ada Kovac: buys 4 Scrap metal from you for 80
eddies*. Press **Y** to accept or **N** to decline, within 20 seconds; `/interaction accept` and
`/interaction decline` in chat also work. On **Y** both players play the hand-over gesture, then
the goods and the cash change hands at once: *You bought 1 Suppressor kit for 300 eddies from Ada
Kovac.* A buyer pays from cash. Without a price, the trade uses the item's suggested price.

Declining, walking more than 5 m apart, leaving, or letting the invitation run out moves nothing.
The player who made the offer can withdraw it with `/techie cancel`.

### What everyone nearby sees

The techie kneeling with a torch, a screwdriver or a drill at the workbench, or standing with a
drill or a tablet at the electronics bench, and both players' gestures during a hand-over. The
server plays the postures, so every player in the workshop sees the same scene.

| Command | What it does |
|---|---|
| `/techie` | The usage line. |
| `/techie recipes` | Every recipe: its key, stage, bench, grade, inputs and outputs. |
| `/techie craft <recipe>` | Start a recipe at the nearest bench of its kind, within 2.5 m. |
| `/techie tray` | What waits on the tray of the workshop you stand in. |
| `/techie prices` | Shop and suggested prices per unit. |
| `/techie sell <playerId> <item> [count] [price]` | Offer to sell items to a player within 3 m. |
| `/techie buy <playerId> <item> [count] [price]` | Offer to buy items from a player within 3 m. |
| `/techie cancel` | Withdraw your pending offer. |

Items for the commands are `scrap_metal`, `copper_wire` and `chip` for parts;
`tch_mod_suppressor`, `tch_mod_magazine`, `tch_mod_sight`, `tch_cw_servo`, `tch_cw_neural_link`
and `tch_cw_optic` for products. A trade carries up to 20 units, at up to 5000 eddies per unit.

## Recipes

| Recipe | Bench | Grade | Takes | Makes | Time |
|---|---|---|---|---|---|
| `strip_plate`: Cut scrap into alloy plates | Workbench (**F**) | 0 | 3 Scrap metal from your pockets | 2 Alloy plate on the tray | 8 s |
| `strip_wire`: Strip copper into a wiring loom | Workbench (**R**) | 0 | 2 Copper wire from your pockets | 1 Wiring loom on the tray | 7 s |
| `assemble_suppressor`: Assemble a suppressor kit | Workbench (**Y**) | 0 | 2 Alloy plate + 1 Wiring loom from the tray | 1 Suppressor kit | 12 s |
| `assemble_magazine`: Assemble an extended magazine | Workbench | 0 | 3 Alloy plate from the tray | 1 Extended magazine kit | 10 s |
| `assemble_sight`: Assemble a reflex sight | Workbench | 1 | 1 Alloy plate + 1 Logic board from the tray | 1 Reflex sight kit | 12 s |
| `strip_chip`: Desolder a chip onto a logic board | Electronics (**F**) | 0 | 1 Data chip + 1 Copper wire from your pockets | 1 Logic board on the tray | 9 s |
| `assemble_servo`: Build a servo actuator | Electronics (**R**) | 0 | 2 Alloy plate + 2 Wiring loom from the tray | 1 Servo actuator | 14 s |
| `assemble_neural`: Flash a neural link chip | Electronics (**Y**) | 1 | 2 Logic board + 1 Wiring loom from the tray | 1 Neural link chip | 15 s |
| `assemble_optic`: Align an optic lens array | Electronics | 2 | 1 Logic board + 1 Alloy plate + 1 Wiring loom from the tray | 1 Optic lens array | 15 s |

Grades are the `rp_jobs` grades: 0 recruit, 1 employee, 2 senior, 3 boss. A recipe without a key
in the table is in the bench menu (**E**) and in `/techie craft`.

### Prices

| Product | Bought by | Shop price | Suggested player price |
|---|---|---|---|
| Suppressor kit | Wilson, 2nd Amendment | 240 | 320 |
| Extended magazine kit | Wilson, 2nd Amendment | 170 | 230 |
| Reflex sight kit | Wilson, 2nd Amendment | 420 | 560 |
| Servo actuator | Dr. Osei, Med-Point | 340 | 450 |
| Neural link chip | Dr. Osei, Med-Point | 800 | 1050 |
| Optic lens array | Dr. Osei, Med-Point | 520 | 700 |

| Part | Sparks' lot | Suggested player price per unit |
|---|---|---|
| Scrap metal | 3 for 75 | 22 |
| Copper wire | 2 for 90 | 42 |
| Data chip | 1 for 220 | 180 |

Prices are in eddies. Players may agree any price up to the cap; the suggested price applies when a
trade names none.

## Money, items and what can go wrong

Every step goes through [`open77_transactions`](transactions.md) as one operation:

| Step | Items | Money |
|---|---|---|
| A lot from Sparks | The parts are created into your pockets, within the dealer's hourly mint rule | The price leaves your cash and is destroyed |
| A strip or assembly stage | The inputs are destroyed and the outputs created, together, within the workshop's hourly mint rules | None |
| A shop sale | The products leave your pockets | `rp_economy` creates the price and splits it: 90% to your cash, 10% to the `techie` society |
| A trade between players | The goods move from the seller's pockets to the buyer's | The price moves from the buyer's cash to the seller's; no money is created |

The stage's inputs and the room for its outputs are put on hold when the bar starts, and the
operation is written only when the bar ends. A stage that stops early uses nothing:

| What happens | Result |
|---|---|
| The bar ends | Inputs used, outputs created, once |
| **X** during the bar, death, walking off, or clocking out | Nothing is used or created |
| A job, grade or duty change during the bar | Nothing is done: "Your shift changed in the middle of that: nothing was done." |
| `rp_techie` restarts during a stage | The stage is cancelled; the tray and the pockets are unchanged |
| An offer is declined, times out, or the other player leaves | Nothing is paid, nothing moves |
| A payment is retried after a database hiccup | The first receipt is returned; nothing is paid twice |

A shop sale keeps its quote for the whole action, so a retried sale asks for exactly the same
items and price. A trade is written under an id chosen when the offer is made, so it lands once.

### After a disconnect or a restart

- **Pockets** are the character's account: parts and products survive a disconnect, a client crash
  and a server restart.
- **The tray** is a stash of the workshop (`stash:tch.kabuki_west:tray`): components waiting between
  the two stages survive a restart, and any on-duty techie can assemble from them.
- **Duty** is cleared on disconnect by `rp_jobs`: clock in again with `/service`.
- **Open offers** are forgotten on a restart. Nothing was paid.

## Set up the workshop

### Requirements

- A [MySQL or MariaDB database](database.md) for `open77_transactions`.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_player_interactions` and
  `open77_notifications`, with the libraries `open77_actions` depends on (`open77_animations`,
  `open77_props`, `open77_interactions`). `open77_uikit` is optional: without it, **E** at a bench
  lists the recipes in chat instead of a menu.
- The RP pack resources `rp_jobs`, `rp_inventory` and `rp_economy`. `rp_salvage` is optional: it
  owns Scrap metal and Copper wire, and `rp_techie` defines them itself when it does not run.
  `rp_identity` is optional; with it, players are named by their character.
- Clients with the RP animation archive: the screwdriver (`repair`) and tablet (`tablet2`)
  postures come from it, the welding and drilling postures from the game
  ([animation catalogue](rp-animation-catalogue.md)).

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first, and `rp_salvage` before `rp_techie` when you run it:

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_transactions", "open77_animations", "open77_props", "open77_interactions",
    "open77_uikit", "open77_actions", "open77_player_interactions", "open77_notifications",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_identity",   // rp_identity is optional
    "rp_salvage",            // optional
    "rp_techie"
  ]
}
```

In the same file, make pockets accounts of `open77_transactions`:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

| Convar | Default | Meaning |
|---|---|---|
| `rp_inventory_backend` | | Must be `transactions` |
| `rp_techie_job` | `techie` | The `rp_jobs` job that may work here |
| `rp_techie_society` | `techie` | The society that receives the shop share |
| `rp_techie_shop_payment` | `economy` | `economy`: shop sales through `rp_economy`. `ledger`: through `open77_transactions` |

### Let the workshop write and create items

The coordinator decides which resources may change which accounts and who may create items
([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set this once in the
server console:

```text
tunable.set open77_transactions writers rp_techie:stash/tray+char+cash, rp_economy:cash+bank+soc, rp_inventory, <your other writers>
tunable.set open77_transactions mint4 rp_techie sys:techie.workshop * 960; rp_techie sys:techie.dealer * 540
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add these entries to it: the workshop writes its trays, the players' pockets and cash.
  Keep your other jobs' entries.
- **mint rules.** The workshop creates the components and products a stage makes, and Sparks
  creates the parts he sells. `*` is any item, and the number is the hourly cap shared by all of
  them: 960 items from the benches and 540 parts from the dealer, the sum of the default caps. Use
  any free `mint1` to `mint6`, or append the rules to an existing one with `;`.
- **A cap per item.** `techie.mintrules` in the console prints one rule per item, with the caps of
  your configuration (`mintCaps`). A mint tunable holds at most 256 characters, so that list does
  not fit in one: spread its rules over two or three free slots, each under 256 characters.
- **Shop sales** go through `rp_economy`. It needs its own coordinator money rule, for example
  `tunable.set open77_transactions mint1 rp_economy sys:* money 2000000`, and a budget for
  `rp_techie` in `EconomyConfig.mint.callers` (`rp_economy/server/config.lua`). The pack ships
  `rp_techie = 30000`, in eddies per hour.

A server that cannot give `rp_techie` an `rp_economy` budget pays the shops through the coordinator
instead: set the convar `rp_techie_shop_payment` to `ledger`, add `+soc` to the writers entry
(`rp_techie:stash/tray+char+cash+soc`) and add the rule
`rp_techie sys:techie.shop money 60000` to a mint tunable.

### Start the workshop

```text
ensure open77_transactions
ensure open77_actions
ensure rp_techie
```

These three declare `auto_start false`. To start them with the server, put the same lines in
`server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure rp_techie"
  ]
}
```

The server log then shows:

```text
[rp_techie] coordinator ready (store=sql)
[rp_techie] items defined through rp_inventory: 9
[rp_techie] ready: workshops kabuki_west, 5 targets, shop payment economy (job techie)
```

Five targets: the two benches, Sparks and the two shops. `rp_jobs does not know the job 'techie'`
in the log means your `rp_jobs` configuration lacks the job.

### Staff the workshop

The `techie` job ships with `rp_jobs` as a civil job: players join it themselves at the employment
agency with `/agence`, at grade 0. The higher recipes need grade 1 or 2: a boss raises a grade with
`/promouvoir <playerId> <grade>`. In the server console, appoint the first boss:

```text
setjob 12 techie 3            # player 12 becomes the workshop's boss
```

Payroll follows `rp_jobs`: every on-duty techie is paid from the `techie` society, 180 to 500
eddies by grade, every 10 minutes.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `techie.status` | Counters, open offers and operations still settling |
| `techie.mintrules` | The mint rules of the current configuration, as one tunable value |
| `techie.lab.setup <playerId> [grade]` | Give the `techie` job at that grade and put the player on duty |
| `techie.lab.clock <playerId> on\|off` | Put a player on or off duty |
| `techie.lab.state <playerId>` | The player's techie items, cash, the society's balance, their pending offer and recent receipts |
| `techie.lab.tray [workshop]` | A workshop's tray and benches |
| `techie.lab.give <playerId> <item> <count>` | Put parts or products into a player's pockets, for testing |
| `techie.lab.craft <playerId> <recipe> [workshop]` | Make the request a bench prompt makes, for testing |
| `techie.lab.buy <playerId> <item> [dealer]` | Make the request the dealer prompt makes |
| `techie.lab.shop <playerId> <gunshop\|medpoint>` | Make the request a shop prompt makes |
| `techie.lab.offer <sellerId> <buyerId> <item> [count] [price] [seller\|buyer]` | Start a trade; the other player still answers the offer card |

No command accepts an offer for a player: consent stays theirs.

To let an admin use them in game, add the permission to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.techie.*",
  "command.setjob"
]
```

The player command `/techie` needs no ACL: the workshop checks the job and duty itself.

## Configuration

Everything is in the resource's `server/config.lua` (`TechieConfig`). Prices are in eddies,
durations in milliseconds, weights in grams and positions in metres. After an edit, run
`restart rp_techie`; a stage running at that moment is cancelled and uses nothing.

| Key | Default | Meaning |
|---|---|---|
| `job`, `society` | `techie`, `techie` | The `rp_jobs` job that may work here, and the society that receives the shop share (convars `rp_techie_job`, `rp_techie_society`) |
| `jobId` | `techie` | The job named in the `rp:job:completed` event |
| `items`, `weightsG` | 9 `tch_*` items | Label, weight and category of the components and products; `weightsG` must match each `weight` |
| `recipes` | 9 recipes | Per recipe: `stage` (`strip` or `assemble`), `bench`, `animation`, `durationMs`, `minGrade`, `label`, `progress`, `inputs` (`item`, `count`, `from` = `pockets` or `tray`), `outputs` (`item`, `count`, `to` = `tray` or `pockets`) |
| `recipeOrder` | | The order of the bench menu; the first three of each bench type get **F**, **R** and **Y** |
| `animations` | | The posture of each animation key: `weld`, `screwdriver`, `drill_kneel`, `drill_stand`, `tablet` |
| `workshops.kabuki_west.benches` | Workbench `-1238.89, 1998.18, 12.010`, electronics bench `-1240.88, 1999.11, 12.010`, both yaw `155` | Where the techie stands at each bench, and `arrivalRadius` (`1.0`) |
| `workshops.kabuki_west.trayCapacityG` | `30000` | The tray's capacity: 30 kg |
| `workshops.gallery.enabled` | `false` | A second sample workshop on the Gallery walkway; its points are not walked |
| `dealers.kabuki_west.position`, `yaw` | `-1235.566, 2000.680, 12.077`, `-151` | Sparks' counter |
| `dealers.kabuki_west.lots` | 3 lots | Per lot: `item`, `count`, `price`; up to four lots per dealer |
| `shops.gunshop.position`, `yaw` | `-1160.02, 2017.85, 7.76`, `-21.2` | Where the techie stands to sell to Wilson |
| `shops.medpoint.position`, `yaw` | `-1224.52, 1990.59, 7.80`, `165.3` | Where the techie stands to sell to Dr. Osei |
| `shops.<shop>.accepts` | | The items each shop buys |
| `shopPayment` | `economy` | `economy` or `ledger` (convar `rp_techie_shop_payment`) |
| `societyShare` | `0.10` | The society's share of a shop sale |
| `shopMaxLines` | `12` | Item stacks one shop sale may carry |
| `prices` | | Per item: `shop` (what a shop pays) and `suggested` (a trade's default price) |
| `trade.durationMs` | `3000` | The hand-over gesture after **Y** |
| `trade.startDistance`, `breakDistance` | `3.0`, `5.0` | How close the two players must be to start a trade, and the distance that breaks it |
| `trade.inviteTimeoutMs` | `20000` | Time the other player has to answer |
| `trade.maxCount`, `maxUnitPrice` | `20`, `5000` | Units per trade, eddies per unit |
| `trade.offerCallers` | `rp_ripperdoc` | Resources allowed to start a trade through the `offer` export |
| `maxDistance` | `2.5` | How close the techie must stay to a bench, the dealer or a shop |
| `mintCaps` | | The hourly caps `techie.mintrules` prints |
| `menuTimeoutMs` | `30000` | How long the bench menu stays open |

### Add a product

A new weapon mod needs an item, a recipe, a price, a buyer and a mint rule. Add these lines at the
end of `server/config.lua`:

```lua
-- server/config.lua, after the existing tables
C.items.tch_mod_compensator = { label = "Recoil compensator kit", weight = 0.5, usable = false,
    illegal = false, category = "weapon_mod" }
C.weightsG.tch_mod_compensator = 500
C.products[#C.products + 1] = "tch_mod_compensator"
C.prices.tch_mod_compensator = { shop = 300, suggested = 400 }
C.mintCaps.workshop.tch_mod_compensator = 40

C.recipes.assemble_compensator = {
    stage = "assemble", bench = "workbench", animation = "drill_kneel", durationMs = 11000, minGrade = 1,
    label = "Assemble a recoil compensator", progress = "Assembling a compensator",
    inputs = { { item = "tch_alloy_plate", count = 2, from = "tray" },
               { item = "tch_logic_board", count = 1, from = "tray" } },
    outputs = { { item = "tch_mod_compensator", count = 1, to = "pockets" } },
}
C.recipeOrder[#C.recipeOrder + 1] = "assemble_compensator"

local accepts = C.shops.gunshop.accepts
accepts[#accepts + 1] = "tch_mod_compensator"      -- Wilson buys it
```

Then `restart rp_techie`. The `sys:techie.workshop *` rule above already covers the new product;
if you use one rule per item instead, add `rp_techie sys:techie.workshop tch_mod_compensator 40` to
a mint tunable. Without a rule, the stage is refused with "The workshop cannot create that
(operator: mint rule missing)." The new recipe is in the workbench menu and in
`/techie craft assemble_compensator`.

### Change prices and the society's share

```lua
-- server/config.lua
C.societyShare = 0.20      -- 20% of every shop sale to the techie society

C.prices = {
    scrap_metal = { suggested = 22 }, copper_wire = { suggested = 42 }, chip = { suggested = 180 },
    tch_mod_suppressor = { shop = 280, suggested = 360 },   -- was 240 / 320
    tch_mod_magazine = { shop = 170, suggested = 230 },
    tch_mod_sight = { shop = 420, suggested = 560 },
    tch_cw_servo = { shop = 340, suggested = 450 },
    tch_cw_neural_link = { shop = 800, suggested = 1050 },
    tch_cw_optic = { shop = 520, suggested = 700 },
}

-- Sparks' lots, in prompt order (E, F, R): the price is part of the prompt's label
C.dealers.kabuki_west.lots = {
    { item = "scrap_metal", count = 3, price = 90 },
    { item = "copper_wire", count = 2, price = 90 },
    { item = "chip", count = 1, price = 220 },
}
```

Shop prices are created money: `rp_economy` counts every shop sale against the `rp_techie` budget
in `EconomyConfig.mint.callers`. Raise the budget with the prices, or sales are refused with "The
shop has spent its budget for this hour."

### Move a bench

1. Stand where the techie's body should be while working, facing the bench. Type `/pos` to copy
   your position, and `/rot` for your yaw.
2. Paste them into the bench's `position` and `yaw`, keeping `z` at floor level.
3. Mark the point as walked (`measured = true`, and a `source` note), then `restart rp_techie`.

```lua
-- server/config.lua, in C.workshops.kabuki_west.benches
{ key = "kneel", type = "workbench", label = "Workbench",
  position = { x = -1238.89, y = 1998.18, z = 12.010 },   -- from /pos, z at floor level
  yaw = 155.0,                                            -- the way the techie faces
  arrivalRadius = 1.0,
  measured = true, source = "walked in game" },
```

A bench keeps the crowd's walkers off its point. To open the sample Gallery workshop, walk its two
points the same way, then set `C.workshops.gallery.enabled = true`. It gets its own tray,
`stash:tch.gallery:tray`; the writers entry and the mint rules above already cover it.

## For resource authors

The workshop publishes a host-wide event after every committed step and exposes read-only exports:

```lua
-- server, once per committed step (a replayed commit never fires it again)
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "techie"; e.kind is "strip", "assemble", "sell" or "buy_parts"; e.ref is the operation id
end)
AddEventHandler("rp_techie:crafted", function(playerId, recipe, outputs, opId) end)
AddEventHandler("rp_techie:sold", function(e)
    -- e.kind is "shop" or "player"; e.seller, e.buyer or e.shop, e.items, e.total, e.opId
end)

exports.rp_techie:components()          -- the three cyberware components:
                                        -- { { id, label, category, weightG, shopPrice, suggestedPrice } }
exports.rp_techie:products()            -- every product, same shape
exports.rp_techie:catalogue()           -- { parts, intermediates, products, cyberware, recipes }
exports.rp_techie:isComponent(itemId)   -- true for the three tch_cw_* items
```

A resource listed in `trade.offerCallers` can start a consented trade between two players. It reads
the seller's pockets, so call it from a thread:

```lua
local result, why = Open77.exports.call("rp_techie", "offer", {
    seller = techieId, buyer = ripperdocId, item = "tch_cw_servo", count = 1, price = 400, initiator = "buyer",
}):await()
-- result = { interaction, sale, price, count }; the other player still answers the offer card
```

The fixer board's job orders count `assemble` steps from `rp:job:completed`.

## When something is refused

The workshop explains every refusal in words, in chat and as a toast. The ones a player or an
operator can fix:

| The player reads | Fix |
|---|---|
| "You are off duty: clock in first (/service)." | Clock in. |
| "You are not a techie: you need the techie job." | Join the job at the agency (`/agence`). |
| "Your grade is too low for that recipe." | The recipe needs grade 1 or 2: ask the boss. |
| "Someone is already working at that bench." | Wait, or use the other bench. |
| "Someone is standing there." | Another player stands on the bench's point: they step aside. |
| "You do not carry the parts for that. Missing: 3 Scrap metal (have 0)." | Buy parts from Sparks or a scrapper. |
| "The tray is short of components for that: strip some parts first." | Run a stage 1 recipe first. |
| "The workshop tray is full: assemble what is waiting first." | Assemble, or raise `trayCapacityG`. |
| "That is not made at this bench." | Use the other bench. |
| "Not enough cash for that lot." | Parts are paid in cash, not from the bank. |
| "The dealer is out of that for this hour." | The dealer's hourly cap is used up: wait, or raise the cap. |
| "You carry nothing this shop buys." | Wilson buys weapon mods, Dr. Osei cyberware components. |
| "The shop has spent its budget for this hour." | Raise the `rp_techie` budget in `rp_economy`, or the shop mint cap in `ledger` mode. |
| "The shop cannot pay yet (operator: rp_economy mint budget for rp_techie, README Setup)." | Add the `rp_techie` budget to `rp_economy`, or the shop's mint rule in `ledger` mode. |
| "The workshop cannot create that (operator: mint rule missing)." | Add the workshop's and the dealer's [mint rules](#let-the-workshop-write-and-create-items). |
| "The workshop has made enough of that for this hour." | A stage's hourly cap is used up: wait, or raise it. |
| "The workshop's accounts are not writable (operator: writers policy)." | Add `rp_techie` to `writers`. |
| "Your pockets are not ready (rp_inventory backend)." | Set `rp_inventory_backend` to `transactions`. |
| "The workshop is closed for now (the ledger is unavailable)." | Check `open77_transactions` and the database. |
| "One side of this trade must be an on-duty techie." | The techie clocks in. |
| "That is not traded here (parts to a techie, products from a techie)." | Parts go to a techie, products come from one. |
| "The buyer does not have enough cash." | The buyer pays from cash. |
| "Get closer." | Stand within 3 m of the other player. |
| "Hand-overs are unavailable on this server (open77_player_interactions)." | Load and start `open77_player_interactions`. |

## Limits

- **One techie per bench.** The workshop has two benches, a workbench and an electronics bench.
- **A shared tray.** The tray belongs to the workshop: any on-duty techie may assemble from what
  another one stripped.
- **Four prompts per bench.** A bench card shows *Work at the bench* and its first three recipes;
  the others are in the menu and `/techie craft`.
- **Salvage stays in crates.** `rp_salvage` keeps its scrap in crate holds sold whole to its buyer.
  A scrapper sells a techie only what is in their pockets. `rp_ferrailleur`'s scrap and components
  are not parts here.
- **RP items only.** Nothing fits a mod to a game weapon or installs a component. The ripperdoc's
  stock does not use the components either: they are traded and sold to the shops.
- **Cash only** for parts from Sparks and for trades between players.
- **Open offers** are forgotten on a restart. A restart between a step's commit and its message skips
  that chat line and its `rp:job:completed` event; it never doubles them.
- **Crowd.** The benches and Sparks keep walking NPCs off their points, but an NPC already standing
  there stays.
- **Client freezes.** A client that freezes for a few seconds during a stage can end it as if the
  player had moved. Nothing is used; run the stage again.
