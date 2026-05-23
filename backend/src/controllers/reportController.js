import AppError from "../utils/AppError.js";
import {
  getAllShopMonthlyTransferStockReport,
  getCurrentStockReport,
  getStockDetailMatrixReport,
  getMonthlyTransferStockReport,
  getMovementReport,
  getTransferMatrixReport,
} from "../services/reportService.js";
import {
  createWorkbookBuffer,
  createMonthlyTransferStockWorkbookBuffer,
  createStockDetailWorkbookBuffer,
  createTransferMatrixWorkbookBuffer,
  movementColumns,
  normalizeMovementRows,
} from "../utils/excelGenerator.js";

const getScopedShopId = (req) => {
  if (req.user.role === "admin") {
    return req.query.shopId;
  }

  if (!req.user.shopId) {
    throw new AppError("No shop assigned to this user", 403);
  }

  if (req.query.shopId && req.query.shopId !== req.user.shopId.toString()) {
    throw new AppError("You can only access your assigned shop", 403);
  }

  return req.user.shopId;
};

const getOptionalScopedShopId = (req) => {
  if (req.user.role === "admin") {
    return req.query.shopId;
  }

  if (!req.user.shopId) {
    throw new AppError("No shop assigned to this user", 403);
  }

  if (req.query.shopId && req.query.shopId !== req.user.shopId.toString()) {
    throw new AppError("You can only access your assigned shop", 403);
  }

  return req.user.shopId;
};

const sendExcel = (res, { filename, buffer }) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
};

export const getCurrentStock = async (req, res) => {
  try {
    const rows = await getCurrentStockReport({
      shopId: getScopedShopId(req),
    });

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const exportCurrentStock = async (req, res) => {
  try {
    const report = await getStockDetailMatrixReport({
      shopId: getScopedShopId(req),
    });

    const buffer = await createStockDetailWorkbookBuffer(report);

    return sendExcel(res, {
      filename: "stock-detail-report.xlsx",
      buffer,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getMovements = async (req, res) => {
  try {
    const rows = await getMovementReport({
      ...req.query,
      shopId: getScopedShopId(req),
    });

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const exportMovements = async (req, res) => {
  try {
    const rows = await getMovementReport({
      ...req.query,
      shopId: getScopedShopId(req),
    });

    const buffer = await createWorkbookBuffer({
      sheetName: "Movements",
      columns: movementColumns,
      rows: normalizeMovementRows(rows),
    });

    return sendExcel(res, {
      filename: "inventory-movement-report.xlsx",
      buffer,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const exportTransferMatrix = async (req, res) => {
  try {
    const report = await getTransferMatrixReport({
      ...req.query,
      shopId: getScopedShopId(req),
    });

    const buffer = await createTransferMatrixWorkbookBuffer(report);

    return sendExcel(res, {
      filename: "transfer-rec-report.xlsx",
      buffer,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

const exportMonthlyTransferStock = async (req, res, direction) => {
  try {
    const report = await getMonthlyTransferStockReport({
      ...req.query,
      direction,
      shopId: getScopedShopId(req),
    });

    const buffer = await createMonthlyTransferStockWorkbookBuffer(report);
    const filename =
      direction === "out"
        ? "transfer-to-shop-report.xlsx"
        : "transfer-from-shop-report.xlsx";

    return sendExcel(res, {
      filename,
      buffer,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const exportTransferToShop = async (req, res) =>
  exportMonthlyTransferStock(req, res, "out");

export const exportTransferFromShop = async (req, res) =>
  exportMonthlyTransferStock(req, res, "in");

const exportAllShopMonthlyTransferStock = async (req, res, direction) => {
  try {
    const report = await getAllShopMonthlyTransferStockReport({
      ...req.query,
      direction,
      shopId: getOptionalScopedShopId(req),
    });

    const buffer = await createMonthlyTransferStockWorkbookBuffer(report);
    const filename =
      direction === "out"
        ? "all-shop-transfer-report.xlsx"
        : "all-shop-coming-report.xlsx";

    return sendExcel(res, {
      filename,
      buffer,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const exportAllShopTransferData = async (req, res) =>
  exportAllShopMonthlyTransferStock(req, res, "out");

export const exportAllShopComingData = async (req, res) =>
  exportAllShopMonthlyTransferStock(req, res, "in");
