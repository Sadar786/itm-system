import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import Waste from "../src/models/Waste.js";
import WasteItem from "../src/models/WasteItem.js";
import Inventory from "../src/models/Inventory.js";
import User from "../src/models/User.js";
import { deleteWastesBulk } from "../src/controllers/wasteController.js";

const firstId = "abcdef0123456789abcdef01";
const secondId = "abcdef0123456789abcdef02";
const unrelatedId = "abcdef0123456789abcdef03";
const wasteIds = (count) => Array.from({ length: count }, (_, index) =>
  (index + 1).toString(16).padStart(24, "0"));
const invoke = (body) => new Promise((resolve, reject) => {
  deleteWastesBulk({ body }, { json: resolve }, reject);
});
class MockSession {}
const mockSession = (t) => {
  const session = Object.assign(new MockSession(), {
    withTransaction: t.mock.fn(async (callback) => callback()),
    endSession: t.mock.fn(async () => {}),
  });
  t.mock.method(mongoose, "startSession", async () => session);
  return session;
};

test("bulk wastage deletion validates the entire selection before database access", async (t) => {
  const start = t.mock.method(mongoose, "startSession", async () => {
    throw new Error("Invalid selections must never open a session");
  });
  const removeHeaders = t.mock.method(Waste.collection, "deleteMany", async () => {
    throw new Error("Invalid selections must never delete headers");
  });
  const removeItems = t.mock.method(WasteItem.collection, "deleteMany", async () => {
    throw new Error("Invalid selections must never delete items");
  });
  for (const body of [
    undefined, null, {}, { wasteIds: [] }, { wasteIds: firstId },
    { wasteIds: { $ne: null } },
    ...[null, 42, {}, { $ne: null }, [], "", "invalid", "g".repeat(24),
      "a".repeat(23), "a".repeat(25), ` ${firstId}`]
      .map((invalidId) => ({ wasteIds: [firstId, invalidId] })),
  ]) {
    await assert.rejects(invoke(body), { statusCode: 400 }, JSON.stringify(body));
  }
  assert.equal(start.mock.callCount(), 0);
  assert.equal(removeHeaders.mock.callCount(), 0);
  assert.equal(removeItems.mock.callCount(), 0);
});

test("bulk wastage deletion rejects more than 10,000 unique records before opening a session", async (t) => {
  const start = t.mock.method(mongoose, "startSession", async () => {
    throw new Error("Oversized selection must never open a session");
  });
  await assert.rejects(invoke({ wasteIds: wasteIds(10001) }), { statusCode: 400 });
  assert.equal(start.mock.callCount(), 0);
});

test("bulk wastage deletion deduplicates IDs and removes only selected headers and items in one transaction", async (t) => {
  const session = mockSession(t);
  const headers = new Set([firstId, unrelatedId]);
  const items = [
    { wasteId: firstId }, { wasteId: firstId }, { wasteId: unrelatedId },
  ];
  const writes = [];
  const inventoryWrites = ["updateOne", "updateMany", "findOneAndUpdate", "deleteMany", "insertOne"]
    .map((method) => t.mock.method(Inventory.collection, method, async () => {
      throw new Error("Wastage deletion must not change inventory");
    }));
  t.mock.method(Waste.collection, "deleteMany", async (filter, options) => {
    writes.push("headers");
    assert.equal(options.session, session);
    assert.deepEqual(Object.keys(filter), ["_id"]);
    assert.deepEqual(Object.keys(filter._id), ["$in"]);
    assert.ok(filter._id.$in.every((id) => id instanceof mongoose.Types.ObjectId));
    assert.deepEqual(filter._id.$in.map(String), [firstId, secondId]);
    return { acknowledged: true, deletedCount: filter._id.$in.filter((id) => headers.delete(String(id))).length };
  });
  t.mock.method(WasteItem.collection, "deleteMany", async (filter, options) => {
    writes.push("items");
    assert.equal(options.session, session);
    assert.deepEqual(Object.keys(filter), ["wasteId"]);
    assert.deepEqual(Object.keys(filter.wasteId), ["$in"]);
    assert.ok(filter.wasteId.$in.every((id) => id instanceof mongoose.Types.ObjectId));
    assert.deepEqual(filter.wasteId.$in.map(String), [firstId, secondId]);
    const ids = new Set(filter.wasteId.$in.map(String));
    let deletedCount = 0;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (ids.has(items[index].wasteId)) { items.splice(index, 1); deletedCount += 1; }
    }
    return { acknowledged: true, deletedCount };
  });
  const result = await invoke({ wasteIds: [firstId, firstId.toUpperCase(), secondId, firstId] });
  assert.deepEqual(result, {
    success: true,
    message: "1 wastage record deleted successfully",
    data: { requestedCount: 2, deletedCount: 1 },
  });
  assert.deepEqual(writes, ["headers", "items"]);
  assert.deepEqual([...headers], [unrelatedId]);
  assert.deepEqual(items, [{ wasteId: unrelatedId }]);
  assert.equal(session.withTransaction.mock.callCount(), 1);
  assert.equal(session.endSession.mock.callCount(), 1);
  inventoryWrites.forEach((write) => assert.equal(write.mock.callCount(), 0));
});

test("bulk wastage deletion succeeds when records were already removed", async (t) => {
  const session = mockSession(t);
  t.mock.method(Waste.collection, "deleteMany", async () => ({ acknowledged: true, deletedCount: 0 }));
  const removeItems = t.mock.method(WasteItem.collection, "deleteMany", async () => ({ acknowledged: true, deletedCount: 0 }));
  const result = await invoke({ wasteIds: [firstId, secondId] });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { requestedCount: 2, deletedCount: 0 });
  assert.equal(removeItems.mock.callCount(), 1);
  assert.equal(session.endSession.mock.callCount(), 1);
});

test("bulk wastage deletion forwards header, item and transaction failures and always closes its session", async (t) => {
  for (const stage of ["headers", "items", "commit"]) {
    await t.test(stage, async (subtest) => {
      const session = mockSession(subtest);
      const failure = new Error(`${stage} failed`);
      let committed = false;
      session.withTransaction.mock.mockImplementation(async (callback) => {
        const result = await callback();
        if (stage === "commit") throw failure;
        committed = true;
        return result;
      });
      subtest.mock.method(Waste.collection, "deleteMany", async () => {
        if (stage === "headers") throw failure;
        return { acknowledged: true, deletedCount: 2 };
      });
      const removeItems = subtest.mock.method(WasteItem.collection, "deleteMany", async () => {
        if (stage === "items") throw failure;
        return { acknowledged: true, deletedCount: 3 };
      });
      await assert.rejects(invoke({ wasteIds: [firstId, secondId] }), (error) => error === failure);
      assert.equal(committed, false);
      assert.equal(removeItems.mock.callCount(), stage === "headers" ? 0 : 1);
      assert.equal(session.endSession.mock.callCount(), 1);
    });
  }
});

test("bulk wastage deletion returns the committed count if the transaction callback is retried", async (t) => {
  const session = mockSession(t);
  session.withTransaction.mock.mockImplementation(async (callback) => {
    await callback();
    return callback();
  });
  let attempt = 0;
  t.mock.method(Waste.collection, "deleteMany", async () => ({
    acknowledged: true, deletedCount: ++attempt === 1 ? 2 : 1,
  }));
  t.mock.method(WasteItem.collection, "deleteMany", async () => ({ acknowledged: true, deletedCount: 1 }));
  const result = await invoke({ wasteIds: [firstId, secondId] });
  assert.deepEqual(result.data, { requestedCount: 2, deletedCount: 1 });
  assert.equal(session.endSession.mock.callCount(), 1);
});

test("bulk wastage deletion forwards session startup failure without deleting records", async (t) => {
  t.mock.method(mongoose, "startSession", async () => { throw new Error("Database unavailable"); });
  const removeHeaders = t.mock.method(Waste.collection, "deleteMany", async () => {});
  const removeItems = t.mock.method(WasteItem.collection, "deleteMany", async () => {});
  await assert.rejects(invoke({ wasteIds: [firstId] }), /Database unavailable/);
  assert.equal(removeHeaders.mock.callCount(), 0);
  assert.equal(removeItems.mock.callCount(), 0);
});

test("DELETE /api/wastes/bulk enforces admin authorization, route ordering and the maximum payload", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "waste-bulk-delete-test-secret";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const users = {
    admin: { role: "admin", isActive: true },
    keeper: { role: "shop_keeper", isActive: true },
    inactive: { role: "admin", isActive: false },
    other: { role: "other", isActive: true },
  };
  t.mock.method(User, "findById", (id) => ({ select: async () => users[id] || null }));
  const session = mockSession(t);
  const removeHeaders = t.mock.method(Waste.collection, "deleteMany", async (filter, options) => {
    assert.equal(options.session, session);
    return { acknowledged: true, deletedCount: filter._id.$in.length };
  });
  const removeItems = t.mock.method(WasteItem.collection, "deleteMany", async (filter, options) => {
    assert.equal(options.session, session);
    return { acknowledged: true, deletedCount: filter.wasteId.$in?.length || 1 };
  });
  const singleDelete = t.mock.method(Waste, "findOneAndDelete", async (filter, options) => {
    assert.equal(filter._id, firstId);
    assert.equal(options.session, session);
    return { _id: firstId };
  });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1m" });
  const request = async (token, body = { wasteIds: [firstId, secondId] }, path = "/api/wastes/bulk", method = "DELETE") => {
    const response = await fetch(baseUrl + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  for (const [token, expectedStatus] of [
    [undefined, 401], ["invalid-token", 401], [tokenFor("keeper"), 403],
    [tokenFor("inactive"), 401], [tokenFor("missing"), 401], [tokenFor("other"), 403],
  ]) {
    const response = await request(token);
    assert.equal(response.status, expectedStatus);
    assert.equal(response.body.success, false);
  }
  assert.equal(session.withTransaction.mock.callCount(), 0);
  const malformed = await request(tokenFor("admin"), { wasteIds: [firstId, "invalid"] });
  assert.equal(malformed.status, 400);
  assert.equal(session.withTransaction.mock.callCount(), 0);

  const maximumBody = { wasteIds: wasteIds(10000) };
  assert.ok(Buffer.byteLength(JSON.stringify(maximumBody)) > 100 * 1024);
  const maximum = await request(tokenFor("admin"), maximumBody);
  assert.equal(maximum.status, 200, JSON.stringify(maximum.body));
  assert.deepEqual(maximum.body.data, { requestedCount: 10000, deletedCount: 10000 });
  assert.equal(removeHeaders.mock.callCount(), 1);
  assert.equal(removeItems.mock.callCount(), 1);
  assert.equal(singleDelete.mock.callCount(), 0);
  assert.equal(session.endSession.mock.callCount(), 1);

  const oversized = await request(tokenFor("admin"), { ...maximumBody, padding: "x".repeat(512 * 1024) });
  assert.equal(oversized.status, 413);
  const ordinaryEndpoint = await request(tokenFor("admin"), maximumBody, "/api/wastes", "POST");
  assert.equal(ordinaryEndpoint.status, 413);
  assert.equal(session.withTransaction.mock.callCount(), 1);

  const single = await request(tokenFor("admin"), {}, `/api/wastes/${firstId}`);
  assert.equal(single.status, 200);
  assert.equal(single.body.success, true);
  assert.equal(singleDelete.mock.callCount(), 1);
  assert.equal(removeHeaders.mock.callCount(), 1);
});