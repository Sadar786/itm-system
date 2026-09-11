import { BranchPanel } from "./BranchPanel";
import { ReportDatePanel } from "./ReportDatePanel";
import { SessionPanel } from "./SessionPanel";
import Footer from "./Footer";
import logo from "../assets/logo1.jpeg";

export function Sidebar({
  busyKey,
  dateFilters,
  isLoggedIn,
  onRefreshInventory,
  onShopIdChange,
  setDateFilters,
  shopId,
  shops,
  user,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img
            src={logo}
            alt="Inventory Control logo"
            className="brand-logo"
          />
        </div>

        <div>
          <h1>Prime Gourmet</h1>
          <p>Inter Branch Transfers and reports</p>
        </div>
      </div>

      {/* Authentication is now handled directly by Redux */}
      <SessionPanel />

      <BranchPanel
        busyKey={busyKey}
        isLoggedIn={isLoggedIn}
        onRefreshInventory={onRefreshInventory}
        onShopIdChange={onShopIdChange}
        shopId={shopId}
        shops={shops}
        user={user}
      />

      <ReportDatePanel
        dateMode={dateFilters.dateMode}
        endDate={dateFilters.endDate}
        month={dateFilters.month}
        onDateModeChange={(dateMode) =>
          setDateFilters((current) => ({
            ...current,
            dateMode,
          }))
        }
        onEndDateChange={(endDate) =>
          setDateFilters((current) => ({
            ...current,
            endDate,
          }))
        }
        onMonthChange={(month) =>
          setDateFilters((current) => ({
            ...current,
            month,
          }))
        }
        onStartDateChange={(startDate) =>
          setDateFilters((current) => ({
            ...current,
            startDate,
          }))
        }
        startDate={dateFilters.startDate}
      />

{/* footer */}
      <Footer />
    </aside>
  );
}