# Roleplay jobs

Ready-made Night City jobs for a roleplay server: a ripperdoc who installs real cyberware, a
CHOOH2 supply chain, a fixer's contract board and more. Each job is a Lua resource in the
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

| Job | What players do | Status |
|---|---|---|
| [Ripperdoc](rp-job-ripperdoc.md) | Quote a patient at Viktor's clinic, operate in the chair and install real cyberware; keep the clinic stocked with chrome from a dealer. | Available |
| CHOOH2 chain | Harvest corn at the Biotechnica farm in the Badlands, truck it to the Petrochem refinery, turn it into CHOOH2 and sell it or refuel with it. | Coming soon |
| Techie and weaponsmith | Buy salvage, strip it for parts, build components at workbenches in several stages and sell them. | Coming soon |
| Netrunner | Take a contract, breach a device against the clock, risk a trace and NCPD attention on a failure, and deliver the data shard. | Coming soon |
| Fixer board | Post and take escrowed contracts, job orders and cyberpsycho bounties, and build a reputation. | Coming soon |
| Trauma Team | Sell subscriptions, answer a downed subscriber's call, stabilise and evacuate them, and bill the call. | Coming soon |
| Nomad smuggler | Pick up contraband at the Aldecaldos camp, drive it past NCPD checkpoints and deliver it in the city. | Coming soon |

A job marked "Coming soon" gets its own page here when it is available.

## What the jobs have in common

- **A job and a shift.** Workers hold the job through `rp_jobs` and clock in with `/service`.
  Clocking out stops the work in progress.
- **Prompts and progress bars.** Walk up to a work spot and press **E** on its card. A bar shows
  how long the work takes; **X** stops it.
- **Consent.** When a job involves another player, that player sees an offer card: **Y** accepts,
  **N** declines. Both keys can be rebound under Pause > Settings > Key bindings, and
  `/interaction accept` or `/interaction decline` in chat do the same.
- **Money and items move once.** A payment and the items it pays for are saved together. Work
  that is cancelled or interrupted before it completes moves nothing, and a retried payment is
  not charged twice.
- **Shown to everyone.** The server plays the work postures, so every player nearby sees the same
  scene.

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
6. **Staff it.** Players join a job the way `rp_jobs` defines for it: at the employment agency,
   or hired by the job's boss. In the server console, `setjob <playerId> <job> <grade>` gives a
   job directly, for example to appoint the first boss.

## Where to go next

- [Ripperdoc: Viktor's clinic](rp-job-ripperdoc.md): the first available job, from the patient's
  chair to the server console.
- [Jobs and world interaction](world-interaction.md): the example jobs and the libraries behind them.
- [Cyberware](cyberware.md): the implants the ripperdoc installs.
