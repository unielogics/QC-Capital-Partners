import assert from "node:assert/strict";
import test from "node:test";
import { investorMoney, payoffMissing } from "../src/lib/investorEconomics.ts";

test("unknown investor amounts stay unknown while explicit zero remains visible", () => {
  assert.equal(investorMoney(null), "Not established");
  assert.equal(investorMoney(undefined), "Not established");
  assert.equal(investorMoney(Number.NaN), "Not established");
  assert.match(investorMoney(0), /USD\s+0\.00/);
  assert.equal(investorMoney(1000, null), "1,000.00 · currency not confirmed");
});

test("net losses retain their sign, cents and explicit source currency", () => {
  const value = investorMoney(-15.25, "EUR");
  assert.ok(value.startsWith("-"));
  assert.ok(value.includes("EUR"));
  assert.ok(value.includes("15.25"));
  assert.ok(investorMoney(5880).includes("5,880.00"));
});

test("missing payoff assumptions explain incomplete NET results without inventing a projection", () => {
  assert.match(payoffMissing("charge_amount"), /has not been confirmed/);
  assert.match(payoffMissing("reserve_release"), /reserve release/);
  assert.equal(payoffMissing("Unrecognized service explanation"), "Unrecognized service explanation");
});
