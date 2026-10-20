import { useEffect, useRef, useState } from 'react'
import api from '../api'
import EditMetricModal from '../components/EditMetricModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PlotManagementModal from '../components/PlotManagementModal'
import { useAuth } from '../context/AuthContext'
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  BarChart3,
  UploadCloud,
  PenTool,
  History,
  Search,
  Edit3,
  Trash2,
  FolderUp,
  X,
  AlertCircle,
  MapPin,
  Building2,
  Lock,
  Plus,
  AlertTriangle,
  Flame,
  MessageSquare,
  Users2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import ChartInfoButton from '../components/ChartInfoButton'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FORM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const emptyForm = {
  plant_id: '',
  plot_id: '',
  month: 'Jul',
  year: '2026',
  fatality: '0',
  lti: '0',
  mtc: '0',
  fac: '0',
  safe_man_hours: '0',
  near_miss: '0',
  unsafe_acts: '0',
  unsafe_conditions: '0',
  walkdowns: '0',
  audits: '0',
  training_sessions: '0',
  training_hours: '0',
  toolbox_talks: '0',
  toolbox_talk_hours: '0',
  ohs_meetings: '0',
  mock_drills: '0',
  ptw_compliance: '0',
  loto_compliance: '0',
  statutory_compliance: '0',
  audit_closure: '0',
  fire_safety: '0',
}

export default function DataEntry() {
  const { isReadOnly, isSiteIncharge, assignedPlantIds, canWrite } = useAuth()
  const [activeTab, setActiveTab] = useState('directory')
  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])
  const [metrics, setMetrics] = useState([])
  const [history, setHistory] = useState([])
  const [uploadResult, setUploadResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saveMsg, setSaveMsg] = useState('')
  const [duplicateConflict, setDuplicateConflict] = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  const [showMetricsGuide, setShowMetricsGuide] = useState(false)
  const fileInput = useRef()

  const [filterPlant, setFilterPlant] = useState('All')
  const [filterPlot, setFilterPlot] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  const [filterYear, setFilterYear] = useState('2026')
  const [searchTerm, setSearchTerm] = useState('')

  const [editingMetric, setEditingMetric] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingMetricId, setDeletingMetricId] = useState(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false)
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false)

  // Metrics Bulk Selection & Pagination State
  const [selectedMetricIds, setSelectedMetricIds] = useState([])
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // History Bulk Selection & Pagination State
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([])
  const [isBulkDeleteHistoryOpen, setIsBulkDeleteHistoryOpen] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(10)

  const refreshData = () => {
    api.get('/plants').then((r) => {
      let plantList = r.data
      if (isSiteIncharge && assignedPlantIds.length > 0) {
        plantList = plantList.filter((p) => assignedPlantIds.includes(p.id))
      }
      setPlants(plantList)
      if (plantList.length > 0 && !form.plant_id) {
        setForm((f) => ({ ...f, plant_id: String(plantList[0].id) }))
      }
    })
    api.get('/plots').then((r) => setPlots(r.data))
    api.get('/metrics').then((r) => setMetrics(r.data))
    api.get('/upload/history').then((r) => setHistory(r.data))
  }

  useEffect(() => {
    refreshData()
  }, [isSiteIncharge, JSON.stringify(assignedPlantIds)])

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`
  const plotName = (id) => plots.find((p) => p.id === id)?.name || 'Overall'

  const plotsForSelectedPlant = form.plant_id
    ? plots.filter((p) => p.plant_id === Number(form.plant_id))
    : plots

  const plotsForFilterPlant =
    filterPlant !== 'All' ? plots.filter((p) => p.plant_id === Number(filterPlant)) : plots

  const handleDownloadTemplate = (format) => {
    window.open(`/api/upload/template?format=${format}`, '_blank')
  }

  const handleDownloadTrainingTemplate = (format) => {
    window.open(`/api/upload/template/training?format=${format}`, '_blank')
  }

  const handleUpload = async (e) => {
    if (isReadOnly) {
      alert('Read-only mode: You do not have permission to upload metrics.')
      return
    }
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUploadResult(res.data)
      setActionMsg(`Successfully processed ${res.data.rows_processed} records from ${res.data.filename}.`)
      refreshData()
    } catch (err) {
      setUploadResult({ errors: [err.response?.data?.detail || 'Upload failed'] })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDuplicateConflict(null)
    setSaveMsg('')
  }

  const handleNumberChange = (key, rawValue) => {
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      setForm((f) => ({ ...f, [key]: rawValue }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveMsg('')
    setDuplicateConflict(null)

    if (isReadOnly) {
      alert('Manager role has Read-Only access. Cannot submit new records.')
      return
    }

    try {
      const payload = {
        ...form,
        plant_id: Number(form.plant_id),
        plot_id: form.plot_id ? Number(form.plot_id) : null,
        year: Number(form.year) || 2026,
      }

      numberFields.forEach(([key]) => {
        payload[key] = form[key] === '' ? 0 : Number(form[key]) || 0
      })

      await api.post('/metrics', payload)
      setSaveMsg('Record saved successfully!')
      setActionMsg('New metric record added successfully.')
      setForm((prev) => ({ ...emptyForm, plant_id: prev.plant_id }))
      refreshData()
      setActiveTab('directory')
    } catch (err) {
      const errDetail = err.response?.data?.detail
      if (typeof errDetail === 'string' && errDetail.includes('Duplicate Entry')) {
        // Find existing record for quick edit button
        const matched = metrics.find(
          (m) =>
            m.plant_id === Number(form.plant_id) &&
            (form.plot_id ? m.plot_id === Number(form.plot_id) : !m.plot_id) &&
            m.month === form.month &&
            m.year === (Number(form.year) || 2026)
        )
        setDuplicateConflict({
          message: errDetail,
          record: matched,
        })
      } else {
        setSaveMsg(errDetail ? JSON.stringify(errDetail) : 'Save failed. Please review inputs.')
      }
    }
  }

  const handleOpenEdit = (m) => {
    if (isReadOnly) {
      alert('Manager role is Read-Only. Cannot edit records.')
      return
    }
    setEditingMetric(m)
    setIsEditOpen(true)
  }

  const handleSaveEdit = async (updatedData) => {
    try {
      await api.put(`/metrics/${updatedData.id}`, updatedData)
      setIsEditOpen(false)
      setEditingMetric(null)
      setActionMsg(`Metric #${updatedData.id} updated successfully.`)
      refreshData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Update failed')
    }
  }

  const handleOpenDelete = (id) => {
    if (isReadOnly) {
      alert('Manager role is Read-Only. Cannot delete records.')
      return
    }
    setDeletingMetricId(id)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingMetricId) return
    try {
      await api.delete(`/metrics/${deletingMetricId}`)
      setIsDeleteOpen(false)
      setDeletingMetricId(null)
      setActionMsg('Metric deleted successfully.')
      refreshData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed')
    }
  }

  const handleClearHistory = async () => {
    if (isReadOnly) return
    try {
      await api.delete('/upload/history')
      setIsClearHistoryOpen(false)
      setActionMsg('Upload history cleared successfully.')
      refreshData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Clear history failed')
    }
  }

  const numberFields = [
    ['fatality', 'Fatality'],
    ['lti', 'LTI'],
    ['mtc', 'MTC'],
    ['fac', 'FAC'],
    ['safe_man_hours', 'Safe Man Hours'],
    ['near_miss', 'Near Miss'],
    ['unsafe_acts', 'Unsafe Acts'],
    ['unsafe_conditions', 'Unsafe Conditions'],
    ['walkdowns', 'Walkdowns Completed'],
    ['audits', 'Audits Executed'],
    ['training_sessions', 'Training Sessions'],
    ['training_hours', 'Training Hours'],
    ['toolbox_talks', 'Toolbox Talks Count'],
    ['toolbox_talk_hours', 'Tool Box Talk Hrs'],
    ['ohs_meetings', 'OHS Committee Meetings'],
    ['mock_drills', 'No. of Mock Drills'],
    ['ptw_compliance', 'PTW %'],
    ['loto_compliance', 'LOTO %'],
    ['statutory_compliance', 'Statutory %'],
    ['audit_closure', 'Audit Closure %'],
    ['fire_safety', 'Fire Safety %'],
  ]

  const filteredMetrics = metrics.filter((m) => {
    if (filterPlant !== 'All' && m.plant_id !== Number(filterPlant)) return false
    if (filterPlot !== 'All' && m.plot_id !== Number(filterPlot)) return false
    if (filterMonth !== 'All' && m.month !== filterMonth) return false
    if (filterYear !== 'All' && String(m.year) !== String(filterYear)) return false
    if (searchTerm) {
      const pName = plantName(m.plant_id).toLowerCase()
      const plName = plotName(m.plot_id).toLowerCase()
      const term = searchTerm.toLowerCase()
      if (!pName.includes(term) && !plName.includes(term) && !m.month.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  // Reset pagination & clear selection when metric filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedMetricIds([])
  }, [filterPlant, filterPlot, filterMonth, filterYear, searchTerm, pageSize])

  const totalRecords = filteredMetrics.length
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const paginatedMetrics = filteredMetrics.slice(startIndex, startIndex + pageSize)

  // Metrics bulk selection helpers
  const isAllCurrentPageSelected =
    paginatedMetrics.length > 0 &&
    paginatedMetrics.every((m) => selectedMetricIds.includes(m.id))

  const isSomeCurrentPageSelected =
    paginatedMetrics.some((m) => selectedMetricIds.includes(m.id)) && !isAllCurrentPageSelected

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedMetrics.map((m) => m.id)
      setSelectedMetricIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      const pageIds = paginatedMetrics.map((m) => m.id)
      setSelectedMetricIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleSelectAllFiltered = () => {
    setSelectedMetricIds(filteredMetrics.map((m) => m.id))
  }

  const handleClearSelection = () => {
    setSelectedMetricIds([])
  }

  const handleToggleSelectRow = (id) => {
    setSelectedMetricIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleConfirmBulkDelete = async () => {
    if (isReadOnly || selectedMetricIds.length === 0) return
    setBulkDeleting(true)
    try {
      await api.post('/metrics/bulk-delete', { ids: selectedMetricIds })
      setActionMsg(`Successfully deleted ${selectedMetricIds.length} metric records.`)
      setSelectedMetricIds([])
      setIsBulkDeleteOpen(false)
      refreshData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Bulk delete failed.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Upload History pagination & selection helpers
  const totalHistoryRecords = history.length
  const totalHistoryPages = Math.ceil(totalHistoryRecords / historyPageSize) || 1
  const startHistoryIndex = (historyPage - 1) * historyPageSize
  const paginatedHistory = history.slice(startHistoryIndex, startHistoryIndex + historyPageSize)

  const isAllHistoryPageSelected =
    paginatedHistory.length > 0 &&
    paginatedHistory.every((h) => selectedHistoryIds.includes(h.id))

  const handleToggleSelectAllHistoryPage = () => {
    if (isAllHistoryPageSelected) {
      const pageIds = paginatedHistory.map((h) => h.id)
      setSelectedHistoryIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      const pageIds = paginatedHistory.map((h) => h.id)
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelectHistoryRow = (id) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleConfirmBulkDeleteHistory = async () => {
    if (isReadOnly || selectedHistoryIds.length === 0) return
    try {
      await api.post('/upload/history/bulk-delete', { ids: selectedHistoryIds })
      setActionMsg(`Successfully deleted ${selectedHistoryIds.length} upload audit logs.`)
      setSelectedHistoryIds([])
      setIsBulkDeleteHistoryOpen(false)
      refreshData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Bulk delete history failed.')
    }
  }

  return (
    <div className="space-y-6">
      <PlotManagementModal
        isOpen={isPlotModalOpen}
        onClose={() => setIsPlotModalOpen(false)}
        onPlotUpdated={refreshData}
      />

      <EditMetricModal
        isOpen={isEditOpen}
        metric={editingMetric}
        plants={plants}
        onClose={() => {
          setIsEditOpen(false)
          setEditingMetric(null)
        }}
        onSave={handleSaveEdit}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        title="Delete Metric Record"
        message="Are you sure you want to delete this monthly metric record? This action cannot be undone."
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDeleteModal
        isOpen={isClearHistoryOpen}
        title="Clear Upload History"
        message="Are you sure you want to clear all upload logs? Past uploaded records in metrics will remain intact."
        onClose={() => setIsClearHistoryOpen(false)}
        onConfirm={handleClearHistory}
      />

      {/* BULK DELETE METRICS MODAL */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteOpen}
        title={`Bulk Delete ${selectedMetricIds.length} Metric Records`}
        message={`Are you sure you want to permanently delete these ${selectedMetricIds.length} selected monthly metric records? All their scores and rates will be removed. This cannot be undone.`}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* BULK DELETE UPLOAD HISTORY MODAL */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteHistoryOpen}
        title={`Bulk Delete ${selectedHistoryIds.length} Upload Audit Logs`}
        message={`Are you sure you want to permanently delete these ${selectedHistoryIds.length} selected upload history records? Metrics already in the system will not be affected.`}
        onClose={() => setIsBulkDeleteHistoryOpen(false)}
        onConfirm={handleConfirmBulkDeleteHistory}
      />

      {/* READ-ONLY BANNER FOR MANAGER */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Manager Mode (Read-Only Access):</span>
              <span className="ml-1 text-amber-800">
                You have comprehensive read-only visibility for all plants and plots. Metric additions, edits, and file uploads are disabled.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/80 font-bold uppercase text-[10px]">Read-Only</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white p-6 shadow-xl border border-teal-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1.5">
                <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
                Data & Operations Center
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">EHS Metrics Data Management</h1>
            <p className="text-xs text-teal-100/70 mt-0.5">
              Input plot-wise and plant-wide EHS metrics, upload bulk Excel/CSV datasets, or inspect audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlotModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-800/80 hover:bg-teal-700 text-white border border-teal-600/40 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <MapPin className="w-4 h-4 text-teal-300" />
              <span>Manage Plots</span>
            </button>
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="flex items-center gap-2 pt-6 border-t border-white/10 mt-5">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-teal-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Metrics Directory ({metrics.length})</span>
          </button>

          {!isReadOnly && (
            <>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'manual'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-teal-200/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span>Single Data Entry</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-teal-200/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Bulk Excel / CSV Upload</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-teal-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Upload History</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg('')} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ----------------- TAB 1: METRICS DIRECTORY ----------------- */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">Recorded Monthly EHS Metrics</h2>
                <ChartInfoButton
                  title="Monthly EHS Metrics Directory"
                  whatItShows="Tabular database of all monthly safety performance numbers, incident counts, safe man-hours, and compliance ratings."
                  howToRead="Search, filter by plant, plot, month, or year. Select rows using checkboxes for bulk delete actions, or click the edit/delete icon on individual rows."
                  target="100% timely data entry for all operational plots"
                  whyItMatters="Accurate monthly entries form the foundation for all executive dashboards, safety grades, and OSHA rates."
                />
              </div>
              <p className="text-xs text-slate-500">Filter, search, inspect, or edit monthly performance entries ({totalRecords} filtered)</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search plant, plot, month..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 w-48"
                />
              </div>

              <select
                value={filterPlant}
                onChange={(e) => {
                  setFilterPlant(e.target.value)
                  setFilterPlot('All')
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {!isSiteIncharge && <option value="All">All Plants</option>}
                {plants.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={filterPlot}
                onChange={(e) => setFilterPlot(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="All">All Plots</option>
                {plotsForFilterPlant.map((pl) => (
                  <option key={pl.id} value={String(pl.id)}>
                    {pl.name}
                  </option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Months' : m}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Years</option>
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BULK ACTIONS SELECTION BANNER */}
          {selectedMetricIds.length > 0 && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 font-bold shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>
                  {selectedMetricIds.length} of {totalRecords} records selected
                </span>
                {selectedMetricIds.length < totalRecords && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-emerald-700 underline hover:text-emerald-900 ml-1 cursor-pointer font-semibold"
                  >
                    Select all {totalRecords} filtered records
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer text-xs"
                >
                  Clear Selection
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedMetricIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left min-w-[950px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  {!isReadOnly && (
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleToggleSelectAllCurrentPage}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Select/Deselect all on this page"
                      />
                    </th>
                  )}
                  <th className="py-3 px-3">Scope (Plant / Plot)</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Score & Grade</th>
                  <th className="py-3 px-3">Near Miss</th>
                  <th className="py-3 px-3">UA / UC</th>
                  <th className="py-3 px-3">Training Hrs</th>
                  <th className="py-3 px-3">Mock Drills</th>
                  <th className="py-3 px-3">TBT Talk Hrs</th>
                  <th className="py-3 px-3">OHS Meetings</th>
                  <th className="py-3 px-3">PTW %</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMetrics.map((m) => {
                  const isSelected = selectedMetricIds.includes(m.id)
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      {!isReadOnly && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(m.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{plantName(m.plant_id)}</div>
                        <div className="text-[11px] text-teal-700 font-semibold">{plotName(m.plot_id)}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {m.month} {m.year}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{m.total_score}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-bold border">
                            {m.grade}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">{m.near_miss}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className="text-amber-700">{m.unsafe_acts}</span> / <span className="text-rose-700">{m.unsafe_conditions}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">{m.training_hours}h</td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-700">{m.mock_drills || 0}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-teal-700">{m.toolbox_talk_hours || 0}h</td>
                      <td className="py-3 px-3 font-mono font-semibold text-purple-700">{m.ohs_meetings || 0}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-700">{m.ptw_compliance}%</td>
                      <td className="py-3 px-3 text-right space-x-1">
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(m.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isReadOnly && (
                          <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded">
                            View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedMetrics.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                      No metric records match your active filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DETAILED PAGINATION CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-slate-600 border-t border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <strong className="text-slate-900">{totalRecords > 0 ? startIndex + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(startIndex + pageSize, totalRecords)}</strong> of{' '}
                <strong className="text-slate-900">{totalRecords}</strong> records
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 font-medium">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2 py-1 rounded-lg outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Prev</span>
              </button>

              {/* Page number buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <div key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === p
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                title="Next Page"
              >
                <span className="hidden sm:inline text-xs font-semibold">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MANUAL SINGLE DATA ENTRY ----------------- */}
      {activeTab === 'manual' && !isReadOnly && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Monthly EHS Metric Entry</h2>
              <p className="text-xs text-slate-500">Record proactive safety, training, mock drills, and compliance metrics</p>
            </div>
            <span className="text-xs text-rose-500 font-semibold">* Duplicate plant/plot entries for the same month/year are prevented.</span>
          </div>

          {/* DUPLICATE CONFLICT WARNING */}
          {duplicateConflict && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>{duplicateConflict.message}</span>
              </div>
              <p className="text-amber-800">
                To prevent duplicate entries throughout the months, please modify the existing entry instead of adding a new one.
              </p>
              {duplicateConflict.record && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(duplicateConflict.record)}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Existing Record #{duplicateConflict.record.id}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {saveMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800">
              {saveMsg}
            </div>
          )}

          {/* SCOPE SELECTION (Plant, Plot, Month, Year) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Record Scope & Period</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Plant *</label>
                <select
                  required
                  value={form.plant_id}
                  onChange={(e) => {
                    handleChange('plant_id', e.target.value)
                    handleChange('plot_id', '')
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {plants.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Plot Section (Optional)</label>
                <select
                  value={form.plot_id}
                  onChange={(e) => handleChange('plot_id', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Overall Plant Level (No specific plot)</option>
                  {plotsForSelectedPlant.map((pl) => (
                    <option key={pl.id} value={String(pl.id)}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Reporting Month *</label>
                <select
                  value={form.month}
                  onChange={(e) => handleChange('month', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {FORM_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Reporting Year *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => handleNumberChange('year', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>
            </div>
          </div>

          {/* METRIC GROUPS */}
          <div className="space-y-4">
            {/* 1. Proactive Safety & Operations */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Leading & Operational Safety (Ordered Sequence)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">1. Near Miss</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.near_miss}
                    onChange={(e) => handleNumberChange('near_miss', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">2. Unsafe Acts (UA)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.unsafe_acts}
                    onChange={(e) => handleNumberChange('unsafe_acts', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">2. Unsafe Cond. (UC)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.unsafe_conditions}
                    onChange={(e) => handleNumberChange('unsafe_conditions', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">3. Training Hrs</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.training_hours}
                    onChange={(e) => handleNumberChange('training_hours', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">4. No. of Mock Drills</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.mock_drills}
                    onChange={(e) => handleNumberChange('mock_drills', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">5. Walk Down Completed</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.walkdowns}
                    onChange={(e) => handleNumberChange('walkdowns', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">6. Audit Executed</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.audits}
                    onChange={(e) => handleNumberChange('audits', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">7. Tool Box Talk Hrs</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.toolbox_talk_hours}
                    onChange={(e) => handleNumberChange('toolbox_talk_hours', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">OHS Committee Meeting</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.ohs_meetings}
                    onChange={(e) => handleNumberChange('ohs_meetings', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Toolbox Talks Count</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.toolbox_talks}
                    onChange={(e) => handleNumberChange('toolbox_talks', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Lagging & Safe Hours */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span>Lagging Incidents & Safe Man-Hours</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Fatality</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.fatality}
                    onChange={(e) => handleNumberChange('fatality', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">LTI</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.lti}
                    onChange={(e) => handleNumberChange('lti', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">MTC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.mtc}
                    onChange={(e) => handleNumberChange('mtc', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">FAC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.fac}
                    onChange={(e) => handleNumberChange('fac', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Safe Man Hours</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.safe_man_hours}
                    onChange={(e) => handleNumberChange('safe_man_hours', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Compliance Rates */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Compliance & Verification Rates (%)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">PTW Compliance %</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.ptw_compliance}
                    onChange={(e) => handleNumberChange('ptw_compliance', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">LOTO Compliance %</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.loto_compliance}
                    onChange={(e) => handleNumberChange('loto_compliance', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Statutory Compliance %</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.statutory_compliance}
                    onChange={(e) => handleNumberChange('statutory_compliance', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Audit Closure %</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.audit_closure}
                    onChange={(e) => handleNumberChange('audit_closure', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">Fire Safety %</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.fire_safety}
                    onChange={(e) => handleNumberChange('fire_safety', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Metric Record</span>
            </button>
          </div>
        </form>
      )}

      {/* ----------------- TAB 3: BULK UPLOAD ----------------- */}
      {activeTab === 'upload' && !isReadOnly && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">Bulk Data Ingestion (Excel / CSV)</h2>
              <ChartInfoButton
                title="Bulk EHS Data Ingestion"
                whatItShows="Allows uploading multi-plot monthly metrics and safety training registers in bulk via Excel (.xlsx) or CSV."
                howToRead="Download template #1 for Monthly Metrics or template #2 for Training Logs. Fill in data and drag/upload into slot #3. The system validates entries automatically."
                target="Zero upload validation errors"
                whyItMatters="Saves hours of repetitive manual data entry across extensive multi-plot renewable energy clusters."
              />
            </div>
            <p className="text-xs text-slate-500">
              Download standard cluster templates, fill in your monthly plot-wise numbers, and upload for automatic grading and validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>1. EHS Monthly Metrics</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Standard scorecard template: Near Miss, UA/UC, Safe Hours, Mock Drills, TBT Talk Hrs, OHS Meetings, PTW, and Compliance.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleDownloadTemplate('excel')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleDownloadTemplate('csv')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>2. Safety Training Matrix</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Training sessions format: Topic, Category, Trainer, Regular & Contractor attendees, Hours, and Man-Hours.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleDownloadTrainingTemplate('excel')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleDownloadTrainingTemplate('csv')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <UploadCloud className="w-5 h-5 text-teal-600" />
                  <span>3. Upload Data Sheet</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Auto-detects metrics vs. safety training sessions. Existing monthly records will be updated automatically.
                </p>
              </div>
              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInput}
                  onChange={handleUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="metric-file-upload"
                />
                <label
                  htmlFor="metric-file-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs ${
                    uploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Processing File...' : 'Select File to Upload'}</span>
                </label>
              </div>
            </div>
          </div>

          {uploadResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                uploadResult.errors?.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                {uploadResult.errors?.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Upload Report for {uploadResult.filename}</span>
              </div>
              <div>Processed records: <strong>{uploadResult.rows_processed || 0}</strong></div>
              {uploadResult.errors?.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-rose-800">
                  {uploadResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 4: UPLOAD HISTORY ----------------- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">Upload & Ingestion Audit Trail</h2>
                <ChartInfoButton
                  title="Upload Ingestion Audit Log"
                  whatItShows="Audit ledger recording every batch file upload, timestamp, records count, and processing status (Success, Partial, or Failed)."
                  howToRead="Use checkboxes to select log entries for bulk deletion, or click 'Clear History Logs' to purge the audit ledger. Underlying metric records remain unaffected."
                  target="100% successful ingestion runs"
                  whyItMatters="Provides traceability to verify who uploaded which data file and when."
                />
              </div>
              <p className="text-xs text-slate-500">Historical records of uploaded datasets and rows processed ({totalHistoryRecords} total)</p>
            </div>
            {!isReadOnly && history.length > 0 && (
              <button
                onClick={() => setIsClearHistoryOpen(true)}
                className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History Logs</span>
              </button>
            )}
          </div>

          {/* BULK ACTIONS SELECTION BANNER FOR HISTORY */}
          {selectedHistoryIds.length > 0 && (
            <div className="p-3 bg-teal-50/90 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950 font-bold shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                <span>{selectedHistoryIds.length} of {totalHistoryRecords} logs selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryIds([])}
                  className="px-3 py-1.5 rounded-xl border border-teal-300 bg-white hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer text-xs"
                >
                  Clear Selection
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteHistoryOpen(true)}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected Logs ({selectedHistoryIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  {!isReadOnly && (
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllHistoryPageSelected}
                        onChange={handleToggleSelectAllHistoryPage}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Select/Deselect all on this page"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Detected Type</th>
                  <th className="py-3 px-4">Rows Processed</th>
                  <th className="py-3 px-4">Upload Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistory.map((h) => {
                  const isSelected = selectedHistoryIds.includes(h.id)
                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      {!isReadOnly && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectHistoryRow(h.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-bold text-slate-900">{h.filename}</td>
                      <td className="py-3 px-4 text-slate-600">{h.file_type}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">{h.rows_processed}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {h.upload_date ? new Date(h.upload_date).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {paginatedHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No upload history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DETAILED PAGINATION CONTROLS FOR HISTORY */}
          {totalHistoryRecords > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Showing <strong className="text-slate-900">{totalHistoryRecords > 0 ? startHistoryIndex + 1 : 0}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(startHistoryIndex + historyPageSize, totalHistoryRecords)}</strong> of{' '}
                  <strong className="text-slate-900">{totalHistoryRecords}</strong> logs
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500 font-medium">Rows:</span>
                  <select
                    value={historyPageSize}
                    onChange={(e) => {
                      setHistoryPageSize(Number(e.target.value))
                      setHistoryPage(1)
                    }}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setHistoryPage(1)}
                  disabled={historyPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setHistoryPage((p) => Math.max(p - 1, 1))}
                  disabled={historyPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-semibold">Prev</span>
                </button>

                {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalHistoryPages || Math.abs(p - historyPage) <= 1)
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
                      <button
                        onClick={() => setHistoryPage(p)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          historyPage === p
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}

                <button
                  onClick={() => setHistoryPage((p) => Math.min(p + 1, totalHistoryPages))}
                  disabled={historyPage === totalHistoryPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                  title="Next Page"
                >
                  <span className="hidden sm:inline text-xs font-semibold">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setHistoryPage(totalHistoryPages)}
                  disabled={historyPage === totalHistoryPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
