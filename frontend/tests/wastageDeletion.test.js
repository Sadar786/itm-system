import test from "node:test";
import assert from "node:assert/strict";
import { API_BASE_URL, deleteWastesBulk } from "../src/services/api.js";

const wasteIds = ["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"];

test("bulk wastage deletion sends only selected record IDs with admin authentication", async (t) => {
  const result = { success: true, message: "2 wastage records deleted successfully", data: { requestedCount: 2, deletedCount: 2 } };
  const request = t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => result }));
  assert.deepEqual(await deleteWastesBulk({ token: "admin-token", wasteIds }), result);
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  assert.equal(url, API_BASE_URL + "/wastes/bulk");
  assert.equal(options.method, "DELETE");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body), { wasteIds });
});

test("bulk wastage deletion reports the backend count when records were already removed", async (t) => {
  const result = { success: true, message: "1 wastage record deleted successfully", data: { requestedCount: 2, deletedCount: 1 } };
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => result }));
  assert.deepEqual(await deleteWastesBulk({ token: "admin-token", wasteIds }), result);
});

test("bulk wastage deletion exposes server validation, authorization and transaction failures", async (t) => {
  let message;
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, json: async () => ({ success: false, message }) }));
  for (message of ["Invalid waste id", "Access denied", "Unable to delete wastage"]) {
    await assert.rejects(deleteWastesBulk({ token: "admin-token", wasteIds }), { message });
  }
});

test("bulk wastage deletion propagates network failures without claiming success", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
  await assert.rejects(deleteWastesBulk({ token: "admin-token", wasteIds }), { message: "Network unavailable" });
});
