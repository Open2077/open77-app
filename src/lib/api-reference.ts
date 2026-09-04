import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDocumentedServerApi } from "@/lib/server-api-docs";

const API_FILE = path.join(process.cwd(), "content", "api", "api.json");

/** One entry as emitted by `wiki/tools/extract-api.py --json`. */
export type ApiParam = {
  name: string;
  type: string;
  optional: boolean;
  default: string | null;
};

export type ApiEntryRaw = {
  namespace: string;
  name: string;
  handler: string;
  summary: string;
  description: string;
  params: ApiParam[];
  returns: string[];
  /** `shared` works anywhere, `game` needs a live game instance, `network` uses the transport. */
  api_set: string;
  runtime: string;
  source: string;
  example?: string;
  inferred: boolean;
  source_line?: number;
  qualified: string;
  route_id: string;
  documentedSignature?: string;
  signatureKnown?: boolean;
  guideHref?: string;
};

export type ApiRuntime = "client" | "server";

export type ApiEntry = ApiEntryRaw & {
  runtime: ApiRuntime;
  /** Namespace slug this entry lives under. */
  namespaceSlug: string;
  /** In-page heading id, unique within the namespace page. */
  anchor: string;
  /** Deep link to the entry's section. */
  href: string;
  /** Lua call signature, e.g. `Open77.blips.create(definition)`. */
  signature: string;
};

export type ApiNamespace = {
  /** Raw namespace as extracted, e.g. `Open77.blips` or `_G`. */
  name: string;
  /** Display label; `_G` reads as "Globals". */
  label: string;
  slug: string;
  runtime: ApiRuntime;
  href: string;
  markdownHref: string;
  entries: ApiEntry[];
};

export type ApiRuntimeGroup = {
  runtime: ApiRuntime;
  label: string;
  /** One sentence on what this runtime can be trusted to do. */
  blurb: string;
  namespaces: ApiNamespace[];
  count: number;
};

export type ApiIndex = {
  entries: ApiEntry[];
  namespaces: ApiNamespace[];
  runtimes: ApiRuntimeGroup[];
  count: number;
};

const RUNTIME_META: Record<ApiRuntime, { label: string; blurb: string }> = {
  server: {
    label: "Server",
    blurb:
      "Runs on the dedicated server and is authoritative: state written here is the truth every client is told about.",
  },
  client: {
    label: "Client",
    blurb:
      "Runs inside the game process. Reads and presentation are local; anything that changes shared state has to go through the server.",
  },
};

function slugify(value: string): string {
  // `_G` is the Lua global table. Stripping its punctuation leaves the single
  // letter "g", which is a meaningless URL, so it gets the name it is called by
  // everywhere else in the reference.
  if (value === "_G") return "globals";
  return (
    value
      .replace(/^server:/, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "unnamed"
  );
}

function buildSignature(entry: ApiEntryRaw): string {
  if (entry.documentedSignature) return `${entry.qualified}${entry.documentedSignature}`;
  const params = entry.params
    .map((param) => (param.optional ? `[${param.name}]` : param.name))
    .join(", ");
  return `${entry.qualified}(${params})`;
}

function normaliseRuntime(runtime: string): ApiRuntime {
  return runtime === "server" ? "server" : "client";
}

/**
 * Drops the inline Markdown from a prose field.
 *
 * For a one-line search result or a `description` in structured data, a chip
 * around every identifier is noise and a literal backtick is worse; both want
 * the sentence as a reader would say it aloud.
 */
export function stripInlineMarkdown(text: string): string {
  return text.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

/** Display label for a namespace: `_G` is the global table, not a namespace. */
export function namespaceLabel(namespace: string): string {
  return namespace === "_G" ? "Globals" : namespace;
}

/** Human-readable meaning of `api_set`, which is otherwise a bare enum. */
export function apiSetLabel(apiSet: string): { label: string; hint: string } {
  switch (apiSet) {
    case "game":
      return { label: "GAME", hint: "Requires a live game instance." };
    case "network":
      return { label: "NETWORK", hint: "Uses the network backend." };
    case "shared":
      return { label: "SHARED", hint: "Available without a live game instance." };
    case "client":
      return { label: "CLIENT", hint: "Client-only surface." };
    case "server":
      return { label: "SERVER", hint: "Available in server resources only." };
    default:
      return { label: apiSet.toUpperCase(), hint: "" };
  }
}

let indexCache: Promise<ApiIndex> | null = null;

export function getApiIndex(): Promise<ApiIndex> {
  // Wiki syncs can change files without changing this module during next dev.
  if (process.env.NODE_ENV === "development") return loadApiIndex();
  if (!indexCache) indexCache = loadApiIndex();
  return indexCache;
}

/**
 * Builds the reference from the extractor's JSON.
 *
 * Pages are grouped per namespace rather than per function. 258 single-function
 * pages would each carry a signature and two sentences, which is the shape
 * search engines treat as thin content and which makes the reference tedious to
 * read; a namespace page is a genuine unit of documentation, and every function
 * still has its own anchor so deep links keep working.
 */
async function loadApiIndex(): Promise<ApiIndex> {
  const raw = await readFile(API_FILE, "utf8");
  const generated = JSON.parse(raw) as ApiEntryRaw[];
  const parsed = [...generated, ...await getDocumentedServerApi(generated)];

  const namespaceKeys = new Map<string, string>();
  const anchorKeys = new Map<string, string>();

  const entries: ApiEntry[] = parsed.map((raw) => {
    const runtime = normaliseRuntime(raw.runtime);
    const namespaceSlug = slugify(raw.namespace);
    const anchor = slugify(raw.name);

    assertUnique(
      namespaceKeys,
      `${runtime}/${namespaceSlug}`,
      raw.namespace,
      "namespace",
      raw.qualified,
    );
    assertUnique(
      anchorKeys,
      `${runtime}/${namespaceSlug}#${anchor}`,
      raw.qualified,
      "anchor",
      raw.qualified,
    );

    return {
      ...raw,
      runtime,
      namespaceSlug,
      anchor,
      href: `/docs/api/${runtime}/${namespaceSlug}#${anchor}`,
      signature: buildSignature(raw),
    };
  });

  const namespaces: ApiNamespace[] = [];
  const runtimes: ApiRuntimeGroup[] = [];

  // Server first: authority is the concept a reader has to hold on to, and a
  // client projection listed above it invites the wrong mental model.
  for (const runtime of ["server", "client"] as const) {
    const scoped = entries.filter((entry) => entry.runtime === runtime);
    if (scoped.length === 0) continue;

    const grouped = new Map<string, ApiEntry[]>();
    for (const entry of scoped) {
      const bucket = grouped.get(entry.namespace);
      if (bucket) bucket.push(entry);
      else grouped.set(entry.namespace, [entry]);
    }

    const scopedNamespaces = [...grouped.entries()]
      .map(([name, list]) => {
        const slug = slugify(name);
        return {
          name,
          label: namespaceLabel(name),
          slug,
          runtime,
          href: `/docs/api/${runtime}/${slug}`,
          markdownHref: `/docs/api/${runtime}/${slug}.md`,
          entries: [...list].sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      // `_G` first: those are the globals every resource starts from.
      .sort((a, b) => {
        if (a.name === "_G") return -1;
        if (b.name === "_G") return 1;
        return a.name.localeCompare(b.name);
      });

    namespaces.push(...scopedNamespaces);
    runtimes.push({
      runtime,
      ...RUNTIME_META[runtime],
      namespaces: scopedNamespaces,
      count: scoped.length,
    });
  }

  return { entries, namespaces, runtimes, count: entries.length };
}

function assertUnique(
  seen: Map<string, string>,
  key: string,
  value: string,
  kind: string,
  context: string,
) {
  const existing = seen.get(key);
  if (existing !== undefined && existing !== value) {
    throw new Error(
      `API ${kind} slug collision on "${key}": "${value}" and "${existing}" (from ${context}). ` +
        "Adjust slugify in src/lib/api-reference.ts.",
    );
  }
  seen.set(key, value);
}

export async function getApiNamespace(
  runtime: string,
  slug: string,
): Promise<ApiNamespace | null> {
  const index = await getApiIndex();
  return (
    index.namespaces.find(
      (namespace) => namespace.runtime === runtime && namespace.slug === slug,
    ) ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* Markdown projection                                                        */
/* -------------------------------------------------------------------------- */

/** One entry as a Markdown section, used by the raw `.md` variants. */
export function apiEntryToMarkdown(entry: ApiEntry, headingLevel = 2): string {
  const heading = "#".repeat(headingLevel);
  const lines: string[] = [`${heading} ${entry.name}`, ""];
  const { label, hint } = apiSetLabel(entry.api_set);

  lines.push("```lua", entry.signature, "```", "");
  lines.push(`\`${label}\`${hint ? ` — ${hint}` : ""}`, "");
  if (entry.summary) lines.push(entry.summary, "");
  if (entry.description) lines.push(entry.description, "");

  if (entry.params.length > 0) {
    lines.push("| Parameter | Type | Required | Default |", "|---|---|---|---|");
    for (const param of entry.params) {
      lines.push(
        `| \`${param.name}\` | \`${param.type}\` | ${
          param.optional ? "optional" : "required"
        } | ${param.default ? `\`${param.default}\`` : "—"} |`,
      );
    }
    lines.push("");
  }

  if (entry.returns.length > 0) {
    lines.push(`Returns: ${entry.returns.map((value) => `\`${value}\``).join(", ")}`, "");
  }

  if (entry.example) {
    lines.push("```lua", entry.example, "```", "");
  }

  const line = entry.source_line ? ` (line ${entry.source_line})` : "";
  lines.push(entry.guideHref ? `Documented in [${entry.source}](${entry.guideHref})${line}.` : `Registered in \`${entry.source}\`${line} as \`${entry.handler}\`.`);
  if (entry.inferred) {
    lines.push("", "_This signature was inferred from the handler body._");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * A namespace as Markdown.
 *
 * `headingLevel` lets the same function serve a standalone document (level 1)
 * and a section of the combined reference (level 3), instead of rewriting
 * heading markers with a regex afterwards — which would also rewrite anything
 * that happened to look like a heading inside a code block.
 */
export function apiNamespaceToMarkdown(namespace: ApiNamespace, headingLevel = 1): string {
  const meta = RUNTIME_META[namespace.runtime];
  const lines: string[] = [
    `${"#".repeat(headingLevel)} ${namespace.label} — ${meta.label.toLowerCase()} runtime`,
    "",
    meta.blurb,
    "",
    `${namespace.entries.length} function${namespace.entries.length === 1 ? "" : "s"}.`,
    "",
  ];
  for (const entry of namespace.entries) {
    lines.push(apiEntryToMarkdown(entry, headingLevel + 1));
  }
  return `${lines.join("\n")}\n`;
}
