import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteUser, getUsers, updateUser } from "../../services/api";

const initialState = { users: [], status: "idle", activeUserId: "", error: "" };
const tokenFor = (api) => api.getState().auth.token;

export const fetchAdminUsers = createAsyncThunk("admin/fetchUsers", async (_, api) => {
  try { return (await getUsers(tokenFor(api))).users || []; }
  catch (error) { return api.rejectWithValue(error.message); }
});
export const updateAdminUser = createAsyncThunk("admin/updateUser", async ({ userId, body }, api) => {
  try { return { userId, user: (await updateUser({ token: tokenFor(api), userId, body })).user }; }
  catch (error) { return api.rejectWithValue(error.message); }
});
export const deactivateAdminUser = createAsyncThunk("admin/deactivateUser", async (userId, api) => {
  try { await deleteUser({ token: tokenFor(api), userId }); return userId; }
  catch (error) { return api.rejectWithValue(error.message); }
});

const adminSlice = createSlice({
  name: "admin", initialState,
  reducers: { clearAdmin: () => initialState },
  extraReducers: (builder) => builder
    .addCase(fetchAdminUsers.fulfilled, (state, action) => { state.users = action.payload; state.status = "succeeded"; })
    .addCase(updateAdminUser.fulfilled, (state, action) => { state.status = "succeeded"; state.activeUserId = ""; state.users = state.users.map((user) => user._id === action.payload.userId ? { ...user, ...action.payload.user } : user); })
    .addCase(deactivateAdminUser.fulfilled, (state, action) => { state.status = "succeeded"; state.activeUserId = ""; state.users = state.users.map((user) => user._id === action.payload ? { ...user, isActive: false } : user); })
    .addMatcher((action) => [updateAdminUser.pending.type, deactivateAdminUser.pending.type].includes(action.type), (state, action) => { state.status = "updating"; state.activeUserId = action.meta.arg.userId || action.meta.arg; })
    .addMatcher((action) => action.type.endsWith("/rejected") && action.type.startsWith("admin/"), (state, action) => { state.status = "failed"; state.activeUserId = ""; state.error = action.payload || "Admin action failed."; }),
});
export const { clearAdmin } = adminSlice.actions;
export const selectAdminUsers = (state) => state.admin.users;
export const selectAdminActiveUserId = (state) => state.admin.activeUserId;
export default adminSlice.reducer;
