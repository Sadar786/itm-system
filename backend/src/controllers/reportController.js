import AppError from "../utils/AppError.js";
import {
  getCurrentStockReport,
  getStockDetailMatrixReport,
  getMovementReport,
  getTransferMatrixReport,
} from "../services/reportService.js";
import {
  createWorkbookBuffer,
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
