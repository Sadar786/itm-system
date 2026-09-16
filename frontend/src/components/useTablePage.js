import { useState } from "react";

export function useTablePage(rows, filterKey, pageSize = 20) {
  const [selection, setSelection] = useState({ key: filterKey, page: 1 });
  const page = Math.min(selection.key === filterKey ? selection.page : 1, Math.max(1, Math.ceil(rows.length / pageSize)));
  if (selection.key !== filterKey || selection.page !== page) {
    setSelection({ key: filterKey, page });
  }
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    page,
    total: rows.length,
    pageSize,
    onPageChange: (next) => setSelection({ key: filterKey, page: next }),
  };
}
