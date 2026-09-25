import { useEffect, useState } from "react";
import { searchProducts } from "../../services/api";
import { Plus, Trash2, RefreshCw, Send } from "lucide-react";
import { Modal } from "../../components/Modal";
import { formatProductName } from "../../utils/format";
import { getWastageDateRange } from "./wastageDate";

export function RecordWastageModal({ token, isOpen, onClose, busy, error, onSubmit,
  isAdmin, branch, onBranchChange, assignedName, shops, date, onDateChange,
  reason, onReasonChange, remarks, onRemarksChange, products, units, items, onItemsChange }) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const productId = selectedProduct?._id || "";
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const { minDate, maxDate } = getWastageDateRange();
  const query = search.trim();
  const currentSearch = searchResult?.query === query && searchResult?.token === token;
  const searching = Boolean(query && !selectedProduct && !currentSearch);
  const searchError = currentSearch ? searchResult.error : "";
  const matches = (currentSearch ? searchResult.products : []).filter((product) =>
    product.isActive !== false && !items.some((item) => item.productId === product._id));

  useEffect(() => {
    if (!isOpen || !token || !query || selectedProduct) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await searchProducts(token, query, 20, { signal: controller.signal, isActive: true });
        if (!controller.signal.aborted) setSearchResult({ token, query, products: result.data || [], error: "" });
      } catch (failure) {
        if (!controller.signal.aborted) setSearchResult({ token, query, products: [], error: failure.message || "Unable to search products. Please try again." });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, token, query, selectedProduct]);
  const validDraft = productId && unitId && Number.isFinite(Number(quantity)) && Number(quantity) >= 0.000001;
  const hasDraft = Boolean(search || productId || unitId || quantity);

  const addItem = () => {
    if (!validDraft || items.length >= 100 || items.some((item) => item.productId === productId)) return;
    onItemsChange([...items, { productId, product: selectedProduct, unitId, quantity: Number(quantity) }]);
    setSearch(""); setSelectedProduct(null); setUnitId(""); setQuantity("");
  };

  return <Modal isOpen={isOpen} onClose={onClose} title="Record Wastage">
    <form className="modal-form" onSubmit={(event) => { if (busy || hasDraft || !items.length) { event.preventDefault(); return; } onSubmit(event); }}>
      {error && <p role="alert" className="wastage-error">{error}</p>}
      <fieldset disabled={busy} className="wastage-fields">
        <div className="form-grid">
          <label>Branch
            {isAdmin ? <select required value={branch} onChange={(event) => onBranchChange(event.target.value)}>
              <option value="">Select branch</option>
              {shops.map((shop) => <option key={shop._id} value={shop._id}>{shop.code ? `${shop.code} - ${shop.name}` : shop.name}</option>)}
            </select> : <input readOnly value={assignedName} />}
          </label>
          <label>Date
            <input required type="date" min={minDate} max={maxDate} value={date} aria-describedby="wastage-date-help" onChange={(event) => onDateChange(event.target.value)} />
            <small id="wastage-date-help">Today or the previous 3 days only (UAE time).</small>
          </label>
        </div>
        <label>Reason<input required value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="For example, spoiled or damaged" /></label>
        <div className="product-autocomplete">
          <label>Product<input value={search} autoComplete="off" placeholder="Search product by code or description" onChange={(event) => { setSearch(event.target.value); setSelectedProduct(null); setSearchResult(null); setUnitId(""); }} /></label>
          {query && !selectedProduct && (searching ? <div className="product-search-empty" role="status">Searching products...</div> : searchError ? <div className="wastage-error" role="alert">{searchError}</div> : matches.length ? <div className="product-search-results">
            {matches.map((product) => <button type="button" className="product-search-item" key={product._id} onClick={() => {
              setSelectedProduct(product);
              setSearch(formatProductName(product));
              const defaultUnit = product.defaultUnitId?._id || product.defaultUnitId;
              setUnitId(units.some((unit) => unit._id === defaultUnit) ? defaultUnit : "");
            }}><strong>{product.itemCode || "-"}</strong><span>{product.description}</span></button>)}
          </div> : <div className="product-search-empty">No available products found.</div>)}
        </div>
        <div className="form-grid">
          <label>Unit<select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="">Select Unit</option>
            {units.map((unit) => <option key={unit._id} value={unit._id}>{unit.name} ({unit.shortName})</option>)}
          </select></label>
          <label>Quantity<input type="number" min="0.000001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        </div>
        {selectedProduct && <div className="transfer-summary">
          <div><span>Product</span><strong>{formatProductName(selectedProduct)}</strong></div>
          <div><span>Quantity</span><strong>{Number(quantity || 0).toFixed(3)}</strong></div>
        </div>}
        <button type="button" className="secondary-action" disabled={!validDraft || items.length >= 100} onClick={addItem}><Plus size={16} />Add More</button>
        {items.length > 0 && <div className="transfer-items-list">
          <div className="transfer-items-header"><strong>Products to Record ({items.length})</strong></div>
          {items.map((item) => {
            const product = item.product || products.find((entry) => entry._id === item.productId);
            const unit = units.find((entry) => entry._id === item.unitId);
            return <div className="transfer-item-row" key={item.productId}>
              <div className="transfer-item-info"><strong>{formatProductName(product)}</strong><span>{product?.itemCode || "-"}</span></div>
              <div className="transfer-item-unit">{unit?.shortName || unit?.name || "-"}</div>
              <div className="transfer-item-quantity">{Number(item.quantity).toFixed(3)}</div>
              <button type="button" className="icon-button secondary-action" aria-label={`Remove ${formatProductName(product)}`} onClick={() => onItemsChange(items.filter((entry) => entry.productId !== item.productId))}><Trash2 size={16} /></button>
            </div>;
          })}
        </div>}
        <label>Remarks<textarea value={remarks} onChange={(event) => onRemarksChange(event.target.value)} placeholder="Wastage notes (optional)" /></label>
        {hasDraft && <small>Add the selected product using Add More before saving.</small>}
        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!items.length || hasDraft}>
            {busy ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
            {busy ? "Saving..." : `Record All (${items.length})`}
          </button>
        </div>
      </fieldset>
    </form>
  </Modal>;
}
