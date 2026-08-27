import { CheckCircle2, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'

export function SessionPanel({
  authMode,
  busyKey,
  email,
  isLoggedIn,
  name,
  onNameChange,
  onEmailChange,
  onLogin,
  onLogout,
  onSignup,
  onForgotPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onAuthModeChange,
  password,
  confirmPassword,
  user,
}) {
  return (
    <form className="panel login-panel" onSubmit={authMode === 'signup' ? onSignup : authMode === 'forgot' ? onForgotPassword : onLogin}>
      <div className="panel-title">
        <ShieldCheck size={18} />
        <h2>Session</h2>
      </div>

      {isLoggedIn ? (
        <div className="session-card">
          <CheckCircle2 size={20} />
          <div>
            <strong>{user?.name || 'Logged in'}</strong>
            <span>{user?.email || 'Token active'}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="auth-switch">
            {/* {['login', 'signup', 'forgot'].map((mode) => ( */}
            {['login', ].map((mode) => (
              <button
                key={mode}
                type="button"
                className={authMode === mode ? 'active' : ''}
                onClick={() => onAuthModeChange(mode)}
              >
                {mode === 'login' ? 'Login' : mode === 'signup' ? 'Signup' : 'Reset'}
              </button>
            ))}
          </div>

          <div className="auth-note">
            {authMode === 'login' && 'Enter your email and password to sign in.'}
            {authMode === 'signup' && 'Create a new shopkeeper account.'}
            {authMode === 'forgot' && 'Enter your email and a new password to reset your account.'}
          </div>

          {authMode === 'signup' ? (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            {authMode === 'forgot' ? 'New password' : 'Password'}
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={authMode === 'forgot' ? 'New password' : 'Password'}
              autoComplete={authMode === 'forgot' ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {authMode === 'signup' ? (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
              />
            </label>
          ) : null}
        </>
      )}

      {isLoggedIn ? (
        <button type="button" className="secondary-button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      ) : (
        <>
          <button
            type="submit"
            disabled={busyKey === 'login' || busyKey === 'signup' || busyKey === 'forgot'}
          >
            {authMode === 'signup' ? (
              busyKey === 'signup' ? <RefreshCw size={16} /> : <LogIn size={16} />
            ) : authMode === 'forgot' ? (
              busyKey === 'forgot' ? <RefreshCw size={16} /> : <LogIn size={16} />
            ) : (
              busyKey === 'login' ? <RefreshCw size={16} /> : <LogIn size={16} />
            )}
            {authMode === 'signup' ? 'Signup' : authMode === 'forgot' ? 'Reset password' : 'Login'}
          </button>

          {/* <div className="auth-actions">
            {authMode === 'login' ? (
              <>
                <button type="button" className="secondary-action" onClick={() => onAuthModeChange('signup')}>
                  Create account
                </button>
                <button type="button" className="secondary-action" onClick={() => onAuthModeChange('forgot')}>
                  Forgot password
                </button>
              </>
            ) : (
              <button type="button" className="secondary-action" onClick={() => onAuthModeChange('login')}>
                Back to login
              </button>
            )}
          </div> */}
        </>
      )}
    </form>
  )
}
