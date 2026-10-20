import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  X,
  ShieldAlert,
  Clock,
  Filter,
  Check,
  Building2,
  Calendar,
  User,
} from 'lucide-react'
import api from '../api'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const AREAS = [
  { key: 'ptw_compliance', label: 'PTW Compliance' },
  { key: 'loto_compliance', label: 'LOTO Compliance' },
  { key: 'statutory_compliance', label: 'Statutory Compliance' },
  { key: 'audit_closure', label: 'Audit Closure' },
  { key: 'fire_safety', label: 'Fire Safety' },
]

function cellColor(v) {
  if (v >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
  if (v >= 75) return 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
  return 'bg-red-100 text-red-800 border-red-300 font-bold'
}

import FilterBar from '../components/FilterBar'
import ChartInfoButton from '../components/ChartInfoButton'
import { useFilter } from '../context/FilterContext'

export default function Compliance() {
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

  const [rows, setRows] = useState([])
  const [issues, setIssues] = useState([])
  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Active')

  // Modal & Form State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newIssue, setNewIssue] = useState({
    plant_id: '',
    plot_id: '',
    issue: '',
    priority: 'High',
    owner: '',
    deadline: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const refreshData = () => {
    const params = { month: selectedMonth, year: selectedYear }
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)

    const issueParams = {}
    if (selectedPlant !== 'All') issueParams.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') issueParams.plot_id = Number(selectedPlot)

    api.get('/compliance', { params }).then((r) => setRows(r.data))
    api.get('/issues', { params: issueParams }).then((r) => setIssues(r.data))
    api.get('/plants').then((r) => {
      setPlants(r.data)
      if (r.data.length > 0 && !newIssue.plant_id) {
        setNewIssue((prev) => ({ ...prev, plant_id: String(r.data[0].id) }))
      }
    })
    api.get('/plots').then((r) => setPlots(r.data))
  }

  useEffect(() => {
    refreshData()
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`

  // Status Change Handler
  const handleUpdateStatus = async (issueId, newStatus) => {
    try {
      await api.patch(`/issues/${issueId}/status`, null, { params: { status: newStatus } })
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      )
    } catch (err) {
      alert('Failed to update issue status.')
    }
  }

  // Delete Issue Handler
  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this safety issue?')) return
    try {
      await api.delete(`/issues/${issueId}`)
      setIssues((prev) => prev.filter((i) => i.id !== issueId))
    } catch (err) {
      alert('Failed to delete issue.')
    }
  }

  // Add Issue Form Submission
  const handleCreateIssue = async (e) => {
    e.preventDefault()
    if (!newIssue.plant_id || !newIssue.issue) {
      alert('Please fill out Plant and Issue description.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/issues', {
        ...newIssue,
        plant_id: Number(newIssue.plant_id),
        status: 'Open',
      })
      setIssues((prev) => [res.data, ...prev])
      setIsAddOpen(false)
      setNewIssue({ plant_id: '', issue: '', priority: 'High', owner: '', deadline: '' })
    } catch (err) {
      alert('Failed to add issue: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Issues
  const filteredIssues = issues.filter((i) => {
    const matchesSearch =
      i.issue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plantName(i.plant_id).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = priorityFilter === 'All' || i.priority === priorityFilter
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Active'
        ? i.status !== 'Closed'
        : i.status === statusFilter

    return matchesSearch && matchesPriority && matchesStatus
  })

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 text-white p-6 md:p-8 shadow-2xl border border-teal-800/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Statutory &amp; Safety Compliance
                </span>
                <span className="text-xs text-teal-200/70 font-medium">Real-Time Action Tracker</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                Compliance &amp; Safety Issue Management
              </h1>
              <p className="text-xs md:text-sm text-teal-100/70 mt-0.5">
                Monitor plant compliance heatmaps, manage open safety issues, and assign corrective action deadlines
              </p>
            </div>

            {/* PERIOD FILTERS & ADD ISSUE BUTTON */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setIsAddOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Safety Issue
              </button>

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
                <select
                  className="bg-teal-950/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-700/50 outline-none cursor-pointer hover:bg-teal-900 transition-colors"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m === 'All' ? 'All Months (YTD)' : `Month: ${m}`}</option>
                  ))}
                </select>
                <select
                  className="bg-teal-950/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-700/50 outline-none cursor-pointer hover:bg-teal-900 transition-colors"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLIANCE HEATMAP CARD */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Plant Compliance Heatmap
              </h2>
              <ChartInfoButton
                title="Compliance Heatmap Matrix"
                whatItShows="Shows compliance percentages across 5 critical EHS statutory & operational domains: PTW (Permit to Work), LOTO (Lockout/Tagout), Statutory licenses, Audit closure, and Fire Safety."
                howToRead="Green boxes (≥90%) mean full adherence. Amber (75-89%) indicates moderate compliance needing attention. Red (<75%) represents immediate regulatory and injury risk."
                target="≥ 90% across all 5 compliance categories"
                whyItMatters="Failing statutory or permit requirements can shut down plant operations and lead to fatal electrical or mechanical accidents."
              />
            </div>
            <p className="text-xs text-gray-500">Adherence percentage across 5 core EHS compliance areas</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> 90%+ Optimal</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400"></span> 75-89% Moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> &lt;75% Risk</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-left text-xs uppercase font-semibold text-gray-400 tracking-wider border-b border-gray-100 pb-2">
                <th className="py-3 px-2">{selectedPlant === 'All' ? 'Plant Name' : 'Plot Name'}</th>
                {AREAS.map((a) => (
                  <th key={a.key} className="text-center px-2">{a.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={`${r.plant_id}-${r.plot_id || 'all'}`} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-2">
                    <div className="font-bold text-gray-900">{selectedPlant !== 'All' ? r.plot : r.plant}</div>
                    {selectedPlant !== 'All' && (
                      <div className="text-[11px] text-teal-600 font-semibold">{r.plant}</div>
                    )}
                  </td>
                  {AREAS.map((a) => (
                    <td key={a.key} className="text-center px-2">
                      <span className={`px-2.5 py-1 text-xs rounded-lg border ${cellColor(r[a.key])}`}>
                        {r[a.key]}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN COMPLIANCE ISSUES MANAGEMENT */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> Open Compliance &amp; Safety Issues
              </h2>
              <ChartInfoButton
                title="Open Safety Issues & CAPA Tracker"
                whatItShows="Live log of identified non-conformances, near-miss action items, and safety hazards requiring corrective and preventive action (CAPA)."
                howToRead="Issues are color-coded by priority (Red for High, Amber for Medium). Track owners, deadlines, and toggle statuses between Open, In Progress, and Closed."
                target="100% resolution within designated deadline"
                whyItMatters="Closing safety issues promptly eliminates known workplace hazards before an employee gets injured."
              />
            </div>
            <p className="text-xs text-gray-500">Track, update, and resolve non-compliances and action items</p>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2 rounded-xl outline-none cursor-pointer focus:bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Active">Active Issues Only</option>
              <option value="All">All Issues (inc. Closed)</option>
              <option value="Open">Open Only</option>
              <option value="In Progress">In Progress Only</option>
              <option value="Closed">Closed Only</option>
            </select>

            <select
              className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 px-3 py-2 rounded-xl outline-none cursor-pointer focus:bg-white"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search issues…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* ISSUES LIST */}
        <div className="space-y-3">
          {filteredIssues.map((i) => (
            <div
              key={i.id}
              className={`p-4 rounded-2xl border transition-all space-y-2 ${
                i.status === 'Closed'
                  ? 'bg-gray-50/60 border-gray-200 opacity-75'
                  : i.priority === 'High'
                  ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                  : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      i.priority === 'High'
                        ? 'text-red-500'
                        : i.priority === 'Medium'
                        ? 'text-amber-500'
                        : 'text-yellow-600'
                    }`}
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-sm">{i.issue}</span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          i.priority === 'High'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : i.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}
                      >
                        {i.priority} Priority
                      </span>
                      {i.plant_id && (
                        <span className="text-xs bg-white text-gray-700 font-semibold px-2.5 py-0.5 rounded-full border border-gray-200">
                          {plantName(i.plant_id)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-0.5">
                      <span>Owner: <strong className="text-gray-800">{i.owner || 'Unassigned'}</strong></span>
                      <span>Target Deadline: <strong className="text-gray-800">{i.deadline || '—'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE STATUS ACTIONS */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-2xs text-xs font-semibold">
                    <button
                      onClick={() => handleUpdateStatus(i.id, 'Open')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        i.status === 'Open' ? 'bg-red-500 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(i.id, 'In Progress')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        i.status === 'In Progress' ? 'bg-blue-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(i.id, 'Closed')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        i.status === 'Closed' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Closed
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteIssue(i.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Issue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No safety issues match your filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* ADD SAFETY ISSUE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" /> Log New Safety Issue
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Plant</label>
                <select
                  required
                  className="w-full border rounded-xl p-2.5 bg-gray-50 text-xs font-semibold outline-none focus:bg-white focus:border-emerald-500"
                  value={newIssue.plant_id}
                  onChange={(e) => setNewIssue({ ...newIssue, plant_id: e.target.value })}
                >
                  <option value="">Select Operating Plant…</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Issue Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. LOTO procedure gap identified during inverter maintenance…"
                  className="w-full border rounded-xl p-2.5 bg-gray-50 text-xs outline-none focus:bg-white focus:border-emerald-500"
                  value={newIssue.issue}
                  onChange={(e) => setNewIssue({ ...newIssue, issue: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Priority Level</label>
                  <select
                    className="w-full border rounded-xl p-2.5 bg-gray-50 text-xs font-semibold outline-none focus:bg-white"
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Target Deadline</label>
                  <input
                    type="date"
                    className="w-full border rounded-xl p-2.5 bg-gray-50 text-xs outline-none focus:bg-white"
                    value={newIssue.deadline}
                    onChange={(e) => setNewIssue({ ...newIssue, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Assigned Owner / Lead</label>
                <input
                  type="text"
                  placeholder="e.g. Plant EHS Officer"
                  className="w-full border rounded-xl p-2.5 bg-gray-50 text-xs outline-none focus:bg-white"
                  value={newIssue.owner}
                  onChange={(e) => setNewIssue({ ...newIssue, owner: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow"
                >
                  {submitting ? 'Creating…' : 'Save Safety Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

