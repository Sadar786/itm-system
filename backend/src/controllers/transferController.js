// src/controllers/transferController.js
import mongoose from "mongoose";
import Transfer from "../models/Transfer.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * CREATE TRANSFER
 * POST /api/transfers
 */
export const createTransfer = async (req, res) => {
  try {
    const { transferNo, fromShopId, toShopId, transferDate, status, remarks, createdBy } = req.body;

    if (!transferNo || !fromShopId || !toShopId || !transferDate || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "transferNo, fromShopId, toShopId, transferDate, and createdBy are required",
      });
    }

    if (
      !isValidObjectId(fromShopId) ||
      !isValidObjectId(toShopId) ||
      !isValidObjectId(createdBy)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromShopId, toShopId, or createdBy",
      });
    }

    if (fromShopId === toShopId) {
      return res.status(400).json({
        success: false,
        message: "fromShopId and toShopId cannot be the same",
      });
    }

    const transfer = await Transfer.create({
      transferNo,
      fromShopId,
      toShopId,
      transferDate,
      status: status || "posted",
      remarks: remarks || "",
      createdBy,
    });

    const populated = await Transfer.findById(transfer._id)
      .populate("fromShopId", "name code")
      .populate("toShopId", "name code")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Transfer created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error creating transfer:", error);

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
 * GET ALL TRANSFERS
 * GET /api/transfers
 */
export const getAllTransfers = async (req, res) => {
  try {
    const { fromShopId, toShopId, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (fromShopId) {
      if (!isValidObjectId(fromShopId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fromShopId",
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