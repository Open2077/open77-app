/** Presentation only. Function contracts and runtime always come from wiki/data/api.json. */
export const API_CATEGORIES = [
  { id: "core", label: "Core & resources", namespaces: ["_G", "Open77.Promise", "Open77.resource", "Open77.runtime", "Open77.events", "Open77.exports", "Open77.json"] },
  { id: "players", label: "Players & characters", namespaces: ["Open77.players", "Open77.character", "Open77.stats", "Open77.appearance", "Open77.clothing", "Open77.animations"] },
  { id: "vehicles", label: "Vehicles", namespaces: ["Open77.vehicles"] },
  { id: "world", label: "World & environment", namespaces: ["Open77.world", "Open77.environment", "Open77.time", "Open77.travel", "Open77.doors", "Open77.elevators", "Open77.props"] },
  { id: "combat", label: "NPCs, weapons & loot", namespaces: ["Open77.npcs", "Open77.weapons", "Open77.loot"] },
  { id: "ui", label: "Interfaces & markers", namespaces: ["Open77.webui", "WebUI.Page", "Open77.hud", "Open77.blips", "Open77.markers", "Open77.anchors", "Open77.nameplates"] },
  { id: "camera", label: "Camera & input", namespaces: ["Open77.camera", "Open77.perspective", "Open77.photoMode", "Open77.input", "Open77.settings"] },
  { id: "audio", label: "Voice & effects", namespaces: ["Open77.voice", "Open77.sfx", "Open77.vfx"] },
  { id: "network", label: "Network & sessions", namespaces: ["Open77.net", "Open77.network", "Open77.session"] },
  { id: "utilities", label: "Data & utilities", namespaces: ["Open77.assets", "Open77.kvp", "Open77.clipboard", "Open77.debug", "Open77.inspector"] },
] as const;

export function apiCategory(namespace: string) {
  const extra: Record<string, string> = {
    json: "core", "Open77.ready": "core", "Open77.tunables": "core",
    "Open77.notifications": "ui", "Open77.combat": "combat", "Open77.npcs.tasks": "combat",
    "Open77.routingBuckets": "network", "Open77.effects": "audio",
    "Open77.io": "utilities", "Open77.database": "utilities", "Open77.http": "utilities", "Open77.log": "utilities",
  };
  return API_CATEGORIES.find((category) => (category.namespaces as readonly string[]).includes(namespace) || category.id === extra[namespace]) ?? API_CATEGORIES[9];
}

export function apiExplorerHref(entry: { runtime: string; namespaceSlug: string; anchor: string }) {
  return `/docs/api#${entry.runtime}/${entry.namespaceSlug}/${entry.anchor}`;
}
