import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts'
import {
  Eye,
  Footprints,
  GraduationCap,
  BookOpen,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  SearchCheck,
  Target,
  Sparkles,
  AlertTriangle,
  Flame,
  LifeBuoy,
  Users2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import api from '../api'
import FilterBar from '../components/FilterBar'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']
const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function LeadingIndicators() {
  const {
    selectedPlant,
    setSelectedPlant,
    selectedPlot,
    setSelectedPlot,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    isPlantSelected,
    isPlotSelected,
    currentPlantName,
    currentPlotName,
  } = useFilter()

  const [metrics, setMetrics] = useState([])
  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])
  const [training, setTraining] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => {
    api.get('/plants').then((r) => setPlants(r.data)).catch(() => {})
    api.get('/plots').then((r) => setPlots(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { year: selectedYear }
    if (selectedMonth !== 'All') params.month = selectedMonth
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)

    const trainingParams = {}
    if (selectedPlant !== 'All') trainingParams.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') trainingParams.plot_id = Number(selectedPlot)

    api.get('/metrics', { params }).then((r) => setMetrics(r.data || [])).catch(() => {})
    api.get('/training', { params: trainingParams }).then((r) => setTraining(r.data || [])).catch(() => {})
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`
  const plotName = (id) => plots.find((p) => p.id === id)?.name || 'Overall'

  // Filter rows properly according to 3-tier hierarchy
  let displayRows = []
  if (!isPlantSelected) {
    // Cluster view: only plant-level rows (plot_id is null)
    displayRows = metrics.filter((m) => m.plot_id === null || m.plot_id === undefined)
  } else if (selectedPlot === 'All') {
    // Plant selected, all plots: rows with plot_id not null belonging to this plant
    displayRows = metrics.filter((m) => m.plot_id !== null && m.plot_id !== undefined && m.plant_id === Number(selectedPlant))
  } else {
    // Specific plot selected
    displayRows = metrics.filter((m) => m.plot_id === Number(selectedPlot) && m.plant_id === Number(selectedPlant))
  }

  // Deduplicate by entity key for the active period
  const entityMap = {}
  displayRows.forEach((m) => {
    const key = `${m.plant_id}-${m.plot_id || 'all'}`
    entityMap[key] = m
  })
  const rows = Object.values(entityMap)

  const filteredRows = rows.filter((m) =>
    (isPlantSelected ? plotName(m.plot_id) : plantName(m.plant_id)).toLowerCase().includes(searchQuery.toLowerCase()) ||
    plantName(m.plant_id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const barData = rows.map((m) => ({
    name: isPlantSelected ? plotName(m.plot_id) : plantName(m.plant_id),
    plant: plantName(m.plant_id),
    plot: plotName(m.plot_id),
    'Near Miss': m.near_miss,
    'Unsafe Acts': m.unsafe_acts,
    'Unsafe Conditions': m.unsafe_conditions,
  }))

  const trainingData = rows.map((m) => ({
    name: isPlantSelected ? plotName(m.plot_id) : plantName(m.plant_id),
    plant: plantName(m.plant_id),
    plot: plotName(m.plot_id),
    'Training Hours': m.training_hours,
    'Toolbox Talk Hours': Math.round(m.toolbox_talk_hours || 0),
    target: 300,
  }))

  const topicCount = {}
  training.forEach((t) => { topicCount[t.topic] = (topicCount[t.topic] || 0) + 1 })
  const topicData = Object.entries(topicCount).map(([name, value]) => ({ name, value }))

  // Aggregated Proactive KPI Totals
  const totalNearMiss = rows.reduce((s, m) => s + (m.near_miss || 0), 0)
  const totalUnsafeActs = rows.reduce((s, m) => s + (m.unsafe_acts || 0), 0)
  const totalUnsafeConditions = rows.reduce((s, m) => s + (m.unsafe_conditions || 0), 0)
  const totalUaUc = totalUnsafeActs + totalUnsafeConditions
  const totalWalkdowns = rows.reduce((s, m) => s + (m.walkdowns || 0), 0)
  const totalAudits = rows.reduce((s, m) => s + (m.audits || 0), 0)
  const totalTrainingHours = rows.reduce((s, m) => s + (m.training_hours || 0), 0)
  const totalToolboxTalks = rows.reduce((s, m) => s + (m.toolbox_talks || 0), 0)
  const totalToolboxTalkHours = rows.reduce((s, m) => s + (m.toolbox_talk_hours || 0), 0)
  const totalMockDrills = rows.reduce((s, m) => s + (m.mock_drills || 0), 0)
  const totalOhsMeetings = rows.reduce((s, m) => s + (m.ohs_meetings || 0), 0)
  const avgPtw = rows.length > 0
    ? (rows.reduce((s, m) => s + (m.ptw_compliance || 0), 0) / rows.length).toFixed(1)
    : 0

  return (
    <div className="space-y-6 pb-8">
      {/* FILTER BAR */}
      <FilterBar
        selectedPlant={selectedPlant}
        setSelectedPlant={setSelectedPlant}
        selectedPlot={selectedPlot}
        setSelectedPlot={setSelectedPlot}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />

      {/* EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 text-white p-6 md:p-8 shadow-2xl border border-indigo-800/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {isPlantSelected ? `${currentPlantName} Proactive Safety` : 'Proactive Safety Culture'}
                </span>
                <span className="text-xs text-indigo-200/70 font-medium">Preventive Leadership Metrics</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                {isPlantSelected
                  ? `${currentPlantName} — Leading Indicators & Proactive Matrix`
                  : 'Leading Indicators & Proactive Safety Dashboard'}
              </h1>
              <p className="text-xs md:text-sm text-slate-300/80 mt-0.5">
                {isPlantSelected
                  ? `Monitoring near misses, safety walkdowns, audits, training hours & toolbox talks across plots in ${currentPlantName}`
                  : 'Monitoring near misses, safety walkdowns, audits, training hours & toolbox talks across cluster operating units'}
              </p>
            </div>

            {/* PERIOD FILTERS */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 self-start md:self-auto">
              <span className="text-xs font-bold text-slate-200 pl-2">Period:</span>
              <select
                className="bg-indigo-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-700 outline-none cursor-pointer hover:bg-indigo-900 transition-colors"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m === 'All' ? 'All Months (YTD)' : `Month: ${m}`}</option>
                ))}
              </select>
              <select
                className="bg-indigo-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-700 outline-none cursor-pointer hover:bg-indigo-900 transition-colors"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 8-KPI PROACTIVE SUMMARY GRID (ORDERED BY USER SPECIFICATION) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Near Miss */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-300">
                <Eye className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-teal-500/20 px-1.5 py-0.5 rounded text-teal-200">#1 Top</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Near Miss</div>
                <div className="text-xl font-black text-white mt-0.5">{totalNearMiss}</div>
              </div>
            </div>

            {/* 2. UA/UC */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-300">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">UA/UC</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Hazards</div>
                <div className="text-xl font-black text-white mt-0.5">{totalUaUc}</div>
              </div>
            </div>

            {/* 3. Training Hours */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-300">
                <GraduationCap className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-200">Target</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Training Hrs</div>
                <div className="text-xl font-black text-white mt-0.5">{totalTrainingHours}h</div>
              </div>
            </div>

            {/* 4. Mock Drills */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-300">
                <LifeBuoy className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-200">Drills</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mock Drills</div>
                <div className="text-xl font-black text-white mt-0.5">{totalMockDrills}</div>
              </div>
            </div>

            {/* 5. Walkdowns */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-300">
                <Footprints className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-200">Walk</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Walkdowns</div>
                <div className="text-xl font-black text-white mt-0.5">{totalWalkdowns}</div>
              </div>
            </div>

            {/* 6. Audits */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-300">
                <SearchCheck className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200">Audit</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Audits</div>
                <div className="text-xl font-black text-white mt-0.5">{totalAudits}</div>
              </div>
            </div>

            {/* 7. Tool Box Talk Hrs */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-300">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">TBT</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">TBT Hours</div>
                <div className="text-xl font-black text-white mt-0.5">{totalToolboxTalkHours}h</div>
              </div>
            </div>

            {/* 8. OHS Committee Meetings */}
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-300">
                <Users2 className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200">OHS</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">OHS Meetings</div>
                <div className="text-xl font-black text-white mt-0.5">{totalOhsMeetings}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1: HAZARDS BREAKDOWN & TRAINING + TBT HOURS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GROUPED BAR CHART: HAZARDS (NEAR MISS, UA, UC) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  <span>{isPlantSelected ? `${currentPlantName} Plot Hazard Reporting` : 'Cluster Hazard & Observation Reporting'}</span>
                </h2>
                <ChartInfoButton
                  title="Hazard & Observation Reporting"
                  whatItShows="Compares counts of proactively identified Near Misses, Unsafe Acts, and Unsafe Conditions across units."
                  howToRead="Higher numbers mean an active, reporting workforce. A healthy plot has high green Near Miss bars, demonstrating that workers speak up before accidents occur."
                  target="≥ 1 Near Miss per plot/month"
                  whyItMatters="Reporting minor hazards is the #1 proven barrier against severe workplace injuries."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Comparison of Near Misses, Unsafe Acts, and Unsafe Conditions</p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              Total Observations: <strong className="text-slate-900">{totalNearMiss + totalUaUc}</strong>
            </div>
          </div>

          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-gray-700 pb-1 text-emerald-400">
                            {label}
                          </div>
                          {isPlantSelected && <div className="text-[11px] text-teal-300 font-semibold">{data.plant}</div>}
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
                              <span className="font-bold">{p.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Near Miss" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Unsafe Acts" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Unsafe Conditions" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRAINING & TOOLBOX TALK HOURS COMPARISON */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <span>{isPlantSelected ? `${currentPlantName} Training & TBT Hours` : 'Training & TBT Hours by Unit'}</span>
                </h2>
                <ChartInfoButton
                  title="Safety Training & TBT Hours"
                  whatItShows="Shows total hours dedicated to formalized classroom trainings and on-site daily Toolbox Talks (TBT)."
                  howToRead="The purple bar shows classroom safety training; cyan shows practical toolbox talks. Taller bars indicate more workforce hours invested in safety education."
                  target="≥ 15h per plot (Classroom) / Ongoing TBTs"
                  whyItMatters="Well-trained workers make fewer errors and know how to react instantly during an emergency."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Completed training &amp; toolbox talk hours against target</p>
            </div>
          </div>

          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-gray-700 pb-1 text-indigo-300">
                            {label}
                          </div>
                          {isPlantSelected && <div className="text-[11px] text-teal-300">{data.plant}</div>}
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
                              <span className="font-bold">{p.value} hrs</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={300} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'Target: 300h', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="Training Hours" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Toolbox Talk Hours" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: TRAINING FOCUS AREAS DONUT CHART */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" /> Training Curriculum &amp; Focus Area Distribution
              </h2>
              <ChartInfoButton
                title="Training Focus Areas Breakdown"
                whatItShows="Shows which safety topics (like Fire Safety, Working at Height, Electrical Safety, or First Aid) the workforce is being trained on."
                howToRead="The pie slice sizes indicate the share of training sessions dedicated to each subject. Look for a balanced mix covering all critical site hazards."
                target="Broad coverage across all high-risk plant activities"
                whyItMatters="Focusing on all major plant hazards ensures workers are competent in diverse emergencies, not just one topic."
              />
            </div>
            <p className="text-xs text-gray-500">Distribution of safety training sessions by topic area across the cluster</p>
          </div>
          <span className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
            {training.length} Sessions Logged
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 h-[260px] w-full flex items-center justify-center">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {topicData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white p-2.5 rounded-xl text-xs font-semibold shadow-lg">
                            <span style={{ color: payload[0].color }}>{payload[0].name}: </span>
                            <span className="font-bold">{payload[0].value} sessions</span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 italic">No topic distribution records available</div>
            )}
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topicData.map((t, idx) => (
              <div key={t.name} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-xs font-bold text-gray-800 truncate">{t.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                  {t.value} sessions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FULL LEADING INDICATORS TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                {isPlantSelected ? `${currentPlantName} Plot Proactive Matrix` : 'Full Proactive Safety Matrix'}
              </h2>
              <ChartInfoButton
                title="Proactive Safety Activity Matrix"
                whatItShows="Tabulates all preventive activities: near misses logged, unsafe conditions identified, safety training hours, audits completed, and mock drills."
                howToRead="Higher numbers in green/teal columns mean proactive reporting is strong. Click any row to expand detailed compliance percentages."
                target="High reporting culture with 100% audit closure"
                whyItMatters="Strong proactive safety habits prevent minor unsafe conditions from turning into serious hospital injuries or lost-time incidents."
              />
            </div>
            <p className="text-xs text-gray-500">
              {isPlantSelected
                ? `Comprehensive leading indicator metrics across plots in ${currentPlantName}`
                : 'Comprehensive plant-by-plant leading indicator metrics'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${isPlantSelected ? 'plot' : 'plant'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[950px]">
            <thead>
              <tr className="text-left text-xs uppercase font-semibold text-gray-400 tracking-wider border-b border-gray-100 pb-2">
                <th className="py-3 px-2">{isPlantSelected ? 'Plot Name' : 'Plant Name'}</th>
                <th>Near Miss</th>
                <th>Unsafe Acts</th>
                <th>Unsafe Cond.</th>
                <th>Training Hrs</th>
                <th>TBT Hrs</th>
                <th>Walkdowns</th>
                <th>Audits</th>
                <th>Mock Drills</th>
                <th>OHS Mtgs</th>
                <th className="text-right px-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((m) => {
                const rowKey = `${m.plant_id}-${m.plot_id || 'all'}`
                const isExpanded = expandedRow === rowKey
                const primaryName = isPlantSelected ? plotName(m.plot_id) : plantName(m.plant_id)

                return (
                  <>
                    <tr
                      key={rowKey}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                    >
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-gray-900">{primaryName}</div>
                        {isPlantSelected && (
                          <div className="text-[11px] text-teal-600 font-semibold">{plantName(m.plant_id)}</div>
                        )}
                      </td>
                      <td>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                          {m.near_miss}
                        </span>
                      </td>
                      <td>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                          {m.unsafe_acts}
                        </span>
                      </td>
                      <td>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          {m.unsafe_conditions}
                        </span>
                      </td>
                      <td className="font-bold text-indigo-700 font-mono">{m.training_hours}h</td>
                      <td className="font-semibold text-teal-700 font-mono">{Math.round(m.toolbox_talk_hours || 0)}h</td>
                      <td className="font-semibold text-gray-800">{m.walkdowns}</td>
                      <td className="font-semibold text-gray-800">{m.audits}</td>
                      <td className="font-semibold text-rose-700 font-bold">{m.mock_drills || 0}</td>
                      <td className="font-semibold text-purple-700 font-bold">{m.ohs_meetings || 0}</td>
                      <td className="text-right px-2">
                        <button className="text-gray-400 hover:text-gray-700 p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDABLE DETAIL ROW */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={11} className="p-4 border-b border-indigo-100">
                          <div className="space-y-2 text-xs">
                            <div className="font-bold text-indigo-950 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              Proactive Safety Performance Summary for {primaryName} ({m.month} {m.year})
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">PTW Compliance</div>
                                <div className="font-bold text-emerald-600 mt-0.5">{m.ptw_compliance}%</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">LOTO Compliance</div>
                                <div className="font-bold text-emerald-600 mt-0.5">{m.loto_compliance}%</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Audit Closure</div>
                                <div className="font-bold text-indigo-600 mt-0.5">{m.audit_closure}%</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Training Sessions</div>
                                <div className="font-bold text-gray-800 mt-0.5">{m.training_sessions} sessions</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Toolbox Talks</div>
                                <div className="font-bold text-gray-800 mt-0.5">{m.toolbox_talks} talks ({m.toolbox_talk_hours}h)</div>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                                <div className="text-gray-400 font-semibold text-[10px]">Safety Score</div>
                                <div className="font-bold text-purple-700 mt-0.5">{m.total_score} ({m.grade})</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400 text-sm">
                    No safety records match your query for {selectedMonth} {selectedYear}.
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
