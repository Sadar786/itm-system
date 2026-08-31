import mongoose from "mongoose";
import Category from "../models/Category.js";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Waste from "../models/Item.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import Unit from "../models/Unit.js";
import User from "../models/User.js";
import WasteItem from "../models/WasteItem.js";

const CONFIRMATION = "reset-inventory-test-data";

const productNames = [
  "BEEF MINCE",
  "CHICKEN BREAST",
  "MUTTON LEG",
  "LAMB CHOPS",
  "FISH FILLET",
  "BASMATI RICE",
  "COOKING OIL",
  "WHEAT FLOUR",
  "SUGAR",
  "TEA PACK",
  "MILK CARTON",
  "YOGURT CUP",
  "BUTTER BLOCK",
  "EGGS TRAY",
  "POTATO",
  "ONION",
  "TOMATO",
  "GREEN CHILLI",
  "GARLIC",
  "GINGER",
  "APPLE",
  "BANANA",
  "ORANGE",
  "MANGO",
  "DATES",
  "LENTILS",
  "CHICKPEAS",
  "BLACK PEPPER",
  "RED CHILLI POWDER",
  "SALT PACK",
];

const pick = (items, index) => items[index % items.length];

const movementNo = (index) => `MOV-SEED-${String(index).padStart(5, "0")}`;
const transferNo = (index) => `TRF-SEED-${String(index).padStart(4, "0")}`;
const wasteNo = (index) => `WST-SEED-${String(index).padStart(4, "0")}`;

const clearDatabase = async () => {
  await Promise.all([
    WasteItem.deleteMany({}),
    Waste.deleteMany({}),
    TransferItem.deleteMany({}),
    Transfer.deleteMany({}),
    InventoryMovement.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Unit.deleteMany({}),
    Shop.deleteMany({}),
    User.deleteMany({}),
  ]);
};

const seedUnits = async () =>
  Unit.create([
    { name: "Kilogram", shortName: "KG", isDecimalAllowed: true },
    { name: "Piece", shortName: "PCS", isDecimalAllowed: false },
    { name: "Carton", shortName: "CTN", isDecimalAllowed: false },
  ]);

const seedCategories = async () =>
  Category.create([
    { name: "Meat", description: "Fresh meat products" },
    { name: "Grocery", description: "Daily grocery items" },
    { name: "Dairy", description: "Milk and dairy products" },
    { name: "Produce", description: "Fruit and vegetables" },
    { name: "Spices", description: "Seasoning and spices" },
    { name: "Frozen", description: "Frozen items" },
  ]);

const seedProducts = async ({ units, categories }) => {
  const products = productNames.map((name, index) => {
    const category = pick(categories, index);
    const defaultUnit = index % 4 === 0 ? units[1] : units[0];

    return {
      itemCode: `PRD-${String(index + 1).padStart(4, "0")}`,
      description: name,
      categoryId: category._id,
      defaultUnitId: defaultUnit._id,
      barcode: `89000000${String(index + 1).padStart(4, "0")}`,
      isPerishable: ["Meat", "Dairy", "Produce", "Frozen"].includes(category.name),
      minimumStock: 10 + (index % 5) * 5,
      reorderLevel: 20 + (index % 6) * 5,
      notes: "Seed test product",
    };
  });

  return Product.create(products);
};

const seedAdmin = async () =>
  User.create({
    name: "System Admin",
    email: "admin@test.com",
    password: "123456",
    role: "admin",
  });

const seedShopkeepersAndShops = async () => {
  const pairs = [];

  for (let index = 1; index <= 25; index += 1) {
    const user = await User.create({
      name: `Shop Keeper ${index}`,
      email: `shop${index}@test.com`,
      password: "123456",
      role: "shop_keeper",
    });

    const shop = await Shop.create({
      name: `Branch ${String(index).padStart(2, "0")}`,
      code: `BR-${String(index).padStart(2, "0")}`,
      location: `Test Market ${index}`,
      phone: `0300${String(1000000 + index)}`,
      shopkeeperId: user._id,
    });

    user.shopId = shop._id;
    await user.save();

    pairs.push({ user, shop });
  }

  return pairs;
};

const seedInventory = async ({ pairs, products, admin }) => {
  const inventoryRows = [];
  const movementRows = [];
  let movementIndex = 1;

  pairs.forEach(({ shop }, shopIndex) => {
    const productCount = 5 + (shopIndex % 8);

    for (let itemIndex = 0; itemIndex < productCount; itemIndex += 1) {
      const product = products[(shopIndex * 3 + itemIndex) % products.length];
      const quantity = 25 + shopIndex * 2 + itemIndex * 4;
      const movementDate = new Date();
      movementDate.setDate(movementDate.getDate() - ((shopIndex + itemIndex) % 18));

      const inventoryId = new mongoose.Types.ObjectId();

      inventoryRows.push({
        _id: inventoryId,
        shopId: shop._id,
        productId: product._id,
        unitId: product.defaultUnitId,
        quantity,
        lastMovementAt: movementDate,
      });

      movementRows.push({
        movementNo: movementNo(movementIndex),
        shopId: shop._id,
        productId: product._id,
        unitId: product.defaultUnitId,
        movementType: "IN",
        quantity,
        quantityEffect: quantity,
        referenceType: "StockReceipt",
        referenceId: inventoryId,
        createdBy: admin._id,
        movementDate,
        remarks: "Opening seed stock",
      });

      movementIndex += 1;
    }
  });

  await Inventory.insertMany(inventoryRows);
  await InventoryMovement.insertMany(movementRows);

  return movementIndex;
};

const seedTransfers = async ({ pairs, admin, movementIndexStart }) => {
  let movementIndex = movementIndexStart;
  const transferRows = [];
  const transferItemRows = [];
  const movementRows = [];

  for (let index = 0; index < 20; index += 1) {
    const from = pairs[index].shop;
    const to = pairs[index + 1].shop;
    const inventory = await Inventory.findOne({ shopId: from._id });

    if (!inventory || inventory.quantity < 4) {
      continue;
    }

    const quantity = 2 + (index % 3);
    const transferDate = new Date();
    transferDate.setDate(transferDate.getDate() - (index % 10));
    const transferId = new mongoose.Types.ObjectId();

    inventory.quantity -= quantity;
    inventory.lastMovementAt = transferDate;
    await inventory.save();

    const toInventory = await Inventory.findOne({
      shopId: to._id,
      productId: inventory.productId,
    });

    if (toInventory) {
      toInventory.quantity += quantity;
      toInventory.lastMovementAt = transferDate;
      await toInventory.save();
    } else {
      await Inventory.create({
        shopId: to._id,
        productId: inventory.productId,
        unitId: inventory.unitId,
        quantity,
        lastMovementAt: transferDate,
      });
    }

    transferRows.push({
      _id: transferId,
      transferNo: transferNo(index + 1),
      fromShopId: from._id,
      toShopId: to._id,
      transferDate,
      status: "in_transit",
      remarks: "Seed transfer",
      createdBy: admin._id,
    });

    transferItemRows.push({
      transferId,
      productId: inventory.productId,
      unitId: inventory.unitId,
      quantity,
      remarks: "Seed transfer item",
    });

    movementRows.push(
      {
        movementNo: movementNo(movementIndex),
        shopId: from._id,
        productId: inventory.productId,
        unitId: inventory.unitId,
        movementType: "TRANSFER_OUT",
        quantity,
        quantityEffect: -quantity,
        fromShopId: from._id,
        toShopId: to._id,
        referenceType: "Transfer",
        referenceId: transferId,
        createdBy: admin._id,
        movementDate: transferDate,
        remarks: "Seed transfer out",
      },
      {
        movementNo: movementNo(movementIndex + 1),
        shopId: to._id,
        productId: inventory.productId,
        unitId: inventory.unitId,
        movementType: "TRANSFER_IN",
        quantity,
        quantityEffect: quantity,
        fromShopId: from._id,
        toShopId: to._id,
        referenceType: "Transfer",
        referenceId: transferId,
        createdBy: admin._id,
        movementDate: transferDate,
        remarks: "Seed transfer in",
      }
    );

    movementIndex += 2;
  }

  await Transfer.insertMany(transferRows);
  await TransferItem.insertMany(transferItemRows);
  await InventoryMovement.insertMany(movementRows);

  return movementIndex;
};

const seedWaste = async ({ pairs, admin, movementIndexStart }) => {
  let movementIndex = movementIndexStart;
  const wasteRows = [];
  const wasteItemRows = [];
  const movementRows = [];

  for (let index = 0; index < 15; index += 1) {
    const shop = pairs[index].shop;
    const inventory = await Inventory.findOne({ shopId: shop._id });

    if (!inventory || inventory.quantity < 2) {
      continue;
    }

    const quantity = 1;
    const wasteDate = new Date();
    wasteDate.setDate(wasteDate.getDate() - (index % 7));
    const wasteId = new mongoose.Types.ObjectId();

    inventory.quantity -= quantity;
    inventory.lastMovementAt = wasteDate;
    await inventory.save();

    wasteRows.push({
      _id: wasteId,
      wasteNo: wasteNo(index + 1),
      shopId: shop._id,
      wasteDate,
      reason: index % 2 === 0 ? "Damaged" : "Expired",
      remarks: "Seed waste record",
      createdBy: admin._id,
    });

    wasteItemRows.push({
      wasteId,
      productId: inventory.productId,
      unitId: inventory.unitId,
      quantity,
      remarks: "Seed waste item",
    });

    movementRows.push({
      movementNo: movementNo(movementIndex),
      shopId: shop._id,
      productId: inventory.productId,
      unitId: inventory.unitId,
      movementType: "WASTE",
      quantity,
      quantityEffect: -quantity,
      referenceType: "Waste",
      referenceId: wasteId,
      createdBy: admin._id,
      movementDate: wasteDate,
      remarks: "Seed waste movement",
    });

    movementIndex += 1;
  }

  await Waste.insertMany(wasteRows);
  await WasteItem.insertMany(wasteItemRows);
  await InventoryMovement.insertMany(movementRows);
};

export const resetAndSeedDatabase = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Seed reset is disabled in production",
      });
    }

    if (req.headers["x-seed-confirm"] !== CONFIRMATION) {
      return res.status(400).json({
        success: false,
        message: "Missing seed confirmation header",
      });
    }

    await clearDatabase();

    const [units, categories, admin] = await Promise.all([
      seedUnits(),
      seedCategories(),
      seedAdmin(),
    ]);

    const products = await seedProducts({ units, categories });
    const pairs = await seedShopkeepersAndShops();
    const afterStockMovementIndex = await seedInventory({ pairs, products, admin });
    const afterTransferMovementIndex = await seedTransfers({
      pairs,
      admin,
      movementIndexStart: afterStockMovementIndex,
    });
    await seedWaste({
      pairs,
      admin,
      movementIndexStart: afterTransferMovementIndex,
    });

    const counts = {
      users: await User.countDocuments(),
      shops: await Shop.countDocuments(),
      categories: await Category.countDocuments(),
      units: await Unit.countDocuments(),
      products: await Product.countDocuments(),
      inventoryRows: await Inventory.countDocuments(),
      movements: await InventoryMovement.countDocuments(),
      transfers: await Transfer.countDocuments(),
      transferItems: await TransferItem.countDocuments(),
      wasteRecords: await Waste.countDocuments(),
      wasteItems: await WasteItem.countDocuments(),
    };

    return res.status(201).json({
      success: true,
      message: "Database reset and seeded successfully",
      credentials: {
        admin: {
          email: "admin@test.com",
          password: "123456",
        },
        shopkeeperPassword: "123456",
        shopkeeperEmailPattern: "shop1@test.com ... shop25@test.com",
      },
      counts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
