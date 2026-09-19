import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { WriteError } from "mongodb/lib/bulk/common.js";
import XLSX from "xlsx";
import Category from "../src/models/Category.js";
import Unit from "../src/models/Unit.js";
import Product from "../src/models/Product.js";
import { importProducts } from "../src/controllers/productController.js";
import { createProductsWorkbookBuffer } from "../src/services/excelService.js";

const unitId = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId();
const headers = ["Item Code", "Description", "Unit", "Category", "Minimum Stock", "Reorder Level", "Barcode", "Notes"];

function excelBuffer(rows, { bookType = "xlsx", editSheet } = {}) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  editSheet?.(worksheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  return XLSX.write(workbook, { type: "buffer", bookType });
}

function mockDatabase(t, existing = []) {
  const inserted = [];
  t.mock.method(Category, "find", async () => [{ _id: categoryId, name: "Grocery" }]);
  t.mock.method(Unit, "find", async () => [{ _id: unitId, name: "Piece", shortName: "pc" }]);
  t.mock.method(Product, "find", () => {
    let selected = existing;
    const query = {
      select(fields) {
        const keys = String(fields).split(/\s+/);
        selected = existing.map((product) => Object.fromEntries(
          Object.entries(product).filter(([key]) => keys.includes(key))
        ));
        return query;
      },
      lean: () => query,
      then: (resolve, reject) => Promise.resolve(selected).then(resolve, reject),
    };
    return query;
  });
  // Leave Product.insertMany intact: assertions below inspect documents after
  // Mongoose has applied the real schema's setters, casting and validation.
  const write = t.mock.method(Product.collection, "insertMany", async (documents) => {
    inserted.push(...documents);
    return {
      acknowledged: true,
      insertedCount: documents.length,
      insertedIds: Object.fromEntries(documents.map((document, index) => [index, document._id])),
    };
  });
  return { inserted, write };
}

async function importExcel(buffer) {
  let status;
  let body;
  await importProducts({ file: { buffer } }, {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  });
  return { status, body };
}

function assertSummary(result, summary) {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.success, true);
  for (const [key, value] of Object.entries(summary)) {
    assert.equal(result.body.summary[key], value, `Unexpected ${key}: ${JSON.stringify(result.body)}`);
  }
}

for (const bookType of ["xlsx", "xls"]) {
  test(`imports 5601 ${bookType} rows without changing descriptions or code associations`, async (t) => {
    const { inserted } = mockDatabase(t);
    const products = Array.from({ length: 5601 }, (_, index) => [
      `SKU-${String(index).padStart(6, "0")}`,
      `Product ${index}: Café & crème / 50% (500 g) – Batch aB\nLine ${index}`,
      index % 2 ? "Piece" : "pc",
    ]);
    const result = await importExcel(excelBuffer([headers, ...products], { bookType }));
    assertSummary(result, { totalRows: 5601, created: 5601, skipped: 0, failed: 0 });
    assert.equal(inserted.length, products.length);
    const storedByCode = new Map(inserted.map((product) => [product.itemCode, product]));
    assert.equal(storedByCode.size, products.length);
    for (const [itemCode, description] of products) {
      assert.equal(storedByCode.get(itemCode)?.description, description, itemCode);
    }
  });
}

test("keeps text codes and displayed leading zeros while reading stock as raw numbers", async (t) => {
  const { inserted } = mockDatabase(t);
  const buffer = excelBuffer([
    headers,
    ["000042", "Text code", "pc", "Grocery", 1234.5, 2000, "00000999"],
    [43, "Formatted numeric code", "pc", "", 2500, 3500, 123],
  ], { editSheet(sheet) {
    sheet.A3.z = "000000";
    sheet.G3.z = "00000000";
    for (const cell of ["E2", "F2", "E3", "F3"]) sheet[cell].z = "#,##0.00";
  } });
  const result = await importExcel(buffer);
  assertSummary(result, { totalRows: 2, created: 2, skipped: 0, failed: 0 });
  assert.deepEqual(inserted.map(({ itemCode, barcode, minimumStock, reorderLevel }) => ({ itemCode, barcode, minimumStock, reorderLevel })), [
    { itemCode: "000042", barcode: "00000999", minimumStock: 1234.5, reorderLevel: 2000 },
    { itemCode: "000043", barcode: "00000123", minimumStock: 2500, reorderLevel: 3500 },
  ]);
});

test("reports physical Excel row numbers after blank rows", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["GOOD", "Valid product", "pc"],
    [],
    ["BAD", "Unknown unit", "missing-unit"],
    [],
    ["GOOD", "Valid product", "pc"],
  ]));
  assertSummary(result, { totalRows: 3, created: 1, skipped: 1, failed: 1 });
  assert.equal(result.body.failed[0].row, 4);
  assert.equal(result.body.skipped[0].row, 6);
  assert.equal(inserted[0].itemCode, "GOOD");
});

for (const unitHeader of ["Unit", "UoM", "Default Unit"]) {
  test(`accepts ${unitHeader} and case/space/underscore variations in headers`, async (t) => {
    const { inserted } = mockDatabase(t);
    const result = await importExcel(excelBuffer([
      ["  iTeM_cOdE  ", "  dEsCrIpTiOn ", ` ${unitHeader.toUpperCase().replaceAll(" ", "_")} `, "minimum_stock", " REORDER   LEVEL "],
      ["item-01", "MiXeD case description", "pc", 4, 8],
    ]));
    assertSummary(result, { totalRows: 1, created: 1, skipped: 0, failed: 0 });
    assert.equal(inserted[0].itemCode, "ITEM-01");
    assert.equal(inserted[0].description, "MiXeD case description");
    assert.equal(inserted[0].minimumStock, 4);
    assert.equal(inserted[0].reorderLevel, 8);
  });
}

for (const duplicateHeaders of [
  ["Item Code", "Description", "Unit", "Description"],
  ["Item Code", "Description", "Unit", " description "],
  ["Item Code", "Description", "Unit", "Default Unit"],
]) {
  test(`rejects ambiguous headers before writing: ${duplicateHeaders.join(" / ")}`, async (t) => {
    const { write } = mockDatabase(t);
    const result = await importExcel(excelBuffer([duplicateHeaders, ["P1", "Expected", "pc", "Other"]]));
    assert.equal(result.status, 400, JSON.stringify(result.body));
    assert.equal(result.body.success, false);
    assert.match(result.body.message, /duplicate|ambiguous|multiple columns/i);
    assert.equal(write.mock.callCount(), 0);
  });
}

for (const missing of ["Item Code", "Description", "Unit"]) {
  test(`rejects a missing ${missing} header before writing`, async (t) => {
    const { write } = mockDatabase(t);
    const columns = ["Item Code", "Description", "Unit"].filter((header) => header !== missing);
    const result = await importExcel(excelBuffer([columns, columns.map((header) => ({ "Item Code": "P1", Description: "Description", Unit: "pc" })[header])]));
    assert.equal(result.status, 400, JSON.stringify(result.body));
    assert.equal(result.body.success, false);
    assert.match(result.body.message, /header|column/i);
    assert.equal(write.mock.callCount(), 0);
  });
}

test("skips an existing code with an explicit description mismatch and both descriptions", async (t) => {
  const { write } = mockDatabase(t, [{ itemCode: "EXISTING", description: "Original database description" }]);
  const result = await importExcel(excelBuffer([
    headers,
    ["existing", "Corrected Excel description", "pc"],
  ]));
  assertSummary(result, { totalRows: 1, created: 0, skipped: 1, failed: 0 });
  const skipped = result.body.skipped[0];
  assert.equal(skipped.row, 2);
  assert.equal(skipped.itemCode, "EXISTING");
  assert.equal(skipped.excelDescription, "Corrected Excel description");
  assert.equal(skipped.existingDescription, "Original database description");
  assert.match(skipped.reason, /description/i);
  assert.match(skipped.reason, /different|differ|mismatch|match/i);
  assert.equal(write.mock.callCount(), 0);
});

test("rejects every occurrence of a new code with conflicting descriptions", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["conflict", "First description", "pc"],
    ["UNIQUE", "Unrelated product", "pc"],
    ["CONFLICT", "Second description", "pc"],
    ["CONFLICT", "First description", "pc"],
  ]));
  assertSummary(result, { totalRows: 4, created: 1, skipped: 0, failed: 3 });
  assert.deepEqual(result.body.failed.map(({ row }) => row), [2, 4, 5]);
  for (const failure of result.body.failed) {
    assert.equal(failure.itemCode, "CONFLICT");
    assert.match(failure.reason, /description/i);
  }
  assert.deepEqual(inserted.map(({ itemCode }) => itemCode), ["UNIQUE"]);
});

test("imports the first valid identical duplicate and reports the remaining rows as skipped", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["same", "Same Description", "pc"],
    ["SAME", "Same Description", "pc"],
    [" SAME ", "Same Description", "pc"],
  ]));
  assertSummary(result, { totalRows: 3, created: 1, skipped: 2, failed: 0 });
  assert.deepEqual(result.body.skipped.map(({ row }) => row), [3, 4]);
  assert.equal(inserted[0].description, "Same Description");
});

for (const invalidField of ["category", "unit", "minimum stock"]) {
  test(`an invalid ${invalidField} does not consume the code of a later valid duplicate`, async (t) => {
    const { inserted } = mockDatabase(t);
    const invalidRow = ["RETRY", "Same Description", "pc", "Grocery", 0];
    invalidRow[{ category: 3, unit: 2, "minimum stock": 4 }[invalidField]] = invalidField === "minimum stock" ? -1 : "Unknown";
    const result = await importExcel(excelBuffer([
      headers,
      invalidRow,
      ["RETRY", "Same Description", "pc", "Grocery", 0],
    ]));
    assertSummary(result, { totalRows: 2, created: 1, skipped: 0, failed: 1 });
    assert.equal(result.body.failed[0].row, 2);
    assert.equal(inserted[0].itemCode, "RETRY");
  });
}

test("rejects Excel error cells in optional fields instead of silently creating a product", async (t) => {
  const { write } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["ERROR", "Description", "pc", "", 0, 0, "", "placeholder"],
  ], { editSheet(sheet) { sheet.H2 = { t: "e", v: 15, w: "#VALUE!" }; } }));
  assertSummary(result, { totalRows: 1, created: 0, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 2);
  assert.match(result.body.failed[0].reason, /error|#VALUE!/i);
  assert.equal(write.mock.callCount(), 0);
});

test("rejects a formula without a cached value instead of accepting a missing description", async (t) => {
  const { write } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["FORMULA", "placeholder", "pc"],
  ], { editSheet(sheet) { sheet.B2 = { t: "n", f: "1+1" }; } }));
  assertSummary(result, { totalRows: 1, created: 0, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 2);
  assert.equal(write.mock.callCount(), 0);
});

test("rejects a formula without a cached value in an optional field", async (t) => {
  const { write } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["FORMULA-NOTES", "Description", "pc", "", 0, 0, "", "placeholder"],
  ], { editSheet(sheet) { sheet.H2 = { t: "n", f: "1+1" }; } }));
  assertSummary(result, { totalRows: 1, created: 0, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 2);
  assert.match(result.body.failed[0].reason, /formula|cached|calculated/i);
  assert.equal(write.mock.callCount(), 0);
});

test("does not collapse distinct numeric codes displayed in scientific notation", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    [123451, "First product", "pc"],
    [123452, "Second product", "pc"],
  ], { editSheet(sheet) { sheet.A2.z = sheet.A3.z = "0.00E+00"; } }));
  assertSummary(result, { totalRows: 2, created: 2, skipped: 0, failed: 0 });
  assert.deepEqual(inserted.map(({ itemCode, description }) => ({ itemCode, description })), [
    { itemCode: "123451", description: "First product" },
    { itemCode: "123452", description: "Second product" },
  ]);
});

test("rejects unsafe numeric codes and accepts the same identifier stored as text", async (t) => {
  const { inserted } = mockDatabase(t);
  const code = "9007199254740992";
  const result = await importExcel(excelBuffer([
    headers,
    [Number(code), "Numeric identifier", "pc"],
    [code, "Text identifier", "pc"],
  ]));
  assertSummary(result, { totalRows: 2, created: 1, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 2);
  assert.match(result.body.failed[0].reason, /text|accurat|number/i);
  assert.equal(inserted[0].itemCode, code);
  assert.equal(inserted[0].description, "Text identifier");
});

test("reads headers starting at C4 and reports the original worksheet row numbers", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([], {
    editSheet(sheet) {
      XLSX.utils.sheet_add_aoa(sheet, [
        ["Item Code", "Description", "Default Unit"],
        ["OFFSET", "Product after shifted headers", "pc"],
        [],
        ["INVALID", "Invalid unit after blank row", "unknown"],
      ], { origin: "C4" });
      sheet["!ref"] = "C4:E7";
    },
  }));
  assertSummary(result, { totalRows: 2, created: 1, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 7);
  assert.equal(inserted[0].description, "Product after shifted headers");
});

test("imports a formula's saved description without changing its text", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    ["CACHED", "placeholder", "pc"],
  ], { editSheet(sheet) { sheet.B2 = { t: "s", f: '"Mixed"&" Description"', v: "Mixed Description" }; } }));
  assertSummary(result, { totalRows: 1, created: 1, skipped: 0, failed: 0 });
  assert.equal(inserted[0].description, "Mixed Description");
});

test("reports known partial database inserts and maps a concurrent duplicate to its Excel row", async (t) => {
  const { write } = mockDatabase(t);
  write.mock.mockImplementation(async () => {
    // The real driver exposes insertedCount through a getter without a setter.
    // Using its error type also catches attempts to mutate that read-only field.
    throw new mongoose.mongo.MongoBulkWriteError({
      message: "Duplicate key",
      code: 11000,
      writeErrors: [new WriteError({ index: 1, code: 11000, errmsg: "Duplicate item code" })],
    }, { insertedCount: 2 });
  });
  const result = await importExcel(excelBuffer([
    headers,
    ["FIRST", "First product", "pc"],
    [],
    ["RACE", "Concurrent product", "pc"],
    ["LAST", "Last product", "pc"],
  ]));
  assertSummary(result, { totalRows: 3, created: 2, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 4);
  assert.equal(result.body.failed[0].itemCode, "RACE");
  assert.match(result.body.failed[0].reason, /another import|duplicate/i);
});

test("preserves literal prefixes and separators in lossless numeric code formats", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    [123, "Prefixed identifier", "pc", "", 0, 0, 987],
    [124, "Separated identifier", "pc", "", 0, 0, 988],
  ], { editSheet(sheet) {
    sheet.A2.z = '"SKU-"000000';
    sheet.A3.z = "000-000";
    sheet.G2.z = '"BAR-"000000';
    sheet.G3.z = "000-000";
  } }));
  assertSummary(result, { totalRows: 2, created: 2, skipped: 0, failed: 0 });
  assert.deepEqual(inserted.map(({ itemCode, barcode }) => ({ itemCode, barcode })), [
    { itemCode: "SKU-000123", barcode: "BAR-000987" },
    { itemCode: "000-124", barcode: "000-988" },
  ]);
});

test("keeps distinct raw codes when a plain numeric display rounds both to the same value", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    [123.41, "First fractional identifier", "pc"],
    [123.42, "Second fractional identifier", "pc"],
  ], { editSheet(sheet) { sheet.A2.z = sheet.A3.z = "0.0"; } }));
  assertSummary(result, { totalRows: 2, created: 2, skipped: 0, failed: 0 });
  assert.deepEqual(inserted.map(({ itemCode }) => itemCode), ["123.41", "123.42"]);
});

test("fails a non-lossless custom code format while importing unrelated valid rows", async (t) => {
  const { inserted } = mockDatabase(t);
  const result = await importExcel(excelBuffer([
    headers,
    [123.4, "Lossy identifier", "pc"],
    ["VALID", "Valid identifier", "pc"],
  ], { editSheet(sheet) { sheet.A2.z = '"SKU-"000000'; } }));
  assertSummary(result, { totalRows: 2, created: 1, skipped: 0, failed: 1 });
  assert.equal(result.body.failed[0].row, 2);
  assert.match(result.body.failed[0].reason, /format|accurat|text/i);
  assert.deepEqual(inserted.map(({ itemCode }) => itemCode), ["VALID"]);
});

test("imports the application's exported workbook with every product field preserved", async (t) => {
  const { inserted } = mockDatabase(t);
  const original = {
    itemCode: "0000123",
    description: "Mixed café / 50% & crème\nSecond line",
    categoryId: { _id: categoryId, name: "Grocery" },
    defaultUnitId: { _id: unitId, name: "Piece", shortName: "pc" },
    barcode: "000009876543",
    isPerishable: true,
    minimumStock: 1234.5,
    reorderLevel: 2500,
    notes: "Keep Dry\nShelf A-2",
  };
  const buffer = await createProductsWorkbookBuffer({ products: [original] });
  const result = await importExcel(buffer);
  assertSummary(result, { totalRows: 1, created: 1, skipped: 0, failed: 0 });
  for (const field of ["itemCode", "description", "barcode", "isPerishable", "minimumStock", "reorderLevel", "notes"]) {
    assert.equal(inserted[0][field], original[field], field);
  }
  assert.equal(inserted[0].categoryId.toString(), categoryId.toString());
  assert.equal(inserted[0].defaultUnitId.toString(), unitId.toString());
});
