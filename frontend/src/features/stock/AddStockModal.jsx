import { PackagePlus, RefreshCw } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { formatProductName } from '../../utils/format'

export function AddStockModal({
  addStock,
  busyKey,
  isOpen,
  onAddStockChange,
  onClose,
  onProductChange,
  onProductSearchChange,
  onSubmit,
  productSearch,
  products,
  selectedProduct,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Stock">
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Product Search
          <input
            value={productSearch}
            onChange={(event) => onProductSearchChange(event.target.value)}
            placeholder="Search by item code or name"
          />
        </label>

        <label>
          Product
          <select
            value={addStock.productId}
            onChange={(event) => onProductChange(event.target.value)}
            required
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {formatProductName(product)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Unit ID
          <input
            value={addStock.unitId}
            onChange={(event) => onAddStockChange('unitId', event.target.value)}
            placeholder="Auto-filled from product"
            required
          />
        </label>

        {selectedProduct?.defaultUnitId && (
          <div className="unit-note">
            Unit:{' '}
            {selectedProduct.defaultUnitId.shortName ||
              selectedProduct.defaultUnitId.name}
          </div>
        )}

        <label>
          Quantity
          <input
            type="number"
            min="0.000001"
            step="0.001"
            value={addStock.quantity}
            onChange={(event) => onAddStockChange('quantity', event.target.value)}
            required
          />
        </label>

        <label>
          Remarks
          <textarea
            value={addStock.remarks}
            onChange={(event) => onAddStockChange('remarks', event.target.value)}
            placeholder="Supplier invoice, opening stock, correction..."
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busyKey === 'add-stock'}>
            {busyKey === 'add-stock' ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <PackagePlus size={16} />
            )}
            Add Stock
          </button>
        </div>
      </form>
    </Modal>
  )
}
