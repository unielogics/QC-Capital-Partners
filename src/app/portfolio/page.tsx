"use client";

// Portfolio: every participation the member holds, with the independent
// servicer's reporting as the desk entered it.
//   GET /capital/portfolio      GET /capital/portfolio.csv

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBlob, gateFromError } from "@/lib/api";
import { day, pct, SERVICER, usd } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks";
import type { Portfolio } from "@/lib/types";
import { useMe, useToken } from "@/lib/useMe";

export default function PortfolioPage() {
  const router = useRouter();
  const token = useToken();
  const { cleared, preview, isResolving } = useMe();
  const { data, error, isLoading } = useApiQuery<Portfolio>(["portfolio"], "/capital/portfolio", cleared || preview);
  const [entity, setEntity] = useState("all");
  const [taxNote, setTaxNote] = useState(false);
  useEffect(() => { if (!isResolving && !cleared && !preview) router.replace("/"); }, [cleared, preview, isResolving, router]);
  useEffect(() => { if (error && gateFromError(error)) router.replace("/"); }, [error, router]);

  const holdings = (data?.holdings ?? []).filter((h) => entity === "all" || h.entity_id === entity);
  const sum = (k: "invested_amount" | "principal_outstanding" | "interest_received_ytd") => holdings.reduce((s, h) => s + Number(h[k]), 0);
  const exportCsv = async () => {
    const blob = await apiBlob("/capital/portfolio.csv", { authToken: await token() });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "holdings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-6">
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div><span className="kicker">Portfolio</span><h1 className="text-h1 m-0">Your participations</h1></div>
        {data && data.entities.length > 1 ? (
          <div className="seg"><label className="seg-opt"><input type="radio" name="entity" className="sr-only" checked={entity === "all"} onChange={() => setEntity("all")} /><span>All entities</span></label>{data.entities.map((e) => <label key={e.id} className="seg-opt"><input type="radio" name="entity" className="sr-only" checked={entity === e.id} onChange={() => setEntity(e.id)} /><span>{e.name}</span></label>)}</div>
        ) : null}
      </div>
      <div className="proof-bar p-6 gap-6">
        <div className="stat"><span className="stat-value">{usd(sum("invested_amount"))}</span><span className="stat-label">Total invested</span></div>
        <div className="stat"><span className="stat-value">{usd(sum("principal_outstanding"))}</span><span className="stat-label">Principal outstanding</span></div>
        <div className="stat"><span className="stat-value">{usd(sum("interest_received_ytd"))}</span><span className="stat-label">Interest received, year to date</span></div>
        <div className="stat"><span className="stat-value">{holdings.filter((h) => Number(h.principal_outstanding) > 0).length}</span><span className="stat-label">Active participations</span></div>
      </div>
      <div className="card py-1 px-2 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Loan</th><th>Entity</th><th className="align-end">Invested</th><th className="align-end">Outstanding</th><th className="align-end">Rate</th><th className="align-end">Interest YTD</th><th>Next payment</th><th>Servicer status</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-mutedFg">Loading…</td></tr> : holdings.length === 0 ? <tr><td colSpan={8} className="text-mutedFg">No participations yet. Funded subscriptions appear here.</td></tr> : holdings.map((h) => {
              const [sl, sc] = SERVICER[h.servicer_status] ?? [h.servicer_status, "tag tag-neutral"];
              return (
                <tr key={h.id}>
                  <td><div className="grid"><span>{h.listing_name}</span><span className="num text-xs font-normal text-mutedFg">{h.listing_ref}</span></div></td>
                  <td>{h.entity_name ?? "—"}</td>
                  <td className="align-end">{usd(h.invested_amount)}</td><td className="align-end">{usd(h.principal_outstanding)}</td><td className="align-end">{pct(h.note_rate_pct)}</td><td className="align-end">{usd(h.interest_received_ytd)}</td>
                  <td>{day(h.next_payment_on)}</td><td><span className={sc}>{sl}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <p className="fineprint m-0">Payment and status data are reported by the independent third-party loan servicer{data ? `, as of ${day(data.as_of)}` : ""}.</p>
        <div className="flex gap-2"><button type="button" className="btn btn-secondary btn-sm" onClick={() => void exportCsv()} disabled={!data}>Export holdings</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setTaxNote((v) => !v)}>Tax documents</button></div>
      </div>
      {taxNote ? <div className="notice"><span>Year-end tax documents are issued after the close of the year and appear here, with an email when they are ready.</span></div> : null}
    </section>
  );
}
