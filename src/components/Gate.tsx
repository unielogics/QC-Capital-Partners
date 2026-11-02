"use client";

// The access gate: four steps, the waiting-period readout, and the one thing
// the member can do next. Everything here comes from /capital/me; the dates
// are real.

import Link from "next/link";
import { day } from "@/lib/format";
import type { Me } from "@/lib/types";

const LOOK = {
  done: { num: "bg-[var(--color-success-tint)] text-[var(--color-success)]", tag: "tag tag-success", label: "Done" },
  now: { num: "bg-accent-100 text-accent-700", tag: "tag tag-accent", label: "In progress" },
  later: { num: "bg-[var(--color-neutral-200)] text-[var(--color-neutral-600)]", tag: "tag tag-neutral", label: "Locked" },
};

const DESC: Record<string, string> = {
  request: "Our principal speaks with every member first.",
  questionnaire: "Basis, experience and objectives.",
  review: "No offering is visible during this period.",
  access: "Offerings, documents and subscriptions.",
};

export function Gate({ me }: { me: Me }) {
  const g = me.gate;
  const status = me.status;
  const title =
    status === "under_review" ? "Your questionnaire is with our principal"
      : status === "waiting" ? "Your waiting period is running"
        : status === "suspended" ? "This membership is suspended"
          : me.questionnaire_outcome === "needs_changes" ? "One more pass on your questionnaire"
            : "Finish your accreditation questionnaire";
  const body =
    status === "under_review" ? "We review every questionnaire personally and will email you the outcome. Nothing is shown until then."
      : status === "waiting" ? "You are approved. Offerings become visible to you when the waiting period ends."
        : status === "suspended" ? "Contact the desk to discuss your membership."
          : "Offerings stay hidden until we have reviewed your questionnaire and the waiting period has passed.";

  return (
    <section className="grid place-items-center py-10">
      <div className="card elev-md w-[min(640px,100%)] gap-5 p-8">
        <div>
          <span className="kicker">Member marketplace</span>
          <h1 className="text-h2 m-0 mb-2">{title}</h1>
          <p className="text-mutedFg m-0">{body}</p>
        </div>
        {me.questionnaire_notes ? <div className="notice"><span><strong className="text-ink">From the desk.</strong> {me.questionnaire_notes}</span></div> : null}
        {status === "waiting" && g ? (
          <div className="readout readout-accent">
            <span className="readout-label">Waiting period</span>
            <span className="readout-value">{g.waiting_days_left != null ? `${g.waiting_days_left} days left` : "In progress"}</span>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-2"><div className="h-full bg-accent-600" style={{ width: `${g.waiting_pct ?? 0}%` }} /></div>
            <span className="readout-note">Relationship established {day(g.relationship_established_at)}. Offerings become visible {day(g.waiting_period_ends_at)}.</span>
          </div>
        ) : null}
        {g ? (
          <ol className="process m-0 p-0 list-none">
            {g.steps.map((s, i) => (
              <li key={s.key} className="process-step">
                <span className={`process-num ${LOOK[s.state].num}`}>{i + 1}</span>
                <div className="flex justify-between gap-3 items-baseline">
                  <div><p className="process-title">{s.title}</p><p className="process-desc">{DESC[s.key] ?? ""}</p></div>
                  <span className={`${LOOK[s.state].tag} flex-none`}>{LOOK[s.state].label}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {status === "requested" || status === "questionnaire" ? (
          <Link href="/questionnaire" className="btn btn-primary btn-lg justify-self-start">{me.has_questionnaire ? "Update questionnaire" : "Start questionnaire"}</Link>
        ) : null}
        <p className="fineprint m-0">The waiting period confirms that our relationship with you began before any offering is shown, as Rule 506(b) requires when there is no general solicitation.</p>
      </div>
    </section>
  );
}
