import ExcelJS from "exceljs";

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export const createWorkbookBuffer = async ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventory System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns;
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = Math.max(column.width || 12, 12);
  });

  return workbook.xlsx.writeBuffer();
};

export const currentStockColumns = [
  { header: "Shop Code", key: "shopCode", width: 14 },
  { header: "Shop Name", key: "shopName", width: 24 },
  { header: "Item Code", key: "itemCode", width: 16 },
  { header: "Product", key: "product", width: 36 },
  { header: "Quantity", key: "quantity", width: 12 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Minimum Stock", key: "minimumStock", width: 16 },
  { header: "Reorder Level", key: "reorderLevel", width: 16 },
  { header: "Last Movement", key: "lastMovementAt", width: 16 },
];

export const movementColumns = [
  { header: "Movement No", key: "movementNo", width: 28 },
  { header: "Date", key: "movementDate", width: 16 },
  { header: "Shop Code", key: "shopCode", width: 14 },
  { header: "Shop Name", key: "shopName", width: 24 },
  { header: "Item Code", key: "itemCode", width: 16 },
  { header: "Product", key: "product", width: 36 },
  { header: "Type", key: "movementType", width: 16 },
  { header: "Quantity", key: "quantity", width: 12 },
  { header: "Effect", key: "quantityEffect", width: 12 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Reference Type", key: "referenceType", width: 18 },
  { header: "Reference ID", key: "referenceId", width: 28 },
  { header: "Created By", key: "createdBy", width: 24 },
  { header: "Remarks", key: "remarks", width: 32 },
];

export const normalizeCurrentStockRows = (rows) =>
  rows.map((row) => ({
    ...row,
    lastMovementAt: formatDate(row.lastMovementAt),
  }));

export const normalizeMovementRows = (rows) =>
  rows.map((row) => ({
    ...row,
    movementDate: formatDate(row.movementDate),
    referenceId: row.referenceId?.toString() || "",
  }));
