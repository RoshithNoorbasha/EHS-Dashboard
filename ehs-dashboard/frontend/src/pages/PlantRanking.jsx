import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  Cell,
} from 'recharts'
import {
  Trophy,
  Crown,
  Medal,
  Award,
  HelpCircle,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Layers,
  MapPin,
} from 'lucide-react'
import api from '../api'
import FilterBar from '../components/FilterBar'
import SafetyIndexModal from '../components/SafetyIndexModal'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const GRADE_STYLES = {
  Platinum: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', badge: 'bg-purple-600', fill: '#9333ea' },
  Gold: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', badge: 'bg-amber-500', fill: '#f59e0b' },
  Silver: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', badge: 'bg-slate-500', fill: '#64748b' },
  Bronze: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', badge: 'bg-red-500', fill: '#ef4444' },
}

const SCORE_WEIGHTS = [
  { name: 'Near Miss Reporting', weight: '10%', target: '1 report/mo', icon: '👁️' },
  { name: 'Training Hours', weight: '10%', target: '15 hrs/mo', icon: '🎓' },
  { name: 'Training Sessions', weight: '10%', target: '2 sessions/mo', icon: '📚' },
  { name: 'Safety Audits Executed', weight: '15%', target: '2 / year (~0.17/mo)', icon: '🔍' },
  { name: 'LOTO Compliance', weight: '15%', target: '100% adherence', icon: '🔒' },
  { name: 'Leadership Walkdowns (WPI)', weight: '15%', target: '2 walkdowns/mo', icon: '🥾' },
  { name: 'Statutory Compliance', weight: '10%', target: '100% compliance', icon: '⚖️' },
  { name: 'Safety Committee (OHS)', weight: '10%', target: '1 meeting/mo', icon: '👥' },
  { name: 'Mock Drills', weight: '5%', target: '1 drill/mo', icon: '🚨' },
]

export default function PlantRanking() {
  const {
    selectedPlant,
    setSelectedPlant,
    selectedPlot,
    setSelectedPlot,
    selectedMonth: month,
    setSelectedMonth: setMonth,
    selectedYear: year,
    setSelectedYear: setYear,
    isPlantSelected,
    isPlotSelected,
    currentPlantName,
    currentPlotName,
  } = useFilter()

  const [ranking, setRanking] = useState([])
  const [metrics, setMetrics] = useState([])
  const [plants, setPlants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFormula, setShowFormula] = useState(false)
  const [expandedPlant, setExpandedPlant] = useState(null)
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)

  useEffect(() => {
    api.get('/plants').then((r) => setPlants(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { month, year }
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)

    api.get('/metrics/ranking', { params }).then((r) => setRanking(r.data))
    api.get('/metrics', { params }).then((r) => setMetrics(r.data))
  }, [selectedPlant, selectedPlot, month, year])

  const filteredRanking = ranking.filter((r) =>
    (r.plot || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.plant || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgScore = ranking.length > 0
    ? (ranking.reduce((acc, curr) => acc + curr.score, 0) / ranking.length).toFixed(1)
    : 0

  const topPlant = ranking.length > 0 ? ranking[0] : null

  // Radar data preparation
  const radarMetrics = [
    { metric: 'Near Miss', key: 'near_miss', max: 20 },
    { metric: 'Training', key: 'training_hours', max: 300 },
    { metric: 'Audits', key: 'audits', max: 4 },
    { metric: 'LOTO', key: 'loto_compliance', max: 100 },
    { metric: 'Walkdowns', key: 'walkdowns', max: 12 },
    { metric: 'Statutory', key: 'statutory_compliance', max: 100 },
  ]

  const radarData = radarMetrics.map((rm) => {
    const item = { metric: rm.metric }
    metrics.forEach((m) => {
      let val = m[rm.key] || 0
      if (rm.max !== 100) {
        val = Math.min(100, (val / rm.max) * 100)
      }
      const dataKey = isPlantSelected && m.plot_id ? `plot_${m.plot_id}` : `plant_${m.plant_id}`
      item[dataKey] = Math.round(val)
    })
    return item
  })

  const getRankMedal = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700 fill-amber-600" />
    return <span className="font-bold text-gray-500 text-sm">#{rank}</span>
  }

  const getBarColor = (score) => {
    if (score >= 90) return '#9333ea'
    if (score >= 75) return '#f59e0b'
    if (score >= 50) return '#64748b'
    return '#ef4444'
  }

  const chartColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16']

  return (
    <div className="space-y-6 pb-8">
      <SafetyIndexModal isOpen={safetyModalOpen} onClose={() => setSafetyModalOpen(false)} />

      {/* FILTER BAR */}
      <FilterBar
        selectedPlant={selectedPlant}
        setSelectedPlant={setSelectedPlant}
        selectedPlot={selectedPlot}
        setSelectedPlot={setSelectedPlot}
        selectedMonth={month}
        setSelectedMonth={setMonth}
        selectedYear={year}
        setSelectedYear={setYear}
      />

      {/* EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-emerald-900 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-emerald-800/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {isPlantSelected ? `${currentPlantName} Plot Benchmarking` : 'Cluster Safety Benchmarking'}
                </span>
                <span className="text-xs text-teal-200/70 font-medium">Updated Real-Time</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                {isPlantSelected ? `${currentPlantName} — Plot Performance & Ranking Index` : 'Plant Ranking & Performance Index'}
              </h1>
              <p className="text-xs md:text-sm text-teal-100/70 mt-0.5">
                {isPlantSelected
                  ? `Weighted EHS score performance evaluation across plots within ${currentPlantName}`
                  : 'Weighted EHS score performance evaluation across cluster operating units'}
              </p>
            </div>

            {/* PERIOD FILTERS */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 self-start md:self-auto">
              <span className="text-xs font-bold text-teal-200 pl-2">Period:</span>
              <select
                className="bg-teal-950/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-700/50 outline-none cursor-pointer hover:bg-teal-900 transition-colors"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Months (YTD)' : `Month: ${m}`}
                  </option>
                ))}
              </select>
              <select
                className="bg-teal-950/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-700/50 outline-none cursor-pointer hover:bg-teal-900 transition-colors"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* QUICK SUMMARY METRICS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">
                  #1 Top Ranked {isPlantSelected ? 'Plot' : 'Plant'}
                </div>
                <div className="text-xl md:text-2xl font-black text-amber-300 mt-1 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
                  {topPlant ? (isPlantSelected ? topPlant.plot : topPlant.plant) : '—'}
                </div>
                <div className="text-xs text-teal-200/70 mt-1">
                  Score: <strong className="text-white">{topPlant?.score ?? 0}</strong> / 100 ({topPlant?.grade ?? '—'})
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/40 text-xs font-bold">
                Leader
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">
                  {isPlantSelected ? `${currentPlantName} Average Score` : 'Cluster Average Score'}
                </div>
                <div className="text-3xl font-black text-white mt-1">{avgScore} <span className="text-sm font-normal text-teal-300">/ 100</span></div>
                <div className="text-xs text-teal-200/70 mt-1">
                  Across {ranking.length} operational {isPlantSelected ? 'plots' : 'plants'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">Ranking Formula</div>
                <div className="text-sm font-bold text-emerald-300 mt-1">9 Key Safety Components</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => setSafetyModalOpen(true)}
                    className="text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>How Score Evaluates (i)</span>
                  </button>
                  <button
                    onClick={() => setShowFormula(!showFormula)}
                    className="text-xs font-semibold text-teal-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {showFormula ? 'Hide Summary' : 'Quick Weights'}
                  </button>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                <HelpCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE FORMULA EXPLANATION */}
          {showFormula && (
            <div className="bg-teal-900/60 backdrop-blur-md border border-teal-700/50 rounded-2xl p-5 text-xs text-teal-100 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-teal-700/50 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  EHS Score Weightage Breakdown &amp; Calculation Rules
                </h3>
                <span className="text-teal-300 font-mono text-[11px]">Normalized 0 – 100 Scale</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {SCORE_WEIGHTS.map((w, idx) => (
                  <div key={idx} className="bg-teal-950/60 p-2.5 rounded-xl border border-teal-800/60 space-y-1">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{w.icon} {w.name}</span>
                      <span className="text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded text-[10px]">{w.weight}</span>
                    </div>
                    <div className="text-[11px] text-teal-300/80">Monthly Target: {w.target}</div>
                  </div>
                ))}
              </div>
              <div className="bg-red-950/50 border border-red-800/40 p-2.5 rounded-xl text-red-200 text-[11px] flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  <strong>Incident Penalties Applied:</strong> -5 pts for each Medical Treatment Case (MTC), -15 pts for each Lost Time Injury (LTI), -40 pts for Fatality.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOP 3 PODIUM SPOTLIGHT CARDS */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ranking.slice(0, 3).map((r) => {
            const style = GRADE_STYLES[r.grade] || GRADE_STYLES.Silver
            const primaryName = isPlantSelected ? r.plot : r.plant
            const secondaryName = isPlantSelected ? r.plant : 'Greenko Unit'
            return (
              <div
                key={`${r.plant_id}-${r.plot_id || 'all'}`}
                className={`relative overflow-hidden bg-white rounded-2xl p-5 border-2 ${style.border} shadow-sm hover:shadow-lg transition-all duration-300 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      {getRankMedal(r.rank)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rank #{r.rank}</div>
                      <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{primaryName}</h3>
                      {isPlantSelected && <div className="text-[11px] font-semibold text-teal-700">{secondaryName}</div>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${style.bg} ${style.text}`}>
                    {r.grade} Grade
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-baseline text-xs font-bold">
                    <span className="text-gray-500">Overall Safety Score</span>
                    <span className="text-lg font-black text-gray-900">{r.score} <span className="text-xs text-gray-400 font-normal">/ 100</span></span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${style.badge} transition-all duration-500`}
                      style={{ width: `${Math.min(100, r.score)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Period: <strong>{r.month} {r.year}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Evaluated
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CHARTS ROW: BAR CHART & RADAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BAR CHART */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-emerald-600" />
                  <span>{isPlantSelected ? `${currentPlantName} Plot Score Comparison` : 'Plant Score Comparison'}</span>
                </h2>
                <ChartInfoButton
                  title="Safety Score Comparison"
                  whatItShows="Compares the overall 0 to 100 Safety Score for each plant or plot in the selected scope."
                  howToRead="Taller bars are better. Purple bars (≥90) achieve Platinum grade. The dashed purple line shows the world-class target benchmark of 90 points."
                  target="≥ 90.0 Score (Platinum Grade)"
                  whyItMatters="Enables leadership to identify the safest performing units and prioritize safety intervention for lower-scoring plots."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPlantSelected
                  ? 'Individual plot score benchmarking against the 90+ Platinum target line'
                  : 'Overall score benchmarking against the 90+ Platinum target line'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 flex-wrap">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span> Platinum (90+)
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Gold (75+)
              <span className="w-3 h-3 rounded-full bg-slate-500 inline-block"></span> Silver (50+)
            </div>
          </div>

          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey={isPlantSelected ? 'plot' : 'plant'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-gray-800">
                          <div className="font-bold text-sm text-emerald-400">
                            {isPlantSelected ? data.plot : data.plant}
                          </div>
                          {isPlantSelected && <div className="text-[11px] text-teal-300">{data.plant}</div>}
                          <div>Score: <strong className="text-white">{data.score}</strong> / 100</div>
                          <div>Grade: <span className="font-bold text-amber-300">{data.grade}</span></div>
                          <div>Rank: <span className="font-bold text-teal-300">#{data.rank}</span></div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine y={90} label={{ value: 'Target: 90 (Platinum)', fill: '#9333ea', fontSize: 11, position: 'insideTopRight' }} stroke="#9333ea" strokeDasharray="4 4" />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {ranking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RADAR CHART */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <RadarChart className="w-5 h-5 text-teal-600" />
                  <span>Multi-Dimensional Profile</span>
                </h2>
                <ChartInfoButton
                  title="Multi-Dimensional Safety Radar"
                  whatItShows="Visualizes 6 key safety dimensions simultaneously (Near Miss, Training, Audits, LOTO, Walkdowns, Statutory)."
                  howToRead="The wider and more expanded the web, the stronger the overall safety culture. If any corner pulls inward toward zero, that specific metric is lagging."
                  target="100% full outer circle across all dimensions"
                  whyItMatters="Identifies if a plant is hyper-focused on one activity while neglecting other vital safety disciplines."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">6-axis compliance &amp; proactive safety radar</p>
            </div>
          </div>

          <div className="h-[260px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" fontSize={11} tick={{ fill: '#4b5563', fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {ranking.map((r, idx) => {
                  const keyName = isPlantSelected && r.plot_id ? `plot_${r.plot_id}` : `plant_${r.plant_id}`
                  const displayName = isPlantSelected ? r.plot : r.plant
                  return (
                    <Radar
                      key={`${r.plant_id}-${r.plot_id || 'all'}`}
                      name={displayName}
                      dataKey={keyName}
                      stroke={chartColors[idx % chartColors.length]}
                      fill={chartColors[idx % chartColors.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  )
                })}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-gray-700 pb-1 text-emerald-300">
                            {payload[0].payload.metric} Score (%)
                          </div>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
                              <span className="font-bold">{p.value}%</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-100">
            {ranking.map((r, idx) => (
              <div key={`${r.plant_id}-${r.plot_id || 'all'}`} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></span>
                {isPlantSelected ? r.plot : r.plant}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRADE LEGEND CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 border border-purple-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-purple-900 text-sm">🟩 Platinum</span>
            <span className="text-xs font-mono font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">90 – 100%</span>
          </div>
          <p className="text-xs text-purple-700 font-medium">Exemplary EHS performance across all 7 metrics</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-900 text-sm">🟦 Gold</span>
            <span className="text-xs font-mono font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">75 – 89%</span>
          </div>
          <p className="text-xs text-amber-700 font-medium">Strong safety culture with minimal compliance gaps</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 text-sm">🟨 Silver</span>
            <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">50 – 74%</span>
          </div>
          <p className="text-xs text-slate-700 font-medium">Average performance, target areas need improvement</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/60 border border-red-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-red-900 text-sm">🟥 Bronze</span>
            <span className="text-xs font-mono font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full">0 – 49%</span>
          </div>
          <p className="text-xs text-red-700 font-medium">Not satisfactory — immediate safety action required</p>
        </div>
      </div>

      {/* FULL RANKING DETAILED TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {isPlantSelected ? `${currentPlantName} Plot Ranking Leaderboard` : 'Full Plant Ranking Leaderboard'}
              </h2>
              <ChartInfoButton
                title="Safety Ranking Leaderboard Table"
                whatItShows="Detailed ranking of operating units by their composite 100-point safety index."
                howToRead="Units are ranked from 1 to last. Click any row to expand and inspect the exact scores across PTW, LOTO, Audits, Training, Walkdowns, and Lagging incidents."
                target="Platinum Grade (≥90 points) for all operating units"
                whyItMatters="Full transparency enables peer learning and targets safety interventions where they are needed most."
              />
            </div>
            <p className="text-xs text-gray-500">
              {isPlantSelected
                ? `Comprehensive score and grade breakdown across plots in ${currentPlantName}`
                : 'Comprehensive score and grade breakdown by operating plant'}
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${isPlantSelected ? 'plot' : 'plant'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-left text-xs uppercase font-semibold text-gray-400 tracking-wider border-b border-gray-100 pb-2">
                <th className="py-3 px-2">Rank</th>
                <th>{isPlantSelected ? 'Plot Name' : 'Plant Name'}</th>
                <th>Safety Score</th>
                <th>Grade</th>
                <th>Period</th>
                <th className="text-right px-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRanking.map((r) => {
                const style = GRADE_STYLES[r.grade] || GRADE_STYLES.Silver
                const rowKey = `${r.plant_id}-${r.plot_id || 'overall'}`
                const isExpanded = expandedPlant === rowKey
                const plotMetric = metrics.find((m) =>
                  m.plant_id === r.plant_id && (r.plot_id ? m.plot_id === r.plot_id : true)
                )

                return (
                  <>
                    <tr
                      key={rowKey}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => setExpandedPlant(isExpanded ? null : rowKey)}
                    >
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-2 font-bold text-gray-800">
                          {getRankMedal(r.rank)}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold text-gray-900">{isPlantSelected ? r.plot : r.plant}</div>
                        {isPlantSelected && <div className="text-[11px] text-teal-600 font-medium">{r.plant}</div>}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${style.badge}`}
                              style={{ width: `${Math.min(100, r.score)}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-gray-900">{r.score}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`px-3 py-1 text-xs font-extrabold rounded-lg border ${style.bg} ${style.text} ${style.border}`}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 font-medium">{r.month} {r.year}</td>
                      <td className="text-right px-2">
                        <button className="text-gray-400 hover:text-gray-700 p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDABLE METRIC DRILLDOWN ROW */}
                    {isExpanded && plotMetric && (
                      <tr className="bg-emerald-50/40">
                        <td colSpan={6} className="p-4 border-b border-emerald-100">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              Metric Breakdown for {isPlantSelected ? r.plot : r.plant} ({r.plant}) — ({r.month} {r.year})
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Near Miss</div>
                                <div className="font-bold text-gray-800 mt-0.5">{plotMetric.near_miss}</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Training Hrs</div>
                                <div className="font-bold text-gray-800 mt-0.5">{plotMetric.training_hours}h</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Audits</div>
                                <div className="font-bold text-gray-800 mt-0.5">{plotMetric.audits}</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">LOTO %</div>
                                <div className="font-bold text-emerald-600 mt-0.5">{plotMetric.loto_compliance}%</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Walkdowns</div>
                                <div className="font-bold text-gray-800 mt-0.5">{plotMetric.walkdowns}</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Statutory %</div>
                                <div className="font-bold text-emerald-600 mt-0.5">{plotMetric.statutory_compliance}%</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Incidents</div>
                                <div className="font-bold text-red-600 mt-0.5">LTI: {plotMetric.lti} | MTC: {plotMetric.mtc}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filteredRanking.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                    No ranking results match your query for {month} {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
