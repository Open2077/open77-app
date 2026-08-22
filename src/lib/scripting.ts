/**
 * Home-page scripting section.
 *
 * Resource scripts are Lua only. `base/scripting/` is the client Lua host;
 * `base/server/` hosts server Lua 5.4. There is no C# or JavaScript resource
 * runtime in those trees — C# is the dedicated-server process, and Chromium
 * WebUI pages are optional interfaces, not a second gameplay language.
 *
 * The sample is a complete two-file resource built only from documented calls:
 * `RegisterCommand` and `Open77.players.position` / `Open77.vehicles.create`
 * (docs/server-api.md, docs/vehicles.md) on the server, and
 * `Open77.blips.create` (docs/blips.md) plus the `open77_notifications`
 * export (docs/notifications.md) on the client — the landing page does not
 * get to invent an API.
 */

export const HOME_SERVER_LUA = `local GALENA = "Vehicle.v_standard2_thorton_galena_player"

RegisterCommand("ride", function(source, args)
    local spot = Open77.players.position(source)
    if spot == nil then return end

    local id = Open77.vehicles.create({
        record = args[1] or GALENA,
        position = { x = spot.x + 3.0, y = spot.y, z = spot.z },
        bucket = spot.bucket,
    })

    if id then
        TriggerClientEvent("ride:delivered", source, id, spot)
    end
end)`;

export const HOME_CLIENT_LUA = `RegisterNetEvent("ride:delivered", function(id, spot)
    Open77.blips.create({
        position = { x = spot.x + 3.0, y = spot.y, z = spot.z },
        sprite = "objective",
        title = ("Ride #%d"):format(id)
    })

    Open77.exports.call("open77_notifications", "show", {
        type = "success",
        title = "Ride delivered",
        message = "Your wheels are waiting outside."
    })
end)`;

/** What `/ride` does, spelled out next to the code. */
export const SCRIPT_SAMPLE_NOTE =
  "The complete resource: a chat command that spawns a real, server-owned vehicle " +
  "beside the player, then marks it on their map with a toast. Every call is in the docs.";

export const SCRIPT_PILLARS = [
  {
    tag: "LUA 5.4",
    title: "One language, two runtimes",
    body: "Client scripts run inside the game; server scripts own the authoritative world. Each resource gets its own isolated Lua VM — and hot reload: save the file, it is live.",
    href: "/docs/server-resources",
    link: "Resource model",
  },
  {
    tag: "REAL GAME APIS",
    title: "Drive the actual engine",
    body: "Vehicles, blips, NPCs, weather, loot, interactions, notifications — the same permission-gated natives OPEN//77's own resources are built on.",
    href: "/docs/api",
    link: "Lua API reference",
  },
  {
    tag: "WEB INTERFACES",
    title: "UI with the web stack",
    body: "A resource can ship a Chromium WebUI page: build HUDs, menus and apps in HTML, CSS and JavaScript, out of process so the game never pays for your UI.",
    href: "/docs/notifications",
    link: "WebUI in practice",
  },
] as const;

export const SCRIPT_DOC_LINKS = [
  { href: "/docs", label: "Documentation" },
  { href: "/docs/platform", label: "How the platform works" },
  { href: "/docs/resource-exports", label: "Resource exports" },
] as const;
