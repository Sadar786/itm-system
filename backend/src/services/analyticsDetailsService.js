import { analyticsBranches, analyticsPending, analyticsProducts, parseAnalyticsTableOptions } from "./analyticsTableService.js";

export async function analyticsDetails(context) {
  const options = parseAnalyticsTableOptions();
  const [branches, pending, products] = await Promise.all([
    analyticsBranches(context, options), analyticsPending(context, options), analyticsProducts(context, options),
  ]);
  return {
    branches: branches.rows,
    pending: pending.rows,
    products: products.rows,
    pagination: { branches: branches.pagination, pending: pending.pagination, products: products.pagination },
  };
}
