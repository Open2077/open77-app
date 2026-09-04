import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Root, RootContent, TableCell } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { ApiEntryRaw, ApiParam } from "@/lib/api-reference";

function plain(node: { type: string; value?: string; children?: unknown[] }): string {
  if (node.value !== undefined) return node.value;
  return (node.children ?? []).map((child) => plain(child as Parameters<typeof plain>[0])).join("");
}
function codes(cell: TableCell | undefined): string[] {
  return cell?.children.filter((node) => node.type === "inlineCode").map((node) => plain(node)) ?? [];
}
function prose(cell: TableCell | undefined): string {
  return cell ? cell.children.map((node) => node.type === "inlineCode" ? `\`${plain(node)}\`` : node.type === "strong" ? `**${plain(node)}**` : plain(node)).join("") : "";
}
function sectionId(text: string) { return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s/g, "-"); }

/** Split top-level commas only: a table literal is a single argument. */
function parameters(signature: string): ApiParam[] {
  const body = signature.slice(1, -1);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if ("{[(".includes(body.charAt(i))) depth++;
    if ("}])".includes(body.charAt(i))) depth--;
    if (body[i] === "," && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  parts.push(body.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean).map((name) => ({
    name: name.replace(/\?$/, ""),
    type: name.startsWith("{") ? "table" : name === "function" ? "function" : "not specified",
    optional: name.endsWith("?"), default: null,
  }));
}

/**
 * Supplement generated client/vehicle cards with explicit server wiki tables.
 * Keep literal signatures and provenance; never copy client contracts or guess
 * missing types. Existing generated cards always take precedence.
 */
export async function getDocumentedServerApi(existing: ApiEntryRaw[]): Promise<ApiEntryRaw[]> {
  const found = new Map<string, ApiEntryRaw>();
  const existingNames = new Set(existing.filter((entry) => entry.runtime === "server").map((entry) => entry.qualified));
  for (const filename of ["server-api.md", "voice.md"]) {
    const markdown = await readFile(path.join(process.cwd(), "content/docs", filename), "utf8");
    // The wiki includes unescaped union pipes inside code in GFM table cells.
    const normalized = markdown.replace(/^\|.*$/gm, (line) => line.replace(/`([^`]+)`/g, (_, code: string) => `\`${code.replace(/(?<!\\)\|/g, "\\|")}\``));
    const tree = unified().use(remarkParse).use(remarkGfm).parse(normalized) as Root;
    let heading = "";
    let majorHeading = "";
    let currentNamespace = "";
    let context: RootContent[] = [];
    const permissions: Record<string, string> = {
      "NPCs and tasks": "world.npcs", "Elevators": "world.elevators", "Ground loot": "world.loot",
      "World props": "world.props", "World effects": "world.effects", "Combat policy": "combat.config",
      "Voice topology and policy": "voice.manage", "Server Lua API": "voice.manage", "Database": "database.access",
    };

    for (const node of tree.children) {
      if (node.type === "heading") {
        heading = plain(node);
        context = [];
        if (node.depth === 2) {
          majorHeading = heading;
          currentNamespace = heading === "Database" ? "Open77.database" : heading === "Vehicles" ? "Open77.vehicles" : "";
        }
        continue;
      }
      if (filename === "voice.md" && majorHeading !== "Server Lua API") continue;
      if (node.type !== "table") { context.push(node); continue; }
      const headers = node.children[0]?.children.map((cell) => plain(cell).toLowerCase()) ?? [];
      if (!/function|method|call/.test(headers[0] ?? "")) continue;
      const signatureColumn = headers.findIndex((header) => /signature|callback form/.test(header));
      const permissionColumn = headers.findIndex((header) => header === "permission");
      const resultColumn = headers.findIndex((header) => /result|purpose|returns|description/.test(header));
      const intro = context.filter((item) => item.type === "paragraph").map((item) => plain(item)).join(" ");
      for (const row of node.children.slice(1)) {
        const names = codes(row.children[0]);
        const signatureCell = signatureColumn >= 0 ? row.children[signatureColumn] : undefined;
        const signatures = signatureCell ? codes(signatureCell).filter((code) => code.startsWith("(")) : [];
        const aliases = signatureCell && /^Same as/.test(plain(signatureCell)) ? codes(signatureCell) : [];
        const resultCell = resultColumn >= 0 ? row.children[resultColumn] : undefined;
        const resultText = prose(resultCell);
        for (const [index, token] of names.entries()) {
          const call = token.match(/^([\w.]+)(\(.*\))?$/);
          if (!call?.[1]) continue;
          let qualified = call[1];
          // These are events, not callable functions.
          if (/^onPlayer/.test(qualified)) continue;
          if (qualified.includes(".")) currentNamespace = qualified.slice(0, qualified.lastIndexOf("."));
          else if (currentNamespace && /^[a-z]/.test(qualified) && qualified !== "print") qualified = `${currentNamespace}.${qualified}`;
          if (existingNames.has(qualified)) continue;
          const alias = aliases[index] ? found.get(aliases[index]) : undefined;
          const signature = call[2] ?? signatures[index] ?? signatures[0] ?? alias?.documentedSignature ?? codes(resultCell ?? row.children[0]).find((code) => code.startsWith("("))?.match(/^\([^)]*\)/)?.[0];
          const namespace = qualified.includes(".") ? qualified.slice(0, qualified.lastIndexOf(".")) : "_G";
          const name = qualified.slice(qualified.lastIndexOf(".") + 1);
          const permission = permissionColumn >= 0 ? prose(row.children[permissionColumn]) : permissions[majorHeading];
          const summary = resultText || alias?.summary || `${heading}: ${name}.`;
          const description = [permission && permission !== "None" ? `Requires ${permission}.` : "", intro, signatureCell && !signatures.length && !alias ? prose(signatureCell) : ""].filter(Boolean).join(" ");
          const entry: ApiEntryRaw = {
            namespace, name, qualified, runtime: "server", handler: "", api_set: "server",
            summary, description, params: signature ? parameters(signature) : [],
            returns: headers[resultColumn]?.includes("result") || headers[resultColumn]?.includes("returns") ? (resultText ? [resultText] : []) : [],
            source: filename, source_line: row.position?.start.line, inferred: false,
            route_id: `server:${qualified}`, documentedSignature: signature ?? "(…)",
            signatureKnown: Boolean(signature), guideHref: `/docs/${filename.replace(/\.md$/, "")}#${sectionId(heading)}`,
          };
          if (!found.has(qualified) || (entry.signatureKnown && !found.get(qualified)?.signatureKnown)) found.set(qualified, entry);
        }
      }
    }
  }
  return [...found.values()];
}
