import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { cancelTransfer, deleteTransfer, getTransfers, markTransferDelivered } from "../../services/api";

const initialState = {
  items: [], pagination: { total: 0, page: 1, pages: 1, limit: 20 }, status: "idle", activeId: "", error: "",
};
const tokenFor = (api) => api.getState().auth.token;

export const fetchTransfers = createAsyncThunk("transfers/fetch", async (params = {}, api) => {
  try {
    const response = await getTransfers({ token: tokenFor(api), page: params.page || 1, limit: 20, search: params.search || "", status: params.status || "" });
    return { ...response, append: Boolean(params.append), requestedPage: params.page || 1 };
  } catch (error) { return api.rejectWithValue(error.message); }
});

const transferAction = (type, request) => createAsyncThunk(type, async (id, api) => {
  try { const response = await request({ token: tokenFor(api), transferId: id }); return { id, data: response.data }; }
  catch (error) { return api.rejectWithValue(error.message); }
});
export const removeTransfer = transferAction("transfers/remove", deleteTransfer);
export const deliverTransfer = transferAction("transfers/deliver", markTransferDelivered);
export const cancelExistingTransfer = transferAction("transfers/cancel", cancelTransfer);

const slice = createSlice({
  name: "transfers", initialState,
  reducers: { clearTransfers: () => initialState },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransfers.pending, (state) => { state.status = "loading"; state.error = ""; })
      .addCase(fetchTransfers.fulfilled, (state, action) => {
        state.status = "succeeded"; state.items = action.payload.append ? [...state.items, ...(action.payload.data || [])] : action.payload.data || [];
        state.pagination = action.payload.pagination || { ...initialState.pagination, page: action.payload.requestedPage };
      })
      .addCase(fetchTransfers.rejected, (state, action) => { state.status = "failed"; state.error = action.payload || "Failed to load transfers."; })
      .addCase(removeTransfer.fulfilled, (state, action) => { state.status = "succeeded"; state.activeId = ""; state.items = state.items.filter((item) => item._id !== action.payload.id); state.pagination.total = Math.max(0, state.pagination.total - 1); })
      .addMatcher((action) => [removeTransfer.pending.type, deliverTransfer.pending.type, cancelExistingTransfer.pending.type].includes(action.type), (state, action) => { state.status = "updating"; state.activeId = action.meta.arg; state.error = ""; })
      .addMatcher((action) => [deliverTransfer.fulfilled.type, cancelExistingTransfer.fulfilled.type].includes(action.type), (state, action) => { state.status = "succeeded"; state.activeId = ""; state.items = state.items.map((item) => item._id === action.payload.id ? { ...item, ...action.payload.data } : item); })
      .addMatcher((action) => [removeTransfer.rejected.type, deliverTransfer.rejected.type, cancelExistingTransfer.rejected.type].includes(action.type), (state, action) => { state.status = "failed"; state.activeId = ""; state.error = action.payload || "Transfer action failed."; });
  },
});
export const { clearTransfers } = slice.actions;
export const selectTransfers = (state) => state.transfers.items;
export const selectTransferPagination = (state) => state.transfers.pagination;
export const selectTransferStatus = (state) => state.transfers.status;
export const selectActiveTransferId = (state) => state.transfers.activeId;
export const selectTransferError = (state) => state.transfers.error;
export default slice.reducer;
