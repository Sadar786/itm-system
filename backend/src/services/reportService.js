import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import AppError from "../utils/AppError.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildDateQuery = ({ startDate, endDate }) => {
  const dateQuery = {};

  if (startDate) {
    dateQuery.$gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery.$lte = end;
  }

  return Object.keys(dateQuery).length ? dateQuery : undefined;
};

export const getCurrentStockReport = async ({ shopId } = {}) => {
  const query = {};

  if (shopId) {
    if (!isValidObjectId(shopId)) {
      throw new AppError("Invalid shopId", 400);
    }

    query.shopId = shopId;
  }

  const inventory = await Inventory.find(query)
    .sort({ updatedAt: -1 })
    .populate("shopId", "name code")
    .populate("productId", "itemCode description minimumStock reorderLevel")
    .populate("unitId", "name shortName");

  return inventory.map((item) => ({
    shopCode: item.shopId?.code || "",
    shopName: item.shopId?.name || "",
    itemCode: item.productId?.itemCode || "",
    product: item.productId?.description || "",
    quantity: item.quantity,
    unit: item.unitId?.shortName || item.unitId?.name || "",
    minimumStock: item.productId?.minimumStock ?? 0,
    reorderLevel: item.productId?.reorderLevel ?? 0,
    lastMovementAt: item.lastMovementAt,
  }));
};

export const getMovementReport = async ({
  shopId,
  productId,
  movementType,
  startDate,
  endDate,
} = {}) => {
  const query = {};

  if (shopId) {
    if (!isValidObjectId(shopId)) {
      throw new AppError("Invalid shopId", 400);
    }

    query.shopId = shopId;
  }

  if (productId) {
    if (!isValidObjectId(productId)) {
      throw new AppError("Invalid productId", 400);
    }

    query.productId = productId;
  }

  if (movementType) {
    query.movementType = movementType;
  }

  const movementDate = buildDateQuery({ startDate, endDate });
  if (movementDate) {
    query.movementDate = movementDate;
  }

  const movements = await InventoryMovement.find(query)
    .sort({ movementDate: -1, createdAt: -1 })
    .populate("shopId", "name code")
    .populate("productId", "itemCode description")
    .populate("unitId", "name shortName")
    .populate("createdBy", "name email");

  return movements.map((movement) => ({
    movementNo: movement.movementNo,
    movementDate: movement.movementDate,
    shopCode: movement.shopId?.code || "",
    shopName: movement.shopId?.name || "",
    itemCode: movement.productId?.itemCode || "",
    product: movement.productId?.description || "",
    movementType: movement.movementType,
    quantity: movement.quantity,
    quantityEffect: movement.quantityEffect,
    unit: movement.unitId?.shortName || movement.unitId?.name || "",
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdBy: movement.createdBy?.name || "",
    remarks: movement.remarks || "",
  }));
};
