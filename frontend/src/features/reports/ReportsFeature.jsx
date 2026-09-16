import { useState } from "react";
import { useSelector } from "react-redux";
import { Notice } from "../../components/Notice";
import { selectIsLoggedIn, selectToken, selectUser } from "../auth/authSlice";
import { API_BASE_URL, downloadReport } from "../../services/api";
import { ReportsView } from "./ReportsView";

export function ReportsFeature({ dateFilters, shopId, wastageSearch, wastageDateRange }) {
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const onDownload = async (report) => {
    const params = new URLSearchParams();
    if (report.key === "wastage") {
      if (wastageDateRange.startDate) params.set("startDate", new Date(`${wastageDateRange.startDate}T00:00:00`).toISOString());
      if (wastageDateRange.endDate) params.set("endDate", new Date(`${wastageDateRange.endDate}T23:59:59.999`).toISOString());
      if (wastageSearch?.trim()) params.set("search", wastageSearch.trim());
    }
    if (report.useShop && shopId.trim()) params.set("shopId", shopId.trim());
    if (report.useDates) { if (dateFilters.startDate) params.set("startDate", dateFilters.startDate); if (dateFilters.endDate) params.set("endDate", dateFilters.endDate); }
    if (report.useDateMode && dateFilters.dateMode === "month") params.set("month", dateFilters.month);
    setBusyKey(report.key); setError(""); setMessage("");
    try { const name = await downloadReport({ token, url: `${API_BASE_URL}${report.path}${params.size ? `?${params}` : ""}`, fallbackFilename: report.filename }); setMessage(`${name} downloaded.`); }
    catch (downloadError) { setError(downloadError.message); } finally { setBusyKey(""); }
  };
  return <><Notice error={error} message={message} /><ReportsView busyKey={busyKey} isAdmin={user?.role === "admin"} isLoggedIn={isLoggedIn} onDownload={onDownload} /></>;
}
