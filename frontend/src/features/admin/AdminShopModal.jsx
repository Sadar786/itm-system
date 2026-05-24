import { Modal } from '../../components/Modal'

export function AdminShopModal({
  busyKey,
  isOpen,
  isLoggedIn,
  onClose,
  onChange,
  onSubmit,
  shopForm,
  isEdit,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit branch' : 'Create branch'}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Branch name
          <input
            value={shopForm.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Enter branch name"
            required
          />
        </label>
        <label>
          Branch code
          <input
            value={shopForm.code}
            onChange={(event) => onChange('code', event.target.value)}
            placeholder="Enter branch code"
            required
          />
        </label>
        <label>
          Location
          <input
            value={shopForm.location}
            onChange={(event) => onChange('location', event.target.value)}
            placeholder="Enter branch location"
          />
        </label>
        <label>
          Phone
          <input
            value={shopForm.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="Enter phone number"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={shopForm.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
          />
          Active branch
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose} disabled={Boolean(busyKey)}>
            Cancel
          </button>
          <button type="submit" disabled={!isLoggedIn || Boolean(busyKey)}>
            {isEdit ? 'Save changes' : 'Create branch'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
