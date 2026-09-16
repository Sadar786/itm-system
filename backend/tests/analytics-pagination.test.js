import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import router from '../src/routes/analyticsRoutes.js';
import Transfer from '../src/models/Transfer.js';
import TransferItem from '../src/models/TransferItem.js';
import Waste from '../src/models/Waste.js';
import Shop from '../src/models/Shop.js';

const handler = router.stack.find(layer => layer.route?.path === '/tables/:section').route.stack[0].handle;
const invoke = (section, query = {}, user = { role: 'admin' }) => new Promise((resolve, reject) =>
  handler({ user, query, params: { section } }, { json: resolve }, reject));
const id = () => new mongoose.Types.ObjectId();
const matches = (row, query) => Object.entries(query).every(([field, value]) => {
  if (field === '$or') return value.some(condition => matches(row, condition));
  if (field === '$and') return value.every(condition => matches(row, condition));
  if (value instanceof RegExp) return value.test(row[field] || '');
  if (value?.$in) return value.$in.some(item => String(row[field]) === String(item));
  if (value?.$gte || value?.$lte) return (!value.$gte || row[field] >= value.$gte) && (!value.$lte || row[field] <= value.$lte);
  return String(row[field]) === String(value);
});
function queryChain(rows, onSlice = () => {}) {
  let start = 0;
  let limit = rows.length;
  const chain = {
    select() { return this; }, populate() { return this; },
    sort(order) {
      rows = [...rows].sort((a, b) => {
        for (const [field, direction] of Object.entries(order)) {
          if (a[field] < b[field]) return -direction;
          if (a[field] > b[field]) return direction;
        }
        return 0;
      });
      return this;
    },
    skip(value) { start = value; return this; },
    limit(value) { limit = value; return this; },
    async lean() { const result = rows.slice(start, start + limit); onSlice(result); return result; },
  };
  return chain;
}

test('branch comparison defaults to 10 rows, pages independently, searches literally, and clamps the last page', async t => {
  const shops = Array.from({ length: 23 }, (_, index) => ({ _id: id(), name: `Branch ${String(index + 1).padStart(2, '0')}`, code: `B${index}` }));
  shops[14].code = 'B[14]';
  t.mock.method(Shop, 'countDocuments', async query => shops.filter(row => matches(row, query)).length);
  t.mock.method(Shop, 'find', query => queryChain(shops.filter(row => matches(row, query))));
  t.mock.method(Transfer, 'aggregate', async () => [{ _id: { from: shops[10]._id, to: shops[11]._id, status: 'delivered' }, count: 4 }]);
  t.mock.method(Waste, 'aggregate', async () => [{ _id: shops[10]._id, count: 2 }]);
  const first = (await invoke('branches')).data;
  const second = (await invoke('branches', { page: '2' })).data;
  assert.equal(first.rows.length, 10);
  assert.deepEqual(first.pagination, { total: 23, page: 1, pages: 3, limit: 10 });
  assert.equal(second.rows.length, 10);
  assert.equal(second.rows[0].name, 'Branch 11');
  assert.equal(second.rows[0].sent, 4);
  assert.equal(second.rows[0].wastage, 2);
  assert.equal(second.rows[1].received, 4);
  const last = (await invoke('branches', { page: '999' })).data;
  assert.equal(last.rows.length, 3);
  assert.equal(last.pagination.page, 3);
  const found = (await invoke('branches', { search: '[14]' })).data;
  assert.equal(found.rows.length, 1);
  assert.equal(found.rows[0].code, 'B[14]');
  assert.equal(found.pagination.total, 1);
  assert.equal((await invoke('branches', { limit: '25' })).data.rows.length, 23);
  const empty = (await invoke('branches', { search: 'Missing', page: '20' })).data;
  assert.deepEqual(empty, { rows: [], pagination: { total: 0, page: 1, pages: 1, limit: 10 } });
});

test('pending pagination preserves oldest-first order and fetches items only for displayed transfers', async t => {
  const branch = id();
  const other = id();
  const rows = Array.from({ length: 26 }, (_, index) => ({
    _id: id(), transferNo: `TR-${index + 1}`, fromShopId: branch, toShopId: other, status: 'in_transit',
    transferDate: new Date(`2026-05-${String(index + 1).padStart(2, '0')}T00:00:00Z`),
  })).reverse();
  let displayed;
  t.mock.method(Transfer, 'countDocuments', async query => rows.filter(row => matches(row, query)).length);
  t.mock.method(Transfer, 'find', query => queryChain(rows.filter(row => matches(row, query)), result => { displayed = result; }));
  const itemsMock = t.mock.method(TransferItem, 'find', query => {
    assert.deepEqual(query.transferId.$in, displayed.map(row => row._id));
    assert.ok(query.transferId.$in.length <= 10);
    return queryChain(displayed.map(row => ({ transferId: row._id, quantity: 3 })));
  });
  const user = { role: 'shop_keeper', shopId: branch };
  const first = (await invoke('pending', {}, user)).data;
  assert.equal(first.rows.length, 10);
  assert.equal(first.rows[0].transferNo, 'TR-1');
  assert.equal(first.rows[9].transferNo, 'TR-10');
  assert.equal(first.rows[0].items[0].quantity, 3);
  assert.deepEqual(first.pagination, { total: 26, page: 1, pages: 3, limit: 10 });
  const second = (await invoke('pending', { page: '2' }, user)).data;
  assert.equal(second.rows[0].transferNo, 'TR-11');
  const last = (await invoke('pending', { page: '999' }, user)).data;
  assert.equal(last.rows[0].transferNo, 'TR-21');
  assert.equal(last.rows.length, 6);
  assert.equal(last.pagination.page, 3);
  const dates = (await invoke('pending', { startDate: '2026-05-13', endDate: '2026-05-16' }, user)).data;
  assert.equal(dates.rows.length, 4);
  assert.equal(dates.rows[0].transferNo, 'TR-13');
  assert.equal(itemsMock.mock.callCount(), 4);
});

test('pending text and branch searches cannot replace the assigned-branch access restriction', async t => {
  const branch = id();
  const other = id();
  const hidden = id();
  const rows = [
    { _id: id(), fromShopId: branch, toShopId: other, status: 'in_transit', transferNo: 'TR.[1]', controlNumber: 'SPECIAL' },
    { _id: id(), fromShopId: other, toShopId: hidden, status: 'in_transit', transferNo: 'TR.[1]', controlNumber: 'SPECIAL' },
    { _id: id(), fromShopId: branch, toShopId: other, status: 'delivered', transferNo: 'TR.[1]' },
  ];
  const shops = [{ _id: other, name: 'Partner [East]', code: 'PE' }];
  t.mock.method(Shop, 'find', query => queryChain(shops.filter(row => matches(row, query))));
  t.mock.method(Transfer, 'countDocuments', async query => rows.filter(row => matches(row, query)).length);
  t.mock.method(Transfer, 'find', query => queryChain(rows.filter(row => matches(row, query))));
  t.mock.method(TransferItem, 'find', () => queryChain([]));
  const user = { role: 'shop_keeper', shopId: branch };
  for (const search of ['.[1]', 'SPECIAL', '[East]', 'PE']) {
    const result = (await invoke('pending', { search }, user)).data;
    assert.equal(result.pagination.total, 1);
    assert.equal(result.rows[0]._id, rows[0]._id);
  }
});

test('wastage product pagination counts product/unit groups and applies literal search after grouping', async t => {
  const branch = id();
  const grouped = Array.from({ length: 24 }, (_, index) => ({
    _id: { productId: id(), unitId: id() }, quantity: index + 1, records: 2,
    product: { description: `Product ${index + 1}`, itemCode: index === 12 ? 'P[12]' : `P${index}` },
    unit: { name: 'Kilogram', shortName: 'KG' },
  }));
  t.mock.method(Waste, 'aggregate', async pipeline => {
    assert.equal(String(pipeline[0].$match.shopId), String(branch));
    assert.equal(pipeline[0].$match.wasteDate.$gte.toISOString(), '2026-05-01T00:00:00.000Z');
    const group = pipeline.find(stage => stage.$group).$group;
    assert.deepEqual(group._id, { productId: '$items.productId', unitId: '$items.unitId' });
    assert.deepEqual(group.records, { $addToSet: '$_id' });
    const search = pipeline.find((stage, index) => index > 0 && stage.$match)?.$match;
    const filtered = grouped.filter(row => !search || search.$or.some(condition => Object.entries(condition).some(([path, pattern]) => {
      const [field, child] = path.split('.');
      return pattern.test(row[field][child]);
    })));
    const facet = pipeline.find(stage => stage.$facet)?.$facet;
    const pageStages = facet?.rows || pipeline;
    const start = pageStages.find(stage => stage.$skip)?.$skip || 0;
    const limit = pageStages.find(stage => stage.$limit).$limit;
    const rows = filtered.slice(start, start + limit);
    return facet ? [{ count: [{ total: filtered.length }], rows }] : rows;
  });
  const filters = { shopId: String(branch), startDate: '2026-05-01' };
  const first = (await invoke('products', filters)).data;
  assert.equal(first.rows.length, 10);
  assert.deepEqual(first.pagination, { total: 24, page: 1, pages: 3, limit: 10 });
  const second = (await invoke('products', { ...filters, page: '2' })).data;
  assert.equal(second.rows[0].product.description, 'Product 11');
  const last = (await invoke('products', { ...filters, page: '999' })).data;
  assert.equal(last.rows.length, 4);
  assert.equal(last.pagination.page, 3);
  const found = (await invoke('products', { ...filters, search: '[12]' })).data;
  assert.equal(found.pagination.total, 1);
  assert.equal(found.rows[0].product.itemCode, 'P[12]');
  assert.equal((await invoke('products', { ...filters, search: 'kg' })).data.pagination.total, 24);
});

test('table endpoints reject unauthorized filters and malformed pagination before database access', async () => {
  const user = { role: 'shop_keeper', shopId: id() };
  for (const section of ['branches', 'products', 'pending']) {
    await assert.rejects(invoke(section, { shopId: String(id()) }, user), { statusCode: 403 });
    await assert.rejects(invoke(section, {}, { role: 'shop_keeper' }), { statusCode: 403 });
    for (const query of [
      { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1e2' }, { page: 'bad' }, { page: [] }, { page: String(Number.MAX_SAFE_INTEGER) },
      { limit: '0' }, { limit: '11' }, { limit: '100' }, { search: {} }, { search: 'a'.repeat(201) },
      { startDate: 'bad' }, { startDate: '2026-06-01', endDate: '2026-05-01' }, { timezone: 'bad/timezone' },
    ]) await assert.rejects(invoke(section, query), { statusCode: 400 });
  }
  for (const section of ['unknown', 'constructor', '__proto__']) {
    await assert.rejects(invoke(section), { statusCode: 404 });
  }
});
