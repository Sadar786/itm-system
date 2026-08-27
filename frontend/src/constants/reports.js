export const reportGroups = [
  
  {
    title: 'Transfers',
    reports: [
      {
        key: 'all-shop-transfer',
        label: 'All Branches Transfer',
        path: '/reports/transfers/all-shops/export',
        filename: 'all-shop-transfer-report.xlsx',
        useDateMode: true,
        adminOnly: true,
      },
     
      {
        key: 'to-shop',
        label: 'Transfer To Branches',
        path: '/reports/transfers/to-shop/export',
        filename: 'transfer-to-shop-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
      {
        key: 'from-shop',
        label: 'Transfer From Branches',
        path: '/reports/transfers/from-shop/export',
        filename: 'transfer-from-shop-report.xlsx',
        useShop: true,
        useDateMode: true,
      },
    
    ],
  },
]

