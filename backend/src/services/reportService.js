import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import AppError from "../utils/AppError.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildDateQuery = ({ startDate, endDate }) => {
  const dateQuery = {};

  if (startDate) {
    dateQuery.$gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery.$lte = end;
  }

  return Object.keys(dateQuery).length ? dateQuery : undefined;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const startOfUtcDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
};

const getTransferMatrixDateRange = ({ month, startDate, endDate }) => {
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AppError("Invalid month. Use YYYY-MM", 400);
  }

  const monthDate = month ? new Date(`${month}-01T00:00:00.000Z`) : null;
  const anchor = startDate || endDate || monthDate || new Date();
  const anchorDate = new Date(anchor);
  const start = startDate
    ? startOfUtcDay(startDate)
    : new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
  const end = endDate
    ? startOfUtcDay(endDate)
    : new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 0));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError("Invalid startDate or endDate", 400);
  }

  if (start > end) {
    throw new AppError("startDate cannot be after endDate", 400);
  }

  const dayCount = Math.floor((end - start) / DAY_MS) + 1;
  if (dayCount > 366) {
    throw new AppError("Transfer export date range cannot exceed 366 days", 400);
  }

  return Array.from({ length: dayCount }, (_, index) => (
    new Date(start.getTime() + index * DAY_MS)
  ));
};

const getShopName = (shop) => shop?.name || shop?.code || "";

const getShopId = (shop) => shop?._id?.toString() || shop?.toString() || "";

const getMonthlyTransferInventoryQuantities = async ({
  direction,
  transfers,
  items,
}) => {
  const transferById = new Map(
    transfers.map((transfer) => [transfer._id.toString(), transfer])
  );
  const productIds = new Set();
  const shopIds = new Set();

  items.forEach((item) => {
    const transfer = transferById.get(item.transferId.toString());
    if (!transfer) {
      return;
    }

    const productId = item.productId?._id?.toString() || item.productId?.toString();
    const existingShop = direction === "out" ? transfer.fromShopId : transfer.toShopId;
    const shopId = getShopId(existingShop);

    if (productId && shopId) {
      productIds.add(productId);
      shopIds.add(shopId);
    }
  });

  if (!productIds.size || !shopIds.size) {
    return new Map();
  }

  const inventoryRows = await Inventory.find({
    productId: { $in: [...productIds] },
    shopId: { $in: [...shopIds] },
  }).select("productId shopId quantity");

  return new Map(
    inventoryRows.map((item) => [
      `${item.shopId.toString()}|${item.productId.toString()}`,
      item.quantity,
    ])
  );
};

const buildMonthlyTransferRows = ({
  dates,
  direction,
  transfers,
  items,
  inventoryQuantities = new Map(),
}) => {
  const transferById = new Map(
    transfers.map((transfer) => [transfer._id.toString(), transfer])
  );
  const groupedRows = new Map();

  items.forEach((item) => {
    const transfer = transferById.get(item.transferId.toString());
    if (!transfer) {
      return;
    }

    const productId = item.productId?._id?.toString() || item.productId?.toString();
    const unitIdValue = item.unitId?._id?.toString() || item.unitId?.toString();
    const existingShop = direction === "out" ? transfer.fromShopId : transfer.toShopId;
    const transferShop = direction === "out" ? transfer.toShopId : transfer.fromShopId;
    const shopPairKey = [getShopId(existingShop), getShopId(transferShop)].join("|");
    const groupKey = [
      productId,
      unitIdValue,
      shopPairKey,
    ].join("|");
    const dayKey = `day_${toDateKey(transfer.transferDate)}`;
    const quantity = Number(item.quantity) || 0;

    if (!groupedRows.has(groupKey)) {
      const row = {
        _shopPairKey: shopPairKey,
        _transferTotal: 0,
        itemCode: item.productId?.itemCode || "",
        description: item.productId?.description || "",
        existingShopName: getShopName(existingShop),
        transferShopName: getShopName(transferShop),
        uom: item.unitId?.shortName || item.unitId?.name || "",
        total: inventoryQuantities.get(`${getShopId(existingShop)}|${productId}`) || 0,
      };

      dates.forEach((date) => {
        row[`day_${toDateKey(date)}`] = 0;
      });

      groupedRows.set(groupKey, row);
    }

    const row = groupedRows.get(groupKey);
    row[dayKey] = (row[dayKey] || 0) + quantity;
    row._transferTotal += quantity;
  });

  groupedRows.forEach((row) => {
    row.shopPairTotal = row._transferTotal;
    delete row._shopPairKey;
    delete row._transferTotal;
  });

  return [...groupedRows.values()].sort((left, right) => {
    const leftKey = `${left.itemCode}|${left.description}|${left.transferShopName}`;
    const rightKey = `${right.itemCode}|${right.description}|${right.transferShopName}`;
    return leftKey.localeCompare(rightKey, undefined, { numeric: true });
  });
};

export const getCurrentStockReport = async ({ shopId } = {}) => {
  const query = {};

  if (shopId) {
    if (!isValidObjectId(shopId)) {
      throw new AppError("Invalid shopId", 400);
    }

    query.shopId = shopId;
  }

  const inventory = await Inventory.find(query)
    .sort({ updatedAt: -1 })
    .populate("shopId", "name code")
    .populate("productId", "itemCode description minimumStock reorderLevel")
    .populate("unitId", "name shortName");

  return inventory.map((item) => ({
    shopCode: item.shopId?.code || "",
    shopName: item.shopId?.name || "",
    itemCode: item.productId?.itemCode || "",
    product: item.productId?.description || "",
    quantity: item.quantity,
    unit: item.unitId?.shortName || item.unitId?.name || "",
    minimumStock: item.productId?.minimumStock ?? 0,
    reorderLevel: item.productId?.reorderLevel ?? 0,
    lastMovementAt: item.lastMovementAt,
  }));
};

export const getStockDetailMatrixReport = async ({ shopId } = {}) => {
  const shopQuery = {};
  const inventoryQuery = {};

  if (shopId) {
    if (!isValidObjectId(shopId)) {
      throw new AppError("Invalid shopId", 400);
    }

    shopQuery._id = shopId;
    inventoryQuery.shopId = shopId;
  }

  const [shops, products, inventory] = await Promise.all([
    Shop.find(shopQuery).sort({ code: 1, name: 1 }).select("name code"),
    Product.find({ isActive: true })
      .sort({ itemCode: 1 })
      .populate("categoryId", "name")
      .populate("defaultUnitId", "name shortName"),
    Inventory.find(inventoryQuery)
      .populate("productId", "itemCode description")
      .populate("shopId", "name code")
      .populate("unitId", "name shortName"),
  ]);

  const quantityByProductAndShop = new Map();
  const lastMovementByProduct = new Map();

  inventory.forEach((item) => {
    const productId = item.productId?._id?.toString() || item.productId?.toString();
    const shopKey = item.shopId?._id?.toString() || item.shopId?.toString();

    if (!productId || !shopKey) {
      return;
    }

    if (!quantityByProductAndShop.has(productId)) {
      quantityByProductAndShop.set(productId, new Map());
    }

    quantityByProductAndShop.get(productId).set(shopKey, item.quantity);

    const currentLastMovement = lastMovementByProduct.get(productId);
    if (
      item.lastMovementAt &&
      (!currentLastMovement || item.lastMovementAt > currentLastMovement)
    ) {
      lastMovementByProduct.set(productId, item.lastMovementAt);
    }
  });

  const rows = products.map((product) => {
    const productId = product._id.toString();
    const shopQuantities = quantityByProductAndShop.get(productId) || new Map();
    const totalQuantity = shops.reduce(
      (total, shop) => total + (shopQuantities.get(shop._id.toString()) || 0),
      0
    );

    const row = {
      itemCode: product.itemCode,
      product: product.description,
      category: product.categoryId?.name || "",
      unit: product.defaultUnitId?.shortName || product.defaultUnitId?.name || "",
      totalQuantity,
      minimumStock: product.minimumStock ?? 0,
      reorderLevel: product.reorderLevel ?? 0,
      lastMovementAt: lastMovementByProduct.get(productId) || null,
    };

    shops.forEach((shop) => {
      row[`shop_${shop._id}`] = shopQuantities.get(shop._id.toString()) || 0;
    });

    return row;
  });

  return { shops, rows };
};

export const getTransferMatrixReport = async ({
  shopId,
  fromShopId,
  toShopId,
  month,
  startDate,
  endDate,
  status = "posted",
} = {}) => {
  const query = {};
  const andConditions = [];

  const validateShopId = (value, label) => {
    if (value && !isValidObjectId(value)) {
      throw new AppError(`Invalid ${label}`, 400);
    }
  };

  validateShopId(shopId, "shopId");
  validateShopId(fromShopId, "fromShopId");
  validateShopId(toShopId, "toShopId");

  if (shopId) {
    andConditions.push({
      $or: [{ fromShopId: shopId }, { toShopId: shopId }],
    });
  }

  if (fromShopId) {
    query.fromShopId = fromShopId;
  }

  if (toShopId) {
    query.toShopId = toShopId;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  const dates = getTransferMatrixDateRange({ month, startDate, endDate });
  const dateQuery = buildDateQuery({
    startDate: toDateKey(dates[0]),
    endDate: toDateKey(dates[dates.length - 1]),
  });
  query.transferDate = dateQuery;

  if (andConditions.length) {
    query.$and = andConditions;
  }

  const transfers = await Transfer.find(query)
    .sort({ transferDate: 1, createdAt: 1 })
    .populate("fromShopId", "name code")
    .populate("toShopId", "name code");

  if (!transfers.length) {
    return { dates, rows: [] };
  }

  const transferById = new Map(
    transfers.map((transfer) => [transfer._id.toString(), transfer])
  );

  const items = await TransferItem.find({
    transferId: { $in: transfers.map((transfer) => transfer._id) },
  })
    .populate("productId", "itemCode description")
    .populate("unitId", "name shortName");

  const groupedRows = new Map();

  items.forEach((item) => {
    const transfer = transferById.get(item.transferId.toString());
    if (!transfer) {
      return;
    }

    const productId = item.productId?._id?.toString() || item.productId?.toString();
    const fromShopIdValue =
      transfer.fromShopId?._id?.toString() || transfer.fromShopId?.toString();
    const toShopIdValue =
      transfer.toShopId?._id?.toString() || transfer.toShopId?.toString();
    const unitIdValue = item.unitId?._id?.toString() || item.unitId?.toString();
    const groupKey = [
      productId,
      fromShopIdValue,
      toShopIdValue,
      unitIdValue,
    ].join("|");
    const dayKey = `day_${toDateKey(transfer.transferDate)}`;

    if (!groupedRows.has(groupKey)) {
      const row = {
        itemCode: item.productId?.itemCode || "",
        description: item.productId?.description || "",
        senderBranch: transfer.fromShopId?.name || transfer.fromShopId?.code || "",
        receiverBranch: transfer.toShopId?.name || transfer.toShopId?.code || "",
        uom: item.unitId?.shortName || item.unitId?.name || "",
        total: 0,
      };

      dates.forEach((date) => {
        row[`day_${toDateKey(date)}`] = 0;
      });

      groupedRows.set(groupKey, row);
    }

    const row = groupedRows.get(groupKey);
    const quantity = Number(item.quantity) || 0;
    row[dayKey] = (row[dayKey] || 0) + quantity;
    row.total += quantity;
  });

  const rows = [...groupedRows.values()].sort((left, right) => {
    const leftKey = `${left.itemCode}|${left.senderBranch}|${left.receiverBranch}`;
    const rightKey = `${right.itemCode}|${right.senderBranch}|${right.receiverBranch}`;
    return leftKey.localeCompare(rightKey, undefined, { numeric: true });
  });

  return { dates, rows };
};

export const getMonthlyTransferStockReport = async ({
  shopId,
  direction,
  fromShopId,
  toShopId,
  month,
  startDate,
  endDate,
  status = "posted",
} = {}) => {
  if (!shopId) {
    throw new AppError("shopId is required", 400);
  }

  if (!isValidObjectId(shopId)) {
    throw new AppError("Invalid shopId", 400);
  }

  if (!["out", "in"].includes(direction)) {
    throw new AppError("direction must be out or in", 400);
  }

  if (fromShopId && !isValidObjectId(fromShopId)) {
    throw new AppError("Invalid fromShopId", 400);
  }

  if (toShopId && !isValidObjectId(toShopId)) {
    throw new AppError("Invalid toShopId", 400);
  }

  const dates = getTransferMatrixDateRange({ month, startDate, endDate });
  const query = {
    transferDate: buildDateQuery({
      startDate: toDateKey(dates[0]),
      endDate: toDateKey(dates[dates.length - 1]),
    }),
  };

  if (direction === "out") {
    query.fromShopId = shopId;
    if (toShopId) {
      query.toShopId = toShopId;
    }
  } else {
    query.toShopId = shopId;
    if (fromShopId) {
      query.fromShopId = fromShopId;
    }
  }

  if (status && status !== "all") {
    query.status = status;
  }

  const transfers = await Transfer.find(query)
    .sort({
      transferDate: 1,
      createdAt: 1,
    })
    .populate("fromShopId", "name code")
    .populate("toShopId", "name code");

  if (!transfers.length) {
    return {
      dates,
      transferShopHeader:
        direction === "out" ? "TO TRANSFER SHOP NAME" : "FROM SHOP NAME",
      summaryTotalHeader:
        direction === "out" ? "TOTAL TRANSFER" : "TOTAL INCOMING",
      rows: [],
    };
  }

  const items = await TransferItem.find({
    transferId: { $in: transfers.map((transfer) => transfer._id) },
  })
    .populate("productId", "itemCode description")
    .populate("unitId", "name shortName");

  const inventoryQuantities = await getMonthlyTransferInventoryQuantities({
    direction,
    transfers,
    items,
  });

  return {
    dates,
    transferShopHeader:
      direction === "out" ? "TO TRANSFER SHOP NAME" : "FROM SHOP NAME",
    summaryTotalHeader:
      direction === "out" ? "TOTAL TRANSFER" : "TOTAL INCOMING",
    rows: buildMonthlyTransferRows({
      dates,
      direction,
      transfers,
      items,
      inventoryQuantities,
    }),
  };
};

export const getAllShopMonthlyTransferStockReport = async ({
  direction,
  shopId,
  month,
  startDate,
  endDate,
  status = "posted",
} = {}) => {
  if (!["out", "in"].includes(direction)) {
    throw new AppError("direction must be out or in", 400);
  }

  if (shopId && !isValidObjectId(shopId)) {
    throw new AppError("Invalid shopId", 400);
  }

  const dates = getTransferMatrixDateRange({ month, startDate, endDate });
  const query = {
    transferDate: buildDateQuery({
      startDate: toDateKey(dates[0]),
      endDate: toDateKey(dates[dates.length - 1]),
    }),
  };

  if (shopId) {
    if (direction === "out") {
      query.fromShopId = shopId;
    } else {
      query.toShopId = shopId;
    }
  }

  if (status && status !== "all") {
    query.status = status;
  }

  const transfers = await Transfer.find(query)
    .sort({
      transferDate: 1,
      createdAt: 1,
    })
    .populate("fromShopId", "name code")
    .populate("toShopId", "name code");

  if (!transfers.length) {
    return {
      dates,
      shopHeader: "SHOP NAME",
      transferShopHeader:
        direction === "out" ? "TRANSFER TO SHOP NAME" : "FROM SHOP NAME",
      summaryTotalHeader:
        direction === "out" ? "TOTAL TRANSFER" : "TOTAL INCOMING",
      rows: [],
    };
  }

  const items = await TransferItem.find({
    transferId: { $in: transfers.map((transfer) => transfer._id) },
  })
    .populate("productId", "itemCode description")
    .populate("unitId", "name shortName");

  const inventoryQuantities = await getMonthlyTransferInventoryQuantities({
    direction,
    transfers,
    items,
  });

  return {
    dates,
    shopHeader: "SHOP NAME",
    transferShopHeader:
      direction === "out" ? "TRANSFER TO SHOP NAME" : "FROM SHOP NAME",
    summaryTotalHeader:
      direction === "out" ? "TOTAL TRANSFER" : "TOTAL INCOMING",
    rows: buildMonthlyTransferRows({
      dates,
      direction,
      transfers,
      items,
      inventoryQuantities,
    }),
  };
};

export const getMovementReport = async ({
  shopId,
  productId,
  movementType,
  startDate,
  endDate,
} = {}) => {
  const query = {};

  if (shopId) {
    if (!isValidObjectId(shopId)) {
      throw new AppError("Invalid shopId", 400);
    }

    query.shopId = shopId;
  }

  if (productId) {
    if (!isValidObjectId(productId)) {
      throw new AppError("Invalid productId", 400);
    }

    query.productId = productId;
  }

  if (movementType) {
    query.movementType = movementType;
  }

  const movementDate = buildDateQuery({ startDate, endDate });
  if (movementDate) {
    query.movementDate = movementDate;
  }

  const movements = await InventoryMovement.find(query)
    .sort({ movementDate: -1, createdAt: -1 })
    .populate("shopId", "name code")
    .populate("fromShopId", "name code")
    .populate("toShopId", "name code")
    .populate("productId", "itemCode description")
    .populate("unitId", "name shortName")
    .populate("createdBy", "name email");

  return movements.map((movement) => {
    const relatedShop =
      movement.movementType === "TRANSFER_OUT"
        ? movement.toShopId
        : movement.movementType === "TRANSFER_IN"
          ? movement.fromShopId
          : null;

    return {
      movementNo: movement.movementNo,
      movementDate: movement.movementDate,
      shopCode: movement.shopId?.code || "",
      shopName: movement.shopId?.name || "",
      fromShopCode: movement.fromShopId?.code || "",
      fromShopName: movement.fromShopId?.name || "",
      toShopCode: movement.toShopId?.code || "",
      toShopName: movement.toShopId?.name || "",
      relatedShopCode: relatedShop?.code || "",
      relatedShopName: relatedShop?.name || "",
      itemCode: movement.productId?.itemCode || "",
      product: movement.productId?.description || "",
      movementType: movement.movementType,
      quantity: movement.quantity,
      quantityEffect: movement.quantityEffect,
      unit: movement.unitId?.shortName || movement.unitId?.name || "",
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      createdBy: movement.createdBy?.name || "",
      remarks: movement.remarks || "",
    };
  });
};
