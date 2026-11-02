import { SignIn } from "@clerk/nextjs";

// The portal's own sign-in. A borrower or staff login that lands here is
// walled by the Shell after /auth/me answers; nothing in the funding
// dashboard links here, and nothing here links there.
export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-bg p-6">
      <div className="grid gap-6 justify-items-center">
        <div className="text-center grid gap-2">
          <span className="kicker">Capital partners</span>
          <h1 className="text-h3 m-0">Member sign in</h1>
          <p className="fineprint mx-auto">Confidential. Offerings are made under Rule 506(b) of Regulation D to approved accredited members only.</p>
        </div>
        <SignIn routing="path" path="/sign-in" forceRedirectUrl="/" />
      </div>
    </main>
  );
}
