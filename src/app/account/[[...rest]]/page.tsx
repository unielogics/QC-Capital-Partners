import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <section className="grid gap-4">
      <div>
        <span className="kicker">Account</span>
        <h1 className="text-h2 m-0">Your sign-in</h1>
      </div>
      <UserProfile routing="path" path="/account" />
    </section>
  );
}
