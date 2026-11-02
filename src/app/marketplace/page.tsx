"use client";

// The marketplace: every open participation, filtered the way the mockup
// filters, with the facets counted by the server. The filters live in the
// URL so a member can bookmark a view and the offering page can step
// through the same ordering.
//
//   GET /capital/listings?vertical=&status=&program=&collateral=&frequency=&lien=&state=&min_rate=&max_term=&max_ltv=&max_minimum=&min_remaining=&personal_guarantee=&sort=

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListingCard, daysLabel } from "@/components/ListingCard";
import { gateFromError } from "@/lib/api";
import { compact, day, LIEN, months, pct, STATUS } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks";
import { VERTICAL_CLASS, type ListingsPage } from "@/lib/types";
import { useMe } from "@/lib/useMe";

const VERTICALS = [["all", "All industries"], ["real_estate", "Real estate"], ["auto", "Auto"], ["business", "Business"]] as const;
const SORTS = [["newest", "Newest first"], ["rate", "Highest note rate"], ["term", "Shortest term"], ["ltv", "Lowest LTV"], ["remaining", "Most remaining"]] as const;

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="card h-40" aria-busy="true" />}>
      <Marketplace />
    </Suspense>
  );
}

function Marketplace() {
  const router = useRouter();
  const params = useSearchParams();
  const { cleared, preview, isResolving } = useMe();
  const query = params.toString();
  const { data, error, isLoading } = useApiQuery<ListingsPage>(["listings", query], `/capital/listings${query ? `?${query}` : ""}`, cleared || preview);

  useEffect(() => {
    if (!isResolving && !cleared && !preview) router.replace("/");
  }, [cleared, preview, isResolving, router]);
  useEffect(() => {
    if (error && gateFromError(error)) router.replace("/");
  }, [error, router]);
  useEffect(() => {
    if (data) {
      try { sessionStorage.setItem("cp.market.order", JSON.stringify(data.items.map((l) => l.ref))); } catch { /* private mode */ }
    }
  }, [data]);

  const get = (k: string, d = "") => params.get(k) ?? d;
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v == null || v === "" || v === "any" || v === "all" || v === "false") next.delete(k); else next.set(k, v);
    router.replace(`/marketplace${next.toString() ? `?${next}` : ""}`);
  };
  const toggleList = (k: string, v: string) => {
    const cur = list(k);
    setParam(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(","));
  };
  const vertical = get("vertical", "all");
  const statuses = list("status");
  const view = get("view", "cards");
  const sort = get("sort", "newest");
  const items = data?.items ?? [];
  const stats = data?.stats;
  const facets = data?.facets;
  const resultNoun = items.length === 1 ? "loan" : "loans";
  const minRate = get("min_rate", "8"); const maxTerm = get("max_term", "36"); const maxLtv = get("max_ltv", "80");
  const activeCount = useMemo(() => [...params.keys()].filter((k) => !["view", "sort", "vertical"].includes(k)).length, [params]);

  return (
    <section className="grid gap-6">
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div><span className="kicker">Member marketplace</span><h1 className="text-h1 m-0">Loan participations</h1></div>
        <p className="fineprint m-0 max-w-[520px]">Each participation is a separate offering in a single loan, serviced by an independent third-party servicer. Read the private placement memorandum before subscribing.{data ? ` Figures as of ${day(data.as_of)}.` : ""}</p>
      </div>

      {stats ? (
        <div className="proof-bar p-6 gap-6">
          <div className="stat"><span className="stat-value">{stats.open_count}</span><span className="stat-label">Open offerings</span></div>
          <div className="stat"><span className="stat-value">{compact(stats.available_amount)}</span><span className="stat-label">Available to subscribe</span></div>
          <div className="stat"><span className="stat-value">{pct(stats.weighted_note_rate_pct)}</span><span className="stat-label">Weighted note rate, open loans</span></div>
          <div className="stat"><span className="stat-value">{pct(stats.average_ltv_pct, 0)}</span><span className="stat-label">Average LTV, open loans</span></div>
        </div>
      ) : null}

      <div className="industry-switch">
        {VERTICALS.map(([id, label]) => (
          <button key={id} type="button" className={`industry-opt ${id === "all" ? "" : VERTICAL_CLASS[id]}`} aria-current={vertical === id ? "true" : "false"} onClick={() => setParam("vertical", id)} style={{ cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: 600 }}>
            {label}<span className="num font-medium text-mutedFg">{data?.vertical_counts[id] ?? ""}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 nav:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <aside className="card p-5 gap-[22px] nav:sticky nav:top-[120px]">
          <div className="flex justify-between items-center"><h2 className="text-[17px] m-0">Filters</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => router.replace(`/marketplace${vertical !== "all" ? `?vertical=${vertical}` : ""}`)}>Reset{activeCount ? ` (${activeCount})` : ""}</button></div>
          <FacetGroup title="Status" facets={facets?.status ?? [["open", "Open"], ["closing", "Closing"], ["fully_subscribed", "Fully subscribed"]].map(([value, label]) => ({ value, label, count: 0 }))} selected={statuses.length ? statuses : ["open", "closing"]} onToggle={(v) => { const cur = statuses.length ? statuses : ["open", "closing"]; setParam("status", (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",")); }} />
          {facets?.program?.length ? <FacetGroup title="Loan program" facets={facets.program} selected={list("program")} onToggle={(v) => toggleList("program", v)} /> : null}
          <div className="grid gap-2">
            <h6 className="m-0">Lien position</h6>
            <div className="seg flex">{[["any", "Any"], ["first", "1st"], ["second", "2nd"]].map(([v, l]) => <label key={v} className="seg-opt flex-1 justify-center"><input type="radio" name="lien" className="sr-only" checked={get("lien", "any") === v} onChange={() => setParam("lien", v)} /><span>{l}</span></label>)}</div>
          </div>
          <div className="field"><h6 className="m-0">State / market</h6><select className="input" value={get("state", "any")} onChange={(e) => setParam("state", e.target.value)}><option value="any">All states</option>{(facets?.state ?? []).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
          {facets?.collateral?.length ? <FacetGroup title="Collateral" facets={facets.collateral} selected={list("collateral")} onToggle={(v) => toggleList("collateral", v)} /> : null}
          <Range label="Note rate, at least" value={minRate} display={pct(minRate)} min={8} max={14} step={0.25} onChange={(v) => setParam("min_rate", v === "8" ? null : v)} />
          <Range label="Term, at most" value={maxTerm} display={`${maxTerm} mo`} min={3} max={36} step={3} onChange={(v) => setParam("max_term", v === "36" ? null : v)} />
          <Range label="LTV / LTC, at most" value={maxLtv} display={`${maxLtv}%`} min={40} max={80} step={1} onChange={(v) => setParam("max_ltv", v === "80" ? null : v)} />
          <div className="field"><h6 className="m-0">Minimum investment</h6><select className="input" value={get("max_minimum", "any")} onChange={(e) => setParam("max_minimum", e.target.value)}><option value="any">Any minimum</option><option value="10000">$10K or less</option><option value="25000">$25K or less</option><option value="50000">$50K or less</option></select></div>
          <div className="field"><h6 className="m-0">Amount remaining</h6><select className="input" value={get("min_remaining", "any")} onChange={(e) => setParam("min_remaining", e.target.value)}><option value="any">Any amount</option><option value="100000">$100K or more</option><option value="250000">$250K or more</option><option value="500000">$500K or more</option><option value="1000000">$1M or more</option></select></div>
          {facets?.frequency?.length ? <FacetGroup title="Payment frequency" facets={facets.frequency} selected={list("frequency")} onToggle={(v) => toggleList("frequency", v)} /> : null}
          <label className="flex items-center gap-2.5 text-sm cursor-pointer pt-4 border-t border-divider"><input type="checkbox" className="w-4 h-4 accent-accent-600" checked={get("personal_guarantee") === "true"} onChange={(e) => setParam("personal_guarantee", e.target.checked ? "true" : null)} /><span>Personal guarantee only</span></label>
        </aside>

        <div className="grid gap-4 min-w-0">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <p className="m-0 text-sm text-mutedFg"><strong className="num text-ink">{isLoading ? "…" : items.length}</strong> {resultNoun} match your filters</p>
            <div className="flex gap-3 items-center">
              <select className="input w-auto min-h-[38px] py-1.5" value={sort} onChange={(e) => setParam("sort", e.target.value === "newest" ? null : e.target.value)}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <div className="seg">{[["cards", "Cards"], ["table", "Table"]].map(([v, l]) => <label key={v} className="seg-opt"><input type="radio" name="view" className="sr-only" checked={view === v} onChange={() => setParam("view", v === "cards" ? null : v)} /><span>{l}</span></label>)}</div>
            </div>
          </div>
          {!isLoading && items.length === 0 ? (
            <div className="card items-start p-8"><h3 className="text-xl m-0">No loans match these filters.</h3><p className="text-mutedFg m-0">Widen the rate, term or LTV range, or clear the program and collateral filters.</p><button type="button" className="btn btn-secondary" onClick={() => router.replace("/marketplace")}>Reset filters</button></div>
          ) : view === "table" ? (
            <div className="card py-1 px-2 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Loan</th><th>Industry</th><th>Program</th><th>Lien</th><th>State</th><th className="align-end">Rate</th><th className="align-end">Term</th><th className="align-end">LTV</th><th className="align-end">Minimum</th><th className="align-end">Remaining</th><th>Status</th></tr></thead>
                <tbody>
                  {items.map((l) => {
                    const [sl, sc] = STATUS[l.status] ?? [l.status, "tag tag-neutral"];
                    return (
                      <tr key={l.id} onClick={() => router.push(`/marketplace/${l.ref}`)} className="cursor-pointer">
                        <td><div className="grid"><Link href={`/marketplace/${l.ref}`}>{l.name}</Link><span className="num text-xs font-normal text-mutedFg">{l.ref} · {l.place}</span></div></td>
                        <td><span className={VERTICAL_CLASS[l.vertical]}><span className="tag tag-accent">{l.vertical_label}</span></span></td>
                        <td>{l.program_label}</td><td>{LIEN[l.lien_position]}</td><td>{l.state}</td>
                        <td className="align-end">{pct(l.note_rate_pct)}</td><td className="align-end">{months(l.term_months)}</td><td className="align-end">{pct(l.ltv_pct, 0)}</td>
                        <td className="align-end">{compact(l.minimum_investment)}</td><td className="align-end">{Number(l.remaining_amount) > 0 ? compact(l.remaining_amount) : "—"}</td>
                        <td><span className={sc}>{sl}</span><span className="sr-only">{daysLabel(l)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{(isLoading ? [] : items).map((l) => <ListingCard key={l.id} listing={l} />)}</div>
          )}
          <p className="fineprint m-0">Note rates are the interest rate paid to participants, before any servicing fee described in the offering documents. Past performance of other loans does not predict the performance of any participation. Participations are not FDIC insured and may lose value.</p>
        </div>
      </div>
    </section>
  );
}

function FacetGroup({ title, facets, selected, onToggle }: { title: string; facets: { value: string; label: string; count: number }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <h6 className="m-0">{title}</h6>
      {facets.map((f) => (
        <label key={f.value} className="flex items-center gap-2.5 text-sm cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-accent-600" checked={selected.includes(f.value)} onChange={() => onToggle(f.value)} /><span className="flex-1">{f.label}</span><span className="num text-xs text-mutedFg">{f.count}</span></label>
      ))}
    </div>
  );
}

function Range({ label, value, display, min, max, step, onChange }: { label: string; value: string; display: string; min: number; max: number; step: number; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between items-baseline"><h6 className="m-0">{label}</h6><span className="num text-sm font-semibold">{display}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
