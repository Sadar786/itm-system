export function WorkspaceHeader({ activeView, isLoggedIn }) {
  const isStock = activeView === 'stock'
  const isTransfers = activeView === 'transfers'
  const isAdmin = activeView === 'admin'

  return (
    <div className="workspace-header">
      <div>
        <h2>
          {isStock
            ? 'Incoming and Transfers'
            : isTransfers
              ? 'Transfer History'
              : isAdmin
                ? 'Branch and Product Management'
                : 'Report Downloads'}
        </h2>
        <p>
          {isStock
            ? 'Record incoming stock and branch-to-branch transfers.'
            : isTransfers
              ? 'Recent branch-to-branch stock movements.'
              : isAdmin
                ? 'Create, edit, and delete branches and products.'
                : 'Exports save as Excel files from the backend report routes.'}
        </p>
      </div>
      <span className={isLoggedIn ? 'status online' : 'status'} />
    </div>
  )
}
