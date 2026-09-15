import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  logout,
  selectAuthError,
  selectAuthMessage,
  selectIsLoggedIn,
  selectToken,
  selectUser,
} from "./features/auth/authSlice";
import { AdminFeature } from "./features/admin/AdminFeature";
import {
  clearCatalog,
  fetchCatalogCategories,
  fetchCatalogProducts,
  fetchCatalogShops,
  fetchCatalogTransferDestinationShops,
  fetchCatalogUnits,
  selectCatalogShops,
} from "./features/catalog/catalogSlice";
import { ReportsFeature } from "./features/reports/ReportsFeature";
import { StockFeature } from "./features/stock/StockFeature";
import { clearMovements, fetchMovements } from "./features/stock/stockSlice";
import {
  clearTransfers,
  fetchTransfers,
} from "./features/transfers/transferSlice";
import { TransfersView } from "./features/transfers/TransfersView";
import { WastageFeature } from "./features/wastage/WastageFeature";
import { WorkspaceShell } from "./components/WorkspaceShell";
import { currentMonth, todayDate } from "./utils/format";
import "./App.css";
import { AnalyticsView } from "./features/analytics/AnalyticsView";

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id?.toString?.() || value.toString?.() || "";
};

const getMovementDateRange = (dateFilters) => {
  if (dateFilters.dateMode === "month" && dateFilters.month) {
    const [year, month] = dateFilters.month.split("-").map(Number);

    return {
      startDate: `${dateFilters.month}-01`,
      endDate: new Date(Date.UTC(year, month, 0))
        .toISOString()
        .slice(0, 10),
    };
  }

  return {
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  };
};

function App() {
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authError = useSelector(selectAuthError);
  const authMessage = useSelector(selectAuthMessage);
  const shops = useSelector(selectCatalogShops);

  const [activeView, setActiveView] = useState("stock");
  const [wastageSearch, setWastageSearch] = useState("");
  const [shopId, setShopId] = useState(() => getId(user?.shopId));
  const [dateFilters, setDateFilters] = useState({
    dateMode: "month",
    month: currentMonth(),
    startDate: todayDate(),
    endDate: todayDate(),
  });
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  const updateNotice = useCallback(({ error: nextError = "", message: nextMessage = "" }) => {
    setError(nextError);
    setMessage(nextMessage);
  }, []);

  const loadMovements = useCallback(
    (search = "") =>
      dispatch(
        fetchMovements({
          shopId,
          ...getMovementDateRange(dateFilters),
          search,
        }),
      ).unwrap(),
    [dateFilters, dispatch, shopId],
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
    dispatch(clearCatalog());
    dispatch(clearMovements());
    dispatch(clearTransfers());
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;

    const loadInitialData = async () => {
      setBusyKey("initial-load");
      setError("");

      try {
        await Promise.all([
          dispatch(fetchCatalogProducts()).unwrap(),
          dispatch(fetchCatalogShops()).unwrap(),
          dispatch(fetchCatalogTransferDestinationShops()).unwrap(),
          dispatch(fetchCatalogCategories()).unwrap(),
          dispatch(fetchCatalogUnits()).unwrap(),
          dispatch(fetchTransfers()).unwrap(),
        ]);
      } catch (loadError) {
        setError(loadError.message || "Failed to load dashboard data.");
      } finally {
        setBusyKey("");
      }
    };

    loadInitialData();
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;

    loadMovements().catch((loadError) => {
      setError(loadError.message || "Failed to load stock movements.");
    });
  }, [loadMovements, token]);

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, message]);

  useEffect(() => {
    const loginTime = localStorage.getItem("inventoryLoginTime");

    if (!loginTime || !token) return;

    const remainingTime = 12 * 60 * 60 * 1000 - (Date.now() - Number(loginTime));

    if (remainingTime <= 0) {
      handleLogout();
      return;
    }

    const logoutTimer = setTimeout(handleLogout, remainingTime);
    return () => clearTimeout(logoutTimer);
  }, [handleLogout, token]);

  const handleRefreshInventory = async () => {
    setBusyKey("inventory-refresh");
    updateNotice({});

    try {
      await Promise.all([
        dispatch(fetchCatalogProducts()).unwrap(),
        dispatch(fetchCatalogShops()).unwrap(),
        dispatch(fetchCatalogTransferDestinationShops()).unwrap(),
        dispatch(fetchCatalogCategories()).unwrap(),
        dispatch(fetchCatalogUnits()).unwrap(),
        dispatch(fetchTransfers()).unwrap(),
        loadMovements(),
      ]);
      setMessage("Stock actions refreshed.");
    } catch (refreshError) {
      setError(refreshError.message || "Failed to refresh inventory.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <WorkspaceShell
      activeView={activeView}
      busyKey={busyKey}
      dateFilters={dateFilters}
      error={error || authError}
      isAdmin={isAdmin}
      isLoggedIn={isLoggedIn}
      message={message || authMessage}
      onRefresh={handleRefreshInventory}
      onShopChange={setShopId}
      onViewChange={setActiveView}
      setDateFilters={setDateFilters}
      shopId={shopId}
      shops={shops}
      user={user}
    >
      {activeView === "stock" ? (
        <StockFeature
          dateFilters={dateFilters}
          onNotice={updateNotice}
          shopId={shopId}
        />
      ) : activeView === "wastage" ? (
        <WastageFeature key={token || "guest"} shopId={shopId} dateRange={getMovementDateRange(dateFilters)} search={wastageSearch} onSearchChange={setWastageSearch} />
      ) : activeView === "analytics" ? (
        <AnalyticsView key={token || "guest"} shopId={shopId} dateRange={getMovementDateRange(dateFilters)} />
      ) : activeView === "reports" ? (
        <ReportsFeature dateFilters={dateFilters} shopId={shopId} wastageSearch={wastageSearch} wastageDateRange={getMovementDateRange(dateFilters)} />
      ) : activeView === "admin" ? (
        <AdminFeature
          onNotice={updateNotice}
          onShopAssigned={setShopId}
        />
      ) : (
        <TransfersView />
      )}
    </WorkspaceShell>
  );
}

export default App;
