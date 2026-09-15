import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Waste from "../models/Waste.js";
import WasteItem from "../models/WasteItem.js";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Unit from "../models/Unit.js";
import AppError from "../utils/AppError.js";

export const validateId = (value, name) => {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value)) {
    throw new AppError(`Invalid ${name}`, 400);
  }
  return value.toLowerCase();
};

export const resolveWasteShop = (user, requestedShopId, required = false) => {
  const requested = requestedShopId === undefined ? undefined : validateId(requestedShopId, "shopId");
  if (user.role !== "admin") {
    const assigned = user.shopId?._id?.toString() || user.shopId?.toString();
    if (!assigned) throw new AppError("No shop assigned to this user", 403);
    if (requested && requested !== assigned.toLowerCase()) {
      throw new AppError("You can only access wastage for your assigned shop", 403);
    }
    return assigned;
  }
  if (required && !requested) throw new AppError("shopId is required", 400);
  return requested;
};

const textField = (value, name, required = false) => {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new AppError(`${name} must be ${required ? "a non-empty" : "a"} string`, 400);
  }
  return value.trim();
};

export const parseWasteDate = (value, name) => {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    throw new AppError(`Invalid ${name}`, 400);
  }
  return new Date(value);
};

export const createWasteService = async (user, body = {}) => {
  const shopId = resolveWasteShop(user, body.shopId, true);
  const reason = textField(body.reason, "reason", true);
  const remarks = textField(body.remarks, "remarks");
  const wasteDate = body.wasteDate === undefined ? new Date() : parseWasteDate(body.wasteDate, "wasteDate");
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) {
    throw new AppError("Provide between 1 and 100 waste items", 400);
  }
  const products = new Set();
  const items = body.items.map((item) => {
    if (!item || typeof item !== "object") throw new AppError("Invalid waste item", 400);
    const productId = validateId(item.productId, "productId");
    const unitId = validateId(item.unitId, "unitId");
    if (products.has(productId)) throw new AppError("Each product may appear only once per wastage", 400);
    products.add(productId);
    const quantity = Number(item.quantity);
    if (!["number", "string"].includes(typeof item.quantity) || !Number.isFinite(quantity) || quantity < 0.000001) {
      throw new AppError("Quantity must be a finite number of at least 0.000001", 400);
    }
    return { productId, unitId, quantity, remarks: textField(item.remarks, "Item remarks") };
  });

  // Save the header and all items together; wastage never changes inventory.
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      if (!await Shop.exists({ _id: shopId, isActive: true }).session(session)) {
        throw new AppError("Shop must exist and be active", 400);
      }
      for (const item of items) {
        if (!await Product.exists({ _id: item.productId, isActive: true }).session(session)) {
          throw new AppError("Product must exist and be active", 400);
        }
        if (!await Unit.exists({ _id: item.unitId }).session(session)) {
          throw new AppError("Unit must exist", 400);
        }
      }
      const [waste] = await Waste.create([{
        wasteNo: `WST-${randomUUID()}`, shopId, wasteDate, reason, remarks, createdBy: user._id,
      }], { session });
      const savedItems = await WasteItem.create(items.map((item) => ({ ...item, wasteId: waste._id })), { session, ordered: true });
      return { waste, items: savedItems };
    });
  } finally {
    await session.endSession();
  }
};
