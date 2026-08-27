import { useEffect, useMemo, useRef, useState } from "react";
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
import { AdminUnitModal } from "./features/admin/AdminUnitModal";
import {
  addInventoryStock,
  createProduct,
  createShop,
  createUnit,
  updateUnit,
  deleteUnit,
  createTransfer,
  deleteProduct,
  deleteShop,
  downloadReport,
  forgotPassword,
  getCategories,
  getMovements,
  getProducts,
  searchProducts,
  getShops,
  getTransferDestinationShops,
  getTransfers,
  deleteTransfer,
  getUnits,
  importProducts,
  login,
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
  remarks: "Stock Transfer.....",
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
  const productImportInputRef = useRef(null);
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
  const [adminUnitForm, setAdminUnitForm] = useState({
    name: "",
    shortName: "",
    baseUnitId: "",
    factor: 1,
    isDecimalAllowed: true,
    isActive: true,
  });

  const [selectedUnitId, setSelectedUnitId] = useState("");

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
  const [transferSearchProducts, setTransferSearchProducts] = useState([]);
  const [transferSearchBusy, setTransferSearchBusy] = useState(false);
  const [addStock, setAddStock] = useState(emptyAddStock);
  const [transfer, setTransfer] = useState(() => ({
    ...emptyTransfer,
    fromShopId: user?.shopId || "",
  }));

  const [transferItems, setTransferItems] = useState([]);
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

  const selectedTransferProduct = useMemo(() => {
    return (
      transferSearchProducts.find(
        (product) => product._id === transfer.productId,
      ) ||
      products.find((product) => product._id === transfer.productId) ||
      null
    );
  }, [transferSearchProducts, products, transfer.productId]);

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

  const handleTransferProductSearch = async (value) => {
    setTransferProductSearch(value);

    const search = value.trim();

    if (!search) {
      setTransferSearchProducts([]);
      return;
    }

    try {
      setTransferSearchBusy(true);

      const data = await searchProducts(token, search, 20);

      setTransferSearchProducts(data.data || []);
    } catch (searchError) {
      console.error("Product search failed:", searchError);
      setTransferSearchProducts([]);
    } finally {
      setTransferSearchBusy(false);
    }
  };

  const filteredAddProducts = useMemo(() => {
    const needle = addProductSearch.trim().toLowerCase();
    if (!needle) return products;

    return products.filter((product) =>
      `${product.itemCode || ""} ${product.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [addProductSearch, products]);

  const isTransferSubmitDisabled =
    !transfer.fromShopId ||
    !transfer.toShopId ||
    transfer.fromShopId === transfer.toShopId ||
    transferItems.length === 0;

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

      // Store login time
      localStorage.setItem("inventoryLoginTime", Date.now().toString());

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
    localStorage.removeItem("inventoryLoginTime");

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

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    const loginTime = localStorage.getItem("inventoryLoginTime");

    if (!loginTime || !token) {
      return;
    }

    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const elapsedTime = Date.now() - Number(loginTime);
    const remainingTime = TWELVE_HOURS - elapsedTime;

    // Already expired
    if (remainingTime <= 0) {
      handleLogout();
      return;
    }

    // Automatically logout when 12 hours are completed
    const logoutTimer = setTimeout(() => {
      handleLogout();
    }, remainingTime);

    return () => {
      clearTimeout(logoutTimer);
    };
  }, [token]);

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

  const resetUnitForm = () => {
    setAdminUnitForm({
      name: "",
      shortName: "",
      baseUnitId: "",
      factor: 1,
      isDecimalAllowed: true,
      isActive: true,
    });

    setSelectedUnitId("");
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

  const handleUnitFormChange = (field, value) => {
    setAdminUnitForm((current) => ({
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

  const handleUnitEdit = (unit) => {
    setSelectedUnitId(unit._id);

    setAdminUnitForm({
      name: unit.name || "",
      shortName: unit.shortName || "",
      baseUnitId: unit.baseUnitId?._id || unit.baseUnitId || "",
      factor: unit.factor ?? 1,
      isDecimalAllowed: Boolean(unit.isDecimalAllowed),
      isActive: Boolean(unit.isActive),
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
      await Promise.all([
        loadShops(),
        loadTransferDestinationShops(),
        loadTransfers(),
      ]);
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

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm("Delete this unit?")) return;

    setBusyKey("admin-unit-delete");
    setError("");
    setMessage("");

    try {
      await deleteUnit({ token, unitId });

      setMessage("Unit deleted successfully.");

      await loadUnits();

      resetUnitForm();
    } catch (err) {
      setError(err.message);
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

  const handleImportProducts = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension)) {
      setError("Please select an Excel file (.xlsx or .xls).");
      return;
    }

    setBusyKey("product-import");
    setError("");
    setMessage("");

    try {
      const data = await importProducts({
        token,
        file,
      });

      const summary = data.summary || {};

      // Reload products so newly imported products appear immediately
      await loadProducts();

      setMessage(
        `Import completed. Created: ${summary.created || 0}, ` +
          `Skipped: ${summary.skipped || 0}, ` +
          `Failed: ${summary.failed || 0}.`,
      );

      // Keep detailed results in browser console for now
      if (summary.failed > 0) {
        console.log("Failed product rows:", data.failed);
      }

      if (summary.skipped > 0) {
        console.log("Skipped product rows:", data.skipped);
      }
    } catch (importError) {
      setError(importError.message);
    } finally {
      setBusyKey("");
    }
  };

  const openProductImport = () => {
    if (!isLoggedIn || busyKey) return;

    productImportInputRef.current?.click();
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
      !adminProductForm.defaultUnitId
    ) {
      setError("Product code, description, and unit are required.");
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
        await updateProduct({
          token,
          productId: selectedProductId,
          body,
        });

        setMessage("Product updated successfully.");
      } else {
        await createProduct({
          token,
          body,
        });

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

  const handleUnitFormSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!adminUnitForm.name.trim() || !adminUnitForm.shortName.trim()) {
      setError("Name and Short Name are required.");
      return;
    }

    setBusyKey(selectedUnitId ? "admin-unit-update" : "admin-unit-create");

    try {
      const body = {
        ...adminUnitForm,
        factor: Number(adminUnitForm.factor),
      };

      if (selectedUnitId) {
        await updateUnit({
          token,
          unitId: selectedUnitId,
          body,
        });

        setMessage("Unit updated successfully.");
      } else {
        await createUnit({
          token,
          body,
        });

        setMessage("Unit created successfully.");
      }

      await loadUnits();

      resetUnitForm();

      setActiveModal(null);
    } catch (err) {
      setError(err.message);
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

  const handleDeleteTransfer = async (transfer) => {
    if (!token || !transfer?._id) return;

    setBusyKey(`delete-transfer-${transfer._id}`);
    setError("");

    try {
      await deleteTransfer({
        token,
        transferId: transfer._id,
      });

      setTransfers((current) =>
        current.filter((item) => item._id !== transfer._id),
      );

      setTransferPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
    } catch (error) {
      setError(error.message || "Failed to delete transfer");
    } finally {
      setBusyKey("");
    }
  };

  const handleTransferProductChange = (productId) => {
    const product =
      transferSearchProducts.find((item) => item._id === productId) ||
      products.find((item) => item._id === productId);

    const unitId = product?.defaultUnitId?._id || product?.defaultUnitId || "";

    setTransfer((current) => ({
      ...current,
      productId,
      unitId,
      quantity: "",
      selectedProduct: product || null,
    }));

    setTransferProductSearch("");
    setTransferSearchProducts([]);
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
    }));

    if (field === "fromShopId") {
      setTransferItems([]);
      setTransferProductSearch("");
      setTransferSearchProducts([]);
    }
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

    setTransfer({
      ...emptyTransfer,
      fromShopId: assignedShopId || "",
    });

    setTransferItems([]);
    setTransferProductSearch("");
    setTransferSearchProducts([]);

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

  const openCreateUnitModal = () => {
    setError("");
    setMessage("");
    resetUnitForm();
    setActiveModal("unit-create");
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

  const handleAddTransferItem = () => {
    setError("");
    setMessage("");

    const quantity = Number(transfer.quantity);

    if (!transfer.productId) {
      setError("Please select a product.");
      return;
    }

    if (!transfer.unitId) {
      setError("Please select a unit.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Please enter a quantity greater than 0.");
      return;
    }

    const alreadyAdded = transferItems.some(
      (item) => item.productId === transfer.productId,
    );

    if (alreadyAdded) {
      setError(
        "This product is already added. Remove it first if you want to change the quantity.",
      );
      return;
    }

    // Get the selected product object
    const product =
      transfer.selectedProduct ||
      transferSearchProducts.find((item) => item._id === transfer.productId) ||
      products.find((item) => item._id === transfer.productId);

    if (!product) {
      setError("Product information could not be found.");
      return;
    }

    setTransferItems((current) => [
      ...current,
      {
        productId: transfer.productId,

        // IMPORTANT:
        // Keep the complete product object with the transfer item
        product,

        unitId: transfer.unitId,
        quantity,
      },
    ]);

    // Clear product fields so another product can be added
    setTransfer((current) => ({
      ...current,
      productId: "",
      selectedProduct: null,
      unitId: "",
      quantity: "",
    }));

    setTransferProductSearch("");
    setTransferSearchProducts([]);

    setMessage("Product added to transfer list.");
  };

  const handleRemoveTransferItem = (productId) => {
    setTransferItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  };

  const handleTransferStock = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!transfer.fromShopId || !transfer.toShopId) {
      setError("Please select source and destination shops.");
      return;
    }

    if (transfer.fromShopId === transfer.toShopId) {
      setError("Source and destination shops must be different.");
      return;
    }

    if (!transferItems.length) {
      setError("Please add at least one product to transfer.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to transfer ${transferItems.length} product${
        transferItems.length > 1 ? "s" : ""
      } to the selected branch?`,
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
          items: transferItems,
        },
      });

      setMessage(
        data.message ||
          `${transferItems.length} product${
            transferItems.length > 1 ? "s" : ""
          } transferred successfully.`,
      );

      setTransfer({
        ...emptyTransfer,
        fromShopId: assignedShopId || "",
      });

      setTransferItems([]);

      setTransferProductSearch("");
      setTransferSearchProducts([]);

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

  const handleSelectTransfer = (transfer) => {
  setSelectedTransferDetail(transfer);
};


  return (
    <main className="app-shell">
      <input
        ref={productImportInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportProducts}
      />
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
            onImportProducts={openProductImport}
            onCreateUnit={openCreateUnitModal}
            onUnitEdit={(unit) => {
              handleUnitEdit(unit);
              setActiveModal("unit-edit");
            }}
            onUnitDelete={handleDeleteUnit}
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
            onSelectTransfer={handleSelectTransfer}
            onDeleteTransfer={handleDeleteTransfer}
            transferPagination={transferPagination}
            transfers={transfers}
            user={user}
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
          onAddItem={handleAddTransferItem}
          onClose={closeModal}
          onProductChange={handleTransferProductChange}
          onProductSearchChange={handleTransferProductSearch}
          onRemoveItem={handleRemoveTransferItem}
          onSubmit={handleTransferStock}
          onTransferChange={handleTransferChange}
          productSearch={transferProductSearch}
          selectedProduct={selectedTransferProduct}
          sourceShops={sourceShops}
          transferableProducts={transferSearchProducts}
          transfer={transfer}
          transferItems={transferItems}
          products={products}
          units={units}
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

        <AdminUnitModal
          busyKey={busyKey}
          isOpen={activeModal === "unit-create" || activeModal === "unit-edit"}
          isLoggedIn={isLoggedIn}
          onClose={closeModal}
          onChange={handleUnitFormChange}
          onSubmit={handleUnitFormSubmit}
          unitForm={adminUnitForm}
          units={units}
          isEdit={activeModal === "unit-edit"}
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
