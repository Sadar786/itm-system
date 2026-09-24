import { TableScroll } from "../../components/TableScroll";
import { TablePagination } from "../../components/TablePagination";
import { useTablePage } from "../../components/useTablePage";
import { useConfirm } from "../../components/confirmationContext";
//src/features/admin/AdminView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import {
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  Download,
  MoreVertical,
} from "lucide-react";
import { deactivateAdminUser, selectAdminActiveUserId, selectAdminUsers, updateAdminUser } from "./adminSlice";
import { AdminProductImportReport } from "./AdminProductImportReport";
import "./productSelection.css";

export function AdminView({
  isLoggedIn,
  isShopkeeper,
  user,
  busyKey,
  products,
  productPagination,
  productImportResult,
  shops,
  units,
  onCreateProduct,
  onDownloadProducts,
  onImportProducts,
  onCreateShop,
  onCreateUnit,
  onProductDelete,
  onProductsDelete,
  onProductEdit,
  onProductSearch,
  onProductPageChange,
  onShopDelete,
  onShopEdit,
  onUnitEdit,
  onUnitDelete,
  onNotice,
}) {
  const confirm = useConfirm();
  const dispatch = useDispatch();
  const users = useSelector(selectAdminUsers);
  const activeUserId = useSelector(selectAdminActiveUserId);
  const catalogStatus = useSelector((state) => state.catalog.status);
  const productSearchStatus = useSelector((state) => state.catalog.adminProductSearch.status);
  const productSearchQuery = useSelector((state) => state.catalog.adminProductSearch.query);
  const productLoadError = useSelector((state) => state.catalog.error);
  const requestedProductPage = useSelector((state) => state.catalog.adminProductSearch.requestedPage);
  const [activeSection, setActiveSection] = useState("branches");
  const sectionLoading = activeSection === "products"
    ? productSearchStatus === "loading"
    : catalogStatus[activeSection === "branches" ? "shops" : activeSection] === "loading";
  const [branchSearch, setBranchSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const productSearchHandler = useRef(onProductSearch);
  const [userSearch, setUserSearch] = useState("");
  const [openUserMenu, setOpenUserMenu] = useState(null);
  const [selectedUserBranch, setSelectedUserBranch] = useState({});
  const canCreateShop = !isShopkeeper || !user?.shopId;
  const showProductSection = !isShopkeeper;
  const showProductSelection = user?.role === "admin";
  const productSearchPending = productSearch.trim() !== productSearchQuery.trim();
  const productActionsDisabled = !isLoggedIn || Boolean(busyKey) || Boolean(activeUserId);
  const productSelectionDisabled = productActionsDisabled || sectionLoading || productSearchPending;

  useEffect(() => {
    productSearchHandler.current = onProductSearch;
  }, [onProductSearch]);

  useEffect(() => {
    if (productSearch.trim() === productSearchQuery.trim()) return;

    const timer = setTimeout(
      () => productSearchHandler.current(productSearch),
      300,
    );

    return () => clearTimeout(timer);
  }, [productSearch, productSearchQuery]);

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
    {
      id: "users",
      label: "Users",
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

  const filteredProducts = products;

  const filteredUsers = useMemo(() => {
    const search = userSearch.toLowerCase().trim();

    if (!search) return users;

    return users.filter((item) =>
      [
        item.name,
        item.email,
        item.role,
        item.isActive ? "active" : "inactive",
        shops.find((shop) => String(shop._id) === String(item.shopId))?.name,
        shops.find((shop) => String(shop._id) === String(item.shopId))?.code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [users, shops, userSearch]);

  const branchPage = useTablePage(filteredShops, branchSearch);
  const productPage = {
    rows: filteredProducts,
    page: productPagination.page,
    total: productPagination.total,
    pageSize: productPagination.limit,
    onPageChange: onProductPageChange,
  };
  const unitPage = useTablePage(units, "units");
  const userPage = useTablePage(filteredUsers, userSearch);

  const selectedProducts = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const pageProductIds = productPage.rows.map((product) => String(product._id));
  const allPageProductsSelected = pageProductIds.length > 0 &&
    pageProductIds.every((id) => selectedProducts.has(id));
  const somePageProductsSelected = pageProductIds.some((id) => selectedProducts.has(id));

  const handleProductSelection = (productId, checked) => {
    if (productSelectionDisabled || !showProductSelection) return;

    const next = new Set(selectedProducts);
    if (checked) next.add(productId);
    else next.delete(productId);
    setSelectedProductIds([...next]);
  };

  const handlePageProductSelection = (checked) => {
    if (productSelectionDisabled || !showProductSelection) return;

    const next = new Set(selectedProducts);
    pageProductIds.forEach((id) => {
      if (checked) next.add(id);
      else next.delete(id);
    });
    setSelectedProductIds([...next]);
  };

  const handleDeleteSelectedProducts = async () => {
    if (productSelectionDisabled || !showProductSelection || !selectedProducts.size) return;

    if (await onProductsDelete([...selectedProducts])) {
      setSelectedProductIds([]);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (await onProductDelete(productId)) {
      setSelectedProductIds((current) => current.filter((id) => id !== String(productId)));
    }
  };

  const getUserBranch = (item) => {
    if (!item?.shopId) return null;

    const shopId =
      typeof item.shopId === "object" ? item.shopId._id : item.shopId;

    return shops.find((shop) => String(shop._id) === String(shopId));
  };

  const handleAssignBranch = async (item) => {
    const branchId = selectedUserBranch[item._id];

    if (!branchId) return;

    try {
      await dispatch(
        updateAdminUser({ userId: item._id, body: { shopId: branchId } }),
      ).unwrap();
      onNotice?.({ error: "", message: "User branch updated successfully." });
    } catch (error) {
      onNotice?.({ error: error || "Failed to update user branch.", message: "" });
    } finally {
      setOpenUserMenu(null);
    }
  };

  const handleRemoveBranch = async (item) => {
    if (!await confirm({ title: "Remove assigned branch?", message: `Remove the branch assignment from ${item.name}?`, confirmLabel: "Remove branch" })) {
      return;
    }

    try {
      await dispatch(
        updateAdminUser({ userId: item._id, body: { shopId: null } }),
      ).unwrap();
      setSelectedUserBranch((current) => ({
        ...current,
        [item._id]: "",
      }));
      onNotice?.({ error: "", message: "User branch removed successfully." });
    } catch (error) {
      onNotice?.({ error: error || "Failed to remove user branch.", message: "" });
    } finally {
      setOpenUserMenu(null);
    }
  };

  const handleDeactivateUser = async (userId) => {
    try {
      await dispatch(deactivateAdminUser(userId)).unwrap();
      onNotice?.({ error: "", message: "User deactivated successfully." });
    } catch (error) {
      onNotice?.({ error: error || "Failed to deactivate user.", message: "" });
    } finally {
      setOpenUserMenu(null);
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
              onClick={() => {
                setSelectedProductIds([]);
                setActiveSection(section.id);
              }}
              disabled={!isLoggedIn || Boolean(busyKey)}
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
          <div aria-busy={sectionLoading}>
            {sectionLoading && <LoadingSpinner label={`Loading ${activeSection}...`} />}
            <TableScroll label="Management records" className="admin-table-wrap" hidden={sectionLoading}>
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
                {branchPage.rows.map((shop) => (
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
            </TableScroll>
            {!sectionLoading && <TablePagination {...branchPage} label="Branches" disabled={Boolean(busyKey) || Boolean(activeUserId)} />}
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
                aria-label="Search products"
                value={productSearch}
                onChange={(e) => {
                  setSelectedProductIds([]);
                  setProductSearch(e.target.value);
                }}
                disabled={productActionsDisabled}
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
                disabled={productActionsDisabled}
              >
                <FileSpreadsheet size={16} />
                {busyKey === "product-import" ? "Importing..." : "Import Excel"}
              </button>

              <button
                type="button"
                className="primary-action"
                onClick={onDownloadProducts}
                disabled={productActionsDisabled}
              >
                <Download size={16} />
                Download Excel
              </button>

              <button
                type="button"
                className="primary-action"
                onClick={onCreateProduct}
                disabled={productActionsDisabled}
              >
                <Plus size={16} />
                Create product
              </button>
            </div>
          </div>

          {productImportResult && (
            <AdminProductImportReport result={productImportResult} />
          )}

          {productSearchStatus === "failed" && (
            <div role="alert" className="product-selection-toolbar">
              <span>{productLoadError || "Products could not be loaded."}</span>
              <button type="button" onClick={() => onProductPageChange(requestedProductPage)} disabled={productSelectionDisabled}>
                Retry
              </button>
            </div>
          )}

          {showProductSelection && (
            <div className="product-selection-toolbar">
              <span className="product-selection-count" role="status">
                {selectedProducts.size} {selectedProducts.size === 1 ? "product" : "products"} selected
              </span>
              <span className="product-selection-help">Select products across pages.</span>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setSelectedProductIds([])}
                disabled={productSelectionDisabled || !selectedProducts.size}
              >
                Clear selection
              </button>
              <button
                type="button"
                className="product-selection-delete"
                onClick={handleDeleteSelectedProducts}
                disabled={productSelectionDisabled || !selectedProducts.size}
              >
                <Trash2 size={16} aria-hidden="true" />
                {busyKey === "admin-products-delete" ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          )}

          <div aria-busy={sectionLoading}>
            {sectionLoading && <LoadingSpinner label={`Loading ${activeSection}...`} />}
            <TableScroll label="Management records" className="admin-table-wrap" hidden={sectionLoading}>
            <table>
              <thead>
                <tr>
                  {showProductSelection && (
                    <th scope="col" className="product-selection-cell">
                      <input
                        type="checkbox"
                        className="product-selection-checkbox"
                        aria-label="Select all products on this page"
                        title="Select all products on this page"
                        checked={allPageProductsSelected}
                        ref={(checkbox) => {
                          if (checkbox) checkbox.indeterminate = somePageProductsSelected && !allPageProductsSelected;
                        }}
                        onChange={(event) => handlePageProductSelection(event.target.checked)}
                        disabled={productSelectionDisabled || !pageProductIds.length}
                      />
                    </th>
                  )}
                  <th>Item code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Perishable</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {productPage.rows.map((product) => (
                  <tr key={product._id}>
                    {showProductSelection && (
                      <td className="product-selection-cell">
                        <input
                          type="checkbox"
                          className="product-selection-checkbox"
                          aria-label={`Select product ${product.itemCode}: ${product.description}`}
                          checked={selectedProducts.has(String(product._id))}
                          onChange={(event) => handleProductSelection(String(product._id), event.target.checked)}
                          disabled={productSelectionDisabled}
                        />
                      </td>
                    )}
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
                        disabled={productSelectionDisabled}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button secondary-action"
                        title="Delete product"
                        onClick={() => handleDeleteProduct(product._id)}
                        disabled={productSelectionDisabled}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredProducts.length && (
                  <tr>
                    <td colSpan={showProductSelection ? 7 : 6} className="empty-cell">
                      {productSearch
                        ? "No products found."
                        : "No products loaded."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </TableScroll>
            {!sectionLoading && <TablePagination {...productPage} label="Products" disabled={productSelectionDisabled} />}
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

          <div aria-busy={sectionLoading}>
            {sectionLoading && <LoadingSpinner label={`Loading ${activeSection}...`} />}
            <TableScroll label="Management records" className="admin-table-wrap" hidden={sectionLoading}>
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
                {unitPage.rows.map((unit) => (
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
            </TableScroll>
            {!sectionLoading && <TablePagination {...unitPage} label="Units" disabled={Boolean(busyKey) || Boolean(activeUserId)} />}
          </div>
        </section>
      )}

      {/* =========================
    USERS
========================= */}
      {activeSection === "users" && !isShopkeeper && (
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
            <h2 style={{ color: "black", margin: 0 }}>User management</h2>

            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                width: "260px",
                padding: "9px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                outline: "none",
              }}
            />
          </div>

          <div aria-busy={sectionLoading}>
            {sectionLoading && <LoadingSpinner label={`Loading ${activeSection}...`} />}
            <TableScroll label="Management records" className="admin-table-wrap" hidden={sectionLoading}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {userPage.rows.map((item) => {
                  const branch = getUserBranch(item);
                  const isMenuOpen = openUserMenu === item._id;

                  const currentBranchId =
                    typeof item.shopId === "object"
                      ? item.shopId?._id
                      : item.shopId;

                  return (
                    <tr key={item._id}>
                      <td>{item.name || "-"}</td>

                      <td>{item.email || "-"}</td>

                      <td>
                        {item.role === "shop_keeper" ? "Shop Keeper" : "Admin"}
                      </td>

                      <td>
                        {branch ? (
                          <span>
                            {branch.name}
                            {branch.code ? ` (${branch.code})` : ""}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>
                            No branch assigned
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: item.isActive ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td
                        className="table-actions-cell"
                        style={{
                          position: "relative",
                        }}
                      >
                        <button
                          type="button"
                          className="icon-button"
                          title="User actions"
                          onClick={() =>
                            setOpenUserMenu(isMenuOpen ? null : item._id)
                          }
                          disabled={Boolean(busyKey) || activeUserId === item._id}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {isMenuOpen && (
                          <div
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "42px",
                              zIndex: 20,
                              width: "230px",
                              background: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                              padding: "12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#6b7280",
                                marginBottom: "6px",
                              }}
                            >
                              Assign branch
                            </div>

                            <select
                              value={
                                selectedUserBranch[item._id] ??
                                currentBranchId ??
                                ""
                              }
                              onChange={(e) =>
                                setSelectedUserBranch((current) => ({
                                  ...current,
                                  [item._id]: e.target.value,
                                }))
                              }
                              disabled={Boolean(busyKey) || activeUserId === item._id}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                marginBottom: "8px",
                                background: "#fff",
                              }}
                            >
                              <option value="">Select branch</option>

                              {shops.map((shop) => (
                                <option
                                  key={shop._id}
                                  value={shop._id}
                                  disabled={!shop.isActive}
                                >
                                  {shop.name}
                                  {shop.code ? ` (${shop.code})` : ""}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="primary-action"
                              style={{
                                width: "100%",
                                justifyContent: "center",
                                marginBottom: "6px",
                              }}
                              disabled={
                                Boolean(busyKey) ||
                                !selectedUserBranch[item._id]
                              }
                              onClick={() => handleAssignBranch(item)}
                            >
                              {currentBranchId
                                ? "Change Branch"
                                : "Assign Branch"}
                            </button>

                            {currentBranchId ? (
                              <button
                                type="button"
                                className="icon-button secondary-action"
                                style={{
                                  width: "100%",
                                  justifyContent: "center",
                                  marginBottom: "6px",
                                }}
                                disabled={Boolean(busyKey) || activeUserId === item._id}
                                onClick={() => handleRemoveBranch(item)}
                              >
                                Remove Branch
                              </button>
                            ) : null}

                            {item.isActive ? (
                              <button
                                type="button"
                                className="icon-button secondary-action"
                                style={{
                                  width: "100%",
                                  justifyContent: "center",
                                }}
                                disabled={Boolean(busyKey) || activeUserId === item._id}
                                onClick={() => handleDeactivateUser(item._id)}
                              >
                                <Trash2 size={15} />
                                Deactivate User
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filteredUsers.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      {userSearch ? "No users found." : "No users loaded."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </TableScroll>
            {!sectionLoading && <TablePagination {...userPage} label="Users" disabled={Boolean(busyKey) || Boolean(activeUserId)} />}
          </div>
        </section>
      )}
    </div>
  );
}
