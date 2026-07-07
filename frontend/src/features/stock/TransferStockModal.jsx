import { RefreshCw, Send } from "lucide-react";
import { Modal } from "../../components/Modal";
import { formatProductName } from "../../utils/format";

export function TransferStockModal({
  busyKey,
  destinationShops,
  isOpen,
  isSubmitDisabled,
  onClose,
  onProductChange,
  onProductSearchChange,
  onSubmit,
  onTransferChange,
  productSearch,
  selectedProduct,
  sourceShops,
  transferableProducts,
  transfer,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stock">
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            From Shop
            <select
              value={transfer.fromShopId}
              onChange={(event) =>
                onTransferChange("fromShopId", event.target.value)
              }
              required
            >
              <option value="">Select source</option>
              {sourceShops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.code ? `${shop.code} - ${shop.name}` : shop.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            To Shop
            <select
              value={transfer.toShopId}
              onChange={(event) =>
                onTransferChange("toShopId", event.target.value)
              }
              required
            >
              <option value="">Select destination</option>
              {destinationShops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.code ? `${shop.code} - ${shop.name}` : shop.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Product Search
          <input
            value={productSearch}
            onChange={(event) => onProductSearchChange(event.target.value)}
            placeholder="Search available product"
          />
        </label>

        <label>
          Product
          <select
            value={transfer.productId}
            onChange={(event) => onProductChange(event.target.value)}
            required
          >
            <option value="">Select product</option>
            {transferableProducts.map((product) => (
              <option key={product._id} value={product._id}>
                {formatProductName(product)}
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label>
            Unit ID
            <input
              value={transfer.unitId}
              onChange={(event) =>
                onTransferChange("unitId", event.target.value)
              }
              required
            />
          </label>

          <label>
            Quantity
            <input
              type="number"
              step="any"
              min="1"
              value={transfer.quantity}
              onChange={(event) =>
                onTransferChange("quantity", event.target.value)
              }
              required
            />
          </label>
        </div>

        {selectedProduct && (
          <div className="transfer-summary">
            <div>
              <span>Product</span>
              <strong>{formatProductName(selectedProduct)}</strong>
            </div>
            <div>
              <span>Transfer</span>
              <strong>{Number(transfer.quantity || 0).toFixed(3)}</strong>
            </div>
          </div>
        )}

        <label>
          Remarks
          <textarea
            value={transfer.remarks}
            onChange={(event) =>
              onTransferChange("remarks", event.target.value)
            }
            placeholder="Transfer note..."
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={busyKey === "transfer-stock" || isSubmitDisabled}
          >
            {busyKey === "transfer-stock" ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <Send size={16} />
            )}
            Transfer
          </button>
        </div>
      </form>
    </Modal>
  );
}
