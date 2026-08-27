import { PackagePlus, PackageMinus, Send, Search, X } from "lucide-react";
import { useState } from "react";

export function StockView({
  isLoggedIn,
  movements,
  onOpenAddStock,
  onOpenTransferStock,
}) {
  const [stockFilter, setStockFilter] = useState("IN");
  const [searchTerm, setSearchTerm] = useState("");

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
      const key =
        movement.transferNo ||
        `${movement.movementDate}-${movement.shopCode}-${movement.relatedShopCode}`;

      if (!groups[key]) {
        groups[key] = {
          transferNo: movement.transferNo || "",
          movementDate: movement.movementDate,

          movementType: movement.movementType,

          shopCode: movement.shopCode,
          shopName: movement.shopName,

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
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const transferNo = transfer.transferNo?.toLowerCase() || "";

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

  return (
    <div className="stock-page">
      <div className="summary-grid">
        <article className="summary-card">
          <span>Transfers</span>
          <strong>{transferCount}</strong>
        </article>

        <article className="summary-card">
          <span>Movement Records</span>
          <strong>{movements.length}</strong>
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
                <th>Items</th>
                <th>
                  Transfered{" "}
                  {stockFilter === "OUT" ? "From" : "In TO"}
                </th>
                <th>
                  Transfered{" "}
                  {stockFilter === "IN" ? "From" : "TO"}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentTransfers.map((transfer) => (
                <tr
                className="clickable-row"
                  key={
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
                </tr>
              ))}

              {!recentTransfers.length && (
                <tr>
                  <td colSpan="5" className="empty-cell">
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