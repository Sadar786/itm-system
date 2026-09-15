export function WorkspaceHeader({ activeView, isLoggedIn }) {
  const isStock = activeView === 'stock'
  const isTransfers = activeView === 'transfers'
  const isAdmin = activeView === 'admin'
  const isWastage = activeView === 'wastage'

  return (
    <div className="workspace-header">
      <div>
        <h2>
          {activeView === 'analytics' ? 'Analytics' : isWastage ? 'Wastage' : isStock
            ? 'Incoming and Transfers'
            : isTransfers
              ? 'Transfer History'
              : isAdmin
                ? 'Branch and Product Management'
                : 'Report Downloads'}
        </h2>
        <p>
          {activeView === 'analytics' ? 'Transfers and wastage for the selected branch and dates.' : isWastage ? 'Record wasted products for your branch.' : isStock
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
