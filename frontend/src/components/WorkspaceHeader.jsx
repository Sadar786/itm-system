export function WorkspaceHeader({ activeView, isLoggedIn }) {
  const isStock = activeView === 'stock'
  const isTransfers = activeView === 'transfers'
  const isAdmin = activeView === 'admin'
  const isAnalytics = activeView === 'analytics'

  return (
    <div className="workspace-header">
      <div>
        <h2>
          {isStock
            ? 'Current Stock'
            : isAnalytics
              ? 'Analytics'
              : isTransfers
                ? 'Transfer History'
                : isAdmin
                  ? 'Branch and Product Management'
                  : 'Report Downloads'}
        </h2>
        <p>
          {isStock
            ? 'Review branch inventory and add received stock.'
            : isAnalytics
              ? 'Explore key inventory and transfer analytics in one place.'
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
