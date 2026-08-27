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

  const transferCount = movements.filter((movement) =>
    movement.movementType?.startsWith("TRANSFER"),
  ).length;

  // Filter by Stock In / Stock Out
  const filteredByType = movements.filter((movement) => {
    if (stockFilter === "IN") {
      return movement.movementType === "TRANSFER_IN";
    }

    if (stockFilter === "OUT") {
      return movement.movementType === "TRANSFER_OUT";
    }

    return true;
  });

  // Search
  const filteredMovements = filteredByType.filter((movement) => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    return (
      movement.transferNo?.toLowerCase().includes(search) ||
      movement.movementNo?.toLowerCase().includes(search) ||
      movement.itemCode?.toLowerCase().includes(search) ||
      movement.product?.toLowerCase().includes(search) ||
      movement.relatedShopCode?.toLowerCase().includes(search) ||
      movement.relatedShopName?.toLowerCase().includes(search) ||
      movement.shopCode?.toLowerCase().includes(search) ||
      movement.shopName?.toLowerCase().includes(search)
    );
  });

  const recentMovements = filteredMovements.slice(0, 20);

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
            stockFilter === "IN" ? "primary-action" : "secondary-action"
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
            stockFilter === "OUT" ? "primary-action" : "secondary-action"
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
            <h3>{stockFilter === "IN" ? "Stock In" : "Stock Out"}</h3>

            <span>
              {searchTerm
                ? `Showing results for "${searchTerm}"`
                : stockFilter === "IN"
                  ? "Showing transfer-in stock records."
                  : "Showing transfer-out stock records."}
            </span>
          </div>

          {searchTerm && (
            <strong>
              {filteredMovements.length} result
              {filteredMovements.length !== 1 ? "s" : ""}
            </strong>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Transfered {stockFilter === "OUT" ? "From" : "In TO"}</th>
                <th>Transfered {stockFilter === "IN" ? "From" : "TO"}</th>
                <th>Qty</th>
                <th>Unit</th>
              </tr>
            </thead>

            <tbody>
              {recentMovements.map((movement) => (
                <tr key={movement.movementNo}>


                  <td>
                    <strong>
                      {new Date(movement.movementDate).toLocaleDateString()}
                    </strong>

                    <span>
                      {new Date(movement.movementDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </td>

                  <td>{movement.movementType}</td>

                  <td>
                    <strong>{movement.itemCode || "-"}</strong>

                    <span>{movement.product || ""}</span>
                  </td>

                  <td>
                    <strong>{movement.shopCode || "-"}</strong>

                    <span>{movement.shopName || ""}</span>
                  </td>
                  
                  <td>
                    <strong>{movement.relatedShopCode || "-"}</strong>

                    <span>{movement.relatedShopName || ""}</span>
                  </td>

                  <td>{Number(movement.quantity || 0).toFixed(3)}</td>

                  <td>{movement.unit || "-"}</td>
                </tr>
              ))}

              {!recentMovements.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    {searchTerm
                      ? `No transfers found for "${searchTerm}".`
                      : `No ${
                          stockFilter === "IN" ? "stock in" : "stock out"
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
