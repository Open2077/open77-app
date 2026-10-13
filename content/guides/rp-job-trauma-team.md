# Trauma Team: plans, calls and evacuations

Death on the server stops being an instant respawn. A player who goes down stays down where they
fell, and Trauma Team International answers: citizens buy Silver, Gold or Platinum plans at a
kiosk, a downed player raises a call with their plan's priority, and an on-duty medic flies or
drives out, stabilises the body and evacuates it to Vik's clinic. Every charge is held before the
work and paid once, after it.

The job is the [`rp_trauma`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_trauma)
resource, version 2.0, from the Open2077/open77-resources repository. It is built on the
[world-interaction libraries](world-interaction.md) and is experimental like them.

| | |
|---|---|
| Where | Plan kiosks at The Stalls in Kabuki Market (the medical vending machine beside Dr. Osei's Med-Point) and on the Afterlife street. The AV pad is on the street outside the Afterlife. Patients wake up at Viktor Vektor's clinic in Little China (Watson). |
| Who works | Players with the `rp_jobs` job `trauma` (label "Trauma Team"), on duty |
| Who pays | The plan holder or the patient, from bank first, then cash; what they cannot pay becomes an invoice |
| Who is paid | The `trauma` society, and the responding medics a 40 % cut of every act |
| Plans | Silver, Gold and Platinum, 7 days each |
| Runs on | Server and client |

## How it plays

### Citizens: buying a plan

1. **Find a kiosk.** `/tti plans` lists the three plans and where the kiosks are. At The Stalls,
   the kiosk is the medical vending machine beside Dr. Osei's Med-Point.
2. **Open the menu.** Press **E** on **Trauma Team plans**, or type `/contrat` or `/tti buy` while
   standing at the kiosk. The menu, "Trauma Team International", shows each tier with its price,
   priority and what it covers. Your current plan, if any, is listed at the top with its time left.
3. **Pick a plan.** A 4-second bar runs ("Signing the Trauma Team contract") with a tablet in your
   hands. The price leaves your bank account, the cash wallet paying what the bank cannot, in one
   operation with your membership card:

   ```text
   Trauma Team Gold signed: active for 6 d 23 h (4000 eddies from your account). Priority 2. Auto-renewal on.
   ```

   - Picking your current tier again renews it: one more week after the current end, at most four
     weeks ahead.
   - Picking another tier starts it now; the rest of the old plan is lost. The menu says so on the
     row ("Starts now; the rest of your current plan is lost.").
   - **Leave** signs nothing, and so does a short wallet: nothing is held.
4. **Keep it.** A plan that ends is renewed automatically from your bank account while you are
   connected, once per period. If the account is short, the plan lapses and you are told once.
   `/tti autorenew off` stops the renewals; `/tti` shows your plan, its time left and what you owe.

### Citizens: going down

When you die, you stay **down**. The server's respawn happens, then you are brought back to where
you fell at 5 % health, frozen in a wounded seated pose, with every input blocked except the chat.
The screen shows a countdown:

```text
DOWN - Trauma Team notified - /respawn opens in 47 s
```

A call goes out at once:

- With a plan: "Trauma Team Gold: call #3 placed, priority 2. A team is on the way."
- Without: "No Trauma Team plan: emergency call #3 placed, the care is billed to you. Plans are
  sold at the Trauma Team kiosks (/tti plans)." An uninsured call reaches the medics 15 seconds
  later; a Silver call 5 seconds later.

When a medic takes the call, you read "Trauma Team medic Ada Kovac is responding to your call #3."

**With a plan,** nothing is asked: the plan's terms apply and you pay only the part it does not
cover.

**Without a plan,** a dialog asks you to accept the charges when the medic starts working:

```text
A Trauma Team medic is with you. You hold no plan: stabilisation 400 eddies and evacuation to Vik's
clinic 800 eddies are charged to you (bank, then cash; the rest is invoiced). Accept?
```

- **Accept the charges** (Enter) lets the medic work.
- **Refuse** (Esc) stops them: the medic is told "Ada Kovac refuses the charges: no treatment."
  and any new attempt in the next 60 seconds is refused at once.
- No answer within 15 seconds counts as unconscious: the medic treats you and you are billed after.

Once stabilised you read "Stabilised by Ada Kovac. Hold on: evacuation next. Charges: ...", your
health rises to 25 % and the countdown reads "STABLE - Trauma Team is evacuating you to Vik's
clinic". The evacuation fades your screen and you wake up at Vik's clinic with the health your plan
gives (50 %, 75 % or 100 %; 50 % without a plan), and a line listing the charges:

```text
Trauma Team brought you to Vik's clinic. Charges: 400 eddies covered by your plan, 400 eddies from your account.
```

### Citizens: /respawn and the hospital bill

`/respawn` wakes you up at Vik's clinic at full health once the countdown has run out. A server can
also open it at once when no medic is on duty (`countdownWithoutMedics`). The hospital bill is 500 eddies, and your plan covers its share: half
with Silver, all of it with Gold and Platinum. It closes your call.

What your wallets cannot pay, for any act, becomes an invoice. `/tti pay` settles invoices from the
bank, then cash.

### Trauma Team medics

You need the `trauma` job and must be on duty: type `/service` to clock in.

1. **Hear the call.** Every call reaches you as a chat line, a toast and a map pin:

   ```text
   [GOLD #3] Ada Kovac (id 3) is down at -1195, 2001, 8, 120 m away. /tti take 3 to respond.
   ```

   The pin's title carries the tag and the live distance: `[PLATINUM #3]`, `[UNINSURED #4]`, and
   `[TAKEN #3]` once a team has it. An untaken call is announced again every 60 seconds.
2. **Take it.** `/tti take` answers the best open call (priority first, then the oldest);
   `/tti take 3` a given one. One team per call: another medic reads "Another Trauma Team unit has
   this call." and can join with `/tti assist 3`. `/tti drop` leaves your calls; a call whose team
   is empty opens again for everyone.
3. **Get there.** Stand on the AV pad on the street outside the Afterlife and type `/trauma av`: the
   Trauma Team AV (a Militech Manticore) appears in front of you with you at the controls. Fly it to
   the patient, or drive. `/trauma av off` sends it back.
4. **Stabilise.** At the body, press **E** on **Stabilise the patient**. You kneel for 8 seconds;
   **X** stops it and nothing is charged. One medic works on a body at a time. The patient is now
   stable, still down, at 25 % health.
5. **Evacuate.** Press **E** on **Evacuate to Vik's clinic**: a 6-second bar, then the patient is
   moved to the clinic.

After each act you read your pay, for example "Ada Kovac is stable. Evacuate them (E on the body).
Pay: +160 eddies to your account." The other medics of the team within 30 m are paid their share
too.

The older acts remain, through **ALT+click** on a player or a command:

- **Patch up** (`/soin <playerId>`): heal a hurt citizen who is on their feet, 100 eddies. They
  accept the charges first; no answer is a no.
- **Revive** (`/reanimer <playerId>`): bring a down citizen back on their feet where they lie,
  300 eddies, at 50 % health. Same consent rules as Stabilise.

A medic waits 10 seconds between two of these acts.

### What everyone nearby sees

The patient in the wounded seated pose while down, the medic kneeling over the body while they
stabilise, then the patient disappearing when evacuated (their own screen fades). The server plays
the poses, so every player nearby sees the same scene. The **Stabilise** and **Evacuate** cards are
drawn over the body for medics only; the patient does not see them.

| Command | Who | What it does |
|---|---|---|
| `/tti` | Anyone | Your plan, its time left, your invoices and whether you are down; on-duty medics also get the dispatch. |
| `/tti plans` | Anyone | The three plans and where the kiosks are. |
| `/tti buy`, `/contrat` | Anyone | At a kiosk, open the plan menu. Elsewhere, `/contrat` shows your plan. |
| `/tti autorenew on\|off` | Plan holder | Turn the automatic renewal on or off. |
| `/tti pay`, `/trauma pay` | Anyone | Pay your invoices from the bank, then cash. |
| `/trauma bills` | Anyone | Your unpaid invoices. |
| `/trauma` | Anyone | Your status; on-duty medics also get the dispatch. |
| `/respawn` | Down player | Wake up at Vik's clinic after the countdown. |
| `/911 <message>` | Anyone | Alert Trauma Team and the NCPD on duty, with your position. |
| `/medic` | Anyone | The medics on duty and how far they are. |
| `/tti calls` | Medic | The open calls, best first. |
| `/tti take [callId]` | Medic | Take the best open call, or a given one. |
| `/tti assist <callId>` | Medic | Join the team of a taken call. |
| `/tti drop` | Medic | Leave your calls. |
| `/trauma av`, `/trauma av off` | Medic | Call the AV on the pad, or send it back. |
| `/soin <playerId>` | Medic | Patch up a citizen on their feet. |
| `/reanimer <playerId>` | Medic | Revive a down citizen where they lie. |

`/trauma factures` and `/trauma payer` are the same as `/trauma bills` and `/trauma pay`.

## Plans

| Plan | Price per 7 days | Priority | Stabilise | Evacuate | Vik's bill | Revive | Patch up | Health on arrival |
|---|---|---|---|---|---|---|---|---|
| Silver | 1500 | 3, calls held back 5 s | 100 % | 50 % | 50 % | 50 % | 0 % | 50 % |
| Gold | 4000 | 2 | 100 % | 100 % | 100 % | 100 % | 50 % | 75 % |
| Platinum | 10000 | 1 | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| No plan | | 9, calls held back 15 s | 0 % | 0 % | 0 % | 0 % | 0 % | 50 % |

Prices are in eddies. The percentages are the share of each fee the plan pays; the patient pays
the rest.

| Act | Fee |
|---|---|
| Stabilise | 400 |
| Evacuate | 800 |
| Vik's bill (`/respawn`) | 500 |
| Revive | 300 |
| Patch up | 100 |

## Money and what can go wrong

Every movement goes through `open77_transactions`. A plan purchase, a renewal, each act and each
invoice payment is one operation: everything in it is saved together or not at all.

| What happens | Money | Items |
|---|---|---|
| A plan is bought or renewed at a kiosk | The price leaves the holder's bank, then cash, to the `trauma` society | The membership card is created in the holder's Trauma Team file, or its end date is moved |
| A plan renews on its own | The price leaves the holder's bank only, to the society | The card's end date is moved |
| A medic stabilises, evacuates, revives or patches up | The patient pays the uncovered part from bank, then cash. 40 % of it goes straight to the team, the rest to the society. The society also pays the team 40 % of the covered part, while it can afford it | What the wallets miss is created as an invoice in the patient's file |
| A down player uses `/respawn` | The uncovered part of the 500-eddy bill, bank then cash, to the society | What the wallets miss becomes an invoice |
| A player pays invoices (`/tti pay`) | Bank, then cash, to the society | The paid invoices are destroyed |
| The patient refuses the charges, or the bar is stopped with **X** | Nothing is taken | Nothing is created |
| The patient leaves, gets up another way, or the medic drops out before the act ends | Nothing is taken | Nothing is created |
| A plan purchase finds a short wallet | Nothing is held, the kiosk says so | Nothing is created |

- **The team's cut.** The medics of the call's team (`/tti take`, `/tti assist`) who are on duty
  within 30 m of the patient when the act ends share it evenly; the one who acted takes the
  remainder. It is paid to their bank account. The rest stays with the `trauma` society.
- **Invoices pay the society,** not the medics, when the patient settles them.
- **No money is created.** The resource only creates two items: the membership card, out of the
  system account `sys:trauma.plans`, and invoices (one unit per eddy owed), out of
  `sys:trauma.billing`. Paying an invoice returns it there.
- **Charged once.** An act's charge is held before the bar and paid after it; a stopped bar releases
  the hold. A renewal has one fixed operation per period, so two sweeps or a restart never charge a
  period twice. If the server cannot confirm a payment, it settles on its own: "Trauma Team could
  not confirm that: nothing was charged, try again." appears only when nothing moved.
- **Billing offline.** If the payment system is unreachable when a medic starts, the care goes on
  and nothing is charged; the patient reads "billing offline: nothing charged".

A patient who pays from both wallets reads both, for example "80 eddies from your account, 720
eddies in cash".

### What survives a disconnect and a restart

- **Plans and invoices** live in the holder's Trauma Team file in the database
  (`stash:<subject>:tti`). They survive disconnects and restarts, and follow the character.
- **The down state survives.** A player who disconnects while down, or is down when `rp_trauma` or
  the server restarts, is down again when they are back: at the spot where they fell, at the same
  health (stable if a medic had stabilised them), with what their countdown had left. The countdown
  keeps running while they are away. They read, once:

  ```text
  You are still down where you fell. Trauma Team has been called again. /respawn opens in 23 s (Vik's bill 500 eddies).
  ```

  A down state older than 3 hours is forgotten, and the player comes back on their feet. Getting
  up by any path (`/respawn`, a revive, the evacuation, a heal, an operator) forgets it.
- **Calls and consents** are not kept. A player still down gets a new call with a new number, and an
  uninsured patient is asked again; the question then names only what is left to pay ("the
  evacuation to Vik's clinic (800 eddies) is charged to you" once stabilised). A responder whose
  patient disconnects reads "Call #3 closed: the patient disconnected."
- **While `rp_trauma` is stopped,** every held player is unfrozen at their down health, with no
  bill. The next start holds them down again and raises their calls again.

## Set up Trauma Team

### Requirements

- A [MySQL or MariaDB database](database.md) for the transaction coordinator.
- The platform libraries `open77_transactions`, `open77_actions` (with `open77_animations`,
  `open77_props` and `open77_interactions`), `open77_uikit`, `open77_contextmenu` and
  `open77_notifications`.
- The RP pack resources `rp_jobs`, `rp_inventory` and `rp_economy`. `rp_identity` is optional: with
  it, players are named by their character.
- Optional: `open77_pedestrians`, which keeps the crowd off a downed patient.
- **Not** `rp_medic`. `rp_trauma` includes its commands (`/soin`, `/reanimer`, `/911`, `/medic`); a
  command name registered twice is served by the first resource only.

### Load the resources

In `server.jsonc`, add the resources to `resources.load` after the ones you already have,
libraries first:

```jsonc
"resources": {
  "load": [
    // ...your existing resources, without rp_medic...
    "open77_animations", "open77_props", "open77_interactions",
    "open77_transactions", "open77_actions",
    "open77_uikit", "open77_contextmenu", "open77_notifications",
    "rp_jobs", "rp_inventory", "rp_economy", "rp_identity",
    "rp_trauma"
  ]
}
```

In the same file, make pockets, stashes and wallets accounts of `open77_transactions`. The
membership card and the invoices are declared through `rp_inventory`, which reaches the coordinator
only with this backend:

```jsonc
"convars": {
  "rp_inventory_backend": "transactions"
}
```

### Let Trauma Team write and issue cards

Set the two `open77_transactions` settings once in the server console
([who may write](transactions.md#who-may-write-and-who-may-create-value)):

```text
tunable.set open77_transactions writers rp_trauma:cash+bank+soc+stash/tti, rp_economy:cash+bank+soc, rp_inventory, <your other writers>
tunable.set open77_transactions mint1 rp_trauma sys:trauma.plans tti_card 500; rp_trauma sys:trauma.billing tti_invoice 2000000
```

- **writers.** The default `*` lets every resource write and needs no change. If your server uses
  a list, add these entries to it: Trauma Team moves money between the patient's wallets, the
  medics' bank accounts and the `trauma` society, and writes each holder's file. Keep your other
  jobs' entries.
- **mint rule.** Lets Trauma Team create up to 500 membership cards and 2,000,000 eddies of invoices
  an hour. Use any free `mint1` to `mint6`, or append the rules to an existing one with `;`. Without
  it, a plan is refused with "The Trauma Team service is not set up on this server (mint rule
  missing)."

### Start it

`rp_trauma` starts on its own (`auto_start true`), and its Trauma Team service starts once
`open77_transactions`, `rp_inventory` and `open77_actions` run. The first two libraries declare
`auto_start false`:

```text
ensure open77_transactions
ensure open77_actions
ensure rp_trauma
```

To start them with the server, put the same lines in `server.jsonc`:

```jsonc
"startup": {
  "commands": [
    "ensure open77_transactions",
    "ensure open77_actions",
    "ensure rp_trauma"
  ]
}
```

The server log then shows:

```text
[rp_trauma] coordinator ready (store=sql)
[rp_trauma] items defined through rp_inventory: 2
[rp_trauma] ready: 3 plans, 2 kiosk and patient targets, job trauma, society trauma
```

### Staff Trauma Team

The `trauma` job ships with `rp_jobs`. It is not joined at the employment agency: a boss hires
medics, or an admin sets the job. In the server console:

```text
setjob 12 trauma 3            # player 12 becomes Trauma Team's boss
```

The boss then hires medics with `/embaucher <playerId> [grade]`, or by ALT+clicking a player and
picking **Hire into Trauma Team**, and everyone clocks in with `/service`. For a quick test,
`tti.setup <playerId>` gives a player the job and puts them on duty in one step.

## Console and ACL

These commands are restricted: run them from the server console, or grant them to admins.

| Command | What it does |
|---|---|
| `tti.status` | Counters and the open calls |
| `tti.setup <playerId>` | Give the `trauma` job and put the player on duty |
| `tti.act <medicId> stabilise\|evacuate <patientId>` | Make a medic start an act on a patient, the same request the body's prompt makes |
| `tti.file <playerId>` | A player's plan, invoices and last receipts, as the database holds them |

To let an admin use them in game, add the permissions to their entry in your ACL file
([server ACL](server-acl.md)):

```json
"permissions": [
  "command.tti.*",
  "command.setjob"
]
```

The player commands need no ACL: Trauma Team checks the job and duty itself.

## Configuration

Plans, kiosks, fees, the medics' cut and the dispatch are in the resource's `server/config.lua`
(`TraumaConfig`), read by the server only. The down state, the hospital point, the AV and the older
acts are in `shared/config.lua` (`Config`). Prices are in eddies, durations in seconds unless the
key ends in `Ms`, positions in metres. After an edit, run `restart rp_trauma`.

| Key | Default | Meaning |
|---|---|---|
| `job`, `society` | `trauma`, `trauma` | The `rp_jobs` job that responds, and the society that is paid |
| `plans.<tier>` | see [Plans](#plans) | `price`, `periodHours`, `priority`, `dispatchDelaySeconds`, `covers.<act>`, `evacHealth`, `pitch` (the menu's line) |
| `maxPrepaidPeriods` | `4` | How many periods a holder can pay ahead |
| `autoRenew` | on, from the bank, checked every 30 s | Renewal of an ended plan while the holder is connected |
| `payFrom`, `invoices.payFrom` | `bank, cash` | Wallets that pay a plan, and a charge or an invoice |
| `fees` | stabilise `400`, evacuate `800` | The response acts' fees; the other three come from `shared/config.lua` |
| `medicShare`, `medicWallet`, `teamShareRadius` | `0.4`, `bank`, `30.0` | The team's cut, the wallet it is paid to, and who shares it |
| `consent` | 15 s, a refusal holds 60 s | The dialog shown to a patient without a plan |
| `calls` | uninsured calls on, priority `9`, held back 15 s, reminders every 60 s, at most 48 | Dispatch |
| `actions` | plan 4 s, stabilise 8 s (patient at 25 %), evacuate 6 s | Bars, labels and postures of the three actions |
| `kiosks` | The Stalls, Afterlife street | Where plans are sold |
| `evacuation` | Vik's clinic | Where an evacuated patient wakes up; by default the hospital point |
| `Config.downSeconds` | `60` | The countdown before `/respawn` opens while a medic is on duty |
| `Config.countdownWithoutMedics` | `true` | `true` keeps the countdown with no medic on duty; `false` opens `/respawn` at once |
| `Config.downPersist`, `downPersistMaxSeconds` | `true`, `10800` | Keep the down state across a disconnect and a restart, and for how long |
| `Config.hospitalBill`, `reviveFee`, `healFee` | `500`, `300`, `100` | Vik's bill, Revive and Patch up |
| `Config.downHealthFraction`, `reviveHealthFraction` | `0.05`, `0.5` | Health while down, and after a Revive |
| `Config.hospital` | `-1546.0, 1231.0, 11.6`, heading `180` | Where `/respawn` and the evacuation put the body: Vik's clinic |
| `Config.av` | Militech Manticore, pad `-1370.0, 953.0, 23.5`, radius 12 m | The AV and where a medic must stand to call it |

### Set a live server's countdown

The shipped countdown is short so that one player can try the whole flow in a minute. For a
server with players, give medics time to arrive, and let a player respawn at once when nobody is
on duty:

```lua
-- shared/config.lua
Config.downSeconds = 600               -- 10 minutes before /respawn opens while a medic is on duty
Config.countdownWithoutMedics = false  -- nobody on duty: /respawn at once
```

### Change a plan's price

Each tier is one entry of `plans`. To make Gold cost 5000 eddies a week and cover Patch up in full:

```lua
-- server/config.lua, in C.plans
gold = {
    label = "Gold", price = 5000, periodHours = 168, priority = 2, dispatchDelaySeconds = 0,
    covers = { stabilise = 1.0, evacuate = 1.0, hospital = 1.0, revive = 1.0, heal = 1.0 },
    evacHealth = 0.75,
    pitch = "Stabilisation, evacuation, Vik's bill and patch-ups covered; priority dispatch.",
},
```

`covers` values are fractions between 0 and 1. A new price applies to the next purchase or
renewal; plans already paid keep their end date.

### Move or add a kiosk

A kiosk is a point with a prompt card. Stand where the card should be, type `/pos` and `/rot`, and
add an entry to `kiosks`:

```lua
-- server/config.lua, in C.kiosks
{
    id = "tti_kiosk_clinic", label = "Trauma Team kiosk", enabled = true, measured = true,
    position = { x = -1546.0, y = 1236.0, z = 11.6 },   -- from /pos, z at floor level
    yaw = 90.0,                                          -- from /rot
    landmark = "Vik's clinic, by the door",              -- shown by /tti plans
},
```

Set `enabled = false` to take a kiosk out without deleting it. The `landmark` text is what players
read in `/tti plans`, so write it for them.

### Move the AV pad

`/trauma av` works for a medic standing within `radius` metres (flat distance) of the pad. Put the
pad on open ground with room for the AV, away from parked cars:

```lua
-- shared/config.lua
Config.av = {
    record = "Vehicle.av_militech_manticore",
    spawnDistance = 8.0,   -- metres in front of the medic
    spawnUp = 1.0,         -- metres above the medic's feet
    ttlMs = 30 * 60 * 1000,
    despawnWhenUnobserved = true,
    pad = { x = -1370.0, y = 953.0, z = 23.5, radius = 12.0, label = "Afterlife street" },
}
```

## For resource authors

Trauma Team publishes a host-wide event after every completed step and exposes read-only exports.
The exports `revive` and `heal` never charge a fee: the caller owns the money decision.

```lua
-- server, after every committed step
AddEventHandler("rp:job:completed", function(e)
    -- e.job == "trauma"; e.kind is "subscribe", "stabilise", "evacuate" or "revive"
    -- e.playerId: the buyer for "subscribe", the medic otherwise; e.ref: the operation id
end)
AddEventHandler("rp_trauma:down", function(playerId, position) end)
AddEventHandler("rp_trauma:revived", function(playerId, byPlayerId) end)   -- byPlayerId may be nil
AddEventHandler("rp_trauma:call", function(callId, state, patientId, medicIdOrReason) end)  -- "open" | "taken" | "closed"
AddEventHandler("rp_trauma:subscribed", function(playerId, tier, untilAt) end)

exports.rp_trauma:isDown(playerId)        -- boolean
exports.rp_trauma:hasContract(playerId)   -- boolean: an active plan of any tier
exports.rp_trauma:planOf(playerId)        -- { tier, label, untilAt, autoRenew, priority } or nil
exports.rp_trauma:owed(playerId)          -- eddies invoiced and not paid
exports.rp_trauma:calls()                 -- { { id, patient, priority, tier, state, responder, stable, position } }
exports.rp_trauma:revive(playerId, byId)  -- true, or nil and a reason
exports.rp_trauma:heal(playerId, byId)    -- true, or nil and a reason
```

## When something is refused

Trauma Team explains every refusal in words. The ones an operator can fix:

| The player reads | Fix |
|---|---|
| "The Trauma Team service is not set up on this server (mint rule missing)." | Add the [mint rule](#let-trauma-team-write-and-issue-cards). |
| "Trauma Team has issued enough cards and invoices for this hour." | The hourly cap is used up: wait, or raise the cap. |
| "The Trauma Team service is not set up on this server (writers)." | Add `rp_trauma` to `writers`. |
| "The Trauma Team items are not defined yet (rp_inventory)." | Set `rp_inventory_backend` to `transactions` and start `rp_inventory`. |
| "The Trauma Team network is offline: try again in a moment." | Check `open77_transactions` and the database. |
| "Trauma Team roster unavailable (rp_jobs offline). Try again later." | Start `rp_jobs`. |

The ones players fix themselves:

| The player reads | Why |
|---|---|
| "Not enough eddies in your account and wallet." | The plan costs more than the bank and cash hold together. |
| "You already paid as far ahead as Trauma Team allows." | The plan is already paid four weeks ahead. |
| "Sign it when you are back on your feet." | A down player cannot sign a plan. |
| "Stand at a Trauma Team kiosk first (/tti plans lists them)." | `/tti buy` away from a kiosk. |
| "Hold on, choom: /respawn opens in 30 s." | The countdown is still running. |
| "Trauma Team is on duty (2 medics). /respawn opens in 30 s." | Medics are on duty and the countdown is still running. |
| "You are not down, choom. Nothing to respawn from." | `/respawn` on your feet. |
| "Trauma Team on duty only: /service to clock in." | The medic is off duty. |
| "Trauma Team members only." | The player does not have the `trauma` job. |
| "Another Trauma Team unit has this call." | Another team took it: `/tti assist <callId>` to join. |
| "Someone is already working on this." | Another medic is working on that body. |
| "Stabilise the patient first." | Evacuate before Stabilise. |
| "This patient is already stable: evacuate them." | Stabilise twice. |
| "The patient refuses the charges." | The uninsured patient refused in the last 60 seconds. |
| "The AV pad is on the Afterlife street (-1370, 953), 85 m from you: stand on it first." | `/trauma av` away from the pad. |
| "You can't treat yourself, choom." | A medic on their own body. |

## Limits

- **The AV is a Militech Manticore.** The game's own Trauma Team AV (`Vehicle.av_trauma`) never
  appears on a client when a server spawns it, so the resource uses the Manticore, the same
  airframe.
- **The respawn cannot be held.** The server's respawn still happens; the down state then puts the
  body back at the spot where it fell, under a fade.
- **No body is carried.** The evacuation is a fade and a move to Vik's clinic.
- **Bodies on unloaded ground.** A held body that falls through ground that had not loaded yet, or
  ends more than 3 m from its spot, is put back on it.
- **The crowd.** With `open77_pedestrians`, walkers are kept off a downed patient, but pedestrians
  already standing there stay put.
- **The medic kneels where they stand,** not turned towards the body.
- **The consent dialog** counts any answer that never comes (closed dialog, another dialog open, the
  UI kit unavailable) as unconscious: the patient is treated and billed after.
- **The medic's bounty** on a covered act is paid only while the society can afford it.
- **A player who comes back down** can move until their game reports them alive after the join; the
  hold then puts them back at the saved spot, at most 15 seconds after they are in the world.
  `/respawn` waits for the hold.
- **The saved down states live in the resource's own storage** on this server, inside its folder.
  They do not follow a player to another server, and replacing the resource folder with a fresh
  copy clears them.
- **At most 48 calls** carry a prompt on the body at once.
- **The Afterlife street kiosk** stands at an estimated point; check it on your map before opening
  the server, or set `enabled = false`.
- **Without `open77_actions`,** Stabilise and Evacuate are unavailable; Patch up, Revive and
  `/respawn` remain.
- **The wounded pose** needs the RP animation catalogue on the server. Without it, the hold works
  without the pose.
