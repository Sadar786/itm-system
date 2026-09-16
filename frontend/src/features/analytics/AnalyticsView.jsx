import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Clock3, RefreshCw, Trash2, XCircle } from "lucide-react";
import { AnalyticsTable } from "./AnalyticsTable";
import { selectCatalogShops } from "../catalog/catalogSlice";
import { useSelector } from "react-redux";
import { selectUser } from "../auth/authSlice";
import { useAnalytics } from "./useAnalytics";
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
    {statuses && <div className="analytics-legend"><span><i className="delivered" />Delivered</span><span><i className="in_transit" />Pending</span><span><i className="cancelled" />Cancelled</span></div>}
  </section>;
}

const number = (value) => Number(value || 0).toLocaleString();

export function AnalyticsView({ shopId, dateRange }) {
  const user = useSelector(selectUser);
  const shops = useSelector(selectCatalogShops);
  const branch = user?.role === "admin" ? shopId : "";
  const [selected, setSelected] = useState(null);
  const { token, result, key, current, refresh } = useAnalytics({ shopId, dateRange });
  if (!token) return <section className="panel">Sign in to view analytics.</section>;
  if (!current) return <p role="status">Loading analytics...</p>;
  if (result.error) return <section className="panel"><p role="alert">{result.error}</p><button type="button" onClick={refresh}>Retry</button></section>;
  const { summary, transfers, wastes, products, branches = [], pending = [], pagination } = result.data;
  const scopeName = user?.role === "admin"
    ? branch ? shops.find((shop) => shop._id === branch)?.name || "Selected branch" : "All branches"
    : user?.shopId?.name || "Your branch";
  const formatDate = (value) => value ? new Date(value + "T00:00:00").toLocaleDateString() : null;
  const dateLabel = dateRange.startDate && dateRange.endDate
    ? formatDate(dateRange.startDate) + " – " + formatDate(dateRange.endDate)
    : dateRange.startDate ? "From " + formatDate(dateRange.startDate)
      : dateRange.endDate ? "Through " + formatDate(dateRange.endDate) : "All dates";
  const tableProps = { token, shopId: branch, dateRange };
  const tableKey = key + result.loadedAt;
  const showTransfer = (row) => setSelected({ key, transfer: row });
  const cards = [
    { label: "Total Transfers", value: summary.total, tone: "total", icon: <ArrowLeftRight size={19} /> },
    { label: "Pending Transfers", value: summary.in_transit, tone: "pending", icon: <Clock3 size={19} /> },
    { label: "Delivered Transfers", value: summary.delivered, tone: "delivered", icon: <CheckCircle2 size={19} /> },
    { label: "Cancelled Transfers", value: summary.cancelled, tone: "cancelled", icon: <XCircle size={19} /> },
    { label: "Wastage Records", value: summary.wastage, tone: "wastage", icon: <Trash2 size={19} /> },
  ];
  return <div className="analytics-page">
    <div className="section-toolbar analytics-header">
      <div>
        <h3>Analytics</h3>
      <span>Each transfer counts once for the selected branch and sidebar dates.</span></div>
      <button type="button" className="secondary-action" onClick={refresh}><RefreshCw size={16} aria-hidden="true" />Refresh analytics</button>
    </div>
    <div className="analytics-context"><span>{scopeName} · {dateLabel}</span><span>Updated {new Date(result.loadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    <div className="analytics-overview">
      {cards.map(({ label, value, tone, icon }) => <article className={"summary-card analytics-card " + tone} key={label}><span className="analytics-card-icon" aria-hidden="true">{icon}</span><span>{label}</span><strong>{number(value)}</strong></article>)}
    </div>
    <div className="analytics-charts"><Trend title="Transfer Trend" rows={transfers} statuses /><Trend title="Wastage Trend" rows={wastes} /></div>
    <AnalyticsTable
      {...tableProps} key={"branches-" + tableKey} section="branches"
      title={user?.role === "admin" && !branch ? "Branch Comparison" : "Branch Activity"}
      description="Sent and received count delivered transfers. Pending includes both directions."
      searchPlaceholder="Search branch name or code…"
      initialRows={branches} initialPagination={pagination.branches}
      rowKey={(row) => row._id} emptyMessage="No branches found for these filters."
      columns={[
        { key: "branch", label: "Branch", render: (row) => <><strong>{row.code}</strong><span>{row.name}</span></> },
        { key: "sent", label: "Sent", numeric: true, render: (row) => number(row.sent) },
        { key: "received", label: "Received", numeric: true, render: (row) => number(row.received) },
        { key: "pending", label: "Pending In / Out", numeric: true, render: (row) => number(row.pending) },
        { key: "wastage", label: "Wastage Records", numeric: true, render: (row) => number(row.wastage) },
      ]}
    />
    <AnalyticsTable
      {...tableProps} key={"pending-" + tableKey} section="pending" title="Oldest Pending Transfers"
      description="Oldest first within the sidebar dates. Select a reference to view its items."
      searchPlaceholder="Search reference or branch…"
      initialRows={pending} initialPagination={pagination.pending}
      rowKey={(row) => row._id} emptyMessage="No pending transfers for these filters."
      onRowClick={showTransfer}
      columns={[
        { key: "date", label: "Transfer Date", render: (row) => <><strong>{new Date(row.transferDate).toLocaleDateString()}</strong><span>{new Date(row.transferDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></> },
        { key: "reference", label: "Reference", render: (row) => <button className="analytics-reference" type="button" onClick={(event) => { event.stopPropagation(); showTransfer(row); }} aria-label={"View transfer " + (row.controlNumber || row.transferNo)}>{row.controlNumber || row.transferNo}</button> },
        { key: "from", label: "From", render: (row) => <><strong>{row.fromShopId?.code || "—"}</strong><span>{row.fromShopId?.name || "Unavailable branch"}</span></> },
        { key: "to", label: "To", render: (row) => <><strong>{row.toShopId?.code || "—"}</strong><span>{row.toShopId?.name || "Unavailable branch"}</span></> },
        { key: "age", label: "Days Since Transfer", numeric: true, render: (row) => {
          const days = Math.max(0, Math.floor((result.loadedAt - new Date(row.transferDate).getTime()) / 86400000));
          return <span className={"analytics-age" + (days >= 7 ? " is-aged" : "")} title={days >= 7 ? "Pending for at least 7 days" : "Time since transfer"}>{number(days)} {days === 1 ? "day" : "days"}</span>;
        } },
      ]}
    />
    <AnalyticsTable
      {...tableProps} key={"products-" + tableKey} section="products" title="Wastage by Product"
      description="Most frequent first. Quantities stay separate by product and unit."
      searchPlaceholder="Search product or unit…"
      initialRows={products} initialPagination={pagination.products}
      rowKey={(row) => row._id.productId + "-" + row._id.unitId}
      emptyMessage="No wastage for the selected branch and dates."
      columns={[
        { key: "product", label: "Product", render: (row) => <strong>{formatProductName(row.product) || "Unavailable product"}</strong> },
        { key: "quantity", label: "Quantity Wasted", numeric: true, render: (row) => Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 }) },
        { key: "unit", label: "Unit", render: (row) => <span className="analytics-unit">{row.unit?.shortName || row.unit?.name || "Unavailable unit"}</span> },
        { key: "records", label: "Wastage Records", numeric: true, render: (row) => number(row.records) },
      ]}
    />
    <TransferDetailModal key={selected?.transfer?._id || "none"} isOpen={selected?.key === key} onClose={() => setSelected(null)} transfer={selected?.key === key ? selected.transfer : null} />
  </div>;
}
