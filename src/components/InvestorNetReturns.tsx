"use client";

import { useCallback, useRef, useState } from "react";
import { investorMoney, payoffMissing, type InvestorBudget, type InvestorScenario } from "@/lib/investorEconomics";
import { api, ApiError } from "@/lib/api";
import { useToken } from "@/lib/useMe";
import { useQueryClient } from "@tanstack/react-query";
import type { ListingDetail } from "@/lib/types";
import { InvestorReturnExplorer } from "./investor/InvestorReturnExplorer";
import type { InvestorExitPoint, InvestorProjectionLoader, InvestorReturnProjection } from "./investor/investorReturnModel";

function Scenario({ title, value, currency }: { title: string; value?: InvestorScenario; currency: string | null }) {
  return <article className="border border-divider rounded-md p-4 grid gap-3 min-w-0" aria-label={title}>
    <h4 className="m-0 text-base">{title}</h4><span className="text-xs text-mutedFg">{value?.horizon_months != null ? `${value.horizon_months} months` : "Horizon not established"}</span>
    <div className="readout"><span className="readout-label">Investor NET profit</span><strong className="text-h3 tabular-nums break-words" style={{ color: value?.net_income != null && value.net_income < 0 ? "var(--color-danger)" : undefined }}>{investorMoney(value?.net_income, currency)}</strong><span className="text-sm">NET ROI: {value?.net_roi_pct == null ? "Not established" : `${value.net_roi_pct.toFixed(2)}%`}</span></div>
    <dl className="program-specs m-0 border-t-0 pt-0">
      {([ ["Initial investor outlay", value?.initial_outlay], ["Principal returned", value?.principal_returned], ["Gross interest", value?.gross_interest], ["Investor fees / deductions", value?.total_fees], ["Minimum-interest charge included", value?.minimum_interest_charge], ["Payoff charge paid to investor", value?.payoff_charge_income], ["Reserve released", value?.reserve_released], ["Reserve still held", value?.reserve_held], ["Net cash received, including principal", value?.net_cash_received], ["Cash profit after initial outlay", value?.net_cash_profit] ] as const).map(([label, amount]) => <div className="program-spec" key={label}><dt>{label}</dt><dd>{investorMoney(amount, currency)}</dd></div>)}
    </dl>
    {value?.missing_assumptions?.length ? <div className="notice"><span>NET results need confirmation.<ul className="pl-4 m-0">{value.missing_assumptions.map(code => <li key={code}>{payoffMissing(code)}</li>)}</ul></span></div> : null}
    {value?.rows?.filter(row => row.payer === "investor").length ? <details><summary className="text-sm cursor-pointer">Investor fee deductions</summary><div className="grid gap-2 mt-3">{value.rows.filter(row => row.payer === "investor").map((row, index) => <div className="text-sm border-b border-divider pb-2" key={`${row.label}:${index}`}><div className="flex justify-between gap-3"><span>{row.label}</span><strong>{row.applies === false || row.status === "excluded" ? "Not charged" : row.applies === null ? "Arrangement unconfirmed" : investorMoney(row.total_amount, currency)}</strong></div><small className="text-mutedFg">{row.method === "percent" ? `${row.value ?? "Unknown"}% of ${row.basis.replaceAll("_", " ")}` : "Fixed amount"} · {row.timing === "closing" ? "once at closing" : row.timing}</small></div>)}</div></details> : null}
    {value?.assumptions?.length ? <details><summary className="text-sm cursor-pointer">Scenario assumptions</summary><ul className="text-xs text-mutedFg pl-4">{value.assumptions.map((note, index) => <li key={index}>{note}</li>)}</ul></details> : null}
  </article>;
}

export function InvestorNetReturns({ budget, listingRef, sourceKey, viewerKey }: { budget?: InvestorBudget | null; listingRef: string; sourceKey: string; viewerKey: string | null }) {
  const [expanded, setExpanded] = useState(false), [publicationPending, setPublicationPending] = useState(false);
  const [validated, setValidated] = useState<{ scope: string; value: InvestorReturnProjection } | null>(null);
  const projection = validated?.scope === sourceKey ? validated.value : null;
  const currency = projection ? projection.currency : budget?.currency ?? null;
  const token = useToken(), tokenRef = useRef(token); tokenRef.current = token;
  const queryClient = useQueryClient(), needsListingRefresh = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closeReturns = () => { setExpanded(false); requestAnimationFrame(() => opener.current?.focus()); };
  const scopeRef = useRef(sourceKey); scopeRef.current = sourceKey;
  const acceptedProjection = useCallback((value: InvestorReturnProjection | null) => { setValidated(value ? { scope: sourceKey, value } : null); }, [sourceKey]);
  const loadProjection: InvestorProjectionLoader = useCallback(async (request, signal) => {
    const capturedScope = sourceKey;
    const query = new URLSearchParams({ exit_month: String(request.exit_month) });
    if (request.investment_amount != null) query.set("investment_amount", String(request.investment_amount));
    try {
      const authToken = await tokenRef.current();
      if (!viewerKey || signal.aborted || scopeRef.current !== capturedScope) throw new DOMException("The investor view changed.", "AbortError");
      const result = await api<InvestorReturnProjection>(`/capital/listings/${encodeURIComponent(listingRef)}/investor-returns?${query}`, { authToken, signal });
      if (needsListingRefresh.current && !signal.aborted && scopeRef.current === capturedScope) {
        const currentListing = await api<ListingDetail>(`/capital/listings/${encodeURIComponent(listingRef)}`, { authToken, signal });
        if (!signal.aborted && scopeRef.current === capturedScope) { queryClient.setQueryData(["listing", listingRef, viewerKey], currentListing); needsListingRefresh.current = false; }
      }
      if (!signal.aborted && scopeRef.current === capturedScope) setPublicationPending(false);
      return result;
    } catch (error) {
      if (!signal.aborted && scopeRef.current === capturedScope && error instanceof ApiError && error.code === "offering_update_pending_publication") { needsListingRefresh.current = true; setPublicationPending(true); }
      throw error;
    }
  }, [listingRef, sourceKey, viewerKey, queryClient]);
  const sixMonth = projection?.payoff_curve.find(point => point.month === 6) ?? (projection?.maximum_month != null && projection.maximum_month < 6 ? projection.payoff_curve.at(-1) : null) ?? (projection?.selected_exit?.month === 6 ? projection.selected_exit : null);
  const fullTerm = projection?.full_term ?? projection?.payoff_curve.find(point => point.capped_at_maturity) ?? projection?.payoff_curve.at(-1) ?? (projection?.selected_exit && projection.selected_exit.month === projection.maximum_month ? projection.selected_exit : null);
  const scenario = (point: InvestorExitPoint | null | undefined): InvestorScenario | undefined => point ? { ...point, horizon_months: point.payoff_month ?? point.month } : undefined;
  const setup = (value?: string) => !value || value === "not_set" ? "Needs setup" : value === "configured" ? "Configured (staff recorded)" : value.replaceAll("_", " ");
  return <section className="card" aria-label="Investor net return comparison" onKeyDownCapture={event => { if (expanded && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeReturns(); } }}>
    <span className="card-kicker">Investor NET returns</span>
    <button ref={opener} type="button" className="w-full text-left border border-divider rounded-md bg-sunken p-4 grid gap-3" aria-label="View monthly returns" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      <span className="flex flex-wrap justify-between gap-3 items-center"><strong className="text-base">Monthly cash flow and exit returns</strong><span className="text-sm font-semibold text-accent-600">{expanded ? "Hide monthly returns" : "View monthly returns"} {expanded ? "−" : "+"}</span></span>
      {projection ? <span className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><span>Illustrated investment<strong className="block tabular-nums">{investorMoney(projection.investment_amount, currency)}</strong></span><span>Full-term NET profit<strong className="block tabular-nums">{investorMoney(fullTerm?.net_income, currency)}</strong></span><span>Full-term NET ROI<strong className="block tabular-nums">{fullTerm?.net_roi_pct == null ? "Not confirmed" : `${fullTerm.net_roi_pct.toFixed(2)}%`}</strong></span></span> : <span className="text-sm">{publicationPending ? "Offering update awaits publication." : "Open to view returns from the current published offering."}</span>}
    </button>
    {expanded ? <><div className="sticky top-0 z-10 bg-surface py-2 flex justify-end"><button type="button" className="btn btn-secondary btn-sm" onClick={closeReturns}>Close monthly returns</button></div><InvestorReturnExplorer sourceKey={sourceKey} sourceLabel="Saved offering" loadProjection={loadProjection} onProjectionChange={acceptedProjection} /></> : null}
    {projection ? <details><summary className="text-sm font-semibold cursor-pointer">Six-month and full-term details</summary><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"><Scenario title="Six-month full payoff" value={scenario(sixMonth)} currency={currency} /><Scenario title="Full contractual term" value={scenario(fullTerm)} currency={currency} /></div></details> : null}
    <p className="m-0 text-xs text-mutedFg">ROI is cumulative over each scenario, not annualized. Principal and reserves are separate from profit. Scheduled-payment illustrations assume collection and are not guaranteed returns or a payoff quote.</p>
    <p className="m-0 text-xs text-mutedFg">Servicing: {budget?.servicing_mode === "company_managed" ? "Company managed" : budget?.servicing_mode === "transferred" ? "Transferred" : "Arrangement needs confirmation"}. Software: {setup(budget?.software_monitoring?.software_status)} · Monitoring: {setup(budget?.software_monitoring?.monitoring_status)}. Setup statuses are staff recorded; an external connection is not verified here.</p>
  </section>;
}
