import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "@/components/Shell";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";

const inter = localFont({ src: "./fonts/inter-variable.woff2", weight: "100 900", variable: "--font-inter", display: "swap" });
const interTight = localFont({ src: "./fonts/inter-tight-variable.woff2", weight: "100 900", variable: "--font-inter-tight", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Member portal | Qualified Commercial", template: "%s | Qualified Commercial" },
  description: "Capital partner member portal. Private.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Every request hits the SSR Lambda, which is why amplify.yml writes
// .env.production at build time: a CLERK_SECRET_KEY missing at runtime throws
// inside clerkMiddleware and 503s every page.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">
      <html lang="en" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
