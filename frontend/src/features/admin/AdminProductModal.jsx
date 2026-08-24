import { Modal } from '../../components/Modal'

export function AdminProductModal({
  busyKey,
  categories,
  isOpen,
  isLoggedIn,
  onClose,
  onChange,
  onSubmit,
  productForm,
  units,
  isEdit,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'Create product'}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Item code
          <input
            value={productForm.itemCode}
            onChange={(event) => onChange('itemCode', event.target.value)}
            placeholder="Enter item code"
            required
          />
        </label>
        <label>
          Description
          <input
            value={productForm.description}
            onChange={(event) => onChange('description', event.target.value)}
            placeholder="Enter description"
            required
          />
        </label>
        <label>
          Category
          <select
            value={productForm.categoryId}
            onChange={(event) => onChange('categoryId', event.target.value)} 
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Default unit
          <select
            value={productForm.defaultUnitId}
            onChange={(event) => onChange('defaultUnitId', event.target.value)}
            required
          >
            <option value="">Select unit</option>
            {units.map((unit) => (
              <option key={unit._id} value={unit._id}>
                {unit.shortName || unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Barcode
          <input
            value={productForm.barcode}
            onChange={(event) => onChange('barcode', event.target.value)}
            placeholder="Enter barcode"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={productForm.isPerishable}
            onChange={(event) => onChange('isPerishable', event.target.checked)}
          />
          Perishable
        </label>
        <label>
          Minimum stock
          <input
            type="number"
            min="0"
            value={productForm.minimumStock}
            onChange={(event) => onChange('minimumStock', event.target.value)}
          />
        </label>
        <label>
          Reorder level
          <input
            type="number"
            min="0"
            value={productForm.reorderLevel}
            onChange={(event) => onChange('reorderLevel', event.target.value)}
          />
        </label>
        <label className="full-width">
          Notes
          <textarea
            value={productForm.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            placeholder="Optional notes"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose} disabled={Boolean(busyKey)}>
            Cancel
          </button>
          <button type="submit" disabled={!isLoggedIn || Boolean(busyKey)}>
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
