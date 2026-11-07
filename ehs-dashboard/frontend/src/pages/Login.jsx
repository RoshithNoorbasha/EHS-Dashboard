import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'

  // Login form state
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Register form state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regRole, setRegRole] = useState('SITE_INCHARGE')
  const [regPlantId, setRegPlantId] = useState('1')

  // Feedback states
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Quick demo accounts
  const demoAccounts = [
    { label: 'Super Admin', user: 'superadmin', pass: 'SuperAdmin@Greenko2026' },
    { label: 'Cluster Admin', user: 'admin', pass: 'Admin@Greenko2026' },
    { label: 'Manager', user: 'manager', pass: 'Manager@Greenko2026' },
    { label: 'Pinnapuram', user: 'site_pinnapuram', pass: 'Pinna@Greenko2026' },
    { label: 'Ghani', user: 'site_ghani', pass: 'Ghani@Greenko2026' },
  ]

  const handleQuickFill = (user, pass) => {
    setLoginUsername(user)
    setLoginPassword(pass)
    setError('')
    setActiveTab('login')
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    const res = await login(loginUsername.trim(), loginPassword)
    setLoading(false)

    if (res.success) {
      navigate('/')
    } else {
      setError(res.error || 'Invalid username or password.')
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    const payload = {
      username: regUsername.trim(),
      full_name: regFullName.trim(),
      email: regEmail.trim() || null,
      password: regPassword,
      role: regRole,
      assigned_plant_ids: regRole === 'SITE_INCHARGE' ? regPlantId : '',
    }

    const res = await register(payload)
    setLoading(false)

    if (res.success) {
      setSuccessMsg('Account created successfully! Redirecting...')
      setTimeout(() => navigate('/'), 1000)
    } else {
      setError(res.error || 'Registration failed. Please try a different username.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Subtle modern ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Form Container */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-7 sm:p-9 relative z-10 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center p-2 mb-3 shadow-xs">
            <img src="/greenko-globe.png" alt="Greenko" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Greenko EHS Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'login' ? 'Sign in to access your dashboard' : 'Create an account to get started'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login')
              setError('')
              setSuccessMsg('')
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register')
              setError('')
              setSuccessMsg('')
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="flex-1 font-medium">{error}</span>
            <button
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-600 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="flex-1 font-medium">{successMsg}</span>
          </div>
        )}

        {/* LOGIN TAB */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* REGISTER TAB */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Ramesh Kumar"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Work Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="email@greenko.net"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-8 pr-9 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                >
                  <option value="SITE_INCHARGE">Site Incharge</option>
                  <option value="MANAGER">Executive Manager</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Assigned Plant
                </label>
                <select
                  value={regPlantId}
                  onChange={(e) => setRegPlantId(e.target.value)}
                  disabled={regRole === 'MANAGER'}
                  className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:opacity-40"
                >
                  <option value="1">Pinnapuram</option>
                  <option value="2">Ghani</option>
                  <option value="3">Chenekapalli</option>
                  <option value="4">Nagalooty</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Clean Quick Demo Access (1-Click Fill) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Quick Demo Accounts</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {demoAccounts.map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => handleQuickFill(acc.user, acc.pass)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/70 hover:border-emerald-200 text-[11px] font-medium transition-colors cursor-pointer"
                title={`Login as ${acc.label}`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Greenko Pinnapuram Cluster &bull; EHS Portal
          </p>
        </div>
      </div>
    </div>
  )
}
