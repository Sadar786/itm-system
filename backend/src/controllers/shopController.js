import Shop from "../models/Shop.js";

// ==============================
// CREATE SHOP
// ==============================
const createShop = async (req, res) => {
    try {
  
        const shopkeeperId = req.user.id;
        // For debugging
        console.log(shopkeeperId)
       

        let {
            name,
            description,
            code,
            location,
            phone,
        } = req.body;

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

        return res.status(201).json({
            success: true,
            message: "Shop created successfully",
            data: newShop,
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
        const shops = await Shop.find()
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
        // if (shop.shopkeeperId?.toString() !== req.user.id) {
        //     console.log("shopkeeperId: ", shop.shopkeeperId?.toString(),"  ", req.user.id);
        //     return res.status(403).json({
        //         success: false,
        //         message: "Unauthorized access",
        //     });
        // }

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

export {
    createShop,
    getAllShops,
    getSingleShop,
    updateShop,
    deleteShop,
};