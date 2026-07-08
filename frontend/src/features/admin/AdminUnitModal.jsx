import { Modal } from "../../components/Modal";

export function AdminUnitModal({
  busyKey,
  isOpen,
  isLoggedIn,
  isEdit,
  onClose,
  onChange,
  onSubmit,
  unitForm,
  units,
  createUnit,
  updateUnit,
  deleteUnit,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Unit" : "Create Unit"}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          Unit Name
          <input
            value={unitForm.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g. Kilogram"
            required
          />
        </label>

        <label>
          Short Name
          <input
            value={unitForm.shortName}
            onChange={(e) => onChange("shortName", e.target.value)}
            placeholder="e.g. kg"
            required
          />
        </label>

        <label>
          Base Unit
          <select
            value={unitForm.baseUnitId}
            onChange={(e) => onChange("baseUnitId", e.target.value)}
          >
            <option value="">None (Base Unit)</option>

            {units.map((unit) => (
              <option key={unit._id} value={unit._id}>
                {unit.name} ({unit.shortName})
              </option>
            ))}
          </select>
        </label>

        <label>
          Conversion Factor
          <input
            type="number"
            step="any"
            min="1"
            value={unitForm.factor}
            onChange={(e) => onChange("factor", e.target.value)}
            placeholder="e.g. 1000"
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={unitForm.isActive}
            onChange={(e) => onChange("isActive", e.target.checked)}
          />
          Active
        </label>

        <label className="full-width">
          Notes
          <textarea
            value={unitForm.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Optional notes..."
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={onClose}
            disabled={Boolean(busyKey)}
          >
            Cancel
          </button>

          <button type="submit" disabled={!isLoggedIn || Boolean(busyKey)}>
            {isEdit ? "Save Changes" : "Create Unit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
