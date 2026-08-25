import { FileSpreadsheet, PackagePlus, Repeat2, Settings2 } from 'lucide-react'

export function ViewTabs({ activeView, onChange, isAdmin }) {
  return (
    <div className={`view-tabs ${isAdmin ? 'four-tabs' : 'three-tabs'}`} aria-label="Main view">
      <button
        type="button"
        className={activeView === 'stock' ? 'active' : ''}
        onClick={() => onChange('stock')}
      >
        <PackagePlus size={16} />
        Transfers
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
        Transfers History
      </button>
      {isAdmin ? (
        console.log("isAdmin from ViewTabs:", isAdmin), // Log the value of isAdmin for debugging
        <button
          type="button"
          className={activeView === 'admin' ? 'active' : ''}
          onClick={() => onChange('admin')}
        >
          <Settings2 size={16} />
          Manage
        </button>
      ) : null}
    </div>
  )
}
