import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import AppError from "../utils/AppError.js";

import {
  increaseStock,
  decreaseStock,
  createMovement,
} from "./inventoryService.js";

const generateTransferNo = () => {
  return `TRF-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
};

export const createTransferService = async ({
  fromShopId,
  toShopId,
  items,
  remarks = "",
  createdBy,
  transferDate = new Date(),
}) => {
  if (!fromShopId || !toShopId) {
    throw new AppError("From shop and to shop are required", 400);
  }

  if (fromShopId.toString() === toShopId.toString()) {
    throw new AppError("Cannot transfer to same shop", 400);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("Transfer items are required", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transferResult = await Transfer.create(
      [
        {
          transferNo: generateTransferNo(),
          fromShopId,
          toShopId,
          transferDate,
          remarks,
          createdBy,
          status: "posted",
        },
      ],
      { session }
    );

    const transferDoc = transferResult[0];

    for (const item of items) {
      const {
        productId,
        unitId,
        quantity,
        remarks: itemRemarks = "",
      } = item;

      if (!productId || !unitId || !quantity || Number(quantity) <= 0) {
        throw new AppError("Invalid transfer item data", 400);
      }

      const numericQuantity = Number(quantity);
      const fromInventory = await decreaseStock({
        shopId: fromShopId,
        productId,
        quantity: numericQuantity,
        session,
      });

      const toInventory = await increaseStock({
        shopId: toShopId,
        productId,
        unitId,
        quantity: numericQuantity,
        session,
      });

      if (
        fromInventory.shopId.toString() !== fromShopId.toString() ||
        fromInventory.productId.toString() !== productId.toString()
      ) {
        throw new AppError("Transfer failed: sender stock was not reduced", 500);
      }

      if (
        toInventory.shopId.toString() !== toShopId.toString() ||
        toInventory.productId.toString() !== productId.toString()
      ) {
        throw new AppError("Transfer failed: receiver stock was not increased", 500);
      }

      await TransferItem.create(
        [
          {
            transferId: transferDoc._id,
            productId,
            quantity: numericQuantity,
            unitId,
            remarks: itemRemarks,
          },
        ],
        { session }
      );

      await createMovement({
        shopId: fromShopId,
        productId,
        unitId,
        quantity: numericQuantity,
        quantityEffect: -numericQuantity,
        movementType: "TRANSFER_OUT",
        fromShopId,
        toShopId,
        referenceType: "Transfer",
        referenceId: transferDoc._id,
        createdBy,
        remarks: itemRemarks,
        movementDate: transferDate,
        session,
      });

      await createMovement({
        shopId: toShopId,
        productId,
        unitId,
        quantity: numericQuantity,
        quantityEffect: numericQuantity,
        movementType: "TRANSFER_IN",
        fromShopId,
        toShopId,
        referenceType: "Transfer",
        referenceId: transferDoc._id,
        createdBy,
        remarks: itemRemarks,
        movementDate: transferDate,
        session,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return transferDoc;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};
