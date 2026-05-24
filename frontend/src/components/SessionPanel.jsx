import { CheckCircle2, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'

export function SessionPanel({
  busyKey,
  email,
  isLoggedIn,
  onEmailChange,
  onLogin,
  onLogout,
  onPasswordChange,
  password,
  user,
}) {
  return (
    <form className="panel login-panel" onSubmit={onLogin}>
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
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </label>
        </>
      )}

      {isLoggedIn ? (
        <button type="button" className="secondary-button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      ) : (
        <button type="submit" disabled={busyKey === 'login'}>
          {busyKey === 'login' ? <RefreshCw size={16} /> : <LogIn size={16} />}
          Login
        </button>
      )}
    </form>
  )
}
