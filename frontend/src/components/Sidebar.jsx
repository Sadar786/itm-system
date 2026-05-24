import { Store } from "lucide-react";
import { BranchPanel } from "./BranchPanel";
import { ReportDatePanel } from "./ReportDatePanel";
import { SessionPanel } from "./SessionPanel";
import logo from "../assets/logo.png";

export function Sidebar({
  busyKey,
  dateFilters,
  email,
  isLoggedIn,
  onEmailChange,
  onLogin,
  onLogout,
  onPasswordChange,
  onSignup,
  onForgotPassword,
  onConfirmPasswordChange,
  onAuthModeChange,
  authMode,
  name,
  onNameChange,
  confirmPassword,
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
          <img
            src={logo}
            alt="Inventory Control logo"
            className="brand-logo"
          />
        </div>
        <div>
          <h1>Inventory Control</h1>
          <p>Branch stock, transfers, and reports</p>
        </div>
      </div>

      <SessionPanel
        authMode={authMode}
        busyKey={busyKey}
        email={email}
        isLoggedIn={isLoggedIn}
        name={name}
        onNameChange={onNameChange}
        onEmailChange={onEmailChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onSignup={onSignup}
        onForgotPassword={onForgotPassword}
        onPasswordChange={onPasswordChange}
        onConfirmPasswordChange={onConfirmPasswordChange}
        onAuthModeChange={onAuthModeChange}
        password={password}
        confirmPassword={confirmPassword}
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
  );
}
