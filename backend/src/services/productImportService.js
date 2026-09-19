import XLSX from "xlsx";

const fields = {
  itemCode: ["Item Code"],
  description: ["Description"],
  categoryName: ["Category"],
  unitName: ["Unit", "Default Unit", "UoM"],
  barcode: ["Barcode"],
  isPerishable: ["Perishable", "isPerishable"],
  minimumStock: ["Minimum Stock"],
  reorderLevel: ["Reorder Level"],
  notes: ["Notes"],
};

const normalizeHeader = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
const headerFields = new Map(
  Object.entries(fields).flatMap(([field, names]) =>
    names.map((name) => [normalizeHeader(name), field])
  )
);

const invalidFile = (message) => Object.assign(new Error(message), { statusCode: 400 });

const cellText = (cell, field) => {
  if (cell?.t !== "n") return String(cell?.v ?? "").trim();
  const displayed = XLSX.utils.format_cell(cell).trim();
  if (["itemCode", "barcode"].includes(field)) {
    // Scientific/rounded display formats must not collapse distinct codes.
    // Retain zero padding only when the display still represents the full value.
    if (/^[+-]?\d+(?:\.\d+)?E[+-]?\d+$/i.test(displayed)) return String(cell.v);
    const numericDisplay = displayed.replaceAll(",", "");
    if (/^[+-]?\d+(?:\.\d+)?$/.test(numericDisplay)) {
      return Number(numericDisplay) === cell.v ? displayed : String(cell.v);
    }
    // Preserve literal prefixes and separators such as SKU-000123 and 000-123
    // when all identifier digits are present in the displayed value.
    if (Number.isInteger(cell.v) && Number(displayed.replace(/\D/g, "")) === Math.abs(cell.v)) {
      return displayed;
    }
    throw new Error(`${fields[field][0]} uses a number format that cannot be read accurately. Store the full code as text in Excel and import again.`);
  }
  return displayed;
};

export const parseProductImport = (buffer) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", sheetStubs: true });
  } catch {
    throw invalidFile("Excel file could not be read. Save it as .xlsx or .xls and try again.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw invalidFile("Excel file does not contain a worksheet");
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet["!ref"]) throw invalidFile("Excel file contains no product rows");

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  const headerIndex = matrix.findIndex((row) => row.some((value) => String(value).trim()));
  if (headerIndex < 0) throw invalidFile("Excel file contains no product rows");

  // Resolve columns once; never choose between two columns for the same field.
  const columns = new Map();
  matrix[headerIndex].forEach((value, index) => {
    const field = headerFields.get(normalizeHeader(value));
    if (!field) return;
    if (columns.has(field)) {
      throw invalidFile(`Multiple columns match "${fields[field][0]}". Keep one column for this field.`);
    }
    columns.set(field, index + range.s.c);
  });
  const missing = ["itemCode", "description", "unitName"].filter((field) => !columns.has(field));
  if (missing.length) {
    throw invalidFile(`Missing required columns: ${missing.map((field) => fields[field][0]).join(", ")}. Use the first non-empty row for column headers.`);
  }

  const rows = [];
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const rowIndex = index + range.s.r;
    const cells = [...columns].map(([field, column]) => [
      field,
      worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })],
    ]);
    if (!cells.some(([, cell]) => cell && (cell.f || String(cell.v ?? "").trim()))) continue;

    const row = { rowNumber: rowIndex + 1 };
    for (const [field, cell] of cells) {
      if (cell?.t === "e") {
        row.error ||= `Excel error in ${fields[field][0]}. Correct this cell and import again.`;
      } else if (cell?.f && (cell.v == null || cell.t === "z")) {
        row.error ||= `Formula in ${fields[field][0]} has no saved result. Recalculate and save the workbook in Excel, then import again.`;
      }
      if (["itemCode", "barcode"].includes(field) && cell?.t === "n" &&
          Number.isInteger(cell.v) && !Number.isSafeInteger(cell.v)) {
        row.error ||= `${fields[field][0]} is too long to read accurately as a number. Store the original code as text in Excel and import again.`;
      }

      // Read each value from the same physical row. Keep displayed identifier
      // formatting (including leading zeros), but use raw numbers for stock.
      try {
        row[field] = ["minimumStock", "reorderLevel"].includes(field)
          ? Number(cell?.v || 0)
          : cellText(cell, field);
      } catch (error) {
        row.error ||= error.message;
        row[field] = "";
      }
    }

    row.itemCode = row.itemCode.toUpperCase();
    row.isPerishable = ["yes", "true", "1"].includes(String(row.isPerishable || "").toLowerCase());
    row.minimumStock ??= 0;
    row.reorderLevel ??= 0;
    row.categoryName ??= "";
    row.barcode ??= "";
    row.notes ??= "";
    rows.push(row);
  }

  if (!rows.length) throw invalidFile("Excel file contains no product rows");
  return { sheetName, rows };
};

export const findDescriptionConflicts = (rows) => {
  const groups = new Map();
  for (const row of rows) {
    if (!row.itemCode || !row.description || row.error) continue;
    const group = groups.get(row.itemCode) || { descriptions: new Set(), rowNumbers: [] };
    group.descriptions.add(row.description);
    group.rowNumbers.push(row.rowNumber);
    groups.set(row.itemCode, group);
  }
  return new Map([...groups]
    .filter(([, group]) => group.descriptions.size > 1)
    .map(([code, group]) => [code,
      `Conflicting descriptions for this item code in Excel rows ${group.rowNumbers.slice(0, 5).join(", ")}${group.rowNumbers.length > 5 ? ", ..." : ""}. Give each product a unique code or correct the descriptions.`
    ]));
};
