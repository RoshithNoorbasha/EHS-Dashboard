import { useState } from 'react'
import { X, Lock, User, Shield, Check, AlertCircle, ArrowRight, KeyRound } from 'lucide-react'
import { useAuth, DEFAULT_USERS } from '../context/AuthContext'

export default function LoginModal({ isOpen, onClose }) {
  const { login, currentUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(username, password)
    setLoading(false)
    if (res.success) {
      onClose()
    } else {
      setError(res.error || 'Login failed')
    }
  }

  const handleQuickFill = (uName, pass) => {
    setUsername(uName)
    setPassword(pass)
    setError('')
  }

  const sampleAccounts = [
    { username: 'superadmin', pass: 'SuperAdmin@Greenko2026', role: 'SUPER ADMIN', label: 'Full System Control & RBAC' },
    { username: 'admin', pass: 'Admin@Greenko2026', role: 'ADMIN', label: 'All Plants & Plots (R&W)' },
    { username: 'manager', pass: 'Manager@Greenko2026', role: 'MANAGER', label: 'Read-Only (All Plants & Plots)' },
    { username: 'site_pinnapuram', pass: 'Pinna@Greenko2026', role: 'SITE INCHARGE', label: 'Pinnapuram Assigned Only' },
    { username: 'site_ghani', pass: 'Ghani@Greenko2026', role: 'SITE INCHARGE', label: 'Ghani Assigned Only' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Account Login</h2>
              <p className="text-xs text-slate-500">Authenticate with role-based permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* QUICK CREDENTIALS SELECTOR */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Test Accounts (Click to Fill):
          </div>
          <div className="space-y-1.5">
            {sampleAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickFill(acc.username, acc.pass)}
                className="w-full p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors flex items-center justify-between group text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{acc.username}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                      {acc.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{acc.label}</div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Use &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
