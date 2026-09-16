import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { apiJson } from "../../services/api";
import { analyticsQuery } from "./analyticsQuery";

export function AnalyticsTable({ section, title, description, searchPlaceholder, columns, rowKey, initialRows, initialPagination, token, shopId, dateRange, emptyMessage, onRowClick }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(null);
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const { startDate, endDate } = dateRange;
  const requestKey = JSON.stringify([section, shopId, startDate, endDate, query, retry]);
  const submittedSearch = query?.search || "";

  useEffect(() => {
    if (search.trim() === submittedSearch) return;
    const timer = setTimeout(() => {
      setQuery((previous) => ({ page: 1, limit: previous?.limit || 10, search: search.trim() }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, submittedSearch]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = analyticsQuery({ shopId, startDate, endDate });
        for (const [name, value] of Object.entries(query)) params.set(name, value);
        const response = await apiJson(`/analytics/tables/${section}?${params}`, token, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ key: requestKey, ...response.data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: error.message });
      }
    };
    load();
    return () => controller.abort();
  }, [query, section, shopId, startDate, endDate, token, requestKey]);

  const loading = query !== null && result?.key !== requestKey;
  const error = !loading && result?.error;
  const pagination = query === null ? initialPagination : result?.pagination || initialPagination;
  const { page, pages, limit, total } = pagination;
  const rows = loading || error ? [] : query === null ? initialRows : result.rows;
  const changePage = (nextPage) => setQuery({ page: nextPage, limit, search: submittedSearch });
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  const firstRow = total ? (page - 1) * limit + 1 : 0;
  const lastRow = Math.min(page * limit, total);

  return <section className="history-panel analytics-table-panel" aria-labelledby={`${section}-title`}>
    <div className="section-toolbar">
      <div><h3 id={`${section}-title`}>{title}</h3><span>{description}</span></div>
      <div className="analytics-table-tools">
        <div className="analytics-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} aria-label={`Search ${title}`} />
          {search && <button type="button" onClick={() => setSearch("")} aria-label={`Clear ${title} search`}><X size={14} /></button>}
        </div>
        <label className="analytics-row-limit">Rows
          <select value={query?.limit || 10} aria-label={`Rows per page for ${title}`} onChange={(event) => setQuery({ page: 1, limit: Number(event.target.value), search: search.trim() })}>
            {[5, 10, 25, 50].map((size) => <option value={size} key={size}>{size}</option>)}
          </select>
        </label>
      </div>
    </div>
    <div className="table-wrap" aria-busy={loading}>
      <table className="analytics-table" aria-label={title}>
        <thead className="table-head"><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.numeric ? "analytics-number" : undefined}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={rowKey(row)} className={onRowClick ? "clickable-row" : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((column) => <td key={column.key} className={column.numeric ? "analytics-number" : undefined}>{column.render(row)}</td>)}
          </tr>)}
          {!rows.length && <tr><td colSpan={columns.length} className="empty-cell analytics-empty">
            {loading ? <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} /> : error ? <div role="alert">{error} <button type="button" className="secondary-action" onClick={() => setRetry((value) => value + 1)}>Retry</button></div> : <span>{submittedSearch ? `No results for “${submittedSearch}”. Try another search.` : emptyMessage}</span>}
          </td></tr>}
        </tbody>
      </table>
    </div>
    <div className="analytics-pagination">
      <span className="analytics-page-info" aria-live="polite">{loading ? "Updating results…" : error ? "Could not load results" : `Showing ${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${total.toLocaleString()}${submittedSearch ? " matching" : ""} rows`}</span>
      <nav aria-label={`${title} pagination`}>
        <button type="button" className="analytics-page-button" disabled={loading || Boolean(error) || page <= 1} onClick={() => changePage(page - 1)} aria-label={`Previous page of ${title}`}><ChevronLeft size={16} aria-hidden="true" />Previous</button>
        {pageNumbers.map((number, index) => <span key={number}>
          {index > 0 && number > pageNumbers[index - 1] + 1 && <span className="analytics-page-gap" aria-hidden="true">…</span>}
          <button type="button" className={`analytics-page-button${number === page ? " is-current" : ""}`} aria-label={`Page ${number} of ${title}`} aria-current={number === page ? "page" : undefined} disabled={loading || Boolean(error)} onClick={() => changePage(number)}>{number}</button>
        </span>)}
        <button type="button" className="analytics-page-button" disabled={loading || Boolean(error) || page >= pages} onClick={() => changePage(page + 1)} aria-label={`Next page of ${title}`}>Next<ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </div>
  </section>;
}
