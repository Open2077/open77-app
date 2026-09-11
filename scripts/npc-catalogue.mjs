import { createHash } from "node:crypto";

/** Quoted CSV, including escaped quotes, commas and multiline cells. */
export function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(value); value = ""; closed = false;
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        rows.push(row); row = [];
      }
    } else if (char === '"' && !value && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error("Malformed CSV field");
      value += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (row.length || value || closed) { row.push(value); rows.push(row); }
  return rows;
}

export function buildNpcCatalogue(csv) {
  const [header, ...rows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  const fields = ["record", "category", "risk", "affiliation", "entity_template", "default_appearance", "all_appearances", "source"];
  if (new Set(header).size !== header.length || fields.some((field) => !header.includes(field))) {
    throw new Error("Unexpected NPC CSV columns");
  }
  const seen = new Set();
  const records = rows.map((row) => {
    if (row.length !== header.length) throw new Error("NPC CSV column count mismatch");
    const raw = Object.fromEntries(header.map((key, index) => [key, row[index]]));
    if (!raw.record || seen.has(raw.record)) throw new Error(`Invalid/duplicate NPC ID: ${raw.record}`);
    seen.add(raw.record);
    return Object.fromEntries(fields.map((field) => [field, raw[field]]));
  }).sort((a, b) => a.record < b.record ? -1 : a.record > b.record ? 1 : 0);
  const supported = records.filter((record) => /^Character\.[A-Za-z0-9_.-]+$/.test(record.record));
  if (!supported.length) throw new Error("Empty NPC catalogue");
  return { schemaVersion: 1, gameVersion: "2.31", source: "docs/generated/npc-records-2.31.csv",
    sourceSha256: createHash("sha256").update(csv).digest("hex"), sourceCount: records.length,
    excludedUnsupportedIds: records.length - supported.length, count: supported.length,
    notice: "Extracted Character.* records, not multiplayer-tested spawn guarantees. Database source is not a per-record DLC requirement.", records: supported };
}
