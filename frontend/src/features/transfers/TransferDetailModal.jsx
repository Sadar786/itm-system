import { Modal } from '../../components/Modal'

export function TransferDetailModal({ isOpen, onClose, transfer }) {
  if (!transfer) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Details">
      <div className="detail-panel">
        <div className="detail-grid">
          <div>
            <span>Transfer No</span>
            <strong>{transfer.transferNo || '-'}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{new Date(transfer.transferDate).toISOString().slice(0, 10)}</strong>
          </div>
          <div>
            <span>From</span>
            <strong>{transfer.fromShopId?.code || '-'}</strong>
            <small>{transfer.fromShopId?.name || ''}</small>
          </div>
          <div>
            <span>To</span>
            <strong>{transfer.toShopId?.code || '-'}</strong>
            <small>{transfer.toShopId?.name || ''}</small>
          </div>
        </div>

        <div className="detail-items">
          <h3>Items</h3>
          {transfer.items?.map((item) => (
            <div className="detail-item" key={item._id}>
              <div>
                <strong>
                  {item.productId?.itemCode || '-'} {item.productId?.description || ''}
                </strong>
                <span>{item.remarks || ''}</span>
              </div>
              <strong>
                {Number(item.quantity || 0).toFixed(3)}{' '}
                {item.unitId?.shortName || item.unitId?.name || ''}
              </strong>
            </div>
          ))}
        </div>

        <div className="detail-note">
          <span>Remarks</span>
          <strong>{transfer.remarks || '-'}</strong>
        </div>
      </div>
    </Modal>
  )
}
