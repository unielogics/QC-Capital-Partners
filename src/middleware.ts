import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Deny by default. Only the portal's own sign-in and sign-up pages are public;
// everything else needs a Clerk session, and the API then decides what that
// session may see (a capital partner, or an operator in preview).
const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  // Review mode (NEXT_PUBLIC_API_MOCK=1): sample data, no session. Never set in
  // production; the API would refuse every call anyway.
  if (process.env.NEXT_PUBLIC_API_MOCK === "1") return;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
});

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)", "/(api|trpc)(.*)"],
};
