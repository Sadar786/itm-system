import Product from "../models/Product.js";
import XLSX from "xlsx";
import Category from "../models/Category.js";
import Unit from "../models/Unit.js";
import { createProductsWorkbookBuffer } from "../services/excelService.js"

/**
 * =========================
 * CREATE PRODUCT
 * =========================
 */
export const createProduct = async (req, res) => {
  try {
    const {
      itemCode,
      description,
      categoryId,
      defaultUnitId,
      barcode,
      isPerishable = false,
      minimumStock = 0,
      reorderLevel = 0,
      notes = "",
    } = req.body;

    // Required validation
    if (!itemCode || !description || !defaultUnitId) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Normalize itemCode (important for duplicates safety)
    const normalizedCode = itemCode.trim().toUpperCase();

    // Check duplicate
    const existingProduct = await Product.findOne({
      itemCode: normalizedCode,
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this item code already exists",
      });
    }

    const productData = {
      itemCode: normalizedCode,
      description,
      defaultUnitId,
      barcode,
      isPerishable,
      minimumStock,
      reorderLevel,
      notes,
    };

    if (categoryId) {
      productData.categoryId = categoryId;
    }

    const product = await Product.create(productData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/** =========================
  * GET ONE PRODUCT
  * ========================
  */
export const getOneProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id)
      .populate("categoryId", "name")
      .populate("defaultUnitId", "name shortName");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * GET PRODUCTS (SEARCH + PAGINATION)
 * =========================
 */
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      categoryId,
    } = req.query;

    const query = {};

    // Search by name or itemCode
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .populate("defaultUnitId", "name shortName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * UPDATE PRODUCT (SAFE)
 * =========================
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Prevent accidental overwrite of itemCode duplication
    if (req.body.itemCode) {
      const existing = await Product.findOne({
        itemCode: req.body.itemCode.trim().toUpperCase(),
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Item code already exists",
        });
      }

      req.body.itemCode = req.body.itemCode.trim().toUpperCase();
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      req.body,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * DELETE PRODUCT (SOFT READY)
 * =========================
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ==============================

/**
 * =========================
 * BULK IMPORT PRODUCTS
 * =========================
 */
export const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain a worksheet",
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file contains no product rows",
      });
    }

    // --------------------------------
    // Load categories and units
    // --------------------------------
    const [categories, units] = await Promise.all([
      Category.find({}),
      Unit.find({}),
    ]);

    const categoryMap = new Map();
    const unitMap = new Map();

    categories.forEach((category) => {
      categoryMap.set(
        String(category.name || "").trim().toLowerCase(),
        category._id
      );
    });

    units.forEach((unit) => {
      const name = String(unit.name || "").trim().toLowerCase();
      const shortName = String(unit.shortName || "").trim().toLowerCase();

      if (name) {
        unitMap.set(name, unit._id);
      }

      if (shortName) {
        unitMap.set(shortName, unit._id);
      }
    });

    // --------------------------------
    // Normalize rows
    // --------------------------------
    const normalizedRows = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      const itemCode = String(
        row["Item Code"] ?? row["itemCode"] ?? ""
      )
        .trim()
        .toUpperCase();

      const description = String(
        row["Description"] ?? row["description"] ?? ""
      ).trim();

      const categoryName = String(
        row["Category"] ?? row["category"] ?? ""
      ).trim();

      const unitName = String(
        row["Unit"] ?? row["unit"] ?? ""
      ).trim();

      const barcode = String(
        row["Barcode"] ?? row["barcode"] ?? ""
      ).trim();

      const isPerishableValue = String(
        row["Perishable"] ?? row["isPerishable"] ?? ""
      )
        .trim()
        .toLowerCase();

      const minimumStockValue =
        row["Minimum Stock"] ?? row["minimumStock"] ?? 0;

      const reorderLevelValue =
        row["Reorder Level"] ?? row["reorderLevel"] ?? 0;

      const notes = String(
        row["Notes"] ?? row["notes"] ?? ""
      ).trim();

      normalizedRows.push({
        rowNumber: index + 2,
        itemCode,
        description,
        categoryName,
        unitName,
        barcode,
        isPerishable:
          isPerishableValue === "yes" ||
          isPerishableValue === "true" ||
          isPerishableValue === "1",
        minimumStock: Number(minimumStockValue || 0),
        reorderLevel: Number(reorderLevelValue || 0),
        notes,
      });
    }

    // --------------------------------
    // Find existing item codes
    // --------------------------------
    const itemCodes = [
      ...new Set(
        normalizedRows
          .map((row) => row.itemCode)
          .filter(Boolean)
      ),
    ];

    const existingProducts = await Product.find({
      itemCode: { $in: itemCodes },
    }).select("itemCode");

    const existingCodes = new Set(
      existingProducts.map((product) => product.itemCode)
    );

    // --------------------------------
    // Prevent duplicate rows
    // inside same Excel
    // --------------------------------
    const processedCodes = new Set();

    const productsToCreate = [];

    const skipped = [];
    const failed = [];

    for (const row of normalizedRows) {
      // Required fields
      if (
        !row.itemCode ||
        !row.description ||
        !row.unitName
      ) {
        failed.push({
          row: row.rowNumber,
          itemCode: row.itemCode || "",
          reason:
            "Item Code, Description and Unit are required",
        });

        continue;
      }

      // Already in database
      if (existingCodes.has(row.itemCode)) {
        skipped.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: "Product already exists",
        });

        continue;
      }

      // Duplicate inside current Excel
      if (processedCodes.has(row.itemCode)) {
        skipped.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: "Duplicate item code in Excel file",
        });

        continue;
      }

      processedCodes.add(row.itemCode);

      // Category lookup
      // Category lookup - optional
      let categoryId = undefined;

      if (row.categoryName) {
        categoryId = categoryMap.get(
          row.categoryName.toLowerCase()
        );

        if (!categoryId) {
          failed.push({
            row: row.rowNumber,
            itemCode: row.itemCode,
            reason: `Category "${row.categoryName}" not found`,
          });

          continue;
        }
      }

      // Unit lookup
      const defaultUnitId = unitMap.get(
        row.unitName.toLowerCase()
      );

      if (!defaultUnitId) {
        failed.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: `Unit "${row.unitName}" not found`,
        });

        continue;
      }

      // Number validation
      if (
        !Number.isFinite(row.minimumStock) ||
        row.minimumStock < 0
      ) {
        failed.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: "Invalid Minimum Stock",
        });

        continue;
      }

      if (
        !Number.isFinite(row.reorderLevel) ||
        row.reorderLevel < 0
      ) {
        failed.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: "Invalid Reorder Level",
        });

        continue;
      }

      productsToCreate.push({
        itemCode: row.itemCode,
        description: row.description,
        categoryId,
        defaultUnitId,
        barcode: row.barcode,
        isPerishable: row.isPerishable,
        minimumStock: row.minimumStock,
        reorderLevel: row.reorderLevel,
        notes: row.notes,
      });
    }

    // --------------------------------
    // Insert new products
    // --------------------------------
    let createdProducts = [];

    if (productsToCreate.length) {
      createdProducts = await Product.insertMany(
        productsToCreate,
        {
          ordered: false,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Product import completed",
      summary: {
        totalRows: rows.length,
        created: createdProducts.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      skipped,
      failed,
    });
  } catch (error) {
    console.error("Product import error:", error);

    return res.status(500).json({
      success: false,
      message: "Product import failed",
      error: error.message,
    });
  }
};





export const exportProductsExcel = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .populate("categoryId", "name")
      .populate("defaultUnitId", "name shortName")
      .sort({ itemCode: 1 })
      .lean();

    const buffer = await createProductsWorkbookBuffer({
      products,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Products_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`
    );

    res.send(buffer);
  } catch (error) {
    next(error);
  }
};