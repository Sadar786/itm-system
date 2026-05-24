export const reportGroups = [
  {
    title: 'Stock',
    reports: [
      {
        key: 'stock-detail',
        label: 'Current Stock Excel',
        path: '/reports/current-stock/export',
        filename: 'stock-detail-report.xlsx',
        useShop: true,
      },
      {
        key: 'movements',
        label: 'Inventory Movements',
        path: '/reports/movements/export',
        filename: 'inventory-movement-report.xlsx',
        useShop: true,
        useDates: true,
      },
    ],
  },
  {
    title: 'Transfers',
    reports: [
      {
        key: 'all-shop-transfer',
        label: 'All Shop Transfer',
        path: '/reports/transfers/all-shops/export',
        filename: 'all-shop-transfer-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
      {
        key: 'all-shop-coming',
        label: 'All Shop Coming',
        path: '/reports/transfers/all-shops/coming/export',
        filename: 'all-shop-coming-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
      {
        key: 'to-shop',
        label: 'Transfer To Shop',
        path: '/reports/transfers/to-shop/export',
        filename: 'transfer-to-shop-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
      {
        key: 'from-shop',
        label: 'Transfer From Shop',
        path: '/reports/transfers/from-shop/export',
        filename: 'transfer-from-shop-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
      {
        key: 'transfer-rec',
        label: 'Transfer Rec Matrix',
        path: '/reports/transfers/export',
        filename: 'transfer-rec-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
    ],
  },
]
