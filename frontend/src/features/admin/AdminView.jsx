import { useState, useMemo } from "react";
import { FileSpreadsheet, Pencil, Plus, Trash2, Download } from "lucide-react";
import { downloadProductsExcel } from "../../services/api.js";

export function AdminView({
  isLoggedIn,
  isShopkeeper,
  user,
  products,
  shops,
  units,
  onCreateProduct,
  onImportProducts,
  onCreateShop,
  onCreateUnit,
  onProductDelete,
  onProductEdit,
  onShopDelete,
  onShopEdit,
  onUnitEdit,
  onUnitDelete,
}) {
  const [activeSection, setActiveSection] = useState("branches");
  const [branchSearch, setBranchSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const canCreateShop = !isShopkeeper || !user?.shopId;
  const showProductSection = !isShopkeeper;

  const sections = [
    {
      id: "branches",
      label: "Branches",
      visible: true,
    },
    {
      id: "products",
      label: "Products",
      visible: showProductSection,
    },
    {
      id: "units",
      label: "Units",
      visible: !isShopkeeper,
    },
  ];

  const filteredShops = useMemo(() => {
    const search = branchSearch.toLowerCase().trim();

    if (!search) return shops;

    return shops.filter((shop) =>
      [
        shop.name,
        shop.code,
        shop.location,
        shop.phone,
        shop.isActive ? "active" : "inactive",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [shops, branchSearch]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase().trim();

    if (!search) return products;

    return products.filter((product) =>
      [
        product.itemCode,
        product.description,
        product.categoryId?.name,
        product.defaultUnitId?.name,
        product.defaultUnitId?.shortName,
        product.isPerishable ? "yes" : "no",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [products, productSearch]);

  const handleDownloadProducts = async () => {
    try {
      await downloadProductsExcel({
        token: localStorage.getItem("inventoryToken"),
      });
    } catch (error) {
      console.error("Product download failed:", error);
      alert(error.message || "Failed to download products.");
    }
  };

  return (
    <div className="admin-page">
      {/* =========================
          ADMIN TABS
      ========================= */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: "1px solid #ddd",
          paddingBottom: "10px",
        }}
      >
        {sections
          .filter((section) => section.visible)
          .map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              disabled={!isLoggedIn}
              style={{
                padding: "10px 22px",
                border: "none",
                borderRadius: "8px",
                cursor: isLoggedIn ? "pointer" : "not-allowed",
                fontWeight: activeSection === section.id ? "700" : "500",
                background:
                  activeSection === section.id ? "#111827" : "#f3f4f6",
                color: activeSection === section.id ? "#ffffff" : "#374151",
                transition: "all 0.2s ease",
              }}
            >
              {section.label}
            </button>
          ))}
      </div>

      {/* =========================
          BRANCHES
      ========================= */}
      {activeSection === "branches" && (
        <section className="panel admin-panel">
          <div
            className="panel-title"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ color: "black", margin: 0 }}>Branch management</h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "260px",
                }}
              >
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
              </div>

              {canCreateShop ? (
                <button
                  type="button"
                  className="primary-action"
                  onClick={onCreateShop}
                  disabled={!isLoggedIn}
                >
                  <Plus size={16} />
                  Create branch
                </button>
              ) : null}
            </div>
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
                {filteredShops.map((shop) => (
                  <tr key={shop._id}>
                    <td>{shop.name}</td>

                    <td>{shop.code}</td>

                    <td>{shop.location || "-"}</td>

                    <td>{shop.phone || "-"}</td>

                    <td>{shop.isActive ? "Active" : "Inactive"}</td>

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

                {!filteredShops.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      {branchSearch
                        ? "No branches found."
                        : "No branches loaded."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================
          PRODUCTS
      ========================= */}
      {activeSection === "products" && showProductSection && (
        <section className="panel admin-panel">
          <div
            className="panel-title"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ color: "black", margin: 0 }}>Product management</h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{
                  width: "260px",
                  padding: "9px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />

              <button
                type="button"
                className="primary-action"
                onClick={onImportProducts}
                disabled={!isLoggedIn}
              >
                <FileSpreadsheet size={16} />
                Import Excel
              </button>

              <button
                type="button"
                className="primary-action"
                onClick={handleDownloadProducts}
                disabled={!isLoggedIn}
              >
                <Download size={16} />
                Download Excel
              </button>

              <button
                type="button"
                className="primary-action"
                onClick={onCreateProduct}
                disabled={!isLoggedIn}
              >
                <Plus size={16} />
                Create product
              </button>
            </div>
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
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>{product.itemCode}</td>

                    <td>{product.description}</td>

                    <td>{product.categoryId?.name || "-"}</td>

                    <td>
                      {product.defaultUnitId?.shortName ||
                        product.defaultUnitId?.name ||
                        "-"}
                    </td>

                    <td>{product.isPerishable ? "Yes" : "No"}</td>

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

                {!filteredProducts.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      {productSearch
                        ? "No products found."
                        : "No products loaded."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================
          UNITS
      ========================= */}
      {activeSection === "units" && !isShopkeeper && (
        <section className="panel admin-panel">
          <div className="panel-title">
            <h2 style={{ color: "black" }}>Unit Management</h2>

            <button
              type="button"
              className="primary-action"
              onClick={onCreateUnit}
              disabled={!isLoggedIn}
            >
              <Plus size={16} />
              Create Unit
            </button>
          </div>

          <div className="table-wrap admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short Name</th>
                  <th>Base Unit</th>
                  <th>Factor</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {units.map((unit) => (
                  <tr key={unit._id}>
                    <td>{unit.name}</td>

                    <td>{unit.shortName}</td>

                    <td>{unit.baseUnitId?.shortName || "-"}</td>

                    <td>{unit.factor ?? "-"}</td>

                    <td className="table-actions-cell">
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit unit"
                        onClick={() => onUnitEdit(unit)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button secondary-action"
                        title="Delete unit"
                        onClick={() => onUnitDelete(unit._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!units.length && (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      No units loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
