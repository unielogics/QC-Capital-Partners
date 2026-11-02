"use client";

// Secondary: participations other members listed for transfer, and the drawer
// to list one of yours. A transfer completes only after the issuer's consent.
//
//   GET  /capital/transfers        POST /capital/transfers {participation_id, principal_amount, ask_pct}
//   POST /capital/transfers/{id}/request | withdraw

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, gateFromError } from "@/lib/api";
import { day, pct, usd } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks";
import { VERTICAL_CLASS, type Portfolio, type Transfer } from "@/lib/types";
import { useMe, useToken } from "@/lib/useMe";

export default function SecondaryPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useToken();
  const { cleared, preview, isResolving } = useMe();
  const { data: rows = [], error, isLoading } = useApiQuery<Transfer[]>(["transfers"], "/capital/transfers", cleared || preview);
  const { data: portfolio } = useApiQuery<Portfolio>(["portfolio"], "/capital/portfolio", cleared && !preview);
  const [open, setOpen] = useState(false);
  const [partId, setPartId] = useState("");
  const [principal, setPrincipal] = useState("");
  const [ask, setAsk] = useState("100");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!isResolving && !cleared && !preview) router.replace("/"); }, [cleared, preview, isResolving, router]);
  useEffect(() => { if (error && gateFromError(error)) router.replace("/"); }, [error, router]);

  const transferable = (portfolio?.holdings ?? []).filter((h) => h.transferable);
  const chosen = transferable.find((h) => h.id === partId);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["transfers"] }); void qc.invalidateQueries({ queryKey: ["portfolio"] }); };

  const list = async () => {
    setErr(null);
    setBusyId("new");
    try {
      await api<Transfer>("/capital/transfers", { method: "POST", authToken: await token(), body: JSON.stringify({ participation_id: partId, principal_amount: Number(principal).toFixed(2), ask_pct: Number(ask).toFixed(3) }) });
      setOpen(false); setPartId(""); setPrincipal(""); setAsk("100");
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not list."); } finally { setBusyId(null); }
  };
  const act = async (t: Transfer, what: "request" | "withdraw") => {
    setErr(null);
    setBusyId(t.id);
    try { await api(`/capital/transfers/${t.id}/${what}`, { method: "POST", authToken: await token() }); refresh(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not update."); } finally { setBusyId(null); }
  };

  return (
    <section className="grid gap-6">
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div><span className="kicker">Secondary</span><h1 className="text-h1 m-0">Participations listed for transfer</h1></div>
        {!preview ? <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>List a participation</button> : null}
      </div>
      <div className="notice">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-accent-600 mt-px"><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
        <span>Participations are restricted securities. A transfer completes only after our consent, confirmation that the buyer is an approved accredited member, and compliance with the transfer restrictions in the offering documents. Sellers set asking prices; we do not recommend or guarantee any price.</span>
      </div>
      {open ? (
        <div className="card elev-md gap-4">
          <span className="card-kicker">List a participation for transfer</span>
          {transferable.length === 0 ? <span className="text-sm text-mutedFg">You have no participation with principal outstanding that is not already listed.</span> : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px_auto] gap-3 items-end">
              <div className="field"><label>Participation</label><select className="input" value={partId} onChange={(e) => { setPartId(e.target.value); const h = transferable.find((x) => x.id === e.target.value); if (h) setPrincipal(h.principal_outstanding); }}><option value="">Choose</option>{transferable.map((h) => <option key={h.id} value={h.id}>{h.listing_ref} · {h.listing_name} · {usd(h.principal_outstanding)} outstanding</option>)}</select></div>
              <div className="field"><label>Principal to transfer</label><input className="input num" inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value)} /><span className="field-hint">{chosen ? `Up to ${usd(chosen.principal_outstanding)}` : ""}</span></div>
              <div className="field"><label>Asking price, % of par</label><input className="input num" inputMode="decimal" value={ask} onChange={(e) => setAsk(e.target.value)} /></div>
              <button type="button" className="btn btn-primary" disabled={!chosen || !(Number(principal) > 0) || Number(principal) > Number(chosen?.principal_outstanding ?? 0) || !(Number(ask) > 0) || busyId === "new"} onClick={() => void list()}>List</button>
            </div>
          )}
          {err ? <div className="text-[var(--color-danger)] text-sm font-semibold" role="alert">{err}</div> : null}
        </div>
      ) : null}
      <div className="card py-1 px-2 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Loan</th><th>Industry</th><th className="align-end">Principal</th><th className="align-end">Note rate</th><th className="align-end">Remaining term</th><th className="align-end">Asking price</th><th className="align-end">Implied yield</th><th>Listed</th><th>Status</th><th className="align-end"></th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={10} className="text-mutedFg">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={10} className="text-mutedFg">No participations are listed for transfer right now.</td></tr> : rows.map((t) => (
              <tr key={t.id}>
                <td><div className="grid"><span>{t.listing_name}</span><span className="num text-xs font-normal text-mutedFg">{t.ref} · {t.listing_ref}</span></div></td>
                <td><span className={VERTICAL_CLASS[t.vertical]}><span className="tag tag-accent">{t.vertical_label}</span></span></td>
                <td className="align-end">{usd(t.principal_amount)}</td><td className="align-end">{pct(t.note_rate_pct)}</td><td className="align-end">{t.remaining_term_months != null ? `${t.remaining_term_months} mo` : "—"}</td>
                <td className="align-end">{pct(t.ask_pct)}</td><td className="align-end">{pct(t.implied_yield_pct)}</td><td>{day(t.listed_at)}</td>
                <td><span className={t.status === "listed" ? "tag tag-accent" : t.status === "pending_consent" || t.status === "requested" ? "tag tag-warning" : t.status === "approved" ? "tag tag-success" : "tag tag-neutral"}>{t.status === "pending_consent" ? "Transfer pending" : t.status.replace(/_/g, " ")}</span></td>
                <td className="align-end">
                  {t.is_mine && (t.status === "listed" || t.status === "pending_consent") ? <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === t.id} onClick={() => void act(t, "withdraw")}>Withdraw</button>
                    : t.can_request && !preview ? <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === t.id} onClick={() => void act(t, "request")}>Request transfer</button>
                      : t.is_mine ? <span className="text-xs text-mutedFg">Your listing</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && !open ? <div className="text-[var(--color-danger)] text-sm font-semibold" role="alert">{err}</div> : null}
      <p className="fineprint m-0">Asking price is a percentage of outstanding principal. Implied yield assumes the loan pays as scheduled to maturity, and will differ if it prepays, extends or defaults.</p>
    </section>
  );
}
