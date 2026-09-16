import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import Waste from "../models/Waste.js";
import WasteItem from "../models/WasteItem.js";
import Shop from "../models/Shop.js";
import AppError from "../utils/AppError.js";

export function parseAnalyticsTableOptions(query = {}) {
  const integer = (value, fallback, name) => {
    if (value === undefined) return fallback;
    if (!["string", "number"].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw new AppError(`${name} must be a positive integer`, 400);
    }
    return Number(value);
  };
  const page = integer(query.page, 1, "page");
  const limit = integer(query.limit, 10, "limit");
  if (![10, 25, 50].includes(limit)) throw new AppError("limit must be 10, 25, or 50", 400);
  if (!Number.isSafeInteger((page - 1) * limit)) throw new AppError("page is too large", 400);
  if (query.search !== undefined && (typeof query.search !== "string" || query.search.length > 200)) {
    throw new AppError("search must be text of at most 200 characters", 400);
  }
  return { page, limit, search: (query.search || "").trim() };
}

function paginationFor(total, { page, limit }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { total, page: Math.min(page, pages), pages, limit };
}

const literalPattern = value => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
const searchFields = (search, fields) => search ? { $or: fields.map(field => ({ [field]: literalPattern(search) })) } : {};

export async function analyticsBranches({ branch, transferMatch, wasteMatch }, options) {
  const match = { ...(branch ? { _id: branch } : {}), ...searchFields(options.search, ["name", "code"]) };
  const pagination = paginationFor(await Shop.countDocuments(match), options);
  const [shops, transferCounts, wasteCounts] = await Promise.all([
    Shop.find(match).select("name code").sort({ name: 1, _id: 1 })
      .skip((pagination.page - 1) * pagination.limit).limit(pagination.limit).lean(),
    Transfer.aggregate([{ $match: transferMatch }, { $group: {
      _id: { from: "$fromShopId", to: "$toShopId", status: "$status" }, count: { $sum: 1 },
    } }]),
    Waste.aggregate([{ $match: wasteMatch }, { $group: { _id: "$shopId", count: { $sum: 1 } } }]),
  ]);
  const comparison = new Map(shops.map(shop => [String(shop._id), { ...shop, sent: 0, received: 0, pending: 0, wastage: 0 }]));
  for (const row of transferCounts) {
    const from = comparison.get(String(row._id.from));
    const to = comparison.get(String(row._id.to));
    if (row._id.status === "delivered") {
      if (from) from.sent += row.count;
      if (to) to.received += row.count;
    }
    if (row._id.status === "in_transit") {
      if (from) from.pending += row.count;
      if (to && to !== from) to.pending += row.count;
    }
  }
  for (const row of wasteCounts) {
    const shop = comparison.get(String(row._id));
    if (shop) shop.wastage += row.count;
  }
  return { rows: [...comparison.values()], pagination };
}

export async function analyticsPending({ transferMatch }, options) {
  let match = { ...transferMatch, status: "in_transit" };
  if (options.search) {
    const shops = await Shop.find(searchFields(options.search, ["name", "code"])).select("_id").lean();
    const branchIds = shops.map(shop => shop._id);
    const search = searchFields(options.search, ["transferNo", "controlNumber"]);
    search.$or.push({ fromShopId: { $in: branchIds } }, { toShopId: { $in: branchIds } });
    // Keep the authorization's branch $or separate from the search's $or.
    match = { $and: [match, search] };
  }
  const pagination = paginationFor(await Transfer.countDocuments(match), options);
  const pending = await Transfer.find(match).sort({ transferDate: 1, _id: 1 })
    .skip((pagination.page - 1) * pagination.limit).limit(pagination.limit)
    .populate("fromShopId", "name code").populate("toShopId", "name code").populate("createdBy", "name").lean();
  const items = pending.length ? await TransferItem.find({ transferId: { $in: pending.map(row => row._id) } })
    .populate("productId", "itemCode description").populate("unitId", "name shortName").lean() : [];
  const grouped = new Map();
  for (const item of items) {
    const key = String(item.transferId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return { rows: pending.map(row => ({ ...row, items: grouped.get(String(row._id)) || [] })), pagination };
}

export async function analyticsProducts({ wasteMatch }, options) {
  const pipeline = [
    { $match: wasteMatch },
    { $lookup: { from: WasteItem.collection.name, localField: "_id", foreignField: "wasteId", as: "items" } },
    { $unwind: "$items" },
    { $group: { _id: { productId: "$items.productId", unitId: "$items.unitId" }, quantity: { $sum: "$items.quantity" }, records: { $addToSet: "$_id" } } },
    { $lookup: { from: "products", localField: "_id.productId", foreignField: "_id", as: "product" } },
    { $lookup: { from: "units", localField: "_id.unitId", foreignField: "_id", as: "unit" } },
    { $project: { quantity: 1, records: { $size: "$records" }, product: { $arrayElemAt: ["$product", 0] }, unit: { $arrayElemAt: ["$unit", 0] } } },
    ...(options.search ? [{ $match: searchFields(options.search, ["product.description", "product.itemCode", "unit.name", "unit.shortName"]) }] : []),
  ];
  const sort = { $sort: { records: -1, "product.description": 1, "_id.productId": 1, "_id.unitId": 1 } };
  const [result = { rows: [], count: [] }] = await Waste.aggregate([...pipeline, { $facet: {
    count: [{ $count: "total" }],
    rows: [sort, { $skip: (options.page - 1) * options.limit }, { $limit: options.limit }],
  } }]);
  const pagination = paginationFor(result.count[0]?.total || 0, options);
  // A deleted last page (or a stale link) should return the last available page.
  const rows = pagination.page !== options.page && pagination.total > 0
    ? await Waste.aggregate([...pipeline, sort, { $skip: (pagination.page - 1) * pagination.limit }, { $limit: pagination.limit }])
    : result.rows;
  return { rows, pagination };
}

export const analyticsTableHandlers = { branches: analyticsBranches, products: analyticsProducts, pending: analyticsPending };
