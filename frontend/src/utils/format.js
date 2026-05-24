export const formatProductName = (product) =>
  [product?.itemCode, product?.description].filter(Boolean).join(' - ')

export const todayDate = () => new Date().toISOString().slice(0, 10)

export const currentMonth = () => new Date().toISOString().slice(0, 7)
