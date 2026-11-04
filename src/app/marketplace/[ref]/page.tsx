"use client";

// One offering, full screen: figures, the loan, the collateral, the borrower
// and exit, the documents, and the subscribe panel that stays in place.
//
//   GET  /capital/listings/{ref}
//   POST /capital/listings/{ref}/documents/{id}/url   (60-second link, logged)
//   POST /capital/listings/{ref}/subscriptions        {amount, entity_id, ack_ppm, ack_accredited}

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, gateFromError } from "@/lib/api";
import { compact, FREQ, LIEN, months, pct, STATUS, SUB_STATUS, usd } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks";
import { VERTICAL_CLASS, type ListingDetail, type ListingFinancials, type PlanPair, type Subscription } from "@/lib/types";
import { useMe, useToken } from "@/lib/useMe";

const BASIS: Record<string, string> = { tax_return: "tax return", profit_and_loss: "profit and loss", bank_cash_flow: "bank cash flow", desk_override: "desk figure" };
const x = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(2)}x`);
const signed = (v: number | null | undefined, render: (n: number) => string) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${render(Math.abs(v))}`);

/** The underwriting figures behind the offering: the file as read, the desk's plan, and the result side by side. */
/** The payment schedule as a picture: principal and interest per period, and the principal still out (the investor's exposure) falling to zero. */
function ScheduleChart({ rows }: { rows: NonNullable<NonNullable<ListingFinancials["proposed_terms"]>["schedule_rows"]> }) {
  const W = 660; const H = 230; const padL = 56; const padR = 48; const padT = 18; const padB = 30;
  const plotW = W - padL - padR; const plotH = H - padT - padB;
  const n = Math.max(1, rows.length);
  const vmax = Math.max(1, ...rows.map((r) => r.payment)) * 1.15;
  const slot = plotW / n; const barW = Math.max(1.5, Math.min(14, slot * 0.68));
  const px = (i: number) => padL + slot * (i + 0.5);
  const py = (v: number) => padT + plotH - (v / vmax) * plotH;
  const pyPct = (v: number) => padT + plotH - (v / 100) * plotH;
  const every = n <= 24 ? 1 : n <= 60 ? 3 : 12;
  const exposure = [`${padL},${pyPct(100)}`, ...rows.map((r, i) => `${px(i).toFixed(1)},${pyPct(r.exposure_pct).toFixed(1)}`)].join(" ");
  const atRisk = rows.every((r) => r.cash_at_risk_pct != null) ? [`${padL},${pyPct(100)}`, ...rows.map((r, i) => `${px(i).toFixed(1)},${pyPct(r.cash_at_risk_pct as number).toFixed(1)}`)].join(" ") : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Payment schedule: principal and interest per period, and the principal still out">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - padR} y1={padT + plotH - f * plotH} y2={padT + plotH - f * plotH} className="stroke-divider" strokeWidth={1} />
          <text x={padL - 6} y={padT + plotH - f * plotH + 3} textAnchor="end" className="fill-mutedFg" fontSize={9}>{compact(vmax * f)}</text>
          <text x={W - padR + 6} y={padT + plotH - f * plotH + 3} textAnchor="start" className="fill-danger" fontSize={9}>{Math.round(100 * f)}%</text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r.period}>
          {r.principal > 0 ? <rect x={px(i) - barW / 2} y={py(r.principal)} width={barW} height={py(0) - py(r.principal)} className="fill-accent" /> : null}
          {r.interest > 0 ? <rect x={px(i) - barW / 2} y={py(r.principal + r.interest)} width={barW} height={py(r.principal) - py(r.principal + r.interest)} className="fill-accent-300" opacity={r.phase === "interest_only" ? 0.7 : 1} /> : null}
          {r.period === 1 || r.period % every === 0 ? <text x={px(i)} y={padT + plotH + 14} textAnchor="middle" className="fill-mutedFg" fontSize={9}>{r.period}</text> : null}
        </g>
      ))}
      <polyline points={exposure} fill="none" className="stroke-danger" strokeWidth={2.2} />
      {atRisk ? <polyline points={atRisk} fill="none" className="stroke-warning" strokeWidth={2} strokeDasharray="5 3" /> : null}
    </svg>
  );
}

function ProposedTermsCard({ t }: { t: NonNullable<ListingFinancials["proposed_terms"]> }) {
  const rows = t.schedule_rows ?? [];
  const risk = t.risk;
  const s = t.schedule ?? {};
  const milestones = risk?.recovery_milestones ?? s.recovery_milestones ?? {};
  const wal = risk?.weighted_average_life_months ?? s.weighted_average_life_months ?? null;
  const exposed = risk?.full_exposure_months ?? s.full_exposure_months ?? 0;
  return (
    <div className="card">
      <span className="card-kicker">Proposed terms and the principal at risk</span>
      <p className="m-0 text-sm text-mutedFg">
        <strong className="text-ink">{t.amount != null ? usd(t.amount) : "—"}{t.rate_pct != null ? ` at ${t.rate_pct}%` : ""}{t.describe ? ` ${t.describe}` : ""}.</strong>
        {t.payment_io_monthly != null && t.payment_after_monthly != null ? ` ${usd(t.payment_io_monthly)} a month for ${t.interest_only_months} months, then ${usd(t.payment_after_monthly)} a month.` : t.monthly_payment != null ? ` ${usd(t.monthly_payment)} a month${t.interest_only ? " of interest, principal at maturity" : ""}.` : ""}
        {t.source === "term_sheet" && t.label ? ` ${t.label}.` : ""}
      </p>
      {rows.length ? <ScheduleChart rows={rows} /> : null}
      {rows.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mutedFg">
          <span><span className="inline-block w-3 h-2 rounded-sm bg-accent align-middle mr-1" />Principal</span>
          <span><span className="inline-block w-3 h-2 rounded-sm bg-accent-300 align-middle mr-1" />Interest</span>
          <span><span className="inline-block w-3 h-0.5 bg-danger align-middle mr-1" />Principal still out</span>
          <span><span className="inline-block w-3 h-0.5 bg-warning align-middle mr-1" style={{ borderTop: "2px dashed currentColor", height: 0 }} />Capital at risk, counting interest received</span>
        </div>
      ) : null}
      {risk?.words ? <p className="m-0 text-sm text-mutedFg"><strong className="text-ink">Principal at risk.</strong> {risk.words}</p> : null}
      <dl className="program-specs m-0 border-t-0 pt-0">
        {wal != null ? <div className="program-spec"><dt>Weighted average life</dt><dd>{wal} months</dd></div> : null}
        {milestones["50"] != null || milestones["100"] != null ? <div className="program-spec"><dt>Principal back</dt><dd>{[milestones["50"] != null ? `half by month ${milestones["50"]}` : null, milestones["100"] != null ? `all by month ${milestones["100"]}` : null].filter(Boolean).join(", ")}</dd></div> : null}
        {exposed ? <div className="program-spec"><dt>Fully exposed</dt><dd>{exposed} months before principal starts</dd></div> : null}
        {(risk?.breakeven_month ?? s.breakeven_month) ? <div className="program-spec"><dt>Capital back, counting interest</dt><dd>month {risk?.breakeven_month ?? s.breakeven_month}: nothing at risk after that</dd></div> : null}
        {s.balloon ? <div className="program-spec"><dt>Due at maturity</dt><dd>{usd(s.balloon)}{s.balloon_pct != null ? ` (${s.balloon_pct}% of the loan)` : ""}</dd></div> : null}
        {risk?.lowest_coverage != null ? <div className="program-spec"><dt>Lowest coverage on a payment</dt><dd>{x(risk.lowest_coverage)}{risk.coverage_during_interest_only != null && risk.coverage_after_interest_only != null && risk.coverage_during_interest_only !== risk.coverage_after_interest_only ? ` (${x(risk.coverage_during_interest_only)} during the interest-only months, ${x(risk.coverage_after_interest_only)} once principal starts)` : ""}</dd></div> : null}
        {s.total_interest != null ? <div className="program-spec"><dt>Interest over the term · total paid</dt><dd>{usd(s.total_interest)} · {s.total_paid != null ? usd(s.total_paid) : "—"}</dd></div> : null}
      </dl>
      {t.payment_note ? <p className="m-0 text-xs text-mutedFg">{t.payment_note}</p> : null}
    </div>
  );
}

function UnderwritingFigures({ f }: { f: ListingFinancials }) {
  const plan = f.plan;
  const impact = plan?.impact ?? {};
  const rows: Array<[string, PlanPair | undefined, (n: number) => string]> = [
    ["Income available for debt service, a year", impact.income_annual, (n) => usd(n)],
    ["Debt service, a month", impact.debt_service_monthly, (n) => usd(n)],
    ["Net cash flow, a month", impact.net_cash_flow_monthly, (n) => usd(n)],
    ["Ending balance, last month", impact.ending_balance, (n) => usd(n)],
    ["Months dipping below zero", impact.months_negative, (n) => String(n)],
  ];
  const stamp = f.refreshed_at ?? f.generated_at;
  return (
    <div className="card">
      <span className="card-kicker">Underwriting figures</span>
      <dl className="program-specs m-0 border-t-0 pt-0">
        <div className="program-spec"><dt>Bank statements reviewed</dt><dd>{f.bank_months ?? "—"} months{f.bank_months_accepted != null ? ` (${f.bank_months_accepted} verified)` : ""}</dd></div>
        <div className="program-spec"><dt>Average monthly deposits</dt><dd>{f.avg_monthly_deposits != null ? usd(f.avg_monthly_deposits) : "—"}</dd></div>
        <div className="program-spec"><dt>Debt service coverage today{f.dscr_basis ? ` (${BASIS[f.dscr_basis] ?? f.dscr_basis})` : ""}</dt><dd>{x(f.dscr)}</dd></div>
        {f.dscr_after_plan != null ? <div className="program-spec"><dt>Coverage with the underwriter's plan</dt><dd>{x(f.dscr_after_plan)}</dd></div> : null}
        {f.net_profit != null ? <div className="program-spec"><dt>Net profit{f.net_profit_basis ? ` (${BASIS[f.net_profit_basis] ?? f.net_profit_basis}${f.net_profit_period ? `, ${f.net_profit_period}` : ""})` : ""}</dt><dd>{usd(f.net_profit)}</dd></div> : null}
      </dl>
      {plan ? (
        <div className="grid gap-3">
          <p className="m-0 text-sm text-mutedFg"><strong className="text-ink">The underwriter's plan.</strong> What changes at funding, and what it does to the figures.</p>
          {plan.modifications.length ? (
            <ul className="m-0 pl-5 text-sm text-mutedFg grid gap-1">
              {plan.modifications.map((m, i) => <li key={i}><span className="text-ink">{m.label}</span>{m.detail ? ` — ${m.detail}` : ""}</li>)}
            </ul>
          ) : null}
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-mutedFg text-left"><th className="font-medium py-1">Figure</th><th className="font-medium py-1 text-right">Original</th><th className="font-medium py-1 text-right">With the plan</th><th className="font-medium py-1 text-right">Change</th></tr></thead>
            <tbody>
              <tr className="border-t border-divider"><td className="py-1.5">Debt service coverage</td><td className="py-1.5 text-right tabular-nums">{x(impact.dscr?.before)}</td><td className="py-1.5 text-right tabular-nums">{x(impact.dscr?.after)}</td><td className="py-1.5 text-right tabular-nums">{signed(impact.dscr?.change, (n) => `${n.toFixed(2)}x`)}</td></tr>
              {rows.map(([label, p, render]) => p && (p.before != null || p.after != null) ? (
                <tr key={label} className="border-t border-divider"><td className="py-1.5">{label}</td><td className="py-1.5 text-right tabular-nums">{p.before == null ? "—" : render(p.before)}</td><td className="py-1.5 text-right tabular-nums">{p.after == null ? "—" : render(p.after)}</td><td className="py-1.5 text-right tabular-nums">{signed(p.change, render)}</td></tr>
              ) : null)}
            </tbody>
          </table>
          {impact.loan?.amount ? <p className="m-0 text-xs text-mutedFg">New loan in the plan: {usd(impact.loan.amount)} at {impact.loan.rate_pct ?? "—"}%{impact.loan.interest_only ? ", interest-only" : impact.loan.term_months ? ` over ${impact.loan.term_months} months` : ""}{impact.loan.payment_monthly != null ? `, ${usd(impact.loan.payment_monthly)} a month` : ""}.</p> : null}
        </div>
      ) : null}
      {stamp ? <p className="m-0 text-xs text-mutedFg">Figures as read from the file on {new Date(stamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}; the memorandum governs.</p> : null}
    </div>
  );
}

export default function OfferingPage() {
  const params = useParams<{ ref: string }>();
  const ref = (params?.ref ?? "").toUpperCase();
  const router = useRouter();
  const qc = useQueryClient();
  const token = useToken();
  const { me, preview, cleared, isResolving } = useMe();
  const { data: l, error, isLoading } = useApiQuery<ListingDetail>(["listing", ref], `/capital/listings/${ref}`, !!ref && (cleared || preview));
  const [amount, setAmount] = useState("");
  const [entityId, setEntityId] = useState<string>("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reserved, setReserved] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!isResolving && !cleared && !preview) router.replace("/");
  }, [cleared, preview, isResolving, router]);
  useEffect(() => {
    if (error && gateFromError(error)) router.replace("/");
  }, [error, router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.push("/marketplace"); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [router]);
  useEffect(() => {
    if (me?.entities.length && !entityId) setEntityId(me.entities.find((e) => e.is_default)?.id ?? me.entities[0].id);
  }, [me, entityId]);

  const order = useMemo<string[]>(() => { try { return JSON.parse(sessionStorage.getItem("cp.market.order") ?? "[]"); } catch { return []; } }, []);
  const idx = order.indexOf(ref);
  const go = (delta: number) => { if (order.length) router.push(`/marketplace/${order[(idx + delta + order.length) % order.length]}`); };

  const amt = Number(String(amount).replace(/[^0-9.]/g, "")) || 0;
  const remaining = Number(l?.remaining_amount ?? 0);
  const min = Number(l?.minimum_investment ?? 0);
  const amtOk = !!l && amt >= min && amt <= remaining;
  const canSubmit = !!l && l.can_subscribe && !preview && amtOk && ack1 && ack2 && !busy;

  const openDoc = async (docId: string) => {
    if (!l) return;
    setErr(null);
    try {
      const { url } = await api<{ url: string; expires_in_seconds: number }>(`/capital/listings/${l.ref}/documents/${docId}/url`, { method: "POST", authToken: await token() });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open the document.");
    }
  };
  const reserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !l) return;
    setBusy(true);
    setErr(null);
    try {
      const sub = await api<Subscription>(`/capital/listings/${l.ref}/subscriptions`, { method: "POST", authToken: await token(), body: JSON.stringify({ amount: amt.toFixed(2), entity_id: entityId || null, ack_ppm: ack1, ack_accredited: ack2 }) });
      setReserved(sub);
      await qc.invalidateQueries({ queryKey: ["listing", ref] });
      await qc.invalidateQueries({ queryKey: ["listings"] });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not subscribe.");
    } finally {
      setBusy(false);
    }
  };

  const [statusLabel, statusCls] = l ? STATUS[l.status] ?? [l.status, "tag tag-neutral"] : ["", ""];

  return (
    <div className="fixed inset-0 z-[100] flex p-0 sm:p-5" style={{ background: "color-mix(in srgb, var(--color-neutral-900) 45%, transparent)", backdropFilter: "blur(3px)" }} onClick={() => router.push("/marketplace")}>
      <div className={`${l ? VERTICAL_CLASS[l.vertical] : ""} flex-1 min-w-0 max-w-[1440px] mx-auto flex flex-col bg-bg rounded-none sm:rounded-lg elev-lg overflow-hidden`} role="dialog" aria-modal="true" aria-label={l?.name ?? "Offering"} onClick={(e) => e.stopPropagation()}>
        <header className="flex-none bg-surface border-t-[3px] border-t-accent-600 border-b border-divider px-7 py-5 flex justify-between gap-5 items-start">
          <div className="grid gap-2.5 min-w-0">
            {l ? <div className="flex gap-1.5 flex-wrap"><span className="tag tag-accent">{l.vertical_label}</span><span className="tag tag-outline">{l.program_label}</span><span className="tag tag-outline">{LIEN[l.lien_position]} lien</span><span className={statusCls}>{statusLabel}</span></div> : null}
            <h2 className="text-h2 m-0">{l?.name ?? (isLoading ? "Loading…" : "Offering not found")}</h2>
            {l ? <span className="text-sm text-mutedFg">{l.place}{l.collateral_type ? ` · ${l.collateral_type}` : ""} · <span className="num">{l.ref}</span></span> : null}
          </div>
          <div className="flex gap-2 items-center flex-none">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(-1)} aria-label="Previous offering" disabled={order.length < 2}>‹</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(1)} aria-label="Next offering" disabled={order.length < 2}>›</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push("/marketplace")}>Close</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          {l ? (
            <div className="p-7 grid grid-cols-1 nav:grid-cols-[minmax(0,1fr)_380px] gap-7 items-start">
              <div className="grid gap-5 min-w-0">
                <div className="proof-bar px-6 py-5 gap-5">
                  <div className="stat"><span className="stat-value">{pct(l.note_rate_pct)}</span><span className="stat-label">Note rate</span></div>
                  <div className="stat"><span className="stat-value">{months(l.term_months)}</span><span className="stat-label">Term</span></div>
                  <div className="stat"><span className="stat-value">{pct(l.ltv_pct, 0)}</span><span className="stat-label">{l.ltv_kind.toUpperCase()}</span></div>
                  <div className="stat"><span className="stat-value">{compact(l.minimum_investment)}</span><span className="stat-label">Minimum</span></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="card">
                    <span className="card-kicker">Loan summary</span>
                    <dl className="program-specs m-0 border-t-0 pt-0">
                      <div className="program-spec"><dt>Loan amount</dt><dd>{compact(l.loan_amount)}</dd></div>
                      <div className="program-spec"><dt>Offered to members</dt><dd>{compact(l.offered_amount)}</dd></div>
                      <div className="program-spec"><dt>Lien position</dt><dd>{LIEN[l.lien_position]}</dd></div>
                      <div className="program-spec"><dt>Payments</dt><dd>{FREQ[l.payment_frequency]}</dd></div>
                      <div className="program-spec"><dt>Personal guarantee</dt><dd>{l.personal_guarantee ? "Yes" : "No"}</dd></div>
                      <div className="program-spec"><dt>Program</dt><dd>{l.program_label}</dd></div>
                      <div className="program-spec"><dt>Servicer</dt><dd>{l.servicer_label ?? "Independent third party"}</dd></div>
                      {l.maturity_date ? <div className="program-spec"><dt>Maturity</dt><dd>{l.maturity_date}</dd></div> : null}
                    </dl>
                  </div>
                  <div className="card">
                    <span className="card-kicker">Collateral and valuation</span>
                    <dl className="program-specs m-0 border-t-0 pt-0">
                      <div className="program-spec"><dt>Collateral</dt><dd>{l.collateral_type ?? "—"}</dd></div>
                      <div className="program-spec"><dt>Location</dt><dd>{l.place ?? "—"}</dd></div>
                      <div className="program-spec"><dt>Valuation</dt><dd>{compact(l.valuation_amount)}</dd></div>
                      <div className="program-spec"><dt>Valuation source</dt><dd>{l.valuation_source ?? "—"}</dd></div>
                      <div className="program-spec"><dt>{l.ltv_kind.toUpperCase()}</dt><dd>{pct(l.ltv_pct, 0)}</dd></div>
                      <div className="program-spec"><dt>Title</dt><dd>{l.title_status ?? "—"}</dd></div>
                    </dl>
                  </div>
                </div>
                <div className="card">
                  <span className="card-kicker">Borrower and exit</span>
                  <dl className="program-specs m-0 border-t-0 pt-0">
                    <div className="program-spec"><dt>Borrower track record</dt><dd>{l.borrower_track_record ?? "—"}</dd></div>
                    <div className="program-spec"><dt>Guarantee</dt><dd>{l.guarantee_text ?? (l.personal_guarantee ? "Personal guarantee" : "Non-recourse")}</dd></div>
                  </dl>
                  {l.summary ? <p className="m-0 text-sm text-mutedFg">{l.summary}</p> : null}
                  <p className="m-0 text-sm text-mutedFg"><strong className="text-ink">Exit plan.</strong> {l.exit_plan ?? "Described in the memorandum."}</p>
                </div>
                {l.financials ? <UnderwritingFigures f={l.financials} /> : null}
                {l.financials?.proposed_terms?.amount ? <ProposedTermsCard t={l.financials.proposed_terms} /> : null}
                <div className="card">
                  <span className="card-kicker">Offering documents</span>
                  {l.documents.length === 0 ? <span className="text-sm text-mutedFg">Documents are being prepared.</span> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {l.documents.map((d) => (
                        <button key={d.id} type="button" onClick={() => void openDoc(d.id)} className="flex items-center gap-2.5 py-2.5 px-3 border border-divider rounded-md text-sm text-ink bg-transparent text-left hover:border-accent-300 hover:bg-[var(--color-neutral-100)] cursor-pointer">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-mutedFg"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><path d="M14 2v6h6" /></svg>
                          <span className="flex-1">{d.kind_label}</span><span className="text-xs text-mutedFg">PDF</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="fineprint">Links open in a new tab and expire after one minute. Every document opened is recorded.</span>
                </div>
                {l.my_subscriptions.length ? (
                  <div className="card">
                    <span className="card-kicker">Your subscriptions in this offering</span>
                    {l.my_subscriptions.map((s) => { const [sl, sc] = SUB_STATUS[s.status] ?? [s.status, "tag tag-neutral"]; return <div key={s.id} className="flex justify-between gap-3 text-sm"><span>{usd(s.amount)}{s.entity_name ? ` · ${s.entity_name}` : ""}</span><span className={sc}>{sl}</span></div>; })}
                  </div>
                ) : null}
              </div>

              <aside className="nav:sticky nav:top-0 grid gap-4">
                <div className="card elev-md gap-4">
                  <div className="readout readout-accent">
                    <span className="readout-label">Available to subscribe</span>
                    <span className="readout-value">{remaining > 0 ? compact(l.remaining_amount) : "—"}</span>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-1.5"><div className="h-full bg-accent-600" style={{ width: `${l.pct_committed}%` }} /></div>
                    <span className="readout-note num">{compact(l.committed_amount)} of {compact(l.offered_amount)} committed{l.days_left != null ? ` · ${l.days_left} days left` : ""}</span>
                  </div>
                  {reserved ? (
                    <div className="notice" style={{ borderLeftColor: "var(--color-success)" }}><span><strong className="text-ink">Subscription documents sent.</strong> Your allocation of {usd(reserved.amount)} is held while you sign and fund. The countersigned agreement and wiring instructions follow by email.</span></div>
                  ) : preview ? (
                    <div className="notice"><span>Operator preview. Members subscribe from this panel; this login cannot.</span></div>
                  ) : !l.can_subscribe ? (
                    <div className="notice"><span>{l.status === "fully_subscribed" ? "This loan is fully subscribed. Members who hold it may list participations for transfer under Secondary." : "This offering is not open to subscribe."}</span></div>
                  ) : (
                    <form onSubmit={(e) => void reserve(e)} className="grid gap-3.5">
                      {me && me.entities.length > 1 ? (
                        <div className="field"><label htmlFor="sub-entity">Investing through</label><select id="sub-entity" className="input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>{me.entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}</select></div>
                      ) : null}
                      <div className="field">
                        <label htmlFor="sub-amt">Subscription amount</label>
                        <input id="sub-amt" className="input num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={compact(l.minimum_investment)} />
                        <span className="field-hint" style={{ color: amt && !amtOk ? "var(--color-danger)" : undefined }}>{amt && !amtOk ? `Enter between ${usd(min)} and ${usd(remaining)}.` : `Minimum ${usd(min)} · up to ${usd(remaining)} available`}</span>
                      </div>
                      <div className="readout px-4 py-3"><span className="readout-label">Estimated interest per year</span><span className="readout-value num text-h4">{amtOk ? usd(amt * Number(l.note_rate_pct ?? 0) / 100) : "—"}</span></div>
                      <label className="flex gap-2.5 text-[13px] text-mutedFg cursor-pointer"><input type="checkbox" className="w-4 h-4 flex-none mt-0.5 accent-accent-600" checked={ack1} onChange={(e) => setAck1(e.target.checked)} /><span>I have read the private placement memorandum, including its risk factors.</span></label>
                      <label className="flex gap-2.5 text-[13px] text-mutedFg cursor-pointer"><input type="checkbox" className="w-4 h-4 flex-none mt-0.5 accent-accent-600" checked={ack2} onChange={(e) => setAck2(e.target.checked)} /><span>I confirm that I, or the entity I am investing through, remain an accredited investor.</span></label>
                      {err ? <div className="text-[var(--color-danger)] text-sm font-semibold" role="alert">{err}</div> : null}
                      <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>{busy ? "Sending…" : "Continue to subscription documents"}</button>
                    </form>
                  )}
                  {err && (reserved || preview || !l.can_subscribe) ? <div className="text-[var(--color-danger)] text-sm font-semibold" role="alert">{err}</div> : null}
                </div>
                <p className="fineprint m-0">Participations are restricted securities, are not FDIC insured, and may lose value. Estimated interest assumes the loan pays as scheduled.</p>
              </aside>
            </div>
          ) : (
            <div className="p-7"><div className="card h-40" aria-busy="true" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
