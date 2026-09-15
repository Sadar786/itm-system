import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Search } from "lucide-react";
import { selectToken, selectUser } from "../auth/authSlice";
import { selectCatalogProducts, selectCatalogShops, selectCatalogUnits } from "../catalog/catalogSlice";
import { createWaste } from "../../services/api";
import "./wastage.css";
import { RecordWastageModal } from "./RecordWastageModal";
import { Notice } from "../../components/Notice";
import { WastageHistory } from "./WastageHistory";

const getId = (value) => typeof value === "string" ? value : value?._id || "";
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function WastageFeature({ shopId, dateRange, search, onSearchChange }) {
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const products = useSelector(selectCatalogProducts).filter((product) => product.isActive !== false);
  const shops = useSelector(selectCatalogShops).filter((shop) => shop.isActive !== false);
  const units = useSelector(selectCatalogUnits).filter((unit) => unit.isActive !== false);
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState(localDate);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const submitting = useRef(false);
  const isAdmin = user?.role === "admin";
  const assignedShop = getId(user?.shopId);
  const branchId = isAdmin ? branch : assignedShop;
  const assignedName = shops.find((shop) => shop._id === assignedShop)?.name || user?.shopId?.name || "Assigned branch";

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (!branchId || !reason.trim() || !date) {
      setError("Choose a branch, date, and reason.");
      return;
    }
    if (!items.length || new Set(items.map((item) => item.productId)).size !== items.length || items.some((item) => !item.productId || !item.unitId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0.000001)) {
      setError("Choose each product once, with a unit and a positive quantity.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result = await createWaste({ token, body: {
        ...(isAdmin ? { shopId: branchId } : {}),
        wasteDate: new Date(`${date}T12:00:00`).toISOString(),
        reason: reason.trim(), remarks: remarks.trim(),
        items: items.map(({ productId, unitId, quantity }) => ({ productId, unitId, quantity: Number(quantity) })),
      } });
      setSuccess(`Wastage recorded successfully. Reference: ${result.data.waste.wasteNo}`);
      setItems([]);
      setReason("");
      setRemarks("");
      setOpen(false);
      setHistoryVersion((version) => version + 1);
    } catch (failure) {
      setError(failure.message || "Unable to record wastage. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (!token) return <section className="panel"><p>Sign in to record wastage.</p></section>;
  if (!isAdmin && !assignedShop) return <section className="panel"><p>A branch must be assigned to your account before you can record wastage.</p></section>;

  return <section className="stock-page wastage-page">
    <Notice message={success} />
    <div className="stock-actions"><button className="secondary-action" type="button" onClick={() => {
      setBranch(shops.some((shop) => shop._id === shopId) ? shopId : "");
      setDate(localDate());
      setError("");
      setSuccess("");
      setOpen(true);
    }}><Plus size={16} /> Record Wastage</button><div className="stock-search"><Search size={17} /><input aria-label="Search wastage" placeholder="Search product, branch, reason or reference..." value={search} onChange={(event) => onSearchChange(event.target.value)} maxLength={200} /></div></div>
    <RecordWastageModal
      isOpen={open} onClose={() => { if (!busy) setOpen(false); }}
      busy={busy} error={error} onSubmit={submit}
      isAdmin={isAdmin} branch={branch} onBranchChange={setBranch}
      assignedName={assignedName} shops={shops} date={date} onDateChange={setDate}
      reason={reason} onReasonChange={setReason} remarks={remarks} onRemarksChange={setRemarks}
      products={products} units={units} items={items} onItemsChange={setItems}
    />
    <WastageHistory key={`${user?.role}-${assignedShop}-${dateRange.startDate}-${dateRange.endDate}`} refreshVersion={historyVersion} dateRange={dateRange} search={search} shopId={isAdmin ? shopId : ""} />
  </section>;
}
