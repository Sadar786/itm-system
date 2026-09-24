import test from "node:test";
import assert from "node:assert/strict";
import Product from "../src/models/Product.js";
import { getProducts } from "../src/controllers/productController.js";

const rows = Array.from({ length: 541 }, (_, index) => ({
  _id: String(index + 1).padStart(24, "0"),
  itemCode: `P${index + 1}`,
  description: index < 521 ? "Tea" : "Coffee",
  createdAt: new Date("2026-01-01T00:00:00Z"),
}));

function mockProducts(t, documents = rows) {
  const matching = (query) => documents.filter((row) => !query.$or || query.$or.some((condition) =>
    Object.entries(condition).some(([key, value]) => new RegExp(value.$regex, value.$options).test(row[key]))));
  t.mock.method(Product, "countDocuments", async (query) => matching(query).length);
  return t.mock.method(Product, "find", (query) => {
    let start = 0;
    let sorted = matching(query);
    return {
      populate() { return this; },
      sort(order) {
        assert.deepEqual(order, { createdAt: -1, _id: -1 }, "Imports can share timestamps; IDs must break ties");
        sorted = [...sorted].sort((a, b) => b._id.localeCompare(a._id));
        return this;
      },
      skip(value) { start = value; return this; },
      limit(value) { return Promise.resolve(sorted.slice(start, start + value)); },
    };
  });
}

async function load(query) {
  const response = {};
  await getProducts({ query }, {
    status(value) { response.status = value; return this; },
    json(value) { response.body = value; return this; },
  });
  return response;
}

test("pages cover the full product catalog beyond 500 without duplicates", async (t) => {
  mockProducts(t);
  const ids = [];
  for (let page = 1; page <= 28; page++) {
    const response = await load({ page: String(page), limit: "20" });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.pagination, { page, total: 541, pages: 28, limit: 20 });
    ids.push(...response.body.data.map((product) => product._id));
  }
  assert.equal(ids.length, 541);
  assert.equal(new Set(ids).size, 541);
  assert.equal(ids[500], rows[40]._id);
});

test("search pages include results past 500 and clamp after deleting the last page", async (t) => {
  mockProducts(t);
  const search = await load({ search: "Tea", page: "26", limit: "20" });
  assert.equal(search.body.pagination.total, 521);
  assert.equal(search.body.data.length, 20);
  assert.ok(search.body.data.every((product) => product.description === "Tea"));

  const lastPage = await load({ search: "Coffee", page: "28", limit: "20" });
  assert.deepEqual(lastPage.body.pagination, { total: 20, page: 1, pages: 1, limit: 20 });
  assert.equal(lastPage.body.data.length, 20);
});

test("empty catalogs return page one with zero products", async (t) => {
  mockProducts(t, []);
  const response = await load({ page: "28", limit: "20" });
  assert.deepEqual(response.body.pagination, { total: 0, page: 1, pages: 0, limit: 20 });
  assert.deepEqual(response.body.data, []);
});

test("invalid page sizes and page numbers are rejected before querying products", async (t) => {
  const find = mockProducts(t);
  for (const query of [{ page: "0" }, { page: "-1" }, { page: "1.5" }, { page: "invalid" }, { limit: "0" }, { limit: "-20" }, { limit: "Infinity" }, { limit: "1.5" }]) {
    assert.equal((await load(query)).status, 400);
  }
  assert.equal(find.mock.callCount(), 0);
});
