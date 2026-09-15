import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  selectIsLoggedIn,
  selectToken,
  selectUser,
} from "../auth/authSlice";
import {
  selectCatalogProducts,
  selectCatalogShops,
  selectCatalogTransferDestinationShops,
  selectCatalogUnits,
} from "../catalog/catalogSlice";
import { fetchTransfers } from "../transfers/transferSlice";
import {
  addInventoryStock,
  createTransfer,
  searchProducts,
} from "../../services/api";
import { formatProductName } from "../../utils/format";
import { fetchMovements } from "./stockSlice";

const emptyAddStock = {
  productId: "",
  unitId: "",
  quantity: "",
  remarks: "",
};

const emptyTransfer = {
  fromShopId: "",
  toShopId: "",
  controlNumber: "",
  remarks: "Stock Transfer.....",
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString?.() || "";
};

const getMovementDateRange = (dateFilters) => {
  if (dateFilters.dateMode === "month" && dateFilters.month) {
    const [year, month] = dateFilters.month.split("-").map(Number);

    return {
      startDate: `${dateFilters.month}-01`,
      endDate: new Date(Date.UTC(year, month, 0))
        .toISOString()
        .slice(0, 10),
    };
  }

  return {
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  };
};

export function useStockManagement({ dateFilters, onNotice, shopId }) {
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const products = useSelector(selectCatalogProducts);
  const shops = useSelector(selectCatalogShops);
  const transferDestinationShops = useSelector(
    selectCatalogTransferDestinationShops,
  );
  const units = useSelector(selectCatalogUnits);

  const [activeModal, setActiveModal] = useState(null);
  const [busyKey, setBusyKey] = useState("");
  const [addProductSearch, setAddProductSearch] = useState("");
  const [addSearchProducts, setAddSearchProducts] = useState([]);
  const [transferProductSearch, setTransferProductSearch] = useState("");
  const [transferSearchProducts, setTransferSearchProducts] = useState([]);
  const [addStock, setAddStock] = useState(emptyAddStock);
  const [transfer, setTransfer] = useState(() => ({
    ...emptyTransfer,
    fromShopId: getId(user?.shopId),
  }));
  const [transferItems, setTransferItems] = useState([]);

  const isAdmin = user?.role === "admin";
  const assignedShopId = useMemo(
    () => getId(user?.shopId) || getId(shopId),
    [shopId, user?.shopId],
  );
  const selectedProduct = useMemo(
    () =>
      addSearchProducts.find((product) => product._id === addStock.productId) ||
      products.find((product) => product._id === addStock.productId),
    [addSearchProducts, addStock.productId, products],
  );
  const selectedTransferProduct = useMemo(
    () =>
      transferSearchProducts.find(
        (product) => product._id === transfer.productId,
      ) ||
      products.find((product) => product._id === transfer.productId) ||
      null,
    [products, transfer.productId, transferSearchProducts],
  );
  const filteredAddProducts = useMemo(
    () => (addProductSearch.trim() ? addSearchProducts : products),
    [addProductSearch, addSearchProducts, products],
  );
  const sourceShops = useMemo(() => {
    if (!isAdmin && assignedShopId) {
      const ownShop = shops.filter((shop) => getId(shop._id) === assignedShopId);
      return ownShop.length ? ownShop : shops;
    }

    return shops;
  }, [assignedShopId, isAdmin, shops]);
  const destinationShops = useMemo(() => {
    const excludedShopId = getId(transfer.fromShopId) || assignedShopId;

    return transferDestinationShops.filter(
      (shop) => getId(shop._id) !== excludedShopId,
    );
  }, [assignedShopId, transfer.fromShopId, transferDestinationShops]);
  const isTransferSubmitDisabled =
    !transfer.fromShopId ||
    !transfer.toShopId ||
    transfer.fromShopId === transfer.toShopId ||
    transferItems.length === 0;

  const clearNotice = () => onNotice?.({ error: "", message: "" });
  const showError = (error) =>
    onNotice?.({
      error: error?.message || "Stock action failed.",
      message: "",
    });
  const showSuccess = (message) => onNotice?.({ error: "", message });

  const loadMovements = ({ search = "" } = {}) =>
    dispatch(
      fetchMovements({
        shopId,
        ...getMovementDateRange(dateFilters),
        search,
      }),
    ).unwrap();

  const searchMovements = (search = "") => loadMovements({ search });

  const handleAddProductSearch = async (value) => {
    setAddProductSearch(value);
    const search = value.trim();

    if (!search) {
      setAddSearchProducts([]);
      return;
    }

    try {
      const data = await searchProducts(token, search, 20);
      setAddSearchProducts(data.data || []);
    } catch (error) {
      console.error("Product search failed:", error);
      setAddSearchProducts([]);
    }
  };

  const handleTransferProductSearch = async (value) => {
    setTransferProductSearch(value);
    const search = value.trim();

    if (!search) {
      setTransferSearchProducts([]);
      return;
    }

    try {
      const data = await searchProducts(token, search, 20);
      setTransferSearchProducts(data.data || []);
    } catch (error) {
      console.error("Product search failed:", error);
      setTransferSearchProducts([]);
    }
  };

  const handleProductChange = (productId) => {
    const product =
      addSearchProducts.find((item) => item._id === productId) ||
      products.find((item) => item._id === productId);
    const unitId = product?.defaultUnitId?._id || product?.defaultUnitId || "";

    setAddStock((current) => ({ ...current, productId, unitId }));
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
    setAddStock((current) => ({ ...current, [field]: value }));
  };

  const handleTransferChange = (field, value) => {
    setTransfer((current) => ({ ...current, [field]: value }));

    if (field === "fromShopId") {
      setTransferItems([]);
      setTransferProductSearch("");
      setTransferSearchProducts([]);
    }
  };

  const openAddStockModal = () => {
    clearNotice();
    setAddProductSearch("");
    setActiveModal("add-stock");
  };

  const openTransferModal = () => {
    clearNotice();
    setTransfer({ ...emptyTransfer, fromShopId: assignedShopId });
    setTransferItems([]);
    setTransferProductSearch("");
    setTransferSearchProducts([]);
    setActiveModal("transfer-stock");
  };

  const closeModal = () => {
    if (!busyKey) {
      setActiveModal(null);
    }
  };

  const handleAddStock = async (event) => {
    event.preventDefault();
    const quantity = Number(addStock.quantity);

    if (
      !addStock.productId ||
      !addStock.unitId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      showError(new Error("Select a product and enter a quantity greater than 0."));
      return;
    }

    const productName = formatProductName(selectedProduct);
    const confirmed = window.confirm(
      `Add ${quantity} ${selectedProduct?.defaultUnitId?.shortName || ""} of ${productName} to this branch?`,
    );
    if (!confirmed) return;

    setBusyKey("add-stock");
    clearNotice();

    try {
      const body = {
        productId: addStock.productId,
        unitId: addStock.unitId,
        quantity,
        remarks: addStock.remarks,
      };
      const selectedShopId = String(shopId || "").trim();

      if (selectedShopId) {
        body.shopId = selectedShopId;
      }

      const data = await addInventoryStock({ token, body });
      showSuccess(data.message || "Incoming stock recorded successfully.");
      setAddStock(emptyAddStock);
      setActiveModal(null);
      await loadMovements();
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleAddTransferItem = () => {
    const quantity = Number(transfer.quantity);

    if (!transfer.productId) {
      showError(new Error("Please select a product."));
      return;
    }
    if (!transfer.unitId) {
      showError(new Error("Please select a unit."));
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showError(new Error("Please enter a quantity greater than 0."));
      return;
    }
    if (transferItems.some((item) => item.productId === transfer.productId)) {
      showError(
        new Error(
          "This product is already added. Remove it first if you want to change the quantity.",
        ),
      );
      return;
    }

    const product =
      transfer.selectedProduct ||
      transferSearchProducts.find((item) => item._id === transfer.productId) ||
      products.find((item) => item._id === transfer.productId);

    if (!product) {
      showError(new Error("Product information could not be found."));
      return;
    }

    setTransferItems((current) => [
      ...current,
      {
        productId: transfer.productId,
        product,
        unitId: transfer.unitId,
        quantity,
      },
    ]);
    setTransfer((current) => ({
      ...current,
      productId: "",
      selectedProduct: null,
      unitId: "",
      quantity: "",
    }));
    setTransferProductSearch("");
    setTransferSearchProducts([]);
    showSuccess("Product added to transfer list.");
  };

  const handleRemoveTransferItem = (productId) => {
    setTransferItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  };

  const handleTransferStock = async (event) => {
    event.preventDefault();

    if (!transfer.fromShopId || !transfer.toShopId) {
      showError(new Error("Please select source and destination shops."));
      return;
    }
    if (transfer.fromShopId === transfer.toShopId) {
      showError(new Error("Source and destination shops must be different."));
      return;
    }
    if (!transferItems.length) {
      showError(new Error("Please add at least one product to transfer."));
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to transfer ${transferItems.length} product${
        transferItems.length > 1 ? "s" : ""
      } to the selected branch?`,
    );
    if (!confirmed) return;

    setBusyKey("transfer-stock");
    clearNotice();

    try {
      const data = await createTransfer({
        token,
        body: {
          fromShopId: transfer.fromShopId,
          toShopId: transfer.toShopId,
          controlNumber: transfer.controlNumber,
          remarks: transfer.remarks,
          items: transferItems,
        },
      });

      showSuccess(
        data.message ||
          `${transferItems.length} product${
            transferItems.length > 1 ? "s" : ""
          } transferred successfully.`,
      );
      setTransfer({ ...emptyTransfer, fromShopId: assignedShopId });
      setTransferItems([]);
      setTransferProductSearch("");
      setTransferSearchProducts([]);
      setActiveModal(null);
      await Promise.all([dispatch(fetchTransfers()).unwrap(), loadMovements()]);
    } catch (error) {
      showError(error);
    } finally {
      setBusyKey("");
    }
  };

  return {
    activeModal,
    addProductSearch,
    addStock,
    busyKey,
    destinationShops,
    filteredAddProducts,
    handleAddStock,
    handleAddStockChange,
    handleAddTransferItem,
    handleAddProductSearch,
    handleProductChange,
    handleRemoveTransferItem,
    handleTransferChange,
    handleTransferProductChange,
    handleTransferProductSearch,
    handleTransferStock,
    isLoggedIn,
    isTransferSubmitDisabled,
    openAddStockModal,
    openTransferModal,
    products,
    searchMovements,
    selectedProduct,
    selectedTransferProduct,
    sourceShops,
    transfer,
    transferItems,
    transferProductSearch,
    transferSearchProducts,
    units,
    user,
    closeModal,
  };
}
