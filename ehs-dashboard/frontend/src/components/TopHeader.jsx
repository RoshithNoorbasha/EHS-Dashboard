import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  User,
  LogOut,
  Users,
  MapPin,
  ChevronDown,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Info,
  Server,
  Cloud,
  Globe,
} from 'lucide-react'
import api from '../api'
import { useAuth, DEFAULT_USERS } from '../context/AuthContext'
import { useFilter } from '../context/FilterContext'
import LoginModal from './LoginModal'
import UserManagementModal from './UserManagementModal'
import PlotManagementModal from './PlotManagementModal'
import SafetyIndexModal from './SafetyIndexModal'
import SuperAdminSettingsModal from './SuperAdminSettingsModal'
import RemoteTunnelModal from './RemoteTunnelModal'

const ROLE_BADGE_STYLES = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
  ADMIN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  MANAGER: 'bg-slate-100 text-slate-700 border-slate-300',
  SITE_INCHARGE: 'bg-amber-100 text-amber-800 border-amber-300',
}

const ROLE_AVATAR_BG = {
  SUPER_ADMIN: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white',
  ADMIN: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white',
  MANAGER: 'bg-gradient-to-tr from-slate-700 to-slate-800 text-white',
  SITE_INCHARGE: 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white',
}

export default function TopHeader() {
  const navigate = useNavigate()
  const { currentUser, role, isSuperAdmin, isAdmin, isReadOnly, isSiteIncharge, logout } = useAuth()
  const { isPlantSelected, isPlotSelected, currentPlantName, currentPlotName, selectedMonth, selectedYear } = useFilter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [plotModalOpen, setPlotModalOpen] = useState(false)
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false)
  const [tunnelModalOpen, setTunnelModalOpen] = useState(false)
  const [tunnelSummary, setTunnelSummary] = useState(null)

  const dropdownRef = useRef(null)

  // Periodically check tunnel status for quick indicator badge
  useEffect(() => {
    if (!isAdmin) return
    const checkTunnel = async () => {
      try {
        const res = await api.get('/system/tunnel/status')
        setTunnelSummary(res.data)
      } catch {}
    }
    checkTunnel()
    const interval = setInterval(checkTunnel, 12000)
    return () => clearInterval(interval)
  }, [isAdmin, tunnelModalOpen])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = (currentUser?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const badgeClass = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.MANAGER
  const avatarClass = ROLE_AVATAR_BG[role] || ROLE_AVATAR_BG.MANAGER

  return (
    <>
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <UserManagementModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} />
      <PlotManagementModal isOpen={plotModalOpen} onClose={() => setPlotModalOpen(false)} />
      <SafetyIndexModal isOpen={safetyModalOpen} onClose={() => setSafetyModalOpen(false)} />
      <SuperAdminSettingsModal isOpen={superAdminModalOpen} onClose={() => setSuperAdminModalOpen(false)} />
      <RemoteTunnelModal isOpen={tunnelModalOpen} onClose={() => setTunnelModalOpen(false)} />

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-8 py-3 flex items-center justify-between shadow-xs">
        {/* LEFT: BREADCRUMB / ACTIVE SCOPE BRAND */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Greenko Pinnapuram
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">EHS Portal</span>
          </div>

          {/* DYNAMIC SCOPE FILTER BADGE */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50/90 text-emerald-950 border border-emerald-200 text-xs font-semibold shadow-2xs">
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Scope:</span>
            <span className="font-extrabold text-emerald-950">
              {!isPlantSelected ? 'All Plants (Cluster)' : !isPlotSelected ? currentPlantName : `${currentPlantName} · ${currentPlotName}`}
            </span>
            {selectedMonth !== 'All' && (
              <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-md font-bold">
                {selectedMonth} {selectedYear}
              </span>
            )}
          </div>

          {/* (i) INFO BUTTON FOR SAFETY INDEX */}
          <button
            onClick={() => setSafetyModalOpen(true)}
            title="How Safety Score Index is Evaluated"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Safety Index Guide</span>
          </button>
        </div>

        {/* RIGHT: USER PROFILE BUTTON & DROPDOWN */}
        <div className="flex items-center gap-2.5">
          {/* EHS ADMIN REMOTE TUNNEL QUICK BUTTON */}
          {isAdmin && (
            <button
              onClick={() => setTunnelModalOpen(true)}
              title="Cloudflare Remote Access Portal (Auto-expiring 20-30 min links)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer border ${
                tunnelSummary?.active
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400/50 shadow-emerald-500/20'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${tunnelSummary?.active ? 'animate-pulse text-emerald-200' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">
                {tunnelSummary?.active
                  ? `Remote Link (${Math.ceil((tunnelSummary?.session?.seconds_remaining || 0) / 60)}m)`
                  : 'Share Remote Link'}
              </span>
            </button>
          )}

          {/* SUPER ADMIN QUICK ACTION BUTTON */}
          {isSuperAdmin && (
            <button
              onClick={() => setSuperAdminModalOpen(true)}
              title="Super Admin Server & Backups Portal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer border border-purple-400/30"
            >
              <Server className="w-3.5 h-3.5 text-purple-200" />
              <span className="hidden sm:inline">Backups &amp; Server</span>
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-all text-left shadow-xs"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.full_name || 'User'}
                </div>
                <div className="text-[10px] font-semibold text-slate-400">
                  {role.replace('_', ' ')} {isReadOnly ? '(Read-Only)' : ''}
                </div>
              </div>

              <div className={`w-8 h-8 rounded-xl ${avatarClass} font-bold text-xs flex items-center justify-center shadow-xs`}>
                {initials}
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3 space-y-3 z-50 animate-fadeIn">
                {/* User Profile Summary */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${avatarClass} font-bold text-xs flex items-center justify-center shadow-xs`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {currentUser?.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        @{currentUser?.username}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                      {role.replace('_', ' ')}
                    </span>
                    {isReadOnly && (
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Read-Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1">
                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        setSuperAdminModalOpen(true)
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-2 border border-purple-200"
                    >
                      <Server className="w-4 h-4 text-purple-700" />
                      <span>Backups, Tunnel &amp; Server</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        setTunnelModalOpen(true)
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>Share Remote Link (Cloudflare)</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        setUserModalOpen(true)
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>User Management &amp; RBAC</span>
                    </button>
                  )}

                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    setPlotModalOpen(true)
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>Configure Plant Plots</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/login')
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Go to Login / Auth Portal</span>
                </button>
              </div>

              {/* Sign Out Button */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    logout()
                    navigate('/login')
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  )
}
