import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Waste from "../src/models/Waste.js";
import WasteItem from "../src/models/WasteItem.js";
import Shop from "../src/models/Shop.js";
import Product from "../src/models/Product.js";
import Unit from "../src/models/Unit.js";
import { createWasteService } from "../src/services/wasteService.js";
import { getWastes, exportWastes } from "../src/controllers/wasteController.js";

const id = () => new mongoose.Types.ObjectId().toString();
const shopId = id();
const users = [
  { _id: id(), role: "shop_keeper", shopId },
  { _id: id(), role: "admin" },
];
const payload = (wasteDate) => ({
  shopId, wasteDate, reason: "Spoiled",
  items: [{ productId: id(), unitId: id(), quantity: 1 }],
});

const mockCreation = (t) => {
  const session = { withTransaction: async (fn) => fn(), endSession: t.mock.fn() };
  const startSession = t.mock.method(mongoose, "startSession", async () => session);
  for (const model of [Shop, Product, Unit]) {
    t.mock.method(model, "exists", () => ({ session: async () => ({ _id: id() }) }));
  }
  t.mock.method(Waste, "create", async ([data]) => [{ ...data, _id: id() }]);
  t.mock.method(WasteItem, "create", async (items) => items);
  return startSession;
};

test("both roles can record today and each of the previous three UAE calendar days", async (t) => {
  // UAE is already September 16 while the UTC date is still September 15.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-16T00:05:00+04:00") });
  const startSession = mockCreation(t);
  const dates = [
    "2026-09-13T00:00:00+04:00",
    "2026-09-13",
    "2026-09-14T12:00:00+04:00",
    "2026-09-15T12:00:00+04:00",
    "2026-09-16T00:00:00+04:00",
    "2026-09-16T23:59:59.999+04:00",
  ];
  for (const user of users) {
    for (const date of dates) {
      const result = await createWasteService(user, payload(date));
      assert.equal(result.waste.wasteDate.toISOString(), new Date(date).toISOString());
    }
  }
  assert.equal(startSession.mock.callCount(), dates.length * users.length);
});

test("both roles are blocked before database access for dates outside the four-day window", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-16T00:05:00+04:00") });
  const startSession = t.mock.method(mongoose, "startSession", () => {
    throw new Error("Unexpected database access");
  });
  for (const user of users) {
    for (const date of [
      "2026-09-12T23:59:59.999+04:00",
      "2026-09-11T12:00:00+04:00",
      "2025-09-16T12:00:00+04:00",
      "2026-09-17T00:00:00+04:00",
      "2026-09-16T20:00:00Z",
    ]) {
      await assert.rejects(createWasteService(user, payload(date)), {
        statusCode: 400,
        message: "Wastage date must be today or one of the previous 3 days (Asia/Dubai)",
      });
    }
  }
  assert.equal(startSession.mock.callCount(), 0);
});

test("recording window crosses year and leap-month boundaries by calendar date", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 0 });
  const startSession = mockCreation(t);
  for (const scenario of [
    { now: "2027-01-02T00:15:00+04:00", first: "2026-12-30T00:00:00+04:00", outside: "2026-12-29T23:59:59.999+04:00" },
    { now: "2028-03-02T23:45:00+04:00", first: "2028-02-28T00:00:00+04:00", outside: "2028-02-27T23:59:59.999+04:00" },
  ]) {
    t.mock.timers.setTime(new Date(scenario.now).getTime());
    const result = await createWasteService(users[0], payload(scenario.first));
    assert.equal(result.waste.wasteDate.toISOString(), new Date(scenario.first).toISOString());
    await assert.rejects(createWasteService(users[0], payload(scenario.outside)), { statusCode: 400 });
  }
  assert.equal(startSession.mock.callCount(), 2);
});

test("the recording window advances at Dubai midnight, not Pakistan midnight", async (t) => {
  // Dubai is still September 15 while Pakistan has already reached September 16.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-15T19:59:59.999Z") });
  const startSession = mockCreation(t);
  for (const user of users) {
    await createWasteService(user, payload("2026-09-12T12:00:00+04:00"));
    await assert.rejects(createWasteService(user, payload("2026-09-16T12:00:00+04:00")), { statusCode: 400 });
  }

  t.mock.timers.setTime(new Date("2026-09-15T20:00:00Z").getTime());
  for (const user of users) {
    await assert.rejects(createWasteService(user, payload("2026-09-12T12:00:00+04:00")), { statusCode: 400 });
    await createWasteService(user, payload("2026-09-16T12:00:00+04:00"));
  }
  assert.equal(startSession.mock.callCount(), users.length * 2);
});

test("omitting wasteDate defaults to the current server time on today's UAE date", async (t) => {
  const now = new Date("2026-09-16T00:05:00+04:00");
  t.mock.timers.enable({ apis: ["Date"], now });
  mockCreation(t);
  const body = payload();
  delete body.wasteDate;
  const result = await createWasteService(users[0], body);
  assert.equal(result.waste.wasteDate.toISOString(), now.toISOString());
});

test("history and Excel export still accept older date filters", async (t) => {
  const count = t.mock.method(Waste, "countDocuments", async (query) => {
    assert.equal(query.wasteDate.$gte.toISOString(), "2020-01-01T00:00:00.000Z");
    assert.equal(query.wasteDate.$lte.toISOString(), "2020-01-31T23:59:59.999Z");
    return 0;
  });
  t.mock.method(Waste, "find", () => {
    const chain = { sort: () => chain, skip: () => chain, limit: () => chain, populate: () => chain, lean: async () => [] };
    return chain;
  });
  t.mock.method(WasteItem, "find", () => {
    const chain = { populate: () => chain, lean: async () => [] };
    return chain;
  });
  const req = { user: users[0], query: { startDate: "2020-01-01", endDate: "2020-01-31" } };
  for (const handler of [getWastes, exportWastes]) {
    await new Promise((resolve, reject) => handler(req, { json: resolve, send: resolve, setHeader() {} }, reject));
  }
  assert.equal(count.mock.callCount(), 2);
});
