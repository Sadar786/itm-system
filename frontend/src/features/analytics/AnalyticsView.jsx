export function AnalyticsView({ analyticsMetrics }) {
  return (
    <div className="analytics-page">
      <div className="analytics-grid">
        <article className="summary-card analytics-card">
          <span>Total Branches</span>
          <strong>{analyticsMetrics.branchCount}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Total Products</span>
          <strong>{analyticsMetrics.productCount}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Inventory Rows</span>
          <strong>{analyticsMetrics.inventoryRows}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Total Quantity</span>
          <strong>{analyticsMetrics.totalQuantity.toFixed(3)}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Low Stock Rows</span>
          <strong>{analyticsMetrics.lowStockRows}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>High Stock Rows</span>
          <strong>{analyticsMetrics.highStockRows}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Total Transfers</span>
          <strong>{analyticsMetrics.transferCount}</strong>
        </article>
        <article className="summary-card analytics-card">
          <span>Total Transferred Qty</span>
          <strong>{analyticsMetrics.totalTransferredQuantity.toFixed(3)}</strong>
        </article>
      </div>

      <section className="report-card">
        <div className="panel-title">
          <h2>Analytics Summary</h2>
        </div>
        <div>
          <div className="section-toolbar">
            <div>
              <h3>Top Inventory Highlights</h3>
              <span>Current inventory and transfer data are used to generate these metrics.</span>
            </div>
          </div>
          <div className="analytics-grid">
            <article className="summary-card analytics-card">
              <span>Highest Stock Product</span>
              <strong>{analyticsMetrics.maxProductName}</strong>
              <span>{analyticsMetrics.maxQuantity.toFixed(3)}</span>
            </article>
            <article className="summary-card analytics-card">
              <span>Top Branch by Stock</span>
              <strong>{analyticsMetrics.topBranchLabel}</strong>
              <span>{analyticsMetrics.topBranchQuantity.toFixed(3)}</span>
            </article>
            <article className="summary-card analytics-card">
              <span>Top Product by Quantity</span>
              <strong>{analyticsMetrics.topProductLabel}</strong>
              <span>{analyticsMetrics.topProductQuantity.toFixed(3)}</span>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
