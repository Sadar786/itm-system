export function WorkspaceHeader({ activeView, isLoggedIn }) {
  const isStock = activeView === 'stock'
  const isTransfers = activeView === 'transfers'

  return (
    <div className="workspace-header">
      <div>
        <h2>
          {isStock
            ? 'Current Stock'
            : isTransfers
              ? 'Transfer History'
              : 'Report Downloads'}
        </h2>
        <p>
          {isStock
            ? 'Review branch inventory and add received stock.'
            : isTransfers
              ? 'Recent branch-to-branch stock movements.'
              : 'Exports save as Excel files from the backend report routes.'}
        </p>
      </div>
      <span className={isLoggedIn ? 'status online' : 'status'} />
    </div>
  )
}
