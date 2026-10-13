import { useId, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
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
import {
  getPasswordRequirements,
  getPasswordValidationMessage,
} from "../utils/passwordValidation.js";
import "./SessionPanel.css";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const passwordId = useId();
  const confirmPasswordId = useId();
  const requirementsId = `${passwordId}-requirements`;
  const confirmErrorId = `${confirmPasswordId}-error`;
  const isSignupForm = authMode === "signup" && !signupOtpSent;
  const passwordRequirements = getPasswordRequirements(password);
  const metRequirements = passwordRequirements.filter(({ met }) => met).length;
  const isPasswordValid = metRequirements === passwordRequirements.length;
  const passwordsMatch = password === confirmPassword;
  const showConfirmError = isSignupForm && Boolean(confirmPassword) && !passwordsMatch;

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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError("");

    dispatch(resetSignupOtp());
    dispatch(resetForgotOtp());
  };

  // ============================================================
  // Submit
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setFormError("");

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
      const passwordError = getPasswordValidationMessage(password);
      if (passwordError) {
        setFormError(passwordError);
        return;
      }

      if (!passwordsMatch) {
        setFormError("Passwords do not match. Please enter the same password in both fields.");
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

          {formError || error ? (
            <div className="auth-error" role="alert">
              {formError || error}
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
            <div className="session-password-field">
              <label htmlFor={passwordId}>
                {authMode === "forgot" ? "New password" : "Password"}
              </label>

              <div className="session-password-input">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFormError("");
                  }}
                  placeholder={
                    authMode === "forgot"
                      ? "Enter your new password"
                      : "Enter your password"
                  }
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  minLength={isSignupForm ? 8 : 6}
                  aria-describedby={isSignupForm ? requirementsId : undefined}
                  aria-invalid={isSignupForm && Boolean(password) && !isPasswordValid}
                  required
                />
                <button
                  type="button"
                  className="session-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  aria-controls={passwordId}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>

              {isSignupForm ? (
                <div id={requirementsId} className="session-password-requirements">
                  <p>Password must contain:</p>
                  <ul>
                    {passwordRequirements.map(({ id, label, met }) => (
                      <li key={id} className={met ? "is-met" : "is-missing"}>
                        {met ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                        <span>
                          <span className="session-visually-hidden">{met ? "Met: " : "Missing: "}</span>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <span className="session-visually-hidden" role="status">
                    {metRequirements} of {passwordRequirements.length} password requirements met.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ==================================================
              CONFIRM PASSWORD
          ================================================== */}

          {authMode === "signup" && !signupOtpSent ? (
            <div className="session-password-field">
              <label htmlFor={confirmPasswordId}>Confirm password</label>
              <div className="session-password-input">
                <input
                  id={confirmPasswordId}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setFormError("");
                  }}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  minLength={8}
                  aria-invalid={showConfirmError}
                  aria-describedby={showConfirmError ? confirmErrorId : undefined}
                  required
                />
                <button
                  type="button"
                  className="session-password-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  aria-pressed={showConfirmPassword}
                  aria-controls={confirmPasswordId}
                >
                  {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {showConfirmError ? (
                <p id={confirmErrorId} className="session-password-error" role="status">
                  Passwords do not match.
                </p>
              ) : null}
            </div>
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
            disabled={loading || (isSignupForm && (!isPasswordValid || !passwordsMatch))}
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
