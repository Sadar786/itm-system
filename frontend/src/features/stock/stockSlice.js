import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getMovements } from "../../services/api";

const initialState = { movements: [], status: "idle", error: "" };

export const fetchMovements = createAsyncThunk("stock/fetchMovements", async (params = {}, api) => {
  try {
    const response = await getMovements({ token: api.getState().auth.token, ...params });
    return response.data || [];
  } catch (error) {
    return api.rejectWithValue(error.message || "Failed to load movements.");
  }
});

const stockSlice = createSlice({
  name: "stock",
  initialState,
  reducers: { clearMovements: () => initialState },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovements.pending, (state) => { state.status = "loading"; state.error = ""; })
      .addCase(fetchMovements.fulfilled, (state, action) => { state.status = "succeeded"; state.movements = action.payload; })
      .addCase(fetchMovements.rejected, (state, action) => { state.status = "failed"; state.error = action.payload || "Failed to load movements."; });
  },
});

export const { clearMovements } = stockSlice.actions;
export const selectMovements = (state) => state.stock.movements;
export const selectStockError = (state) => state.stock.error;
export default stockSlice.reducer;
