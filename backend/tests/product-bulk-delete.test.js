import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import Product from "../src/models/Product.js";
import User from "../src/models/User.js";
import { deleteProductsBulk } from "../src/controllers/productController.js";

const firstId = "abcdef0123456789abcdef01";
const secondId = "abcdef0123456789abcdef02";
const unrelatedId = "abcdef0123456789abcdef03";
const productIds = (count) => Array.from({ length: count }, (_, index) =>
  (index + 1).toString(16).padStart(24, "0"));

async function invoke(body) {
  const response = {};
  await deleteProductsBulk({ body }, {
    status(value) { response.status = value; return this; },
    json(value) { response.body = value; return this; },
  });
  return response;
}

test("bulk deletion rejects missing, empty and malformed selections before any write", async (t) => {
  const write = t.mock.method(Product.collection, "deleteMany", async () => {
    throw new Error("Invalid selections must never reach the database");
  });

  for (const body of [
    undefined, null, {}, { productIds: [] }, { productIds: firstId },
    { productIds: { $ne: null } },
    ...[null, 42, {}, { $ne: null }, [], "", "invalid", "g".repeat(24),
      "a".repeat(23), "a".repeat(25), ` ${firstId}`]
      .map((invalidId) => ({ productIds: [firstId, invalidId] })),
  ]) {
    const response = await invoke(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.success, false);
  }
  assert.equal(write.mock.callCount(), 0);
});

test("bulk deletion deduplicates IDs and deletes only the selected existing products", async (t) => {
  const storedIds = new Set([firstId, unrelatedId]);
  const write = t.mock.method(Product.collection, "deleteMany", async (filter) => {
    // Keep the real Mongoose query so this also verifies ObjectId casting.
    assert.deepEqual(Object.keys(filter), ["_id"]);
    assert.deepEqual(Object.keys(filter._id), ["$in"]);
    assert.ok(filter._id.$in.every((id) => id instanceof mongoose.Types.ObjectId));
    assert.deepEqual(filter._id.$in.map(String), [firstId, secondId]);
    const deletedCount = filter._id.$in.filter((id) => storedIds.delete(String(id))).length;
    return { acknowledged: true, deletedCount };
  });

  const response = await invoke({
    productIds: [firstId, firstId.toUpperCase(), secondId, firstId],
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: "1 product deleted successfully",
    data: { requestedCount: 2, deletedCount: 1 },
  });
  assert.equal(write.mock.callCount(), 1);
  assert.deepEqual([...storedIds], [unrelatedId]);
});

test("bulk deletion reports zero when selected products were already removed", async (t) => {
  t.mock.method(Product.collection, "deleteMany", async () => ({
    acknowledged: true, deletedCount: 0,
  }));
  const response = await invoke({ productIds: [firstId] });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, { requestedCount: 1, deletedCount: 0 });
});

test("bulk deletion rejects more than 10,000 unique products without writing", async (t) => {
  const write = t.mock.method(Product.collection, "deleteMany", async () => {
    throw new Error("Oversized selections must never reach the database");
  });
  const response = await invoke({ productIds: productIds(10001) });
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(write.mock.callCount(), 0);
});

test("bulk deletion reports a database failure without claiming success", async (t) => {
  t.mock.method(Product.collection, "deleteMany", async () => {
    throw new Error("Database unavailable");
  });
  const response = await invoke({ productIds: [firstId, secondId] });
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Products could not be deleted");
  assert.equal(response.body.data, undefined);
});

test("DELETE /api/products/bulk enforces admin authorization and accepts 10,000 IDs", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "product-bulk-delete-test-secret";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const users = {
    admin: { role: "admin", isActive: true },
    keeper: { role: "shop_keeper", isActive: true },
    inactive: { role: "admin", isActive: false },
  };
  t.mock.method(User, "findById", (id) => ({ select: async () => users[id] || null }));
  const write = t.mock.method(Product.collection, "deleteMany", async (filter) => ({
    acknowledged: true, deletedCount: filter._id.$in.length,
  }));

  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close((error) =>
    error ? reject(error) : resolve())));
  await once(server, "listening");
  const endpoint = `http://127.0.0.1:${server.address().port}/api/products/bulk`;
  const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1m" });
  async function request(token, ids = [firstId, secondId]) {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ productIds: ids }),
    });
    return { status: response.status, body: await response.json() };
  }

  for (const [token, expectedStatus] of [
    [undefined, 401], ["invalid-token", 401],
    [tokenFor("keeper"), 403], [tokenFor("inactive"), 401],
    [tokenFor("missing"), 401],
  ]) {
    const response = await request(token);
    assert.equal(response.status, expectedStatus);
    assert.equal(response.body.success, false);
  }
  assert.equal(write.mock.callCount(), 0);

  const malformed = await request(tokenFor("admin"), [firstId, "invalid"]);
  assert.equal(malformed.status, 400);
  assert.equal(write.mock.callCount(), 0);

  // This JSON payload exceeds Express's usual 100 KB body limit.
  const response = await request(tokenFor("admin"), productIds(10000));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, { requestedCount: 10000, deletedCount: 10000 });
  assert.equal(write.mock.callCount(), 1);
  assert.equal(write.mock.calls[0].arguments[0]._id.$in.length, 10000);
});
