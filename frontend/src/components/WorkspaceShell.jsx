import { LoadingSpinner } from "./LoadingSpinner";
import { Notice } from "./Notice";
import { Sidebar } from "./Sidebar";
import { ViewTabs } from "./ViewTabs";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function WorkspaceShell({ activeView, busyKey, children, dateFilters, error, isAdmin, isLoggedIn, message, onRefresh, onShopChange, onViewChange, setDateFilters, shopId, shops, user }) {
  return <main className="app-shell">
    <Sidebar busyKey={busyKey} dateFilters={dateFilters} isLoggedIn={isLoggedIn} onRefreshInventory={onRefresh} onShopIdChange={onShopChange} setDateFilters={setDateFilters} shopId={shopId} shops={shops} user={user} />
    <section className="workspace">
      {isLoggedIn ? <>
      <WorkspaceHeader activeView={activeView} isLoggedIn={isLoggedIn} />
      <ViewTabs activeView={activeView} isAdmin={isAdmin} onChange={onViewChange} />
      <Notice error={error} message={message} />
      {busyKey === "initial-load" && <LoadingSpinner label="Loading products and dashboard..." />}
      <div hidden={busyKey === "initial-load"}>{children}</div>
      </> : <section className="panel">
        <h2>Welcome to Prime Gourmet</h2>
        <p>Sign in to view inventory, transfers, wastage, and reports.</p>
        <Notice error={error} message={message} />
      </section>}
    </section>
  </main>;
}
