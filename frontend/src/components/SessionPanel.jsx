import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  loginUser,
  signupRequestOtp,
  signupVerifyOtp,
  forgotPasswordRequestOtp,
  forgotPasswordVerifyOtp,
  logout,
  resetSignupOtp,
  resetForgotOtp,
  selectIsLoggedIn,
  selectUser,
  selectAuthLoading,
  selectAuthError,
  selectAuthMessage,
  selectSignupOtpSent,
  selectForgotOtpSent,
} from "../features/auth/authSlice.js";

export function SessionPanel() {
  const dispatch = useDispatch();

  // ============================================================
  // Redux
  // ============================================================

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const message = useSelector(selectAuthMessage);
  const signupOtpSent = useSelector(selectSignupOtpSent);
  const forgotOtpSent = useSelector(selectForgotOtpSent);

  // ============================================================
  // Form State
  // ============================================================

  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  // ============================================================
  // Change Auth Mode
  // ============================================================

  const changeAuthMode = (mode) => {
    setAuthMode(mode);

    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    setOtp("");

    dispatch(resetSignupOtp());
    dispatch(resetForgotOtp());
  };

  // ============================================================
  // Keep OTP clean
  // ============================================================

  useEffect(() => {
    if (!signupOtpSent && !forgotOtpSent) {
      setOtp("");
    }
  }, [signupOtpSent, forgotOtpSent]);

  // ============================================================
  // Submit
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // ==========================================================
    // LOGIN
    // ==========================================================

    if (authMode === "login") {
      if (!cleanEmail) return;
      if (!password) return;

      await dispatch(
        loginUser({
          email: cleanEmail,
          password,
        })
      );

      return;
    }

    // ==========================================================
    // SIGNUP
    // ==========================================================

    if (authMode === "signup") {
      // --------------------------------------------------------
      // STEP 2 - VERIFY OTP
      // --------------------------------------------------------

      if (signupOtpSent) {
        if (!/^\d{4}$/.test(otp)) {
          return;
        }

        await dispatch(
          signupVerifyOtp({
            email: cleanEmail,
            otp,
          })
        );

        return;
      }

      // --------------------------------------------------------
      // STEP 1 - REQUEST OTP
      // --------------------------------------------------------

      if (!name.trim()) return;
      if (!cleanEmail) return;
      if (!password) return;

      if (password.length < 6) {
        return;
      }

      if (password !== confirmPassword) {
        return;
      }

      await dispatch(
        signupRequestOtp({
          name: name.trim(),
          email: cleanEmail,
          password,
        })
      );

      return;
    }

    // ==========================================================
    // FORGOT PASSWORD
    // ==========================================================

    if (authMode === "forgot") {
      // --------------------------------------------------------
      // STEP 2 - VERIFY OTP
      // --------------------------------------------------------

      if (forgotOtpSent) {
        if (!/^\d{4}$/.test(otp)) {
          return;
        }

        if (!password) {
          return;
        }

        if (password.length < 6) {
          return;
        }

        await dispatch(
          forgotPasswordVerifyOtp({
            email: cleanEmail,
            otp,
            password,
          })
        );

        return;
      }

      // --------------------------------------------------------
      // STEP 1 - REQUEST OTP
      // --------------------------------------------------------

      if (!cleanEmail) {
        return;
      }

      await dispatch(
        forgotPasswordRequestOtp({
          email: cleanEmail,
        })
      );

      return;
    }
  };

  // ============================================================
  // Logout
  // ============================================================

  const handleLogout = () => {
    dispatch(logout());
  };

  // ============================================================
  // Logged In
  // ============================================================

  return (
    <form className="panel login-panel" onSubmit={handleSubmit}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="panel-title">
        <ShieldCheck size={18} />
        <h2>Session</h2>
      </div>

      {/* ======================================================
          LOGGED IN
      ====================================================== */}

      {isLoggedIn ? (
        <>
          <div className="session-card">
            <CheckCircle2 size={20} />

            <div>
              <strong>{user?.name || "Logged in"}</strong>
              <span>{user?.email || "Token active"}</span>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </>
      ) : (
        <>
          {/* ==================================================
              LOGIN / SIGNUP / RESET SWITCH
          ================================================== */}

          <div className="auth-switch">
            {["login", "signup", "forgot"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={authMode === mode ? "active" : ""}
                onClick={() => changeAuthMode(mode)}
              >
                {mode === "login"
                  ? "Login"
                  : mode === "signup"
                  ? "Signup"
                  : "Reset"}
              </button>
            ))}
          </div>

          {/* ==================================================
              INFORMATION
          ================================================== */}

          <div className="auth-note">
            {authMode === "login" &&
              "Enter your email and password to sign in."}

            {authMode === "signup" &&
              !signupOtpSent &&
              "Create a new shopkeeper account."}

            {authMode === "signup" &&
              signupOtpSent &&
              "Enter the 4-digit verification code sent to your email."}

            {authMode === "forgot" &&
              !forgotOtpSent &&
              "Enter your email to receive a password reset code."}

            {authMode === "forgot" &&
              forgotOtpSent &&
              "Enter the 4-digit code sent to your email and choose a new password."}
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <div className="auth-error">
              {error}
            </div>
          ) : null}

          {/* ==================================================
              MESSAGE
          ================================================== */}

          {message ? (
            <div className="auth-message">
              {message}
            </div>
          ) : null}

          {/* ==================================================
              NAME
          ================================================== */}

          {authMode === "signup" && !signupOtpSent ? (
            <label>
              Name

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your name"
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          {/* ==================================================
              EMAIL
          ================================================== */}

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="admin@example.com"
              autoComplete="email"
              required
              disabled={
                (authMode === "signup" && signupOtpSent) ||
                (authMode === "forgot" && forgotOtpSent)
              }
            />
          </label>

          {/* ==================================================
              PASSWORD
          ================================================== */}

          {authMode === "login" ||
          (authMode === "signup" && !signupOtpSent) ||
          (authMode === "forgot" && forgotOtpSent) ? (
            <label>
              {authMode === "forgot"
                ? "New password"
                : "Password"}

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder={
                  authMode === "forgot"
                    ? "Enter your new password"
                    : "Enter your password"
                }
                autoComplete={
                  authMode === "login"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                required
              />
            </label>
          ) : null}

          {/* ==================================================
              CONFIRM PASSWORD
          ================================================== */}

          {authMode === "signup" && !signupOtpSent ? (
            <label>
              Confirm password

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
          ) : null}

          {/* ==================================================
              OTP
          ================================================== */}

          {(authMode === "signup" && signupOtpSent) ||
          (authMode === "forgot" && forgotOtpSent) ? (
            <label>
              Verification code

              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otp}
                onChange={(event) => {
                  const value = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4);

                  setOtp(value);
                }}
                placeholder="Enter 4-digit code"
                autoComplete="one-time-code"
                required
              />
            </label>
          ) : null}

          {/* ==================================================
              SUBMIT BUTTON
          ================================================== */}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <LogIn size={16} />
            )}

            {authMode === "signup"
              ? signupOtpSent
                ? "Verify Email"
                : "Send Verification Code"
              : authMode === "forgot"
              ? forgotOtpSent
                ? "Reset Password"
                : "Send Verification Code"
              : "Login"}
          </button>

          {/* ==================================================
              SIGNUP OTP ACTION
          ================================================== */}

          {authMode === "signup" && signupOtpSent ? (
            <div className="auth-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  dispatch(resetSignupOtp());
                  setOtp("");
                }}
              >
                Start Again
              </button>
            </div>
          ) : null}

          {/* ==================================================
              NORMAL AUTH ACTIONS
          ================================================== */}

          {!(authMode === "signup" && signupOtpSent) ? (
            <div className="auth-actions">
              {authMode === "login" ? (
                <>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => changeAuthMode("signup")}
                  >
                    Create account
                  </button>

                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => changeAuthMode("forgot")}
                  >
                    Forgot password
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => changeAuthMode("login")}
                >
                  Back to login
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </form>
  );
}
