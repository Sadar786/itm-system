import test from "node:test";
import assert from "node:assert/strict";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createSessionMiddleware, resetOnLogout } from "../src/app/sessionState.js";

const makeStore = () => configureStore({
  reducer: resetOnLogout(combineReducers({
    auth: (state = { token: "" }, action) => action.type === "auth/login/fulfilled" ? { token: action.payload } : state,
    catalog: (state = [], action) => action.type === "catalog/load/fulfilled" ? action.payload : state,
    admin: (state = []) => state,
  })),
  preloadedState: { auth: { token: "old-session" }, catalog: ["Private product"], admin: ["Private user"] },
  middleware: (defaults) => defaults().concat(createSessionMiddleware()),
});
const request = (prefix, status, requestId, payload) => ({
  type: `${prefix}/${status}`, payload, meta: { requestId, requestStatus: status },
});

test("logout resets all cached slices together", () => {
  const store = makeStore();
  store.dispatch({ type: "auth/logout" });
  assert.deepEqual(store.getState(), { auth: { token: "" }, catalog: [], admin: [] });
});

test("old requests cannot repopulate data after logout or a new login", () => {
  const store = makeStore();
  store.dispatch(request("catalog/load", "pending", "old"));
  store.dispatch({ type: "auth/logout" });
  store.dispatch(request("auth/login", "pending", "login"));
  store.dispatch(request("auth/login", "fulfilled", "login", "new-session"));
  store.dispatch(request("catalog/load", "pending", "new"));
  store.dispatch(request("catalog/load", "fulfilled", "new", ["New product"]));
  store.dispatch(request("catalog/load", "fulfilled", "old", ["Private product"]));
  assert.deepEqual(store.getState().catalog, ["New product"]);
  assert.equal(store.getState().auth.token, "new-session");
});

test("an in-flight authentication request cannot sign back in after logout", () => {
  const store = makeStore();
  store.dispatch(request("auth/login", "pending", "old-login"));
  store.dispatch({ type: "auth/logout" });
  store.dispatch(request("auth/login", "fulfilled", "old-login", "old-session"));
  assert.equal(store.getState().auth.token, "");
});
