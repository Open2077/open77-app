# Jobs and world interaction

Build activities that give players something to do together in Night City: work at a scrapyard,
run a food stall, carry goods to a truck, or sit down with another character at a café.

Open77 provides Lua resources for the parts these activities share: interaction prompts,
animations, progress bars, carrying, storage, payments and furniture. A job resource combines
those parts with your server's rules, locations and economy.

This page helps you choose and enable those resources. If you want to write Lua, continue with
[Build your first Lua job](build-a-job.md). The world-interaction libraries are experimental;
use compatible server resources and client animation assets, and test your chosen locations.

## What you can add to your server

| Activity | What the player does | Where to start |
|---|---|---|
| Scrapyard work | Cut or pry a wreck, fill a crate, carry it to a truck and sell the contents. | [`rp_salvage`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_salvage) |
| Street-food service | Stock ingredients, cook, offer a meal to another player and take payment after they accept. | [`rp_streetfood`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_streetfood) |
| Sitting and social scenes | Sit on supported chairs, stools and benches, or lean at supported spots. | [Furniture](furniture.md) |
| A custom work activity | Inspect, repair, collect or process something at a location you choose. | [Lua job tutorial](build-a-job.md) |
| Physical deliveries | Pick up a visible crate, put it down and load it into a vehicle. | [Actions and carrying](actions.md#carry-a-crate-to-a-truck) |
| Shared storage and production | Move ingredients into a pantry, products into a crate or goods between players. | [Items, payments and storage](transactions.md) |
| A ripperdoc clinic | Quote a patient, operate in Vik's chair and install real cyberware, paid once. | [Ripperdoc](rp-job-ripperdoc.md), one of the [roleplay jobs](rp-jobs.md) |
| A ready-made Night City job | Farm and refine CHOOH2, build parts at a workbench, breach for a fixer, run a contract board, answer Trauma Team calls or smuggle for the Aldecaldos. | [Roleplay jobs](rp-jobs.md) |

Salvage and street food are example jobs you can configure, and the [roleplay jobs](rp-jobs.md)
are seven ready-made Night City jobs. Other professions still need their own rules, locations
and content. A resource node can support a mining job, for example, but
it does not supply a finished mine, a digging animation or a refinery economy.

## Start with an example job

Choose the example closest to the experience you want. Enable it unchanged on a test server
first; then adjust its configuration and play through it with another player.

### Scrapyard: collecting and transporting materials

[`rp_salvage`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_salvage) provides this loop:

1. Clock in at the foreman.
2. Use a cutting torch or crowbar at a wreck. Work takes time and wears the tool.
3. Collect the materials in a crate beside the wreck.
4. Carry the crate to a truck the player is allowed to use, then unload it at the destination.
5. Sell it to the buyer; the payment can include a share for the business.

Edit its `server/config.lua` to change work spots, tools, material yields, crate capacity,
timings and prices. Supply tools through your server's inventory or a shop; the example does
not include a tool shop. Follow its README for dependencies and economy permissions.

Use this example for salvage or collection-and-delivery work. Run either `rp_salvage` or the
older `rp_ferrailleur`: they overlap in job economy and item definitions.

### Street food: a business run by players

[`rp_streetfood`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_streetfood) provides this loop:

1. A cook clocks in and stocks the stall's pantry.
2. The cook prepares a recipe at the grill; the finished dish waits at the serving counter.
3. A customer orders. The cook offers the dish with its price, and the customer accepts or declines.
4. An accepted sale transfers the dish and payment, including an optional tip.
5. The customer eats or drinks; `rp_needs` can apply hunger and thirst effects.

Edit its `server/config.lua` to change stalls, recipes, ingredients and prices. Seating is optional.
Choose grill and counter positions with room for both players; ordinary job workstations do not
automatically move crowd NPCs out of the way. Use one service resource per venue so its prompts
and stock rules do not overlap with another bar or food job.

## Enable the resources

Each example's README lists its exact dependencies and settings. The setup has four parts:

1. **Install compatible resources and client assets.** The server needs the job libraries and
   the RP resources it uses. Clients need the animation archive containing the selected job
   profiles, such as the welder and cook. A missing profile prevents the action from starting.
2. **Configure storage and the economy.** The example jobs use `open77_transactions` with a
   [SQL database](database.md) and `rp_inventory_backend` set to `transactions`. Follow the
   inventory and economy migration instructions when adopting this on an existing server.
3. **Load and start the resources.** Add them to `resources.load` and use `ensure` in dependency
   order. These libraries and jobs are opt-in; adding a load entry alone does not start them.
   See [server resources](server-resources.md).
4. **Set access and payment rules.** Configure which resources may change inventories or
   wallets, and which may create rewards. The example READMEs provide their required `writers`
   and `mint` settings; preserve the permissions needed by your other jobs.

You can enable [seating](furniture.md#enable-seating) on its own. Sitting does not
require installing an inventory, an economy or either example job.

## How a job works

Think of a repair job from the player's point of view:

1. **Find the work.** The player approaches a location and sees a prompt such as **Repair the machine**.
2. **Meet the requirements.** Your job may require a spare part, a tool, a role or being on duty.
   If a requirement is missing, explain it before the work starts.
3. **Do the work.** The character plays an animation while a progress bar runs. Nearby players
   see the character working. A shared workstation can allow only one worker at a time.
4. **Get the result.** On success, your script consumes the required parts, creates the product
   or pays the worker. If work is interrupted before it commits, release the reserved items.

The builder chooses the location, animation, duration, requirements and result. The action
library handles the prompt, timing and common interruption checks. The transaction library
saves the item and money changes your script requests.

A whole job can contain several actions: inspect a wreck, remove parts, carry a crate, load a
truck and sell the haul. You connect those stages in Lua. The
[job tutorial](build-a-job.md) starts with one repair action and shows how to extend it.

## Choose the right building block

| You need to… | Use… | What you configure or write |
|---|---|---|
| Show a simple interaction on an object or NPC | [`open77_interactions`](interactions.md) | Prompt text, target and what happens when selected. |
| Run a timed work action | [`open77_actions`](actions.md) | An action, its work spots and Lua functions for requirements and results. |
| Require a job, grade or duty | `rp_jobs` with action eligibility | Which workers may use the activity. |
| Save item and money transfers | [`open77_transactions`](transactions.md), or the RP inventory/economy adapters | Items, recipes, prices and the transfers belonging to one operation. |
| Place persistent crates, piles or resource nodes | [`open77_containers`](transactions.md#durable-world-containers) | Contents, access, capacity and node depletion/regrowth settings. |
| Carry an object | [`open77_actions` carrying](actions.md#carry-a-crate-to-a-truck) | Its model, pickup rules and what putting it down should do. |
| Store cargo in a vehicle | `rp_cargo` with `rp_garage` | Vehicle access and cargo layouts for the vehicles you support. |
| Use existing city furniture | [`open77_furniture` and `open77_seating`](furniture.md) | Enable nearby seating or choose catalogue entries for a venue. |
| Offer an exchange to another player | [Player interactions](player-interactions.md) | The offer, consent and result, as shown in street food. |

For new inventory and economy code, use the documented asynchronous operations and wait for
their result. Legacy synchronous inventory exports can acknowledge a queued change before it
has been saved. See [Items, payments and storage](transactions.md#choose-your-inventory-integration).

## Using the city and its objects

A **work spot** is a position where your activity takes place. You can put one beside an existing
grill, machine or wreck, or build a scene using [spawned props](props.md). Placing a repair prompt
beside a vending machine does not automatically change that machine's vanilla behavior.
For built-in prompts and supported device controls, see [device interactions](device-interactions.md).

Furniture uses a separate catalogue of city locations with supported poses. It does not make
every chair, custom prop or interior seat usable. Check the [furniture coverage](furniture.md#which-seats-are-offered)
and walk through your venue to confirm placement and exits.

Use a recorded position for each workstation and test the animation there. Leave space for the
worker, nearby players and any carried objects. Vehicle cargo also needs a layout that fits the
specific vehicle; one truck's bed offsets will not fit every model.

## Check the experience before opening it to players

Try the complete loop with two players, including the cases that affect your server's economy:

- Both use the same workstation or try to pick up the same crate.
- A player lacks the required tool, has a full inventory or cannot afford the purchase.
- A player cancels, walks away, clocks off, dies or disconnects during work.
- The job restarts while items are on the ground, being carried or stored in a vehicle.
- The database stops responding during a transfer; the job resolves the result before retrying payment.
- Both body types can use the work spot, and actor and observer see suitable poses and props.
- Loaded vehicles are driven through the route, and busy venues remain responsive.

Save the job's own progress as well as its items. A saved payment does not automatically save a
machine's repaired state, a depleted node or a pending order. Test recovery across those boundaries.

## Where to go next

- [Build your first Lua job](build-a-job.md): a repair activity, from files and configuration to gameplay.
- [Actions and carrying](actions.md): action fields, work spots, duty checks, carrying and events.
- [Items, payments and storage](transactions.md): saved transfers, recipes, sales and containers.
- [Furniture](furniture.md): enable seating and use it from your own resources.
- [Roleplay jobs](rp-jobs.md): seven ready-made Night City jobs built on these libraries, from the ripperdoc to the nomad smuggler.
- [FiveM compatibility](fivem-compatibility.md): concepts and API differences for authors coming from FiveM.
