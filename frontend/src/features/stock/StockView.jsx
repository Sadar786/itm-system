
//src/features/stock/StockView.jsx
import {
  MoreVertical,
  PackagePlus,
  PackageMinus,
  Send,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";

export function StockView({
  busyKey,
  isLoggedIn,
  movements,
  onOpenAddStock,
  onOpenTransferStock,
  onMarkDelivered,
  onCancelTransfer,
  transfers,
  user,
}) {
  const [stockFilter, setStockFilter] = useState("IN");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState("");
  const isShopkeeper = user?.role === "shop_keeper";

  const getId = (value) =>
    (value?._id || value)?.toString?.() || "";

  const transfersById = new Map(
    transfers.map((transfer) => [getId(transfer), transfer]),
  );

  /*
   * GROUP MOVEMENTS BY TRANSFER
   *
   * Example:
   *
   * Transfer TR-001
   *   Product A - 2 PCS
   *   Product B - 5 PCS
   *   Product C - 10 PCS
   *
   * will become ONE transfer object.
   */
  const groupedTransfers = Object.values(
    movements.reduce((groups, movement) => {
      /*
       * transferNo should normally be the same for all
       * products belonging to one transfer.
       *
       * movementNo is used as fallback in case transferNo
       * does not exist.
       */
      const transferId =
        movement.referenceType === "Transfer" ? getId(movement.referenceId) : "";
      const relatedTransfer = transfersById.get(transferId);
      const key =
        (transferId &&
          `${transferId}-${movement.movementType}-${
            movement.shopId || movement.shopCode
          }`) ||
        movement.transferNo ||
        `${movement.movementDate}-${movement.shopCode}-${movement.relatedShopCode}`;

      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          transferNo: movement.transferNo || relatedTransfer?.transferNo || "",
          controlNumber:
            movement.controlNumber || relatedTransfer?.controlNumber || "",
          transferStatus:
            relatedTransfer?.status || movement.transferStatus || null,
          transferId,
          movementDate: movement.movementDate,

          movementType: movement.movementType,

          shopCode: movement.shopCode,
          shopName: movement.shopName,
          shopId: movement.shopId || getId(relatedTransfer?.toShopId),

          relatedShopCode: movement.relatedShopCode,
          relatedShopName: movement.relatedShopName,

          items: [],
        };
      }

      groups[key].items.push(movement);

      return groups;
    }, {}),
  );

  /*
   * Count UNIQUE transfers instead of individual movement records.
   */
  const transferCount = groupedTransfers.length;

  /*
   * Filter by Stock In / Stock Out
   */
  const filteredByType = groupedTransfers.filter((transfer) => {
    if (stockFilter === "IN") {
      return transfer.movementType === "TRANSFER_IN";
    }

    if (stockFilter === "OUT") {
      return transfer.movementType === "TRANSFER_OUT";
    }
    return true;
  });

  /*
   * Search inside the GROUPED transfer.
   *
   * This means searching for any product will return
   * the whole transfer.
   */
  const filteredTransfers = filteredByType.filter((transfer) => {
    if (
      statusFilter !== "all" &&
      transfer.transferStatus !== statusFilter
    ) {
      return false;
    }

    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const transferNo = transfer.transferNo?.toLowerCase() || "";

    const controlNumber = transfer.controlNumber?.toLowerCase() || "";

    const movementType = transfer.movementType?.toLowerCase() || "";

    const shopCode = transfer.shopCode?.toLowerCase() || "";

    const shopName = transfer.shopName?.toLowerCase() || "";

    const relatedShopCode =
      transfer.relatedShopCode?.toLowerCase() || "";

    const relatedShopName =
      transfer.relatedShopName?.toLowerCase() || "";

    const hasMatchingItem = transfer.items?.some((movement) => {
      const itemCode = movement.itemCode?.toLowerCase() || "";

      const product = movement.product?.toLowerCase() || "";

      const movementNo = movement.movementNo?.toLowerCase() || "";

      return (
        itemCode.includes(search) ||
        product.includes(search) ||
        movementNo.includes(search)
      );
    });

    return (
      transferNo.includes(search) ||
      controlNumber.includes(search) ||
      movementType.includes(search) ||
      shopCode.includes(search) ||
      shopName.includes(search) ||
      relatedShopCode.includes(search) ||
      relatedShopName.includes(search) ||
      hasMatchingItem
    );
  });

  /*
   * Show first 20 TRANSFERS, not first 20 movement records.
   */
  const recentTransfers = filteredTransfers.slice(0, 20);

  const statusTotals = groupedTransfers.reduce(
    (totals, transfer) => {
      if (transfer.transferStatus in totals) {
        totals[transfer.transferStatus] += 1;
      }

      return totals;
    },
    { in_transit: 0, delivered: 0, cancelled: 0 },
  );

  const getStatusLabel = (status, movementType) => {
    switch (status) {
      case "in_transit":
        return "In Transit";
      case "delivered":
        return isShopkeeper && movementType === "TRANSFER_IN"
          ? "Received"
          : "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return "-";
    }
  };

  const isReceiver = (transfer) => {
    const userShopId = user?.shopId?._id || user?.shopId;

    return (
      userShopId &&
      transfer.shopId &&
      userShopId.toString() === transfer.shopId.toString()
    );
  };

  return (
    <div className="stock-page">
      <div className="summary-grid stock-summary-grid">
        <article className="summary-card status-summary total">
          <span>Total Transfers</span>
          <strong>{groupedTransfers.length}</strong>
        </article>

        <article className="summary-card status-summary incoming">
          <span>Transfers In</span>
          <strong>
            {
              groupedTransfers.filter(
                (transfer) => transfer.movementType === "TRANSFER_IN",
              ).length
            }
          </strong>
        </article>

        <article className="summary-card status-summary outgoing">
          <span>Transfers Out</span>
          <strong>
            {
              groupedTransfers.filter(
                (transfer) => transfer.movementType === "TRANSFER_OUT",
              ).length
            }
          </strong>
        </article>

        <article className="summary-card status-summary pending">
          <span>Pending (In Transit)</span>
          <strong>{statusTotals.in_transit}</strong>
        </article>

        <article className="summary-card status-summary delivered">
          <span>Completed</span>
          <strong>{statusTotals.delivered}</strong>
        </article>

        <article className="summary-card status-summary cancelled">
          <span>Cancelled</span>
          <strong>{statusTotals.cancelled}</strong>
        </article>
      </div>

      <div className="stock-actions">
        {/* STOCK IN */}
        <button
          type="button"
          className={
            stockFilter === "IN"
              ? "primary-action"
              : "secondary-action"
          }
          onClick={() => setStockFilter("IN")}
        >
          <PackagePlus size={16} />
          Stock In
        </button>

        {/* STOCK OUT */}
        <button
          type="button"
          className={
            stockFilter === "OUT"
              ? "primary-action"
              : "secondary-action"
          }
          onClick={() => setStockFilter("OUT")}
        >
          <PackageMinus size={16} />
          Stock Out
        </button>


        {/* TRANSFER STOCK */}
        <button
          type="button"
          className="secondary-action"
          onClick={onOpenTransferStock}
          disabled={!isLoggedIn}
        >
          <Send size={16} />
          Transfer Stock
        </button>

        {/* SEARCH */}
        <div className="stock-search">
          <Search size={17} />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search transfer..."
          />

          {searchTerm && (
            <button
              type="button"
              className="stock-search-clear"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="stock-status-filters" aria-label="Transfer status filter">
        <button
          type="button"
          className={`stock-status-filter all ${
            statusFilter === "all" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`stock-status-filter pending ${
            statusFilter === "in_transit" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("in_transit")}
        >
          Pending (In Transit)
        </button>
        <button
          type="button"
          className={`stock-status-filter delivered ${
            statusFilter === "delivered" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("delivered")}
        >
          Completed
        </button>
        <button
          type="button"
          className={`stock-status-filter cancelled ${
            statusFilter === "cancelled" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("cancelled")}
        >
          Cancelled
        </button>
      </div>

      <section className="stock-table-panel">
        <div className="section-toolbar">
          <div>
            <h3>
              {stockFilter === "IN" ? "Stock In" : "Stock Out"}
            </h3>

            <span>
              {searchTerm
                ? `Showing ${recentTransfers.length} matching transfers`
                : `Showing ${recentTransfers.length} of ${filteredTransfers.length} transfers`}
            </span>
          </div>

          {searchTerm && (
            <strong>
              {filteredTransfers.length} transfer
              {filteredTransfers.length !== 1 ? "s" : ""}
            </strong>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead className="table-head">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Control #</th>
                <th>Items</th>
                <th>
                  Transfered{" "}
                  {stockFilter === "OUT" ? "From" : "In TO"}
                </th>
                <th>
                  Transfered{" "}
                  {stockFilter === "IN" ? "From" : "TO"}
                </th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {recentTransfers.map((transfer) => (
                <tr
                className="clickable-row"
                  key={
                    transfer.groupKey ||
                    transfer.transferNo ||
                    `${transfer.movementDate}-${transfer.shopCode}-${transfer.relatedShopCode}`
                  }
                >
                  {/* DATE / TIME */}
                  <td>
                    <strong>
                      {new Date(
                        transfer.movementDate,
                      ).toLocaleDateString()}
                    </strong>

                    <span>
                      {new Date(
                        transfer.movementDate,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </td>

                  {/* TYPE */}
                  <td>
                    <strong>
                      {transfer.movementType || "-"}
                    </strong>

                    {transfer.transferNo && (
                      <span>{transfer.transferNo}</span>
                    )}
                  </td>

                  <td>{transfer.controlNumber || "-"}</td>

                  {/* ALL ITEMS OF THIS TRANSFER */}
                  <td>
                    {transfer.items?.length ? (
                      transfer.items.map((movement) => (
                        <div
                          className="item-line"
                          key={movement.movementNo}
                        >
                          <strong>
                            {movement.itemCode || "-"}{" "}
                            {movement.product || ""}
                          </strong>

                          <span>
                            {Number(
                              movement.quantity || 0,
                            ).toFixed(3)}{" "}
                            {movement.unit || ""}
                          </span>
                        </div>
                      ))
                    ) : (
                      "-"
                    )}
                  </td>

                  {/* SOURCE SHOP */}
                  <td>
                    <strong>
                      {transfer.shopCode || "-"}
                    </strong>

                    <span>
                      {transfer.shopName || ""}
                    </span>
                  </td>

                  {/* DESTINATION SHOP */}
                  <td>
                    <strong>
                      {transfer.relatedShopCode || "-"}
                    </strong>

                    <span>
                      {transfer.relatedShopName || ""}
                    </span>
                  </td>

                  <td>
                    <div className="stock-status-cell">
                      <span className={`transfer-status ${transfer.transferStatus || ""}`}>
                        {getStatusLabel(
                          transfer.transferStatus,
                          transfer.movementType,
                        )}
                      </span>

                      {stockFilter === "IN" &&
                        transfer.transferStatus === "in_transit" &&
                        isReceiver(transfer) && (
                          <div className="transfer-menu-wrap">
                            <button
                              type="button"
                              className="transfer-menu-trigger"
                              aria-label={`Actions for ${transfer.transferNo || "transfer"}`}
                              aria-expanded={openActionMenu === transfer.transferId}
                              onClick={() =>
                                setOpenActionMenu((current) =>
                                  current === transfer.transferId
                                    ? ""
                                    : transfer.transferId,
                                )
                              }
                            >
                              <MoreVertical size={17} />
                            </button>

                            {openActionMenu === transfer.transferId && (
                              <div className="transfer-menu">
                                <button
                                  type="button"
                                  className="deliver-menu-action"
                                  disabled={busyKey === `deliver-transfer-${transfer.transferId}`}
                                  onClick={() => {
                                    setOpenActionMenu("");
                                    onMarkDelivered({ _id: transfer.transferId });
                                  }}
                                >
                                  {busyKey === `deliver-transfer-${transfer.transferId}`
                                    ? "Updating..."
                                    : isShopkeeper &&
                                        transfer.movementType === "TRANSFER_IN"
                                      ? "Mark Received"
                                      : "Mark Delivered"}
                                </button>
                                <button
                                  type="button"
                                  className="danger-menu-action"
                                  disabled={busyKey === `cancel-transfer-${transfer.transferId}`}
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to cancel this transfer?")) {
                                      setOpenActionMenu("");
                                      onCancelTransfer({ _id: transfer.transferId });
                                    }
                                  }}
                                >
                                  {busyKey === `cancel-transfer-${transfer.transferId}`
                                    ? "Cancelling..."
                                    : "Mark Cancel"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </td>
                </tr>
              ))}

              {!recentTransfers.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    {searchTerm
                      ? `No transfers found for "${searchTerm}".`
                      : `No ${
                          stockFilter === "IN"
                            ? "stock in"
                            : "stock out"
                        } records found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
