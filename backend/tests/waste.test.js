import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Waste from "../src/models/Waste.js";
import WasteItem from "../src/models/WasteItem.js";
import Shop from "../src/models/Shop.js";
import Product from "../src/models/Product.js";
import Unit from "../src/models/Unit.js";
import { createWasteService, resolveWasteShop } from "../src/services/wasteService.js";
import { getWaste, getWastes } from "../src/controllers/wasteController.js";

const id = () => new mongoose.Types.ObjectId().toString();
const user = { _id: id(), role: "shop_keeper", shopId: id() };
const payload = () => ({ reason: "Spoiled", items: [{ productId: id(), unitId: id(), quantity: 20 }] });
const invoke = (handler, req) => new Promise((resolve, reject) => {
  handler(req, { json: resolve }, reject);
});

test("branch access uses assigned shop and rejects cross-branch requests", () => {
  assert.equal(resolveWasteShop(user), user.shopId);
  assert.throws(() => resolveWasteShop(user, id()), { statusCode: 403 });
  assert.throws(() => resolveWasteShop({ ...user, shopId: null }), { statusCode: 403 });
  assert.equal(resolveWasteShop({ role: "admin" }), undefined);
  assert.throws(() => resolveWasteShop({ role: "admin" }, undefined, true), { statusCode: 400 });
});

test("invalid submissions fail before opening a database session", async (t) => {
  const session = t.mock.method(mongoose, "startSession", () => { throw new Error("Unexpected database access"); });
  for (const quantity of [0, -1, Infinity, true, null, "bad"]) {
    const body = payload();
    body.items[0].quantity = quantity;
    await assert.rejects(createWasteService(user, body), { statusCode: 400 });
  }
  const duplicate = payload();
  duplicate.items.push({ ...duplicate.items[0] });
  for (const body of [duplicate, { ...payload(), reason: " " }, { ...payload(), wasteDate: "bad" }, { ...payload(), items: [] }]) {
    await assert.rejects(createWasteService(user, body), { statusCode: 400 });
  }
  assert.equal(session.mock.callCount(), 0);
});

test("creation passes the same transaction to header and items and uses authenticated creator", async (t) => {
  const session = { withTransaction: async (fn) => fn(), endSession: t.mock.fn() };
  t.mock.method(mongoose, "startSession", async () => session);
  for (const model of [Shop, Product, Unit]) {
    t.mock.method(model, "exists", () => ({ session: async (value) => { assert.equal(value, session); return { _id: id() }; } }));
  }
  const wasteId = id();
  t.mock.method(Waste, "create", async ([data], options) => {
    assert.equal(options.session, session);
    assert.equal(data.createdBy, user._id);
    assert.equal(data.shopId, user.shopId);
    assert.match(data.wasteNo, /^WST-/);
    return [{ ...data, _id: wasteId }];
  });
  const itemsMock = t.mock.method(WasteItem, "create", async (items, options) => {
    assert.equal(options.session, session);
    assert.equal(items[0].wasteId, wasteId);
    return items;
  });
  const result = await createWasteService(user, { ...payload(), createdBy: id() });
  assert.equal(result.items[0].quantity, 20);
  assert.equal(session.endSession.mock.callCount(), 1);
  itemsMock.mock.mockImplementation(async () => { throw new Error("Item write failed"); });
  await assert.rejects(createWasteService(user, payload()), /Item write failed/);
  assert.equal(session.endSession.mock.callCount(), 2);
});

test("detail lookup includes branch restriction and hides other branch records", async (t) => {
  t.mock.method(Waste, "findOne", (query) => {
    assert.equal(query.shopId, user.shopId);
    const chain = { populate: () => chain, then: (resolve) => Promise.resolve(null).then(resolve) };
    return chain;
  });
  await assert.rejects(invoke(getWaste, { user, params: { id: id() } }), { statusCode: 404 });
});

test("history applies branch scope and pagination", async (t) => {
  t.mock.method(Waste, "countDocuments", async (query) => { assert.equal(query.shopId, user.shopId); return 0; });
  t.mock.method(Waste, "find", (query) => {
    assert.equal(query.shopId, user.shopId);
    const chain = { sort: () => chain, skip: () => chain, limit: () => chain, populate: () => chain, lean: async () => [] };
    return chain;
  });
  t.mock.method(WasteItem, "find", () => {
    const chain = { populate: () => chain, lean: async () => [] };
    return chain;
  });
  const result = await invoke(getWastes, { user, query: {} });
  assert.deepEqual(result.data, []);
  assert.equal(result.pagination.limit, 20);
  await assert.rejects(invoke(getWastes, { user, query: { shopId: id() } }), { statusCode: 403 });
  await assert.rejects(invoke(getWastes, { user, query: { limit: 101 } }), { statusCode: 400 });
});
