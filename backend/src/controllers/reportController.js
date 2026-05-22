import AppError from "../utils/AppError.js";
import {
  getCurrentStockReport,
  getMovementReport,
} from "../services/reportService.js";
import {
  createWorkbookBuffer,
  currentStockColumns,
  movementColumns,
  normalizeCurrentStockRows,
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
    const rows = await getCurrentStockReport({
      shopId: getScopedShopId(req),
    });

    const buffer = await createWorkbookBuffer({
      sheetName: "Current Stock",
      columns: currentStockColumns,
      rows: normalizeCurrentStockRows(rows),
    });

    return sendExcel(res, {
      filename: "current-stock-report.xlsx",
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
