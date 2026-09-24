import test from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import catalogReducer, {
  deleteCatalogProduct,
  deleteCatalogProducts,
  fetchCatalogProducts,
  searchCatalogProducts,
} from "../src/features/catalog/catalogSlice.js";
import { API_BASE_URL } from "../src/services/api.js";

const products = [
  { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", description: "Tea" },
  { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", description: "Coffee" },
  { _id: "cccccccccccccccccccccccc", description: "Milk" },
];

function makeStore() {
  let catalog = catalogReducer(undefined, fetchCatalogProducts.fulfilled(products, "load"));
  catalog = catalogReducer(catalog, searchCatalogProducts.pending("search", "drink"));
  catalog = catalogReducer(catalog, searchCatalogProducts.fulfilled({
    products,
    pagination: { total: products.length, page: 1, pages: 1, limit: 20 },
  }, "search", "drink"));
  return configureStore({
    reducer: { catalog: catalogReducer, auth: (state = { token: "admin-token" }) => state },
    preloadedState: { catalog },
  });
}

test("bulk deletion sends selected IDs with authentication and removes only those products from both lists", async (t) => {
  const store = makeStore();
  const ids = [products[0]._id, products[2]._id];
  const response = { success: true, message: "2 products deleted successfully", data: { requestedCount: 2, deletedCount: 2 } };
  const request = t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => response }));

  assert.deepEqual(await store.dispatch(deleteCatalogProducts(ids)).unwrap(), response);

  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  assert.equal(url, `${API_BASE_URL}/products/bulk`);
  assert.equal(options.method, "DELETE");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body), { productIds: ids });
  assert.deepEqual(store.getState().catalog.products, [products[1]]);
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, [products[1]]);
  assert.equal(store.getState().catalog.adminProductSearch.query, "drink");
});

test("rejected bulk deletion retains products and exposes the server's error", async (t) => {
  const store = makeStore();
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, json: async () => ({ message: "Access denied" }) }));

  await assert.rejects(store.dispatch(deleteCatalogProducts([products[0]._id])).unwrap(), (error) => error === "Access denied");
  assert.deepEqual(store.getState().catalog.products, products);
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products);
});

test("network errors retain the selected products for retry", async (t) => {
  const store = makeStore();
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });

  await assert.rejects(store.dispatch(deleteCatalogProducts([products[0]._id])).unwrap(), (error) => error === "Network unavailable");
  assert.deepEqual(store.getState().catalog.products, products);
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products);
});

test("a failed refresh after deletion does not restore deleted products", async (t) => {
  const store = makeStore();
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    if (options.method === "DELETE") {
      return { ok: true, json: async () => ({ success: true, data: { deletedCount: 1 } }) };
    }
    throw new Error("Refresh unavailable");
  });

  await store.dispatch(deleteCatalogProducts([products[0]._id])).unwrap();
  await assert.rejects(store.dispatch(fetchCatalogProducts()).unwrap(), (error) => error === "Refresh unavailable");
  assert.deepEqual(store.getState().catalog.products, products.slice(1));
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products.slice(1));
});

test("already removed product IDs are cleared from cached lists even when the server deletes zero", async (t) => {
  const store = makeStore();
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ success: true, data: { deletedCount: 0 } }) }));

  const response = await store.dispatch(deleteCatalogProducts([products[0]._id])).unwrap();
  assert.equal(response.data.deletedCount, 0);
  assert.deepEqual(store.getState().catalog.products, products.slice(1));
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products.slice(1));
});

test("single-product deletion also removes the product from both lists", async (t) => {
  const store = makeStore();
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ success: true }) }));

  await store.dispatch(deleteCatalogProduct(products[0]._id)).unwrap();
  assert.deepEqual(store.getState().catalog.products, products.slice(1));
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products.slice(1));
});
