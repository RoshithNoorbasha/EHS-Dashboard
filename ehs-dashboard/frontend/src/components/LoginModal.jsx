import { useState } from 'react'
import { X, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(username.trim(), password)
    setLoading(false)
    if (res.success) {
      onClose()
    } else {
      setError(res.error || 'Invalid username or password.')
    }
  }

  const demoAccounts = [
    { label: 'Super Admin', user: 'superadmin', pass: 'SuperAdmin@Greenko2026' },
    { label: 'Cluster Admin', user: 'admin', pass: 'Admin@Greenko2026' },
    { label: 'Manager', user: 'manager', pass: 'Manager@Greenko2026' },
    { label: 'Pinnapuram', user: 'site_pinnapuram', pass: 'Pinna@Greenko2026' },
    { label: 'Ghani', user: 'site_ghani', pass: 'Ghani@Greenko2026' },
  ]

  const handleQuickFill = (uName, pass) => {
    setUsername(uName)
    setPassword(pass)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sign In</h2>
            <p className="text-xs text-slate-500">Access your EHS account</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Quick Demo Accounts</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {demoAccounts.map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => handleQuickFill(acc.user, acc.pass)}
                className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/70 hover:border-emerald-200 text-[10px] font-medium transition-colors cursor-pointer"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
