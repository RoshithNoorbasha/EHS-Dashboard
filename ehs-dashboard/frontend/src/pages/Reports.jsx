import { useEffect, useState } from 'react'
import api from '../api'
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PLANTS = ['All', 'Pinnapuram', 'Ghani', 'Chenekapalli', 'Nagalooty']

import FilterBar from '../components/FilterBar'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'

export default function Reports() {
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

  const [activeTab, setActiveTab] = useState('targets') // 'targets' | 'excel'
  const [cluster, setCluster] = useState(null)
  const [plantMetrics, setPlantMetrics] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])

  useEffect(() => {
    api.get('/plants').then((r) => setPlants(r.data)).catch(() => {})
    api.get('/plots').then((r) => setPlots(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { year: selectedYear }
    if (selectedMonth !== 'All') params.month = selectedMonth
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)
    
    // Fetch cluster aggregates
    api.get('/metrics/cluster', { params }).then((r) => setCluster(r.data)).catch(() => {})

    // Fetch metrics for detailed table preview
    api.get('/metrics', { params }).then((r) => {
      setPlantMetrics(r.data || [])
    }).catch(() => {})
  }, [selectedMonth, selectedYear, selectedPlant, selectedPlot])

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`
  const plotName = (id) => plots.find((p) => p.id === id)?.name || 'Overall'

  // Download colorful Excel report from backend
  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true)
      const params = new URLSearchParams()
      if (selectedMonth !== 'All') params.append('month', selectedMonth)
      params.append('year', selectedYear)
      if (selectedPlant !== 'All') params.append('plant', selectedPlant)
      if (selectedPlot !== 'All') params.append('plot', selectedPlot)

      const response = await fetch(`/api/reports/export/excel?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Greenko_EHS_Detailed_Report_${selectedMonth}_${selectedYear}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      alert('Error exporting Excel report: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  // Target Metrics Math & Cards
  const totalSmh = cluster?.safe_man_hours ?? 0
  const fatality = cluster?.fatality ?? 0
  const lti = cluster?.lti ?? 0
  const ptw = cluster?.avg_ptw_compliance ?? 0
  const loto = cluster?.avg_loto_compliance ?? 0
  const stat = cluster?.avg_statutory_compliance ?? 0
  const audit = cluster?.avg_audit_closure ?? 0
  const training = cluster?.training_hours ?? 0

  const targetCards = [
    {
      id: 'fatality',
      title: 'Zero Fatality Target',
      goal: '0 Incident',
      current: `${fatality}`,
      status: fatality === 0 ? 'Target Met' : 'Breached',
      statusType: fatality === 0 ? 'success' : 'danger',
      desc: 'Mandatory zero tolerance safety standard across all cluster units.',
      progress: fatality === 0 ? 100 : 0
    },
    {
      id: 'lti',
      title: 'Zero Lost Time Injury (LTI)',
      goal: '0 Incident',
      current: `${lti}`,
      status: lti === 0 ? 'Target Met' : 'Breached',
      statusType: lti === 0 ? 'success' : 'danger',
      desc: 'Continuous work execution with zero work-disabling injuries.',
      progress: lti === 0 ? 100 : 0
    },
    {
      id: 'manhours',
      title: 'Safe Man-Hours Milestone',
      goal: '5.0M Hours',
      current: `${(totalSmh / 1_000_000).toFixed(2)}M Hours`,
      status: totalSmh >= 3_000_000 ? 'On Track' : 'In Progress',
      statusType: 'success',
      desc: 'Cumulative safe working hours accumulated without LTI.',
      progress: Math.min(100, Math.round((totalSmh / 5_000_000) * 100))
    },
    {
      id: 'ptw',
      title: 'PTW Permit Compliance',
      goal: '≥ 98.0%',
      current: `${ptw.toFixed(1)}%`,
      status: ptw >= 98 ? 'Target Met' : 'Needs Focus',
      statusType: ptw >= 98 ? 'success' : 'warning',
      desc: 'Strict pre-work verification and isolation permits.',
      progress: Math.min(100, ptw)
    },
    {
      id: 'loto',
      title: 'LOTO Standard Compliance',
      goal: '100.0%',
      current: `${loto.toFixed(1)}%`,
      status: loto >= 100 ? 'Target Met' : 'Needs Focus',
      statusType: loto >= 100 ? 'success' : 'warning',
      desc: 'Lockout/Tagout energy isolation compliance across high risk work.',
      progress: Math.min(100, loto)
    },
    {
      id: 'statutory',
      title: 'Statutory & Regulatory Legal',
      goal: '100.0%',
      current: `${stat.toFixed(1)}%`,
      status: stat >= 99 ? 'Target Met' : 'Near Target',
      statusType: stat >= 99 ? 'success' : 'warning',
      desc: 'Full compliance with State and Central environmental & safety laws.',
      progress: Math.min(100, stat)
    },
    {
      id: 'audit',
      title: 'Audit Action Closure Rate',
      goal: '≥ 90.0%',
      current: `${audit.toFixed(1)}%`,
      status: audit >= 90 ? 'Target Met' : 'In Progress',
      statusType: audit >= 90 ? 'success' : 'warning',
      desc: 'On-time resolution of internal and external audit observations.',
      progress: Math.min(100, audit)
    },
    {
      id: 'training',
      title: 'Monthly EHS Training Hours',
      goal: '≥ 1,000 Hrs',
      current: `${training} Hrs`,
      status: training >= 1000 ? 'Target Met' : 'On Track',
      statusType: 'success',
      desc: 'Skill enhancement and safety toolbox talk participation.',
      progress: Math.min(100, Math.round((training / 1000) * 100))
    }
  ]

  const getGradeBadge = (grade) => {
    const g = (grade || '').toUpperCase()
    if (g.includes('PLATINUM')) return 'bg-slate-100 text-slate-800 border-slate-300 font-bold'
    if (g.includes('GOLD')) return 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
    if (g.includes('SILVER')) return 'bg-gray-100 text-gray-800 border-gray-300 font-bold'
    return 'bg-orange-100 text-orange-900 border-orange-300 font-bold'
  }

  return (
    <div className="space-y-6">
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
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" /> Comprehensive EHS Reporting & Target Benchmarks
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Reports &amp; Target Tracking Hub
            </h1>
            <p className="text-emerald-100/70 text-sm mt-1 max-w-xl">
              Export fully formatted, multi-sheet color-coded Excel reports with detailed plant scores, safety indexes, incident registers, and target progression.
            </p>
          </div>

          {/* Interactive Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 shadow-inner">
            {/* Month Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                className="bg-transparent text-white text-xs font-medium focus:ring-0 border-0 cursor-pointer p-0 pr-2"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m === 'All' ? 'All Months (YTD)' : `${m} Month`}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-200">
              <select
                className="bg-transparent text-white text-xs font-medium focus:ring-0 border-0 cursor-pointer p-0 pr-2"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    FY {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Plant Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <select
                className="bg-transparent text-white text-xs font-medium focus:ring-0 border-0 cursor-pointer p-0 pr-2"
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
              >
                {PLANTS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p === 'All' ? 'All Cluster Plants' : `${p} Unit`}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Excel Download Button */}
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 transform hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              {isExporting ? 'Generating Excel...' : 'Download Detailed Excel (.xlsx)'}
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 mt-6 border-t border-emerald-800/60 pt-4">
          <button
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'targets'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-emerald-200/80 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" /> FY Target Tracking & Objectives
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'excel'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-emerald-200/80 hover:bg-white/5 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Monthly Detailed Report Preview ({plantMetrics.length} Rows)
          </button>
        </div>
      </div>

      {/* TAB 1: Target Tracking & Goals */}
      {activeTab === 'targets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {targetCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Goal: {card.goal}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        card.statusType === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : card.statusType === 'warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {card.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{card.title}</h3>
                  <div className="text-2xl font-black text-slate-900 mb-2">{card.current}</div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{card.desc}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Target Progress</span>
                    <span>{card.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        card.statusType === 'danger' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${card.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Target Summary Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" /> Strategic Safety Objectives & Target Benchmarks
                  </h2>
                  <ChartInfoButton
                    title="Annual EHS Safety Targets"
                    whatItShows="Compares current year-to-date cluster performance against the company's annual strategic targets for Zero Fatalities, TRIFR < 0.5, 100% PTW/LOTO compliance, and training hours."
                    howToRead="Green badges indicate goals met or on track. Amber indicates areas needing management focus. Review the progress bar under each metric."
                    target="Zero harm and 100% compliance across all operational targets"
                    whyItMatters="Clear safety benchmarks hold site leaders accountable and ensure continuous improvement throughout the fiscal year."
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cluster-wide key performance indicators mapped against annual EHS targets.
                </p>
              </div>
              <button
                onClick={handleDownloadExcel}
                className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export All Sheets to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">KPI Metric Name</th>
                    <th className="py-3.5 px-4">Target Benchmark</th>
                    <th className="py-3.5 px-4">Current Cluster Value</th>
                    <th className="py-3.5 px-4">Strategic Objective</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetCards.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{t.title}</td>
                      <td className="py-3 px-4 text-slate-600">{t.goal}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.current}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{t.desc}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                            t.statusType === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.statusType === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {t.statusType === 'success' && <CheckCircle2 className="w-3 h-3" />}
                          {t.statusType === 'danger' && <AlertTriangle className="w-3 h-3" />}
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Monthly Report Preview */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" /> Excel Report Data Preview — {selectedMonth} {selectedYear}
                </h2>
                <ChartInfoButton
                  title="Detailed Plant Safety Register"
                  whatItShows="Tabular audit sheet listing individual unit records, incident counts (Fatality, LTI, MTC, FAC), Safe Man-Hours, permit compliance rates, and composite safety index score."
                  howToRead="Check incident counts in red; review compliance percentages and safety scores. Click 'Download Complete Multi-Sheet Excel' for the fully styled Excel workbook."
                  target="Score ≥ 90 (Platinum / Gold grade) with zero recordable incidents"
                  whyItMatters="Serves as the monthly management operating system record for regulatory filings and executive reviews."
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Displaying live plant monthly records. Download the colorful Excel file for full executive formatting.
              </p>
            </div>
            <button
              onClick={handleDownloadExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Complete Multi-Sheet Excel
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-950 text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">{selectedPlant === 'All' ? 'Plant Unit' : 'Plot / Unit'}</th>
                  <th className="py-3 px-2 text-center">Month</th>
                  <th className="py-3 px-2 text-center">Year</th>
                  <th className="py-3 px-2 text-center">Fatality</th>
                  <th className="py-3 px-2 text-center">LTI</th>
                  <th className="py-3 px-2 text-center">MTC</th>
                  <th className="py-3 px-2 text-center">FAC</th>
                  <th className="py-3 px-3 text-right">Safe Man Hours</th>
                  <th className="py-3 px-2 text-center">PTW %</th>
                  <th className="py-3 px-2 text-center">LOTO %</th>
                  <th className="py-3 px-2 text-center">Statutory %</th>
                  <th className="py-3 px-2 text-center">Audit Closure %</th>
                  <th className="py-3 px-2 text-center">Score</th>
                  <th className="py-3 px-3 text-center">Safety Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plantMetrics.length > 0 ? (
                  plantMetrics.map((r, i) => (
                    <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{selectedPlant !== 'All' ? plotName(r.plot_id) : plantName(r.plant_id)}</div>
                        {selectedPlant !== 'All' && <div className="text-[10px] text-teal-600 font-semibold">{plantName(r.plant_id)}</div>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-600">{r.month}</td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-600">{r.year}</td>
                      <td className={`py-2.5 px-2 text-center font-bold ${r.fatality > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{r.fatality}</td>
                      <td className={`py-2.5 px-2 text-center font-bold ${r.lti > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{r.lti}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.mtc}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.fac}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">{r.safe_man_hours?.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.ptw_compliance}%</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.loto_compliance}%</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.statutory_compliance}%</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{r.audit_closure}%</td>
                      <td className="py-2.5 px-2 text-center font-extrabold text-slate-900">{r.total_score}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${getGradeBadge(r.grade)}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-400">
                      No plant metrics records found for {selectedMonth} {selectedYear}. Try changing the month filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
