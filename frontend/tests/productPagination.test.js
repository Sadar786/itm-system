import test from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import catalogReducer, {
  clearAdminProductSearch,
  searchCatalogProducts,
} from "../src/features/catalog/catalogSlice.js";

const products = Array.from({ length: 541 }, (_, index) => ({
  _id: String(index + 1).padStart(24, "0"),
  itemCode: `P${index + 1}`,
}));
const makeStore = () => configureStore({
  reducer: { catalog: catalogReducer, auth: (state = { token: "admin-token" }) => state },
});
const responseFor = (page, rows = products) => ({
  ok: true,
  json: async () => ({
    data: rows.slice((page - 1) * 20, page * 20),
    pagination: { total: rows.length, page, pages: Math.ceil(rows.length / 20), limit: 20 },
  }),
});

test("product pages fetch beyond 500 and retain the backend total and final partial page", async (t) => {
  const store = makeStore();
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const params = new URL(url).searchParams;
    requests.push(Number(params.get("page")));
    assert.equal(params.get("limit"), "20");
    assert.equal(options.headers.Authorization, "Bearer admin-token");
    return responseFor(Number(params.get("page")));
  });

  for (const page of [1, 25, 26, 28, 1]) {
    await store.dispatch(searchCatalogProducts({ search: "", page })).unwrap();
    const list = store.getState().catalog.adminProductSearch;
    assert.deepEqual(list.results, products.slice((page - 1) * 20, page * 20));
    assert.deepEqual(list.pagination, { total: 541, page, pages: 28, limit: 20 });
  }
  assert.deepEqual(requests, [1, 25, 26, 28, 1]);
});

test("search is sent to the backend on every page and a new search starts at page one", async (t) => {
  const store = makeStore();
  const queries = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const params = new URL(url).searchParams;
    queries.push([params.get("search"), params.get("page")]);
    return responseFor(Number(params.get("page")));
  });

  await store.dispatch(searchCatalogProducts({ search: "tea & coffee", page: 26 })).unwrap();
  await store.dispatch(searchCatalogProducts({ search: "milk" })).unwrap();
  await store.dispatch(searchCatalogProducts({ search: "" })).unwrap();
  assert.deepEqual(queries, [["tea & coffee", "26"], ["milk", "1"], [null, "1"]]);
  assert.equal(store.getState().catalog.adminProductSearch.query, "");
});

test("failed Next leaves the previous page available and supports retry", async (t) => {
  const store = makeStore();
  let fail = false;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (fail) throw new Error("Network unavailable");
    return responseFor(Number(new URL(url).searchParams.get("page")));
  });
  await store.dispatch(searchCatalogProducts({ page: 25 })).unwrap();
  fail = true;
  await assert.rejects(store.dispatch(searchCatalogProducts({ page: 26 })).unwrap(), (error) => error === "Network unavailable");
  assert.equal(store.getState().catalog.adminProductSearch.pagination.page, 25);
  assert.equal(store.getState().catalog.adminProductSearch.requestedPage, 26);
  assert.deepEqual(store.getState().catalog.adminProductSearch.results, products.slice(480, 500));
  fail = false;
  await store.dispatch(searchCatalogProducts({ page: 26 })).unwrap();
  assert.equal(store.getState().catalog.adminProductSearch.results[0].itemCode, "P501");
});

test("late page responses cannot overwrite a newer search or repopulate a closed product view", async (t) => {
  const store = makeStore();
  let completeOldRequest;
  t.mock.method(globalThis, "fetch", (url) => {
    if (new URL(url).searchParams.get("page") === "26") {
      return new Promise((resolve) => { completeOldRequest = resolve; });
    }
    return Promise.resolve(responseFor(1, products.slice(0, 3)));
  });
  const oldRequest = store.dispatch(searchCatalogProducts({ search: "old", page: 26 }));
  await store.dispatch(searchCatalogProducts({ search: "new", page: 1 })).unwrap();
  completeOldRequest(responseFor(26));
  await oldRequest.unwrap();
  assert.equal(store.getState().catalog.adminProductSearch.query, "new");
  assert.equal(store.getState().catalog.adminProductSearch.results.length, 3);

  const closedRequest = store.dispatch(searchCatalogProducts({ page: 26 }));
  store.dispatch(clearAdminProductSearch());
  completeOldRequest(responseFor(26));
  await closedRequest.unwrap();
  assert.equal(store.getState().catalog.adminProductSearch.results.length, 0);
});
