import { useEffect } from 'react'
import { Building2, MapPin, Calendar, Layers, Filter, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFilter } from '../context/FilterContext'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = [2025, 2026, 2027]

export default function FilterBar({
  selectedPlant: propPlant,
  setSelectedPlant: propSetPlant,
  selectedPlot: propPlot,
  setSelectedPlot: propSetPlot,
  selectedMonth: propMonth,
  setSelectedMonth: propSetMonth,
  selectedYear: propYear,
  setSelectedYear: propSetYear,
  showPlot = true,
  className = '',
}) {
  const { isSiteIncharge, assignedPlantIds } = useAuth()
  const filterContext = useFilter()

  const selectedPlant = propPlant !== undefined ? propPlant : filterContext.selectedPlant
  const setSelectedPlant = propSetPlant || filterContext.setSelectedPlant

  const selectedPlot = propPlot !== undefined ? propPlot : filterContext.selectedPlot
  const setSelectedPlot = propSetPlot || filterContext.setSelectedPlot

  const selectedMonth = propMonth !== undefined ? propMonth : filterContext.selectedMonth
  const setSelectedMonth = propSetMonth || filterContext.setSelectedMonth

  const selectedYear = propYear !== undefined ? propYear : filterContext.selectedYear
  const setSelectedYear = propSetYear || filterContext.setSelectedYear

  const plants = filterContext.plants || []
  const plots = filterContext.plots || []

  const handlePlantChange = (val) => {
    setSelectedPlant(val)
    if (setSelectedPlot) {
      setSelectedPlot('All')
    }
  }

  const isPlantSelected = selectedPlant && selectedPlant !== 'All'
  const isPlotSelected = isPlantSelected && selectedPlot && selectedPlot !== 'All'
  const currentPlantName = plants.find((p) => String(p.id) === String(selectedPlant))?.name || 'Plant'
  const currentPlotName = plots.find((pl) => String(pl.id) === String(selectedPlot))?.name || 'Plot'

  const hasCustomFilter = isPlantSelected || selectedMonth !== 'All' || selectedYear !== 2026

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {/* SCOPE STATUS / BADGE */}
      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider pl-1">
        <Filter className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>Active Scope:</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          {!isPlantSelected
            ? 'Cluster (All 4 Plants)'
            : !isPlotSelected
            ? `${currentPlantName} (All Plots)`
            : `${currentPlantName} · ${currentPlotName}`}
        </span>
        {hasCustomFilter && (
          <button
            onClick={() => {
              if (filterContext.resetFilters) {
                filterContext.resetFilters()
              } else {
                setSelectedPlant('All')
                if (setSelectedPlot) setSelectedPlot('All')
                setSelectedMonth('All')
                setSelectedYear(2026)
              }
            }}
            title="Reset Scope Filter to Cluster Overview"
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* FILTER DROPDOWNS */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
        {/* 1. Plant Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2.5 py-1.5 transition-colors">
          <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-medium">Plant:</span>
          <select
            value={selectedPlant}
            onChange={(e) => handlePlantChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
          >
            {!isSiteIncharge && <option value="All">All Plants (Cluster Overview)</option>}
            {plants.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Plot Selector (Shown ONLY when a specific plant is selected and showPlot is true) */}
        {showPlot && isPlantSelected && setSelectedPlot && (
          <div className="flex items-center gap-1.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-300/80 rounded-xl px-2.5 py-1.5 transition-colors animate-fadeIn">
            <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <span className="text-xs text-emerald-900 font-semibold">Plot:</span>
            <select
              value={selectedPlot || 'All'}
              onChange={(e) => setSelectedPlot(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-950 outline-none cursor-pointer pr-1 max-w-[200px] truncate"
            >
              <option value="All">All Plots in {currentPlantName}</option>
              {plots.map((pl) => (
                <option key={pl.id} value={String(pl.id)}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Month Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2.5 py-1.5 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-medium">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Months (YTD)' : m}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Year Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-2.5 py-1.5 transition-colors">
          <Layers className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-medium">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
