// src/controllers/transferController.js
import mongoose from "mongoose";
import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import { createTransferService } from "../services/transferService.js";


const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const userShopId = (req) => req.user.shopId?.toString();

const isShopKeeperAllowedForTransfer = (req, transfer) => {
  if (req.user.role === "admin") {
    return true;
  }

  const assignedShopId = userShopId(req);
  if (!assignedShopId) {
    return false;
  }

  return (
    transfer.fromShopId?.toString() === assignedShopId ||
    transfer.toShopId?.toString() === assignedShopId ||
    transfer.fromShopId?._id?.toString() === assignedShopId ||
    transfer.toShopId?._id?.toString() === assignedShopId
  );
};

/**
 * CREATE TRANSFER
 * POST /api/transfers
 */
/**
 * CREATE TRANSFER
 * POST /api/transfers
 */
export const createTransfer = async (req, res) => {
  try {
    const {
      fromShopId,
      toShopId,
      transferDate,
      remarks,
      items,
    } = req.body;

    if (!fromShopId || !toShopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "fromShopId, toShopId, and items are required",
      });
    }

    if (!isValidObjectId(fromShopId) || !isValidObjectId(toShopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromShopId or toShopId",
      });
    }

    if (fromShopId.toString() === toShopId.toString()) {
      return res.status(400).json({
        success: false,
        message: "fromShopId and toShopId cannot be the same",
      });
    }

    if (req.user.role !== "admin" && fromShopId.toString() !== userShopId(req)) {
      return res.status(403).json({
        success: false,
        message: "You can only transfer stock from your assigned shop",
      });
    }

    for (const item of items) {
      if (
        !item.productId ||
        !item.unitId ||
        !item.quantity ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId, unitId, and positive quantity",
        });
      }

      if (!isValidObjectId(item.productId) || !isValidObjectId(item.unitId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId or unitId in items",
        });
      }
    }

    const transfer = await createTransferService({
      fromShopId,
      toShopId,
      items,
      remarks: remarks || "",
      transferDate: transferDate ? new Date(transferDate) : new Date(),
      createdBy: req.user._id,
    });

    const populated = await Transfer.findById(transfer._id)
      .populate("fromShopId", "name code")
      .populate("toShopId", "name code")
      .populate("createdBy", "name email");

    const transferItems = await TransferItem.find({
      transferId: transfer._id,
    })
      .populate("productId", "itemCode description")
      .populate("unitId", "name shortName");

    return res.status(201).json({
      success: true,
      message: "Transfer created successfully",
      data: {
        transfer: populated,
        items: transferItems,
      },
    });
  } catch (error) {
    console.error("Error creating transfer:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

/**
 * GET ALL TRANSFERS
 * GET /api/transfers
 */
export const getAllTransfers = async (req, res) => {
  try {
    const { fromShopId, toShopId, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (req.user.role !== "admin") {
      const assignedShopId = userShopId(req);

      if (!assignedShopId) {
        return res.status(403).json({
          success: false,
          message: "No shop assigned to this user",
        });
      }

      query.$or = [
        { fromShopId: assignedShopId },
        { toShopId: assignedShopId },
      ];
    }

    if (fromShopId) {
      if (!isValidObjectId(fromShopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromShopId",
        });
      }
      if (req.user.role !== "admin" && fromShopId !== userShopId(req)) {
        return res.status(403).json({
          success: false,
          message: "You can only view transfers for your assigned shop",
        });
      }

      query.fromShopId = fromShopId;
    }

    if (toShopId) {
      if (!isValidObjectId(toShopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid toShopId",
        });
      }
      if (req.user.role !== "admin" && toShopId !== userShopId(req)) {
        return res.status(403).json({
          success: false,
          message: "You can only view transfers for your assigned shop",
        });
      }

      query.toShopId = toShopId;
    }

    if (status) {
      query.status = status;
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNumber - 1) * pageLimit;

    const total = await Transfer.countDocuments(query);

    const transfers = await Transfer.find(query)
      .sort({ transferDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("fromShopId", "name code")
      .populate("toShopId", "name code")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Transfers fetched successfully",
      data: transfers,
      pagination: {
        total,
        page: pageNumber,
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET SINGLE TRANSFER
 * GET /api/transfers/:id
 */
export const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer id",
      });
    }

    const transfer = await Transfer.findById(id)
      .populate("fromShopId", "name code")
      .populate("toShopId", "name code")
      .populate("createdBy", "name email");

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    if (!isShopKeeperAllowedForTransfer(req, transfer)) {
      return res.status(403).json({
        success: false,
        message: "You can only view transfers for your assigned shop",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transfer fetched successfully",
      data: transfer,
    });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE TRANSFER
 * PUT /api/transfers/:id
 */
export const updateTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { transferNo, fromShopId, toShopId, transferDate, status, remarks, createdBy } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer id",
      });
    }

    const existing = await Transfer.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    const updateData = {};

    if (transferNo !== undefined) updateData.transferNo = transferNo;

    if (fromShopId !== undefined) {
      if (!isValidObjectId(fromShopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromShopId",
        });
      }
      updateData.fromShopId = fromShopId;
    }

    if (toShopId !== undefined) {
      if (!isValidObjectId(toShopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid toShopId",
        });
      }
      updateData.toShopId = toShopId;
    }

    if (transferDate !== undefined) updateData.transferDate = transferDate;
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (createdBy !== undefined) {
      if (!isValidObjectId(createdBy)) {
        return res.status(400).json({
          success: false,
          message: "Invalid createdBy",
        });
      }
      updateData.createdBy = createdBy;
    }

    if (updateData.fromShopId && updateData.toShopId) {
      if (updateData.fromShopId === updateData.toShopId) {
        return res.status(400).json({
          success: false,
          message: "fromShopId and toShopId cannot be the same",
        });
      }
    }

    const updated = await Transfer.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("fromShopId", "name code")
      .populate("toShopId", "name code")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Transfer updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating transfer:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Transfer number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE TRANSFER
 * DELETE /api/transfers/:id
 */
export const deleteTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer id",
      });
    }

    const deleted = await Transfer.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transfer deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting transfer:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
