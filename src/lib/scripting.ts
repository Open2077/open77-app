/**
 * Home-page scripting section.
 *
 * Resource scripts are Lua only. `base/scripting/` is the client Lua host;
 * `base/server/` hosts server Lua 5.4. There is no C# or JavaScript resource
 * runtime in those trees — C# is the dedicated-server process, and Chromium
 * WebUI pages are optional interfaces, not a second gameplay language.
 *
 * The snippets are the "Minimal resource" example from
 * `base/docs/lua-resources.md`, so the landing page cannot invent an API.
 */

export const HOME_SERVER_LUA = `RegisterNetEvent("garage:request", function(garageId)
    local playerId = source
    TriggerClientEvent("garage:state", playerId, {
        id = garageId,
        open = true
    })
end)`;

export const HOME_CLIENT_LUA = `RegisterNetEvent("garage:state", function(state)
    print(("Garage %s: %s"):format(state.id, state.open and "open" or "closed"))
end)

CreateThread(function()
    local sent, reason = TriggerServerEvent("garage:request", "city-center")
    if not sent then
        print("Request failed: " .. tostring(reason))
    end
end)`;

export const SCRIPT_RUNTIMES = [
  {
    tag: "CLIENT RUNTIME",
    title: "Client Lua",
    body: "Runs inside the game process. Native APIs, world projection, events and optional WebUI — documented apart from the server so a client call is never mistaken for authority.",
    href: "/docs/api",
    link: "Lua API reference",
  },
  {
    tag: "SERVER RUNTIME",
    title: "Server Lua",
    body: "Runs on the dedicated server. Authoritative state, commands, permissions and the signed resource set that connecting clients download.",
    href: "/docs/server-resources",
    link: "Server resources",
  },
] as const;

export const SCRIPT_DOC_LINKS = [
  { href: "/docs", label: "Documentation" },
  { href: "/docs/platform", label: "How the platform works" },
  { href: "/docs/resource-exports", label: "Resource exports" },
] as const;
