"use client";

// The portal's chrome, and its two walls.
//
// Not signed in: Clerk's middleware already redirected. Signed in but the
// login does not open the Capital Partners console (a borrower, an agent, a
// rep): the wall, with a button to the console it does open. An operator:
// the preview banner, read-only. A member: the header with the four tabs,
// the status tag and the confidentiality strip; the tabs stay muted until
// the gate clears, and the API refuses the data behind them anyway.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INVESTING_AS, initials } from "@/lib/format";
import { MOCK } from "@/lib/api";
import { FUNDING_URL, useMe } from "@/lib/useMe";

const TABS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sold", label: "Sold and repaid" },
  { href: "/secondary", label: "Secondary" },
  { href: "/portfolio", label: "Portfolio" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-[11px] whitespace-nowrap font-extrabold tracking-[-0.03em] text-lg text-accent-600 no-underline py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/qc-icon.svg" alt="Qualified Commercial" width={34} height={34} className="w-[34px] h-[34px] rounded-[11px]" />
      <span>Qualified Commercial</span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { me, auth, consoles, canEnter, preview, cleared, isResolving, error } = useMe();

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return <>{children}</>;

  if (isResolving) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="h-[58px] bg-surface border-b border-divider" />
        <div className="h-9 bg-sunken border-b border-divider" />
      </div>
    );
  }

  if (error && !auth) {
    return (
      <Wall title="We could not load your account">
        <p className="text-mutedFg">The portal could not reach the desk. Try again in a moment.</p>
        <div className="flex gap-2.5 items-center flex-wrap"><button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>{!MOCK ? <SignedIn><UserButton afterSignOutUrl="/sign-in" /></SignedIn> : null}</div>
      </Wall>
    );
  }

  if (!canEnter) {
    const others = consoles.filter((c) => c.key !== "capital");
    return (
      <Wall title="This login doesn't open the Capital Partners portal">
        <p className="text-mutedFg">The portal is for approved capital partners and the desk. Your sign-in opens:</p>
        <div className="flex gap-2.5 items-center flex-wrap">
          {others.length ? others.map((c) => <a key={c.key} className="btn btn-primary" href={c.url}>Open {c.label} →</a>) : <a className="btn btn-primary" href={FUNDING_URL}>Open Funding →</a>}
          {!MOCK ? <SignedIn><UserButton afterSignOutUrl="/sign-in" /></SignedIn> : null}
        </div>
        <p className="fineprint m-0">Capital partners sign up at <a href="/sign-up">/sign-up</a>; the funding dashboard is a different account.</p>
      </Wall>
    );
  }

  const statusTag = me?.status === "approved" ? "tag tag-success" : me?.status === "waiting" ? "tag tag-warning" : me?.status === "suspended" ? "tag tag-danger" : "tag tag-neutral";
  const who = me?.display_name || auth?.name || "";
  const role = preview ? "Qualified Commercial" : INVESTING_AS[me?.investing_as ?? ""] ?? "Capital partner";

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 bg-surface border-b border-divider">
        <div className="w-[min(1440px,calc(100%-40px))] mx-auto flex items-stretch gap-7 flex-wrap">
          <Brand />
          <nav aria-label="Member portal" className="flex gap-1 mr-auto flex-wrap">
            {TABS.map((t) => {
              const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
              const href = cleared ? t.href : "/";
              return (
                <Link key={t.href} href={href} aria-current={on ? "page" : undefined} aria-disabled={!cleared} title={cleared ? undefined : "Available once your membership is approved"}
                  className={`inline-flex items-center px-3 min-h-[58px] text-sm font-semibold whitespace-nowrap no-underline border-b-2 ${on ? "border-accent-600 text-ink" : "border-transparent text-mutedFg hover:text-ink"} ${cleared ? "" : "opacity-50"}`}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3.5 py-2">
            <span className={statusTag}>{me?.status_label ?? "Member"}</span>
            <Link href="/account" className="flex items-center gap-2.5 no-underline text-ink" title="Your sign-in">
              <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-100 text-accent-800 text-xs font-bold">{initials(who)}</span>
              <span className="hidden sm:grid leading-[1.25]"><span className="text-sm font-semibold">{who}</span><span className="text-xs text-mutedFg">{role}</span></span>
            </Link>
            <ThemeToggle />
            {!MOCK ? <SignedIn><UserButton afterSignOutUrl="/sign-in" /></SignedIn> : null}
          </div>
        </div>
      </header>
      <div className="bg-sunken border-b border-divider">
        <div className="w-[min(1440px,calc(100%-40px))] mx-auto py-2 flex gap-2 items-center text-xs text-mutedFg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <span>Confidential. Offerings are made under Rule 506(b) of Regulation D to approved accredited members only. Do not share or forward offering information.</span>
        </div>
      </div>
      {preview ? (
        <div className="bg-accent-100 border-b border-divider">
          <div className="w-[min(1440px,calc(100%-40px))] mx-auto py-2 text-sm text-accent-800"><strong>Operator preview.</strong> You see what an approved member sees. Members subscribe; this login cannot.</div>
        </div>
      ) : null}
      <main className="w-[min(1440px,calc(100%-40px))] mx-auto pt-8 pb-20">{children}</main>
    </div>
  );
}

function Wall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg grid place-items-center p-6">
      <div className="card elev-md w-[min(460px,100%)] gap-3">
        <Brand />
        <h2 className="text-lg m-0">{title}</h2>
        {children}
      </div>
    </div>
  );
}
