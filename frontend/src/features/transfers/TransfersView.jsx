import { Search, X } from "lucide-react";
import { useState } from "react";

export function TransfersView({
  busyKey,
  onLoadMoreTransfers,
  onSelectTransfer,
  onDeleteTransfer,
  transferPagination,
  transfers,
  user
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const isAdmin = user?.role === "admin";
  const hasMore =
    transferPagination.page < transferPagination.pages &&
    transfers.length < transferPagination.total;

  const filteredTransfers = transfers.filter((transfer) => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const transferNo = transfer.transferNo?.toLowerCase() || "";

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
      remarks.includes(search) ||
      fromCode.includes(search) ||
      fromName.includes(search) ||
      toCode.includes(search) ||
      toName.includes(search) ||
      hasMatchingItem
    );
  });

  return (
    <section className="history-panel">
      <div className="section-toolbar">
        <div>
          <h3>Recent Transfers</h3>

          <span>
            {searchTerm
              ? `Showing ${filteredTransfers.length} matching transfers`
              : `Showing ${transfers.length} of ${transferPagination.total} records`}
          </span>
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

      <div className="table-wrap">
        <table>
          <thead className="table-head">
            <tr >
              <th>Date</th>
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
                    {new Date(transfer.transferDate).toLocaleDateString()}
                  </strong>

                  <span>
                    {new Date(transfer.transferDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </td>

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
                            {item.unitId?.shortName || item.unitId?.name || ""}
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

                <td>{transfer.status || "-"}</td>

                <td>{transfer.remarks || "-"}</td>
                {isAdmin && (
                  <td>
                    <button
                      type="button"
                      className="danger-action"
                      disabled={busyKey === `delete-transfer-${transfer._id}`}
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
                      {busyKey === `delete-transfer-${transfer._id}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {!filteredTransfers.length && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="empty-cell">
                  {searchTerm
                    ? `No transfers found for "${searchTerm}".`
                    : "No transfers loaded."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && !searchTerm && (
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
