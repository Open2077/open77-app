"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { EmptyState, Loader, Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { copy01, download02, search01, tick02 } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";

import styles from "./npc-catalogue.module.css";

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

/**
 * The searchable TweakDB NPC catalogue on the NPC and player-model guides:
 * downloaded once, validated, filtered and paged in the browser.
 */
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
  const filtering = Boolean(query || category || risk || faction);

  async function copy(record: string) {
    try { await navigator.clipboard.writeText(record); setCopied(record); setCopyError(""); }
    catch { setCopyError("Clipboard access unavailable. Select and copy the displayed record ID."); }
  }
  function reset() { setQuery(""); setCategory(""); setRisk(""); setFaction(""); setPage(0); }

  return (
    <section className={styles.catalogue} aria-labelledby="npc-browser-title" aria-busy={!data && !error} data-npc-catalogue>
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <Eyebrow>TweakDB · Game 2.31</Eyebrow>
          <Display size="sm" as="h2" id="npc-browser-title">
            Explore NPC records
          </Display>
        </div>
        <a className={styles.download} href="/data/npc-records-2.31.json" download>
          <Icon glyph={download02} />
          Download JSON
        </a>
      </div>
      <p className={styles.notice}>IDs are extracted, not certified. Review the warnings and test your chosen record in game.</p>
      <noscript>Enable JavaScript to search, or use the CSV and JSON downloads above.</noscript>

      {error ? (
        <Notice
          kind="danger"
          title="Catalogue unavailable"
          action={
            <Button size="sm" lines="none" border color="red" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>
              Retry download
            </Button>
          }
        >
          {error}
        </Notice>
      ) : !data ? (
        <Loader label="NPC catalogue" className={styles.loader} />
      ) : (
        <>
          <div className={styles.filters}>
            <Field label="Search records" className={styles.searchField}>
              <Input
                icon={search01}
                type="search"
                placeholder="Character ID, faction or appearance…"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}>
                <option value="">All categories</option>
                {options.categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </Select>
            </Field>
            <Field label="Classification">
              <Select value={risk} onChange={(event) => { setRisk(event.target.value); setPage(0); }}>
                <option value="">All classifications</option>
                {options.risks.map((value) => <option key={value} value={value}>{RISK_LABELS[value] ?? label(value)}</option>)}
              </Select>
            </Field>
            <Field label="Faction">
              <Select value={faction} onChange={(event) => { setFaction(event.target.value); setPage(0); }}>
                <option value="">All factions</option>
                {options.factions.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </Select>
            </Field>
          </div>

          <div className={styles.results} data-npc-results>
            <p role="status">
              {filtered.length.toLocaleString("en-GB")} of {data.count.toLocaleString("en-GB")} records · Page {currentPage + 1} / {pages}
            </p>
            <Button size="sm" lines="none" color="neutral" onClick={reset} disabled={!filtering}>
              Reset filters
            </Button>
          </div>
          <p className={styles.copyStatus} role="status">
            {copyError || (copied ? `Copied ${copied}` : "Copy a record ID, or expand it to inspect its assets.")}
          </p>

          <ul className={styles.list} data-npc-list>
            {visible.map((record) => (
              <li key={record.record} className={styles.item}>
                <div className={styles.record}>
                  <code>{record.record}</code>
                  <button type="button" className={styles.copy} aria-label={`Copy ${record.record}`} onClick={() => void copy(record.record)}>
                    <Icon glyph={copied === record.record ? tick02 : copy01} />
                    {copied === record.record ? "Copied" : "Copy ID"}
                  </button>
                </div>
                <div className={styles.tags}>
                  <Tag tone="neutral">{label(record.category)}</Tag>
                  <span data-risk={record.risk}>
                    <Tag tone={record.risk === "candidate" ? "blue" : "yellow"}>{RISK_LABELS[record.risk] ?? label(record.risk)}</Tag>
                  </span>
                  {record.affiliation ? <Tag tone="neutral">{label(record.affiliation)}</Tag> : null}
                </div>
                <details className={styles.details}>
                  <summary>Asset details</summary>
                  <dl>
                    <dt>Entity template</dt><dd><code>{record.entity_template || "Not resolved"}</code></dd>
                    <dt>Default appearance</dt><dd><code>{record.default_appearance || "Not specified"}</code></dd>
                    <dt>Extracted appearances</dt><dd><code>{record.all_appearances.split(";").join(", ") || "Not specified"}</code></dd>
                    <dt>Database source</dt><dd>{record.source} · Not a DLC compatibility guarantee.</dd>
                  </dl>
                </details>
              </li>
            ))}
          </ul>

          {!visible.length ? (
            <div data-npc-empty>
              <EmptyState
                eyebrow="// 0 records"
                title="No matching NPCs"
                action={<Button size="sm" lines="none" border color="red" onClick={reset}>Show all records</Button>}
              >
                Try a shorter ID or remove a filter.
              </EmptyState>
            </div>
          ) : null}

          <nav className={styles.pagination} aria-label="NPC catalogue pages">
            <Button size="sm" lines="none" border color="red" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <span>{currentPage + 1} / {pages}</span>
            <Button size="sm" lines="none" border color="red" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>
              Next
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
