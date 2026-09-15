import Transfer from "../models/Transfer.js";
import TransferItem from "../models/TransferItem.js";
import Waste from "../models/Waste.js";
import Shop from "../models/Shop.js";

export async function analyticsDetails({ branch, transferMatch, wasteMatch }) {
  const [shops, transferCounts, wasteCounts, pending] = await Promise.all([
    Shop.find(branch ? { _id: branch } : {}).select("name code").sort({ name: 1 }).lean(),
    Transfer.aggregate([{ $match: transferMatch }, { $group: {
      _id: { from: "$fromShopId", to: "$toShopId", status: "$status" }, count: { $sum: 1 },
    } }]),
    Waste.aggregate([{ $match: wasteMatch }, { $group: { _id: "$shopId", count: { $sum: 1 } } }]),
    Transfer.find({ ...transferMatch, status: "in_transit" }).sort({ transferDate: 1, _id: 1 }).limit(10)
      .populate("fromShopId", "name code").populate("toShopId", "name code").populate("createdBy", "name").lean(),
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
  const items = await TransferItem.find({ transferId: { $in: pending.map(row => row._id) } })
    .populate("productId", "itemCode description").populate("unitId", "name shortName").lean();
  const grouped = new Map();
  for (const item of items) {
    const key = String(item.transferId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return {
    branches: [...comparison.values()],
    pending: pending.map(row => ({ ...row, items: grouped.get(String(row._id)) || [] })),
  };
}
