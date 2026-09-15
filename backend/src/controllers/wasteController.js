import ExcelJS from "exceljs";
import Waste from "../models/Waste.js";
import WasteItem from "../models/WasteItem.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createWasteService, resolveWasteShop, validateId, parseWasteDate } from "../services/wasteService.js";

const populateWaste = (query) => query.populate("shopId", "name code").populate("createdBy", "name email");
const populateItems = (query) => query.populate("productId", "itemCode description").populate("unitId", "name shortName");

export const createWaste = asyncHandler(async (req, res) => {
  const data = await createWasteService(req.user, req.body);
  res.status(201).json({ success: true, message: "Wastage recorded successfully", data });
});

const listWastes = async (req) => {
  const shopId = resolveWasteShop(req.user, req.query.shopId);
  const query = shopId ? { shopId } : {};
  const { startDate, endDate, productId } = req.query;
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== "string" || req.query.search.length > 200) throw new AppError("Invalid search", 400);
    const search = req.query.search.trim();
    if (search) {
      const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const [products, shops] = await Promise.all([
        Product.find({ $or: [{ description: expression }, { itemCode: expression }] }).select("_id"),
        Shop.find({ $or: [{ name: expression }, { code: expression }] }).select("_id"),
      ]);
      const wasteIds = await WasteItem.distinct("wasteId", {
        productId: { $in: products.map((product) => product._id) },
      });
      query.$or = [
        { reason: expression }, { remarks: expression }, { wasteNo: expression },
        { shopId: { $in: shops.map((shop) => shop._id) } },
        { _id: { $in: wasteIds } },
      ];
    }
  }
  if (startDate !== undefined || endDate !== undefined) {
    query.wasteDate = {};
    if (startDate !== undefined) query.wasteDate.$gte = parseWasteDate(startDate, "startDate");
    if (endDate !== undefined) {
      const end = parseWasteDate(endDate, "endDate");
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) end.setUTCHours(23, 59, 59, 999);
      query.wasteDate.$lte = end;
    }
    if (query.wasteDate.$gte > query.wasteDate.$lte) throw new AppError("startDate must not be after endDate", 400);
  }
  if (productId !== undefined) {
    const id = validateId(productId, "productId");
    query._id = { $in: await WasteItem.distinct("wasteId", { productId: id }) };
  }
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new AppError("page must be a positive integer and limit must be between 1 and 100", 400);
  }
  const [total, wastes] = await Promise.all([
    Waste.countDocuments(query),
    populateWaste(Waste.find(query).sort({ wasteDate: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
  ]);
  const items = await populateItems(WasteItem.find({ wasteId: { $in: wastes.map((waste) => waste._id) } })).lean();
  const grouped = new Map();
  for (const item of items) {
    const key = item.wasteId.toString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return { success: true, data: wastes.map((waste) => ({ ...waste, items: grouped.get(waste._id.toString()) || [] })), pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const getWastes = asyncHandler(async (req, res) => { res.json(await listWastes(req)); });

export const getWaste = asyncHandler(async (req, res) => {
  const shopId = resolveWasteShop(req.user);
  const query = { _id: validateId(req.params.id, "waste id"), ...(shopId ? { shopId } : {}) };
  const waste = await populateWaste(Waste.findOne(query));
  if (!waste) throw new AppError("Wastage not found", 404);
  const items = await populateItems(WasteItem.find({ wasteId: waste._id }));
  res.json({ success: true, data: { waste, items } });
});

export const exportWastes = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Wastage");
  sheet.columns = [
    ["Reference", "reference", 45], ["Wastage date (UTC)", "date", 25],
    ["Recorded at (UTC)", "recorded", 25], ["Branch code", "branchCode", 18],
    ["Branch", "branch", 28], ["Product code", "productCode", 18],
    ["Product", "product", 35], ["Quantity", "quantity", 15], ["Unit", "unit", 15],
    ["Reason", "reason", 30], ["Remarks", "remarks", 35],
    ["Item remarks", "itemRemarks", 30], ["Recorded by", "creator", 25],
  ].map(([header, key, width]) => ({ header, key, width }));
  let page = 1;
  let pages = 1;
  do {
    const result = await listWastes({ user: req.user, query: { ...req.query, page: String(page), limit: "100" } });
    for (const waste of result.data) {
      for (const item of waste.items.length ? waste.items : [{}]) {
        sheet.addRow({ reference: waste.wasteNo, date: waste.wasteDate, recorded: waste.createdAt,
          branchCode: waste.shopId?.code, branch: waste.shopId?.name,
          productCode: item.productId?.itemCode, product: item.productId?.description,
          quantity: item.quantity, unit: item.unitId?.shortName || item.unitId?.name,
          reason: waste.reason, remarks: waste.remarks, itemRemarks: item.remarks, creator: waste.createdBy?.name });
      }
    }
    pages = result.pagination.pages;
    page += 1;
  } while (page <= pages);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = "A1:M1";
  sheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm:ss";
  sheet.getColumn("recorded").numFmt = "yyyy-mm-dd hh:mm:ss";
  sheet.getColumn("quantity").numFmt = "0.######";
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="wastage-report.xlsx"');
  res.send(buffer);
});
