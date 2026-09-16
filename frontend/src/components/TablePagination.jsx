import { ChevronLeft, ChevronRight } from "lucide-react";
import "./tables.css";

export function TablePagination({ page, total, pageSize = 20, onPageChange, disabled = false, label = "Table" }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  return <div className="list-pagination">
    <span>{total ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total}` : "0 records"}</span>
    <nav aria-label={`${label} pages`}>
      <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage <= 1} aria-label={`Previous ${label.toLowerCase()} page`}><ChevronLeft size={15} />Previous</button>
      <span aria-live="polite">Page {currentPage} of {pages}</span>
      <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={disabled || currentPage >= pages} aria-label={`Next ${label.toLowerCase()} page`}>Next<ChevronRight size={15} /></button>
    </nav>
  </div>;
}
