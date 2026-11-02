"use client";

// The console switcher the operator consoles share: Funding · Field Desk ·
// Audit · Capital Partners, rendered from the list the server says this
// login may enter (/auth/me.consoles). A member's only console is this one,
// so a member sees nothing here; an operator in preview gets the way back.
import type { ConsoleLink } from "@/lib/types";

export function ConsoleSwitcher({ consoles, current }: { consoles: ConsoleLink[]; current: ConsoleLink["key"] }) {
  if (consoles.length < 2) return null;
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-divider bg-sunken px-3 py-1.5 text-xs" aria-label="Console switcher">
      {consoles.map((c, i) => (
        <span key={c.key} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span className="text-mutedFg">·</span> : null}
          {c.key === current
            ? <b aria-current="page" className="text-ink">{c.label}</b>
            : <a href={c.url} title={`Open ${c.label} under the same account`} className="font-semibold text-accent-600 no-underline hover:underline">{c.label}</a>}
        </span>
      ))}
    </div>
  );
}
