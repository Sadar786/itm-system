import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Modal } from '../../components/Modal'

export function TransferDetailModal({ isOpen, onClose, transfer }) {
  const [searchTerm, setSearchTerm] = useState('')

  if (!transfer) return null

  const filteredItems = (transfer.items || []).filter((item) => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) return true

    return (
      item.productId?.itemCode?.toLowerCase().includes(search) ||
      item.productId?.description?.toLowerCase().includes(search) ||
      item.remarks?.toLowerCase().includes(search)
    )
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Details"
    >
      <div className="detail-panel">

        <div className="detail-grid">

          <div>
            <span>Transfer No</span>
            <strong>{transfer.transferNo || '-'}</strong>
          </div>

          <div>
            <span>Date</span>
            <strong>
              {new Date(
                transfer.transferDate
              ).toLocaleDateString()}
            </strong>
            <small>
              {new Date(
                transfer.transferDate
              ).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </small>
          </div>

          <div>
            <span>From</span>
            <strong>
              {transfer.fromShopId?.code || '-'}
            </strong>
            <small>
              {transfer.fromShopId?.name || ''}
            </small>
          </div>

          <div>
            <span>To</span>
            <strong>
              {transfer.toShopId?.code || '-'}
            </strong>
            <small>
              {transfer.toShopId?.name || ''}
            </small>
          </div>

        </div>

        <div className="detail-items">

          <div className="detail-items-header">
            <h3>
              Items ({filteredItems.length}
              {filteredItems.length !== transfer.items?.length
                ? ` / ${transfer.items?.length || 0}`
                : ''}
              )
            </h3>

            <div className="detail-item-search">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search items..."
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {filteredItems.map((item) => (
            <div
              className="detail-item"
              key={item._id}
            >
              <div>
                <strong>
                  {item.productId?.itemCode || '-'}{' '}
                  {item.productId?.description || ''}
                </strong>

                <span>
                  {item.remarks || ''}
                </span>
              </div>

              <strong>
                {Number(item.quantity || 0).toFixed(3)}{' '}
                {item.unitId?.shortName ||
                  item.unitId?.name ||
                  ''}
              </strong>
            </div>
          ))}

          {!filteredItems.length && (
            <div className="empty-cell">
              No items found for "{searchTerm}".
            </div>
          )}

        </div>

        <div className="detail-note">
          <span>Remarks</span>
          <strong>
            {transfer.remarks || '-'}
          </strong>
        </div>

      </div>
    </Modal>
  )
}