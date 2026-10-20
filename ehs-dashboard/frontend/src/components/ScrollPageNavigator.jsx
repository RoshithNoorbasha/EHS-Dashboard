import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  ArrowDown,
  ArrowUp,
  Compass,
  Check,
  Sliders,
  Shield,
  Layers,
} from 'lucide-react'

export const DASHBOARD_ROUTES = [
  { path: '/', label: 'Executive Dashboard', short: 'Dashboard' },
  { path: '/ranking', label: 'Plant Ranking & Scores', short: 'Plant Ranking' },
  { path: '/lagging', label: 'Lagging Indicators', short: 'Lagging' },
  { path: '/leading', label: 'Leading Indicators', short: 'Leading' },
  { path: '/trainings', label: 'Safety Trainings', short: 'Trainings' },
  { path: '/compliance', label: 'Compliance & Audits', short: 'Compliance' },
  { path: '/data-entry', label: 'Data Entry & Upload', short: 'Data Entry' },
  { path: '/reports', label: 'Reports & Targets', short: 'Reports' },
]

// DELIBERATE PULL THRESHOLD (requires intentional scroll effort, preventing accidental flips)
const PULL_THRESHOLD = 320 // accumulated delta required to trigger page switch
const LOCKOUT_MS = 1600 // cooldown duration after navigation

export default function ScrollPageNavigator() {
  const navigate = useNavigate()
  const location = useLocation()

  const [scrollNavEnabled, setScrollNavEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ehs_scroll_nav_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  const [toastMessage, setToastMessage] = useState(null)
  const [atBottomNotice, setAtBottomNotice] = useState(false)
  const [atTopNotice, setAtTopNotice] = useState(false)
  const [pullProgress, setPullProgress] = useState(0) // 0 to 100
  const [pullDirection, setPullDirection] = useState(null) // 'down' | 'up'

  const isNavigatingRef = useRef(false)
  const pageLoadedTimeRef = useRef(Date.now())
  const accumulatedDeltaYRef = useRef(0)
  const deltaTimerRef = useRef(null)

  const currentIndex = DASHBOARD_ROUTES.findIndex((r) => r.path === location.pathname)
  const isDashboardPage = currentIndex !== -1

  const prevPage = currentIndex > 0 ? DASHBOARD_ROUTES[currentIndex - 1] : null
  const nextPage = currentIndex < DASHBOARD_ROUTES.length - 1 ? DASHBOARD_ROUTES[currentIndex + 1] : null

  // Record page load timestamp to absorb post-navigation inertia
  useEffect(() => {
    pageLoadedTimeRef.current = Date.now()
    accumulatedDeltaYRef.current = 0
    setPullProgress(0)
    setPullDirection(null)
  }, [location.pathname])

  // Save preference
  const toggleScrollNav = () => {
    setScrollNavEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem('ehs_scroll_nav_enabled', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const showToast = (msg, iconType = 'next') => {
    setToastMessage({ msg, iconType })
    setTimeout(() => setToastMessage(null), 1800)
  }

  const goToNextPage = () => {
    if (!nextPage || isNavigatingRef.current) return
    isNavigatingRef.current = true
    accumulatedDeltaYRef.current = 0
    setPullProgress(0)
    setPullDirection(null)
    showToast(`Navigating to: ${nextPage.label}`, 'next')
    navigate(nextPage.path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      isNavigatingRef.current = false
    }, LOCKOUT_MS)
  }

  const goToPrevPage = () => {
    if (!prevPage || isNavigatingRef.current) return
    isNavigatingRef.current = true
    accumulatedDeltaYRef.current = 0
    setPullProgress(0)
    setPullDirection(null)
    showToast(`Navigating back to: ${prevPage.label}`, 'prev')
    navigate(prevPage.path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      isNavigatingRef.current = false
    }, LOCKOUT_MS)
  }

  // Wheel listener with intentional resistance and visual progress
  useEffect(() => {
    if (!isDashboardPage || !scrollNavEnabled) return

    function handleWheel(e) {
      if (isNavigatingRef.current) return

      // Suppress wheel events for 800ms after a page transition (absorb momentum)
      if (Date.now() - pageLoadedTimeRef.current < 800) return

      // Do not trigger if inside input/select/textarea/modal or table with horizontal scroll
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select'].includes(activeTag)) return
      if (document.querySelector('.fixed.inset-0.z-50')) return // Modal open

      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop

      const isAtBottom = windowHeight + scrollTop >= documentHeight - 12
      const isAtTop = scrollTop <= 6

      // Scrolling Downwards at the Bottom
      if (e.deltaY > 0 && isAtBottom && nextPage) {
        accumulatedDeltaYRef.current += e.deltaY
        const progress = Math.min(100, Math.round((accumulatedDeltaYRef.current / PULL_THRESHOLD) * 100))
        setPullProgress(progress)
        setPullDirection('down')

        clearTimeout(deltaTimerRef.current)
        deltaTimerRef.current = setTimeout(() => {
          accumulatedDeltaYRef.current = 0
          setPullProgress(0)
          setPullDirection(null)
        }, 700)

        // Threshold reached deliberately
        if (accumulatedDeltaYRef.current >= PULL_THRESHOLD) {
          accumulatedDeltaYRef.current = 0
          setPullProgress(0)
          setPullDirection(null)
          goToNextPage()
        }
      }
      // Scrolling Upwards at the Top
      else if (e.deltaY < 0 && isAtTop && prevPage) {
        accumulatedDeltaYRef.current += Math.abs(e.deltaY)
        const progress = Math.min(100, Math.round((accumulatedDeltaYRef.current / PULL_THRESHOLD) * 100))
        setPullProgress(progress)
        setPullDirection('up')

        clearTimeout(deltaTimerRef.current)
        deltaTimerRef.current = setTimeout(() => {
          accumulatedDeltaYRef.current = 0
          setPullProgress(0)
          setPullDirection(null)
        }, 700)

        // Threshold reached deliberately
        if (accumulatedDeltaYRef.current >= PULL_THRESHOLD) {
          accumulatedDeltaYRef.current = 0
          setPullProgress(0)
          setPullDirection(null)
          goToPrevPage()
        }
      } else {
        if (accumulatedDeltaYRef.current > 0) {
          accumulatedDeltaYRef.current = 0
          setPullProgress(0)
          setPullDirection(null)
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      clearTimeout(deltaTimerRef.current)
    }
  }, [isDashboardPage, scrollNavEnabled, currentIndex, nextPage, prevPage])

  // Scroll listener to update boundary pill indicators
  useEffect(() => {
    function handleScroll() {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop

      setAtBottomNotice(windowHeight + scrollTop >= documentHeight - 15 && !!nextPage)
      setAtTopNotice(scrollTop <= 8 && !!prevPage)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [nextPage, prevPage])

  if (!isDashboardPage) return null

  return (
    <>
      {/* TOAST TRANSITION BANNER */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="bg-slate-900/95 text-white backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-2xl border border-teal-500/40 text-xs font-bold flex items-center gap-2">
            {toastMessage.iconType === 'next' ? (
              <ArrowDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowUp className="w-4 h-4 text-teal-400" />
            )}
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* DELIBERATE PULL-TO-SWITCH PROGRESS DRAWER */}
      {scrollNavEnabled && pullProgress > 0 && (
        <div
          className={`fixed ${
            pullDirection === 'down' ? 'bottom-20' : 'top-20'
          } left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-150`}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex flex-col items-center gap-1.5 min-w-[280px]">
            <div className="flex items-center gap-2 text-xs font-bold">
              {pullDirection === 'down' ? (
                <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />
              ) : (
                <ArrowUp className="w-4 h-4 text-teal-400 animate-bounce" />
              )}
              <span>
                {pullDirection === 'down'
                  ? `Pulling to Next: ${nextPage?.short}`
                  : `Pulling to Prev: ${prevPage?.short}`}
              </span>
              <span className="font-mono text-emerald-300 font-extrabold">{pullProgress}%</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-100 rounded-full"
                style={{ width: `${pullProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-300 font-medium">
              Keep scrolling to switch page, or release to stay here
            </span>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM CORNER NAVIGATION CONTROLS */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Subtle Bottom Boundary Button */}
        {atBottomNotice && nextPage && pullProgress === 0 && (
          <button
            onClick={goToNextPage}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>
              Next: <strong>{nextPage.short}</strong> {scrollNavEnabled ? '(Scroll or Click)' : '(Click)'}
            </span>
          </button>
        )}

        {/* Subtle Top Boundary Button */}
        {atTopNotice && prevPage && pullProgress === 0 && (
          <button
            onClick={goToPrevPage}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>
              Prev: <strong>{prevPage.short}</strong> {scrollNavEnabled ? '(Scroll or Click)' : '(Click)'}
            </span>
          </button>
        )}

        {/* COMPACT FLOATING NAVIGATION BAR */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl px-3 py-1.5 flex items-center gap-2 text-xs">
          {/* Previous Button */}
          <button
            onClick={goToPrevPage}
            disabled={!prevPage}
            title={prevPage ? `Previous Page: ${prevPage.label}` : 'First Page'}
            className={`p-1.5 rounded-xl flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              prevPage
                ? 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px] font-medium">Prev</span>
          </button>

          {/* Current Page Indicator */}
          <div className="px-2 py-0.5 bg-slate-100 rounded-lg text-slate-800 font-bold text-[11px] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {currentIndex + 1} / {DASHBOARD_ROUTES.length}:{' '}
              <span className="text-emerald-800 font-extrabold">
                {DASHBOARD_ROUTES[currentIndex].short}
              </span>
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextPage}
            disabled={!nextPage}
            title={nextPage ? `Next Page: ${nextPage.label}` : 'Last Page'}
            className={`p-1.5 rounded-xl flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              nextPage
                ? 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline text-[11px] font-medium">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5"></div>

          {/* Scroll Nav Enable/Disable Switch with user-friendly label */}
          <button
            onClick={toggleScrollNav}
            title={
              scrollNavEnabled
                ? 'Scroll-to-change-pages is ON (Click to switch to Buttons Only mode)'
                : 'Scroll-to-change-pages is OFF (Buttons Only mode is active. Click to enable scroll switching)'
            }
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              scrollNavEnabled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <MousePointerClick className="w-3 h-3 text-emerald-600" />
            <span>
              {scrollNavEnabled ? 'Scroll Switch: ON' : 'Buttons Only'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

