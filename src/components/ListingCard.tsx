"use client";

import Link from "next/link";
import { compact, FREQ, LIEN, months, pct, STATUS } from "@/lib/format";
import { VERTICAL_CLASS, type Listing } from "@/lib/types";

export function daysLabel(l: Listing): string {
  if (l.status === "fully_subscribed") return "Funded";
  if (l.days_left == null) return "";
  return l.status === "closing" ? `Closes in ${l.days_left} days` : `${l.days_left} days left`;
}

export function ListingCard({ listing: l }: { listing: Listing }) {
  const [statusLabel, statusCls] = STATUS[l.status] ?? [l.status, "tag tag-neutral"];
  return (
    <article className={`${VERTICAL_CLASS[l.vertical]} flex`}>
      <div className="program-card flex-1 gap-3.5 p-5">
        <div className="flex justify-between gap-2 items-start">
          <div className="flex gap-1.5 flex-wrap"><span className="tag tag-accent">{l.vertical_label}</span><span className="tag tag-outline">{l.program_label}</span></div>
          <span className={`${statusCls} flex-none`}>{statusLabel}</span>
        </div>
        <div>
          <h3 className="program-name text-lg">{l.name}</h3>
          <p className="m-0 mt-1 text-[13px] text-mutedFg">{l.place}{l.collateral_type ? ` · ${l.collateral_type}` : ""} · <span className="num">{l.ref}</span></p>
        </div>
        <dl className="program-specs m-0 grid-cols-2 gap-x-5">
          <div className="program-spec"><dt>Note rate</dt><dd>{pct(l.note_rate_pct)}</dd></div>
          <div className="program-spec"><dt>Term</dt><dd>{months(l.term_months)}</dd></div>
          <div className="program-spec"><dt>{l.ltv_kind.toUpperCase()}</dt><dd>{pct(l.ltv_pct, 0)}</dd></div>
          <div className="program-spec"><dt>Lien</dt><dd>{LIEN[l.lien_position]}</dd></div>
          <div className="program-spec"><dt>Minimum</dt><dd>{compact(l.minimum_investment)}</dd></div>
          <div className="program-spec"><dt>Payments</dt><dd>{FREQ[l.payment_frequency]}</dd></div>
        </dl>
        <div className="grid gap-1.5">
          <div className="h-1.5 bg-sunken rounded-full overflow-hidden"><div className="h-full bg-accent-600" style={{ width: `${l.pct_committed}%` }} /></div>
          <div className="num flex justify-between gap-2 text-xs text-mutedFg"><span>{compact(l.committed_amount)} of {compact(l.offered_amount)} committed</span><span>{daysLabel(l)}</span></div>
        </div>
        <Link href={`/marketplace/${l.ref}`} className="btn btn-secondary btn-block">View offering</Link>
      </div>
    </article>
  );
}
