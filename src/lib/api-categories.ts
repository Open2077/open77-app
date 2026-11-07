/** Presentation only. Function contracts and runtime always come from wiki/data/api.json. */
const FALLBACK_CATEGORY = { id: "utilities", label: "Data & utilities", namespaces: ["Open77.assets", "Open77.data", "Open77.kvp", "Open77.clipboard", "Open77.debug", "Open77.inspector", "Open77.rtti"] } as const;

export const API_CATEGORIES = [
  { id: "core", label: "Core & resources", namespaces: ["_G", "Open77.Promise", "Open77.resource", "Open77.runtime", "Open77.events", "Open77.exports", "Open77.json", "Citizen", "promise", "Open77.EventVerdict", "Open77.convars", "Open77.acl", "Open77.access"] },
  { id: "players", label: "Players & characters", namespaces: ["Open77.players", "Open77.character", "Open77.stats", "Open77.appearance", "Open77.clothing", "Open77.equipment", "Open77.wardrobe", "Open77.puppets", "Open77.animations", "Open77.playerInteractions", "Open77.heldItems"] },
  { id: "cyberware", label: "Cyberware & abilities", namespaces: ["Open77.cyberware", "Open77.motion", "Open77.abilities", "Open77.chute"] },
  { id: "vehicles", label: "Vehicles", namespaces: ["Open77.vehicles", "Open77.vehicles.ai"] },
  // Members of Open77.vehicles and FiveM globals, picked by name: see apiEntryCategory.
  { id: "vehicle-customization", label: "Vehicle customization", namespaces: [] },
  { id: "world", label: "World & environment", namespaces: ["Open77.world", "Open77.environment", "Open77.time", "Open77.travel", "Open77.zones", "Open77.prevention", "Open77.doors", "open77_doors", "Open77.elevators", "Open77.props"] },
  { id: "combat", label: "NPCs, weapons & loot", namespaces: ["Open77.npcs", "Open77.weapons", "Open77.consumables", "Open77.loot"] },
  { id: "ui", label: "Interfaces & markers", namespaces: ["Open77.webui", "WebUI.Page", "Open77.hud", "Open77.chat", "Open77.screen", "Open77.blips", "Open77.map", "Open77.markers", "Open77.anchors", "Open77.nameplates"] },
  { id: "camera", label: "Camera & input", namespaces: ["Open77.camera", "Open77.remoteCamera", "Open77.perspective", "Open77.photoMode", "Open77.input", "Open77.settings"] },
  { id: "audio", label: "Voice & effects", namespaces: ["Open77.voice", "Open77.sound", "Open77.sfx", "Open77.vfx"] },
  { id: "network", label: "Network & sessions", namespaces: ["Open77.net", "Open77.network", "Open77.callbacks", "Open77.state", "Open77.session", "Open77.prediction"] },
  FALLBACK_CATEGORY,
] as const;

export function apiCategory(namespace: string) {
  const extra: Record<string, string> = {
    json: "core", "Open77.ready": "core", "Open77.tunables": "core",
    "Open77.notifications": "ui", "Open77.combat": "combat", "Open77.npcs.tasks": "combat",
    "Open77.routingBuckets": "network", "Open77.effects": "audio",
    "Open77.io": "utilities", "Open77.database": "utilities", "Open77.http": "utilities", "Open77.log": "utilities",
  };
  return API_CATEGORIES.find((category) => (category.namespaces as readonly string[]).includes(namespace) || category.id === extra[namespace]) ?? FALLBACK_CATEGORY;
}

/**
 * The vehicle customization natives share Open77.vehicles with the rest of the
 * vehicle API, and their FiveM spellings are server globals, so this category is
 * a list of names rather than a namespace. Keep it in step with the guides under
 * content/docs/vehicle-customization*.md.
 */
const VEHICLE_CUSTOMIZATION: Record<string, ReadonlySet<string>> = {
  "server:Open77.vehicles": new Set([
    "setPaint", "getPaint", "resetPaint", "setLightsHue", "clearLightsHue", "getLightsHue", "getHeadlightHue",
    "setHeadlightColor", "setHeadlightColour", "setAppearance", "getAppearance",
    "listPaintProfiles", "setPaintProfile", "registerPaintProfiles",
    "setNeon", "clearNeon", "setNeonAnimation", "getNeonAnimation", "setLightColors", "getLightColors",
    "registerParts", "listParts", "setParts", "setWheels", "setPlate", "setWindowTint", "getWindowTint",
    "respawnAs", "registerEngineSounds", "listEngineSounds", "setEngineSound", "getEngineSound",
    "registerStickers", "listStickers", "setStickers", "getStickers", "getDecalBudget", "getVisual",
  ]),
  "client:Open77.vehicles": new Set(["customizationAvailable", "getVisual", "getPaint"]),
  "server:_G": new Set([
    "SetVehiclePaint", "ResetVehiclePaint", "SetVehicleLivery", "GetVehicleLivery", "SetVehicleNeonLightEnabled",
    "SetVehicleNeonLightsColour", "SetVehicleWheelType", "SetVehicleWindowTint", "GetVehicleWindowTint",
    "SetVehicleMod", "GetVehicleMod",
  ]),
};

export function isVehicleCustomization(entry: { runtime: string; namespace: string; name: string }) {
  return VEHICLE_CUSTOMIZATION[`${entry.runtime}:${entry.namespace}`]?.has(entry.name) ?? false;
}

/** The category of one API entry: a few are picked by name, the rest by namespace. */
export function apiEntryCategory(entry: { runtime: string; namespace: string; name: string }) {
  if (isVehicleCustomization(entry)) {
    return API_CATEGORIES.find((category) => category.id === "vehicle-customization")!;
  }
  return apiCategory(entry.namespace);
}

export function apiExplorerHref(entry: { runtime: string; namespaceSlug: string; anchor: string }) {
  return `/docs/api#${entry.runtime}/${entry.namespaceSlug}/${entry.anchor}`;
}
