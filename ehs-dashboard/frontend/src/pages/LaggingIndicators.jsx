import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  CheckCircle2,
  Activity,
  TriangleAlert,
  Layers,
  Info,
} from 'lucide-react'
import api from '../api'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']
const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

import FilterBar from '../components/FilterBar'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'

export default function LaggingIndicators() {
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
  const [incidents, setIncidents] = useState([])
  const [trends, setTrends] = useState([])
  const [searchIncident, setSearchIncident] = useState('')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [activeHoverTier, setActiveHoverTier] = useState(null)

  useEffect(() => {
    const params = { year: selectedYear }
    if (selectedMonth !== 'All') params.month = selectedMonth
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)

    const trendsParams = {}
    if (selectedPlant !== 'All') trendsParams.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') trendsParams.plot_id = Number(selectedPlot)

    api.get('/metrics', { params }).then((r) => setMetrics(r.data))
    api.get('/plants').then((r) => setPlants(r.data))
    api.get('/plots').then((r) => setPlots(r.data))
    api.get('/incidents', { params: trendsParams }).then((r) => setIncidents(r.data))
    api.get('/metrics/trends', { params: trendsParams }).then((r) => setTrends(r.data))
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`

  const latestByPlant = {}
  metrics.forEach((m) => { latestByPlant[m.plant_id] = m })

  const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const isSpecificPlant = selectedPlant !== 'All'
  const isSpecificPlot = isSpecificPlant && selectedPlot !== 'All'

  // Series keys for TRIFR Trend: plants in cluster overview vs plots/blocks inside selected plant
  let trendSeries = []
  if (!isSpecificPlant) {
    trendSeries = plants.map((p, idx) => ({
      key: p.name,
      label: p.name,
      color: COLORS[idx % COLORS.length],
    }))
  } else if (!isSpecificPlot) {
    const plantPlots = plots.filter((pl) => String(pl.plant_id) === String(selectedPlant))
    if (plantPlots.length > 0) {
      trendSeries = plantPlots.map((pl, idx) => ({
        key: pl.name,
        label: pl.name,
        color: COLORS[idx % COLORS.length],
      }))
    } else {
      const uniquePlots = Array.from(new Set(trends.map((t) => t.plot).filter(Boolean)))
      trendSeries = uniquePlots.map((plotName, idx) => ({
        key: plotName,
        label: plotName,
        color: COLORS[idx % COLORS.length],
      }))
    }
  } else {
    trendSeries = [
      {
        key: currentPlotName,
        label: `${currentPlotName} (${currentPlantName})`,
        color: '#10b981',
      },
    ]
  }

  const trifrByMonth = {}
  trends.forEach((t) => {
    if (!t.month) return
    if (!trifrByMonth[t.month]) {
      trifrByMonth[t.month] = { month: t.month }
    }
    const seriesKey = isSpecificPlant ? t.plot : t.plant
    if (seriesKey) {
      trifrByMonth[t.month][seriesKey] = t.trifr
    }
  })

  const trifrData = Object.values(trifrByMonth).sort((a, b) => {
    const idxA = MONTH_ORDER.indexOf(a.month)
    const idxB = MONTH_ORDER.indexOf(b.month)
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
  })

  const typeCount = {}
  incidents.forEach((i) => { typeCount[i.incident_type] = (typeCount[i.incident_type] || 0) + 1 })
  const pieData = Object.entries(typeCount).map(([name, value]) => ({ name, value }))

  // Summary Metrics Aggregations
  const totalFatalities = metrics.reduce((s, m) => s + (m.fatality || 0), 0)
  const totalLti = metrics.reduce((s, m) => s + (m.lti || 0), 0)
  const totalMtc = metrics.reduce((s, m) => s + (m.mtc || 0), 0)
  const totalFac = metrics.reduce((s, m) => s + (m.fac || 0), 0)
  const totalNearMiss = metrics.reduce((s, m) => s + (m.near_miss || 0), 0)
  const totalUnsafe = metrics.reduce((s, m) => s + (m.unsafe_acts || 0) + (m.unsafe_conditions || 0), 0)
  const totalSafeHours = metrics.reduce((s, m) => s + (m.safe_man_hours || 0), 0)

  const avgTrifr = totalSafeHours > 0
    ? (((totalLti + totalMtc + totalFac) * 200000) / totalSafeHours).toFixed(2)
    : '0.00'
  const avgLtir = totalSafeHours > 0
    ? ((totalLti * 200000) / totalSafeHours).toFixed(2)
    : '0.00'

  const filteredIncidents = incidents.filter((i) => {
    const matchesSearch =
      i.incident_type?.toLowerCase().includes(searchIncident.toLowerCase()) ||
      plantName(i.plant_id).toLowerCase().includes(searchIncident.toLowerCase()) ||
      i.status?.toLowerCase().includes(searchIncident.toLowerCase())
    const matchesSeverity = severityFilter === 'All' || i.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  // Heinrich Pyramid Tier Configuration (Exact Linear Isosceles Triangle Geometry)
  const pyramidTiers = [
    {
      id: 'fatality',
      tier: 'FATALITIES',
      shortTier: '1. Fatality (Apex)',
      count: totalFatalities,
      badge: totalFatalities === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30',
      description: 'Zero Fatality Goal — Critical Controls',
      fill: '#DC2626',
      textColor: '#FFFFFF',
      points: '300,20 339.4,83 260.6,83',
      titleY: 52,
      badgeY: 71,
      fontSize: '11px',
      targetRatio: '1 (Target: 0)',
    },
    {
      id: 'lti',
      tier: 'LOST TIME INJURIES (LTI)',
      shortTier: '2. Lost Time Injury (LTI)',
      count: totalLti,
      badge: totalLti === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: 'Days away from work injury',
      fill: '#E11D48',
      textColor: '#FFFFFF',
      points: '258.1,87 341.9,87 381.3,150 218.8,150',
      titleY: 113,
      badgeY: 135,
      fontSize: '11px',
      targetRatio: 'Ratio: 29 Target',
    },
    {
      id: 'mtc',
      tier: 'MEDICAL TREATMENT (MTC)',
      shortTier: '3. Medical Treatment (MTC)',
      count: totalMtc,
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Medical care beyond first aid',
      fill: '#F59E0B',
      textColor: '#0F172A',
      points: '216.3,154 383.8,154 423.1,217 176.9,217',
      titleY: 180,
      badgeY: 202,
      fontSize: '12px',
      targetRatio: 'Recordable Case',
    },
    {
      id: 'fac',
      tier: 'FIRST AID CASES (FAC)',
      shortTier: '4. First Aid Cases (FAC)',
      count: totalFac,
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      description: 'Minor workplace first aid',
      fill: '#EAB308',
      textColor: '#0F172A',
      points: '174.4,221 425.6,221 465,284 135,284',
      titleY: 247,
      badgeY: 269,
      fontSize: '12px',
      targetRatio: 'Minor Treatment',
    },
    {
      id: 'nearmiss',
      tier: 'NEAR MISS REPORTS',
      shortTier: '5. Near Miss Reports',
      count: totalNearMiss,
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      description: 'Hazard observations caught before injury',
      fill: '#0D9488',
      textColor: '#FFFFFF',
      points: '132.5,288 467.5,288 506.9,351 93.1,351',
      titleY: 314,
      badgeY: 336,
      fontSize: '13px',
      targetRatio: 'Ratio: 300 Target',
    },
    {
      id: 'unsafe',
      tier: 'UNSAFE ACTS & CONDITIONS',
      shortTier: '6. Unsafe Acts & Conditions',
      count: totalUnsafe,
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Proactive hazard prevention base',
      fill: '#059669',
      textColor: '#FFFFFF',
      points: '90.6,355 509.4,355 550,420 50,420',
      titleY: 382,
      badgeY: 404,
      fontSize: '12px',
      targetRatio: 'Proactive Base',
    },
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* SCOPE FILTER BAR */}
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white p-6 md:p-8 shadow-2xl border border-rose-900/30">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {!isPlantSelected
                    ? 'Cluster Reactive Tracking'
                    : !isPlotSelected
                    ? `Scope: ${currentPlantName}`
                    : `Scope: ${currentPlantName} · ${currentPlotName}`}
                </span>
                <span className="text-xs text-rose-200/70 font-medium">OSHA Standard Compliance</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight flex items-center gap-2.5 flex-wrap">
                <span>
                  {!isPlantSelected
                    ? 'Lagging Indicators & Safety Pyramid'
                    : `${currentPlantName}${isPlotSelected ? ` (${currentPlotName})` : ''} — Lagging Indicators`}
                </span>
                {isPlantSelected && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                    Filtered Scope
                  </span>
                )}
              </h1>
              <p className="text-xs md:text-sm text-slate-300/80 mt-0.5">
                Monitoring workplace incidents, recordable rates (TRIFR/LTIR), and safety triangle distribution
              </p>
            </div>

            {/* PERIOD FILTERS */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 self-start md:self-auto">
              <span className="text-xs font-bold text-slate-200 pl-2">Period:</span>
              <select
                className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m === 'All' ? 'All Months (YTD)' : `Month: ${m}`}</option>
                ))}
              </select>
              <select
                className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KEY LAGGING SUMMARY STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Fatalities</div>
              <div className={`text-2xl font-black ${totalFatalities === 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {totalFatalities}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">Target: 0</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">LTIs</div>
              <div className={`text-2xl font-black ${totalLti === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalLti}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">Target: 0</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">MTC Cases</div>
              <div className="text-2xl font-black text-amber-400">{totalMtc}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Medical Treatment</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">First Aid (FAC)</div>
              <div className="text-2xl font-black text-yellow-300">{totalFac}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Minor Incidents</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cluster TRIFR</div>
              <div className="text-2xl font-black text-teal-300">{avgTrifr}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Per 200k Man-Hours</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cluster LTIR</div>
              <div className="text-2xl font-black text-emerald-300">{avgLtir}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Per 200k Man-Hours</div>
            </div>
          </div>
        </div>
      </div>

      {/* PLANT SUMMARY MATRIX TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" /> Plant Lagging Performance Matrix
              </h2>
              <ChartInfoButton
                title="Plant Lagging Matrix"
                whatItShows="Provides a snapshot of recorded workplace injuries: Fatalities, Lost Time Injuries (LTI), Medical Treatments (MTC), First Aid (FAC), and standardized LTIR/TRIFR injury rates."
                howToRead="Zero in all injury columns is the golden benchmark. Green badges signify Zero Harm; red highlights units where an incident occurred."
                target="Zero Fatalities, Zero LTIs, Zero MTCs"
                whyItMatters="Lagging numbers track actual harm that happened, confirming whether past safety precautions were effective."
              />
            </div>
            <p className="text-xs text-gray-500">Incident frequencies and injury rates across operating plants (latest data)</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> OSHA Calculation Basis (200,000 Hours)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs uppercase font-semibold text-gray-400 tracking-wider border-b border-gray-100 pb-2">
                <th className="py-3 px-2">Plant Name</th>
                <th>Fatality</th>
                <th>LTI</th>
                <th>MTC</th>
                <th>FAC</th>
                <th>LTIR</th>
                <th>TRIFR</th>
                <th>Safety Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(latestByPlant).map((m) => {
                const isZeroHarm = m.fatality === 0 && m.lti === 0
                return (
                  <tr key={m.plant_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-gray-900">{plantName(m.plant_id)}</td>
                    <td>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${m.fatality > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700'}`}>
                        {m.fatality}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${m.lti > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700'}`}>
                        {m.lti}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${m.mtc > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                        {m.mtc}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${m.fac > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                        {m.fac}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-gray-800">{m.ltir}</td>
                    <td className="font-mono font-bold text-gray-800">{m.trifr}</td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 w-fit ${isZeroHarm ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                        {isZeroHarm ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
                        {isZeroHarm ? 'Zero Harm' : 'Action Required'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHARTS ROW: TRIFR TREND & INCIDENT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TRIFR TREND LINE CHART */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>
                    {!isSpecificPlant
                      ? 'TRIFR Trend Across Plants'
                      : !isSpecificPlot
                      ? `TRIFR Trend Across Plots / Blocks — ${currentPlantName}`
                      : `TRIFR Trend — ${currentPlantName} (${currentPlotName})`}
                  </span>
                </h2>
                <ChartInfoButton
                  title="TRIFR Trend Frequency Rate"
                  whatItShows="Measures the rate of recordable injuries (Fatalities + LTIs + MTCs) per 200,000 workforce safe man-hours."
                  howToRead="Lower is better! A flat line at 0.00 means zero injuries occurred. Upward spikes show months where an incident was logged."
                  target="0.00 (Zero Recordable Incidents)"
                  whyItMatters="Global industry benchmark (OSHA standard) to evaluate if plant injury risks are decreasing over time."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {!isSpecificPlant
                  ? 'Monthly Total Recordable Incident Frequency Rate across all cluster operating units'
                  : !isSpecificPlot
                  ? `Monthly TRIFR progression across individual blocks / plots in ${currentPlantName}`
                  : `Monthly TRIFR rate progression for ${currentPlotName}`}
              </p>
            </div>
            {isSpecificPlant && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto">
                {!isSpecificPlot ? `${trendSeries.length} Plots Tracked` : 'Single Plot Focus'}
              </span>
            )}
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trifrData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-gray-700 pb-1 text-teal-300">
                            Month: {label}
                          </div>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
                              <span className="font-bold font-mono">{p.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {trendSeries.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INCIDENT TYPE DISTRIBUTION PIE CHART */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <TriangleAlert className="w-5 h-5 text-amber-500" />
                  <span>Incident Type Breakdown</span>
                </h2>
                <ChartInfoButton
                  title="Incident Type Distribution"
                  whatItShows="Shows the percentage share of different incident categories logged (First Aid, Medical Treatment, Property Damage, Environmental)."
                  howToRead="Each slice represents an incident category. A larger slice means that category is occurring more frequently."
                  target="Zero severe incidents (MTC / LTI / Fatality)"
                  whyItMatters="Directs site safety training to the specific incident type happening most often."
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Distribution of logged incidents by type category</p>
            </div>
          </div>

          <div className="h-[250px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white p-2.5 rounded-xl text-xs font-semibold shadow-lg">
                            <span style={{ color: payload[0].color }}>{payload[0].name}: </span>
                            <span className="font-bold">{payload[0].value} incidents</span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 italic">No incident category data available</div>
            )}
          </div>
        </div>
      </div>

      {/* HEINRICH SAFETY PYRAMID CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Card Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Cluster YTD Incident Model
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                Heinrich’s Safety Pyramid
              </h2>
              <ChartInfoButton
                title="Heinrich’s Safety Pyramid Model"
                whatItShows="Visualizes the statistical relationship between minor hazards (bottom base) and severe injuries (top apex)."
                howToRead="The base represents proactive hazard reports (Unsafe Acts & Near Misses). The tip represents harm events (LTIs & Fatalities). Zero at the top is the primary objective."
                target="Zero at apex (0 Fatalities, 0 LTIs)"
                whyItMatters="Heinrich's Law proves that proactively finding and closing 300 near misses stops 1 major fatal incident from happening."
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Heinrich's Triangle Theory: Reporting near-misses and unsafe acts at the base prevents severe incidents at the apex.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/50 px-4 py-2 rounded-2xl text-xs text-emerald-200 font-semibold self-start md:self-auto backdrop-blur-md">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Ratio Benchmark: 1 Fatality : 29 LTIs : 300 Near Misses</span>
          </div>
        </div>

        {/* HEINRICH SAFETY PYRAMID DIAGRAM GRID */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-2">
          {/* Left Column: Severity & Descriptions */}
          <div className="lg:col-span-3 space-y-2.5 order-2 lg:order-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Incident Category
            </div>
            {pyramidTiers.map((tier) => (
              <div
                key={tier.id}
                onMouseEnter={() => setActiveHoverTier(tier.id)}
                onMouseLeave={() => setActiveHoverTier(null)}
                className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  activeHoverTier === tier.id
                    ? 'bg-slate-800/90 border-emerald-400/60 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.fill }} />
                  <div className="font-extrabold text-xs text-white truncate">{tier.shortTier}</div>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 pl-5 truncate">{tier.description}</div>
              </div>
            ))}
          </div>

          {/* Center Column: Pristine SVG Isosceles Pyramid Canvas */}
          <div className="lg:col-span-6 flex justify-center items-center relative order-1 lg:order-2">
            <svg
              viewBox="0 0 600 460"
              className="w-full max-w-xl h-auto drop-shadow-2xl filter"
            >
              <defs>
                {pyramidTiers.map((tier) => (
                  <linearGradient key={tier.id} id={`tier-grad-clean-${tier.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={tier.fill} stopOpacity="0.98" />
                    <stop offset="100%" stopColor={tier.fill} stopOpacity="0.85" />
                  </linearGradient>
                ))}
                <filter id="crisp-shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.3" />
                </filter>
              </defs>

              {pyramidTiers.map((tier) => {
                const isHovered = activeHoverTier === tier.id
                return (
                  <g
                    key={tier.id}
                    onMouseEnter={() => setActiveHoverTier(tier.id)}
                    onMouseLeave={() => setActiveHoverTier(null)}
                    className="transition-all duration-300 cursor-pointer group"
                  >
                    {/* Triangle / Trapezoid Polygon Slice */}
                    <polygon
                      points={tier.points}
                      fill={`url(#tier-grad-clean-${tier.id})`}
                      stroke={isHovered ? "#F59E0B" : "#FFFFFF"}
                      strokeWidth={isHovered ? "4" : "2.5"}
                      strokeLinejoin="round"
                      filter="url(#crisp-shadow)"
                      className="transition-all duration-300 transform-gpu origin-center"
                    />

                    {/* Centered Tier Title inside Slice */}
                    <text
                      x="300"
                      y={tier.titleY}
                      textAnchor="middle"
                      fill={tier.textColor}
                      style={{ fontSize: tier.fontSize }}
                      className="font-black select-none tracking-wider uppercase drop-shadow-md"
                    >
                      {tier.tier}
                    </text>

                    {/* Centered Count Pill Badge inside Slice */}
                    <g transform={`translate(300, ${tier.badgeY})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="18"
                        rx="9"
                        fill="rgba(0, 0, 0, 0.45)"
                        stroke={isHovered ? "#F59E0B" : "rgba(255, 255, 255, 0.5)"}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        className="text-[10px] md:text-[11px] font-black select-none tracking-wider"
                      >
                        Count: {tier.count}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* Triangle Top Apex Callout */}
              <text x="300" y="8" textAnchor="middle" fill="#EF4444" className="text-[9px] font-black uppercase tracking-widest">
                ▲ Apex
              </text>
            </svg>
          </div>

          {/* Right Column: Actual YTD Counts & Ratio Model */}
          <div className="lg:col-span-3 space-y-2.5 order-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              YTD Record Count
            </div>
            {pyramidTiers.map((tier) => (
              <div
                key={tier.id}
                onMouseEnter={() => setActiveHoverTier(tier.id)}
                onMouseLeave={() => setActiveHoverTier(null)}
                className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                  activeHoverTier === tier.id
                    ? 'bg-slate-800/90 border-emerald-400/60 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{tier.shortTier}</div>
                  <div className="text-[10px] text-teal-400 font-medium mt-0.5">{tier.targetRatio}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black border shadow-sm ${tier.badge}`}>
                  {tier.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Executive Guidance Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-red-200">
            <strong className="text-red-400 font-bold block mb-1">Apex Tier (Critical Risks):</strong>
            Zero-tolerance controls &amp; immediate stop-work authority for fatal or lost-time hazards.
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-amber-200">
            <strong className="text-amber-400 font-bold block mb-1">Mid Tier (Recordables):</strong>
            Prompt medical care, thorough RCA investigations, and CAPA closure within 48 hours.
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-200">
            <strong className="text-emerald-400 font-bold block mb-1">Base Tier (Proactive):</strong>
            High reporting volume of Near Misses &amp; Unsafe Acts prevents major harm at apex.
          </div>
        </div>
      </div>

      {/* DETAILED INCIDENT LOG TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" /> Master Incident Log
              </h2>
              <ChartInfoButton
                title="Master Incident Log"
                whatItShows="Complete official register of every reported safety incident, date, unit, category, severity rating, and investigation status."
                howToRead="Filter by High, Medium, or Low severity. Check the status badge to ensure investigations and corrective actions are closed."
                target="100% of reported incidents investigated and closed"
                whyItMatters="Thorough investigation ensures lessons are learned so the exact same accident never happens again."
              />
            </div>
            <p className="text-xs text-gray-500">Detailed register of logged safety incidents across cluster plants</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SEVERITY FILTER */}
            <select
              className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2 rounded-xl outline-none cursor-pointer focus:bg-white"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="Low">Low Severity</option>
            </select>

            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchIncident}
                onChange={(e) => setSearchIncident(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs uppercase font-semibold text-gray-400 tracking-wider border-b border-gray-100 pb-2">
                <th className="py-3 px-2">Date</th>
                <th>Plant</th>
                <th>Incident Type</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIncidents.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-2 font-mono text-xs font-semibold text-gray-600">{i.incident_date}</td>
                  <td className="font-bold text-gray-900">{plantName(i.plant_id)}</td>
                  <td className="font-semibold text-gray-800">{i.incident_type}</td>
                  <td>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${i.severity === 'High' ? 'bg-red-100 text-red-700 border border-red-200' : i.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {i.severity} Severity
                    </span>
                  </td>
                  <td>
                    <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${i.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : i.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                    No incident records match your query.
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

