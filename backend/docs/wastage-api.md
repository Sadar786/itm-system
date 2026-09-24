# Wastage API

All routes require a Bearer token for an admin or shop_keeper.
Wastage records are independent of stock and transfers.

## Create: POST /api/wastes

```json
{
  "shopId": "<branch ObjectId>",
  "wasteDate": "2026-09-15T10:00:00+04:00",
  "reason": "Spoiled",
  "remarks": "Optional notes",
  "items": [
    { "productId": "<product ObjectId>", "unitId": "<unit ObjectId>", "quantity": 20 }
  ]
}
```

Shopkeepers may omit shopId: their assigned branch is used. Admins must supply it.
wasteDate defaults to now. reason and 1–100 items are required. Products must be
unique within one record; quantities must be finite and at least 0.000001.
For both admins and shopkeepers, wasteDate must fall on today or one of the
previous three calendar days in Asia/Dubai (UAE time). Future dates and
dates four or more days ago return 400 before opening a database transaction.
This limit applies to recording wastage only; history and export date filters
can still include older records.
The branch and products must exist and be active, and units must exist.
The server generates wasteNo and takes createdBy from the authenticated user.
Returns 201 with `{ success, message, data: { waste, items } }`.

## History: GET /api/wastes

Optional parameters: shopId, productId, startDate, endDate, page (default 1),
limit (default 20, maximum 100). Date-only endDate includes the whole UTC day;
use timestamps with timezone offsets for precise local date boundaries.
Returns `{ success, data: [{ ...waste, items }], pagination: { total, page, limit, pages } }`.
Branch, creator, product and unit references are populated with display fields.
Shopkeepers always receive only their assigned branch; admins can view all branches.

## Details: GET /api/wastes/:id

Returns `{ success, data: { waste, items } }` with populated display fields.
Missing records and records outside a shopkeeper's branch return 404.

## Storage and compatibility

Creation uses a MongoDB transaction, requiring a replica set or sharded deployment
(as with the existing transfer transaction). Header and items commit together.
The incomplete `/api/waste_items` routes are no longer mounted: their unscoped
reads and direct item writes would bypass branch access and record validation.
Use `/api/wastes` for complete records.

## Status and deletion (admin only)

Records default to `pending`, including older records without a stored status.
`PATCH /api/wastes/:id/status` accepts `{ "status": "approved" }` with allowed
values `approved` and `cancelled`. Only admins may change pending records;
approved and cancelled statuses are final (further changes return 409).
`GET /api/wastes/export` exports only approved records within the selected filters.
`DELETE /api/wastes/:id` deletes the record and its items in one transaction.
Both endpoints return 404 for missing records and 403 for shopkeepers.
Neither operation changes inventory.

`DELETE /api/wastes/bulk` accepts `{ "wasteIds": ["<wastage ObjectId>"] }`.
Only admins may delete selections. Supply at least one ID and no more than 10,000
unique IDs; malformed selections return 400 before any database access. IDs are
validated and deduplicated without case sensitivity. Selected records and all
associated items are deleted together in one transaction without changing stock.
Missing or already deleted records are skipped. Returns 200 with
`{ success, message, data: { requestedCount, deletedCount } }`, where requestedCount
is the number of unique selected IDs and deletedCount counts removed records.
The bulk endpoint accepts JSON bodies up to 512 KB.

Run focused checks with `node --test tests/waste.test.js tests/waste-date.test.js tests/waste-bulk-delete.test.js` from backend.
These use mocked database operations; live database rollback is not covered.
