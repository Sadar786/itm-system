import { useEffect, useMemo, useState } from "react";
import { Notice } from "./components/Notice";
import { Sidebar } from "./components/Sidebar";
import { ViewTabs } from "./components/ViewTabs";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { ReportsView } from "./features/reports/ReportsView";
import { AddStockModal } from "./features/stock/AddStockModal";
import { StockView } from "./features/stock/StockView";
import { TransferStockModal } from "./features/stock/TransferStockModal";
import { TransferDetailModal } from "./features/transfers/TransferDetailModal";
import { TransfersView } from "./features/transfers/TransfersView";
import { AdminView } from "./features/admin/AdminView";
import { AdminShopModal } from "./features/admin/AdminShopModal";
import { AdminProductModal } from "./features/admin/AdminProductModal";
import {
  addInventoryStock,
  createProduct,
  createShop,
  createTransfer,
  deleteProduct,
  deleteShop,
  downloadReport,
  forgotPassword,
  getCategories,
  getMovements,
  getProducts,
  getShops,
  getTransferDestinationShops,
  getTransfers,
  getUnits,
  login,
  signup,
  updateProduct,
  updateShop,
  API_BASE_URL,
} from "./services/api";
import { currentMonth, formatProductName, todayDate } from "./utils/format";
import "./App.css";

const emptyAddStock = {
  productId: "",
  unitId: "",
  quantity: "",
  remarks: "",
};

const emptyTransfer = {
  fromShopId: "",
  toShopId: "",
  productId: "",
  unitId: "",
  quantity: "",
  remarks: "",
};

const PAGE_SIZE = 20;

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString?.() || "";
};

const getMovementDateRange = (dateFilters) => {
  if (dateFilters.dateMode === "month" && dateFilters.month) {
    const [year, month] = dateFilters.month.split("-").map(Number);
    const startDate = `${dateFilters.month}-01`;
    const endDate = new Date(Date.UTC(year, month, 0))
      .toISOString()
      .slice(0, 10);

    return { startDate, endDate };
  }

  return {
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  };
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(
    () => localStorage.getItem("inventoryToken") || "",
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("inventoryUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [activeView, setActiveView] = useState("stock");
  const [shopId, setShopId] = useState(user?.shopId || "");
  const [dateFilters, setDateFilters] = useState({
    dateMode: "month",
    month: currentMonth(),
    startDate: todayDate(),
    endDate: todayDate(),
  });
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [transferDestinationShops, setTransferDestinationShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [adminShopForm, setAdminShopForm] = useState({
    name: "",
    code: "",
    location: "",
    phone: "",
    isActive: true,
  });
  const [adminProductForm, setAdminProductForm] = useState({
    itemCode: "",
    description: "",
    categoryId: "",
    defaultUnitId: "",
    barcode: "",
    isPerishable: false,
    minimumStock: "",
    reorderLevel: "",
    notes: "",
  });
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [transferPagination, setTransferPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: PAGE_SIZE,
  });
  const [addProductSearch, setAddProductSearch] = useState("");
  const [transferProductSearch, setTransferProductSearch] = useState("");
  const [addStock, setAddStock] = useState(emptyAddStock);
  const [transfer, setTransfer] = useState(() => ({
    ...emptyTransfer,
    fromShopId: user?.shopId || "",
  }));
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTransferDetail, setSelectedTransferDetail] = useState(null);

  const isLoggedIn = Boolean(token);
  const isAdmin = user?.role === "admin";
  const isShopkeeper = user?.role === "shop_keeper";
  const canManage = isAdmin || isShopkeeper;

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === addStock.productId),
    [addStock.productId, products],
  );

  const selectedTransferProduct = useMemo(
    () => products.find((product) => product._id === transfer.productId),
    [products, transfer.productId],
  );

  const assignedShopId = useMemo(
    () => getId(user?.shopId) || getId(shopId),
    [user?.shopId, shopId],
  );

  const sourceShops = useMemo(() => {
    if (!isAdmin && assignedShopId) {
      const ownShop = shops.filter(
        (shop) => getId(shop._id) === assignedShopId,
      );
      return ownShop.length ? ownShop : shops;
    }

    return shops;
  }, [shops, isAdmin, assignedShopId]);

  const destinationShops = useMemo(() => {
    const excludedShopId = getId(transfer.fromShopId) || assignedShopId;

    return transferDestinationShops.filter(
      (shop) => getId(shop._id) !== excludedShopId,
    );
  }, [transferDestinationShops, transfer.fromShopId, assignedShopId]);

  const transferableProducts = useMemo(() => {
    if (!transfer.fromShopId.trim()) return [];
    return products;
  }, [products, transfer.fromShopId]);

  const filteredAddProducts = useMemo(() => {
    const needle = addProductSearch.trim().toLowerCase();
    if (!needle) return products;

    return products.filter((product) =>
      `${product.itemCode || ""} ${product.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [addProductSearch, products]);

  const filteredTransferProducts = useMemo(() => {
    const needle = transferProductSearch.trim().toLowerCase();
    if (!needle) return transferableProducts;

    return transferableProducts.filter((product) =>
      `${product.itemCode || ""} ${product.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [transferProductSearch, transferableProducts]);

  const transferQuantity = Number(transfer.quantity || 0);
  const isTransferSubmitDisabled =
    !transfer.fromShopId ||
    !transfer.toShopId ||
    !transfer.productId ||
    !transfer.unitId ||
    !Number.isFinite(transferQuantity) ||
    transferQuantity <= 0 ||
    transfer.fromShopId === transfer.toShopId;

  const loadProducts = async (authToken = token) => {
    const data = await getProducts(authToken);
    setProducts(data.data || []);
  };

  const loadShops = async (authToken = token) => {
    const data = await getShops(authToken);
    setShops(data.data || []);
  };

  const loadTransferDestinationShops = async (authToken = token) => {
    const data = await getTransferDestinationShops(authToken);
    setTransferDestinationShops(data.data || []);
  };

  const loadCategories = async (authToken = token) => {
    const data = await getCategories(authToken);
    setCategories(data.data || []);
  };

  const loadUnits = async (authToken = token) => {
    const data = await getUnits(authToken);
    setUnits(data.data || []);
  };

  const loadTransfers = async ({
    authToken = token,
    page = 1,
    append = false,
  } = {}) => {
    const data = await getTransfers({
      token: authToken,
      page,
      limit: PAGE_SIZE,
    });

    setTransfers((current) =>
      append ? [...current, ...(data.data || [])] : data.data || [],
    );
    setTransferPagination({
      total: data.pagination?.total || 0,
      page: data.pagination?.page || page,
      pages: data.pagination?.pages || 1,
      limit: data.pagination?.limit || PAGE_SIZE,
    });
  };

  const loadMovements = async ({
    authToken = token,
    targetShopId = shopId,
  } = {}) => {
    const dateRange = getMovementDateRange(dateFilters);
    const data = await getMovements({
      token: authToken,
      shopId: targetShopId,
      ...dateRange,
    });

    setMovements(data.data || []);
  };

  useEffect(() => {
    if (!token) return;

    const loadInitialData = async () => {
      setBusyKey("initial-load");
      setError("");

      try {
        await Promise.all([
          loadProducts(token),
          loadShops(token),
          loadTransferDestinationShops(token),
          loadCategories(token),
          loadUnits(token),
          loadTransfers({ authToken: token }),
          loadMovements({ authToken: token }),
        ]);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setBusyKey("");
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;

    loadMovements().catch((loadError) => {
      setError(loadError.message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilters, shopId, token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusyKey("login");

    try {
      const data = await login({ email, password });

      localStorage.setItem("inventoryToken", data.token);
      localStorage.setItem("inventoryUser", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShopId(data.user?.shopId || "");
      setTransfer((current) => ({
        ...current,
        fromShopId: data.user?.shopId || "",
      }));
      setMessage("Login successful. Inventory is loading.");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusyKey("signup");

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      setBusyKey("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusyKey("");
      return;
    }

    try {
      const data = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      localStorage.setItem("inventoryToken", data.token);
      localStorage.setItem("inventoryUser", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShopId(data.user?.shopId || "");
      setTransfer((current) => ({
        ...current,
        fromShopId: data.user?.shopId || "",
      }));
      setMessage("Signup successful. Logged in and inventory is loading.");
      setAuthMode("login");
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusyKey("forgot");

    if (!email.trim() || !password) {
      setError("Email and new password are required.");
      setBusyKey("");
      return;
    }

    try {
      await forgotPassword({ email: email.trim(), password });
      setMessage("Password reset successful. You can now log in.");
      setAuthMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("inventoryToken");
    localStorage.removeItem("inventoryUser");
    setToken("");
    setUser(null);
    setProducts([]);
    setShops([]);
    setTransfers([]);
    setMovements([]);
    setTransferPagination({
      total: 0,
      page: 1,
      pages: 1,
      limit: PAGE_SIZE,
    });
    setMessage("");
    setError("");
    setAuthMode("login");
  };

  const handleShopIdChange = (value) => {
    setShopId(value);
    setTransfer((current) => ({
      ...current,
      fromShopId: value || user?.shopId || "",
      productId: "",
      unitId: "",
      quantity: "",
    }));
  };

  const handleRefreshInventory = async () => {
    setBusyKey("inventory-refresh");
    setError("");
    setMessage("");

    try {
      await Promise.all([
        loadProducts(),
        loadShops(),
        loadTransferDestinationShops(),
        loadCategories(),
        loadUnits(),
        loadTransfers(),
        loadMovements(),
      ]);
      setMessage("Stock actions refreshed.");
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setBusyKey("");
    }
  };

  const resetShopForm = () => {
    setAdminShopForm({
      name: "",
      code: "",
      location: "",
      phone: "",
      isActive: true,
    });
    setSelectedShopId("");
  };

  const resetProductForm = () => {
    setAdminProductForm({
      itemCode: "",
      description: "",
      categoryId: "",
      defaultUnitId: "",
      barcode: "",
      isPerishable: false,
      minimumStock: "",
      reorderLevel: "",
      notes: "",
    });
    setSelectedProductId("");
  };

  const handleShopFormChange = (field, value) => {
    setAdminShopForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProductFormChange = (field, value) => {
    setAdminProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleShopEdit = (shop) => {
    setSelectedShopId(shop._id);
    setAdminShopForm({
      name: shop.name || "",
      code: shop.code || "",
      location: shop.location || "",
      phone: shop.phone || "",
      isActive: Boolean(shop.isActive),
    });
  };

  const handleProductEdit = (product) => {
    setSelectedProductId(product._id);
    setAdminProductForm({
      itemCode: product.itemCode || "",
      description: product.description || "",
      categoryId: product.categoryId?._id || product.categoryId || "",
      defaultUnitId: product.defaultUnitId?._id || product.defaultUnitId || "",
      barcode: product.barcode || "",
      isPerishable: Boolean(product.isPerishable),
      minimumStock: product.minimumStock ?? "",
      reorderLevel: product.reorderLevel ?? "",
      notes: product.notes || "",
    });
  };

  const handleDeleteShop = async (shopId) => {
    if (!window.confirm("Delete this branch?")) return;
    setBusyKey("admin-shop-delete");
    setError("");
    setMessage("");

    try {
      await deleteShop({ token, shopId });
      setMessage("Branch deleted successfully.");
      await Promise.all([loadShops(), loadTransferDestinationShops(), loadTransfers()]);
      resetShopForm();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    setBusyKey("admin-product-delete");
    setError("");
    setMessage("");

    try {
      await deleteProduct({ token, productId });
      setMessage("Product deleted successfully.");
      await loadProducts();
      resetProductForm();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleShopFormSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmedName = adminShopForm.name.trim();
    const trimmedCode = adminShopForm.code.trim();

    if (!trimmedName || !trimmedCode) {
      setError("Branch name and code are required.");
      return;
    }

    setBusyKey(selectedShopId ? "admin-shop-update" : "admin-shop-create");

    try {
      const body = {
        ...adminShopForm,
        name: trimmedName,
        code: trimmedCode,
      };

      if (selectedShopId) {
        await updateShop({ token, shopId: selectedShopId, body });
        setMessage("Branch updated successfully.");
      } else {
        const result = await createShop({ token, body });
        setMessage("Branch created successfully.");

        if (user?.role === "shop_keeper" && result.user?.shopId) {
          const updatedUser = {
            ...user,
            shopId: result.user.shopId,
          };
          localStorage.setItem("inventoryUser", JSON.stringify(updatedUser));
          setUser(updatedUser);
          setShopId(result.user.shopId);
          setTransfer((current) => ({
            ...current,
            fromShopId: result.user.shopId,
          }));
        }
      }

      await Promise.all([loadShops(), loadTransferDestinationShops()]);

      setActiveModal(null);
      resetShopForm();
    } catch (shopError) {
      setError(shopError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleProductFormSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmedCode = adminProductForm.itemCode.trim();
    const trimmedDescription = adminProductForm.description.trim();

    if (
      !trimmedCode ||
      !trimmedDescription ||
      !adminProductForm.categoryId ||
      !adminProductForm.defaultUnitId
    ) {
      setError("Product code, description, category, and unit are required.");
      return;
    }

    setBusyKey(
      selectedProductId ? "admin-product-update" : "admin-product-create",
    );

    try {
      const body = {
        ...adminProductForm,
        itemCode: trimmedCode,
        description: trimmedDescription,
        minimumStock: Number(adminProductForm.minimumStock || 0),
        reorderLevel: Number(adminProductForm.reorderLevel || 0),
      };

      if (selectedProductId) {
        await updateProduct({ token, productId: selectedProductId, body });
        setMessage("Product updated successfully.");
      } else {
        await createProduct({ token, body });
        setMessage("Product created successfully.");
      }

      await loadProducts();
      setActiveModal(null);
      resetProductForm();
    } catch (productError) {
      setError(productError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleProductChange = (productId) => {
    const product = products.find((item) => item._id === productId);
    const unitId = product?.defaultUnitId?._id || product?.defaultUnitId || "";
    setAddStock((current) => ({
      ...current,
      productId,
      unitId,
    }));
  };

  const handleTransferProductChange = (productId) => {
    const product = products.find((item) => item._id === productId);
    const unitId = product?.defaultUnitId?._id || product?.defaultUnitId || "";
    setTransfer((current) => ({
      ...current,
      productId,
      unitId,
    }));
  };

  const handleAddStockChange = (field, value) => {
    setAddStock((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTransferChange = (field, value) => {
    setTransfer((current) => ({
      ...current,
      [field]: value,
      ...(field === "fromShopId"
        ? {
            productId: "",
            unitId: "",
            quantity: "",
          }
        : {}),
    }));
  };

  const openAddStockModal = () => {
    setError("");
    setMessage("");
    setAddProductSearch("");
    setActiveModal("add-stock");
  };

  const openTransferModal = () => {
    setError("");
    setMessage("");
    setTransfer((current) => ({
      ...current,
      fromShopId: current.fromShopId || assignedShopId || "",
    }));
    setTransferProductSearch("");
    setActiveModal("transfer-stock");
  };

  const openCreateShopModal = () => {
    setError("");
    setMessage("");
    resetShopForm();
    setActiveModal("shop-create");
  };

  const openCreateProductModal = () => {
    setError("");
    setMessage("");
    resetProductForm();
    setActiveModal("product-create");
  };

  const closeModal = () => {
    if (busyKey) return;
    setActiveModal(null);
  };

  const handleAddStock = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const quantity = Number(addStock.quantity);
    if (
      !addStock.productId ||
      !addStock.unitId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError("Select a product and enter a quantity greater than 0.");
      return;
    }

    const productName = formatProductName(selectedProduct);
    const confirmed = window.confirm(
      `Add ${quantity} ${selectedProduct?.defaultUnitId?.shortName || ""} of ${productName} to this branch?`,
    );
    if (!confirmed) return;

    setBusyKey("add-stock");

    try {
      const body = {
        productId: addStock.productId,
        unitId: addStock.unitId,
        quantity,
        remarks: addStock.remarks,
      };

      if (shopId.trim()) {
        body.shopId = shopId.trim();
      }

      const data = await addInventoryStock({ token, body });

      setMessage(data.message || "Incoming stock recorded successfully.");
      setAddStock(emptyAddStock);
      setActiveModal(null);
      await loadMovements();
    } catch (stockError) {
      setError(stockError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleTransferStock = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const quantity = Number(transfer.quantity);
    if (
      !transfer.fromShopId ||
      !transfer.toShopId ||
      !transfer.productId ||
      !transfer.unitId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Select source, destination, product, and a quantity greater than 0.",
      );
      return;
    }

    if (transfer.fromShopId === transfer.toShopId) {
      setError("Source and destination shops must be different.");
      return;
    }

    const productName = formatProductName(selectedTransferProduct);
    const confirmed = window.confirm(
      `Transfer ${quantity} of ${productName} to the selected branch?`,
    );
    if (!confirmed) return;

    setBusyKey("transfer-stock");

    try {
      const data = await createTransfer({
        token,
        body: {
          fromShopId: transfer.fromShopId,
          toShopId: transfer.toShopId,
          remarks: transfer.remarks,
          items: [
            {
              productId: transfer.productId,
              unitId: transfer.unitId,
              quantity,
            },
          ],
        },
      });

      setMessage(data.message || "Transfer created successfully.");
      setTransfer({
        ...emptyTransfer,
        fromShopId: assignedShopId || "",
      });
      setActiveModal(null);
      await Promise.all([loadTransfers(), loadMovements()]);
    } catch (transferError) {
      setError(transferError.message);
    } finally {
      setBusyKey("");
    }
  };

  const handleLoadMoreTransfers = async () => {
    if (transferPagination.page >= transferPagination.pages) return;

    setBusyKey("transfers-load-more");
    setError("");

    try {
      await loadTransfers({
        page: transferPagination.page + 1,
        append: true,
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusyKey("");
    }
  };

  const buildReportUrl = (report) => {
    const params = new URLSearchParams();

    if (report.useShop && shopId.trim()) {
      params.set("shopId", shopId.trim());
    }

    if (report.useDateMode) {
      if (dateFilters.dateMode === "month" && dateFilters.month) {
        params.set("month", dateFilters.month);
      }
      if (dateFilters.dateMode === "range") {
        if (dateFilters.startDate)
          params.set("startDate", dateFilters.startDate);
        if (dateFilters.endDate) params.set("endDate", dateFilters.endDate);
      }
    }

    if (report.useDates) {
      if (dateFilters.startDate) params.set("startDate", dateFilters.startDate);
      if (dateFilters.endDate) params.set("endDate", dateFilters.endDate);
    }

    const query = params.toString();
    return `${API_BASE_URL}${report.path}${query ? `?${query}` : ""}`;
  };

  const handleDownload = async (report) => {
    setError("");
    setMessage("");
    setBusyKey(report.key);

    try {
      const filename = await downloadReport({
        token,
        url: buildReportUrl(report),
        fallbackFilename: report.filename,
      });
      setMessage(`${filename} downloaded.`);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setBusyKey("");
    }
  };

  return (
    <main className="app-shell">
      <Sidebar
        authMode={authMode}
        busyKey={busyKey}
        dateFilters={dateFilters}
        email={email}
        isLoggedIn={isLoggedIn}
        name={name}
        onNameChange={setName}
        onEmailChange={setEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSignup={handleSignup}
        onForgotPassword={handleForgotPassword}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onAuthModeChange={setAuthMode}
        onRefreshInventory={handleRefreshInventory}
        onShopIdChange={handleShopIdChange}
        password={password}
        confirmPassword={confirmPassword}
        setDateFilters={setDateFilters}
        shopId={shopId}
        shops={shops}
        user={user}
      />

      <section className="workspace">
        <WorkspaceHeader activeView={activeView} isLoggedIn={isLoggedIn} />
        <ViewTabs
          activeView={activeView}
          isAdmin={isAdmin}
          onChange={setActiveView}
        />
        <Notice error={error} message={message} />

        {activeView === "stock" ? (
          <StockView
            isLoggedIn={isLoggedIn}
            movements={movements}
            onOpenAddStock={openAddStockModal}
            onOpenTransferStock={openTransferModal}
          />
        ) : activeView === "reports" ? (
          <ReportsView
            busyKey={busyKey}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            onDownload={handleDownload}
          />
        ) : activeView === "admin" ? (
          <AdminView
            busyKey={busyKey}
            categories={categories}
            isLoggedIn={isLoggedIn}
            isShopkeeper={isShopkeeper}
            user={user}
            products={products}
            shops={shops}
            units={units}
            onCreateShop={openCreateShopModal}
            onCreateProduct={openCreateProductModal}
            onProductDelete={handleDeleteProduct}
            onProductEdit={(product) => {
              handleProductEdit(product);
              setActiveModal("product-edit");
            }}
            onShopDelete={handleDeleteShop}
            onShopEdit={(shop) => {
              handleShopEdit(shop);
              setActiveModal("shop-edit");
            }}
          />
        ) : (
          <TransfersView
            busyKey={busyKey}
            onLoadMoreTransfers={handleLoadMoreTransfers}
            onSelectTransfer={setSelectedTransferDetail}
            transferPagination={transferPagination}
            transfers={transfers}
          />
        )}

        <AddStockModal
          addStock={addStock}
          busyKey={busyKey}
          isOpen={activeModal === "add-stock"}
          onAddStockChange={handleAddStockChange}
          onClose={closeModal}
          onProductChange={handleProductChange}
          onProductSearchChange={setAddProductSearch}
          onSubmit={handleAddStock}
          productSearch={addProductSearch}
          products={filteredAddProducts}
          selectedProduct={selectedProduct}
        />

        <TransferStockModal
          busyKey={busyKey}
          destinationShops={destinationShops}
          isOpen={activeModal === "transfer-stock"}
          isSubmitDisabled={isTransferSubmitDisabled}
          onClose={closeModal}
          onProductChange={handleTransferProductChange}
          onProductSearchChange={setTransferProductSearch}
          onSubmit={handleTransferStock}
          onTransferChange={handleTransferChange}
          productSearch={transferProductSearch}
          selectedProduct={selectedTransferProduct}
          sourceShops={sourceShops}
          transferableProducts={filteredTransferProducts}
          transfer={transfer}
        />

        <AdminShopModal
          busyKey={busyKey}
          isOpen={activeModal === "shop-create" || activeModal === "shop-edit"}
          isLoggedIn={isLoggedIn}
          onClose={closeModal}
          onChange={handleShopFormChange}
          onSubmit={handleShopFormSubmit}
          shopForm={adminShopForm}
          isEdit={activeModal === "shop-edit"}
        />

        <AdminProductModal
          busyKey={busyKey}
          categories={categories}
          isOpen={
            activeModal === "product-create" || activeModal === "product-edit"
          }
          isLoggedIn={isLoggedIn}
          onClose={closeModal}
          onChange={handleProductFormChange}
          onSubmit={handleProductFormSubmit}
          productForm={adminProductForm}
          units={units}
          isEdit={activeModal === "product-edit"}
        />

        <TransferDetailModal
          isOpen={Boolean(selectedTransferDetail)}
          onClose={() => setSelectedTransferDetail(null)}
          transfer={selectedTransferDetail}
        />
      </section>
    </main>
  );
}

export default App;
