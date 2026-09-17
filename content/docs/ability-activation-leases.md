# Ability activation leases

Activation leases let clients start an ability without waiting for a network round trip. The server grants a small, expiring activation budget and validates each use against authoritative state and movement history.

## Supported abilities

- Cyberware double jump
- Dash and Air Dash
- Ground Slam
- Reflex overdrive
- Hacking upload initiation

Hacking upload duration remains server-timed. Starting an upload still requires line-of-sight confirmation from attacker and target. The confirmation deadline accounts for server-measured connection latency.

## Server authority

The server controls charges, stamina, cooldowns, grants, movement limits, damage and knockback. A lease does not change definition fields such as `CooldownMs`, `MaxCharges`, `ChargeRegenMs`, `StaminaCost`, `MaxAirborneMs` or `MaxFallSpeed`.

Each activation is checked against recorded movement at the claimed activation time. Air-use limits are tied to the airborne period, not an independent timer. Suspended implants, movement restrictions, knockdowns and forced motion prevent activation.

## Budget and expiry

The server recalculates budgets twenty times per second. A budget accounts for available charges, activation debt and cooldowns. A lease expires about three seconds after the last server contact; an expired lease cannot authorize further local activations.

Resources do not configure lease timing. Configure the ability's normal costs, charges and cooldowns instead.

## Corrections and retries

An activation may start locally and then be cancelled if the server rejects it. The correction restores authoritative movement and ability state. Long connection stalls can therefore interrupt an activation.

Duplicate activation reports are deduplicated: retrying a report does not spend charges or stamina twice and does not grant an additional activation.

When a report is older than retained movement history, validation uses a bounded tolerance and records the case in telemetry. The activation remains subject to the server's other checks.

## Integration

Use the supported ability APIs; do not implement a second client-side grant or cooldown system. Handle rejection and cancellation events even when the local animation has already started.

See [Cyberware](cyberware.md), [Dash](dash.md), [Ground Slam](ground-slam.md), [Reflex overdrive](reflex-overdrive.md) and [Hacking](hacking.md) for definitions, grants and events.
