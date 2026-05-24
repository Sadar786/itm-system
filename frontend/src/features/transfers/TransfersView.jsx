export function TransfersView({
  busyKey,
  onLoadMoreTransfers,
  onSelectTransfer,
  transferPagination,
  transfers,
}) {
  const hasMore =
    transferPagination.page < transferPagination.pages &&
    transfers.length < transferPagination.total

  return (
    <section className="history-panel">
      <div className="section-toolbar">
        <div>
          <h3>Recent Transfers</h3>
          <span>
            Showing {transfers.length} of {transferPagination.total} records
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr
                key={transfer._id}
                className="clickable-row"
                onClick={() => onSelectTransfer(transfer)}
              >
               
                <td>{new Date(transfer.transferDate).toISOString().slice(0, 10)}</td>
                <td>
                  {transfer.items?.length
                    ? transfer.items.map((item) => (
                        <div className="item-line" key={item._id}>
                          <strong>
                            {item.productId?.itemCode || '-'}{' '}
                            {item.productId?.description || ''}
                          </strong>
                          <span>
                            {Number(item.quantity || 0).toFixed(3)}{' '}
                            {item.unitId?.shortName || item.unitId?.name || ''}
                          </span>
                        </div>
                      ))
                    : '-'}
                </td>
                <td>
                  <strong>{transfer.fromShopId?.code || '-'}</strong>
                  <span>{transfer.fromShopId?.name || ''}</span>
                </td>
                <td>
                  <strong>{transfer.toShopId?.code || '-'}</strong>
                  <span>{transfer.toShopId?.name || ''}</span>
                </td>
                <td>{transfer.status || '-'}</td>
                <td>{transfer.remarks || '-'}</td>
              </tr>
            ))}
            {!transfers.length && (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No transfers loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="table-footer">
          <button
            type="button"
            className="secondary-action"
            onClick={onLoadMoreTransfers}
            disabled={busyKey === 'transfers-load-more'}
          >
            {busyKey === 'transfers-load-more' ? 'Loading...' : 'Load more transfers'}
          </button>
        </div>
      )}
    </section>
  )
}
