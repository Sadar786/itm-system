# Wastage API

All routes require a Bearer token for an admin or shop_keeper.
Wastage records are independent of stock and transfers.

## Create: POST /api/wastes

```json
{
  "shopId": "<branch ObjectId>",
  "wasteDate": "2026-09-15T10:00:00+05:00",
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
Use `/api/wastes` for complete records. No edit/delete endpoints are exposed.

Run focused checks with `node --test tests/waste.test.js` from backend.
These use mocked database operations; live database rollback is not covered.
