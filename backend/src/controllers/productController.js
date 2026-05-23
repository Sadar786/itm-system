import Product from "../models/Product.js";
 
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
    if (!itemCode || !description || !categoryId || !defaultUnitId) {
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

    const product = await Product.create({
      itemCode: normalizedCode,
      description,
      categoryId,
      defaultUnitId,
      barcode,
      isPerishable,
      minimumStock,
      reorderLevel,
      notes,
    });

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
