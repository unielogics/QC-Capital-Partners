# QCCapital

The capital-partner member portal for Qualified Commercial, served at
capital.qualifiedcommercial.com. Accredited private investors and family
offices participate loan by loan in bridge loans the company underwrites,
offered privately under SEC Rule 506(b).

What this app enforces is only what it renders. The rules live in the
backend package `app/capital_partners/` of qcbackend: a member sees an
offering only after the desk approves the accreditation questionnaire and
the waiting period has ended; operators may preview and never subscribe;
every document link is short-lived and logged.

Sign-up and sign-in are this app's own pages. The sign-up form sends Clerk
`unsafeMetadata.console = "capital"`, which is what makes the backend
provision the account as a capital partner instead of a borrower.

```bash
pnpm install
cp .env.example .env.local   # fill the Clerk keys and API URL
pnpm dev                     # http://localhost:3004
NEXT_PUBLIC_API_MOCK=1 pnpm dev   # sample data, no backend
```

## Deploy

AWS Amplify SSR, like the funding, audit and rep apps, one Clerk instance
across all of them. The order matters because the console's first build runs
before the environment variables exist and fails; that is expected.

1. Push `main` to `unielogics/QC-Capital-Partners` (the EC2 box pushes with
   the `github-qccapital` deploy key).
2. In the Amplify console: New app, GitHub, choose the repo and `main`.
   Connecting GitHub needs a token the CLI is never given here, so this one
   step is manual.
3. From the box: `scripts/amplify-wire.sh wire` copies the live Clerk pair
   and API host from the audit app, sets the portal's own variables, puts
   `main` in production, attaches `capital.qualifiedcommercial.com` (apex plus
   prefix, Route 53 records added by Amplify) and starts a build.
   `scripts/amplify-wire.sh status` follows the build and the domain.
4. Clerk Dashboard: add `https://capital.qualifiedcommercial.com` to the
   allowed origins. There is no CLI for it, and without it sign-in is refused
   after a green build.
