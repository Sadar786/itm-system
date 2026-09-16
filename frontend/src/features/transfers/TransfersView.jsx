import { TableScroll } from "../../components/TableScroll";
import { TablePagination } from "../../components/TablePagination";
import { useConfirm } from "../../components/confirmationContext";
//src/features/transfers/TransfersView.jsx
import { Search, X } from "lucide-react";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../auth/authSlice";
import { TransferDetailModal } from "./TransferDetailModal";
import { formatProductName } from "../../utils/format";
import { fetchTransfers, removeTransfer, selectActiveTransferId, selectTransferPagination, selectTransfers } from "./transferSlice";

export function TransfersView() {
  const confirm = useConfirm();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const transfers = useSelector(selectTransfers);
  const loading = useSelector((state) => state.transfers.status === "loading");
  const transferPagination = useSelector(selectTransferPagination);
  const activeTransferId = useSelector(selectActiveTransferId);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const isFirstSearch = useRef(true);

  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch(fetchTransfers({
        search: searchTerm,
        status: statusFilter === "all" ? "" : statusFilter,
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch, searchTerm, statusFilter]);

  const isAdmin = user?.role === "admin";
  const isShopkeeper = user?.role === "shop_keeper";

  const filteredTransfers = transfers;

  const isIncomingForShopkeeper = (transfer) => {
    const userShopId = user?.shopId?._id || user?.shopId;
    const destinationShopId = transfer.toShopId?._id || transfer.toShopId;

    return (
      isShopkeeper &&
      userShopId &&
      destinationShopId &&
      userShopId.toString() === destinationShopId.toString()
    );
  };

  const getStatusLabel = (status, transfer) => {
    switch (status) {
      case "in_transit":
        return "In Transit";

      case "delivered":
        return isIncomingForShopkeeper(transfer)
          ? "Received"
          : "Delivered";

      case "cancelled":
        return "Cancelled";

      default:
        return status || "-";
    }
  };

  return (
    <section className="history-panel">
      <div className="section-toolbar">
        <div>
          <h3>Recent Transfers</h3>

          <span>
            {searchTerm || statusFilter !== "all"
              ? `Showing ${filteredTransfers.length} matching transfers`
              : `Showing ${transfers.length} of ${transferPagination.total} records`}
          </span>
        </div>

        {/* FILTERS + SEARCH */}
        <div className="transfer-toolbar-right">
          <div className="transfer-status-filters">
            <button
              type="button"
              className={statusFilter === "all" ? "active" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>

            <button
              type="button"
              className={statusFilter === "in_transit" ? "active" : ""}
              onClick={() => setStatusFilter("in_transit")}
            >
              In Transit
            </button>

            <button
              type="button"
              className={statusFilter === "delivered" ? "active" : ""}
              onClick={() => setStatusFilter("delivered")}
            >
              Completed
            </button>

            <button
              type="button"
              className={statusFilter === "cancelled" ? "active" : ""}
              onClick={() => setStatusFilter("cancelled")}
            >
              Cancelled
            </button>
          </div>

          {/* SEARCH */}
          <div className="transfer-list-search">
            <Search size={17} />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search transfers..."
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading transfers..." />}
      <TableScroll label="Transfers" hidden={loading}>
        <table>
          <thead className="table-head">
            <tr>
              <th>Date</th>
              <th>Control #</th>
              <th>Items</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Remarks</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>

          <tbody>
            {filteredTransfers.map((transfer) => (
              <tr
                key={transfer._id}
                className="clickable-row"
                onClick={() => setSelectedTransfer(transfer)}
              >
                <td>
                  <strong>
                    {new Date(
                      transfer.transferDate,
                    ).toLocaleDateString()}
                  </strong>

                  <span>
                    {new Date(
                      transfer.transferDate,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </td>

                <td>{transfer.controlNumber || "-"}</td>

                <td>
                  {transfer.items?.length
                    ? transfer.items.map((item) => (
                        <div className="item-line" key={item._id}>
                          <strong>
                            {item.productId?.itemCode || "-"}{" "}
                            {item.productId?.description || ""}
                          </strong>

                          <span>
                            {Number(item.quantity || 0).toFixed(3)}{" "}
                            {item.unitId?.shortName ||
                              item.unitId?.name ||
                              ""}
                          </span>
                        </div>
                      ))
                    : "-"}
                </td>

                <td>
                  <strong>{transfer.fromShopId?.code || "-"}</strong>

                  <span>{transfer.fromShopId?.name || ""}</span>
                </td>

                <td>
                  <strong>{transfer.toShopId?.code || "-"}</strong>

                  <span>{transfer.toShopId?.name || ""}</span>
                </td>

                <td>
                  <span
                    className={`transfer-status ${transfer.status}`}
                  >
                    {getStatusLabel(transfer.status, transfer)}
                  </span>

                </td>

                <td>{transfer.remarks || "-"}</td>

                {isAdmin && (
                  <td>
                    <button
                      type="button"
                      className="danger-action"
                      disabled={activeTransferId === transfer._id}
                      onClick={async (event) => {
                        event.stopPropagation();

                        const confirmed = await confirm({
                          title: "Delete transfer?",
                          message: "Are you sure you want to delete this transfer? This cannot be undone.",
                          reference: transfer.transferNo || transfer.controlNumber,
                          items: (transfer.items || []).map((item) => ({
                            id: item._id,
                            name: formatProductName(item.productId) || "Unavailable product",
                            quantity: `${item.quantity} ${item.unitId?.shortName || item.unitId?.name || ""}`.trim(),
                          })),
                          confirmLabel: "Delete transfer",
                        });

                        if (confirmed) {
                          const result = await dispatch(removeTransfer(transfer._id));
                          if (removeTransfer.fulfilled.match(result)) {
                            dispatch(fetchTransfers({
                              page: Math.min(transferPagination.page, Math.max(1, Math.ceil((transferPagination.total - 1) / 20))),
                              search: searchTerm,
                              status: statusFilter === "all" ? "" : statusFilter,
                            }));
                          }
                        }
                      }}
                    >
                      {activeTransferId === transfer._id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {!filteredTransfers.length && (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
                  className="empty-cell"
                >
                  {searchTerm || statusFilter !== "all"
                    ? "No transfers found."
                    : "No transfers loaded."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>

      <TablePagination label="Transfers" page={transferPagination.page} total={transferPagination.total}
        disabled={loading || Boolean(activeTransferId)}
        onPageChange={(page) => dispatch(fetchTransfers({ page, search: searchTerm, status: statusFilter === "all" ? "" : statusFilter }))}
      />
      <TransferDetailModal isOpen={Boolean(selectedTransfer)} onClose={() => setSelectedTransfer(null)} transfer={selectedTransfer} />
    </section>
  );
}
