import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  createProduct,
  createShop,
  createUnit,
  deleteProduct,
  deleteShop,
  deleteUnit,
  getCategories,
  getProducts,
  getShops,
  getTransferDestinationShops,
  getUnits,
  importProducts,
  updateProduct,
  updateShop,
  updateUnit,
} from "../../services/api";

const initialState = {
  products: [],
  shops: [],
  transferDestinationShops: [],
  categories: [],
  units: [],
  adminProductSearch: {
    query: "",
    results: [],
    status: "idle",
    requestId: null,
  },
  status: {
    products: "idle",
    shops: "idle",
    transferDestinationShops: "idle",
    categories: "idle",
    units: "idle",
  },
  error: "",
};

const tokenFor = (api) => api.getState().auth.token;

const createCatalogRequest = (type, request) =>
  createAsyncThunk(type, async (argument, api) => {
    try {
      return await request({ argument, token: tokenFor(api) });
    } catch (error) {
      return api.rejectWithValue(error.message || "Catalog request failed.");
    }
  });

export const fetchCatalogProducts = createCatalogRequest(
  "catalog/fetchProducts",
  async ({ argument: search = "", token }) => {
    const data = await getProducts(token, search);
    return data.data || [];
  },
);

export const searchCatalogProducts = createCatalogRequest(
  "catalog/searchProducts",
  async ({ argument: search = "", token }) => {
    const data = await getProducts(token, search);
    return data.data || [];
  },
);

export const fetchCatalogShops = createCatalogRequest(
  "catalog/fetchShops",
  async ({ argument: search = "", token }) => {
    const data = await getShops(token, search);
    return data.data || [];
  },
);

export const fetchCatalogTransferDestinationShops = createCatalogRequest(
  "catalog/fetchTransferDestinationShops",
  async ({ token }) => {
    const data = await getTransferDestinationShops(token);
    return data.data || [];
  },
);

export const fetchCatalogCategories = createCatalogRequest(
  "catalog/fetchCategories",
  async ({ token }) => {
    const data = await getCategories(token);
    return data.data || [];
  },
);

export const fetchCatalogUnits = createCatalogRequest(
  "catalog/fetchUnits",
  async ({ token }) => {
    const data = await getUnits(token);
    return data.data || [];
  },
);

export const createCatalogProduct = createCatalogRequest(
  "catalog/createProduct",
  ({ argument: body, token }) => createProduct({ token, body }),
);

export const updateCatalogProduct = createCatalogRequest(
  "catalog/updateProduct",
  ({ argument: { productId, body }, token }) =>
    updateProduct({ token, productId, body }),
);

export const deleteCatalogProduct = createCatalogRequest(
  "catalog/deleteProduct",
  ({ argument: productId, token }) => deleteProduct({ token, productId }),
);

export const importCatalogProducts = createCatalogRequest(
  "catalog/importProducts",
  ({ argument: file, token }) => importProducts({ token, file }),
);

export const createCatalogShop = createCatalogRequest(
  "catalog/createShop",
  ({ argument: body, token }) => createShop({ token, body }),
);

export const updateCatalogShop = createCatalogRequest(
  "catalog/updateShop",
  ({ argument: { shopId, body }, token }) => updateShop({ token, shopId, body }),
);

export const deleteCatalogShop = createCatalogRequest(
  "catalog/deleteShop",
  ({ argument: shopId, token }) => deleteShop({ token, shopId }),
);

export const createCatalogUnit = createCatalogRequest(
  "catalog/createUnit",
  ({ argument: body, token }) => createUnit({ token, body }),
);

export const updateCatalogUnit = createCatalogRequest(
  "catalog/updateUnit",
  ({ argument: { unitId, body }, token }) => updateUnit({ token, unitId, body }),
);

export const deleteCatalogUnit = createCatalogRequest(
  "catalog/deleteUnit",
  ({ argument: unitId, token }) => deleteUnit({ token, unitId }),
);

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    clearCatalog: () => initialState,
    clearAdminProductSearch: (state) => {
      state.adminProductSearch = initialState.adminProductSearch;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalogProducts.pending, (state) => {
        state.status.products = "loading";
        state.error = "";
      })
      .addCase(fetchCatalogProducts.fulfilled, (state, action) => {
        state.products = action.payload;
        state.status.products = "succeeded";
      })
      .addCase(fetchCatalogProducts.rejected, (state, action) => {
        state.status.products = "failed";
        state.error = action.payload || "Failed to load products.";
      })
      .addCase(searchCatalogProducts.pending, (state, action) => {
        state.adminProductSearch = {
          query: action.meta.arg,
          results: [],
          status: "loading",
          requestId: action.meta.requestId,
        };
      })
      .addCase(searchCatalogProducts.fulfilled, (state, action) => {
        if (state.adminProductSearch.requestId !== action.meta.requestId) return;

        state.adminProductSearch.results = action.payload;
        state.adminProductSearch.status = "succeeded";
      })
      .addCase(searchCatalogProducts.rejected, (state, action) => {
        if (state.adminProductSearch.requestId !== action.meta.requestId) return;

        state.adminProductSearch.status = "failed";
        state.error = action.payload || "Failed to search products.";
      })
      .addCase(fetchCatalogShops.pending, (state) => {
        state.status.shops = "loading";
        state.error = "";
      })
      .addCase(fetchCatalogShops.fulfilled, (state, action) => {
        state.shops = action.payload;
        state.status.shops = "succeeded";
      })
      .addCase(fetchCatalogShops.rejected, (state, action) => {
        state.status.shops = "failed";
        state.error = action.payload || "Failed to load branches.";
      })
      .addCase(fetchCatalogTransferDestinationShops.pending, (state) => {
        state.status.transferDestinationShops = "loading";
        state.error = "";
      })
      .addCase(fetchCatalogTransferDestinationShops.fulfilled, (state, action) => {
        state.transferDestinationShops = action.payload;
        state.status.transferDestinationShops = "succeeded";
      })
      .addCase(fetchCatalogTransferDestinationShops.rejected, (state, action) => {
        state.status.transferDestinationShops = "failed";
        state.error = action.payload || "Failed to load transfer destinations.";
      })
      .addCase(fetchCatalogCategories.pending, (state) => {
        state.status.categories = "loading";
        state.error = "";
      })
      .addCase(fetchCatalogCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.status.categories = "succeeded";
      })
      .addCase(fetchCatalogCategories.rejected, (state, action) => {
        state.status.categories = "failed";
        state.error = action.payload || "Failed to load categories.";
      })
      .addCase(fetchCatalogUnits.pending, (state) => {
        state.status.units = "loading";
        state.error = "";
      })
      .addCase(fetchCatalogUnits.fulfilled, (state, action) => {
        state.units = action.payload;
        state.status.units = "succeeded";
      })
      .addCase(fetchCatalogUnits.rejected, (state, action) => {
        state.status.units = "failed";
        state.error = action.payload || "Failed to load units.";
      });
  },
});

export const { clearAdminProductSearch, clearCatalog } = catalogSlice.actions;

export const selectCatalogProducts = (state) => state.catalog.products;
export const selectCatalogShops = (state) => state.catalog.shops;
export const selectCatalogTransferDestinationShops = (state) =>
  state.catalog.transferDestinationShops;
export const selectCatalogCategories = (state) => state.catalog.categories;
export const selectCatalogUnits = (state) => state.catalog.units;
export const selectAdminProductSearchQuery = (state) =>
  state.catalog.adminProductSearch.query;
export const selectAdminProductSearchResults = (state) =>
  state.catalog.adminProductSearch.results;

export default catalogSlice.reducer;
