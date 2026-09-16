# Ability activation leases — what a server owner needs to know

Abilities on Open77 no longer ask the server for permission at the moment the
player presses the key. The server hands each player a small, expiring **budget
of activations**; the client spends from it and acts immediately, and the server
checks the activation afterwards, against where the body actually was when the
key went down.

Nothing about this is configurable, and nothing about it changes what your
definitions mean. It changes *when the waiting happens*, not *who decides*.

## Why it exists

On a server far from its players — the Australia freeroam server at 300-400 ms
was the case that prompted this — the double jump failed roughly one press in
two, and a combo such as jump → jump → dash failed far more often than either
half, because each step waited for its own round trip and they all had to fit
inside one short airborne window.

Measured in the running game, 20 attempts per cell, with an impairment proxy:

| | on a good link | at 350 ms | at 800 ms |
|---|---|---|---|
| Double jump, before | 100 % | 100 % | 0 % |
| Double jump, now | 100 % | **100 %** | **100 %** |
| Dash, before | 100 % | 75 % | 0 % |
| Dash, now | 100 % | **100 %** | **95 %** |
| Ground slam, now | 100 % | 100 % | 90 % |
| Reflex overdrive, now | 100 % | 100 % | 90 % |
| Hacking upload start, now | 100 % | 100 % | 90 % |

Only the double jump and Dash have a "before": the previous release. The other
three had never been measured, so there is nothing honest to compare them to.

**The hacking upload took longer to fix than the rest, and now behaves.**
Beginning an upload never waits, but the upload only actually starts once
attacker and target have each confirmed they can see the other, and that
exchange is two round trips bounded by a budget measured from when the server
asked. That budget is now widened by the pair's connection speed as the server
itself measures it, so a slow pair is given the time their link costs and a fast
pair is given nothing. Measured live: 100 % direct, 100 % at 350 ms, 90 % at
800 ms, up from 55 %.

## What it applies to

The double jump (Cyberware legs), Dash, Ground Slam, the reflex overdrive, and
the *start* of a hacking upload.

**The hacking upload's duration is unchanged.** It is timed by the server, by
design, and this work does not touch it. What changed is that the upload can
begin without a round trip, and that the range between hacker and target is now
judged where both players were when the key went down rather than where they had
drifted to a third of a second later.

## What it does not change

- **The server still decides everything it decided before.** Charges, stamina,
  cooldowns, entitlement, movement limits, damage and knockback are all still
  server-owned. A client cannot choose any of them.
- **Your definitions mean exactly what they did.** `CooldownMs`, `MaxCharges`,
  `ChargeRegenMs`, `StaminaCost`, `MaxAirborneMs`, `MaxFallSpeed` and the rest
  are unchanged in meaning and in effect.
- **Every activation is still checked, and still correctable.** An activation
  the server refuses is cancelled and the body is put back, through the same
  correction path that existed before.
- **Suspensions still bite.** A netrunner who has shut an implant down, a
  Cripple Movement status, a knockdown or a forced motion all still refuse an
  activation, and the lease goes to zero while they hold.

## What an owner will see that is new

**Activations are occasionally cancelled just after they start.** This is the
correction path, and it is the visible cost of letting the client act first. It
happens when the server judges the activation and disagrees — the player was not
really airborne, the cooldown had not really lapsed, a status had landed. On a
healthy link it is rare.

**A disconnected client stops being able to act.** The budget lives about three
seconds past the last contact with the server. A player whose connection dies
mid-air cannot bank activations and spend them later: the lease closes and the
client falls back to asking, which will also fail. This is deliberate.

**A player who lags out for a couple of seconds keeps playing.** The budget is
topped up twenty times a second, so a two-second stall never empties it. This is
the main thing players will notice.

**A retried report never charges twice.** After a lag spike a client can send
the same activation several times; the server recognises the repeat, treats it
as the success it was, and debits nothing extra. A player cannot get two dashes
out of one press by having a bad connection, and cannot lose a charge to one
either.

## Cheating, and what stops it

A client that acts first is a client that could lie. Three things bound it.

1. **The budget is small and recomputed constantly.** The server recalculates,
   twenty times a second, how many activations are legitimately available right
   now — charges minus debt, zero while a cooldown runs — and that is what the
   client is given. A client holding a lease cannot outrun its own cooldown even
   once.
2. **Every activation is re-judged against recorded movement.** The server keeps
   the last few seconds of each player's authenticated movement and checks the
   activation against where the body really was at the instant claimed. A player
   who was on the ground does not get an air dash by saying otherwise.
3. **One air use per airborne period.** Identified by the flight itself, not by
   a timer, so a late report cannot buy a second air ability after landing.

**Where the bound is deliberately loose, and why.** A report that arrives so
late the server no longer has movement from that instant is *accepted* on a
widened envelope and counted in telemetry, rather than refused. Network delay is
not cheating, and refusing it would punish exactly the players this work exists
to help. The widening is bounded and the activation is still checked; it is not
a bypass.

## Limits you should know about

- **Measured with one client, not two.** The numbers above are from the real
  game, but a second player watching (and seeing a correction happen from the
  outside) has not been measured.
- **Three of the five abilities have no live numbers.** Ground Slam, the reflex
  overdrive and the hacking upload start share the contract and are expected to
  behave the same way; expected is not measured.
- **A stall longer than about two seconds still costs some activations.** They
  are cancelled and corrected rather than silently accepted, which is the safe
  failure, but the player will see it.
- **No protocol version was spent.** Clients and servers that were compatible
  before remain compatible.

The design, the measurements and the open questions are in
[`docs/research/ability-activation-latency.md`](../docs/research/ability-activation-latency.md).
