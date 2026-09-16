import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import router from '../src/routes/analyticsRoutes.js';
import Transfer from '../src/models/Transfer.js';
import Waste from '../src/models/Waste.js';
import Shop from '../src/models/Shop.js';
import TransferItem from '../src/models/TransferItem.js';
const handler = router.stack.find(layer => layer.route).route.stack[0].handle;
const invoke = (user, query = {}) => new Promise((resolve, reject) => handler({user,query}, {json:resolve}, reject));

test('analytics scopes every aggregation by branch/date and groups quantities by product/unit', async t => {
  const branch = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  const pendingId = new mongoose.Types.ObjectId();
  const chain = data => { const query = { select: () => query, sort: () => query, populate: () => query, skip: value => { assert.equal(value,0); return query; }, limit: value => { assert.equal(value,10); return query; }, lean: async () => data }; return query; };
  t.mock.method(Shop,'countDocuments',async query => { assert.equal(String(query._id),String(branch)); return 1; });
  t.mock.method(Transfer,'countDocuments',async query => { assert.equal(query.status,'in_transit'); assert.equal(String(query.$or[0].fromShopId),String(branch)); return 1; });
  t.mock.method(Shop,'find',query => { assert.equal(String(query._id),String(branch)); return chain([{_id:branch,name:'Test'}]); });
  t.mock.method(Transfer,'find',query => {
    assert.equal(query.status,'in_transit');
    assert.equal(String(query.$or[0].fromShopId),String(branch));
    assert.ok(query.transferDate.$gte instanceof Date);
    return chain([{_id:pendingId}]);
  });
  t.mock.method(TransferItem,'find',query => { assert.deepEqual(query.transferId.$in,[pendingId]); return chain([{transferId:pendingId,quantity:7}]); });
  t.mock.method(Transfer,'aggregate',async pipeline => {
    const match = pipeline[0].$match;
    assert.equal(match.$or[0].fromShopId.toString(),branch.toString());
    assert.ok(match.transferDate.$gte instanceof Date);
    if (pipeline[1].$group._id.from) return [{_id:{from:branch,to:other,status:'delivered'},count:2},{_id:{from:other,to:branch,status:'in_transit'},count:1}];
    return [{_id:{day:'2026-05-01',status:'delivered'},count:2},{_id:{day:'2026-05-01',status:'in_transit'},count:1}];
  });
  t.mock.method(Waste,'aggregate',async pipeline => {
    assert.equal(pipeline[0].$match.shopId.toString(),branch.toString());
    assert.ok(pipeline[0].$match.wasteDate.$gte instanceof Date);
    if (pipeline[1]?.$group?._id === '$shopId') return [{_id:branch,count:4}];
    if(pipeline.some(stage=>stage.$lookup)) {
      assert.deepEqual(pipeline.find(stage=>stage.$group).$group._id,{productId:'$items.productId',unitId:'$items.unitId'});
      return [];
    }
    return [{_id:'2026-05-01',count:4}];
  });
  const result=await invoke({role:'shop_keeper',shopId:branch},{startDate:'2026-05-01',timezone:'Asia/Karachi'});
  assert.deepEqual(result.data.summary,{total:3,in_transit:1,delivered:2,cancelled:0,wastage:4,incoming:0,outgoing:0});
  assert.equal(result.data.branches.length,1);
  assert.deepEqual(result.data.branches[0],{_id:branch,name:'Test',sent:2,received:0,pending:1,wastage:4});
  assert.equal(result.data.pending[0].items[0].quantity,7);
  assert.deepEqual(result.data.pagination.branches,{total:1,page:1,pages:1,limit:10});
  assert.deepEqual(result.data.pagination.pending,{total:1,page:1,pages:1,limit:10});
  assert.deepEqual(result.data.pagination.products,{total:0,page:1,pages:1,limit:10});
});
test('analytics rejects other branches, unassigned users, and invalid date/timezone filters',async()=>{
  await assert.rejects(invoke({role:'shop_keeper',shopId:new mongoose.Types.ObjectId()},{shopId:new mongoose.Types.ObjectId().toString()}),{statusCode:403});
  await assert.rejects(invoke({role:'shop_keeper'}),{statusCode:403});
  await assert.rejects(invoke({role:'admin'},{startDate:'2026-06-01',endDate:'2026-05-01'}),{statusCode:400});
  await assert.rejects(invoke({role:'admin'},{timezone:'bad/timezone'}),{statusCode:400});
});


test('five cancelled transfers count once in both overview and summary-only cards', async t => {
  const branch = new mongoose.Types.ObjectId();
  const chain = { select() { return this; }, sort() { return this; }, populate() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [] };
  t.mock.method(Shop, 'countDocuments', async () => 0);
  t.mock.method(Transfer, 'countDocuments', async () => 0);
  t.mock.method(Shop, 'find', () => chain);
  t.mock.method(Transfer, 'find', () => chain);
  t.mock.method(TransferItem, 'find', () => chain);
  t.mock.method(Waste, 'aggregate', async () => []);
  t.mock.method(Transfer, 'aggregate', async pipeline => {
    const group = pipeline[1].$group;
    if (group._id.from) return [];
    assert.deepEqual(group.count, { $sum: 1 });
    assert.equal(pipeline[0].$match.$or[0].fromShopId.toString(), branch.toString());
    assert.equal(pipeline[0].$match.transferDate.$gte.toISOString(), '2026-05-01T00:00:00.000Z');
    assert.deepEqual(group.incoming.$sum.$cond[0].$eq, ['$toShopId', branch]);
    assert.deepEqual(group.outgoing.$sum.$cond[0].$eq, ['$fromShopId', branch]);
    return [{ _id: { day: '2026-05-01', status: 'cancelled' }, count: 5, incoming: 2, outgoing: 3 }];
  });
  const query = { shopId: String(branch), startDate: '2026-05-01', timezone: 'Asia/Karachi' };
  const full = await invoke({ role: 'admin' }, query);
  const cards = await invoke({ role: 'admin' }, { ...query, summaryOnly: 'true' });
  assert.deepEqual(cards.data.summary, full.data.summary);
  assert.deepEqual(cards.data.summary, { total: 5, in_transit: 0, delivered: 0, cancelled: 5, wastage: 0, incoming: 2, outgoing: 3 });
  assert.equal(Shop.find.mock.callCount(), 1, 'summary-only skips branch details');
});


test('all-branch totals count a transfer once although it has both directions', async t => {
  t.mock.method(Transfer, 'aggregate', async pipeline => {
    assert.deepEqual(pipeline[0].$match, {});
    const group = pipeline[1].$group;
    assert.deepEqual(group.count, { $sum: 1 });
    assert.deepEqual(group.incoming, { $sum: 1 });
    assert.deepEqual(group.outgoing, { $sum: 1 });
    return [{ _id: { day: '2026-05-01', status: 'cancelled' }, count: 5, incoming: 5, outgoing: 5 }];
  });
  t.mock.method(Waste, 'aggregate', async () => []);
  const result = await invoke({ role: 'admin' }, { summaryOnly: 'true' });
  assert.equal(result.data.summary.total, 5);
  assert.equal(result.data.summary.cancelled, 5);
  assert.equal(result.data.summary.incoming, 5);
  assert.equal(result.data.summary.outgoing, 5);
});
