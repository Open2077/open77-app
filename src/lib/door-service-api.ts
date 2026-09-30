import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ApiEntryRaw, ApiParam } from "@/lib/api-reference";

type Contract = {
  runtime: "server" | "client";
  name: string;
  args: string;
  returns: string;
  summary: string;
  description: string;
};

const TYPES: Record<string, string> = {
  id: "string", bucket: "integer", offset: "integer", limit: "integer",
  position: "{ x: number, y: number, z: number }", radius: "number",
  descriptor: "table", patch: "table", open: "boolean", locked: "boolean",
  sealed: "boolean", automatic: "boolean", playerId: "integer",
  allow: "boolean | nil", elevatorId: "integer", floor: "integer",
  enabled: "boolean", cursor: "integer",
  actions: "table | nil", ticket: "integer", accept: "boolean", reason: "string",
  mode: '"public" | "resource" | "always" | "never" | nil',
};

/** Exports added after the first release need a newer open77_doors (door actions 1.1.0, NPC passage 1.2.0). */
const MINIMUM_VERSION: Record<string, string> = {
  setActions: "1.1.0", resolveAction: "1.1.0", setNpcPassage: "1.2.0", npcStats: "1.2.0",
};

function availability(name: string): string {
  const minimum = MINIMUM_VERSION[name];
  return minimum
    ? `Depend on open77_doors >=${minimum} and call Open77.exports.call, not a Lua table named open77_doors.`
    : "Depend on open77_doors >=1.0.0 and call Open77.exports.call, not a Lua table named open77_doors.";
}

function release(name: string): string {
  return MINIMUM_VERSION[name]
    ? "Requires client and server builds that include this open77_doors version; players on an older client never send the matching requests."
    : "Available with client and server release 2.31.13+op77.58 on the CDN; older clients do not contain its native projection bridge.";
}

/** These are exports of a system resource, not Open77.doors server natives. */
export async function getDoorServiceApi(): Promise<ApiEntryRaw[]> {
  const contracts = JSON.parse(await readFile(
    path.join(process.cwd(), "content/api/door-service-api.json"), "utf8",
  )) as Contract[];
  const seen = new Set<string>();
  return contracts.map((entry) => {
    const key = `${entry.runtime}:${entry.name}`;
    if (!["server", "client"].includes(entry.runtime) || seen.has(key)
      || !/^[A-Za-z]+$/.test(entry.name) || !entry.summary || !entry.description) {
      throw new Error(`Invalid door export contract: ${key}`);
    }
    seen.add(key);
    const params: ApiParam[] = entry.args.split(", ").filter(Boolean).map((name) => {
      const defaultValue = name === "offset" ? "0" : name === "limit" ? "16"
        : name === "bucket" && entry.name === "get" ? "0" : null;
      return {
        name, type: TYPES[name] ?? "any", default: defaultValue,
        optional: defaultValue !== null || (name === "bucket" && entry.name === "list")
          || (name === "reason" && entry.name === "resolveAction"),
      };
    });
    const signature = `Open77.exports.call("open77_doors", "${entry.name}"${entry.args ? `, ${entry.args}` : ""})`;
    return {
      namespace: "open77_doors", name: entry.name, qualified: `open77_doors.${entry.name}`,
      route_id: `${entry.runtime}:open77_doors.${entry.name}`, handler: `export:${entry.name}`,
      summary: entry.summary,
      description: `${entry.description}\n\nThis is an asynchronous ${entry.runtime}-side resource export. ${availability(entry.name)} The call returns a Promise (or nil, error if it cannot be queued); awaiting it yields: ${entry.returns}. ${release(entry.name)}`,
      params, returns: ["Promise | nil", "queue error, if any"],
      api_set: entry.runtime === "server" ? "server" : "network", runtime: entry.runtime,
      source: `resources/system/open77_doors/${entry.runtime}/main.lua`,
      inferred: false, signatureKnown: true, callSignature: signature, guideHref: "/docs/doors",
      example: `CreateThread(function()\n    local pending, error = ${signature}\n    if not pending then print(error); return end\n    local result, reason = pending:await()\n    -- Handle the result before continuing; queued is not accepted.\nend)`,
    };
  });
}
