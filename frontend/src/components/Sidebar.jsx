import { Store } from 'lucide-react'
import { BranchPanel } from './BranchPanel'
import { ReportDatePanel } from './ReportDatePanel'
import { SessionPanel } from './SessionPanel'

export function Sidebar({
  busyKey,
  dateFilters,
  email,
  isLoggedIn,
  onEmailChange,
  onLogin,
  onLogout,
  onPasswordChange,
  onRefreshInventory,
  onShopIdChange,
  password,
  setDateFilters,
  shopId,
  shops,
  user,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Store size={24} />
        </div>
        <div>
          <h1>Inventory Control</h1>
          <p>Branch stock, transfers, and reports</p>
        </div>
      </div>

      <SessionPanel
        busyKey={busyKey}
        email={email}
        isLoggedIn={isLoggedIn}
        onEmailChange={onEmailChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onPasswordChange={onPasswordChange}
        password={password}
        user={user}
      />

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
          setDateFilters((current) => ({ ...current, dateMode }))
        }
        onEndDateChange={(endDate) =>
          setDateFilters((current) => ({ ...current, endDate }))
        }
        onMonthChange={(month) =>
          setDateFilters((current) => ({ ...current, month }))
        }
        onStartDateChange={(startDate) =>
          setDateFilters((current) => ({ ...current, startDate }))
        }
        startDate={dateFilters.startDate}
      />
    </aside>
  )
}
