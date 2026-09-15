import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import transferReducer from "../features/transfers/transferSlice";
import stockReducer from "../features/stock/stockSlice";
import adminReducer from "../features/admin/adminSlice";
import catalogReducer from "../features/catalog/catalogSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transfers: transferReducer,
    stock: stockReducer,
    admin: adminReducer,
    catalog: catalogReducer,
  },
});
