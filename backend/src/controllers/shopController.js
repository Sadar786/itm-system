import Shop from "../models/Shop.js";
import User from "../models/User.js";

// ==============================
// CREATE SHOP
// ==============================
const createShop = async (req, res) => {
    try {
  
        const shopkeeperId = req.user.role === "shop_keeper" ? req.user.id : undefined;

        let {
            name,
            description,
            code,
            location,
            phone,
        } = req.body;

        // ==============================
        // SHOPKEEPER LIMITS
        // ==============================
        if (req.user.role === "shop_keeper") {
            const existingShop = await Shop.findOne({ shopkeeperId: req.user.id });
            if (existingShop) {
                return res.status(403).json({
                    success: false,
                    message: "Shopkeepers can only create one shop.",
                });
            }
        }

        // ==============================
        // VALIDATION
        // ==============================
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Shop name is required",
            });
        }

        // ==============================
        // SANITIZE INPUTS
        // ==============================
        name = name.trim();
        description = description?.trim() || "";
        code = code?.trim() || "";
        location = location?.trim() || "";
        phone = phone?.trim() || "";

        // ==============================
        // CHECK DUPLICATE SHOP
        // ==============================
        const existingShop = await Shop.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
        });

        if (existingShop) {
            return res.status(409).json({
                success: false,
                message: "Shop already exists",
            });
        }

        // ==============================
        // CREATE SHOP
        // ==============================
        const newShop = await Shop.create({
            name,
            description,
            code,
            location,
            phone,
            shopkeeperId,
        });

        let updatedUser = null;

        if (req.user.role === "shop_keeper") {
            updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { shopId: newShop._id },
                { new: true }
            ).select("-password");
        }

        return res.status(201).json({
            success: true,
            message: "Shop created successfully",
            data: newShop,
            user: updatedUser ? {
              id: updatedUser._id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              shopId: updatedUser.shopId,
            } : undefined,
        });

    } catch (error) {
        console.error("Create Shop Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while creating shop",
        });
    }
};

// ==============================
// GET ALL SHOPS
// ==============================
const getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find({})
            .select("-__v")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: shops.length,
            data: shops,
        });

    } catch (error) {
        console.error("Get All Shops Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching shops",
        });
    }
};

// ==============================
// GET SINGLE SHOP
// ==============================
const getSingleShop = async (req, res) => {
    try {
        const { id } = req.params;

        const shop = await Shop.findById(id).select("-__v");

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found",
            });
        }

        if (req.user.role === "shop_keeper" && shop.shopkeeperId?.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access",
            });
        }

        return res.status(200).json({
            success: true,
            data: shop,
        });

    } catch (error) {
        console.error("Get Single Shop Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching shop",
        });
    }
};

// ==============================
// UPDATE SHOP
// ==============================
const updateShop = async (req, res) => {
    try {
        const { id } = req.params;

        let {
            name,
            description,
            code,
            location,
            phone,
            isActive,
        } = req.body;

        // Find shop
        const shop = await Shop.findById(id);

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found",
            });
        }

        // ==============================
        // AUTHORIZATION
        // ==============================
        if (req.user.role === "shop_keeper" && shop.shopkeeperId?.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access",
            });
        }

        // ==============================
        // CHECK DUPLICATE NAME
        // ==============================
        if (name) {
            name = name.trim();

            const existingShop = await Shop.findOne({
                _id: { $ne: id },
                name: { $regex: `^${name}$`, $options: "i" },
            });

            if (existingShop) {
                return res.status(409).json({
                    success: false,
                    message: "Another shop with this name already exists",
                });
            }

            shop.name = name;
        }

        // ==============================
        // UPDATE FIELDS
        // ==============================
        if (description !== undefined)
            shop.description = description?.trim();

        if (code !== undefined)
            shop.code = code?.trim();

        if (location !== undefined)
            shop.location = location?.trim();

        if (phone !== undefined)
            shop.phone = phone?.trim();

        if (isActive !== undefined)
            shop.isActive = isActive;

        const updatedShop = await shop.save();

        return res.status(200).json({
            success: true,
            message: "Shop updated successfully",
            data: updatedShop,
        });

    } catch (error) {
        console.error("Update Shop Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while updating shop",
        });
    }
};

// ==============================
// DELETE SHOP
// ==============================
const deleteShop = async (req, res) => {
    try {
        const { id } = req.params;

        const shop = await Shop.findById(id);

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found",
            });
        }

        // ==============================
        // AUTHORIZATION
        // ==============================
        // if (shop.shopkeeperId?.toString() !== req.user.id) {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Unauthorized access",
        //     });
        // }

        await shop.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Shop deleted successfully",
        });

    } catch (error) {
        console.error("Delete Shop Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting shop",
        });
    }
};


// ==============================
// GET TRANSFER DESTINATION SHOPS
// ==============================
const getTransferDestinationShops = async (req, res) => {
  try {
    const assignedShopId = req.user.shopId?.toString();

    const query = {
      $or: [
        { isActive: true },
        { isActive: { $exists: false } },
      ],
    };

    if (req.user.role !== "admin") {
      if (!assignedShopId) {
        return res.status(403).json({
          success: false,
          message: "No shop assigned to this user",
        });
      }

      query._id = { $ne: assignedShopId };
    }

    const shops = await Shop.find(query)
      .select("_id name code location phone isActive")
      .sort({ code: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Get Transfer Destination Shops Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching destination shops",
    });
  }
};

export {
    createShop,
    getAllShops,
    getSingleShop,
    updateShop,
    deleteShop,
    getTransferDestinationShops
};