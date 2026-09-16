import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectToken, selectUser } from "../auth/authSlice";
import { apiJson } from "../../services/api";
import { analyticsQuery } from "./analyticsQuery";

export function useAnalytics({ shopId, dateRange, summaryOnly = false }) {
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const revision = useSelector((state) => state.transfers.revision);
  const movements = useSelector((state) => state.stock.movements);
  const branch = user?.role === "admin" ? shopId : "";
  const { startDate, endDate } = dateRange;
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([token, branch, startDate, endDate, summaryOnly, revision, retry]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = analyticsQuery({ shopId: branch, startDate, endDate });
        if (summaryOnly) params.set("summaryOnly", "true");
        const response = await apiJson(`/analytics?${params}`, token, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ key, data: response.data, loadedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error.message });
      }
    };
    load();
    return () => controller.abort();
  }, [token, branch, startDate, endDate, summaryOnly, key, movements]);
  return { token, result, key, current: result?.key === key, refresh: () => setRetry((value) => value + 1) };
}
