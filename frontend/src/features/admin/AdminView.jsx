import { Pencil, Plus, Trash2 } from 'lucide-react'

export function AdminView({
  isLoggedIn,
  isShopkeeper,
  user,
  products,
  shops,
  onCreateProduct,
  onCreateShop,
  onProductDelete,
  onProductEdit,
  onShopDelete,
  onShopEdit,
}) {
  const canCreateShop = !isShopkeeper || !user?.shopId
  const showProductSection = !isShopkeeper

  return (
    <div className="admin-page">
      <div className="admin-sections">
        <section className="panel admin-panel">
          <div className="panel-title">
            <h2>Branch management</h2>
            {canCreateShop ? (
              <button type="button" className="primary-action" onClick={onCreateShop} disabled={!isLoggedIn}>
                <Plus size={16} /> Create branch
              </button>
            ) : null}
          </div>

          <div className="table-wrap admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => (
                  <tr key={shop._id}>
                    <td>{shop.name}</td>
                    <td>{shop.code}</td>
                    <td>{shop.location || '-'}</td>
                    <td>{shop.phone || '-'}</td>
                    <td>{shop.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="table-actions-cell">
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit branch"
                        onClick={() => onShopEdit(shop)}
                      >
                        <Pencil size={16} />
                      </button>
                      {!isShopkeeper ? (
                        <button
                          type="button"
                          className="icon-button secondary-action"
                          title="Delete branch"
                          onClick={() => onShopDelete(shop._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!shops.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      No branches loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {showProductSection ? (
          <section className="panel admin-panel">
            <div className="panel-title">
              <h2>Product management</h2>
              <button type="button" className="primary-action" onClick={onCreateProduct} disabled={!isLoggedIn}>
                <Plus size={16} /> Create product
              </button>
            </div>

            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item code</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Perishable</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>{product.itemCode}</td>
                      <td>{product.description}</td>
                      <td>{product.categoryId?.name || '-'}</td>
                      <td>{product.defaultUnitId?.shortName || product.defaultUnitId?.name || '-'}</td>
                      <td>{product.isPerishable ? 'Yes' : 'No'}</td>
                      <td className="table-actions-cell">
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit product"
                          onClick={() => onProductEdit(product)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button secondary-action"
                          title="Delete product"
                          onClick={() => onProductDelete(product._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!products.length && (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        No products loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
