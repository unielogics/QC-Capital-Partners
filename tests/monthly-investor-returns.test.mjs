import assert from "node:assert/strict";
import test from "node:test";
import { returnMoney, returnPlot, returnTone, sameReturnRequest, selectReturnMonth, returnExitForMonth, returnRequirement } from "../src/components/investor/investorReturnModel.ts";

test("financial gaps remain gaps while explicit zero and signed losses remain visible", () => {
  assert.equal(returnMoney(null, "USD"), "Not confirmed");
  assert.equal(returnMoney(Number.NaN, "USD"), "Not confirmed");
  assert.match(returnMoney(0, "USD"), /USD\s+0\.00/);
  assert.match(returnMoney(-15.25, "EUR"), /^-EUR\s+15\.25$/);
  assert.equal(returnMoney(1000, null), "1,000.00 · currency not confirmed");
  assert.equal(returnTone(-1), "negative");
});

test("a missing server amount splits the plot rather than fabricating zero or joining the gap", () => {
  const plot = returnPlot([{ month: 0, value: -100 }, { month: 1, value: null }, { month: 2, value: 0 }, { month: 3, value: 50 }]);
  assert.equal(plot.paths.length, 2);
  assert.equal(plot.points[1].y, null);
  assert.equal(plot.points[2].value, 0);
  assert.equal(plot.minimum, -100);
  assert.equal(plot.maximum, 50);
});

test("month choices use actual schedule points including fractional maturity and Closing", () => {
  const schedule = [{ month: 0 }, { month: 1 }, { month: 2 }, { month: 2.5 }];
  assert.equal(selectReturnMonth(schedule, 6).month, 2.5);
  assert.equal(selectReturnMonth(schedule, 0).month, 0);
  assert.equal(selectReturnMonth([], 6), undefined);
});

test("request acceptance binds month and stake independently", () => {
  assert.equal(sameReturnRequest({ exit_month: 6, investment_amount: null }, { exit_month: 6, investment_amount: null }), true);
  assert.equal(sameReturnRequest({ exit_month: 6, investment_amount: 25000 }, { exit_month: 6, investment_amount: null }), false);
  assert.equal(sameReturnRequest({ exit_month: 7, investment_amount: 25000 }, { exit_month: 6, investment_amount: 25000 }), false);
});

test("an on-demand exit is available only for its server-selected month", () => {
  const selected_exit = { month: 8, payoff_month: 8, net_income: 7840 };
  const projection = { selected_exit, payoff_curve: [] };
  assert.equal(returnExitForMonth(projection, 8), selected_exit);
  assert.equal(returnExitForMonth(projection, 9), null);
  assert.match(returnRequirement("investor_costs_or_reserve_policy"), /Confirm investor-paid fees/);
});
