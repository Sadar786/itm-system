import { PackagePlus, Send } from 'lucide-react'

export function StockView({
  isLoggedIn,
  movements,
  onOpenAddStock,
  onOpenTransferStock,
}) {
  const incomingCount = movements.filter(
    (movement) => movement.movementType === 'IN',
  ).length
  const transferCount = movements.filter((movement) =>
    movement.movementType?.startsWith('TRANSFER'),
  ).length
  const recentMovements = movements.slice(0, 20)

  return (
    <div className="stock-page">
      <div className="summary-grid">
        
        <article className="summary-card">
          <span>Transfers</span>
          <strong>{transferCount}</strong>
        </article>
        <article className="summary-card">
          <span>Movement Records</span>
          <strong>{movements.length}</strong>
        </article>
      </div>

      <div className="stock-actions">
        
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
            <h3>Daily Stock Actions</h3>
            <span>Showing incoming and transfer records for the selected report dates.</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Branch</th>
                <th>Related Branch</th>
                <th>Qty</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((movement) => (
                <tr key={movement.movementNo}>
                  <td>{new Date(movement.movementDate).toISOString().slice(0, 10)}</td>
                  <td>{movement.movementType}</td>
                  <td>
                    <strong>{movement.itemCode || '-'}</strong>
                    <span>{movement.product || ''}</span>
                  </td>
                  <td>
                    <strong>{movement.shopCode || '-'}</strong>
                    <span>{movement.shopName || ''}</span>
                  </td>
                  <td>
                    <strong>{movement.relatedShopCode || '-'}</strong>
                    <span>{movement.relatedShopName || ''}</span>
                  </td>
                  <td>{Number(movement.quantity || 0).toFixed(3)}</td>
                  <td>{movement.unit || '-'}</td>
                </tr>
              ))}
              {!recentMovements.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    No movement records found for the selected dates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
