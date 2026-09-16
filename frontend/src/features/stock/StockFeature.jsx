import { AddStockModal } from "./AddStockModal";
import { StockView } from "./StockView";
import { TransferStockModal } from "./TransferStockModal";
import { useStockManagement } from "./useStockManagement";

export function StockFeature({ dateFilters, dateRange, onNotice, shopId }) {
  const stock = useStockManagement({ dateFilters, onNotice, shopId });

  return (
    <>
      <StockView
        shopId={shopId}
        dateRange={dateRange}
        busyKey={stock.busyKey}
        isLoggedIn={stock.isLoggedIn}
        onOpenAddStock={stock.openAddStockModal}
        onOpenTransferStock={stock.openTransferModal}
        onSearchMovements={stock.searchMovements}
        user={stock.user}
      />
      <AddStockModal
        addStock={stock.addStock}
        busyKey={stock.busyKey}
        isOpen={stock.activeModal === "add-stock"}
        onAddStockChange={stock.handleAddStockChange}
        onClose={stock.closeModal}
        onProductChange={stock.handleProductChange}
        onProductSearchChange={stock.handleAddProductSearch}
        onSubmit={stock.handleAddStock}
        productSearch={stock.addProductSearch}
        products={stock.filteredAddProducts}
        selectedProduct={stock.selectedProduct}
      />
      <TransferStockModal
        busyKey={stock.busyKey}
        destinationShops={stock.destinationShops}
        isOpen={stock.activeModal === "transfer-stock"}
        isSubmitDisabled={stock.isTransferSubmitDisabled}
        onAddItem={stock.handleAddTransferItem}
        onClose={stock.closeModal}
        onProductChange={stock.handleTransferProductChange}
        onProductSearchChange={stock.handleTransferProductSearch}
        onRemoveItem={stock.handleRemoveTransferItem}
        onSubmit={stock.handleTransferStock}
        onTransferChange={stock.handleTransferChange}
        productSearch={stock.transferProductSearch}
        selectedProduct={stock.selectedTransferProduct}
        sourceShops={stock.sourceShops}
        transferableProducts={stock.transferSearchProducts}
        transfer={stock.transfer}
        transferItems={stock.transferItems}
        products={stock.products}
        units={stock.units}
      />
    </>
  );
}
