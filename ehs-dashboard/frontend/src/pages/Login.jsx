import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  User,
  Shield,
  Check,
  AlertCircle,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Building,
  Mail,
  UserPlus,
  Sparkles,
  Zap,
  Globe,
  Award,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Tabs: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login')

  // Login states
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Register states
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
  const [showCredsHelper, setShowCredsHelper] = useState(false)

  // Standard RBAC credentials reference
  const officialCredentials = [
    {
      role: 'Super Administrator',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      user: 'superadmin',
      pass: 'SuperAdmin@Greenko2026',
      desc: 'Full System Control · Backups & Restore · Cloudflare Tunnel · RBAC',
    },
    {
      role: 'Cluster EHS Admin',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      user: 'admin',
      pass: 'Admin@Greenko2026',
      desc: 'Cluster-Wide Read & Write · Metrics Entry · Incident Management',
    },
    {
      role: 'Executive Manager',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      user: 'manager',
      pass: 'Manager@Greenko2026',
      desc: 'Executive Read-Only Visibility across all plants, rankings & reports',
    },
    {
      role: 'Pinnapuram Site Incharge',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      user: 'site_pinnapuram',
      pass: 'Pinna@Greenko2026',
      desc: 'Restricted Read & Write strictly to Pinnapuram plant only',
    },
    {
      role: 'Ghani Site Incharge',
      badge: 'bg-teal-100 text-teal-800 border-teal-300',
      user: 'site_ghani',
      pass: 'Ghani@Greenko2026',
      desc: 'Restricted Read & Write strictly to Ghani plant only',
    },
  ]

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
      setError(res.error || 'Invalid credentials. Please verify username and password.')
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
      setSuccessMsg('Account registered successfully! Redirecting to command portal...')
      setTimeout(() => navigate('/'), 1200)
    } else {
      setError(res.error || 'Registration failed. Please try a different username.')
    }
  }

  const handleQuickFill = (u, p) => {
    setLoginUsername(u)
    setLoginPassword(p)
    setError('')
    setActiveTab('login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* GLOW DECORATIONS */}
      <div className="absolute -top-40 -left-40 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP BRAND HEADER */}
      <div className="w-full max-w-5xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-xl flex items-center justify-center flex-shrink-0">
            <img src="/greenko-globe.png" alt="Greenko Globe Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
              <span>Greenko Pinnapuram Cluster</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                EHS 2.0
              </span>
            </h1>
            <p className="text-xs text-emerald-200/70 font-medium">
              Digital Environment, Health &amp; Safety Governance Portal
            </p>
          </div>
        </div>

        {/* SECURITY HIGHLIGHT PILLS */}
        <div className="hidden md:flex items-center gap-3 text-xs text-teal-100/80">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict RBAC Security</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
            <Globe className="w-4 h-4 text-teal-400" />
            <span>Encrypted Cloudflare Access</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER CARD */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 grid grid-cols-1 lg:grid-cols-12 transition-all">
        {/* LEFT / HERO BRAND PROMO (Hidden on small mobile, visible on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-teal-900/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero Harm Mission 2026</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white">
                Cluster Safety Excellence Portal
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/70 mt-2 leading-relaxed">
                Integrated health, safety, and compliance tracking across Pinnapuram, Ghani, Chenekapalli, and Nagalooty plants.
              </p>
            </div>

            {/* KEY METRICS PREVIEW */}
            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                <span className="text-xs text-teal-200/80 font-medium">Integrated Plants</span>
                <span className="text-sm font-extrabold text-white">4 Utility Sites (12 Plots)</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                <span className="text-xs text-teal-200/80 font-medium">Compliance Standards</span>
                <span className="text-sm font-extrabold text-emerald-300">ISO 45001 &amp; ISO 14001</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                <span className="text-xs text-teal-200/80 font-medium">Lagging / Leading Targets</span>
                <span className="text-sm font-extrabold text-teal-300">Zero Fatality · Zero LTI</span>
              </div>
            </div>
          </div>

          {/* FOOTER NOTICE */}
          <div className="pt-6 mt-6 border-t border-white/10 text-[11px] text-teal-300/60 flex items-center justify-between relative z-10">
            <span>Greenko Power &amp; Renewable Energy</span>
            <span>Auth v2.1</span>
          </div>
        </div>

        {/* RIGHT: AUTH FORMS & CONTROLS */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div>
            {/* TAB SELECTOR: SIGN IN / REGISTER */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login')
                  setError('')
                  setSuccessMsg('')
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'login'
                    ? 'bg-white text-emerald-950 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Portal Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register')
                  setError('')
                  setSuccessMsg('')
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'register'
                    ? 'bg-white text-emerald-950 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>New Registration</span>
              </button>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-700 font-bold">✕</button>
              </div>
            )}

            {/* SUCCESS ALERT */}
            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Username / ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. superadmin, admin, manager"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-2xl pl-10 pr-3 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 font-semibold text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCredsHelper(!showCredsHelper)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showCredsHelper ? 'Hide Credentials' : 'View Passwords'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-2xl pl-10 pr-11 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 font-semibold text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Remember session on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign In to EHS Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER FORM */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      placeholder="ramesh@greenko.net"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ramesh_k"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="Choose password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Requested Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="SITE_INCHARGE">Site Incharge (Plant Specific R&amp;W)</option>
                      <option value="MANAGER">Manager (Read-Only Cluster Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Assigned Plant
                    </label>
                    <select
                      value={regPlantId}
                      onChange={(e) => setRegPlantId(e.target.value)}
                      disabled={regRole === 'MANAGER'}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none disabled:opacity-50"
                    >
                      <option value="1">Pinnapuram Plant</option>
                      <option value="2">Ghani Plant</option>
                      <option value="3">Chenekapalli Plant</option>
                      <option value="4">Nagalooty Plant</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* OFFICIAL PASSWORDS REFERENCE HELPER (COLLAPSIBLE / TOGGLEABLE) */}
            {showCredsHelper && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Official Default RBAC Credentials</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Click any role to auto-fill</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {officialCredentials.map((c) => (
                    <button
                      key={c.user}
                      type="button"
                      onClick={() => handleQuickFill(c.user, c.pass)}
                      className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-left transition-all space-y-1 shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${c.badge}`}>
                          {c.role}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="font-mono text-[11px] font-bold text-slate-800">
                        {c.user} &bull; <span className="text-slate-500 font-normal">{c.pass}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM COPYRIGHT & COMPLIANCE */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium text-center sm:text-left">
            <div>Greenko Pinnapuram Cluster &bull; Zero Harm Portal</div>
            <div>ISO 45001 / OHSAS Compliant</div>
          </div>
        </div>
      </div>
    </div>
  )
}
