# Netrunner: breach contracts from the Afterlife

A fixer posts a breach contract on a board in the Afterlife's back room. A netrunner takes it, jacks
into a real Night City terminal for a timed breach, and brings the data shard back. A successful
breach puts the shard in the netrunner's pockets; a failed one is traced by NCPD. The netrunner is
paid when the shard reaches the fixer, and the fixer keeps a cut. The job also ships four
quickhacks: Ping, Short Circuit, Overheat and an NCPD radio jammer.

The job is the [`rp_netrunner`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_netrunner)
resource, version 2.0, from the Open2077/open77-resources repository. It is built on the
[world-interaction libraries](world-interaction.md) and is experimental like them.

| | |
|---|---|
| Where | The fixer drop in the Afterlife's back room (Watson) and six breach terminals: a junction box above the Afterlife, a netrunner den in a market hall, a corporate lobby terminal in City Center, a club back office, a plaza security desk and a corporate office workstation |
| Who works | Players with the `rp_jobs` job `netrunner` (label "Netrunner"), on duty. Players with the job `fixer`, on duty, post contracts |
| Who pays | The fixer's off-screen client: the reward is created on delivery |
| Who is paid | The netrunner, in cash, minus the fixer's 15 % cut. The cut goes to the fixer who posted the contract, or to the `fixer` society for the board's own contracts |
| What it uses | One data chip per breach attempt; the data shard the breach produces |
| Runs on | Server and client |

## How a contract plays

### The netrunner

You need the `netrunner` job and must be on duty: type `/service` to clock in.

1. **Take a contract.** In the Afterlife's back room, press **E** on **Talk to the fixer**. The
   contract board opens: one row per open contract with its code, the terminal and where it is,
   the tier, the pay, the time left and the fixer who posted it. Pick a row and confirm with
   **Take it**. From anywhere, `/netrun contracts` lists the board in chat and
   `/netrun take <code>` takes one. You hold one contract at a time.
2. **Bring data chips.** Every breach that runs to the end burns one data chip, whether it succeeds
   or fails. Without a chip the breach is refused before the bar starts:

   ```text
   You need a data chip to jack in (the breach kit).
   ```

3. **Go to the terminal.** `/netrun` tells you which terminal, where it is and how long you have
   left. At the terminal, press **E** on **Breach the terminal** (or type `/breach` next to it).
   You sit and type at a desk, stand over a tablet at the den, or sit on the ground with a laptop
   at the junction box, while a **Breaching the ICE** bar runs: 12, 18 or 25 seconds depending on
   the tier. **X**, walking away, dying, getting in a car or clocking out stops it, and nothing is
   used:

   ```text
   Breach aborted. The ICE never saw you: nothing was used.
   ```

4. **The roll.** The server draws the outcome when the breach starts. Your odds are the tier's base
   chance, plus 8 % per `rp_jobs` grade, minus 5 % for every attempt already made on the contract,
   kept between 10 % and 95 %.

   | Tier | Name | Bar | Base chance | Reward | Deadline |
   |---|---|---|---|---|---|
   | 1 | Street node | 12 s | 75 % | 300 to 700 | 15 to 60 min |
   | 2 | Corporate subnet | 18 s | 55 % | 800 to 1600 | 20 to 90 min |
   | 3 | Datafort | 25 s | 40 % | 1600 to 3000 | 30 to 120 min |

5. **Success.** The data shard lands in your pockets:

   ```text
   Breach complete (75% odds): the data shard is in your pockets. Deliver it at Fixer drop - Afterlife back room within 38 min.
   ```

6. **Failure is a trace.** The ICE logs you. Officers on duty get a dispatch line and a map pin at
   the terminal, your NCPD record gets an entry, and your own game raises its NCPD heat to level 1
   for two minutes. The terminal's ICE then stays on alert for a minute, and a new attempt there is
   refused until it calms down. The contract stays yours; the third failed attempt burns it.

   ```text
   Breach failed (55% odds): the ICE traced you. You may try again (attempt 1 of 3).
   TRACE: NCPD ICE logged your signature. Dispatch is on its way.
   ```

7. **Deliver.** For a contract the board posted itself, go back to the fixer drop and press **E** on
   **Talk to the fixer**: with the shard on you, it starts the delivery (a short give gesture and a
   **Handing over the shard** bar). For a contract a player fixer posted, hand the shard to that
   fixer in person: ALT+click them and pick **Hand over the data shard**, or type
   `/netrun deliver <their id>`, within 3 m. They answer on an offer card. If that fixer is not in
   the city, the drop at the Afterlife pays instead and their cut still reaches them.

   ```text
   Shard delivered: contract VLY3 closed, +297 eddies (the fixer's cut: 53 eddies).
   ```

8. **Deadline.** A contract not delivered in time expires. A shard of an expired contract goes
   stale and leaves your pockets. `/netrun abandon` gives back a contract you have not breached
   yet; a breached contract cannot be abandoned.

### The fixer

You need the `fixer` job and must be on duty.

- **Post.** At the fixer drop, **E** on **Talk to the fixer** opens the board with
  **Post a contract** at the bottom. Pick a terminal, then a reward inside its tier's range and a
  deadline in minutes. Posting costs you nothing: the client pays the reward on delivery, and you
  are paid your cut then. Every netrunner on duty hears about the new contract.
- **From chat.** `/netrun sites` lists the terminals with their reward and deadline ranges,
  `/netrun post <site> [reward] [minutes]` posts, `/netrun cancel <code>` pulls a contract nobody
  has taken yet.
- **Follow it.** You are told when your contract is taken, dropped, breached, delivered, burned or
  expired, for example "Ada Kovac took your contract 5RJ6." and
  "Contract 5RJ6 delivered by Ada Kovac: your cut 150 eddies."
- **Receive the shard.** When the netrunner hands it over, an offer card names the runner and the
  contract. **Y** accepts, **N** declines; both keys can be rebound under Pause > Settings > Key
  bindings, and `/interaction accept` or `/interaction decline` in chat do the same. Accepting
  passes the shard to your client: the netrunner is paid and your cut lands in your cash. A
  declined hand-over moves nothing and the netrunner keeps the shard.
- **Limits.** You may have three open contracts at once, and a terminal carries one live contract
  at a time. You cannot take a contract you posted.

### The Afterlife's own fixer

The board keeps three contracts of its own open, posting one more every minute while fewer are
open, each on a terminal nobody holds a contract for. The reward is drawn inside the tier's range,
rounded to 50 eddies. Its cut goes to the `fixer` society. These contracts are delivered at the drop.

### NCPD

An officer on duty sees a failed breach as a dispatch line and a toast, with a map pin at the
terminal for a minute:

```text
[NCPD DISPATCH] NETRUNNER: ICE trace: breach attempt at Junction box above the Afterlife (6 m)
```

The dispatch does not name the runner. The trace is written to the runner's record (`/casier <id>`
shows "Traced:" and the terminal), and the data shard and the quickhacks are contraband that
`/fouille` finds.

### What everyone nearby sees

The netrunner's pose at the desk, the tablet or the laptop, and the give gesture at the drop. The
server plays the postures, so every player nearby sees the same scene.

### Commands

| Command | What it does |
|---|---|
| `/netrun` | Your status: job and duty, your contract and where to go, the deck, quickhacks and chips in your pockets, cooldowns. |
| `/netrun contracts` | The board in chat. |
| `/netrun board` | Opens the board menu, within 15 m of the fixer drop. |
| `/netrun take <code>` | Takes an open contract. |
| `/netrun abandon` | Gives back a contract you have not breached. |
| `/breach` | Starts the breach at the terminal you stand at. |
| `/netrun deliver [fixer id]` | Delivers at the drop, or hands the shard to the player fixer who posted the contract. |
| `/netrun sites` | Fixers: the terminals, their tier, reward and deadline ranges. |
| `/netrun post <site> [reward] [minutes]` | Fixers: posts a contract. |
| `/netrun cancel <code>` | Fixers: pulls your own open contract. |
| `/netrun help` | The usage line. |

Site keys for the commands are `watson_junction`, `den_node`, `corp_lobby`, `club_office`,
`plaza_desk` and `office_workstation`.

### Quickhacks

An on-duty netrunner can also hack other players. Each quickhack burns one item from the pockets,
has a 30-second cooldown and leaves a trace one time in two (a dispatch line and a record entry, no
heat).

| Command | What it does |
|---|---|
| `/ping <id>` | Burns a Quickhack: Ping. A pin follows that player on your map for 60 s. The target must be within 50 m. |
| `/court_circuit <id>` | Burns a Quickhack: Short Circuit when the upload starts: Short Circuit within 25 m, in line of sight. |
| `/surchauffe <id>` | Burns a Quickhack: Overheat when the upload starts: Overheat with its burn, within 25 m. |
| `/brouiller` | Burns a Quickhack: Jammer. NCPD radio turns to static for 60 s. |
| `/netrun deck <short_circuit\|overheat>` | Loads that grade into your cyberdeck. |

ALT+click on a player offers **Ping**, **Short Circuit**, **Overheat** and **Hand over the data
shard** while you are an on-duty netrunner. Short Circuit and Overheat use the platform's
[hacking kit](hacking.md): your operating-system slot holds one grade at a time, so the first
Overheat after a Short Circuit loads the Overheat grade and asks you to run the hack again once it
says "Deck ready".

### Where the kit comes from

- **Data chips** are an `rp_inventory` item that scrappers find in wrecks and salvage.
- **Quickhack: Ping** is sold by Dex, the black-market dealer under Kabuki Market, at night.
- **Short Circuit, Overheat and Jammer** have no seller in the pack: add them to a shop of yours,
  or hand them out with `netrun.give`.

## Money, items and what can go wrong

Every step that moves value is one [`open77_transactions`](transactions.md) operation, and the
delivery is one `rp_economy` sale.

| What happens | Items | Money |
|---|---|---|
| A contract is posted | A contract record is created on the board | Nothing |
| A netrunner takes it | The record is marked taken | Nothing |
| A breach succeeds | One data chip is burned and the shard is created in the runner's pockets, in the same operation | Nothing |
| A breach fails | One data chip is burned; the third failure burns the contract | Nothing |
| A breach is stopped (X, moving away, death, a car, clocking out, a disconnect) | Nothing | Nothing |
| The shard is delivered | The shard is burned | The reward is created and split: the runner's share in cash, the cut to the posting fixer's cash or to the `fixer` society |
| A hand-over is declined or cancelled | The runner keeps the shard | Nothing |
| A contract expires | The record is retired; a breached contract's shard goes stale | Nothing |
| A fixer cancels an open contract, or a runner abandons one | The record is retired, or goes back on the board | Nothing |

A delivery pays exactly once. Its operation id is fixed per contract, so a retried delivery returns
the first receipt instead of paying again.

### Disconnects and restarts

- **The board** lives in the database: a restart of the resource or the server rebuilds it, with
  every contract, its taker, its attempts and its deadline.
- **A taken contract** belongs to the character, not the session. A netrunner who disconnects finds
  it again on reconnecting. The deadline keeps running while they are away.
- **The shard** is in the netrunner's pockets and survives a disconnect and a restart.
- **A breach in progress** when the netrunner disconnects or the resource stops is released: no chip
  is burned and no shard is created.
- **A delivery cut short by a stop**, after the sale and before the contract left the board: the
  next start finds the sale paid and retires the contract without paying again.
- **Forgotten on a restart:** a hand-over waiting for consent (the runner keeps the shard), a
  terminal's ICE alert, quickhack cooldowns, a running ping or jammer. Heat the job raised is
  lowered again when the resource stops.

## Set up the netrunner job

### Requirements

- A [MySQL or MariaDB database](database.md). The board, the pockets and the cyberdeck records need
  it.
- The platform libraries `open77_transactions`, `open77_actions`, `open77_uikit`,
  `open77_contextmenu` and `open77_hacking`, with the libraries `open77_actions` depends on
  (`open77_animations`, `open77_props`, `open77_interactions`).
- The RP pack resources `rp_jobs`, `rp_inventory`, `rp_economy` and `rp_ncpd`.
- Optional: `open77_player_interactions` for the hand-over to a player fixer (without it, a player
  fixer's contract is delivered at the drop), `open77_notifications` for toasts, `rp_identity` to
  name players by their character.
- Clients with the RP animation archive for the poses: `amb_d7c499_sit_chair_table_keybo` at the
  desks, `tablet2` at the den and `laptop` at the junction box
  ([animation catalogue](rp-animation-catalogue.md)). A client without them runs the breach without
  the pose.

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first:

```jsonc
"resources": {
  "load": [
    // ...your existing resources...
    "open77_transactions", "open77_props", "open77_animations", "open77_interactions",
    "open77_uikit", "open77_actions", "open77_player_interactions", "open77_contextmenu",
    "open77_notifications", "open77_hacking",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_ncpd", "rp_identity",
    "rp_netrunner"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### Let the job write and create shards

Two `open77_transactions` settings decide which resources may change which accounts and who may
create items ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Set them
once in the server console:

```text
tunable.set open77_transactions writers rp_netrunner:char+stash/contracts, rp_economy:cash+bank+soc, rp_inventory, <your other writers>
tunable.set open77_transactions mint1 rp_netrunner sys:netrunner * 300; rp_inventory sys:* * 2000; rp_economy sys:* money 2000000
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add these entries to it: the job writes the netrunner's pockets and its contract board,
  and `rp_economy` writes the wallets and societies the delivery pays. Keep your other jobs'
  entries.
- **mint rules.** The first rule lets the job create up to 300 contract records and shards an hour.
  The `rp_inventory` and `rp_economy` rules are the ones the RP pack already needs: the delivery's
  reward is money `rp_economy` creates. Keep the rules you already have; use any free `mint1` to
  `mint6`, or append a rule to an existing one with `;`. Without the job's rule, posting is refused
  with "The board cannot create that (operator: a mint rule is missing)."

`rp_economy` also caps the money each resource may have it create: `rp_netrunner` is on its
allowlist at 30,000 eddies an hour (`EconomyConfig.mint.callers` in `rp_economy`'s
`server/config.lua`). Raise it for a busy server.

### Start the job

```text
ensure open77_transactions
ensure open77_actions
ensure rp_netrunner
```

These three declare `auto_start false`. To start them with the server, put the same lines in
`server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure rp_netrunner"
  ]
}
```

The server log then shows:

```text
[rp_netrunner] deck rp_netrunner.deck v1 defined: short_circuit, overheat
[rp_netrunner] coordinator ready (store=sql)
[rp_netrunner] items defined through rp_inventory: 6
[rp_netrunner] ready: 6 breach sites, 1 fixer drop(s), 7 targets, 0 contract(s) on the board (job netrunner)
```

### Staff the job

The `netrunner` and `fixer` jobs ship with `rp_jobs`. Neither is joined at the employment agency:
a boss hires, or an admin gives the job. In the server console:

```text
setjob 12 fixer 3          # player 12 becomes the fixers' boss
setjob 14 netrunner 3      # player 14 becomes the netrunners' boss
```

Each boss then hires staff with `/embaucher <playerId> [grade]`, or by ALT+clicking a player and
picking **Hire into Netrunner** or **Hire into Fixer**, and everyone clocks in with `/service`. A
netrunner's grade raises the breach odds by 8 % per grade. For a quick test,
`netrun.setup <playerId> [netrunner|fixer] [grade]` gives the job and puts the player on duty in one
step.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins. Each one
takes explicit player ids and goes through the same server path as the prompts.

| Command | What it does |
|---|---|
| `netrun.status` | Counters and every contract on the board |
| `netrun.setup <id> [netrunner\|fixer] [grade]` | Gives the job and the grade (0 to 3) and puts the player on duty |
| `netrun.give <id> <item> [count]` | Items into a player's pockets: `chip`, `qh_ping`, `qh_short_circuit`, `qh_overheat`, `qh_jammer` |
| `netrun.post <site> [reward] [minutes] [fixer id]` | Posts a contract, as the board itself or for that player fixer |
| `netrun.take <id> <code>` | Takes a contract for that player |
| `netrun.breach <id> [site]` | Starts the breach for a player standing at the terminal |
| `netrun.talk <id>` | The fixer drop's prompt for that player: the board, or the delivery |
| `netrun.deliver <id> [fixer id]` | The drop, or the hand-over to that fixer |
| `netrun.expire <code>` | Expires a contract now |
| `netrun.state <id>` | A player's contract, chips, shards, cash, grade, current odds and terminal position |

To let an admin use them in game, add the permissions to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.netrun.*",
  "command.setjob"
]
```

The player commands (`/netrun`, `/breach`, `/ping`, `/court_circuit`, `/surchauffe`, `/brouiller`)
need no ACL: the job checks the job and duty itself.

## Configuration

The contract job is in the resource's `server/config.lua` (`NetrunnerConfig`); the quickhacks are
in `shared/config.lua` (`Config`), which the client also reads. Rewards are in eddies, durations in
milliseconds and positions in metres. After an edit, run `restart rp_netrunner`: the board is kept,
and a breach running at that moment is released with nothing used.

| Key | Default | Meaning |
|---|---|---|
| `job`, `fixerJob` | `netrunner`, `fixer` | The `rp_jobs` jobs that breach and post |
| `tiers[1..3]` | see the tier table | Per tier: `label`, `durationMs` (the bar), `baseChance`, `reward` and `minutes` ranges with a `default` |
| `difficulty` | `gradeBonus 8`, `retryPenalty 5`, `minChance 10`, `maxChance 95` | How the grade and earlier attempts move the odds |
| `poses` | `desk`, `tablet`, `laptop` | The pose of each kind of terminal; `required = false` lets a client without it breach anyway |
| `sites` | six terminals | Per terminal: `key`, `label`, `area`, `tier`, `pose`, `npc` (the board may post on it), `enabled`, `position`, `yaw` |
| `maxDistance`, `promptDistance` | `2.5`, `2.0` | How close the netrunner must stand, and where the prompt shows |
| `fixers` | the Afterlife back room, `-1419.9, 989.4, 16.6` | The fixer drop: the board and the shard drop |
| `npcBoard` | on, `open 3`, `everyMs 60000`, `round 50` | The board's own contracts |
| `cut` | `rate 0.15`, `npcTo` the `fixer` society | The fixer's share of every reward; `0` for none |
| `contracts` | `maxOpen 24`, `maxPerFixer 3`, `oneBySite true` | Board limits |
| `failure` | `mode retry`, `maxAttempts 3`, `siteAlertMs 60000` | `retry` keeps the contract with the runner, `reopen` puts it back on the board, `fail` burns it at once |
| `trace` | dispatch, record, `wantedLevel 1` for `wantedMs 120000`, `revealName false` | What a failed breach leaves; `wantedLevel = 0` turns the heat off, `revealName = true` names the runner in dispatch |
| `breach` | `chip` x1 | The kit an attempt burns; `item = nil` for none |
| `deliver` | `durationMs 2500`, `dropWhenFixerAway true`, hand-over within 3 m, 20 s to answer | The delivery |
| `cooldownMs`, `traceChance` | `30000`, `0.5` | Quickhacks: cooldown per kind, and the chance of a trace |
| `hacks`, `ping`, `jam`, `deck` | 25 m, 60 s, 60 s, free | Quickhack ranges and durations; `deck.price` charges for loading a grade |

### Add a terminal

1. Stand where the netrunner should work, facing the keyboard or the box. Type `/pos` to copy your
   position, and `/rot` for your yaw.
2. Append a site to `C.sites` in `server/config.lua`, with the pose that fits the spot: `desk` for
   a chair at a keyboard, `tablet` standing, `laptop` sitting on the ground.
3. `restart rp_netrunner`. The log's `ready:` line counts the new site, and `/netrun sites` lists it.

```lua
-- server/config.lua, a new entry at the end of C.sites
{
    key = "my_terminal", label = "Back-alley terminal", area = "Kabuki, Watson",
    tier = 1, pose = "tablet", npc = true, enabled = true,
    position = { x = 0.0, y = 0.0, z = 0.0 },   -- replace with /pos at the terminal
    yaw = 0.0,                                   -- replace with /rot, facing the terminal
    measured = true, source = "walked in game",
},
```

To retire a terminal, set `enabled = false` instead of deleting the entry. A contract already
posted on it can no longer be breached and expires at its deadline.

### Pay more, cut more, forgive less

```lua
-- server/config.lua
C.tiers[1].reward = { min = 400, max = 900, default = 600 }      -- street nodes pay better
C.tiers[3].durationMs = 30000                                     -- a datafort takes 30 s
C.cut = { rate = 0.20, npcTo = { society = "fixer" } }            -- the fixer keeps 20 %
C.failure = { mode = "reopen", maxAttempts = 2, siteAlertMs = 120000 }  -- a failure puts the contract back on the board
C.trace.wantedLevel = 2                                           -- a trace brings more heat
C.trace.revealName = true                                         -- dispatch names the runner
```

To run the board with player fixers only, set `C.npcBoard.enabled = false`.

## For resource authors

The job publishes a host-wide event after every committed step and exposes exports. The fixer
board (`rp_fixer`) listens to `breach_success` for its breach job orders; see
[Fixer](rp-job-fixer.md).

```lua
-- server, after every committed step
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "netrunner"; e.kind is "breach_success", "breach_failed" or "deliver"
    -- e.data = { contract, code, site, tier, reward, cut, poster, fixer, point,
    --            success, chance, grade, attempt, traced, outcome (breaches), net, via (delivery) }
end)
AddEventHandler("rp_netrunner:contract", function(phase, summary)
    -- phase: posted, taken, abandoned, breached, attempt_failed, failed, delivered, expired, cancelled
end)
AddEventHandler("rp_netrunner:traced", function(e) end)    -- { playerId, site, label, position, contract, ref, wantedLevel }
AddEventHandler("rp_netrunner:jammed", function(active) end)

-- synchronous reads
exports.rp_netrunner:contracts({ state = "open" })   -- summaries: code, site, tier, reward, cut, net, secondsLeft, ...
exports.rp_netrunner:contract("K7Q2")                 -- one contract by code or id
exports.rp_netrunner:sites()                          -- terminals with their ranges and whether they are busy
exports.rp_netrunner:activeContract(playerId)         -- the contract a netrunner holds
exports.rp_netrunner:isJamming()

-- writes (they yield): post as the board, or for a player fixer on duty
Open77.exports.call("rp_netrunner", "post", { site = "corp_lobby", reward = 1200, minutes = 45, fixer = 3 }):await()
Open77.exports.call("rp_netrunner", "cancel", "K7Q2", 3):await()   -- an open contract, by its poster
```

A trace also raises `rp_ncpd:alert("netrunner", position, text, 0)` and writes
`exports.rp_ncpd:addRecord(playerId, "netrunner", text, 0)`.

## When something is refused

The job explains every refusal in words. The ones players meet most, and the ones an operator can
fix:

| The player reads | Fix |
|---|---|
| "Off duty. /service to jack in first." | Clock in. |
| "You are no netrunner. Find a fixer who trusts you with a deck." | Get the `netrunner` job from a boss or an admin. |
| "Only a fixer on duty posts contracts." | Get the `fixer` job and clock in. |
| "You already hold a contract: finish or abandon it first (/netrun)." | One contract at a time. |
| "Your contract is not for this terminal. /netrun shows where to go." | Go to the contract's terminal. |
| "You need a data chip to jack in (the breach kit)." | Bring a data chip. |
| "The ICE on this terminal is on alert after a failed breach: give it a minute." | Wait for the alert to end. |
| "Someone is already jacked into that terminal." | Another player is breaching there. |
| "That site already has a live contract." | Pick another terminal. |
| "That reward is outside the tier's range (/netrun sites)." | Use a reward inside the range. |
| "You already have the most open contracts a fixer may post." | Wait for one to be taken or expire, or cancel one. |
| "The fixer who posted it is in the city: hand them the shard in person (/netrun deliver <their id>)." | Find the fixer and hand it over. |
| "Hand-overs are unavailable on this server (open77_player_interactions)." | Start `open77_player_interactions`. |
| "The board cannot create that (operator: a mint rule is missing)." | Add the job's [mint rule](#let-the-job-write-and-create-shards). |
| "The board's accounts are not writable (operator: writers policy)." | Add the job to `writers`. |
| "The fixer's client is out of money for this hour." | The `rp_economy` hourly cap is used up: wait, or raise `rp_netrunner` in `EconomyConfig.mint.callers`. |
| "The contract board is offline for now (the ledger is unavailable)." | Check `open77_transactions` and the database. |

## Limits

- **One contract per netrunner**, one live contract per terminal, three open contracts per player
  fixer and 24 contracts on the board.
- **Terminal positions** come from the game's own work spots: the desks are office workstations
  where a pedestrian types in the base game. Stand at each terminal you open on your server and
  correct it with `/pos` if the pose does not sit right.
- **The crowd.** The terminals keep walking pedestrians away, but an NPC already standing on a
  terminal is not moved.
- **NCPD heat is local.** The heat a trace raises is applied in the netrunner's own game: the police
  it brings are seen by that player only. While a client has world population suppressed, its game
  refuses the heat ([wanted level](server-api.md#wanted-level-and-ncpd-dispatch)); the dispatch and
  the record still happen.
- **The shard belongs to the taker.** Given to someone else, it cannot be delivered by them, and it
  goes stale with the contract.
- **Hand-over messages.** A cancelled hand-over names the reason with a short code, for example
  "The hand-over was cancelled (player_moving): you keep the shard."
- **New money.** Rewards are created on delivery, capped by `rp_economy` at 30,000 eddies an hour
  for this job.
- **Poses** need the RP animation archive on the client; without it the breach runs without them.
- **Quickhacks** need `open77_hacking` and a cyberdeck record, which needs the database.
