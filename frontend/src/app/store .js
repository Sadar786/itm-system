import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createSessionMiddleware, resetOnLogout } from "./sessionState";
import authReducer from "../features/auth/authSlice";
import transferReducer from "../features/transfers/transferSlice";
import stockReducer from "../features/stock/stockSlice";
import adminReducer from "../features/admin/adminSlice";
import catalogReducer from "../features/catalog/catalogSlice";

export const store = configureStore({
  reducer: resetOnLogout(combineReducers({
    auth: authReducer,
    transfers: transferReducer,
    stock: stockReducer,
    admin: adminReducer,
    catalog: catalogReducer,
  })),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createSessionMiddleware()),
});
