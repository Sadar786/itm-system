import ExcelJS from "exceljs";

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const quantityFormat = "0.000;-0.000;0";

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

export const createStockDetailWorkbookBuffer = async ({ shops, rows }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventory System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Stock Detail");

  const columns = [
    { header: "Item Code", key: "itemCode", width: 16 },
    { header: "Description", key: "product", width: 38 },
    { header: "Category", key: "category", width: 18 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Total Stock", key: "totalQuantity", width: 14 },
    { header: "Minimum Stock", key: "minimumStock", width: 16 },
    { header: "Reorder Level", key: "reorderLevel", width: 16 },
    { header: "Last Movement", key: "lastMovementAt", width: 16 },
    ...shops.map((shop) => ({
      header: shop.code ? `${shop.code} - ${shop.name}` : shop.name,
      key: `shop_${shop._id}`,
      width: 16,
    })),
  ];

  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  worksheet.getRow(1).values = ["STOCK DETAIL"];
  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.getCell(1, 1).font = { bold: true, size: 14 };
  worksheet.getCell(1, 1).alignment = { horizontal: "center" };

  worksheet.getRow(2).values = columns.map((column) => column.header);

  rows.forEach((row) => {
    worksheet.addRow({
      ...row,
      lastMovementAt: formatDate(row.lastMovementAt),
    });
  });

  worksheet.views = [{ state: "frozen", xSplit: 8, ySplit: 2 }];
  worksheet.getRow(2).font = { bold: true };
  worksheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 2) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
  });

  return workbook.xlsx.writeBuffer();
};

export const createTransferMatrixWorkbookBuffer = async ({ dates, rows }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventory System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Transfer Rec");
  const fixedColumns = [
    { header: "ITEM CODE", key: "itemCode", width: 14 },
    { header: "DISCRIBTIONS", key: "description", width: 38 },
    { header: "SENDER BRANCH ", key: "senderBranch", width: 18 },
    { header: "RECEIVER BRANCH", key: "receiverBranch", width: 18 },
    { header: "UoM ", key: "uom", width: 10 },
    { header: "TOTAL", key: "total", width: 12 },
  ];
  const dateColumns = dates.map((date) => ({
    header: date,
    key: `day_${formatDate(date)}`,
    width: 12,
  }));
  const columns = [...fixedColumns, ...dateColumns];

  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  worksheet.getRow(1).values = columns.map((column) => column.header);
  rows.forEach((row) => worksheet.addRow(row));

  worksheet.views = [{ state: "frozen", xSplit: fixedColumns.length, ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  dateColumns.forEach((_, index) => {
    const columnNumber = fixedColumns.length + index + 1;
    worksheet.getCell(1, columnNumber).numFmt = "yyyy-mm-dd";
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell(fixedColumns.length).numFmt = quantityFormat;
      dateColumns.forEach((_, index) => {
        row.getCell(fixedColumns.length + index + 1).numFmt = quantityFormat;
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
};

export const createMonthlyTransferStockWorkbookBuffer = async ({
  dates,
  rows,
  shopHeader = "EXISTING SHOP NAME",
  transferShopHeader = "TRANSFER SHOP NAME",
  totalHeader = "TOTAL",
  summaryTotalHeader,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventory System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Sheet1");
  const fixedColumns = [
    { header: "ITEM CODE", key: "itemCode", width: 14 },
    { header: "PRODUCT NAME", key: "description", width: 39 },
    { header: shopHeader, key: "existingShopName", width: 24 },
    { header: transferShopHeader, key: "transferShopName", width: 24 },
    { header: "UoM", key: "uom", width: 10 },
    { header: totalHeader, key: "total", width: 16 },
  ];
  if (summaryTotalHeader) {
    fixedColumns.push({
      header: summaryTotalHeader,
      key: "shopPairTotal",
      width: 18,
    });
  }
  const dateColumns = dates.map((date) => ({
    header: date,
    key: `day_${formatDate(date)}`,
    width: 10,
  }));
  const columns = [...fixedColumns, ...dateColumns];

  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  worksheet.getCell("A1").value = "STOCK DETAIL";
  worksheet.getRow(2).values = columns.map((column) => column.header);

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  worksheet.views = [{ state: "frozen", ySplit: 2 }];
  worksheet.getRow(2).font = { bold: true };
  worksheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };

  dateColumns.forEach((_, index) => {
    const columnNumber = fixedColumns.length + index + 1;
    worksheet.getCell(2, columnNumber).numFmt = "yyyy-mm-dd";
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.getCell(fixedColumns.length).numFmt = quantityFormat;
      if (summaryTotalHeader) {
        row.getCell(fixedColumns.length - 1).numFmt = quantityFormat;
      }
      dateColumns.forEach((_, index) => {
        row.getCell(fixedColumns.length + index + 1).numFmt = quantityFormat;
      });
    }
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
  { header: "From Shop Code", key: "fromShopCode", width: 16 },
  { header: "From Shop Name", key: "fromShopName", width: 24 },
  { header: "To Shop Code", key: "toShopCode", width: 16 },
  { header: "To Shop Name", key: "toShopName", width: 24 },
  { header: "Related Shop Code", key: "relatedShopCode", width: 18 },
  { header: "Related Shop Name", key: "relatedShopName", width: 24 },
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


  export const createProductsWorkbookBuffer = async ({ products }) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Inventory System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Products");

  const columns = [
    { header: "Item Code", key: "itemCode", width: 16 },
    { header: "Description", key: "description", width: 40 },
    { header: "Category", key: "category", width: 22 },
    { header: "Default Unit", key: "unit", width: 14 },
    { header: "Barcode", key: "barcode", width: 22 },
    { header: "Perishable", key: "isPerishable", width: 14 },
    { header: "Minimum Stock", key: "minimumStock", width: 16 },
    { header: "Reorder Level", key: "reorderLevel", width: 16 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  worksheet.columns = columns;

  products.forEach((product) => {
    worksheet.addRow({
      itemCode: product.itemCode || "",
      description: product.description || "",
      category: product.categoryId?.name || "",
      unit:
        product.defaultUnitId?.shortName ||
        product.defaultUnitId?.name ||
        "",
      barcode: product.barcode || "",
      isPerishable: product.isPerishable ? "Yes" : "No",
      minimumStock: product.minimumStock ?? 0,
      reorderLevel: product.reorderLevel ?? 0,
      notes: product.notes || "",
    });
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  worksheet.getRow(1).font = {
    bold: true,
  };

  worksheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
};