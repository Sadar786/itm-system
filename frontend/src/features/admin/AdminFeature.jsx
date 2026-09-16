import { useConfirm } from "../../components/confirmationContext";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  selectIsLoggedIn,
  selectToken,
  selectUser,
  setCurrentUser,
} from "../auth/authSlice";
import {
  clearAdminProductSearch,
  createCatalogProduct,
  createCatalogShop,
  createCatalogUnit,
  deleteCatalogProduct,
  deleteCatalogShop,
  deleteCatalogUnit,
  fetchCatalogProducts,
  fetchCatalogShops,
  fetchCatalogTransferDestinationShops,
  fetchCatalogUnits,
  importCatalogProducts,
  searchCatalogProducts,
  selectAdminProductSearchQuery,
  selectAdminProductSearchResults,
  selectCatalogCategories,
  selectCatalogProducts,
  selectCatalogShops,
  selectCatalogUnits,
  updateCatalogProduct,
  updateCatalogShop,
  updateCatalogUnit,
} from "../catalog/catalogSlice";
import { fetchTransfers } from "../transfers/transferSlice";
import { downloadProductsExcel } from "../../services/api";
import { fetchAdminUsers } from "./adminSlice";
import { AdminProductModal } from "./AdminProductModal";
import { AdminShopModal } from "./AdminShopModal";
import { AdminUnitModal } from "./AdminUnitModal";
import { AdminView } from "./AdminView";

const emptyShopForm = {
  name: "",
  code: "",
  location: "",
  phone: "",
  isActive: true,
};

const emptyProductForm = {
  itemCode: "",
  description: "",
  categoryId: "",
  defaultUnitId: "",
  barcode: "",
  isPerishable: false,
  minimumStock: "",
  reorderLevel: "",
  notes: "",
};

const emptyUnitForm = {
  name: "",
  shortName: "",
  baseUnitId: "",
  factor: 1,
  isDecimalAllowed: true,
  isActive: true,
  notes: "",
};

export function AdminFeature({ onNotice, onShopAssigned }) {
  const confirm = useConfirm();
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const products = useSelector(selectCatalogProducts);
  const shops = useSelector(selectCatalogShops);
  const categories = useSelector(selectCatalogCategories);
  const units = useSelector(selectCatalogUnits);
  const productSearchQuery = useSelector(selectAdminProductSearchQuery);
  const productSearchResults = useSelector(selectAdminProductSearchResults);

  const productImportInputRef = useRef(null);
  const [busyKey, setBusyKey] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [shopForm, setShopForm] = useState(emptyShopForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);

  const isAdmin = user?.role === "admin";
  const isShopkeeper = user?.role === "shop_keeper";
  const displayedProducts = productSearchQuery ? productSearchResults : products;

  useEffect(() => {
    if (token && isAdmin) {
      dispatch(fetchAdminUsers());
    }
  }, [dispatch, isAdmin, token]);

  useEffect(() => {
    dispatch(clearAdminProductSearch());

    return () => dispatch(clearAdminProductSearch());
  }, [dispatch]);

  const clearNotice = () => onNotice?.({ error: "", message: "" });
  const showError = (error) =>
    onNotice?.({ error: error?.message || "Admin action failed.", message: "" });
  const showSuccess = (message) => onNotice?.({ error: "", message });

  const resetShopForm = () => {
    setShopForm(emptyShopForm);
    setSelectedShopId("");
  };

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setSelectedProductId("");
  };

  const resetUnitForm = () => {
    setUnitForm(emptyUnitForm);
    setSelectedUnitId("");
  };

  const closeModal = () => {
    if (!busyKey) {
      setActiveModal(null);
    }
  };

  const openCreateShopModal = () => {
    clearNotice();
    resetShopForm();
    setActiveModal("shop-create");
  };

  const openCreateProductModal = () => {
    clearNotice();
    resetProductForm();
    setActiveModal("product-create");
  };

  const openCreateUnitModal = () => {
    clearNotice();
    resetUnitForm();
    setActiveModal("unit-create");
  };

  const editShop = (shop) => {
    clearNotice();
    setSelectedShopId(shop._id);
    setShopForm({
      name: shop.name || "",
      code: shop.code || "",
      location: shop.location || "",
      phone: shop.phone || "",
      isActive: Boolean(shop.isActive),
    });
    setActiveModal("shop-edit");
  };

  const editProduct = (product) => {
    clearNotice();
    setSelectedProductId(product._id);
    setProductForm({
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
    setActiveModal("product-edit");
  };

  const editUnit = (unit) => {
    clearNotice();
    setSelectedUnitId(unit._id);
    setUnitForm({
      name: unit.name || "",
      shortName: unit.shortName || "",
      baseUnitId: unit.baseUnitId?._id || unit.baseUnitId || "",
      factor: unit.factor ?? 1,
      isDecimalAllowed: Boolean(unit.isDecimalAllowed),
      isActive: Boolean(unit.isActive),
      notes: unit.notes || "",
    });
    setActiveModal("unit-edit");
  };

  const handleShopFormChange = (field, value) => {
    setShopForm((current) => ({ ...current, [field]: value }));
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const handleUnitFormChange = (field, value) => {
    setUnitForm((current) => ({ ...current, [field]: value }));
  };

  const refreshProducts = async () => {
    await dispatch(fetchCatalogProducts()).unwrap();

    if (productSearchQuery) {
      await dispatch(searchCatalogProducts(productSearchQuery)).unwrap();
    }
  };

  const handleShopFormSubmit = async (event) => {
    event.preventDefault();

    const name = shopForm.name.trim();
    const code = shopForm.code.trim();

    if (!name || !code) {
      showError(new Error("Branch name and code are required."));
      return;
    }

    setBusyKey(selectedShopId ? "admin-shop-update" : "admin-shop-create");
    clearNotice();

    try {
      const body = { ...shopForm, name, code };
      const result = selectedShopId
        ? await dispatch(
            updateCatalogShop({ shopId: selectedShopId, body }),
          ).unwrap()
        : await dispatch(createCatalogShop(body)).unwrap();

      if (!selectedShopId && isShopkeeper && result.user?.shopId) {
        const updatedUser = { ...user, shopId: result.user.shopId };
        localStorage.setItem("inventoryUser", JSON.stringify(updatedUser));
        dispatch(setCurrentUser(updatedUser));
        onShopAssigned?.(result.user.shopId);
      }

      await Promise.all([
        dispatch(fetchCatalogShops()).unwrap(),
        dispatch(fetchCatalogTransferDestinationShops()).unwrap(),
      ]);
      showSuccess(
        selectedShopId
          ? "Branch updated successfully."
          : "Branch created successfully.",
      );
      setActiveModal(null);
      resetShopForm();
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleProductFormSubmit = async (event) => {
    event.preventDefault();

    const itemCode = productForm.itemCode.trim();
    const description = productForm.description.trim();

    if (!itemCode || !description || !productForm.defaultUnitId) {
      showError(new Error("Product code, description, and unit are required."));
      return;
    }

    setBusyKey(
      selectedProductId ? "admin-product-update" : "admin-product-create",
    );
    clearNotice();

    try {
      const body = {
        ...productForm,
        itemCode,
        description,
        minimumStock: Number(productForm.minimumStock || 0),
        reorderLevel: Number(productForm.reorderLevel || 0),
      };

      if (selectedProductId) {
        await dispatch(
          updateCatalogProduct({ productId: selectedProductId, body }),
        ).unwrap();
      } else {
        await dispatch(createCatalogProduct(body)).unwrap();
      }

      await refreshProducts();
      showSuccess(
        selectedProductId
          ? "Product updated successfully."
          : "Product created successfully.",
      );
      setActiveModal(null);
      resetProductForm();
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleUnitFormSubmit = async (event) => {
    event.preventDefault();

    if (!unitForm.name.trim() || !unitForm.shortName.trim()) {
      showError(new Error("Name and Short Name are required."));
      return;
    }

    setBusyKey(selectedUnitId ? "admin-unit-update" : "admin-unit-create");
    clearNotice();

    try {
      const body = { ...unitForm, factor: Number(unitForm.factor) };

      if (selectedUnitId) {
        await dispatch(
          updateCatalogUnit({ unitId: selectedUnitId, body }),
        ).unwrap();
      } else {
        await dispatch(createCatalogUnit(body)).unwrap();
      }

      await dispatch(fetchCatalogUnits()).unwrap();
      showSuccess(
        selectedUnitId
          ? "Unit updated successfully."
          : "Unit created successfully.",
      );
      setActiveModal(null);
      resetUnitForm();
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const deleteShop = async (shopId) => {
    if (!await confirm({ title: "Delete branch?", message: "Are you sure you want to delete this branch? This cannot be undone.", confirmLabel: "Delete branch" })) return;

    setBusyKey("admin-shop-delete");
    clearNotice();

    try {
      await dispatch(deleteCatalogShop(shopId)).unwrap();
      await Promise.all([
        dispatch(fetchCatalogShops()).unwrap(),
        dispatch(fetchCatalogTransferDestinationShops()).unwrap(),
        dispatch(fetchTransfers()).unwrap(),
      ]);
      resetShopForm();
      showSuccess("Branch deleted successfully.");
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const deleteProduct = async (productId) => {
    if (!await confirm({ title: "Delete product?", message: "Are you sure you want to delete this product? This cannot be undone.", confirmLabel: "Delete product" })) return;

    setBusyKey("admin-product-delete");
    clearNotice();

    try {
      await dispatch(deleteCatalogProduct(productId)).unwrap();
      await refreshProducts();
      resetProductForm();
      showSuccess("Product deleted successfully.");
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const deleteUnit = async (unitId) => {
    if (!await confirm({ title: "Delete unit?", message: "Are you sure you want to delete this unit? This cannot be undone.", confirmLabel: "Delete unit" })) return;

    setBusyKey("admin-unit-delete");
    clearNotice();

    try {
      await dispatch(deleteCatalogUnit(unitId)).unwrap();
      await dispatch(fetchCatalogUnits()).unwrap();
      resetUnitForm();
      showSuccess("Unit deleted successfully.");
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleImportProducts = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(extension)) {
      showError(new Error("Please select an Excel file (.xlsx or .xls)."));
      return;
    }

    setBusyKey("product-import");
    clearNotice();

    try {
      const data = await dispatch(importCatalogProducts(file)).unwrap();
      const summary = data.summary || {};
      await refreshProducts();
      showSuccess(
        `Import completed. Created: ${summary.created || 0}, ` +
          `Skipped: ${summary.skipped || 0}, ` +
          `Failed: ${summary.failed || 0}.`,
      );

      if (summary.failed > 0) {
        console.log("Failed product rows:", data.failed);
      }
      if (summary.skipped > 0) {
        console.log("Skipped product rows:", data.skipped);
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const openProductImport = () => {
    if (isLoggedIn && !busyKey) {
      productImportInputRef.current?.click();
    }
  };

  const handleProductSearch = async (search = "") => {
    const query = search.trim();

    if (!query) {
      dispatch(clearAdminProductSearch());
      return;
    }

    setBusyKey("admin-products-search");
    clearNotice();

    try {
      await dispatch(searchCatalogProducts(query)).unwrap();
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleDownloadProducts = async () => {
    setBusyKey("admin-products-download");
    clearNotice();

    try {
      const filename = await downloadProductsExcel({ token });
      showSuccess(`${filename} downloaded.`);
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  return (
    <>
      <input
        ref={productImportInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportProducts}
      />
      <AdminView
        busyKey={busyKey}
        isLoggedIn={isLoggedIn}
        isShopkeeper={isShopkeeper}
        user={user}
        products={displayedProducts}
        shops={shops}
        units={units}
        onCreateProduct={openCreateProductModal}
        onImportProducts={openProductImport}
        onDownloadProducts={handleDownloadProducts}
        onCreateShop={openCreateShopModal}
        onCreateUnit={openCreateUnitModal}
        onProductDelete={deleteProduct}
        onProductEdit={editProduct}
        onProductSearch={handleProductSearch}
        onNotice={onNotice}
        onShopDelete={deleteShop}
        onShopEdit={editShop}
        onUnitDelete={deleteUnit}
        onUnitEdit={editUnit}
      />
      <AdminModals
        activeModal={activeModal}
        busyKey={busyKey}
        categories={categories}
        isLoggedIn={isLoggedIn}
        onClose={closeModal}
        onProductChange={handleProductFormChange}
        onProductSubmit={handleProductFormSubmit}
        onShopChange={handleShopFormChange}
        onShopSubmit={handleShopFormSubmit}
        onUnitChange={handleUnitFormChange}
        onUnitSubmit={handleUnitFormSubmit}
        productForm={productForm}
        shopForm={shopForm}
        unitForm={unitForm}
        units={units}
      />
    </>
  );
}

function AdminModals({
  activeModal,
  busyKey,
  categories,
  isLoggedIn,
  onClose,
  onProductChange,
  onProductSubmit,
  onShopChange,
  onShopSubmit,
  onUnitChange,
  onUnitSubmit,
  productForm,
  shopForm,
  unitForm,
  units,
}) {
  return (
    <>
      <AdminShopModal
        busyKey={busyKey}
        isEdit={activeModal === "shop-edit"}
        isLoggedIn={isLoggedIn}
        isOpen={activeModal === "shop-create" || activeModal === "shop-edit"}
        onChange={onShopChange}
        onClose={onClose}
        onSubmit={onShopSubmit}
        shopForm={shopForm}
      />
      <AdminProductModal
        busyKey={busyKey}
        categories={categories}
        isEdit={activeModal === "product-edit"}
        isLoggedIn={isLoggedIn}
        isOpen={
          activeModal === "product-create" || activeModal === "product-edit"
        }
        onChange={onProductChange}
        onClose={onClose}
        onSubmit={onProductSubmit}
        productForm={productForm}
        units={units}
      />
      <AdminUnitModal
        busyKey={busyKey}
        isEdit={activeModal === "unit-edit"}
        isLoggedIn={isLoggedIn}
        isOpen={activeModal === "unit-create" || activeModal === "unit-edit"}
        onChange={onUnitChange}
        onClose={onClose}
        onSubmit={onUnitSubmit}
        unitForm={unitForm}
        units={units}
      />
    </>
  );
}
