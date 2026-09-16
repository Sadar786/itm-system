import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import Transfer from "../models/Transfer.js";
import Waste from "../models/Waste.js";
import { analyticsDetails } from "../services/analyticsDetailsService.js";
import { analyticsTableHandlers, parseAnalyticsTableOptions } from "../services/analyticsTableService.js";
import { resolveWasteShop, parseWasteDate } from "../services/wasteService.js";

const router = express.Router();
router.use(protect, authorizeRoles("admin", "shop_keeper"));
function analyticsContext(req) {
  const shopId = resolveWasteShop(req.user, req.query.shopId);
  const dates = {};
  if (req.query.startDate) dates.$gte = parseWasteDate(req.query.startDate, "startDate");
  if (req.query.endDate) dates.$lte = parseWasteDate(req.query.endDate, "endDate");
  if (dates.$gte > dates.$lte) throw new AppError("Start date must be before end date", 400);
  const timezone = req.query.timezone || "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); }
  catch { throw new AppError("Invalid timezone", 400); }
  const branch = shopId ? new mongoose.Types.ObjectId(shopId) : null;
  const transferMatch = { ...(Object.keys(dates).length ? { transferDate: dates } : {}), ...(branch ? { $or: [{ fromShopId: branch }, { toShopId: branch }] } : {}) };
  const wasteMatch = { ...(Object.keys(dates).length ? { wasteDate: dates } : {}), ...(branch ? { shopId: branch } : {}) };
  return { branch, transferMatch, wasteMatch, timezone };
}

router.get("/", asyncHandler(async (req, res) => {
  const context = analyticsContext(req);
  const { branch, transferMatch, wasteMatch, timezone } = context;
  const [transfers, wastes] = await Promise.all([
    Transfer.aggregate([{ $match: transferMatch }, { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$transferDate", timezone } }, status: "$status" }, count: { $sum: 1 }, incoming: { $sum: branch ? { $cond: [{ $eq: ["$toShopId", branch] }, 1, 0] } : 1 }, outgoing: { $sum: branch ? { $cond: [{ $eq: ["$fromShopId", branch] }, 1, 0] } : 1 } } }, { $sort: { "_id.day": 1 } }]),
    Waste.aggregate([{ $match: wasteMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$wasteDate", timezone } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  const summary = { total: 0, in_transit: 0, delivered: 0, cancelled: 0, wastage: 0, incoming: 0, outgoing: 0 };
  for (const row of transfers) { summary.total += row.count; summary.incoming += row.incoming || 0; summary.outgoing += row.outgoing || 0; if (row._id.status in summary) summary[row._id.status] += row.count; }
  for (const row of wastes) summary.wastage += row.count;
  if (req.query.summaryOnly === "true") return res.json({ success: true, data: { summary } });
  const details = await analyticsDetails(context);
  res.json({ success: true, data: { summary, transfers, wastes, ...details } });
}));
router.get("/tables/:section", asyncHandler(async (req, res) => {
  if (!Object.hasOwn(analyticsTableHandlers, req.params.section)) throw new AppError("Unknown analytics table", 404);
  const context = analyticsContext(req);
  const options = parseAnalyticsTableOptions(req.query);
  const data = await analyticsTableHandlers[req.params.section](context, options);
  res.json({ success: true, data });
}));
export default router;
