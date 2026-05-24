import { PackagePlus, Search, Send } from 'lucide-react'

export function StockView({
  filteredInventory,
  highlightedRowKeys,
  isLoggedIn,
  onLoadMoreStock,
  onOpenAddStock,
  onOpenTransferStock,
  onStockSearchChange,
  stockHasMore,
  stockSummary,
  stockSearch,
  visibleInventory,
}) {
  return (
    <div className="stock-page">
      <div className="summary-grid">
        <article className="summary-card">
          <span>Products In View</span>
          <strong>{stockSummary.totalProducts}</strong>
        </article>
        <article className="summary-card warning">
          <span>Low Stock</span>
          <strong>{stockSummary.lowStockCount}</strong>
        </article>
        <article className="summary-card">
          <span>Total Quantity</span>
          <strong>{stockSummary.totalQuantity.toFixed(3)}</strong>
        </article>
        <article className="summary-card">
          <span>Last Movement</span>
          <strong>{stockSummary.lastMovementDate || '-'}</strong>
        </article>
      </div>

      <div className="stock-actions">
        <button type="button" onClick={onOpenAddStock} disabled={!isLoggedIn}>
          <PackagePlus size={16} />
          Add Stock
        </button>
        <button
          type="button"
          className="secondary-action"
          onClick={onOpenTransferStock}
          disabled={!isLoggedIn}
        >
          <Send size={16} />
          Transfer Stock
        </button>
      </div>

      <section className="stock-table-panel">
        <div className="section-toolbar">
          <div>
            <h3>Inventory</h3>
            <span>
              Showing {visibleInventory.length} of {filteredInventory.length} item rows
            </span>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              value={stockSearch}
              onChange={(event) => onStockSearchChange(event.target.value)}
              placeholder="Search stock"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Branch</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleInventory.map((item) => {
                const shopKey = item.shopId?._id || item.shopId
                const productKey = item.productId?._id || item.productId
                const rowKey = `${shopKey}|${productKey}`
                const quantity = Number(item.quantity || 0)
                const minimumStock = Number(item.productId?.minimumStock || 0)
                const reorderLevel = Number(item.productId?.reorderLevel || 0)
                const isLow = minimumStock > 0 && quantity <= minimumStock
                const isReorder = reorderLevel > 0 && quantity <= reorderLevel

                return (
                <tr
                  key={item._id}
                  className={[
                    highlightedRowKeys.includes(rowKey) ? 'row-highlight' : '',
                    isLow || isReorder ? 'row-warning' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <td>
                    <strong>{item.productId?.itemCode || '-'}</strong>
                    <span>{item.productId?.description || ''}</span>
                  </td>
                  <td>
                    <strong>{item.shopId?.code || '-'}</strong>
                    <span>{item.shopId?.name || ''}</span>
                  </td>
                  <td>{quantity.toFixed(3)}</td>
                  <td>{item.unitId?.shortName || item.unitId?.name || '-'}</td>
                  <td>
                    {isLow ? (
                      <span className="stock-badge danger">Low</span>
                    ) : isReorder ? (
                      <span className="stock-badge warning">Reorder</span>
                    ) : (
                      <span className="stock-badge">Ok</span>
                    )}
                  </td>
                </tr>
                )
              })}
              {!filteredInventory.length && (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    No stock rows loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {stockHasMore && (
          <div className="table-footer">
            <button type="button" className="secondary-action" onClick={onLoadMoreStock}>
              Load more stock
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
