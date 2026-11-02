// Sample data for reviewing the portal without a backend (NEXT_PUBLIC_API_MOCK=1).
//
// Shapes match app/capital_partners/schemas.py. The loans, names and figures
// are invented; this file never runs in production.

import type { AuthMe, Listing, ListingDetail, ListingsPage, Me, Participation, Portfolio, Sold, Subscription, Transfer } from "./types";

type Status = "approved" | "waiting" | "questionnaire" | "preview" | "wall";
const STATUS = (process.env.NEXT_PUBLIC_API_MOCK_STATUS as Status | undefined) ?? "approved";
const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));
const daysAhead = (n: number) => iso(new Date(now.getTime() + n * 86400000));
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

const L = (
  id: string, name: string, v: Listing["vertical"], program: string, lien: Listing["lien_position"], state: string, city: string, collateral: string,
  rate: number, term: number, ltv: number, ltvKind: Listing["ltv_kind"], min: number, amount: number, committed: number, freq: Listing["payment_frequency"],
  pg: boolean, status: Listing["status"], days: number,
): Listing => ({
  id, ref: id, name, vertical: v, vertical_label: { real_estate: "Real estate", auto: "Auto", business: "Business" }[v], program_label: program, city, state, place: `${city}, ${state}`,
  collateral_type: collateral, lien_position: lien, note_rate_pct: rate.toFixed(3), term_months: term, ltv_pct: ltv.toFixed(3), ltv_kind: ltvKind,
  minimum_investment: min.toFixed(2), loan_amount: amount.toFixed(2), offered_amount: amount.toFixed(2), committed_amount: committed.toFixed(2),
  remaining_amount: Math.max(amount - committed, 0).toFixed(2), pct_committed: Math.round((committed / amount) * 100), payment_frequency: freq, personal_guarantee: pg,
  status, outcome: status === "funded" || status === "fully_subscribed" ? "performing" : null, opens_at: daysAgo(20), closes_at: status === "fully_subscribed" ? null : daysAhead(days),
  days_left: status === "fully_subscribed" ? null : days, funded_at: status === "fully_subscribed" ? daysAgo(3) : null, repaid_at: null, maturity_date: dateOnly(new Date(now.getTime() + term * 30 * 86400000)), published_at: daysAgo(20),
});

export const LISTINGS: Listing[] = [
  L("QC-RE-1049", "Multifamily acquisition bridge", "real_estate", "Bridge", "first", "NJ", "Newark", "Multifamily", 11.25, 12, 68, "ltv", 25000, 2400000, 1730000, "monthly", true, "open", 9),
  L("QC-AU-0221", "Dealer floorplan line", "auto", "Floorplan", "first", "PA", "Allentown", "Vehicle inventory", 11.5, 6, 70, "ltv", 25000, 900000, 540000, "monthly", true, "open", 7),
  L("QC-RE-1047", "Fix and flip, four-unit renovation", "real_estate", "Fix and flip", "first", "PA", "Philadelphia", "Residential 1-4", 12.0, 9, 72, "ltc", 10000, 640000, 212000, "monthly", true, "open", 14),
  L("QC-BZ-0336", "Manufacturing equipment bridge", "business", "Equipment", "first", "OH", "Cleveland", "Equipment", 10.25, 24, 60, "ltv", 25000, 850000, 255000, "monthly", true, "open", 18),
  L("QC-RE-1046", "Mixed-use refinance bridge", "real_estate", "Bridge", "first", "NY", "Brooklyn", "Mixed-use", 10.75, 18, 62, "ltv", 50000, 3850000, 3510000, "monthly", true, "closing", 3),
  L("QC-BZ-0334", "Grocery working capital, receivables-backed", "business", "Working capital", "first", "NY", "Queens", "Receivables", 12.5, 6, 55, "ltv", 10000, 400000, 96000, "monthly", true, "open", 12),
  L("QC-RE-1044", "Bridge to DSCR, 12 rental homes", "real_estate", "DSCR rental", "first", "OH", "Columbus", "Residential 1-4", 9.5, 24, 65, "ltv", 25000, 1520000, 610000, "monthly", false, "open", 21),
  L("QC-AU-0219", "Independent dealer acquisition bridge", "auto", "Dealer acquisition", "first", "FL", "Orlando", "Vehicle inventory", 12.25, 12, 66, "ltv", 25000, 1250000, 1150000, "monthly", true, "closing", 2),
  L("QC-RE-1041", "Industrial flex acquisition", "real_estate", "Bridge", "first", "TX", "Dallas", "Industrial", 10.5, 12, 64, "ltv", 50000, 4200000, 1260000, "quarterly", false, "open", 26),
  L("QC-RE-1039", "Townhome construction, second position", "real_estate", "Bridge", "second", "GA", "Atlanta", "Residential 1-4", 13.5, 12, 75, "cltv", 25000, 450000, 180000, "at_maturity", true, "open", 11),
  L("QC-RE-1042", "Retail center foreclosure rescue", "real_estate", "Foreclosure rescue", "first", "FL", "Tampa", "Retail", 11.0, 24, 58, "ltv", 50000, 2100000, 2100000, "monthly", true, "fully_subscribed", 0),
  L("QC-AU-0218", "Pre-owned inventory line", "auto", "Floorplan", "first", "TX", "Houston", "Vehicle inventory", 11.75, 9, 69, "ltv", 10000, 600000, 600000, "monthly", true, "fully_subscribed", 0),
];

const ENTITIES = [
  { id: "ent-1", name: "Ridgeway Family Trust", kind: "trust", state: "NJ", accreditation_basis: "entity_assets", status: "active", is_default: true },
  { id: "ent-2", name: "RFO Holdings LLC", kind: "llc", state: "NJ", accreditation_basis: "entity_assets", status: "active", is_default: false },
];

const SUBS: Subscription[] = [
  { id: "sub-1", listing_id: "QC-RE-1042", listing_ref: "QC-RE-1042", listing_name: "Retail center foreclosure rescue", entity_id: "ent-2", entity_name: "RFO Holdings LLC", amount: "150000.00", status: "funded", requested_at: daysAgo(40), documents_sent_at: daysAgo(39), signed_at: daysAgo(37), funded_at: daysAgo(33), funded_amount: "150000.00" },
];

const HOLDINGS: Participation[] = [
  { id: "part-1", listing_id: "QC-RE-1042", listing_ref: "QC-RE-1042", listing_name: "Retail center foreclosure rescue", vertical: "real_estate", vertical_label: "Real estate", note_rate_pct: "11.000", entity_id: "ent-2", entity_name: "RFO Holdings LLC", invested_amount: "150000.00", principal_outstanding: "150000.00", interest_received_ytd: "1375.00", interest_received_total: "1375.00", next_payment_on: dateOnly(new Date(now.getTime() + 20 * 86400000)), servicer_status: "current", status_as_of: dateOnly(now), funded_at: daysAgo(33), closed_at: null, maturity_date: dateOnly(new Date(now.getTime() + 700 * 86400000)), transferable: true },
  { id: "part-2", listing_id: "QC-AU-0218", listing_ref: "QC-AU-0218", listing_name: "Pre-owned inventory line", vertical: "auto", vertical_label: "Auto", note_rate_pct: "11.750", entity_id: "ent-1", entity_name: "Ridgeway Family Trust", invested_amount: "50000.00", principal_outstanding: "50000.00", interest_received_ytd: "0.00", interest_received_total: "0.00", next_payment_on: dateOnly(new Date(now.getTime() + 25 * 86400000)), servicer_status: "current", status_as_of: dateOnly(now), funded_at: daysAgo(4), closed_at: null, maturity_date: dateOnly(new Date(now.getTime() + 260 * 86400000)), transferable: true },
  { id: "part-3", listing_id: "QC-RE-0981", listing_ref: "QC-RE-0981", listing_name: "Multifamily value-add bridge", vertical: "real_estate", vertical_label: "Real estate", note_rate_pct: "10.750", entity_id: "ent-1", entity_name: "Ridgeway Family Trust", invested_amount: "200000.00", principal_outstanding: "0.00", interest_received_ytd: "17917.00", interest_received_total: "19250.00", next_payment_on: null, servicer_status: "paid_in_full", status_as_of: dateOnly(now), funded_at: daysAgo(347), closed_at: daysAgo(18), maturity_date: dateOnly(now), transferable: false },
];

const TRANSFERS: Transfer[] = [
  { id: "tr-1", ref: "TR-0092", listing_id: "QC-RE-1037", listing_ref: "QC-RE-1037", listing_name: "Multifamily refinance bridge", vertical: "real_estate", vertical_label: "Real estate", principal_amount: "50000.00", note_rate_pct: "10.750", remaining_term_months: 9, ask_pct: "100.000", implied_yield_pct: "10.75", listed_at: daysAgo(4), status: "listed", is_mine: false, can_request: true },
  { id: "tr-2", ref: "TR-0091", listing_id: "QC-BZ-0331", listing_ref: "QC-BZ-0331", listing_name: "Medical practice acquisition bridge", vertical: "business", vertical_label: "Business", principal_amount: "100000.00", note_rate_pct: "13.000", remaining_term_months: 16, ask_pct: "99.500", implied_yield_pct: "13.07", listed_at: daysAgo(6), status: "listed", is_mine: false, can_request: true },
  { id: "tr-3", ref: "TR-0087", listing_id: "QC-AU-0218", listing_ref: "QC-AU-0218", listing_name: "Pre-owned inventory line", vertical: "auto", vertical_label: "Auto", principal_amount: "25000.00", note_rate_pct: "11.750", remaining_term_months: 8, ask_pct: "100.000", implied_yield_pct: "11.75", listed_at: daysAgo(15), status: "pending_consent", is_mine: true, can_request: false },
];

const SOLD: Sold = {
  stats: { count: 6, capital_placed: "9240000.00", repaid_count: 3, average_hold_months: 9 },
  rows: [
    { id: "s1", ref: "QC-RE-1042", name: "Retail center foreclosure rescue", vertical: "real_estate", vertical_label: "Real estate", program_label: "Foreclosure rescue", place: "Tampa, FL", offered_amount: "2100000.00", note_rate_pct: "11.000", term_months: 24, funded_at: daysAgo(33), repaid_at: null, hold_months: null, status: "funded", outcome: "performing" },
    { id: "s2", ref: "QC-AU-0218", name: "Pre-owned inventory line", vertical: "auto", vertical_label: "Auto", program_label: "Floorplan", place: "Houston, TX", offered_amount: "600000.00", note_rate_pct: "11.750", term_months: 9, funded_at: daysAgo(4), repaid_at: null, hold_months: null, status: "funded", outcome: "performing" },
    { id: "s3", ref: "QC-RE-0981", name: "Multifamily value-add bridge", vertical: "real_estate", vertical_label: "Real estate", program_label: "Bridge", place: "Jersey City, NJ", offered_amount: "3200000.00", note_rate_pct: "10.750", term_months: 12, funded_at: daysAgo(347), repaid_at: daysAgo(18), hold_months: 11, status: "repaid", outcome: "repaid_in_full" },
    { id: "s4", ref: "QC-RE-0955", name: "Brownstone fix and flip", vertical: "real_estate", vertical_label: "Real estate", program_label: "Fix and flip", place: "Brooklyn, NY", offered_amount: "980000.00", note_rate_pct: "11.500", term_months: 9, funded_at: daysAgo(500), repaid_at: daysAgo(240), hold_months: 9, status: "repaid", outcome: "repaid_in_full" },
    { id: "s5", ref: "QC-RE-0932", name: "Retail strip bridge", vertical: "real_estate", vertical_label: "Real estate", program_label: "Bridge", place: "Jacksonville, FL", offered_amount: "1850000.00", note_rate_pct: "11.000", term_months: 12, funded_at: daysAgo(575), repaid_at: daysAgo(130), hold_months: 14, status: "repaid", outcome: "repaid_after_extension" },
    { id: "s6", ref: "QC-RE-0910", name: "Mixed-use bridge", vertical: "real_estate", vertical_label: "Real estate", program_label: "Bridge", place: "Newark, NJ", offered_amount: "1400000.00", note_rate_pct: "11.500", term_months: 12, funded_at: daysAgo(650), repaid_at: null, hold_months: null, status: "workout", outcome: "in_workout" },
  ],
};

function me(): Me {
  const base = { user_id: "u-1", email: "m.ridgeway@example.com", name: "Maya Ridgeway", role: "capital_partner", preview: false, member_id: "m-1", investing_as: "family_office", display_name: "M. Ridgeway", state_of_residence: "NJ", entities: ENTITIES, has_questionnaire: true, questionnaire_outcome: "accepted", questionnaire_notes: null };
  const steps = (states: ("done" | "now" | "later")[]) => [
    { key: "request", title: "Request access", state: states[0] }, { key: "questionnaire", title: "Accreditation questionnaire", state: states[1] },
    { key: "review", title: "Relationship review and waiting period", state: states[2] }, { key: "access", title: "Marketplace access", state: states[3] },
  ];
  if (STATUS === "preview") return { ...base, role: "super_admin", preview: true, member_id: null, status: "preview", status_label: "Operator preview", gate: null, entities: [], has_questionnaire: false, questionnaire_outcome: null };
  if (STATUS === "questionnaire") return { ...base, status: "questionnaire", status_label: "Questionnaire pending", has_questionnaire: true, questionnaire_outcome: "needs_changes", questionnaire_notes: "Please add the state of residence for the trust and confirm the net-worth basis.", gate: { status: "questionnaire", cleared: false, steps: steps(["done", "now", "later", "later"]), relationship_established_at: null, waiting_period_days: null, waiting_period_ends_at: null, waiting_days_left: null, waiting_pct: null, suspended: false } };
  if (STATUS === "waiting") return { ...base, status: "waiting", status_label: "Waiting period", gate: { status: "waiting", cleared: false, steps: steps(["done", "done", "now", "later"]), relationship_established_at: daysAgo(14), waiting_period_days: 30, waiting_period_ends_at: daysAhead(16), waiting_days_left: 16, waiting_pct: 47, suspended: false } };
  return { ...base, status: "approved", status_label: "Accredited · approved", gate: { status: "approved", cleared: true, steps: steps(["done", "done", "done", "done"]), relationship_established_at: daysAgo(45), waiting_period_days: 30, waiting_period_ends_at: daysAgo(15), waiting_days_left: 0, waiting_pct: 100, suspended: false } };
}

const cleared = () => STATUS === "approved" || STATUS === "preview";

function gateError(): never {
  const m = me();
  const err = new Error("Offerings are shown only after your accreditation is reviewed and the waiting period has passed.") as Error & { status: number; body: unknown; code: string };
  err.status = 403;
  err.code = STATUS === "waiting" ? "waiting_period" : "not_approved";
  err.body = { detail: { code: err.code, message: err.message, gate: m.gate } };
  throw err;
}

function detail(ref: string): ListingDetail {
  const l = LISTINGS.find((x) => x.ref === ref) ?? LISTINGS[0];
  return {
    ...l,
    summary: "A short-term loan secured by the property, approved by our own underwriting desk and administered by an independent servicer.",
    guarantee_text: l.personal_guarantee ? "Full personal guarantee from principals" : "Non-recourse, with standard carve-outs",
    borrower_track_record: l.vertical === "real_estate" ? "7 completed projects" : "9 years in operation",
    exit_plan: "Refinance into permanent financing, or sale, once the property is stabilized.",
    valuation_amount: (Number(l.loan_amount) / (Number(l.ltv_pct) / 100)).toFixed(0),
    valuation_source: "Third-party appraisal",
    title_status: "Lien search clear",
    servicer_label: "Independent third-party servicer",
    documents: [
      { id: "doc-1", kind: "ppm", kind_label: "Private placement memorandum", name: "PPM.pdf", content_type: "application/pdf", size_bytes: 412_000, version: 1, status: "ready" },
      { id: "doc-2", kind: "subscription_agreement", kind_label: "Participation and subscription agreement", name: "Subscription agreement.pdf", content_type: "application/pdf", size_bytes: 210_000, version: 1, status: "ready" },
      { id: "doc-3", kind: "valuation", kind_label: "Valuation report", name: "Appraisal.pdf", content_type: "application/pdf", size_bytes: 1_900_000, version: 1, status: "ready" },
      { id: "doc-4", kind: "title", kind_label: "Title and lien search", name: "Title.pdf", content_type: "application/pdf", size_bytes: 320_000, version: 1, status: "ready" },
    ],
    my_subscriptions: SUBS.filter((s) => s.listing_id === l.ref),
    can_subscribe: STATUS === "approved" && (l.status === "open" || l.status === "closing"),
  };
}

function page(): ListingsPage {
  const open = LISTINGS.filter((l) => l.status !== "fully_subscribed");
  const avail = open.reduce((s, l) => s + Number(l.remaining_amount), 0);
  const wRate = open.reduce((s, l) => s + Number(l.note_rate_pct) * Number(l.remaining_amount), 0) / (avail || 1);
  const facet = (key: keyof Listing, values: string[], labels: Record<string, string> = {}) => values.map((v) => ({ value: v, label: labels[v] ?? v, count: LISTINGS.filter((l) => String(l[key]) === v).length }));
  return {
    items: LISTINGS, total: LISTINGS.length,
    stats: { open_count: open.length, available_amount: avail.toFixed(2), weighted_note_rate_pct: wRate.toFixed(2), average_ltv_pct: (open.reduce((s, l) => s + Number(l.ltv_pct), 0) / open.length).toFixed(1) },
    facets: {
      status: facet("status", ["open", "closing", "fully_subscribed"], { open: "Open", closing: "Closing", fully_subscribed: "Fully subscribed" }),
      program: facet("program_label", [...new Set(LISTINGS.map((l) => l.program_label))]),
      collateral: facet("collateral_type", [...new Set(LISTINGS.map((l) => l.collateral_type ?? ""))]),
      frequency: facet("payment_frequency", ["monthly", "quarterly", "at_maturity"], { monthly: "Monthly", quarterly: "Quarterly", at_maturity: "At maturity" }),
      state: facet("state", [...new Set(LISTINGS.map((l) => l.state ?? ""))].sort()),
    },
    vertical_counts: { all: LISTINGS.length, real_estate: LISTINGS.filter((l) => l.vertical === "real_estate").length, auto: LISTINGS.filter((l) => l.vertical === "auto").length, business: LISTINGS.filter((l) => l.vertical === "business").length },
    as_of: iso(now),
  };
}

export async function mockRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 120));
  const method = (opts.method ?? "GET").toUpperCase();
  const [route] = path.split("?");
  const out = (v: unknown) => v as T;
  if (route === "/auth/me") {
    const auth: AuthMe = STATUS === "wall"
      ? { id: "u-9", email: "borrower@example.com", name: "A Borrower", role: "client", consoles: [{ key: "funding", label: "Funding", url: "https://app.qualifiedcommercial.com" }] }
      : STATUS === "preview"
        ? { id: "u-0", email: "desk@example.com", name: "Desk", role: "super_admin", consoles: [{ key: "funding", label: "Funding", url: "https://app.qualifiedcommercial.com" }, { key: "capital", label: "Capital Partners", url: "https://capital.qualifiedcommercial.com" }] }
        : { id: "u-1", email: "m.ridgeway@example.com", name: "Maya Ridgeway", role: "capital_partner", consoles: [{ key: "capital", label: "Capital Partners", url: "https://capital.qualifiedcommercial.com" }] };
    return out(auth);
  }
  if (route === "/capital/me") return out(me());
  if (route === "/capital/questionnaire" && method === "POST") return out({ id: "q-2", version: 2, answers: {}, basis: "entity_assets", investing_as: "family_office", state_of_residence: "NJ", submitted_at: iso(now), outcome: "pending", review_notes: null });
  if (route === "/capital/entities" && method === "POST") return out({ id: `ent-${Date.now()}`, name: "New entity", kind: "llc", state: null, accreditation_basis: null, status: "active", is_default: false });
  if (!cleared()) gateError();
  if (route === "/capital/listings") return out(page());
  const m = route.match(/^\/capital\/listings\/([^/]+)$/);
  if (m) return out(detail(m[1]));
  if (/^\/capital\/listings\/[^/]+\/documents\/[^/]+\/url$/.test(route)) return out({ url: "https://example.com/sample.pdf", expires_in_seconds: 60 });
  if (/^\/capital\/listings\/[^/]+\/subscriptions$/.test(route) && method === "POST") {
    const body = JSON.parse(String(opts.body ?? "{}")) as { amount: string; entity_id?: string | null };
    const ref = route.split("/")[3];
    const sub: Subscription = { id: `sub-${Date.now()}`, listing_id: ref, listing_ref: ref, listing_name: detail(ref).name, entity_id: body.entity_id ?? null, entity_name: ENTITIES.find((e) => e.id === body.entity_id)?.name ?? null, amount: Number(body.amount).toFixed(2), status: "requested", requested_at: iso(now), documents_sent_at: null, signed_at: null, funded_at: null, funded_amount: null };
    SUBS.push(sub);
    return out(sub);
  }
  if (route === "/capital/subscriptions") return out(SUBS);
  if (route === "/capital/portfolio") {
    const p: Portfolio = { stats: { invested: HOLDINGS.reduce((s, h) => s + Number(h.invested_amount), 0).toFixed(2), outstanding: HOLDINGS.reduce((s, h) => s + Number(h.principal_outstanding), 0).toFixed(2), interest_ytd: HOLDINGS.reduce((s, h) => s + Number(h.interest_received_ytd), 0).toFixed(2), active: HOLDINGS.filter((h) => Number(h.principal_outstanding) > 0).length }, holdings: HOLDINGS, entities: ENTITIES, as_of: dateOnly(now) };
    return out(p);
  }
  if (route === "/capital/portfolio.csv") return out("Loan,Reference,Entity,Invested,Outstanding\n" + HOLDINGS.map((h) => `${h.listing_name},${h.listing_ref},${h.entity_name},${h.invested_amount},${h.principal_outstanding}`).join("\n"));
  if (route === "/capital/sold") return out(SOLD);
  if (route === "/capital/transfers" && method === "GET") return out(TRANSFERS);
  if (route === "/capital/transfers" && method === "POST") {
    const body = JSON.parse(String(opts.body ?? "{}")) as { participation_id: string; principal_amount: string; ask_pct: string };
    const h = HOLDINGS.find((x) => x.id === body.participation_id) ?? HOLDINGS[0];
    const t: Transfer = { id: `tr-${Date.now()}`, ref: `TR-0${100 + TRANSFERS.length}`, listing_id: h.listing_id, listing_ref: h.listing_ref, listing_name: h.listing_name, vertical: h.vertical, vertical_label: h.vertical_label, principal_amount: Number(body.principal_amount).toFixed(2), note_rate_pct: h.note_rate_pct, remaining_term_months: 9, ask_pct: Number(body.ask_pct).toFixed(3), implied_yield_pct: (Number(h.note_rate_pct) * 100 / Number(body.ask_pct)).toFixed(2), listed_at: iso(now), status: "listed", is_mine: true, can_request: false };
    TRANSFERS.unshift(t);
    return out(t);
  }
  const tm = route.match(/^\/capital\/transfers\/([^/]+)\/(request|withdraw)$/);
  if (tm) {
    const t = TRANSFERS.find((x) => x.id === tm[1]);
    if (t) { t.status = tm[2] === "request" ? "pending_consent" : "withdrawn"; t.can_request = false; }
    return out(t ?? {});
  }
  throw Object.assign(new Error(`No mock for ${method} ${route}`), { status: 404 });
}
