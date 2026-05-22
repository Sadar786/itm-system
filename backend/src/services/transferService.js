import mongoose from "mongoose";

import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";

import AppError from "../utils/AppError.js";

import {
  increaseStock,
  decreaseStock,
  createMovement,
} from "./inventoryService.js";

export const createTransfer = async ({
  fromShopId,
  toShopId,
  items,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transfer = await Transfer.create({
            fromShopId,
            toShopId,
            status: "pending",
        }, { session });        
        for (const item of items) {
            const { productId, unitId, quantity } = item;
            await decreaseStock({
                shopId: fromShopId,
                productId,  
                unitId,
                quantity,
            }, session);
            await createMovement({
                shopId: fromShopId,
                productId,
                unitId,
                quantity: -quantity,
                type: "transfer_out",
                referenceId: transfer._id,
            }, session);
            await TransferItem.create({ 
                transferId: transfer._id,
                productId,
                unitId, 
                quantity,
            }, { session });
        }
        await session.commitTransaction();
        session.endSession();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }       

};

export const receiveTransfer = async (transferId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {   
        const transfer = await Transfer.findById(transferId).session(session);
        if (!transfer) {
            throw new AppError("Transfer not found", 404);
        }
        if (transfer.status !== "pending") {
            throw new AppError("Transfer already received", 400);
        }   
        const items = await TransferItem.find({ transferId }).session(session);
        for (const item of items) {
            const { productId, unitId, quantity } = item;   
            await increaseStock({
                shopId: transfer.toShopId,
                productId,  
                unitId,
                quantity,
            }, session);    
            await createMovement({
                shopId: transfer.toShopId,
                productId,
                unitId,
                quantity,
                type: "transfer_in",
                referenceId: transfer._id,
            }, session);
        }
        transfer.status = "received";
        await transfer.save({ session });
        await session.commitTransaction();
        session.endSession();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }

};  
