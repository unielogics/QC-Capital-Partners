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
