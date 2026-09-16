import test from "node:test";
import assert from "node:assert/strict";
import { getWastageDateRange, isAllowedWastageDate } from "../src/features/wastage/wastageDate.js";

test("allows all four calendar dates in UAE and rejects older or future dates", () => {
  const now = new Date("2026-09-15T20:00:00Z"); // Midnight on September 16 in UAE.
  assert.deepEqual(getWastageDateRange(now), { minDate: "2026-09-13", maxDate: "2026-09-16" });
  for (const date of ["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"]) {
    assert.equal(isAllowedWastageDate(date, now), true);
  }
  for (const date of ["2026-09-12", "2026-09-11", "2026-09-17", "", "bad"]) {
    assert.equal(isAllowedWastageDate(date, now), false);
  }
});

test("the date window advances at UAE midnight rather than Pakistan midnight", () => {
  const beforeMidnight = new Date("2026-09-15T19:59:59.999Z");
  assert.deepEqual(getWastageDateRange(beforeMidnight), { minDate: "2026-09-12", maxDate: "2026-09-15" });
  assert.equal(isAllowedWastageDate("2026-09-12", beforeMidnight), true);
  assert.equal(isAllowedWastageDate("2026-09-16", beforeMidnight), false);
  const midnight = new Date("2026-09-15T20:00:00Z");
  assert.equal(isAllowedWastageDate("2026-09-12", midnight), false);
  assert.equal(isAllowedWastageDate("2026-09-16", midnight), true);
});

test("date range handles year rollover, leap days, and invalid dates", () => {
  assert.deepEqual(getWastageDateRange(new Date("2026-01-01T00:00:00+04:00")), {
    minDate: "2025-12-29", maxDate: "2026-01-01",
  });
  const leapDay = new Date("2028-03-01T00:00:00+04:00");
  assert.equal(isAllowedWastageDate("2028-02-29", leapDay), true);
  assert.equal(isAllowedWastageDate("2028-02-30", leapDay), false);
  assert.equal(isAllowedWastageDate("2028-02-31", leapDay), false);
});
