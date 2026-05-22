// increaseStock()
// decreaseStock()
// createMovement()
// checkAvailableStock()

import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import AppError from "../utils/AppError.js";

export const checkAvailableStock = async ({
  shopId,
  productId,
  quantity,
}) => {

  const inventory = await Inventory.findOne({
    shopId,
    productId,
  });

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
}) => {

  let inventory = await Inventory.findOne({
    shopId,
    productId,
  });

  if (!inventory) {

    inventory = await Inventory.create({
      shopId,
      productId,
      unitId,
      quantity,
      lastMovementAt: new Date(),
    });

  } else {

    inventory.quantity += quantity;

    inventory.lastMovementAt = new Date();

    await inventory.save();
  }

  return inventory;
};


export const decreaseStock = async ({
  shopId,
  productId,
  quantity,
}) => {

  const inventory = await checkAvailableStock({
    shopId,
    productId,
    quantity,
  });

  inventory.quantity -= quantity;

  inventory.lastMovementAt = new Date();

  await inventory.save();

  return inventory;
};





export const createMovement = async ({
  shopId,
  productId,
  unitId,
  quantity,
  movementType,
  referenceType,
  referenceId,
  createdBy,
  remarks = "",
}) => {

  return await InventoryMovement.create({
    shopId,
    productId,
    unitId,
    quantity,
    movementType,
    referenceType,
    referenceId,
    remarks,
    createdBy,
    movementDate: new Date(),
  });
};