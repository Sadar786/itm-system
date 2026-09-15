import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectToken } from "../auth/authSlice";
import { getWastes } from "../../services/api";
import { Modal } from "../../components/Modal";
import { formatProductName } from "../../utils/format";
const displayDate = (value) => value ? new Date(value).toLocaleDateString() : "-";
const displayTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
const productName = (item) => formatProductName(item.productId) || "Unavailable product";

export function WastageHistory({ refreshVersion, dateRange, search, shopId }) {
  const token = useSelector(selectToken);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const { startDate, endDate } = dateRange;
  const requestKey = JSON.stringify([token, startDate, endDate, search, shopId, refreshVersion]);
  const current = result?.key === requestKey;
  const loading = !current;
  const error = current ? result.error : "";
  const rows = current ? result.data || [] : [];
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        if (startDate && endDate && startDate > endDate) throw new Error("Update the sidebar: start date must be before end date.");
        const filters = { search: search.trim(), shopId };
        if (startDate) filters.startDate = new Date(startDate + "T00:00:00").toISOString();
        if (endDate) filters.endDate = new Date(endDate + "T23:59:59.999").toISOString();
        let page = 1;
        let pages = 1;
        const data = [];
        do {
          const response = await getWastes({ token, filters, page, signal: controller.signal });
          data.push(...response.data);
          pages = response.pagination.pages;
          page += 1;
        } while (page <= pages && !controller.signal.aborted);
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: failure.message || "Unable to load history." });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, startDate, endDate, search, shopId, requestKey]);
  return <section className="history-panel wastage-history" aria-labelledby="wastage-history-heading">
    <div className="section-toolbar"><div><h3 id="wastage-history-heading">Wastage History</h3><span>{loading ? "Loading records..." : rows.length + " records"}</span></div></div>
    {loading ? <p role="status">Loading wastage history...</p> : error ? <p role="alert" className="wastage-error">{error}</p> : rows.length === 0 ? <p>No wastage found for the sidebar dates and search. Check the selected month or date range.</p> : <div className="table-wrap"><table>
      <thead className="table-head"><tr><th>Date</th><th>Reference</th><th>Branch</th><th>Product</th><th>Quantity</th><th>Reason</th><th>Recorded by</th></tr></thead>
      <tbody>{rows.map((waste) => <tr className="clickable-row" key={waste._id} tabIndex={0} aria-label={"View wastage " + waste.wasteNo} onClick={() => setSelected(waste)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(waste); } }}>
        <td><strong>{displayDate(waste.wasteDate)}</strong><small className="wastage-time" title="Time recorded">{displayTime(waste.createdAt || waste.wasteDate)}</small></td><td>{waste.wasteNo}</td><td><strong>{waste.shopId?.code || "-"}</strong><span>{waste.shopId?.name || "Unavailable branch"}</span></td>
        <td>{waste.items.map((item) => <div className="item-line" key={item._id}><strong>{productName(item)}</strong></div>)}</td>
        <td>{waste.items.map((item) => <div className="item-line" key={item._id}><strong>{item.quantity} {item.unitId?.shortName || item.unitId?.name || ""}</strong></div>)}</td>
        <td>{waste.reason}</td><td>{waste.createdBy?.name || "Unavailable user"}</td>
      </tr>)}</tbody>
    </table></div>}
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Wastage details">
      {selected && <div className="detail-panel">
        <div className="detail-grid">
        <div><span>Reference</span><strong>{selected.wasteNo}</strong></div>
        <div><span>Branch</span><strong>{selected.shopId?.name || "Unavailable branch"}</strong></div>
        <div><span>Date</span><strong>{displayDate(selected.wasteDate)}</strong><small className="wastage-time" title="Time recorded">{displayTime(selected.createdAt || selected.wasteDate)}</small></div>
        <div><span>Recorded by</span><strong>{selected.createdBy?.name || "Unavailable user"}</strong></div></div>
        <div className="detail-note"><span>Reason</span><strong>{selected.reason}</strong></div>
        <div className="detail-note wastage-notes"><span>Notes</span><strong>{selected.remarks || "None"}</strong></div>
        <div className="table-wrap"><table>
          <thead className="table-head"><tr><th>Product</th><th>Quantity</th><th>Unit</th><th>Notes</th></tr></thead>
          <tbody>{selected.items.map((item) => <tr key={item._id}><td>{productName(item)}</td><td>{item.quantity}</td><td>{item.unitId?.name || "Unavailable unit"}</td><td>{item.remarks || "—"}</td></tr>)}</tbody>
        </table></div>
      </div>}
    </Modal>
  </section>;
}
