import { FileSpreadsheet, Repeat2, TableProperties } from 'lucide-react'

export function ViewTabs({ activeView, onChange }) {
  return (
    <div className="view-tabs three-tabs" aria-label="Main view">
      <button
        type="button"
        className={activeView === 'stock' ? 'active' : ''}
        onClick={() => onChange('stock')}
      >
        <TableProperties size={16} />
        Stock
      </button>
      <button
        type="button"
        className={activeView === 'reports' ? 'active' : ''}
        onClick={() => onChange('reports')}
      >
        <FileSpreadsheet size={16} />
        Reports
      </button>
      <button
        type="button"
        className={activeView === 'transfers' ? 'active' : ''}
        onClick={() => onChange('transfers')}
      >
        <Repeat2 size={16} />
        Transfers
      </button>
    </div>
  )
}
