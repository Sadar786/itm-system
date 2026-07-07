import { RefreshCw, Store } from 'lucide-react'

export function BranchPanel({
  busyKey,
  isLoggedIn,
  onRefreshInventory,
  onShopIdChange,
  shopId,
  shops,
  user,
}) {
  const availableShops =
    user?.role === 'admin' ? shops : shops.filter((shop) => shop._id === user?.shopId)

  return (
    <section className="panel filters-panel">
      <div className="panel-title">
        <Store size={18} />
        <h2>Branch</h2>
      </div>

      <label>
        Branch
        <select
          value={shopId}
          onChange={(event) => onShopIdChange(event.target.value)}
          disabled={!isLoggedIn || user?.role !== 'admin'}
        >
          <option value="">Select branch</option>
          {availableShops.map((shop) => (
            <option key={shop._id} value={shop._id}>
              {shop.code ? `${shop.code} - ${shop.name}` : shop.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="secondary-button"
        onClick={onRefreshInventory}
        disabled={!isLoggedIn || Boolean(busyKey)}
      >
        <RefreshCw
          size={16}
          className={busyKey === 'inventory-refresh' ? 'spin' : ''}
        />
        Refresh Data
      </button>
    </section>
  )
}
