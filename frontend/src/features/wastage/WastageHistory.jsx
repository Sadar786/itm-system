import { TableScroll } from "../../components/TableScroll";
import { TablePagination } from "../../components/TablePagination";
import { useConfirm } from "../../components/confirmationContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown, Trash2 } from "lucide-react";
import { selectToken, selectUser } from "../auth/authSlice";
import { getWastes, updateWasteStatus, deleteWaste } from "../../services/api";
import { Modal } from "../../components/Modal";
import { formatProductName } from "../../utils/format";
const displayDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";
const displayTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
const productName = (item) =>
  formatProductName(item.productId) || "Unavailable product";
const statuses = { pending: "Pending", approved: "Approved", cancelled: "Cancelled" };

export function WastageHistory({ refreshVersion, dateRange, search, shopId }) {
  const confirm = useConfirm();
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const isAdmin = user?.role === "admin";
  const [activeId, setActiveId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const { startDate, endDate } = dateRange;
  const filterKey = JSON.stringify([token, startDate, endDate, search, shopId]);
  const [pageSelection, setPageSelection] = useState({ key: filterKey, page: 1 });
  if (pageSelection.key !== filterKey) {
    setPageSelection({ key: filterKey, page: 1 });
  }
  const page = pageSelection.key === filterKey ? pageSelection.page : 1;
  const requestKey = JSON.stringify([
    token,
    startDate,
    endDate,
    search,
    shopId,
    refreshVersion,
    revision,
    page,
  ]);
  const current = result?.key === requestKey;
  const loading = !current;
  const error = current ? result.error : "";
  const rows = current ? result.data || [] : [];
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        if (startDate && endDate && startDate > endDate)
          throw new Error(
            "Update the sidebar: start date must be before end date.",
          );
        const filters = { search: search.trim(), shopId };
        if (startDate)
          filters.startDate = new Date(startDate + "T00:00:00").toISOString();
        if (endDate)
          filters.endDate = new Date(endDate + "T23:59:59.999").toISOString();
        const response = await getWastes({ token, filters, page, signal: controller.signal });
        if (!controller.signal.aborted) {
          const lastPage = Math.max(1, response.pagination.pages);
          if (page > lastPage) {
            setPageSelection({ key: filterKey, page: lastPage });
            return;
          }
          setResult({ key: requestKey, data: response.data, pagination: response.pagination });
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            error: failure.message || "Unable to load history.",
          });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, startDate, endDate, search, shopId, requestKey, page, filterKey]);
  const changeWaste = async (waste, status) => {
    if (!isAdmin || activeId) return;
    if (status && waste.status && waste.status !== "pending") return;
    if (!status && !await confirm({
      title: "Delete wastage?",
      message: "This wastage record and its items will be permanently deleted. This cannot be undone.",
      reference: waste.wasteNo,
      items: waste.items.map((item) => ({
        id: item._id,
        name: productName(item),
        quantity: `${item.quantity} ${item.unitId?.shortName || item.unitId?.name || ""}`.trim(),
      })),
      confirmLabel: "Delete wastage",
    })) return;
    setActiveId(waste._id);
    setActionError("");
    try {
      if (status) {
        await updateWasteStatus({ token, id: waste._id, status });
        setSelected((previous) => previous?._id === waste._id ? { ...previous, status } : previous);
      } else {
        await deleteWaste({ token, id: waste._id });
        setSelected((previous) => previous?._id === waste._id ? null : previous);
      }
      setRevision((value) => value + 1);
    } catch (failure) {
      setActionError(failure.message || "Unable to update wastage.");
    } finally {
      setActiveId(null);
    }
  };
  const canChangeStatus = (waste) => isAdmin && (!waste.status || waste.status === "pending");
  const renderStatus = (waste) => (
    <div className={`wastage-status wastage-status--${waste.status || "pending"}${canChangeStatus(waste) ? " wastage-status--editable" : ""}`}>
      <i className="wastage-status-dot" aria-hidden="true" />
      {canChangeStatus(waste) ? (
    <select
      aria-label={`Status for ${waste.wasteNo}`}
      value={waste.status || "pending"}
      disabled={Boolean(activeId)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => changeWaste(waste, event.target.value)}
    >
      {Object.entries(statuses).map(([value, label]) => <option key={value} value={value} disabled={value === "pending"}>{label}</option>)}
    </select>
  ) : (
    <span className="wastage-status-label">
      {statuses[waste.status || "pending"]}
    </span>
  )}
      {canChangeStatus(waste) && <ChevronDown size={14} className="wastage-status-chevron" aria-hidden="true" />}
    </div>
  );
  return (
    <section
      className="history-panel wastage-history"
      aria-labelledby="wastage-history-heading"
    >
      <div className="section-toolbar">
        <div>
          <h3 id="wastage-history-heading">Wastage History</h3>
          <span>
            {loading ? "Loading records..." : (result?.pagination?.total || 0) + " records"}
          </span>
        </div>
      </div>
      {actionError && <p role="alert" className="wastage-error">{actionError}</p>}
      {loading ? (
        <LoadingSpinner label="Loading wastage history..." />
      ) : error ? (
        <p role="alert" className="wastage-error">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p>
          No wastage found for the sidebar dates and search. Check the selected
          month or date range.
        </p>
      ) : (
        <TableScroll label="Wastage">
          <table>
            <thead className="table-head">
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Branch</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Recorded by</th>
                <th>Status</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((waste) => (
                <tr
                  className="clickable-row"
                  key={waste._id}
                  tabIndex={0}
                  aria-label={"View wastage " + waste.wasteNo}
                  onClick={() => setSelected(waste)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(waste);
                    }
                  }}
                >
                  <td className="wastage-date-cell">
                    <strong>{displayDate(waste.wasteDate)}</strong>
                    <small className="wastage-time" title="Time recorded">
                      {displayTime(waste.createdAt || waste.wasteDate)}
                    </small>
                  </td>
                  <td className="wastage-reference" title={waste.wasteNo}>{waste.wasteNo}</td>
                  <td>
                    <strong>{waste.shopId?.code || "-"}</strong>
                    <span>{waste.shopId?.name || "Unavailable branch"}</span>
                  </td>
                  <td>
                    {waste.items.map((item) => (
                      <div className="item-line" key={item._id}>
                        <strong>{productName(item)}</strong>
                      </div>
                    ))}
                  </td>
                  <td>
                    {waste.items.map((item) => (
                      <div className="item-line" key={item._id}>
                        <strong>
                          {item.quantity}{" "}
                          {item.unitId?.shortName || item.unitId?.name || ""}
                        </strong>
                      </div>
                    ))}
                  </td>
                  <td>{waste.reason}</td>
                  <td>{waste.createdBy?.name || "Unavailable user"}</td>
                  <td>{renderStatus(waste)}</td>
                  {isAdmin && (
                    <td>
                      <button
                        type="button"
                        className="wastage-delete-button"
                        aria-label={`Delete wastage ${waste.wasteNo}`}
                        disabled={Boolean(activeId)}
                        onKeyDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          changeWaste(waste);
                        }}
                      ><Trash2 size={15} aria-hidden="true" />Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
      {!loading && !error && rows.length > 0 && <TablePagination
        label="Wastage" page={page} total={result.pagination.total}
        disabled={Boolean(activeId)}
        onPageChange={(next) => setPageSelection({ key: filterKey, page: next })}
      />}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Wastage details"
      >
        {selected && (
          <div className="detail-panel">
            {actionError && <p role="alert" className="wastage-error">{actionError}</p>}
            <div className="detail-grid">
              <div>
                <span>Status</span>
                {renderStatus(selected)}
              </div>
              <div>
                <span>Reference</span>
                <strong>{selected.wasteNo}</strong>
              </div>
              <div>
                <span>Branch</span>
                <strong>{selected.shopId?.name || "Unavailable branch"}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{displayDate(selected.wasteDate)}</strong>
                <small className="wastage-time" title="Time recorded">
                  {displayTime(selected.createdAt || selected.wasteDate)}
                </small>
              </div>
              <div>
                <span>Recorded by</span>
                <strong>
                  {selected.createdBy?.name || "Unavailable user"}
                </strong>
              </div>
            </div>
            <div className="detail-note">
              <span>Reason</span>
              <strong>{selected.reason}</strong>
            </div>
            <div className="detail-note wastage-notes">
              <span>Notes</span>
              <strong>{selected.remarks || "None"}</strong>
            </div>
            <TableScroll label="Wastage products">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item) => (
                    <tr key={item._id}>
                      <td>{productName(item)}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitId?.name || "Unavailable unit"}</td>
                      <td>{item.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        )}
      </Modal>
    </section>
  );
}
