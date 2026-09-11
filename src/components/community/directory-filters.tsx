"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { categories, type CommunityDirectoryQuery } from "@/lib/community/types";
import { directoryQuery, directorySorts } from "@/lib/community/directory";

export function DirectoryFilters({ filters }: { filters: CommunityDirectoryQuery }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const chips = (["query", "category", "tags", "kind", "build", "hasSource"] as const).filter(key => filters[key]);
  function close() { dialog.current?.close(); button.current?.focus(); }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 641px)");
    const resize = () => { if (desktop.matches && dialog.current?.open) dialog.current.close(); };
    desktop.addEventListener("change", resize); return () => desktop.removeEventListener("change", resize);
  }, []);
  const fields = <>
    <label>Search resources<input name="query" type="search" defaultValue={filters.query} maxLength={200} placeholder="What would you like to build?" /></label>
    <label>Category<select name="category" defaultValue={filters.category}><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>Tags<input name="tags" defaultValue={filters.tags} maxLength={164} placeholder="rp,vehicles" /><small>Up to five, separated by commas. All selected tags must match.</small></label>
    <label>Project type<select name="kind" defaultValue={filters.kind}><option value="">Resources and showcases</option><option value="resource">Downloadable resources</option><option value="showcase">Showcases</option></select></label>
    <label>Open77 build<input name="build" defaultValue={filters.build} maxLength={100} placeholder="Exact build identifier" /><small>Matches a build the author lists on a published release.</small></label>
    <label>Source availability<select name="hasSource" defaultValue={filters.hasSource}><option value="">Any</option><option value="true">Source link provided</option><option value="false">No source link</option></select></label>
    <label>Sort<select name="sort" defaultValue={filters.sort ?? "new"}>{directorySorts.map(sort => <option key={sort.id} value={sort.id}>{sort.label}</option>)}</select></label>
    <button className="btn btn-primary" type="submit">Find resources</button><Link href="/resources">Clear filters</Link>
  </>;
  return <><div className="hub-desktop-filters"><form key={directoryQuery(filters).toString()} className="hub-directory-filters" action="/resources" role="search" aria-label="Filter community resources">{fields}</form></div>
    <div className="hub-mobile-filters"><button ref={button} type="button" className="btn btn-ghost" onClick={() => dialog.current?.showModal()}>Search and filters{chips.length ? ` (${chips.length})` : ""}</button>
      <dialog ref={dialog} className="hub-filter-drawer" aria-label="Search and filter resources" onClose={() => button.current?.focus()}><div className="hub-section-head"><h2>Find your next resource</h2><button type="button" className="btn btn-ghost" onClick={close}>Close filters</button></div>
        <form key={directoryQuery(filters).toString()} className="hub-directory-filters" action="/resources" role="search">{fields}</form></dialog></div>
    <noscript><form className="hub-directory-filters" action="/resources" role="search" aria-label="Filter resources without JavaScript">{fields}</form></noscript>
    {chips.length > 0 && <nav className="hub-filter-chips" aria-label="Selected filters">{chips.map(key => <Link key={key} href={`/resources?${directoryQuery({ ...filters, [key]: undefined, cursor: undefined })}`} aria-label={`Remove ${key} filter: ${filters[key]}`}>
      {key === "hasSource" ? filters[key] === "true" ? "Source available" : "No source link" : `${key}: ${filters[key]}`} <span aria-hidden="true">×</span>
    </Link>)}</nav>}</>;
}
