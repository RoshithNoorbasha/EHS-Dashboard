import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import FilterBar from '../components/FilterBar'
import KpiCard from '../components/KpiCard'
import SafetyIndexModal from '../components/SafetyIndexModal'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'
import {
  Trophy,
  ShieldCheck,
  Clock,
  ClipboardCheck,
  GraduationCap,
  Scale,
  Crown,
  AlertTriangle,
  Eye,
  Footprints,
  SearchCheck,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Flame,
  Users2,
  MessageSquare,
  AlertOctagon,
  LifeBuoy,
  Info,
} from 'lucide-react'

const GRADE_BADGES = {
  Platinum: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
  Gold: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  Silver: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  Bronze: 'bg-red-500/20 text-red-200 border-red-400/40',
}

const TABLE_GRADE_BADGES = {
  Platinum: 'bg-purple-100 text-purple-800 border-purple-200',
  Gold: 'bg-amber-100 text-amber-800 border-amber-200',
  Silver: 'bg-gray-100 text-gray-800 border-gray-200',
  Bronze: 'bg-red-100 text-red-800 border-red-200',
}

export default function Dashboard() {
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

  const [cluster, setCluster] = useState(null)
  const [ranking, setRanking] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    const filters = {
      month: selectedMonth,
      year: selectedYear,
    }
    if (selectedPlant !== 'All') filters.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') filters.plot_id = Number(selectedPlot)

    const issuesParams = {}
    if (selectedPlant !== 'All') issuesParams.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') issuesParams.plot_id = Number(selectedPlot)

    Promise.all([
      api.get('/metrics/cluster', { params: filters }),
      api.get('/metrics/ranking', { params: filters }),
      api.get('/issues/critical', { params: issuesParams }),
    ])
      .then(([c, r, i]) => {
        setCluster(c.data)
        setRanking(r.data)
        setIssues(i.data)
      })
      .finally(() => setLoading(false))
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  const overallScore =
    ranking.length > 0
      ? (ranking.reduce((acc, curr) => acc + curr.score, 0) / ranking.length).toFixed(1)
      : 0

  const overallGrade =
    overallScore >= 90 ? 'Platinum' : overallScore >= 75 ? 'Gold' : overallScore >= 50 ? 'Silver' : 'Bronze'
  const topPlant = ranking.length > 0 ? ranking[0] : null

  const totalUaUc = (cluster?.unsafe_acts ?? 0) + (cluster?.unsafe_conditions ?? 0)

  // Dynamic Header Title based on active scope filter
  let dynamicHeaderTitle = 'Cluster EHS Performance Dashboard'
  if (isPlantSelected && !isPlotSelected) {
    dynamicHeaderTitle = `${currentPlantName} EHS Performance Dashboard`
  } else if (isPlantSelected && isPlotSelected) {
    dynamicHeaderTitle = `${currentPlantName} (${currentPlotName}) EHS Performance Dashboard`
  }

  return (
    <div className="space-y-6">
      <SafetyIndexModal isOpen={safetyModalOpen} onClose={() => setSafetyModalOpen(false)} />

      {/* SCOPE FILTER BAR (PLANT, PLOT, MONTH, YEAR) */}
      <FilterBar
        selectedPlant={selectedPlant}
        setSelectedPlant={setSelectedPlant}
        selectedPlot={selectedPlot}
        setSelectedPlot={setSelectedPlot}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        showPlot={true}
      />

      {/* OVERALL EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-teal-800/40">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {!isPlantSelected
                    ? 'Greenko Kurnool Cluster'
                    : !isPlotSelected
                    ? `Plant Scope: ${currentPlantName}`
                    : `Plot Scope: ${currentPlantName} - ${currentPlotName}`}
                </span>
                <span className="text-xs text-teal-300/80 font-medium">Real-Time Data Feed</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight flex items-center gap-2.5 flex-wrap">
                <span>{dynamicHeaderTitle}</span>
                {isPlantSelected && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Filtered Scope
                  </span>
                )}
              </h1>
              <p className="text-xs md:text-sm text-teal-100/70 mt-0.5 italic">
                "Zero Harm · Zero Fatality · Zero LTI · 100% Statutory Compliance"
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15">
              <span className="text-teal-200 font-bold">Period Active:</span>
              <span className="font-extrabold text-emerald-300">
                {selectedMonth === 'All' ? 'Full YTD' : selectedMonth} {selectedYear}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-200/80">
                  <span>Safety Score Index</span>
                  <button
                    onClick={() => setSafetyModalOpen(true)}
                    title="How Safety Score Index is Evaluated"
                    className="p-1 rounded-full bg-white/10 hover:bg-emerald-500/40 text-teal-200 hover:text-white transition-colors cursor-pointer"
                    aria-label="Safety score evaluation details"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl md:text-4xl font-black text-white">{overallScore}</span>
                  <span className="text-xs text-teal-300">/ 100</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${GRADE_BADGES[overallGrade]}`}>
                    {overallGrade} Grade
                  </span>
                  <span className="text-xs text-teal-200/70">
                    across {ranking.length} {selectedPlant !== 'All' ? 'plots' : 'plants'}
                  </span>
                </div>
                <button
                  onClick={() => setSafetyModalOpen(true)}
                  className="mt-2.5 text-[11px] font-bold text-teal-300 hover:text-white underline underline-offset-2 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>How score is evaluated</span>
                </button>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Trophy className="w-7 h-7" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">Zero Harm Status</div>
                <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  {(cluster?.fatality ?? 0) === 0 && (cluster?.lti ?? 0) === 0 ? 'Zero Harm Maintained' : 'Harm Reported'}
                </div>
                <div className="text-xs text-teal-200/70 mt-1">
                  Fatalities: <strong>{cluster?.fatality ?? 0}</strong> | LTIs: <strong>{cluster?.lti ?? 0}</strong>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">Safe Man-Hours</div>
                <div className="text-2xl font-black text-white mt-1">
                  {((cluster?.safe_man_hours ?? 0) / 1_000_000).toFixed(2)}M
                </div>
                <div className="text-xs text-teal-200/70 mt-1">
                  Cumulative safe working hours
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-200/80">Overall Compliance</div>
                <div className="text-2xl font-black text-emerald-300 mt-1">
                  {cluster?.avg_ptw_compliance ?? 0}%
                </div>
                <div className="text-xs text-teal-200/70 mt-1">
                  Statutory: <strong>{cluster?.avg_statutory_compliance ?? 0}%</strong> · LOTO: <strong>{cluster?.avg_loto_compliance ?? 0}%</strong>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                <ClipboardCheck className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        RE-ORDERED DASHBOARD KPI METRIC CARDS:
        1. NEAR MISS
        2. UNSAFE CONDITION AND UNSAFE ACT (UA/UC)
        3. TRAINING HRS
        4. NO. OF MOCK DRILLS
        5. WALK DOWN COMPLETED
        6. AUDIT EXECUTED
        7. TOOL BOX TALK HRS
        + OHS Committee Meetings & Proactive Highlights
      */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Core EHS Operational &amp; Leading KPIs</span>
            <ChartInfoButton
              title="Core Operational & Leading KPIs"
              whatItShows="Provides a standardized 8-metric proactive health check: Near misses, unsafe acts/conditions (UA/UC), training hours, emergency mock drills, leadership walkdowns, safety audits, daily toolbox talks (TBT), and committee meetings."
              howToRead="Higher numbers in green indicate active reporting and safety participation. High reporting with fast hazard closure demonstrates a proactive workforce."
              target="Consistent proactive engagement across all 8 activities"
              whyItMatters="When proactive activities like drills, walkdowns, and toolbox talks are high, serious accidents drop to zero."
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">Standardized EHS Sequence</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 1. NEAR MISS */}
          <KpiCard
            label="Near Miss"
            value={(cluster?.near_miss ?? 0).toLocaleString()}
            icon={<Eye className="w-6 h-6" />}
            status="good"
            sub="Proactive reporting rate"
          />

          {/* 2. UNSAFE CONDITION & UNSAFE ACT (UA/UC) */}
          <KpiCard
            label="UA / UC Reported"
            value={totalUaUc.toLocaleString()}
            icon={<AlertOctagon className="w-6 h-6" />}
            status={totalUaUc > 0 ? 'warn' : 'good'}
            sub={`UA: ${cluster?.unsafe_acts ?? 0} | UC: ${cluster?.unsafe_conditions ?? 0}`}
          />

          {/* 3. TRAINING HRS */}
          <KpiCard
            label="Training Hrs"
            value={`${(cluster?.training_hours ?? 0).toLocaleString()} hrs`}
            icon={<GraduationCap className="w-6 h-6" />}
            status="good"
            sub={`${cluster?.training_sessions ?? 0} sessions conducted`}
          />

          {/* 4. NO. OF MOCK DRILLS */}
          <KpiCard
            label="No. of Mock Drills"
            value={(cluster?.mock_drills ?? 0).toLocaleString()}
            icon={<Flame className="w-6 h-6" />}
            status="good"
            sub="Emergency preparedness"
          />

          {/* 5. WALK DOWN COMPLETED */}
          <KpiCard
            label="Walk Down Completed"
            value={(cluster?.walkdowns ?? 0).toLocaleString()}
            icon={<Footprints className="w-6 h-6" />}
            status="good"
            sub="Safety leadership walkdowns"
          />

          {/* 6. AUDIT EXECUTED */}
          <KpiCard
            label="Audit Executed"
            value={(cluster?.audits ?? 0).toLocaleString()}
            icon={<SearchCheck className="w-6 h-6" />}
            status="good"
            sub={`Avg Closure: ${cluster?.avg_audit_closure ?? 0}%`}
          />

          {/* 7. TOOL BOX TALK HRS */}
          <KpiCard
            label="Tool Box Talk Hrs"
            value={`${(cluster?.toolbox_talk_hours ?? 0).toLocaleString()} hrs`}
            icon={<MessageSquare className="w-6 h-6" />}
            status="good"
            sub={`${cluster?.toolbox_talks ?? 0} talks delivered`}
          />

          {/* BONUS SUPPORTING: OHS COMMITTEE MEETINGS */}
          <KpiCard
            label="OHS Committee Meeting"
            value={(cluster?.ohs_meetings ?? 0).toLocaleString()}
            icon={<Users2 className="w-6 h-6" />}
            status="good"
            sub="Statutory committee sessions"
          />
        </div>
      </div>

      {/* LEADERBOARD & CRITICAL MANAGEMENT ATTENTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  {selectedPlant === 'All' ? 'Plant Ranking Leaderboard' : 'Plot Ranking Leaderboard'}
                </h2>
                <ChartInfoButton
                  title="Safety Ranking Leaderboard"
                  whatItShows="Ranks plants or individual plots using a composite 100-point safety index combining lagging incident history and proactive leading compliance."
                  howToRead="Units are ranked from 1 (highest score) to last. Scores 90-100 earn Platinum grade, 75-89 earn Gold, 50-74 Silver, and below 50 Bronze."
                  target="≥ 90.0 Score (Platinum Excellence Grade)"
                  whyItMatters="Creates positive accountability and healthy competition among plant teams to maintain top safety standards."
                />
              </div>
              <p className="text-xs text-slate-500">
                Composite safety score weighted by Leading & Lagging performance
              </p>
            </div>
            <Link
              to="/ranking"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              View Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topPlant && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950">
                    #1 Top Performer: {selectedPlant !== 'All' ? topPlant.plot : topPlant.plant}
                  </span>
                  {selectedPlant !== 'All' && (
                    <span className="text-teal-700 ml-1.5 text-[11px] font-semibold">({topPlant.plant})</span>
                  )}
                  <span className="text-emerald-700 ml-2 font-medium">
                    Score: {topPlant.score} / 100 ({topPlant.grade})
                  </span>
                </div>
              </div>
              <span className="font-bold text-emerald-800 bg-emerald-200/60 px-2.5 py-1 rounded-lg">
                Excellence Leader
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="px-3">{selectedPlant === 'All' ? 'Plant Name' : 'Plot Name'}</th>
                  <th className="px-3">Safety Score</th>
                  <th className="px-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((r) => (
                  <tr key={`${r.plant_id}-${r.plot_id || 'all'}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">#{r.rank}</td>
                    <td className="px-3">
                      <div className="font-bold text-slate-900">{selectedPlant !== 'All' ? r.plot : r.plant}</div>
                      {selectedPlant !== 'All' && (
                        <div className="text-[11px] text-teal-600 font-semibold">{r.plant}</div>
                      )}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full ${r.score >= 90
                                ? 'bg-purple-600'
                                : r.score >= 75
                                  ? 'bg-amber-500'
                                  : r.score >= 50
                                    ? 'bg-slate-500'
                                    : 'bg-red-500'
                              }`}
                            style={{ width: `${Math.min(100, r.score)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800">{r.score}</span>
                      </div>
                    </td>
                    <td className="px-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${TABLE_GRADE_BADGES[r.grade] || 'bg-slate-100'
                          }`}
                      >
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No metrics records available for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MANAGEMENT ATTENTION & CRITICAL ISSUES */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Management Attention
                </h2>
                <ChartInfoButton
                  title="Critical Safety Issues & Risks"
                  whatItShows="Highlights outstanding high-priority hazards, audit non-conformances, or unresolved near-miss corrective actions."
                  howToRead="Red badges show High Priority issues. Check assigned owners and due dates. Click 'View Compliance' to open the complete CAPA management log."
                  target="Zero unresolved high-priority issues past their due date"
                  whyItMatters="Unresolved hazards are the root causes of workplace accidents; fast resolution prevents injuries."
                />
              </div>
              <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
                {issues.length} Open Issues
              </span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {issues.slice(0, 5).map((i) => (
                <div
                  key={i.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                      {i.priority} Priority
                    </span>
                    <span className="text-[11px] text-slate-400">{i.status}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{i.issue}</p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Owner: {i.owner || 'Site Lead'}</span>
                    {i.deadline && <span>Due: {i.deadline}</span>}
                  </div>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs italic">
                  No high-priority safety issues outstanding.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/compliance"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Compliance & CAPA Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
