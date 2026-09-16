import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Waste from "../src/models/Waste.js";
import WasteItem from "../src/models/WasteItem.js";
import Shop from "../src/models/Shop.js";
import Product from "../src/models/Product.js";
import Unit from "../src/models/Unit.js";
import { createWasteService, resolveWasteShop } from "../src/services/wasteService.js";
import { getWaste, getWastes, updateWasteStatus, deleteWaste, exportWastes } from "../src/controllers/wasteController.js";
import wasteRoutes from "../src/routes/wasteRoutes.js";

const id = () => new mongoose.Types.ObjectId().toString();
const user = { _id: id(), role: "shop_keeper", shopId: id() };
const payload = () => ({ reason: "Spoiled", items: [{ productId: id(), unitId: id(), quantity: 20 }] });
const invoke = (handler, req) => new Promise((resolve, reject) => {
  handler(req, { json: resolve }, reject);
});

test("status and deletion routes reject shopkeepers and allow admins", () => {
  for (const path of ["/:id/status", "/:id"]) {
    const route = wasteRoutes.stack.find((layer) => layer.route?.path === path && (layer.route.methods.patch || layer.route.methods.delete)).route;
    const authorize = route.stack[0].handle;
    let allowed = false;
    const res = { status(code) { assert.equal(code, 403); return this; }, json(body) { assert.equal(body.success, false); } };
    authorize({ user }, res, () => { allowed = true; });
    assert.equal(allowed, false);
    authorize({ user: { role: "admin" } }, res, () => { allowed = true; });
    assert.equal(allowed, true);
  }
});

test("status updates validate input and return missing-record errors", async (t) => {
  const update = t.mock.method(Waste, "findOneAndUpdate", async (query, change) => {
    assert.deepEqual(query.$or, [{ status: "pending" }, { status: { $exists: false } }]);
    return { _id: query._id, ...change.$set };
  });
  const exists = t.mock.method(Waste, "exists", async () => null);
  const req = { params: { id: id() }, body: { status: "approved" } };
  assert.equal((await invoke(updateWasteStatus, req)).data.status, "approved");
  for (const status of [undefined, "pending", "delivered", { $ne: null }]) {
    await assert.rejects(invoke(updateWasteStatus, { ...req, body: { status } }), { statusCode: 400 });
  }
  assert.equal(update.mock.callCount(), 1);
  update.mock.mockImplementation(async () => null);
  await assert.rejects(invoke(updateWasteStatus, req), { statusCode: 404 });
  exists.mock.mockImplementation(async () => ({ _id: req.params.id }));
  for (const status of ["approved", "cancelled"]) {
    await assert.rejects(invoke(updateWasteStatus, { ...req, body: { status } }), { statusCode: 409 });
  }
});

test("Excel export requires approved status even when the request asks for cancelled", async (t) => {
  const records = ["pending", "approved", "cancelled"].map((status) => ({ _id: id(), wasteNo: status, status }));
  t.mock.method(Waste, "countDocuments", async (query) => {
    assert.equal(query.status, "approved");
    assert.equal(query.shopId, user.shopId);
    return 1;
  });
  t.mock.method(Waste, "find", (query) => {
    assert.equal(query.status, "approved");
    const chain = { sort: () => chain, skip: () => chain, limit: () => chain, populate: () => chain,
      lean: async () => records.filter((record) => record.status === query.status) };
    return chain;
  });
  t.mock.method(WasteItem, "find", () => {
    const chain = { populate: () => chain, lean: async () => [] };
    return chain;
  });
  const buffer = await new Promise((resolve, reject) => {
    exportWastes({ user, query: { status: "cancelled" } }, { setHeader() {}, send: resolve }, reject);
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Wastage");
  assert.equal(sheet.rowCount, 2);
  assert.equal(sheet.getCell("A2").value, "approved");
});

test("deletion shares a transaction for header and items and closes it on failure", async (t) => {
  const session = { withTransaction: async (fn) => fn(), endSession: t.mock.fn() };
  t.mock.method(mongoose, "startSession", async () => session);
  const wasteId = id();
  t.mock.method(Waste, "findOneAndDelete", async (query, options) => {
    assert.equal(query._id, wasteId);
    assert.equal(options.session, session);
    return { _id: wasteId };
  });
  const removeItems = t.mock.method(WasteItem, "deleteMany", async (query, options) => {
    assert.equal(query.wasteId, wasteId);
    assert.equal(options.session, session);
  });
  const req = { params: { id: wasteId } };
  assert.equal((await invoke(deleteWaste, req)).success, true);
  removeItems.mock.mockImplementation(async () => { throw new Error("Delete failed"); });
  await assert.rejects(invoke(deleteWaste, req), /Delete failed/);
  assert.equal(session.endSession.mock.callCount(), 2);
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
