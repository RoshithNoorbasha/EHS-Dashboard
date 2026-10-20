import { useState, useRef, useEffect } from 'react'
import { Info, X, CheckCircle2, TrendingDown, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react'

export default function ChartInfoButton({
  title,
  whatItShows,
  howToRead,
  target,
  whyItMatters,
  align = 'right', // 'right' | 'left'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* (i) BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Click for simple explanation: ${title}`}
        className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer text-xs font-semibold shadow-2xs"
        aria-label={`About ${title}`}
      >
        <span className="w-4 h-4 rounded-full bg-emerald-600/10 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center transition-colors text-[10px] font-black font-serif">
          i
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-600 group-hover:text-emerald-800">
          What is this?
        </span>
      </button>

      {/* POPOVER CARD */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-fadeIn text-left space-y-3`}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-serif font-black text-xs">
                i
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                  {title}
                </h4>
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Simple English Guide
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: What this shows */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              What does this chart indicate?
            </span>
            <p className="text-slate-700 leading-relaxed font-medium">
              {whatItShows}
            </p>
          </div>

          {/* Section 2: How to read */}
          {howToRead && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                How to read this easily:
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {howToRead}
              </p>
            </div>
          )}

          {/* Section 3: Target or Goal */}
          {target && (
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <span className="font-bold text-[11px]">Goal / Target:</span>
              <span className="font-extrabold text-[11px] text-emerald-800 font-mono">
                {target}
              </span>
            </div>
          )}

          {/* Section 4: Why it matters */}
          {whyItMatters && (
            <div className="pt-1 text-[11px] text-slate-500 leading-snug">
              <strong className="text-slate-700">Why it matters:</strong> {whyItMatters}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
