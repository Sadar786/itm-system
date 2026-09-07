import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  login,
  requestSignupOtp,
  verifySignupOtp,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from "../../services/api";


// ============================================================
// Get Stored User
// ============================================================
// When the application starts, try to restore the previously
// logged-in user from localStorage.
//
// If the stored JSON is invalid, return null instead of
// crashing the application.
// ============================================================

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("inventoryUser");

    return storedUser
      ? JSON.parse(storedUser)
      : null;

  } catch {
    return null;
  }
};


// ============================================================
// Initial State
// ============================================================

const initialState = {

  // JWT token used for authenticated API requests
  token:
    localStorage.getItem("inventoryToken") || "",

  // Logged-in user information
  user: getStoredUser(),

  // General loading state
  loading: false,

  // Error message shown to the user
  error: "",

  // Success / information message
  message: "",

  // ----------------------------------------------------------
  // Signup Email Verification
  // ----------------------------------------------------------
  // false = signup form is being displayed
  // true  = OTP has been sent and OTP form should be displayed
  // ----------------------------------------------------------

  signupOtpSent: false,
  forgotOtpSent: false,
};


// ============================================================
// LOGIN
// ============================================================

export const loginUser = createAsyncThunk(

  "auth/loginUser",

  async (
    { email, password },
    { rejectWithValue }
  ) => {

    try {

      // Call backend login API
      const data = await login({
        email,
        password,
      });


      // ------------------------------------------------------
      // Store authentication information
      // ------------------------------------------------------

      localStorage.setItem(
        "inventoryToken",
        data.token
      );

      localStorage.setItem(
        "inventoryUser",
        JSON.stringify(data.user)
      );

      localStorage.setItem(
        "inventoryLoginTime",
        Date.now().toString()
      );


      // Return backend response to Redux
      return data;

    } catch (error) {

      return rejectWithValue(
        error.message || "Login failed."
      );
    }
  }
);


// ============================================================
// SIGNUP - REQUEST OTP
// ============================================================
// This does NOT create the user.
//
// It sends the signup information to the backend.
// The backend:
//   1. Checks whether email already exists
//   2. Generates a 4-digit OTP
//   3. Stores the temporary verification record
//   4. Sends the OTP to the user's email
//
// After this succeeds, signupOtpSent becomes true.
// ============================================================

export const signupRequestOtp = createAsyncThunk(

  "auth/signupRequestOtp",

  async (
    { name, email, password },
    { rejectWithValue }
  ) => {

    try {

      const data = await requestSignupOtp({
        name,
        email,
        password,
      });


      return data;

    } catch (error) {

      return rejectWithValue(
        error.message ||
        "Unable to send verification code."
      );
    }
  }
);


// ============================================================
// SIGNUP - VERIFY OTP
// ============================================================
// The user enters the 4-digit OTP received by email.
//
// The backend verifies the OTP.
//
// ONLY after successful verification does the backend:
//   1. Create the user
//   2. Generate JWT token
//   3. Return user information
//
// Then we save the token/user locally.
// ============================================================

export const signupVerifyOtp = createAsyncThunk(

  "auth/signupVerifyOtp",

  async (
    { email, otp },
    { rejectWithValue }
  ) => {

    try {

      const data = await verifySignupOtp({
        email,
        otp,
      });


      // ------------------------------------------------------
      // Signup successfully verified
      // ------------------------------------------------------

      localStorage.setItem(
        "inventoryToken",
        data.token
      );

      localStorage.setItem(
        "inventoryUser",
        JSON.stringify(data.user)
      );

      localStorage.setItem(
        "inventoryLoginTime",
        Date.now().toString()
      );


      return data;

    } catch (error) {

      return rejectWithValue(
        error.message ||
        "Email verification failed."
      );
    }
  }
);



// ============================================================
// FORGOT PASSWORD - REQUEST OTP
// ============================================================

export const forgotPasswordRequestOtp =
  createAsyncThunk(
    "auth/forgotPasswordRequestOtp",
    async ({ email }, { rejectWithValue }) => {
      try {
        const data =
          await requestForgotPasswordOtp({
            email,
          });

        return data;
      } catch (error) {
        return rejectWithValue(
          error.message ||
          "Unable to send password reset code."
        );
      }
    }
  );


// ============================================================
// FORGOT PASSWORD - VERIFY OTP
// ============================================================

export const forgotPasswordVerifyOtp =
  createAsyncThunk(
    "auth/forgotPasswordVerifyOtp",
    async (
      { email, otp, password },
      { rejectWithValue }
    ) => {
      try {
        const data =
          await verifyForgotPasswordOtp({
            email,
            otp,
            password,
          });

        return data;
      } catch (error) {
        return rejectWithValue(
          error.message ||
          "Password reset failed."
        );
      }
    }
  );


// ============================================================
// AUTH SLICE
// ============================================================

const authSlice = createSlice({

  name: "auth",

  initialState,


  // ==========================================================
  // NORMAL REDUCERS
  // ==========================================================

  reducers: {

    // --------------------------------------------------------
    // Logout
    // --------------------------------------------------------

    logout: (state) => {

      // Remove authentication data
      localStorage.removeItem(
        "inventoryToken"
      );

      localStorage.removeItem(
        "inventoryUser"
      );

      localStorage.removeItem(
        "inventoryLoginTime"
      );


      // Reset Redux authentication state
      state.token = "";
      state.user = null;

      state.error = "";
      state.message = "";

      // Reset signup verification state
      state.signupOtpSent = false;
      state.forgotOtpSent = false;
    },


    // --------------------------------------------------------
    // Clear Error
    // --------------------------------------------------------

    clearAuthError: (state) => {

      state.error = "";
    },


    // --------------------------------------------------------
    // Clear Message
    // --------------------------------------------------------

    clearAuthMessage: (state) => {

      state.message = "";
    },


    // --------------------------------------------------------
    // Reset Signup OTP State
    // --------------------------------------------------------
    // Useful when the user clicks "Back to login" or wants
    // to restart the signup process.
    // --------------------------------------------------------

    resetSignupOtp: (state) => {

      state.signupOtpSent = false;

      state.error = "";
      state.message = "";
    },

    // --------------------------------------------------------
    // Reset Forgot Password OTP State
    // --------------------------------------------------------
    // Useful when the user clicks "Back to login" or wants
    // to restart the forgot password process.
    // --------------------------------------------------------
    resetForgotOtp: (state) => {
      state.forgotOtpSent = false;
      state.error = "";
      state.message = "";
    },

  },


  // ==========================================================
  // ASYNC ACTIONS
  // ==========================================================

  extraReducers: (builder) => {


    // ========================================================
    // LOGIN
    // ========================================================

    builder

      // ------------------------------------------------------
      // Login - Pending
      // ------------------------------------------------------

      .addCase(
        loginUser.pending,
        (state) => {

          state.loading = true;

          state.error = "";
          state.message = "";
        }
      )



      // ------------------------------------------------------
      // Login - Success
      // ------------------------------------------------------

      .addCase(
        loginUser.fulfilled,
        (state, action) => {

          state.loading = false;

          state.token =
            action.payload.token;

          state.user =
            action.payload.user;

          state.error = "";

          state.message =
            "Login successful. Inventory is loading.";
        }
      )


      // ------------------------------------------------------
      // Login - Failed
      // ------------------------------------------------------

      .addCase(
        loginUser.rejected,
        (state, action) => {

          state.loading = false;

          state.error =
            action.payload ||
            "Login failed.";
        }
      );


    // ========================================================
    // SIGNUP - REQUEST OTP
    // ========================================================

    builder

      // ------------------------------------------------------
      // Request OTP - Pending
      // ------------------------------------------------------

      .addCase(
        signupRequestOtp.pending,
        (state) => {

          state.loading = true;

          state.error = "";
          state.message = "";
        }
      )


      // ------------------------------------------------------
      // Request OTP - Success
      // ------------------------------------------------------

      .addCase(
        signupRequestOtp.fulfilled,
        (state, action) => {

          state.loading = false;

          // Tell frontend to display OTP input
          state.signupOtpSent = true;

          state.error = "";

          state.message =
            action.payload?.message ||
            "Verification code sent to your email.";
        }
      )


      // ------------------------------------------------------
      // Request OTP - Failed
      // ------------------------------------------------------

      .addCase(
        signupRequestOtp.rejected,
        (state, action) => {

          state.loading = false;

          state.signupOtpSent = false;

          state.error =
            action.payload ||
            "Unable to send verification code.";
        }
      );


    // ========================================================
    // SIGNUP - VERIFY OTP
    // ========================================================

    builder

      // ------------------------------------------------------
      // Verify OTP - Pending
      // ------------------------------------------------------

      .addCase(
        signupVerifyOtp.pending,
        (state) => {

          state.loading = true;

          state.error = "";
          state.message = "";
        }
      )


      // ------------------------------------------------------
      // Verify OTP - Success
      // ------------------------------------------------------

      .addCase(
        signupVerifyOtp.fulfilled,
        (state, action) => {

          state.loading = false;

          // Signup is now completely finished
          state.signupOtpSent = false;

          // Save logged-in user
          state.token =
            action.payload.token;

          state.user =
            action.payload.user;

          state.error = "";

          state.message =
            action.payload?.message ||
            "Email verified. Signup successful.";
        }
      )


      // ------------------------------------------------------
      // Verify OTP - Failed
      // ------------------------------------------------------

      .addCase(
        signupVerifyOtp.rejected,
        (state, action) => {

          state.loading = false;

          // Keep OTP screen open.
          // The user can enter the code again.
          state.signupOtpSent = true;

          state.error =
            action.payload ||
            "Invalid verification code.";
        }
      );


    // ========================================================
    // FORGOT PASSWORD - REQUEST OTP
    // ========================================================

    builder

      .addCase(
        forgotPasswordRequestOtp.pending,
        (state) => {
          state.loading = true;
          state.error = "";
          state.message = "";
        }
      )

      .addCase(
        forgotPasswordRequestOtp.fulfilled,
        (state, action) => {
          state.loading = false;

          state.forgotOtpSent = true;

          state.error = "";

          state.message =
            action.payload?.message ||
            "Password reset code sent to your email.";
        }
      )

      .addCase(
        forgotPasswordRequestOtp.rejected,
        (state, action) => {
          state.loading = false;

          state.forgotOtpSent = false;

          state.error =
            action.payload ||
            "Unable to send password reset code.";
        }
      )


      // ========================================================
      // FORGOT PASSWORD - VERIFY OTP
      // ========================================================

      .addCase(
        forgotPasswordVerifyOtp.pending,
        (state) => {
          state.loading = true;
          state.error = "";
          state.message = "";
        }
      )

      .addCase(
        forgotPasswordVerifyOtp.fulfilled,
        (state, action) => {
          state.loading = false;

          state.forgotOtpSent = false;

          state.error = "";

          state.message =
            action.payload?.message ||
            "Password updated successfully. You can now log in.";
        }
      )

      .addCase(
        forgotPasswordVerifyOtp.rejected,
        (state, action) => {
          state.loading = false;

          // Keep OTP screen open
          state.forgotOtpSent = true;

          state.error =
            action.payload ||
            "Invalid verification code.";
        }
      );

  },
});


// ============================================================
// ACTIONS
// ============================================================

export const {
  logout,
  clearAuthError,
  clearAuthMessage,
  resetSignupOtp,
  resetForgotOtp,
} = authSlice.actions;

// ============================================================
// SELECTORS
// ============================================================

// Get complete auth state
export const selectAuth = (state) =>
  state.auth;


// Get logged-in user
export const selectUser = (state) =>
  state.auth.user;


// Get JWT token
export const selectToken = (state) =>
  state.auth.token;


// Check whether user is logged in
export const selectIsLoggedIn = (state) =>
  Boolean(state.auth.token);


// General loading state
export const selectAuthLoading = (state) =>
  state.auth.loading;


// Authentication error
export const selectAuthError = (state) =>
  state.auth.error;


// Authentication message
export const selectAuthMessage = (state) =>
  state.auth.message;


// ------------------------------------------------------------
// Signup OTP status
// ------------------------------------------------------------

export const selectSignupOtpSent = (state) =>
  state.auth.signupOtpSent;


// ------------------------------------------------------------
// Forgot Password OTP status
// ------------------------------------------------------------

export const selectForgotOtpSent = (state) =>
  state.auth.forgotOtpSent;


// ============================================================
// EXPORT REDUCER
// ============================================================

export default authSlice.reducer;