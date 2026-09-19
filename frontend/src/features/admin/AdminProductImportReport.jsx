import { useMemo, useState } from "react";
import { TablePagination } from "../../components/TablePagination";
import { TableScroll } from "../../components/TableScroll";
import { useTablePage } from "../../components/useTablePage";
import "./productImportReport.css";

export function AdminProductImportReport({ result }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const summary = result.summary || {};
  const issues = useMemo(
    () => [
      ...(result.skipped || []).map((row) => ({ ...row, status: "Skipped" })),
      ...(result.failed || []).map((row) => ({ ...row, status: "Failed" })),
    ].sort((a, b) => a.row - b.row),
    [result],
  );
  const hasDescriptions = issues.some(
    (row) => row.excelDescription !== undefined || row.existingDescription !== undefined,
  );
  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter((row) =>
      (status === "all" || row.status === status) &&
      (!query || [row.row, row.itemCode, row.reason, row.excelDescription, row.existingDescription]
        .some((value) => String(value ?? "").toLowerCase().includes(query))),
    );
  }, [issues, search, status]);
  const page = useTablePage(filteredIssues, `${status}:${search}`);

  return (
    <section className="product-import-report" aria-labelledby="product-import-report-title">
      <h3 id="product-import-report-title">Excel import results</h3>
      <p className="product-import-source">
        {result.filename}
        {result.sheetName && <> &middot; Sheet: {result.sheetName}</>}
      </p>
      <dl className="product-import-summary" aria-live="polite">
        <div><dt>Rows read</dt><dd>{summary.totalRows ?? 0}</dd></div>
        <div><dt>Created</dt><dd>{summary.created ?? 0}</dd></div>
        <div><dt>Skipped</dt><dd>{summary.skipped ?? 0}</dd></div>
        <div><dt>Failed</dt><dd>{summary.failed ?? 0}</dd></div>
      </dl>

      {issues.length ? (
        <>
          <p>Review the rows below using their row numbers in your original Excel sheet. Existing item codes are skipped; saved products keep their descriptions.</p>
          <div className="product-import-filters">
            <label>
              Find a row
              <input
                type="search"
                placeholder="Row, item code, description or reason"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Show
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Skipped and failed rows</option>
                <option value="Skipped">Skipped rows</option>
                <option value="Failed">Failed rows</option>
              </select>
            </label>
          </div>
          <TableScroll label="Excel import rows to review" className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Excel row</th>
                  <th scope="col">Item code</th>
                  <th scope="col">Result</th>
                  <th scope="col">Reason</th>
                  {hasDescriptions && <th scope="col">Excel description</th>}
                  {hasDescriptions && <th scope="col">Saved description</th>}
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={`${row.status}:${row.row}`}>
                    <td>{row.row ?? "-"}</td>
                    <td>{row.itemCode || "-"}</td>
                    <td>{row.status}</td>
                    <td className="product-import-detail">{row.reason}</td>
                    {hasDescriptions && <td className="product-import-detail">{row.excelDescription ?? "-"}</td>}
                    {hasDescriptions && <td className="product-import-detail">{row.existingDescription ?? "-"}</td>}
                  </tr>
                ))}
                {!page.total && (
                  <tr><td colSpan={hasDescriptions ? 6 : 4} className="empty-cell">No rows match your search.</td></tr>
                )}
              </tbody>
            </table>
          </TableScroll>
          <TablePagination {...page} label="Import results" />
        </>
      ) : (
        <p>All rows were imported successfully.</p>
      )}
    </section>
  );
}
