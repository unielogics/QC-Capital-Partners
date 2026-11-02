"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FUNDING_URL } from "@/lib/useMe";

// The portal's own sign-up. The consent block has to be checked before the
// Clerk form renders (hidden, not disabled, so it cannot be bypassed from
// devtools), and the form sends unsafeMetadata.console = "capital": that
// value is what makes the backend provision this account as a capital
// partner (a pending member who sees nothing until approved) instead of a
// borrower. Remove it and every sign-up here becomes a borrower record.
export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) return <main className="min-h-screen bg-bg" aria-hidden="true" />;

  return (
    <main className="min-h-screen grid place-items-center bg-bg p-6">
      <div className="grid gap-5 w-full max-w-[520px] justify-items-center">
        <div className="text-center grid gap-2">
          <span className="kicker">Capital partners</span>
          <h1 className="text-h3 m-0">Create your member account</h1>
          <p className="fineprint mx-auto">Creating an account is the first of four steps. No offering is shown until our principal has reviewed your accreditation questionnaire and the waiting period has passed.</p>
        </div>
        <div className={`card w-full ${accepted ? "border-[var(--color-success)]" : ""}`}>
          <label className="flex items-start gap-3 cursor-pointer text-sm leading-[1.55]">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-required className="mt-0.5 w-[18px] h-[18px] flex-none accent-accent-600" />
            <span>
              I agree to Qualified Commercial&apos;s{" "}
              <a href={`${FUNDING_URL}/terms`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Terms and Conditions</a>,{" "}
              <a href={`${FUNDING_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Privacy Policy</a> and{" "}
              <a href={`${FUNDING_URL}/disclosures`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Disclosures</a>. I understand that creating an account is not an investment, that no offering is shown to me until my accreditation is reviewed and the waiting period has passed, and that participations are restricted securities that are not FDIC insured and may lose value.
            </span>
          </label>
          <p className={`fineprint m-0 mt-2 ${accepted ? "text-[var(--color-success)]" : ""}`}>{accepted ? "Consent recorded. You can create your account below." : "Check the box to enable account creation."}</p>
        </div>
        {accepted ? (
          <SignUp routing="path" path="/sign-up" forceRedirectUrl="/" unsafeMetadata={{ console: "capital" }} />
        ) : (
          <div className="card w-full border-dashed text-center text-sm text-mutedFg">The account form appears once you accept the documents above.</div>
        )}
        <p className="fineprint mx-auto text-center">Already a member? <a href="/sign-in" className="font-semibold">Sign in</a>.</p>
      </div>
    </main>
  );
}
