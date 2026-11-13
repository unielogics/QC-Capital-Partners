import type { ListingFinancials, PlanPair } from "@/lib/types";
import { usd } from "@/lib/format";
import { marketplaceOperatingProjection } from "@/lib/marketplaceOperatingProjection";
import { OperatingPlanProjection } from "./OperatingPlanProjection";

const BASIS: Record<string, string> = { tax_return: "tax return", profit_and_loss: "profit and loss", bank_cash_flow: "bank cash flow", desk_override: "desk figure" };
const x = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(2)}x`);
const signed = (v: number | null | undefined, render: (n: number) => string) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${render(Math.abs(v))}`);

export function OfferingUnderwritingFigures({ f }: { f: ListingFinancials }) {
  const plan = f.plan;
  const pendingProjection = f.financial_update_pending ? marketplaceOperatingProjection(f.pending_operating_projection) : null;
  const projection = pendingProjection || marketplaceOperatingProjection(f.operating_projection);
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
    <div className="card" style={{ minWidth: 0 }}>
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
          <p className="m-0 text-sm text-mutedFg"><strong className="text-ink">Refinance effect.</strong> The saved financing change, before proposed operating actions.</p>
          {plan.modifications.length ? (
            <ul className="m-0 pl-5 text-sm text-mutedFg grid gap-1">
              {plan.modifications.map((m, i) => <li key={i}><span className="text-ink">{m.label}</span>{m.detail ? ` — ${m.detail}` : ""}</li>)}
            </ul>
          ) : null}
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse" style={{ minWidth: "34rem" }}>
            <thead><tr className="text-mutedFg text-left"><th className="font-medium py-1">Figure</th><th className="font-medium py-1 text-right">Original</th><th className="font-medium py-1 text-right">Refinance only</th><th className="font-medium py-1 text-right">Change</th></tr></thead>
            <tbody>
              <tr className="border-t border-divider"><td className="py-1.5">Debt service coverage</td><td className="py-1.5 text-right tabular-nums">{x(impact.dscr?.before)}</td><td className="py-1.5 text-right tabular-nums">{x(impact.dscr?.after)}</td><td className="py-1.5 text-right tabular-nums">{signed(impact.dscr?.change, (n) => `${n.toFixed(2)}x`)}</td></tr>
              {rows.map(([label, p, render]) => p && (p.before != null || p.after != null) ? (
                <tr key={label} className="border-t border-divider"><td className="py-1.5">{label}</td><td className="py-1.5 text-right tabular-nums">{p.before == null ? "—" : render(p.before)}</td><td className="py-1.5 text-right tabular-nums">{p.after == null ? "—" : render(p.after)}</td><td className="py-1.5 text-right tabular-nums">{signed(p.change, render)}</td></tr>
              ) : null)}
            </tbody>
          </table></div>
          {impact.loan?.amount ? <p className="m-0 text-xs text-mutedFg">New loan in the plan: {usd(impact.loan.amount)} at {impact.loan.rate_pct ?? "—"}%{impact.loan.interest_only ? ", interest-only" : impact.loan.term_months ? ` over ${impact.loan.term_months} months` : ""}{impact.loan.payment_monthly != null ? `, ${usd(impact.loan.payment_monthly)} a month` : ""}.</p> : null}
        </div>
      ) : null}
      {projection ? <OperatingPlanProjection projection={projection} pending={Boolean(pendingProjection)} /> : null}
      {stamp ? <p className="m-0 text-xs text-mutedFg">Figures as read from the file on {new Date(stamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}; the memorandum governs.</p> : null}
    </div>
  );
}
