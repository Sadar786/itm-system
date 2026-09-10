//src/features/transfers/TransfersView.jsx
import { Search, X } from "lucide-react";
import { useState } from "react";

export function TransfersView({
  busyKey,
  onLoadMoreTransfers,
  onSelectTransfer,
  onDeleteTransfer,
  transferPagination,
  transfers,
  user,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdmin = user?.role === "admin";
  const isShopkeeper = user?.role === "shop_keeper";

  const hasMore =
    transferPagination.page < transferPagination.pages &&
    transfers.length < transferPagination.total;

  const filteredTransfers = transfers.filter((transfer) => {
    // STATUS FILTER
    if (statusFilter !== "all" && transfer.status !== statusFilter) {
      return false;
    }

    // SEARCH FILTER
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const transferNo = transfer.transferNo?.toLowerCase() || "";

    const controlNumber = transfer.controlNumber?.toLowerCase() || "";

    const remarks = transfer.remarks?.toLowerCase() || "";

    const fromCode = transfer.fromShopId?.code?.toLowerCase() || "";

    const fromName = transfer.fromShopId?.name?.toLowerCase() || "";

    const toCode = transfer.toShopId?.code?.toLowerCase() || "";

    const toName = transfer.toShopId?.name?.toLowerCase() || "";

    const hasMatchingItem = transfer.items?.some((item) => {
      const itemCode = item.productId?.itemCode?.toLowerCase() || "";

      const description = item.productId?.description?.toLowerCase() || "";

      return itemCode.includes(search) || description.includes(search);
    });

    return (
      transferNo.includes(search) ||
      controlNumber.includes(search) ||
      remarks.includes(search) ||
      fromCode.includes(search) ||
      fromName.includes(search) ||
      toCode.includes(search) ||
      toName.includes(search) ||
      hasMatchingItem
    );
  });

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

      <div className="table-wrap">
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
                onClick={() => onSelectTransfer(transfer)}
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
                      disabled={
                        busyKey ===
                        `delete-transfer-${transfer._id}`
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        const confirmed = window.confirm(
                          `Are you sure you want to delete transfer ${
                            transfer.transferNo || ""
                          }?`,
                        );

                        if (confirmed) {
                          onDeleteTransfer(transfer);
                        }
                      }}
                    >
                      {busyKey ===
                      `delete-transfer-${transfer._id}`
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
      </div>

      {hasMore && !searchTerm && statusFilter === "all" && (
        <div className="table-footer">
          <button
            type="button"
            className="secondary-action"
            onClick={onLoadMoreTransfers}
            disabled={busyKey === "transfers-load-more"}
          >
            {busyKey === "transfers-load-more"
              ? "Loading..."
              : "Load more transfers"}
          </button>
        </div>
      )}
    </section>
  );
}
