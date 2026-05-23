// src/controllers/wasteItemController.js
import mongoose from "mongoose";
import WasteItem from "../models/WasteItem.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * CREATE WASTE ITEM
 * POST /api/waste-items
 */
export const createWasteItem = async (req, res) => {
  try {
    const { wasteId, productId, quantity, unitId, remarks } = req.body;

    if (!wasteId || !productId || quantity === undefined || !unitId) {
      return res.status(400).json({
        success: false,
        message: "wasteId, productId, quantity, and unitId are required",
      });
    }

    if (
      !isValidObjectId(wasteId) ||
      !isValidObjectId(productId) ||
      !isValidObjectId(unitId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid wasteId, productId, or unitId",
      });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 0.000001) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than or equal to 0.000001",
      });
    }

    const wasteItem = await WasteItem.create({
      wasteId,
      productId,
      quantity: qty,
      unitId,
      remarks: remarks || "",
    });

    const populated = await WasteItem.findById(wasteItem._id)
      .populate("wasteId")
      .populate("productId", "name code")
      .populate("unitId", "name shortName");

    return res.status(201).json({
      success: true,
      message: "Waste item created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error creating waste item:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ALL WASTE ITEMS
 * GET /api/waste-items
 */
export const getAllWasteItems = async (req, res) => {
  try {
    const { wasteId, productId, page = 1, limit = 20 } = req.query;

    const query = {};

    if (wasteId) {
      if (!isValidObjectId(wasteId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid wasteId",
        });
      }
      query.wasteId = wasteId;
    }

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId",
        });
      }
      query.productId = productId;
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNumber - 1) * pageLimit;

    const total = await WasteItem.countDocuments(query);

    const items = await WasteItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("wasteId")
      .populate("productId", "name code")
      .populate("unitId", "name shortName");

    return res.status(200).json({
      success: true,
      message: "Waste items fetched successfully",
      data: items,
      pagination: {
        total,
        page: pageNumber,
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("Error fetching waste items:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET SINGLE WASTE ITEM
 * GET /api/waste-items/:id
 */
export const getWasteItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waste item id",
      });
    }

    const item = await WasteItem.findById(id)
      .populate("wasteId")
      .populate("productId", "name code")
      .populate("unitId", "name shortName");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Waste item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Waste item fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error fetching waste item:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE WASTE ITEM
 * PUT /api/waste-items/:id
 */
export const updateWasteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { wasteId, productId, quantity, unitId, remarks } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waste item id",
      });
    }

    const existing = await WasteItem.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Waste item not found",
      });
    }

    const updateData = {};

    if (wasteId !== undefined) {
      if (!isValidObjectId(wasteId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid wasteId",
        });
      }
      updateData.wasteId = wasteId;
    }

    if (productId !== undefined) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId",
        });
      }
      updateData.productId = productId;
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (Number.isNaN(qty) || qty < 0.000001) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than or equal to 0.000001",
        });
      }
      updateData.quantity = qty;
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

    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    const updated = await WasteItem.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("wasteId")
      .populate("productId", "name code")
      .populate("unitId", "name shortName");

    return res.status(200).json({
      success: true,
      message: "Waste item updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating waste item:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE WASTE ITEM
 * DELETE /api/waste-items/:id
 */
export const deleteWasteItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waste item id",
      });
    }

    const deleted = await WasteItem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Waste item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Waste item deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting waste item:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
