import { Notice } from "./Notice";
import { Sidebar } from "./Sidebar";
import { ViewTabs } from "./ViewTabs";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function WorkspaceShell({ activeView, busyKey, children, dateFilters, error, isAdmin, isLoggedIn, message, onRefresh, onShopChange, onViewChange, setDateFilters, shopId, shops, user }) {
  return <main className="app-shell">
    <Sidebar busyKey={busyKey} dateFilters={dateFilters} isLoggedIn={isLoggedIn} onRefreshInventory={onRefresh} onShopIdChange={onShopChange} setDateFilters={setDateFilters} shopId={shopId} shops={shops} user={user} />
    <section className="workspace">
      <WorkspaceHeader activeView={activeView} isLoggedIn={isLoggedIn} />
      <ViewTabs activeView={activeView} isAdmin={isAdmin} onChange={onViewChange} />
      <Notice error={error} message={message} />
      {children}
    </section>
  </main>;
}
