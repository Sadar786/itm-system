import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectToken, selectUser } from "../auth/authSlice";
import { apiJson } from "../../services/api";
import { formatProductName } from "../../utils/format";
import "./analytics.css";
import { TransferDetailModal } from "../transfers/TransferDetailModal";

function Trend({ title, rows, statuses = false }) {
  const days = new Map();
  for (const row of rows) {
    const day = statuses ? row._id.day : row._id;
    if (!days.has(day)) days.set(day, { total: 0, in_transit: 0, delivered: 0, cancelled: 0 });
    const values = days.get(day);
    values.total += row.count;
    if (statuses) values[row._id.status] = row.count;
  }
  const maximum = Math.max(1, ...Array.from(days.values(), (value) => value.total));
  return <section className="history-panel">
    <div className="section-toolbar"><div><h3>{title}</h3><span>Records per day · dates without activity are omitted</span></div></div>
    <div className="analytics-trend">
      {days.size === 0 ? <p>No records for these filters.</p> : Array.from(days, ([day, values]) => <div className="analytics-trend-row" key={day}>
        <span>{day}</span><div className="analytics-track" aria-label={`${day}: ${values.total} records`}>
          {statuses ? ["delivered", "in_transit", "cancelled"].map((status) => <span key={status} className={`analytics-bar ${status}`} style={{ width: `${values[status] / maximum * 100}%` }} title={`${status.replace('_', ' ')}: ${values[status]}`} />) : <span className="analytics-bar" style={{ width: `${values.total / maximum * 100}%` }} />}
        </div><strong>{values.total}</strong>
      </div>)}
    </div>
    {statuses && <p className="analytics-legend">Green: delivered · Amber: pending · Red: cancelled</p>}
  </section>;
}

export function AnalyticsView({ shopId, dateRange }) {
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const branch = user?.role === "admin" ? shopId : "";
  const { startDate, endDate } = dateRange;
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const key = JSON.stringify([token, branch, startDate, endDate, retry]);
  const current = result?.key === key;
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        if (startDate && endDate && startDate > endDate) throw new Error("Check the sidebar date range: start must be before end.");
        const params = new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        if (branch) params.set("shopId", branch);
        if (startDate) params.set("startDate", new Date(`${startDate}T00:00:00`).toISOString());
        if (endDate) params.set("endDate", new Date(`${endDate}T23:59:59.999`).toISOString());
        const response = await apiJson(`/analytics?${params}`, token, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ key, data: response.data, loadedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error.message });
      }
    };
    load();

    return () => controller.abort();
  }, [token, branch, startDate, endDate, key]);
  if (!token) return <section className="panel">Sign in to view analytics.</section>;
  if (!current) return <p role="status">Loading analytics...</p>;
  if (result.error) return <section className="panel"><p role="alert">{result.error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></section>;
  const { summary, transfers, wastes, products, branches = [], pending = [] } = result.data;
  return <div className="analytics-page">
    <div className="analytics-overview">
      {[["Total Transfers", summary.total], ["Pending Transfers", summary.in_transit], ["Delivered Transfers", summary.delivered], ["Cancelled Transfers", summary.cancelled], ["Wastage Records", summary.wastage]].map(([label, value]) => <article className="summary-card analytics-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </div>
    <div className="analytics-charts"><Trend title="Transfer Trend" rows={transfers} statuses /><Trend title="Wastage Trend" rows={wastes} /></div>
    <section className="history-panel">
      <div className="section-toolbar"><div><h3>{user?.role === "admin" && !branch ? "Branch Comparison" : "Branch Activity"}</h3><span>Record counts for the sidebar dates. Sent and received include delivered transfers only.</span></div></div>
      <div className="table-wrap"><table><thead className="table-head"><tr><th>Branch</th><th>Sent</th><th>Received</th><th>Pending In / Out</th><th>Wastage Records</th></tr></thead><tbody>
        {branches.map(row => <tr key={row._id}><td><strong>{row.code}</strong><span>{row.name}</span></td><td>{row.sent}</td><td>{row.received}</td><td>{row.pending}</td><td>{row.wastage}</td></tr>)}
        {!branches.length && <tr><td colSpan={5} className="empty-cell">No branches found.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="history-panel">
      <div className="section-toolbar"><div><h3>Oldest Pending Transfers</h3><span>Up to 10 transfers within the sidebar dates. Select a row for details.</span></div></div>
      <div className="table-wrap"><table><thead className="table-head"><tr><th>Transfer Date</th><th>Reference</th><th>From</th><th>To</th><th>Days Since Transfer</th></tr></thead><tbody>
        {pending.map(row => <tr key={row._id} className="clickable-row" tabIndex={0} aria-label={`View transfer ${row.transferNo}`} onClick={() => setSelected({ key, transfer: row })} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected({ key, transfer: row }); } }}>
          <td><strong>{new Date(row.transferDate).toLocaleDateString()}</strong><span>{new Date(row.transferDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td><td>{row.controlNumber || row.transferNo}</td><td>{row.fromShopId?.name || "Unavailable branch"}</td><td>{row.toShopId?.name || "Unavailable branch"}</td><td>{Math.max(0, Math.floor((result.loadedAt - new Date(row.transferDate).getTime()) / 86400000))}</td>
        </tr>)}
        {!pending.length && <tr><td colSpan={5} className="empty-cell">No pending transfers for these filters.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="history-panel">
      <div className="section-toolbar"><div><h3>Wastage by Product</h3><span>Quantities kept separate by product and unit · most frequent first</span></div></div>
      <div className="table-wrap"><table><thead className="table-head"><tr><th>Product</th><th>Quantity Wasted</th><th>Unit</th><th>Wastage Records</th></tr></thead><tbody>
        {products.map((row) => <tr key={`${row._id.productId}-${row._id.unitId}`}><td>{formatProductName(row.product) || "Unavailable product"}</td><td>{Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td><td>{row.unit?.shortName || row.unit?.name || "Unavailable unit"}</td><td>{row.records}</td></tr>)}
        {!products.length && <tr><td className="empty-cell" colSpan={4}>No wastage for the selected branch and dates.</td></tr>}
      </tbody></table></div>
    </section>
    <TransferDetailModal key={selected?.transfer?._id || "none"} isOpen={selected?.key === key} onClose={() => setSelected(null)} transfer={selected?.key === key ? selected.transfer : null} />
  </div>;
}
