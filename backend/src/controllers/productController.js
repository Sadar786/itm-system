import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Unit from "../models/Unit.js";
import { createProductsWorkbookBuffer } from "../services/excelService.js"
import { parseProductImport, findDescriptionConflicts } from "../services/productImportService.js";

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
      page: requestedPage = 1,
      limit = 10,
      search = "",
      categoryId,
    } = req.query;

    const pageNumber = Number(requestedPage);
    const pageSize = Number(limit);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
    }

    const query = {};
    if (req.query.isActive !== undefined) {
      if (!["true", "false"].includes(req.query.isActive)) {
        return res.status(400).json({ success: false, message: "isActive must be true or false" });
      }
      query.isActive = req.query.isActive === "true";
    }

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

    const total = await Product.countDocuments(query);
    const pages = Math.ceil(total / pageSize);
    const page = Math.min(pageNumber, Math.max(1, pages));
    const skip = (page - 1) * pageSize;

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .populate("defaultUnitId", "name shortName")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        pages,
        limit: pageSize,
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

export const deleteProductsBulk = async (req, res) => {
  const productIds = req.body?.productIds;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Select at least one product to delete",
    });
  }

  // Validate every ID before constructing the deletion filter or writing.
  if (productIds.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))) {
    return res.status(400).json({
      success: false,
      message: "Every selected product must have a valid product ID",
    });
  }

  const uniqueIds = [...new Set(productIds.map((id) => id.toLowerCase()))];
  if (uniqueIds.length > 10000) {
    return res.status(400).json({
      success: false,
      message: "Select no more than 10,000 products at a time",
    });
  }

  try {
    const result = await Product.deleteMany({ _id: { $in: uniqueIds } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} product${result.deletedCount === 1 ? "" : "s"} deleted successfully`,
      data: {
        requestedCount: uniqueIds.length,
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Products could not be deleted",
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

    const { sheetName, rows: normalizedRows } = parseProductImport(req.file.buffer);

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
    }).select("itemCode description");

    const existingByCode = new Map(
      existingProducts.map((product) => [product.itemCode, product])
    );
    const descriptionConflicts = findDescriptionConflicts(normalizedRows);

    // --------------------------------
    // Prevent duplicate rows
    // inside same Excel
    // --------------------------------
    const processedCodes = new Set();

    const productsToCreate = [];
    const sourceRows = [];

    const skipped = [];
    const failed = [];

    for (const row of normalizedRows) {
      if (row.error) {
        failed.push({ row: row.rowNumber, itemCode: row.itemCode, reason: row.error });
        continue;
      }
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
      const existingProduct = existingByCode.get(row.itemCode);
      if (existingProduct) {
        const descriptionDiffers = existingProduct.description !== row.description;
        skipped.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: descriptionDiffers
            ? "Product already exists with a different description. The saved description was not changed."
            : "Product already exists",
          ...(descriptionDiffers ? {
            excelDescription: row.description,
            existingDescription: existingProduct.description,
          } : {}),
        });

        continue;
      }

      if (descriptionConflicts.has(row.itemCode)) {
        failed.push({
          row: row.rowNumber,
          itemCode: row.itemCode,
          reason: descriptionConflicts.get(row.itemCode),
          excelDescription: row.description,
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
      sourceRows.push(row);
      processedCodes.add(row.itemCode);
    }

    // --------------------------------
    // Insert new products
    // --------------------------------
    let created = 0;

    if (productsToCreate.length) {
      let result;
      try {
        result = await Product.insertMany(productsToCreate, {
          ordered: false,
          rawResult: true,
        });
      } catch (error) {
        // Unordered writes can insert valid rows even when another row fails.
        // Only report a completed import when the driver knows every outcome.
        const insertedCount = error.result?.insertedCount;
        if (!error.writeErrors?.length || !Number.isInteger(insertedCount) ||
            error.result?.getWriteConcernError?.()) throw error;
        result = {
          insertedCount,
          writeErrors: error.writeErrors,
          mongoose: error.mongoose,
        };
      }

      created = result.insertedCount;
      const validationErrors = new Set(result.mongoose?.validationErrors || []);
      const writeErrors = new Map((result.writeErrors || []).map((error) => [error.index, error]));
      sourceRows.forEach((row, index) => {
        const validationResult = result.mongoose?.results?.[index];
        const error = writeErrors.get(index) || (validationErrors.has(validationResult) ? validationResult : null);
        if (error) {
          failed.push({
            row: row.rowNumber,
            itemCode: row.itemCode,
            reason: (error.code ?? error.err?.code) === 11000
              ? "Item code was created by another import. Reload products and compare the saved description."
              : error.message || error.errmsg || error.err?.errmsg || "Product could not be saved",
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product import completed",
      sheetName,
      summary: {
        totalRows: normalizedRows.length,
        created,
        skipped: skipped.length,
        failed: failed.length,
      },
      skipped,
      failed,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
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
