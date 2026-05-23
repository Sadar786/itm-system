import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import AppError from "../utils/AppError.js";
import { randomBytes } from "node:crypto";

const generateMovementNo = () => {
  return `MOV-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
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
    throw new AppError("Inventory not found", 404);
  }

  if (inventory.quantity < quantity) {
    throw new AppError("Insufficient stock", 400);
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
          quantity,
          lastMovementAt: new Date(),
        },
      ],
      { session }
    );

    return createdInventory[0];
  }

  inventory.quantity += Number(quantity);
  inventory.unitId = unitId;
  inventory.lastMovementAt = new Date();

  await inventory.save({ session });

  return inventory;
};

export const decreaseStock = async ({
  shopId,
  productId,
  quantity,
  session = null,
}) => {
  const inventory = await checkAvailableStock({
    shopId,
    productId,
    quantity,
    session,
  });

  inventory.quantity -= Number(quantity);
  inventory.lastMovementAt = new Date();

  await inventory.save({ session });

  return inventory;
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
