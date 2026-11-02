import { SignIn } from "@clerk/nextjs";

// The portal's own sign-in: only Clerk's card, which carries its own heading.
// A borrower or staff login that lands here is walled by the Shell after
// /auth/me answers; nothing in the funding dashboard links here, and nothing
// here links there.
export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-bg p-6">
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/" />
    </main>
  );
}
