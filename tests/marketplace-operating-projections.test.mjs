import assert from "node:assert/strict";
import test from "node:test";
import { marketplaceOperatingProjection, marketplaceOperatingRows, marketplaceProjectionNumber, marketplaceProjectionValue, marketplaceProjectionMoney } from "../src/lib/marketplaceOperatingProjection.ts";

const point = { noi_annual: 0, noi_currency: "USD", noi_delta_annual: 0,
  earnings_annual: -12000, earnings_currency: "EUR", earnings_kind: "tax_estimate", earnings_delta_annual: -50.25,
  dscr_current_debt: 0.25, dscr_with_refinance: 0.3077, dscr_current_debt_delta: 0, dscr_with_refinance_delta: 0.0577,
  cash_after_debt_annual: -48000, cash_after_debt_monthly: -4000, cash_currency: "CAD", cash_delta_annual: 42000, cash_delta_monthly: 3500 };
const projection = { schema_version: "marketplace-operating-projection-v1", saved_version: { id: "example-version", version_number: 3, state: "client_submitted", saved_at: "2026-11-13T12:00:00Z" },
  status: "conditional", qualification: "proposed", historical_figures_unchanged: true, basis: "future_operating_plan",
  current: point, refinance_only: point, proposed_operating: point, reviewed_operating: point, missing: [], notes: [] };

test("only the explicit versioned operating sidecar is accepted, without guessing from refinance figures", () => {
  assert.equal(marketplaceOperatingProjection({ plan: { active: true, impact: { dscr: { after: 1.5 } } } }), null);
  assert.equal(marketplaceOperatingProjection({ ...projection, schema_version: "unrecognized" }), null);
  assert.equal(marketplaceOperatingProjection(projection), projection);
  assert.equal(projection.saved_version.state, "client_submitted");
});

test("tax-estimate coverage earnings remain distinct from EBITDA", () => {
  const rows = marketplaceOperatingRows(projection);
  assert.equal(rows.length, 6);
  assert.equal(rows.find(row => row.value === "earnings_annual").label, "Coverage earnings (tax estimate) / year");
  assert.match(marketplaceOperatingRows({ ...projection, current: { ...point, earnings_kind: "computed_ebitda" } })[1].label, /EBITDA/);
});

test("currencies stay independent for NOI, earnings and illustrated cash, including losses and zero", () => {
  const rows = marketplaceOperatingRows(projection);
  assert.equal(marketplaceProjectionValue(point, rows[0]), "$0");
  assert.match(marketplaceProjectionValue(point, rows[1]), /-€12,000/);
  assert.match(marketplaceProjectionValue(point, rows[4]), /CA\$4,000/);
  assert.match(marketplaceProjectionValue(point, rows[4]), /^-/);
  assert.equal(marketplaceProjectionValue(point, rows[1], true), "−€50.25");
});

test("fractional and signed server deltas are displayed without recomputation or rounding to fake zero", () => {
  const rows = marketplaceOperatingRows(projection);
  assert.equal(marketplaceProjectionValue(point, rows[3], true), "+0.0577x");
  assert.equal(marketplaceProjectionValue({ ...point, noi_delta_annual: 0.5 }, rows[0], true), "+$0.5");
  assert.equal(marketplaceProjectionValue({ ...point, noi_delta_annual: null }, rows[0], true), "—");
  assert.equal(marketplaceProjectionNumber("2.5"), null);
  assert.equal(marketplaceProjectionNumber(Number.NaN), null);
});

test("missing currency and metrics remain explicit rather than borrowing a different financial basis", () => {
  assert.equal(marketplaceProjectionMoney(1000, null), "1,000 (currency unconfirmed)");
  assert.equal(marketplaceProjectionMoney(null, "USD"), "—");
  const rows = marketplaceOperatingRows(projection);
  assert.equal(marketplaceProjectionValue({ ...point, noi_annual: null }, rows[0]), "—");
});
