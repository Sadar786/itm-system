import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import AppError from "../utils/AppError.js";
import { randomBytes } from "node:crypto";

const generateMovementNo = () => {
  return `MOV-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
};

const getStockLabel = async ({ shopId, productId, session = null }) => {
  const [shop, product] = await Promise.all([
    Shop.findById(shopId).select("name code").session(session),
    Product.findById(productId).select("itemCode description").session(session),
  ]);

  const shopLabel = shop
    ? `${shop.name || shop.code}${shop.code ? ` (${shop.code})` : ""}`
    : shopId;
  const productLabel = product
    ? `${product.itemCode || ""}${product.description ? ` - ${product.description}` : ""}`.trim()
    : productId;

  return { shopLabel, productLabel };
};

export const checkAvailableStock = async ({
  shopId,
  productId,
  quantity,
  session = null,
}) => {
  const inventory = await Inventory.findOne({
    shopId,
    productId,
  }).session(session);

  if (!inventory) {
    const { shopLabel, productLabel } = await getStockLabel({
      shopId,
      productId,
      session,
    });

    throw new AppError(
      `No stock record found in ${shopLabel} for ${productLabel}`,
      404
    );
  }

  if (inventory.quantity < quantity) {
    const { shopLabel, productLabel } = await getStockLabel({
      shopId,
      productId,
      session,
    });

    throw new AppError(
      `Insufficient stock in ${shopLabel} for ${productLabel}. Available: ${inventory.quantity}, requested: ${quantity}`,
      400
    );
  }

  return inventory;
};

export const increaseStock = async ({
  shopId,
  productId,
  unitId,
  quantity,
  session = null,
}) => {
  const numericQuantity = Number(quantity);

  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    throw new AppError("Quantity must be a positive number", 400);
  }

  let inventory = await Inventory.findOne({
    shopId,
    productId,
  }).session(session);

  if (!inventory) {
    const createdInventory = await Inventory.create(
      [
        {
          shopId,
          productId,
          unitId,
          quantity: numericQuantity,
          lastMovementAt: new Date(),
        },
      ],
      { session }
    );

    return createdInventory[0];
  }

  const updatedInventory = await Inventory.findOneAndUpdate(
    { shopId, productId },
    {
      $inc: { quantity: numericQuantity },
      $set: { unitId, lastMovementAt: new Date() },
    },
    { returnDocument: "after", runValidators: true, session }
  );

  return updatedInventory;
};

export const decreaseStock = async ({
  shopId,
  productId,
  quantity,
  session = null,
}) => {
  const numericQuantity = Number(quantity);

  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    throw new AppError("Quantity must be a positive number", 400);
  }

  const inventory = await Inventory.findOneAndUpdate(
    {
      shopId,
      productId,
      quantity: { $gte: numericQuantity },
    },
    {
      $inc: { quantity: -numericQuantity },
      $set: { lastMovementAt: new Date() },
    },
    { returnDocument: "after", runValidators: true, session }
  );

  if (inventory) {
    return inventory;
  }

  await checkAvailableStock({
    shopId,
    productId,
    quantity: numericQuantity,
    session,
  });

  throw new AppError("Unable to decrease stock", 500);
};

export const createMovement = async ({
  shopId,
  productId,
  unitId,
  quantity,
  movementType,
  quantityEffect,
  fromShopId = null,
  toShopId = null,
  referenceType,
  referenceId,
  createdBy,
  remarks = "",
  movementDate = new Date(),
  session = null,
}) => {
  const movement = await InventoryMovement.create(
    [
      {
        movementNo: generateMovementNo(),
        shopId,
        productId,
        unitId,
        quantity,
        quantityEffect,
        fromShopId,
        toShopId,
        movementType,
        referenceType,
        referenceId,
        remarks,
        createdBy,
        movementDate,
      },
    ],
    { session }
  );

  return movement[0];
};
