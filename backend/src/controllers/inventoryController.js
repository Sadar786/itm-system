// src/controllers/inventoryController.js
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import { createMovement } from "../services/inventoryService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getScopedShopId = (req, requestedShopId) => {
  if (req.user.role === "admin") {
    return requestedShopId;
  }

  if (!req.user.shopId) {
    return null;
  }

  const assignedShopId = req.user.shopId.toString();

  if (requestedShopId && requestedShopId.toString() !== assignedShopId) {
    return false;
  }

  return assignedShopId;
};

/**
 * ADD / INCREASE INVENTORY
 * POST /api/inventory/in
 */
export const addInventory = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      shopId: requestedShopId,
      productId,
      quantity,
      unitId,
      remarks = "",
    } = req.body;
    const shopId = getScopedShopId(req, requestedShopId);

    if (shopId === false) {
      return res.status(403).json({
        success: false,
        message: "You can only manage inventory for your assigned shop",
      });
    }

    if (
      !shopId ||
      !productId ||
      quantity === undefined ||
      !unitId
    ) {
      return res.status(400).json({
        success: false,
        message: "shopId, productId, quantity, and unitId are required",
      });
    }

    if (
      !isValidObjectId(shopId) ||
      !isValidObjectId(productId) ||
      !isValidObjectId(unitId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopId, productId, or unitId",
      });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    session.startTransaction();

    const movementDate = new Date();
    const existingInventory = await Inventory.findOne({
      shopId,
      productId,
    }).session(session);

    if (existingInventory) {
      if (existingInventory.unitId.toString() !== unitId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message:
            "Unit mismatch. This product already exists in inventory with a different unit.",
        });
      }

      existingInventory.quantity += qty;
      existingInventory.lastMovementAt = movementDate;

      const updatedInventory = await existingInventory.save({ session });

      await createMovement({
        shopId,
        productId,
        unitId,
        quantity: qty,
        quantityEffect: qty,
        movementType: "IN",
        referenceType: "StockReceipt",
        referenceId: updatedInventory._id,
        createdBy: req.user._id,
        remarks,
        movementDate,
        session,
      });

      await session.commitTransaction();

      const populated = await Inventory.findById(updatedInventory._id)
        .populate("shopId", "name code")
        .populate("productId", "itemCode description defaultUnitId")
        .populate("unitId", "name shortName");

      return res.status(200).json({
        success: true,
        message: "Inventory quantity increased successfully",
        data: populated,
      });
    }

    const [inventory] = await Inventory.create(
      [
        {
          shopId,
          productId,
          quantity: qty,
          unitId,
          lastMovementAt: movementDate,
        },
      ],
      { session }
    );

    await createMovement({
      shopId,
      productId,
      unitId,
      quantity: qty,
      quantityEffect: qty,
      movementType: "IN",
      referenceType: "StockReceipt",
      referenceId: inventory._id,
      createdBy: req.user._id,
      remarks,
      movementDate,
      session,
    });

    await session.commitTransaction();

    const populated = await Inventory.findById(inventory._id)
      .populate("shopId", "name code")
      .populate("productId", "itemCode description defaultUnitId")
      .populate("unitId", "name shortName");

    return res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: populated,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Error adding inventory:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Inventory already exists for this shop and product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * GET ALL CURRENT INVENTORY
 * GET /api/inventory/current
 */
export const getCurrentInventory = async (req, res) => {
  try {
    const shopId = getScopedShopId(req, req.query.shopId);

    if (shopId === false) {
      return res.status(403).json({
        success: false,
        message: "You can only view inventory for your assigned shop",
      });
    }

    const query = {};

    if (shopId) {
      if (!isValidObjectId(shopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shopId",
        });
      }
      query.shopId = shopId;
    }

    const inventory = await Inventory.find(query)
      .sort({ updatedAt: -1 })
      .populate("shopId", "name code")
      .populate("productId", "itemCode description defaultUnitId")
      .populate("unitId", "name shortName");

    return res.status(200).json({
      success: true,
      count: inventory.length,
      message: "Current inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Error fetching current inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ONE INVENTORY ROW
 * GET /api/inventory/:id
 */
export const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory id",
      });
    }

    const inventory = await Inventory.findById(id)
      .populate("shopId", "name code")
      .populate("productId", "itemCode description defaultUnitId")
      .populate("unitId", "name shortName");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      inventory.shopId?._id?.toString() !== req.user.shopId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view inventory for your assigned shop",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE INVENTORY
 * PUT /api/inventory/:id
 */
export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unitId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory id",
      });
    }

    const existingInventory = await Inventory.findById(id);

    if (!existingInventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    const updateData = {};

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be 0 or greater",
        });
      }
      updateData.quantity = qty;
      updateData.lastMovementAt = new Date();
    }

    if (unitId !== undefined) {
      if (!isValidObjectId(unitId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unitId",
        });
      }

      updateData.unitId = unitId;
    }

    const updated = await Inventory.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("shopId", "name code")
      .populate("productId", "itemCode description defaultUnitId")
      .populate("unitId", "name shortName");

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE INVENTORY
 * DELETE /api/inventory/:id
 */
export const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory id",
      });
    }

    const deleted = await Inventory.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
