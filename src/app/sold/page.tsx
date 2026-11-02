"use client";

// Track record: every loan offered to members, including the ones in workout.
//   GET /capital/sold

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gateFromError } from "@/lib/api";
import { compact, day, months, OUTCOME, pct } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks";
import { VERTICAL_CLASS, type Sold } from "@/lib/types";
import { useMe } from "@/lib/useMe";

type Filter = "all" | "perf" | "repaid" | "workout";

export default function SoldPage() {
  const router = useRouter();
  const { cleared, preview, isResolving } = useMe();
  const { data, error, isLoading } = useApiQuery<Sold>(["sold"], "/capital/sold", cleared || preview);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => { if (!isResolving && !cleared && !preview) router.replace("/"); }, [cleared, preview, isResolving, router]);
  useEffect(() => { if (error && gateFromError(error)) router.replace("/"); }, [error, router]);
  const rows = (data?.rows ?? []).filter((r) => filter === "all" || (filter === "perf" ? r.outcome === "performing" : filter === "repaid" ? (r.outcome ?? "").startsWith("repaid") : r.outcome === "in_workout"));
  return (
    <section className="grid gap-6">
      <div><span className="kicker">Track record</span><h1 className="text-h1 m-0">Sold and repaid</h1></div>
      {data ? (
        <div className="proof-bar p-6 gap-6">
          <div className="stat"><span className="stat-value">{data.stats.count}</span><span className="stat-label">Loans fully subscribed</span></div>
          <div className="stat"><span className="stat-value">{compact(data.stats.capital_placed)}</span><span className="stat-label">Capital placed by members</span></div>
          <div className="stat"><span className="stat-value">{data.stats.repaid_count}</span><span className="stat-label">Repaid in full</span></div>
          <div className="stat"><span className="stat-value">{data.stats.average_hold_months != null ? `${data.stats.average_hold_months} mo` : "—"}</span><span className="stat-label">Average hold, repaid loans</span></div>
        </div>
      ) : null}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="seg">{([["all", "All"], ["perf", "Performing"], ["repaid", "Repaid"], ["workout", "Workout"]] as const).map(([v, l]) => <label key={v} className="seg-opt"><input type="radio" name="sold" className="sr-only" checked={filter === v} onChange={() => setFilter(v)} /><span>{l}</span></label>)}</div>
        <p className="fineprint m-0">Every loan offered to members is listed, including loans in workout.</p>
      </div>
      <div className="card py-1 px-2 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Loan</th><th>Industry</th><th>Program</th><th className="align-end">Amount</th><th className="align-end">Rate</th><th className="align-end">Term</th><th>Funded</th><th>Repaid</th><th className="align-end">Hold</th><th>Outcome</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={10} className="text-mutedFg">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={10} className="text-mutedFg">Nothing in this view yet.</td></tr> : rows.map((r) => {
              const [ol, oc] = OUTCOME[r.outcome ?? ""] ?? ["—", "tag tag-neutral"];
              return (
                <tr key={r.id}>
                  <td><div className="grid"><span>{r.name}</span><span className="num text-xs font-normal text-mutedFg">{r.ref} · {r.place}</span></div></td>
                  <td><span className={VERTICAL_CLASS[r.vertical]}><span className="tag tag-accent">{r.vertical_label}</span></span></td>
                  <td>{r.program_label}</td>
                  <td className="align-end">{compact(r.offered_amount)}</td><td className="align-end">{pct(r.note_rate_pct)}</td><td className="align-end">{months(r.term_months)}</td>
                  <td>{day(r.funded_at)}</td><td>{day(r.repaid_at)}</td><td className="align-end">{r.hold_months != null ? `${r.hold_months} mo` : "—"}</td>
                  <td><span className={oc}>{ol}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fineprint m-0">Past performance of other loans does not predict the performance of any participation. Participations are not FDIC insured and may lose value.</p>
    </section>
  );
}
