import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import Transfer from "../models/Transfer.js";
import Waste from "../models/Waste.js";
import WasteItem from "../models/WasteItem.js";
import { analyticsDetails } from "../services/analyticsDetailsService.js";
import { resolveWasteShop, parseWasteDate } from "../services/wasteService.js";

const router = express.Router();
router.use(protect, authorizeRoles("admin", "shop_keeper"));
router.get("/", asyncHandler(async (req, res) => {
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
  const [transfers, wastes] = await Promise.all([
    Transfer.aggregate([{ $match: transferMatch }, { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$transferDate", timezone } }, status: "$status" }, count: { $sum: 1 } } }, { $sort: { "_id.day": 1 } }]),
    Waste.aggregate([{ $match: wasteMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$wasteDate", timezone } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  const products = await Waste.aggregate([
    { $match: wasteMatch },
    { $lookup: { from: WasteItem.collection.name, localField: "_id", foreignField: "wasteId", as: "items" } },
    { $unwind: "$items" },
    { $group: { _id: { productId: "$items.productId", unitId: "$items.unitId" }, quantity: { $sum: "$items.quantity" }, records: { $addToSet: "$_id" } } },
    { $lookup: { from: "products", localField: "_id.productId", foreignField: "_id", as: "product" } },
    { $lookup: { from: "units", localField: "_id.unitId", foreignField: "_id", as: "unit" } },
    { $project: { quantity: 1, records: { $size: "$records" }, product: { $arrayElemAt: ["$product", 0] }, unit: { $arrayElemAt: ["$unit", 0] } } },
    { $sort: { records: -1, "product.description": 1, "_id.unitId": 1 } },
  ]);
  const summary = { total: 0, in_transit: 0, delivered: 0, cancelled: 0, wastage: 0 };
  for (const row of transfers) { summary.total += row.count; if (row._id.status in summary) summary[row._id.status] += row.count; }
  for (const row of wastes) summary.wastage += row.count;
  const details = await analyticsDetails({ branch, transferMatch, wasteMatch });
  res.json({ success: true, data: { summary, transfers, wastes, products, ...details } });
}));
export default router;
