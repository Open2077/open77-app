# Roleplay jobs

Ready-made Night City jobs for a roleplay server: a ripperdoc who installs real cyberware, a CHOOH2
fuel chain from the corn rows to the depot, a techie's workbench, netrunners breaching for fixers, a
contract board, Trauma Team and Aldecaldos smugglers. Each job is a Lua resource in the
[Open2077/open77-resources](https://github.com/Open2077/open77-resources) repository, under `rp/`,
and runs on the same building blocks: prompts and timed work from
[`open77_actions`](actions.md), item and money transfers saved as one operation by
[`open77_transactions`](transactions.md), and offers the other player accepts through
[player interactions](player-interactions.md).

This section is for two readers: players who want to know how a job plays, and server owners
who want to run it. Each job page covers both. To write a job of your own instead, start with
[Build your first Lua job](build-a-job.md).

Like the [world-interaction libraries](world-interaction.md) they use, these jobs are
experimental. Run a job on a test server with two players before opening it to your community.

## The jobs

| Job | What players do | Where |
|---|---|---|
| [Ripperdoc](rp-job-ripperdoc.md) | Quote a patient, operate in the chair and install real cyberware, paid once; keep the clinic stocked with chrome from a dealer. | Viktor's clinic, Little China; the chrome dealer in Kabuki Market |
| [CHOOH2 chain](rp-job-chooh2.md) | Harvest corn into crates, truck them to the refinery, ferment them into CHOOH2 canisters, then sell the canisters at the depot or pour them into a car. | The Biotechnica protein farm on the northern edge of Northside; the Petrochem tank farm of the North Sunrise Oil Field |
| [Techie](rp-job-techie.md) | Buy salvage from a dealer or a scrapper, strip it at the workbenches, assemble weapon mods and cyberware components in stages, and sell them to a shop or a player. | The Kabuki west workshop; Wilson's stall and Dr. Osei's Med-Point |
| [Netrunner](rp-job-netrunner.md) | Take a breach contract, jack into a real terminal against the clock, risk an NCPD trace on a failure, and deliver the data shard for the reward minus the fixer's cut. | The Afterlife's back room and six terminals across the city |
| [Fixer board](rp-job-fixer.md) | Take escrowed deliveries, retrievals, job orders and cyberpsycho bounties, or post your own contracts as a fixer, and build the reputation that unlocks better-paid work. | Rogue at the Afterlife, Wakako's in Japantown, Regina's corner in Kabuki |
| [Trauma Team](rp-job-trauma-team.md) | Sell Silver, Gold and Platinum plans; answer a downed player's call, fly the AV out, stabilise and evacuate them, billed to their plan or their wallet. | Plan kiosks at The Stalls and on the Afterlife street; the AV pad outside the Afterlife |
| [Nomad smuggler](rp-job-nomad.md) | Take a run at the Aldecaldos camp, carry contraband crates into a truck, get past the NCPD checkpoints and hand the crates to a fence; NCPD officers can search the truck. | The Aldecaldos camp in the Badlands; drops at the Afterlife and Lizzie's Bar |

## What the jobs have in common

- **A job and a shift.** Workers hold the job through `rp_jobs` and clock in with `/service`.
  Clocking out stops the work in progress.
- **Prompts and progress bars.** Walk up to a work spot and press **E** on its card. A bar shows
  how long the work takes; **X** stops it, and work stopped before its bar ends moves nothing. A
  work spot holds one player: another player standing on it is refused with "Someone is standing
  there."
- **Consent.** When a job involves another player, that player sees an offer card that names who
  offers what: **Y** accepts, **N** declines. Both keys can be rebound under Pause > Settings > Key
  bindings, and `/interaction accept` or `/interaction decline` in chat do the same. Trauma Team
  asks an uninsured patient to accept the charges in a dialog instead.
- **Crates in your hands.** The CHOOH2 chain, the nomad runs and some fixer contracts use crates you
  carry. **E** picks one up; while you carry it you walk, and cannot sprint, jump or fight. **G**
  sets it down, and **E** at a truck's tailgate loads it into the bed.
- **Money and items move once.** A payment and the items it pays for are saved together. Work
  that is cancelled or interrupted before it completes moves nothing, and a retried payment is
  not charged twice.
- **Refusals in words.** A refused action says why, in the job's own words. Each job page lists
  them, with what an operator can fix.
- **Names are characters.** When `rp_identity` runs, offers, boards and notices name players by
  their character, not by their account.
- **Shown to everyone.** The server plays the work postures, so every player nearby sees the same
  scene.

## How the jobs connect

- The [fixer board](rp-job-fixer.md)'s job orders pay for work the other jobs report: a netrunner's
  successful breach, an implant installed at the ripperdoc, CHOOH2 canisters refined at Petrochem,
  an assembly at the techie's bench, a Trauma Team stabilisation or a nomad's delivered crate.
- The [netrunner](rp-job-netrunner.md)'s contracts are posted by players with the fixer job, and a
  failed breach reaches the NCPD officers on duty.
- The [CHOOH2 chain](rp-job-chooh2.md) and the [nomad runs](rp-job-nomad.md) load crates into the
  same truck beds (`rp_cargo`), and a nomad on duty may haul corn.
- A [Trauma Team](rp-job-trauma-team.md) patient wakes up at Viktor's clinic, where the
  [ripperdoc](rp-job-ripperdoc.md) works.

## Setting up a job

Every job page lists its exact resources and settings. The steps are the same for all of them:

1. **Database.** The jobs store items and money in SQL: configure a
   [MySQL or MariaDB database](database.md) first.
2. **Inventory backend.** Pockets, stashes and wallets must be accounts of `open77_transactions`.
   Set the convar in `server.jsonc`:

   ```jsonc
   "convars": {
     "rp_inventory_backend": "transactions"
   }
   ```

3. **Load the resources.** Add the libraries, the RP pack resources and the job to
   `resources.load`, libraries first. See [Lua resources](server-resources.md#selecting-which-resources-load).
4. **Allow the job to move value.** In the server console, give the job a `writers` entry and,
   when it creates items or money, a mint rule
   ([who may write](transactions.md#who-may-write-and-who-may-create-value)). Keep the entries of
   your other jobs.
5. **Start it.** `open77_transactions`, `open77_actions` and most jobs declare
   `auto_start false`: start them with `ensure`, or list the `ensure` lines in
   `startup.commands` so they start with the server.
6. **Staff it.** Players join a job the way `rp_jobs` defines for it. Agency jobs are joined at the
   employment agency on the Kabuki Gallery (`/agence`); the others are hired by the job's boss with
   `/embaucher <playerId>` or by ALT+clicking a player. In the server console,
   `setjob <playerId> <job> <grade>` gives a job directly, for example to appoint the first boss.

The jobs and the `rp_jobs` names they use, all shipped with `rp_jobs`:

| Job page | `rp_jobs` job | How players get it |
|---|---|---|
| Ripperdoc | `ripper` | Hired |
| CHOOH2 chain | `farmhand`, `refinery` | Agency |
| Techie | `techie` | Agency |
| Netrunner | `netrunner`; contracts posted by `fixer` | Hired |
| Fixer board | `fixer` posts contracts; anyone takes them | Hired |
| Trauma Team | `trauma` | Hired |
| Nomad smuggler | `nomade`; searches by `ncpd` | Agency; NCPD is hired |

### Run every job on one server

A server that runs all seven jobs loads the union of their resources. `rp_trauma` replaces
`rp_medic`: do not load both.

```jsonc
"resources": {
  "load": [
    // ...your existing resources, without rp_medic...
    "open77_animations", "open77_props", "open77_interactions",
    "open77_transactions", "open77_actions", "open77_containers", "open77_player_interactions",
    "open77_uikit", "open77_contextmenu", "open77_notifications",
    "open77_cyberware", "open77_hacking", "open77_fuel",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_bank", "rp_zones", "rp_identity",
    "rp_garage", "rp_cargo", "rp_ncpd",
    "rp_ripperdoc", "rp_chooh2", "rp_techie", "rp_netrunner", "rp_fixer", "rp_trauma", "rp_nomade"
  ]
}
```

The default `writers` value `*` lets every resource write. If your server uses a list, the jobs'
entries together do not fit in one text tunable, which holds at most 256 characters: `writers2` to
`writers4` continue the list. Each mint tunable has the same limit, so the rules are spread over
four of the six slots:

```text
tunable.set open77_transactions writers rp_ripperdoc:cash+bank+soc+char+stash/stock, rp_trauma:cash+bank+soc+stash/tti, rp_techie:stash/tray+char+cash, rp_netrunner:char+stash/contracts, rp_fixer:char+stash
tunable.set open77_transactions writers2 rp_chooh2:world+stash+char, rp_nomade:world+stash+char, rp_cargo:veh/cargo, open77_containers:world, rp_economy:cash+bank+soc, rp_inventory
tunable.set open77_transactions writers3 <your other writers>
tunable.set open77_transactions mint1 rp_inventory sys:* * 2000; rp_economy sys:* money 2000000
tunable.set open77_transactions mint2 rp_ripperdoc sys:ripperdoc.supplier * 40; rp_netrunner sys:netrunner * 300; rp_trauma sys:trauma.plans tti_card 500; rp_trauma sys:trauma.billing tti_invoice 2000000
tunable.set open77_transactions mint3 rp_chooh2 sys:chooh2.fields * 2000; rp_chooh2 sys:chooh2.refinery chooh2_canister 400; rp_nomade sys:nomad nomad_crate 500; rp_nomade sys:nomad.supplier nomad_contraband 2000
tunable.set open77_transactions mint4 rp_techie sys:techie.workshop * 960; rp_techie sys:techie.dealer * 540
```

If your server already uses some of these slots, append the rules to them with `;` instead,
keeping each value under 256 characters. `transactions mints` in the console lists every rule with
this hour's use; a rule the coordinator cannot read is logged as `mint rules: ignored entry`. Size
the hourly caps to your server: each job page explains its own.

Then start the libraries and the jobs. `rp_trauma` starts on its own once the libraries it waits
for are running:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure open77_containers",
    "ensure rp_cargo",
    "ensure rp_ripperdoc",
    "ensure rp_chooh2",
    "ensure rp_techie",
    "ensure rp_netrunner",
    "ensure rp_fixer",
    "ensure rp_nomade"
  ]
}
```

## Platform features the jobs rely on

Three platform changes came with these jobs. They matter to a server that runs them, and to anyone
writing a job of their own.

- **Lying down on beds.** [Seating](furniture.md) offers "Lie down on the bed" on the measured
  double-bed family, next to sitting and leaning, and `/sit` takes those beds too. One player per
  bed; the player lies down from where they stand. The convar `open77_seating_postures` (a comma
  list of `sit`, `lean` and `lie`, `all` by default) narrows the postures; `sit,lean` turns the bed
  prompts off.
- **The cyberware lab is for operators.** `open77_cyberware_lab` (`/cyberlab`) installs implants and
  changes health, stats and abilities with no ripperdoc and no payment. Every player may still use
  it on themselves; acting on another player or on the whole server needs the server console or the
  ACL right `command.cyberlab.others`, and anyone else is refused with `operator_required`. A
  roleplay server that sells cyberware through the ripperdoc should not start the lab at all, or
  keep it to operators. See [Cyberware](cyberware.md).
- **Client scripts clean up on stop.** A resource's client script hears that it stops through
  `onClientResourceStop(name, reason)`; `onResourceStop` is never sent to a client script. The
  platform resources the jobs use release their locks, effects and leases there, so restarting a
  job or a library with players connected leaves nobody stuck. In your own client scripts, put the
  stop cleanup in an `onClientResourceStop` handler that checks the resource name:

  ```lua
  -- client
  AddEventHandler("onClientResourceStop", function(name)
      if name ~= GetCurrentResourceName() then return end
      -- release what this script holds: input locks, effects, props, HUD
  end)
  ```

## Where to go next

- [Ripperdoc: Viktor's clinic](rp-job-ripperdoc.md): from the patient's chair to the server console.
- [Fixer: the contract board](rp-job-fixer.md): the board that pays for the other jobs' work.
- [Jobs and world interaction](world-interaction.md): the example jobs and the libraries behind them.
- [Actions and carrying](actions.md): the prompts, timed work and crates every job uses.
- [Cyberware](cyberware.md): the implants the ripperdoc installs.
