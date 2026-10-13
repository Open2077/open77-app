# Fixer: the contract board

Fixers post contracts, runners take them and get paid. Three Night City fixers keep a board: Rogue
at the Afterlife, Wakako Okada in Japantown and Regina Jones in the Kabuki market. Their own
contracts are always up, and players with the fixer job post more from their own pockets. Every
reward waits in escrow from the moment the contract is posted, so it can always be paid, and it
goes back to the poster in full when nobody finishes in time.

The board ties the other roleplay jobs together. A job order asks for work another job reports,
such as a netrunner's breach, an implant installed at the ripperdoc or CHOOH2 refined at Petrochem,
and pays when that job says it is done.

The job is the [`rp_fixer`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_fixer)
resource, version 2.0, from the Open2077/open77-resources repository. It is built on the
[world-interaction libraries](world-interaction.md) and is experimental like them.

| | |
|---|---|
| Where | The Afterlife (Rogue's booth, Little China, Watson), Wakako's (Japantown, Westbrook) and Regina's corner (Kabuki market, Watson) |
| Who posts | The three fixer NPCs, and players with the `rp_jobs` job `fixer` (label "Fixer"), on duty |
| Who runs contracts | Any player. Reputation unlocks the better-paid contracts |
| Who pays | The poster, into escrow, when the contract goes up: a player from cash then bank; an NPC fixer's reward is created by `rp_economy` |
| Who is paid | The runner, in cash. The fixers' cut (10% of a player's contract, 15% of an NPC's) goes to the `fixer` society |
| Contract kinds | Delivery, retrieval, job order and cyberpsycho bounty |
| Runs on | Server and client (the client only draws the map pins) |

## How the board plays

### The fixer points

| Fixer point | Fixer | Where |
|---|---|---|
| The Afterlife | Rogue | The booth at the back of the club, Little China, Watson |
| Wakako's | Wakako Okada | Japantown street food, Westbrook |
| Regina's corner | Regina Jones | The west side of the Kabuki market, Watson |

Each fixer point has a contact standing beside the board and a pin on the map. Walk up to it and
press **E** on **Contract board**. The same card also hands over the goods of a retrieval on **F**
(**Hand over the goods**).

Every board lists every open contract in the city: what it pays the runner, the fixer who posted
it, the time left and the reputation it needs. Your own contracts come first, then the ones posted
at this fixer point. A contract above your reputation is greyed out and shows the tier it needs,
for example `trusted (8+)`. `/contracts` opens the board when you stand within 4 m of a fixer
point. Anywhere else it lists the board in chat and tells you how far the nearest fixer is:

```text
Nearest fixer: Regina's corner (Regina Jones), 120 m away.
```

### Runners: take a contract and do it

Pick a row to read the brief, what it pays and what the fixers keep, then press **Take the
contract**. You can hold two contracts at once. `/contract` lists yours with their progress and
the time left, and the map shows a pin for each, with the route to the first.

```text
Contract taken: #25 Noodle Row pickup: pick it up at Kabuki Market, Noodle Row, 1 h 59 min left.
```

| Kind | What you do | Paid when |
|---|---|---|
| Delivery | A sealed crate appears at the pickup point: Vik's clinic, Noodle Row in the Kabuki market, or the Japantown ripperdoc. Press **E** on it to pick it up, carry it on foot to the fixer point named in the contract and press **E** on **Deliver the crate** there. Only you can lift it. | The crate is put down at the drop |
| Retrieval | Bring the goods the contract names to its fixer point and press **F** on **Hand over the goods**. A 3-second "Handing over" bar runs. Without the goods nothing starts and you are told so. | The bar ends |
| Job order | Do the other job's work: refine CHOOH2, breach a terminal, install an implant as a ripperdoc, assemble at a techie bench, stabilise patients, deliver a nomad crate. Each step that job reports for you counts once, and chat shows the count, for example `Contract #12: 4 / 10.` | The count is reached |
| Bounty | A cyberpsycho waits at the sighting: north-west of the Kabuki market, in the Northside industrial district or at the Rancho Coronado junkyard. Kill it. | The kill is credited to you |

A carried crate is dropped at your feet if you get into a vehicle, draw a weapon, fall, die or
disconnect: pick it up again from where it lies. The board tells you so:

```text
The crate of #25 fell from your hands, at your feet. Pick it up again.
```

When the contract is done, the runner's share lands in cash in one operation, the fixers' cut goes
to the `fixer` society, your reputation rises and the poster is told:

```text
Contract #25 done: 450 eddies in cash. Reputation 4 (known).
```

To walk away from a contract, open its row and press **Abandon it**, or type `/contract drop <n>`.
It goes back on the board and you lose 1 reputation point. A taken contract that runs out costs
1 point too.

### Bounties: open or claimed

- **Open bounty.** Nobody takes it. Its cyberpsycho is out as soon as the contract goes up, and
  whoever kills it is paid. The poster is never paid for their own bounty: if they kill it, it
  comes back a minute later.
- **Claimed bounty.** The cyberpsycho appears when a runner takes the contract, and only that
  runner is paid. When someone else kills it, the contract decides: `refund` voids the contract and
  returns the reward to the poster, nobody is paid; `respawn` sends another cyberpsycho a minute
  later.

The cyberpsycho guards its sighting within 12 m and attacks the nearest player within 25 m. A kill
is credited to the player the platform names as the killer, or else to the last player who hit it
within 30 seconds. The body stays 30 seconds, then goes. A cyberpsycho never appears with a player
standing within 4 m of the sighting: it waits until the spot is clear.

### Fixers: post a contract

You need the `fixer` job and must be on duty: type `/service` to clock in. Stand at any fixer point
and pick **Post a contract** at the bottom of the board.

1. **Pick a type.** The list shows each contract type with its reward range and the reputation it
   needs from runners.
2. **Fill the form.** Set the reward with the slider (in steps of 50 eddies, within the type's
   range), the time to expiry (1, 2, 4, 8 or 24 hours, or the type's own), an optional brief of up
   to 120 characters, and for a bounty who gets paid: **Only the runner who takes it** or
   **Whoever kills it**.
3. **Confirm the escrow.** A last card shows what leaves your wallet now, what the runner gets and
   what the fixers keep. **Post it** takes the reward from your cash, then your bank, into escrow:

   ```text
   Contract #26 is up at Regina's corner: Noodle Row pickup, 500 eddies escrowed (450 eddies to the runner, 50 eddies to the fixers).
   ```

You are told when a runner takes it, walks away from it, completes it or lets it run out. While
nobody holds it, you can cancel it from its row (**Cancel, refund me**) or with
`/contract cancel <n>`. The whole reward comes back:

```text
Contract #26 cancelled: the refund is on its way.
Contract #26 cancelled: 500 eddies back in your wallet.
```

A runner on a contract cannot be cancelled out of it. You can have four live contracts posted at
once, and you cannot take your own.

**Your drop box.** The goods of a retrieval you posted go into your drop box. When it holds
something, **Collect your drop box** appears on the board, and picking it (or typing
`/contract box` at a fixer point) moves everything into your pockets in one operation.

### The NPC fixers

Rogue, Wakako and Regina each keep two of their own contracts on the board at all times. When one
closes, another of their types goes up within five minutes. Their rewards are drawn in the type's
range, and their cut is 15%. A new contract is announced in chat to the players whose reputation
lets them take it, and to everyone for an open bounty.

### What everyone nearby sees

The contacts at the boards, the fixer pins on the map, a runner carrying a crate through the
market, the cyberpsycho fighting whoever comes close, and its body for 30 seconds after the kill.

| Command | What it does |
|---|---|
| `/contracts` | At a fixer point, the board. Elsewhere, the board in chat and the nearest fixer. |
| `/contract` | Your reputation, the contracts you hold and the ones you posted. |
| `/contract take <n>` | Take contract `#n`, at a fixer point. |
| `/contract drop <n>` | Walk away from a contract you hold. |
| `/contract cancel <n>` | Cancel a contract you posted, while nobody holds it. |
| `/contract box` | Collect your drop box, at a fixer point. |
| `/contract post <template> <reward> [hours]` | Post a contract without the menu, at a fixer point, as a fixer on duty. |

`<template>` is a template id from the [contract table](#contracts-and-rewards), for example
`regina_noodle_drop`.

## Reputation

Each player has one reputation score, saved in SQL and kept across restarts.

| Tier | From |
|---|---|
| `street` | 0 |
| `known` | 3 |
| `trusted` | 8 |
| `legend` | 20 |

A completed contract adds its `repGain` (1 to 4 points). Walking away from a contract or letting it
run out takes 1 point. The score never drops below 0. A contract asks for a minimum score
(`minRep`); below it, the row is greyed out and taking it is refused.

## Contracts and rewards

The board ships 16 contract types. The reward is the gross amount held in escrow; the runner
receives it minus the fixers' cut.

| Template | Kind | Posted at | What it asks | Reward | Hours | Rep needed | Rep gain |
|---|---|---|---|---|---|---|---|
| `afterlife_meds_run` | Delivery | The Afterlife | Vik's clinic to Rogue's booth | 600 to 900 | 2 | 0 | 1 |
| `afterlife_chips` | Retrieval | The Afterlife | 3 data chips | 500 to 800 | 4 | 0 | 1 |
| `afterlife_breach` | Job order | The Afterlife | 1 successful netrunner breach | 900 to 1400 | 4 | 3 | 2 |
| `afterlife_implant` | Job order | The Afterlife | 1 implant installed by a ripperdoc | 1200 to 1800 | 6 | 3 | 2 |
| `afterlife_smuggle` | Job order | The Afterlife | 1 nomad crate delivered | 1500 to 2500 | 8 | 3 | 2 |
| `afterlife_box` | Retrieval | The Afterlife | 1 boxed Gorilla Arms (Street) | 2500 to 3500 | 6 | 8 | 3 |
| `wakako_ripper_run` | Delivery | Wakako's | The Japantown ripperdoc to Wakako's | 500 to 800 | 2 | 0 | 1 |
| `wakako_components` | Retrieval | Wakako's | 4 components | 600 to 900 | 4 | 0 | 1 |
| `wakako_chooh2` | Job order | Wakako's | 10 CHOOH2 canisters refined | 1500 to 2200 | 8 | 3 | 2 |
| `wakako_hardware` | Job order | Wakako's | 2 assemblies at a techie bench | 900 to 1400 | 6 | 0 | 1 |
| `regina_psycho_kabuki` | Bounty, open | Regina's corner | The cyberpsycho north-west of the Kabuki market | 2000 to 3000 | 2 | 3 | 3 |
| `regina_psycho_northside` | Bounty, claimed (`refund`) | Regina's corner | The cyberpsycho in Northside | 3000 to 4500 | 3 | 8 | 4 |
| `regina_noodle_drop` | Delivery | Regina's corner | Noodle Row to Regina's corner | 400 to 600 | 2 | 0 | 1 |
| `regina_chooh2` | Retrieval | Regina's corner | 2 CHOOH2 fuel cans | 500 to 750 | 4 | 0 | 1 |
| `regina_patch_up` | Job order | Regina's corner | 2 patients stabilised (or revived) by the Trauma Team | 800 to 1200 | 6 | 0 | 1 |
| `junkyard_psycho` | Bounty, claimed (`respawn`) | Players only | The cyberpsycho at the Rancho Coronado junkyard | 2500 to 6000 | 3 | 3 | 3 |

Rewards are in eddies. Players can post every type; the NPC fixers post the types listed in their
own `offers`, which covers all of them except `junkyard_psycho`. A player fixer posts at whichever
fixer point they stand at.

## Money and what can go wrong

All money moves through `rp_economy`, and goods through
[`open77_transactions`](transactions.md). Each step is one operation whose id is derived from the
contract, so a retry, a double press or a restart replays the first receipt instead of paying
again.

| What happens | Money | Goods |
|---|---|---|
| A player posts a contract | The reward leaves the poster's cash, then bank, into the escrow society `fixer_escrow` | None |
| An NPC fixer posts a contract | The reward is created out of `sys:rp_fixer:board` into `fixer_escrow`, within `rp_economy`'s hourly allowance for `rp_fixer` | None |
| The contract is completed | Out of escrow in one operation: the runner's share to their cash, the cut to the `fixer` society | A delivery crate is removed at the drop |
| A retrieval is handed over | Paid as above, right after | The goods leave the runner's pockets: into the poster's drop box for a player's contract, destroyed for an NPC's |
| The contract runs out, open or taken | The whole reward goes back to the poster: a player's wallet, or back out of circulation for an NPC | Nothing moves |
| The poster cancels it while it is open | The whole reward goes back to the poster | Nothing moves |
| Someone else kills a claimed bounty with `refund` | The whole reward goes back to the poster; nobody is paid | None |
| The runner walks away | Nothing moves; the contract goes back on the board | The crate goes back to the pickup point |
| A retrieval hand-over is stopped (**X**, or moving away) | Nothing moves | The goods stay in the runner's pockets |
| The escrow is refused (empty wallet, a missing mint rule) | Nothing moves; the contract is not posted | None |

Nobody withdraws from `fixer_escrow`: it is not a job. Its balance should equal the rewards of the
contracts that hold escrow, and `fixer.status` prints both so an operator can compare them.

A payout or refund that the economy does not answer in time is sent again every 15 seconds with
the same operation id until it settles. A posting whose escrow answer never came is settled after
30 seconds: opened if the money moved, dropped if it did not. The poster is told while it waits:

```text
The escrow is still settling: the contract goes up as soon as it clears.
```

### After a disconnect or a restart

- **The runner disconnects.** The contract stays theirs, and its time keeps running. A crate they
  carried is left where they stood; after they reconnect, the board tells them about each contract
  they hold, and the pins come back.
- **The poster disconnects.** The contract stays on the board. Payouts, refunds and drop-box
  deliveries do not need the poster online.
- **The server restarts.** Contracts are saved in SQL and reloaded at start, in their state and
  with their runner. A delivery crate is placed again where it was last set down, a bounty's
  cyberpsycho is out again at its sighting, and a payout, refund or hand-over that was under way is
  settled from the economy's and the coordinator's records. Contracts that ran out while the
  server was down are refunded on the first pass. Reputation is saved per change, each change once.

## Set up the board

### Requirements

- A [MySQL or MariaDB database](database.md). Contracts and reputation are stored in SQL; without
  a database, the board stays closed.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_uikit` and
  `open77_notifications`, with the libraries `open77_actions` depends on (`open77_animations`,
  `open77_props`, `open77_interactions`).
- The RP pack resources `rp_jobs`, `rp_inventory`, `rp_economy` and `rp_bank`. `rp_identity` is
  optional: with it, the board names players by their character.
- For the job orders and the boxed-implant retrieval, the jobs they name: `rp_netrunner`,
  `rp_ripperdoc`, `rp_chooh2`, `rp_techie`, `rp_trauma` and `rp_nomade`. Without `rp_ripperdoc`,
  the NPC fixers skip the Gorilla Arms retrieval. The other job orders stay on the board but
  nobody can complete them.

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first ([Lua resources](server-resources.md#selecting-which-resources-load)):

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_animations", "open77_props", "open77_interactions",
    "open77_transactions", "open77_actions", "open77_uikit", "open77_notifications",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_bank", "rp_identity",
    "rp_fixer"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### Let the board write

Two `open77_transactions` settings decide which resources may change which accounts and who may
create value ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set them
once in the server console:

```text
tunable.set open77_transactions writers rp_fixer:char+stash, rp_economy:cash+bank+soc, rp_inventory, <your other writers>
tunable.set open77_transactions mint1 rp_economy sys:* money 2000000
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add these entries to it and keep your other jobs' entries. `rp_fixer:char+stash` lets
  the board take a retrieval's goods out of the runner's pockets and put them in the poster's drop
  box (`stash:fxbox.<subject>`), then empty that box into the poster's pockets.
- **mint rule.** `rp_economy` creates the NPC fixers' rewards. The `mint1` rule above is
  `rp_economy`'s usual ceiling: use it if your server does not have it yet, in any free `mint1` to
  `mint6`. Goods handed to an NPC fixer are destroyed, which needs no mint rule.
- **rp_economy's allowance.** The NPC rewards also count against `rp_economy`'s own hourly
  allowance for `rp_fixer`, 200 000 eddies by default (`EconomyConfig.mint.callers.rp_fixer` in
  `rp_economy/server/config.lua`). A refunded NPC contract gives its amount back.

### Start the board

```text
ensure open77_transactions
ensure open77_actions
ensure rp_fixer
```

These three declare `auto_start false`. To start them with the server, put the same lines in
`server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure rp_fixer"
  ]
}
```

The server log then shows:

```text
[rp_fixer] loaded 0 live contracts (), next number 1
[rp_fixer] ready: 3 fixer points, 16 templates, escrow society fixer_escrow, cut society fixer
```

A few seconds later the NPC fixers post their first contracts. The board creates the SQL tables
`rp_fixer_contracts`, `rp_fixer_reputation`, `rp_fixer_rep_log` and `rp_fixer_gigs` (one history
row per settled contract). Reputation saved by an earlier version of the board is kept.

### Staff the board

Runners need no job. The `fixer` job ships with `rp_jobs` and is not joined at the employment
agency: a boss or an admin hands it out. In the server console:

```text
setjob 12 fixer 3            # player 12 becomes the fixers' boss
```

The boss then hires fixers with `/embaucher <playerId> [grade]`, or by ALT+clicking a player and
picking **Hire into Fixer**, and they clock in with `/service`. The cut of every contract goes to
the `fixer` society, which also pays the fixers' salaries.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `fixer.status` | Counts by state, totals, and the escrow audit: what the contracts hold against the balance of `fixer_escrow` |
| `fixer.list` | Every contract in memory: number, id, state, template, poster, runner, time left, crate and cyberpsycho |
| `fixer.post <template> [hub] [reward]` | An NPC fixer posts that contract now |
| `fixer.expire <n>` | Contract `#n` runs out now; the next pass refunds it |
| `fixer.rep <playerId>` | A connected player's reputation |
| `fixer.setrep <playerId> <score>` | Set a connected player's reputation, saved as one change |
| `fixer.job <playerId> <job> <kind> [count] [ref]` | For testing a job order: fire the event another job would fire |
| `fixer.kill <n> <playerId>` | For testing a bounty: the cyberpsycho of `#n` dies, credited to that player |

To let an admin use them in game, add the permission to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.fixer.*",
  "command.setjob"
]
```

The player commands (`/contracts`, `/contract`) need no ACL: the board checks the fixer job and
duty itself when a player posts.

## Configuration

Everything is in the resource's `server/config.lua` (`FixerConfig`). Rewards are in eddies,
durations in milliseconds unless the key says hours, and positions in metres. After an edit, run
`restart rp_fixer`. Contracts already posted keep their reward, cut and expiry.

| Key | Default | Meaning |
|---|---|---|
| `fixerJob` | job `fixer`, on duty | Who may post contracts |
| `escrowSociety` | `fixer_escrow` | The society account every reward waits in |
| `cutSociety`, `cutRate` | `fixer`; NPC `0.15`, player `0.10` | Who receives the fixers' cut, and its share of the reward (at most 0.9) |
| `escrowInstrument` | `cash_then_bank` | How a player fixer funds a contract |
| `npcFunding` | `board` | NPC rewards come from `sys:rp_fixer:board` |
| `tiers` | street 0, known 3, trusted 8, legend 20 | The reputation tiers |
| `reputation` | floor `0`, abandon `-1`, expire `-1` | Reputation lost when a runner walks away or runs out of time |
| `maxLive`, `maxPerPoster`, `maxPerRunner` | `48`, `4`, `2` | Live contracts on the server, per player fixer, and per runner |
| `boardReach` | `4.0` | How close `/contracts`, `/contract take`, `box` and `post` need you to a fixer point |
| `announce` | `true` | Announce new contracts in chat to the players who can take them |
| `briefMax` | `120` | Characters of a fixer's own brief, plain ASCII |
| `postHours`, `rewardStep` | `1, 2, 4, 8, 24`; `50` | Durations offered in the post form, and the reward slider's step |
| `npcBoard` | enabled, refill every 5 min | Whether the NPC fixers post, and how often they top up |
| `hubs` | The Afterlife, Wakako's, Regina's corner | Each fixer point: `position`, `yaw`, the `contact`'s position, the `offers` its NPC fixer posts and how many it keeps open (`keepOpen`, 2) |
| `points` | Noodle Row, Vik's clinic, Japantown ripperdoc | Delivery pickups |
| `drops` | none | Extra delivery drops; every fixer point is a drop already |
| `sightings` | Kabuki north-west, Northside, junkyard | Where a bounty's cyberpsycho appears |
| `psycho` | Maelstrom combat record, 400 health | The cyberpsycho: `record`, `health`, `leash` (12 m), `engageDistance` (25 m), `creditWindowMs` (30 s), `respawnMs` (60 s), `clearRadius` (4 m), `corpseMs` (30 s) |
| `contactNpc` | the passive `civilian_female_relaxed_01` | The NPC standing at each board; set `enabled = false` to have none |
| `crate` | an ammo box, reach 2 m | The delivery crate |
| `actions.handover` | 3 s, the `give` posture | The hand-over bar |
| `templates`, `templateOrder` | 16 types | The contract types, and the order of the post menu |

### Add a contract template

A template is one entry of `C.templates`. Its id must be lower-case letters, digits and `_`, at
most 32 characters. Common fields are `kind`, `title`, `brief`, `reward = { min, max }`, `hours`,
`minRep`, `repGain` and `posters` (`npc`, `player`). Then, by kind:

| Kind | Fields |
|---|---|
| `delivery` | `from`: a key of `points`; `to`: a key of `hubs` or `drops` |
| `retrieval` | `item`: an `rp_inventory` item id; `count`; `drop`: the hub where it is handed over |
| `job` | `job`, `kinds` (a list, `"*"` for any), `count`, optional `match` and `countField` |
| `bounty` | `sighting`: a key of `sightings`; `mode`: `"open"` or `"claimed"`; `onForeignKill`: `"refund"` or `"respawn"` |

This example adds a delivery from Vik's clinic to Regina's corner and a job order for two
successful breaches, lets Regina post both, and lists them in the players' post menu:

```lua
-- server/config.lua, after the shipped C.templates
C.templates.regina_vik_parcel = {
    kind = "delivery", title = "A parcel from Vik", posters = { npc = true, player = true },
    brief = "Vik has something for Regina. Walk it over from the clinic, no detours.",
    from = "vik_clinic", to = "regina",
    reward = { min = 700, max = 1000 }, hours = 2, minRep = 0, repGain = 1,
}
C.templates.regina_double_breach = {
    kind = "job", title = "Two clean breaches", posters = { npc = true, player = true },
    brief = "Regina wants two systems cracked before the NCPD notices. Any successful breach counts.",
    job = "netrunner", kinds = { "breach_success" }, count = 2,
    reward = { min = 1800, max = 2600 }, hours = 6, minRep = 3, repGain = 2,
}
-- Regina's NPC board posts them too (it keeps two of its offers open).
table.insert(C.hubs.regina.offers, "regina_vik_parcel")
table.insert(C.hubs.regina.offers, "regina_double_breach")
-- Players see them in the post menu.
table.insert(C.templateOrder, "regina_vik_parcel")
table.insert(C.templateOrder, "regina_double_breach")
```

After `restart rp_fixer`, the start line counts 18 templates. A template with a mistake is left
out and the log says why, for example `template regina_vik_parcel left out: unknown_drop`.
`fixer.post regina_vik_parcel regina` posts one at once to try it.

### Change the cut and the reputation tiers

```lua
-- server/config.lua
C.cutRate = { npc = 0.20, player = 0.05 }   -- the fixers keep 20% of NPC contracts, 5% of players'

C.tiers = {
    { name = "street", min = 0 },
    { name = "known", min = 5 },
    { name = "trusted", min = 12 },
    { name = "legend", min = 30 },
}
C.reputation = { floor = 0, abandon = -2, expire = -2 }   -- walking away costs more

-- A template's own gate: the Northside bounty now needs the new "trusted".
C.templates.regina_psycho_northside.minRep = 12
```

The tiers only name ranges of the score; each template's `minRep` is what gates it. Raise the
`minRep` of the templates you want behind a new tier.

### Move a sighting

A cyberpsycho needs room to fight and a line of fire. To move one:

1. Stand where it should appear, outside any safe zone. Type `/pos` to copy your position, and
   `/rot` for your yaw.
2. Paste them into the sighting, mark it as walked, then `restart rp_fixer`.

```lua
-- server/config.lua, in C.sightings
northside = {
    label = "Northside industrial",
    position = { x = -1914.454, y = 2739.485, z = 10.899 },   -- from /pos
    yaw = -47.0,                                              -- from /rot
    measured = true,                                          -- walked in game
},
```

Keep the key (`northside`) so the templates still find it. A bounty already on the board moves with
the sighting at the next restart. If you rename a key, saved bounties fall back to their template's
current sighting.

## For resource authors

### Report work a job order can count

A job order counts the server event `rp:job:completed`. Fire it once a step of your job is saved,
with the player who did it and a reference that is unique for that step:

```lua
-- server, after the step is committed
TriggerEvent("rp:job:completed", {
    job = "chooh2",            -- your job's name in the event
    kind = "refine",           -- the step
    playerId = 3,              -- who did it
    ref = opId,                -- unique per step: the same ref is counted once
    data = { canisters = 2 },  -- anything a template's match or countField reads
})
```

An event counts toward a contract when the contract is taken by that player, its `job` and one of
its `kinds` match, every `match` field equals the event's `data` field, and its `ref` was not
counted before for that contract. With `countField`, the event counts the number in that `data`
field; otherwise it counts 1. The shipped job orders read:

| Template | `job` | `kind` | Counted |
|---|---|---|---|
| `wakako_chooh2` | `chooh2` | `refine` | `data.canisters` (2 per batch with the shipped CHOOH2 settings), up to 10 |
| `afterlife_breach` | `netrunner` | `breach_success` | 1 |
| `afterlife_implant` | `ripperdoc` | `operation` with `data.action = "install"` | 1 |
| `wakako_hardware` | `techie` | `assemble` | 1 per assembly, up to 2 |
| `regina_patch_up` | `trauma` | `stabilise` or `revive` | 1 per patient, up to 2 |
| `afterlife_smuggle` | `nomad` | `deliver` | 1 crate |

### Events and exports

```lua
-- server: fired by the board once a contract is paid
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "fixer", e.kind == "contract_completed"
    -- e.data = { contract, seq, contractKind, template, hub, reward, net, cut, poster }
end)
AddEventHandler("rp_fixer:contract", function(id, state, playerId, summary)
    -- state: open, taken, abandoned, completed, expired, cancelled, spoiled
end)

exports.rp_fixer:reputation(playerId)     -- integer score, 0 when unknown
exports.rp_fixer:contract(idOrNumber)     -- a summary, or nil
exports.rp_fixer:heldBy(playerId)         -- the contracts the player holds

-- An NPC fixer posts on your resource's behalf (asynchronous), funded like any NPC contract.
local summary, why = Open77.exports.call("rp_fixer", "postContract",
    { template = "regina_psycho_kabuki", hub = "regina" }):await()
```

`rp:job:completed` is a server event: any server resource can fire it, clients cannot. The board
trusts the jobs running beside it and counts each `ref` once.

## When something is refused

The board explains every refusal in words. The ones a player or an operator can act on:

| The player reads | Fix |
|---|---|
| "Talk to a fixer: stand at a fixer point." | Stand within 4 m of a board to take, post or collect. |
| "Your reputation is too low for that one." | Complete easier contracts first. |
| "You already hold as many contracts as the fixers trust you with." | Finish or drop one of your two contracts. |
| "That contract is gone." | Someone else took it, or it closed. |
| "Open bounty: nobody takes it. Find the target, the kill pays." | Go to the sighting and kill the cyberpsycho. |
| "You posted that one yourself." | A poster cannot take their own contract. |
| "That crate is for another runner." | Only the runner who took the delivery can lift its crate. |
| "This is not where the crate goes." | Deliver at the fixer point the contract names. |
| "None of your contracts are handed over here." | Hand the goods over at the contract's own fixer point. |
| "You do not have everything the contract asks for." | Bring the full count of the named item. |
| "Only a fixer on duty posts contracts." | Get the `fixer` job. |
| "Clock in as a fixer first." | Type `/service`. |
| "That reward is outside the range for this contract." | Pick a reward within the type's range. |
| "You do not have the eddies to back that contract." | The reward must be in the poster's cash and bank. |
| "A runner is on it: it cannot be cancelled now." | Wait until it is completed or runs out. |
| "You already have as many contracts posted as the board takes from one fixer." | Four posted contracts at most. |
| "The board is full. Wait for a contract to close." | 48 live contracts on the server; raise `maxLive`. |
| "The board is not ready yet. Try again in a moment." | Check the database and `open77_transactions` in the log. |
| "The fixer cannot fund this board right now (operator: rp_economy mint rule)." | Check `rp_fixer` in `rp_economy`'s mint allowlist and the `mint1` rule for `rp_economy`. |
| "The fixer has posted enough for this hour." | The hourly allowance is used up: wait, or raise it. |
| "The ledger refuses the move (operator: open77_transactions writers)." | Add `rp_fixer:char+stash` to `writers`. |

When the NPC fixers cannot post because of a missing rule, the log says so and they wait 30 minutes
before trying again.

## Limits

- **Deliveries are on foot.** A crate cannot ride in a vehicle; getting in drops it.
- **Placed points.** Only the Kabuki sighting is marked as walked in the config. Stand on the other
  fixer points, pickups and sightings on your server and correct them with `/pos` before opening
  the board.
- **Contacts.** The NPC at each board is a generic passive civilian. Character records for Rogue,
  Wakako and Regina are listed in the config to try.
- **Kill credit.** A kill is credited through the platform's hit pricing. On a host that refuses it,
  the cyberpsycho still appears, no kill is credited and the bounty runs out and is refunded.
- **Spawns near players.** A body that appears on top of a player can be credited to that player
  for hits nobody fired, which is why a cyberpsycho never appears within 4 m of a player.
- **Cyberpsycho records.** The cyberpsycho uses the Maelstrom combat record players already fight;
  the dedicated cyberpsycho records are listed in the config to try.
- **CHOOH2 retrieval.** "Two cans of CHOOH2" asks for the `rp_inventory` fuel can (`chooh2`). The
  canisters refined at Petrochem are a different item and are not accepted.
- **Nomad job order.** "A nomad run" counts one `deliver` event, and the nomad job reports one per
  crate delivered or sold: the first crate completes it.
- **Trauma job order.** "Keep them breathing" counts `stabilise` or `revive`; the Trauma Team job
  reports stabilisations, so two stabilised patients complete it.
- **Other jobs' renames.** A job order matches the `job`, `kind` and `data` names in the table
  above. If a job renames them, change the template with it.
- **Missing jobs.** A job order whose job is not running stays on the board until it runs out and
  is refunded.
- **Board size.** 48 live contracts on the server, 2 per runner, 4 per player fixer; the board shows
  56 rows at most.
- **Other crates.** A crate carried for another resource also sees **Deliver the crate** at a fixer
  point. Putting it down there is that resource's business.
- **One event after a payout.** The board's own `rp:job:completed` is fired once, after the payout is
  saved. A crash in that instant loses the event, never the payment.
