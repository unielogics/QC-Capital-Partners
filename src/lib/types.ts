// Mirrors app/capital_partners/schemas.py (member side) in qcbackend.
// Decimals arrive as strings and stay strings until formatted.

export type ConsoleLink = { key: "funding" | "field_desk" | "audit" | "capital"; label: string; url: string };
export type AuthMe = { id: string; email: string; name: string; role: string; consoles?: ConsoleLink[] };

export type MemberStatus = "requested" | "questionnaire" | "under_review" | "waiting" | "approved" | "suspended" | "preview";
export type Entity = { id: string; name: string; kind: string; state: string | null; accreditation_basis: string | null; status: string; is_default: boolean };
export type GateStep = { key: string; title: string; state: "done" | "now" | "later" };
export type Gate = {
  status: string; cleared: boolean; steps: GateStep[]; relationship_established_at: string | null; waiting_period_days: number | null;
  waiting_period_ends_at: string | null; waiting_days_left: number | null; waiting_pct: number | null; suspended: boolean;
};
export type Me = {
  user_id: string; email: string; name: string; role: string; preview: boolean; member_id: string | null; status: MemberStatus; status_label: string;
  investing_as: string | null; display_name: string | null; state_of_residence: string | null; gate: Gate | null; entities: Entity[];
  has_questionnaire: boolean; questionnaire_outcome: string | null; questionnaire_notes: string | null;
};

export type Vertical = "real_estate" | "auto" | "business";
export type ListingStatus = "open" | "closing" | "fully_subscribed" | "funded" | "repaid" | "workout";
export type Listing = {
  id: string; ref: string; name: string; vertical: Vertical; vertical_label: string; program_label: string; city: string | null; state: string | null;
  place: string | null; collateral_type: string | null; lien_position: "first" | "second"; note_rate_pct: string | null; term_months: number | null;
  ltv_pct: string | null; ltv_kind: "ltv" | "ltc" | "cltv"; minimum_investment: string | null; loan_amount: string | null; offered_amount: string | null;
  committed_amount: string; remaining_amount: string; pct_committed: number; payment_frequency: "monthly" | "quarterly" | "at_maturity";
  personal_guarantee: boolean; status: ListingStatus; outcome: string | null; opens_at: string | null; closes_at: string | null; days_left: number | null;
  funded_at: string | null; repaid_at: string | null; maturity_date: string | null; published_at: string | null;
};
export type Document = { id: string; kind: string; kind_label: string; name: string; content_type: string | null; size_bytes: number | null; version: number; status: string };
export type Subscription = {
  id: string; listing_id: string; listing_ref: string | null; listing_name: string | null; entity_id: string | null; entity_name: string | null; amount: string;
  status: "requested" | "documents_sent" | "signed" | "funded" | "cancelled" | "declined"; requested_at: string; documents_sent_at: string | null;
  signed_at: string | null; funded_at: string | null; funded_amount: string | null;
};
/** Original / with the plan / change, as the desk's cockpit computed it. */
export type PlanPair = { before: number | null; after: number | null; change: number | null };
export type ListingFinancials = {
  generated_at?: string | null; refreshed_at?: string | null;
  bank_months?: number | null; bank_months_accepted?: number | null; avg_monthly_deposits?: number | null; annualized_deposits?: number | null;
  avg_monthly_net?: number | null; average_balance?: number | null; nsf_total?: number | null; deposit_trend_pct?: number | null;
  dscr?: number | null; dscr_basis?: string | null; dscr_status?: string | null; pro_forma_dscr?: number | null; dscr_after_plan?: number | null;
  debt_service_after_monthly?: number | null; annual_debt_service?: number | null;
  net_profit?: number | null; net_profit_basis?: string | null; net_profit_period?: string | null;
  tax_year?: string | null; tax_gross_receipts?: number | null; tax_income?: number | null;
  plan?: {
    modifications: { kind: string | null; label: string | null; detail: string | null }[];
    impact: {
      dscr?: PlanPair & { basis?: string | null }; income_annual?: PlanPair; debt_service_monthly?: PlanPair; net_cash_flow_monthly?: PlanPair;
      ending_balance?: PlanPair; months_negative?: PlanPair; loan?: { amount?: number; rate_pct?: number; term_months?: number | null; interest_only?: boolean; payment_monthly?: number | null } | null;
    };
  };
};
export type ListingDetail = Listing & {
  summary: string | null; guarantee_text: string | null; borrower_track_record: string | null; exit_plan: string | null; valuation_amount: string | null;
  valuation_source: string | null; title_status: string | null; servicer_label: string | null; documents: Document[]; my_subscriptions: Subscription[]; can_subscribe: boolean;
  financials?: ListingFinancials | null;
};
export type Facet = { value: string; label: string; count: number };
export type ListingsPage = {
  items: Listing[]; total: number;
  stats: { open_count: number; available_amount: string; weighted_note_rate_pct: string | null; average_ltv_pct: string | null };
  facets: Record<"status" | "program" | "collateral" | "frequency" | "state", Facet[]>;
  vertical_counts: Record<string, number>; as_of: string;
};
export type Participation = {
  id: string; listing_id: string; listing_ref: string; listing_name: string; vertical: Vertical; vertical_label: string; note_rate_pct: string | null;
  entity_id: string | null; entity_name: string | null; invested_amount: string; principal_outstanding: string; interest_received_ytd: string;
  interest_received_total: string; next_payment_on: string | null; servicer_status: "current" | "late" | "paid_in_full" | "in_workout";
  status_as_of: string | null; funded_at: string | null; closed_at: string | null; maturity_date: string | null; transferable: boolean;
};
export type Portfolio = { stats: { invested: string; outstanding: string; interest_ytd: string; active: number }; holdings: Participation[]; entities: Entity[]; as_of: string };
export type SoldRow = {
  id: string; ref: string; name: string; vertical: Vertical; vertical_label: string; program_label: string; place: string | null; offered_amount: string | null;
  note_rate_pct: string | null; term_months: number | null; funded_at: string | null; repaid_at: string | null; hold_months: number | null; status: string; outcome: string | null;
};
export type Sold = { stats: { count: number; capital_placed: string; repaid_count: number; average_hold_months: number | null }; rows: SoldRow[] };
export type Transfer = {
  id: string; ref: string; listing_id: string; listing_ref: string; listing_name: string; vertical: Vertical; vertical_label: string; principal_amount: string;
  note_rate_pct: string | null; remaining_term_months: number | null; ask_pct: string; implied_yield_pct: string | null; listed_at: string;
  status: "listed" | "requested" | "pending_consent" | "approved" | "completed" | "withdrawn" | "declined"; is_mine: boolean; can_request: boolean;
};
export type Questionnaire = { id: string; version: number; answers: Record<string, unknown>; basis: string | null; investing_as: string | null; state_of_residence: string | null; submitted_at: string; outcome: string; review_notes: string | null };

export const VERTICAL_CLASS: Record<Vertical, string> = { real_estate: "v-realestate", auto: "v-auto", business: "v-business" };
