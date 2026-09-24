"use client";

import { useEffect, useMemo, useState } from "react";

type NpcRecord = {
  record: string; category: string; risk: string; affiliation: string;
  entity_template: string; default_appearance: string; all_appearances: string; source: string;
};
type Catalogue = { schemaVersion: number; gameVersion: string; count: number; records: NpcRecord[] };
const PAGE_SIZE = 40;
const RISK_LABELS: Record<string, string> = {
  candidate: "Candidate (untested)", unsafe_quest_or_scene: "Quest / scene", special_rig: "Special rig",
  special_vendor: "Vendor", restricted_child: "Child", deny_player: "Player", missing_template: "Missing template",
};
const label = (value: string) => value.replace(/^Factions\./, "").replaceAll("_", " ");

export function NpcCatalogue() {
  const [data, setData] = useState<Catalogue | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [risk, setRisk] = useState("");
  const [faction, setFaction] = useState("");
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    fetch("/data/npc-records-2.31.json", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalogue download failed");
        const result: Catalogue = await response.json();
        if (result.schemaVersion !== 1 || !Array.isArray(result.records) || result.count !== result.records.length
          || result.records.some((record) => ["record", "category", "risk", "affiliation", "entity_template", "default_appearance", "all_appearances", "source"]
            .some((key) => typeof record[key as keyof NpcRecord] !== "string"))) throw new Error("Invalid catalogue");
        if (!abort.signal.aborted) setData(result);
      }).catch(() => {
        if (!abort.signal.aborted) setError("The catalogue could not be loaded. You can retry or download the CSV above.");
      });
    return () => abort.abort();
  }, [attempt]);

  const options = useMemo(() => {
    const values = (key: "category" | "risk" | "affiliation") => [...new Set(data?.records.map((record) => record[key]).filter(Boolean))].sort();
    return { categories: values("category"), risks: values("risk"), factions: values("affiliation") };
  }, [data]);
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return data?.records.filter((record) => (!category || category === record.category)
      && (!risk || risk === record.risk) && (!faction || faction === record.affiliation)
      && terms.every((term) => `${record.record} ${record.affiliation} ${record.category} ${record.default_appearance}`.toLowerCase().includes(term))) ?? [];
  }, [data, query, category, risk, faction]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function copy(record: string) {
    try { await navigator.clipboard.writeText(record); setCopied(record); setCopyError(""); }
    catch { setCopyError("Clipboard access unavailable. Select and copy the displayed record ID."); }
  }
  function reset() { setQuery(""); setCategory(""); setRisk(""); setFaction(""); setPage(0); }

  return (
    <section className="npc-catalogue" aria-labelledby="npc-browser-title" aria-busy={!data && !error}>
      <div className="npc-catalogue-heading">
        <div><span className="npc-catalogue-eyebrow">TWEAKDB · GAME 2.31</span><h2 id="npc-browser-title">Explore NPC records</h2></div>
        <a href="/data/npc-records-2.31.json" download>Download JSON ↗</a>
      </div>
      <p className="npc-catalogue-notice">IDs are extracted, not certified. Review the warnings and test your chosen record in game.</p>
      <noscript>Enable JavaScript to search, or use the CSV and JSON downloads above.</noscript>
      {error ? <div role="alert" className="npc-catalogue-empty"><p>{error}</p><button onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry download</button></div>
        : !data ? <p role="status" className="npc-catalogue-empty"><span className="npc-catalogue-spinner" /> Loading NPC catalogue…</p>
          : <>
            <div className="npc-catalogue-filters">
              <label className="npc-catalogue-search">Search records<input type="search" placeholder="Character ID, faction or appearance…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label>
              <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}><option value="">All categories</option>{options.categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
              <label>Classification<select value={risk} onChange={(event) => { setRisk(event.target.value); setPage(0); }}><option value="">All classifications</option>{options.risks.map((value) => <option key={value} value={value}>{RISK_LABELS[value] ?? label(value)}</option>)}</select></label>
              <label>Faction<select value={faction} onChange={(event) => { setFaction(event.target.value); setPage(0); }}><option value="">All factions</option>{options.factions.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            </div>
            <div className="npc-catalogue-results"><p role="status">{filtered.length.toLocaleString("en-GB")} of {data.count.toLocaleString("en-GB")} records · Page {currentPage + 1} / {pages}</p><button onClick={reset} disabled={!query && !category && !risk && !faction}>Reset filters</button></div>
            <p className="npc-catalogue-copy-status" role="status">{copyError || (copied ? `Copied ${copied}` : "Copy a record ID, or expand it to inspect its assets.")}</p>
            <ul className="npc-catalogue-list">
              {visible.map((record) => <li key={record.record}>
                <div className="npc-catalogue-record">
                  <code>{record.record}</code><button aria-label={`Copy ${record.record}`} onClick={() => void copy(record.record)}>{copied === record.record ? "Copied ✓" : "Copy ID"}</button>
                </div>
                <div className="npc-catalogue-tags"><span>{label(record.category)}</span><span data-risk={record.risk}>{RISK_LABELS[record.risk] ?? label(record.risk)}</span>{record.affiliation ? <span>{label(record.affiliation)}</span> : null}</div>
                <details><summary>Asset details</summary><dl>
                  <dt>Entity template</dt><dd><code>{record.entity_template || "Not resolved"}</code></dd>
                  <dt>Default appearance</dt><dd><code>{record.default_appearance || "Not specified"}</code></dd>
                  <dt>Extracted appearances</dt><dd><code>{record.all_appearances.split(";").join(", ") || "Not specified"}</code></dd>
                  <dt>Database source</dt><dd>{record.source} · Not a DLC compatibility guarantee.</dd>
                </dl></details>
              </li>)}
            </ul>
            {!visible.length ? <div className="npc-catalogue-empty"><h3>No matching NPCs</h3><p>Try a shorter ID or remove a filter.</p><button onClick={reset}>Show all records</button></div> : null}
            <nav className="npc-catalogue-pagination" aria-label="NPC catalogue pages">
              <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Previous</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next →</button>
            </nav>
          </>}
    </section>
  );
}
