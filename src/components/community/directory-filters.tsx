"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilterIcon, SearchIcon } from "@/components/icons";
import { categories, type CommunityDirectoryQuery } from "@/lib/community/types";
import { directoryQuery, directorySorts } from "@/lib/community/directory";

const FORM_ID = "hub-directory";

/** A link to the library with one filter changed and the cursor reset. */
function href(filters: CommunityDirectoryQuery, patch: Partial<CommunityDirectoryQuery>) {
  const query = directoryQuery({ ...filters, ...patch, cursor: undefined });
  const text = query.toString();
  return text ? `/resources?${text}` : "/resources";
}

function RailChoice({ filters, patch, current, children }: { filters: CommunityDirectoryQuery; patch: Partial<CommunityDirectoryQuery>; current: boolean; children: ReactNode }) {
  return <Link className={`hub-rail-row${current ? " is-active" : ""}`} href={href(filters, patch)} {...(current ? { "aria-current": "true" as const } : {})}>{children}</Link>;
}

/**
 * The library controls. One HTML form (search, sort, build, tags) plus plain
 * links for the single-choice facets, so the whole thing works without
 * JavaScript and the URL stays the only source of truth. Selects submit on
 * change; on narrow screens the rail becomes a dialog.
 */
export function DirectoryFilters({ filters, rail, toolbar }: { filters: CommunityDirectoryQuery; rail?: boolean; toolbar?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = (["query", "category", "tags", "kind", "build", "hasSource"] as const).filter(key => filters[key]);
  const railCount = active.filter(key => key !== "query" && key !== "category").length;
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const close = () => { if (desktop.matches && dialog.current?.open) dialog.current.close(); };
    desktop.addEventListener("change", close); return () => desktop.removeEventListener("change", close);
  }, []);
  const submit = (event: { currentTarget: HTMLSelectElement }) => event.currentTarget.form?.requestSubmit();
  const railBody = <>
    <div className="hub-rail-section"><h2>Type</h2>
      <RailChoice filters={filters} patch={{ kind: "" }} current={!filters.kind}>Everything</RailChoice>
      <RailChoice filters={filters} patch={{ kind: "resource" }} current={filters.kind === "resource"}>Downloadable resources</RailChoice>
      <RailChoice filters={filters} patch={{ kind: "showcase" }} current={filters.kind === "showcase"}>Showcases</RailChoice></div>
    <div className="hub-rail-section"><h2>Source code</h2>
      <RailChoice filters={filters} patch={{ hasSource: "" }} current={!filters.hasSource}>Any</RailChoice>
      <RailChoice filters={filters} patch={{ hasSource: "true" }} current={filters.hasSource === "true"}>Source link provided</RailChoice>
      <RailChoice filters={filters} patch={{ hasSource: "false" }} current={filters.hasSource === "false"}>No source link</RailChoice></div>
    <div className="hub-rail-section hub-rail-fields"><h2>Compatibility</h2>
      <label className="hub-field"><span>Open77 build</span><input form={FORM_ID} name="build" defaultValue={filters.build} maxLength={100} placeholder="Exact build identifier" /></label>
      <label className="hub-field"><span>Tags</span><input form={FORM_ID} name="tags" defaultValue={filters.tags} maxLength={164} placeholder="rp, vehicles" /></label>
      <small>Up to five tags; every tag must match. A build filter matches releases the author tested on it.</small>
      <button className="btn btn-ghost btn-small" type="submit" form={FORM_ID}>Apply</button></div>
  </>;
  return <>
    {toolbar && <form id={FORM_ID} className="hub-toolbar" action="/resources" role="search" aria-label="Search the community library" key={directoryQuery(filters).toString()}>
      {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
      {filters.hasSource && <input type="hidden" name="hasSource" value={filters.hasSource} />}
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      <button ref={button} type="button" className="hub-tool hub-tool-filters" aria-expanded={open} onClick={() => { setOpen(true); dialog.current?.showModal(); }}>
        <FilterIcon size={14} /><span>Filters</span>{railCount > 0 && <b>{railCount}</b>}</button>
      <label className="hub-search"><SearchIcon size={15} /><span className="hub-sr-only">Search resources</span>
        <input type="search" name="query" defaultValue={filters.query} maxLength={200} placeholder="Search resources, gamemodes, maps, tools…" /></label>
      <label className="hub-select"><span>Sort</span><select name="sort" defaultValue={filters.sort ?? "new"} onChange={submit}>{directorySorts.map(sort => <option key={sort.id} value={sort.id}>{sort.label}</option>)}</select></label>
      <button className="btn btn-primary btn-small hub-toolbar-go" type="submit">Search</button>
    </form>}
    {toolbar && <nav className="hub-modes" aria-label="Categories">
      <Link className={`hub-chip${!filters.category ? " is-active" : ""}`} href={href(filters, { category: "" })} {...(!filters.category ? { "aria-current": "true" as const } : {})}>All</Link>
      {categories.map(category => <Link key={category.id} className={`hub-chip${filters.category === category.id ? " is-active" : ""}`} href={href(filters, { category: category.id })}
        {...(filters.category === category.id ? { "aria-current": "true" as const } : {})}>{category.label}</Link>)}
    </nav>}
    {rail && <aside className="hub-rail" aria-label="Library filters"><div className="hub-rail-heading"><span className="hub-kicker">FILTERS</span>{railCount > 0 && <Link href={href(filters, { kind: "", hasSource: "", build: "", tags: "" })}>Clear</Link>}</div>{railBody}</aside>}
    {rail && <dialog ref={dialog} className="hub-filter-drawer" aria-label="Library filters" onClose={() => { setOpen(false); button.current?.focus(); }}>
      <div className="hub-rail-heading"><span className="hub-kicker">FILTERS</span><button type="button" className="btn btn-ghost btn-small" onClick={() => dialog.current?.close()}>Close</button></div>{railBody}</dialog>}
    {toolbar && active.some(key => key !== "category") && <div className="hub-active-filters" aria-label="Active filters">
      {active.filter(key => key !== "category").map(key => <Link key={key} href={href(filters, { [key]: "" })} aria-label={`Remove ${key} filter`}>
        <span>{key === "hasSource" ? (filters[key] === "true" ? "Source available" : "No source") : key === "kind" ? (filters[key] === "resource" ? "Downloadable" : "Showcases") : key === "query" ? `“${filters[key]}”` : `${key}: ${filters[key]}`}</span> ×</Link>)}
      <Link className="hub-clear" href="/resources">Reset</Link></div>}
  </>;
}
