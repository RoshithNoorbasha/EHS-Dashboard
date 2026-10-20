import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Trophy,
  TrendingDown,
  TrendingUp,
  GraduationCap,
  CheckCircle2,
  FolderUp,
  BarChart3,
  Menu,
  X,
  Server,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SuperAdminSettingsModal from './SuperAdminSettingsModal'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ranking', label: 'Plant Ranking', icon: Trophy },
  { to: '/lagging', label: 'Lagging Indicators', icon: TrendingDown },
  { to: '/leading', label: 'Leading Indicators', icon: TrendingUp },
  { to: '/trainings', label: 'Safety Trainings', icon: GraduationCap },
  { to: '/compliance', label: 'Compliance', icon: CheckCircle2 },
  { to: '/data-entry', label: 'Data Entry & Upload', icon: FolderUp },
  { to: '/reports', label: 'Reports & Targets', icon: BarChart3 },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [superAdminOpen, setSuperAdminOpen] = useState(false)
  const { isSuperAdmin } = useAuth()

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-emerald-950 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shadow-xs">
            <img src="/greenko-globe.png" alt="Greenko Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm">Greenko Kurnool Cluster</div>
            <div className="text-xs text-emerald-200/70">EHS Command Portal</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-emerald-900 border border-emerald-700 text-white"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-emerald-950 text-white border-b border-emerald-800 p-2 space-y-1">
          {links.map((l) => {
            const Icon = l.icon
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-emerald-600 text-white shadow' : 'text-emerald-100/80 hover:bg-emerald-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{l.label}</span>
              </NavLink>
            )
          })}
        </div>
      )}

      {/* Desktop Clean Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 text-white min-h-screen flex-shrink-0 hidden md:flex flex-col border-r border-teal-900/40 shadow-xl">
        {/* BRAND LOGO HEADER */}
        <div className="p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1 shadow-md border border-white/20 flex items-center justify-center flex-shrink-0">
              <img src="/greenko-globe.png" alt="Greenko Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-base font-black leading-tight tracking-tight text-white">Greenko Kurnool</div>
              <div className="text-[11px] font-bold text-emerald-300/90 tracking-wide uppercase mt-0.5">Cluster EHS Command</div>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 py-6 px-3 space-y-1.5">
          {links.map((l) => {
            const Icon = l.icon
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/30 translate-x-1'
                      : 'text-teal-100/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{l.label}</span>
              </NavLink>
            )
          })}

          {isSuperAdmin && (
            <div className="pt-3 mt-3 border-t border-white/10">
              <button
                onClick={() => setSuperAdminOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-purple-200 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/30 transition-all shadow-md cursor-pointer text-left"
              >
                <Server className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">Super Admin Portal</div>
                  <div className="text-[10px] text-purple-300/70 font-normal">Backups &amp; Server Tunnel</div>
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* FOOTER */}
        <div className="p-4 text-xs text-teal-200/50 border-t border-white/10 bg-black/20 space-y-1">
          <div className="font-bold text-teal-200/80">EHS Excellence Portal</div>
          <div className="text-[11px]">Zero Harm · Zero Fatality · Zero LTI</div>
          <div className="text-[10px] text-teal-400/60 pt-1.5 border-t border-teal-800/40 font-medium">
            Developed by <span className="font-bold text-teal-300">Roshith</span>
          </div>
        </div>
      </aside>

      <SuperAdminSettingsModal isOpen={superAdminOpen} onClose={() => setSuperAdminOpen(false)} />
    </>
  )
}
