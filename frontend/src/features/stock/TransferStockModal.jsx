import { RefreshCw, Send, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/Modal";
import { formatProductName } from "../../utils/format";

export function TransferStockModal({
  busyKey,
  destinationShops,
  isOpen,
  isSubmitDisabled,
  onAddItem,
  onClose,
  onProductChange,
  onProductSearchChange,
  onRemoveItem,
  onSubmit,
  onTransferChange,
  productSearch,
  selectedProduct,
  sourceShops,
  transferableProducts,
  transfer,
  transferItems,
  products,
  units,
}) {
  const getProductById = (productId, item) => {
    return (
      item?.product ||
      transferableProducts.find((product) => product._id === productId) ||
      products.find((product) => product._id === productId)
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stock">
      <form className="modal-form" onSubmit={onSubmit}>
        {/* SOURCE / DESTINATION */}
        <div className="form-grid">
          <label>
            From Branch
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
            To Branch
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

        {/* PRODUCT SEARCH */}
        <div className="product-autocomplete">
          <label>
            Product
            <input
              value={productSearch}
              onChange={(event) => onProductSearchChange(event.target.value)}
              placeholder="Search product by code or description"
              autoComplete="off"
            />
          </label>

          {productSearch.trim() && transferableProducts.length > 0 && (
            <div className="product-search-results">
              {transferableProducts.map((product) => (
                <button
                  type="button"
                  key={product._id}
                  className="product-search-item"
                  onClick={() => onProductChange(product._id)}
                >
                  <strong>{product.itemCode || "-"}</strong>

                  <span>{product.description || ""}</span>
                </button>
              ))}
            </div>
          )}

          {productSearch.trim() && !transferableProducts.length && (
            <div className="product-search-empty">
              No available products found.
            </div>
          )}
        </div>

        {/* UNIT / QUANTITY */}
        <div className="form-grid">
          <label>
            Unit
            <select
              value={transfer.unitId}
              onChange={(event) =>
                onTransferChange("unitId", event.target.value)
              }
            >
              <option value="">Select Unit</option>

              {units.map((unit) => (
                <option key={unit._id} value={unit._id}>
                  {unit.name} ({unit.shortName})
                </option>
              ))}
            </select>
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
            />
          </label>
        </div>

        {/* SELECTED PRODUCT */}
        {selectedProduct && (
          <div className="transfer-summary">
            <div>
              <span>Product</span>

              <strong>{formatProductName(selectedProduct)}</strong>
            </div>

            <div>
              <span>Quantity</span>

              <strong>{Number(transfer.quantity || 0).toFixed(3)}</strong>
            </div>
          </div>
        )}

        {/* ADD MORE */}
        <button
          type="button"
          className="secondary-action"
          onClick={onAddItem}
          disabled={
            !transfer.productId ||
            !transfer.unitId ||
            !transfer.quantity ||
            busyKey === "transfer-stock"
          }
        >
          <Plus size={16} />
          Add More
        </button>

        {/* TRANSFER ITEMS */}
        {transferItems.length > 0 && (
          <div className="transfer-items-list">
            <div className="transfer-items-header">
              <strong>Products to Transfer ({transferItems.length})</strong>
            </div>

            {transferItems.map((item, index) => {
              const product = getProductById(item.productId, item );

              const unit = units.find(
                (unitItem) => unitItem._id === item.unitId,
              );

              return (
                <div
                  className="transfer-item-row"
                  key={`${item.productId}-${index}`}
                >
                  <div className="transfer-item-info">
                    <strong>
                      {product ? formatProductName(product) : "Unknown product"}
                    </strong>

                    <span>{product?.itemCode || "-"}</span>
                  </div>

                  <div className="transfer-item-unit">
                    {unit?.shortName || unit?.name || "-"}
                  </div>

                  <div className="transfer-item-quantity">
                    {Number(item.quantity).toFixed(3)}
                  </div>

                  <button
                    type="button"
                    className="icon-button secondary-action"
                    title="Remove product"
                    onClick={() => onRemoveItem(item.productId)}
                    disabled={busyKey === "transfer-stock"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* REMARKS */}
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

        {/* ACTIONS */}
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={onClose}
            disabled={busyKey === "transfer-stock"}
          >
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
            Transfer All ({transferItems.length})
          </button>
        </div>
      </form>
    </Modal>
  );
}
