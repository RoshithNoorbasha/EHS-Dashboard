import { useEffect, useRef, useState } from 'react'
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
  GraduationCap,
  BookOpen,
  Users,
  UserCheck,
  Clock,
  Award,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  UploadCloud,
  AlertCircle,
  Filter,
  Check,
  ShieldCheck,
  LifeBuoy,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  LayoutDashboard,
  Table,
  Target,
  FileText,
  AlertTriangle,
  Printer,
  FileCheck,
  BarChart3,
  Layers,
} from 'lucide-react'
import api from '../api'
import FilterBar from '../components/FilterBar'
import ChartInfoButton from '../components/ChartInfoButton'
import { useAuth } from '../context/AuthContext'
import { useFilter } from '../context/FilterContext'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const CATEGORIES = [
  'All',
  'Mandatory EHS',
  'Toolbox Talk',
  'EHS Induction',
  'Theme-Based / OEM Advance',
  'Emergency & Mock Drill',
]

const CATEGORY_STYLES = {
  'Mandatory EHS': 'bg-blue-100 text-blue-800 border-blue-200',
  'Toolbox Talk': 'bg-amber-100 text-amber-800 border-amber-200',
  'EHS Induction': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Theme-Based / OEM Advance': 'bg-purple-100 text-purple-800 border-purple-200',
  'Emergency & Mock Drill': 'bg-rose-100 text-rose-800 border-rose-200',
}

export default function Trainings() {
  const { canWrite, isReadOnly } = useAuth()
  const {
    selectedPlant,
    setSelectedPlant,
    selectedPlot,
    setSelectedPlot,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
  } = useFilter()

  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState('overview') // 'overview' | 'matrix' | 'competency' | 'reports' | 'manual' | 'upload'

  // Data state
  const [trainings, setTrainings] = useState([])
  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [actionNotice, setActionNotice] = useState('')

  // Detailed Pagination for Matrix Table
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Detailed Pagination for Competency Table
  const [competencyPage, setCompetencyPage] = useState(1)
  const [competencyPageSize, setCompetencyPageSize] = useState(10)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    plant_id: '',
    plot_id: '',
    training_date: new Date().toISOString().split('T')[0],
    topic: '',
    category: 'Mandatory EHS',
    trainer: 'Site EHS Lead',
    regular_attendees: 5,
    contractor_attendees: 15,
    hours: 2.0,
    remarks: '',
  })
  const [modalSubmitting, setModalSubmitting] = useState(false)

  // Load plants and plots
  useEffect(() => {
    api.get('/plants').then((r) => setPlants(r.data)).catch(() => {})
    api.get('/plots').then((r) => setPlots(r.data)).catch(() => {})
  }, [])

  const fetchTrainings = () => {
    const params = { year: selectedYear }
    if (selectedMonth !== 'All') params.month = selectedMonth
    if (selectedPlant !== 'All') params.plant_id = Number(selectedPlant)
    if (selectedPlot !== 'All') params.plot_id = Number(selectedPlot)

    api.get('/training', { params }).then((r) => {
      setTrainings(r.data || [])
    }).catch(() => {})
  }

  useEffect(() => {
    fetchTrainings()
    setCurrentPage(1)
    setCompetencyPage(1)
  }, [selectedPlant, selectedPlot, selectedMonth, selectedYear])

  // Reset pagination on search or category filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  const isPlantSelected = selectedPlant !== 'All'
  const currentPlantName = plants.find((p) => String(p.id) === String(selectedPlant))?.name || 'Selected Plant'
  const currentPlotName = plots.find((p) => String(p.id) === String(selectedPlot))?.name || 'Selected Plot'

  const plantName = (id) => plants.find((p) => p.id === id)?.name || `Plant #${id}`
  const plotName = (id) => plots.find((p) => p.id === id)?.name || 'General Plot'

  // Summary Metrics Aggregations
  const totalSessions = trainings.length
  const totalRegular = trainings.reduce((acc, curr) => acc + (curr.regular_attendees || 0), 0)
  const totalContractor = trainings.reduce((acc, curr) => acc + (curr.contractor_attendees || 0), 0)
  const totalParticipants = totalRegular + totalContractor
  const totalManHours = Math.round(trainings.reduce((acc, curr) => acc + (curr.man_hours || 0), 0))
  const totalTbtSessions = trainings.filter((t) => t.category === 'Toolbox Talk').length
  const totalInductions = trainings.filter((t) => t.category === 'EHS Induction').length
  const totalAdvance = trainings.filter((t) => t.category === 'Theme-Based / OEM Advance').length
  const contractorPercent = totalParticipants > 0 ? Math.round((totalContractor / totalParticipants) * 100) : 0
  const targetHours = 300
  const pctTarget = Math.round((totalManHours / targetHours) * 100)

  // Filtered Training Log
  const filteredTrainings = trainings.filter((t) => {
    const matchesSearch =
      (t.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.trainer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      plantName(t.plant_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      plotName(t.plot_id).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Matrix Pagination Calculations
  const totalMatrixRecords = filteredTrainings.length
  const totalMatrixPages = Math.ceil(totalMatrixRecords / pageSize) || 1
  const startMatrixIndex = (currentPage - 1) * pageSize
  const paginatedTrainings = filteredTrainings.slice(startMatrixIndex, startMatrixIndex + pageSize)

  // Bar chart by plot or plant
  const chartMap = {}
  trainings.forEach((t) => {
    const key = isPlantSelected ? (t.plot_id ? plotName(t.plot_id) : 'General Area') : plantName(t.plant_id)
    if (!chartMap[key]) {
      chartMap[key] = {
        name: key,
        'Regular Man-Hours': 0,
        'Contractor Man-Hours': 0,
        'Total Man-Hours': 0,
        target: 300,
      }
    }
    const regMh = Math.round((t.regular_attendees || 0) * (t.hours || 1))
    const conMh = Math.round((t.contractor_attendees || 0) * (t.hours || 1))
    chartMap[key]['Regular Man-Hours'] += regMh
    chartMap[key]['Contractor Man-Hours'] += conMh
    chartMap[key]['Total Man-Hours'] += (t.man_hours || regMh + conMh)
  })
  const barChartData = Object.values(chartMap)

  // Donut chart topic distribution
  const topicCount = {}
  trainings.forEach((t) => {
    const top = t.topic || 'General Safety'
    topicCount[top] = (topicCount[top] || 0) + 1
  })
  const topicChartData = Object.entries(topicCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Plot Competency & Target Tracker Table Data
  const targetRowsMap = {}
  if (isPlantSelected) {
    const relevantPlots = plots.filter((p) => String(p.plant_id) === String(selectedPlant))
    relevantPlots.forEach((pl) => {
      targetRowsMap[pl.id] = {
        id: pl.id,
        scopeName: pl.name,
        plantName: currentPlantName,
        sessions: 0,
        regular: 0,
        contractor: 0,
        totalParticipants: 0,
        manHours: 0,
        tbtSessions: 0,
        target: 300,
      }
    })
  } else {
    plants.forEach((p) => {
      targetRowsMap[p.id] = {
        id: p.id,
        scopeName: p.name,
        plantName: p.name,
        sessions: 0,
        regular: 0,
        contractor: 0,
        totalParticipants: 0,
        manHours: 0,
        tbtSessions: 0,
        target: 300,
      }
    })
  }

  trainings.forEach((t) => {
    const key = isPlantSelected ? t.plot_id : t.plant_id
    if (key && targetRowsMap[key]) {
      targetRowsMap[key].sessions += 1
      targetRowsMap[key].regular += (t.regular_attendees || 0)
      targetRowsMap[key].contractor += (t.contractor_attendees || 0)
      targetRowsMap[key].totalParticipants += ((t.regular_attendees || 0) + (t.contractor_attendees || 0))
      targetRowsMap[key].manHours += (t.man_hours || Math.round(((t.regular_attendees || 0) + (t.contractor_attendees || 0)) * (t.hours || 1)))
      if (t.category === 'Toolbox Talk') targetRowsMap[key].tbtSessions += 1
    }
  })

  const competencyRows = Object.values(targetRowsMap)
  const totalCompetencyRecords = competencyRows.length
  const totalCompetencyPages = Math.ceil(totalCompetencyRecords / competencyPageSize) || 1
  const paginatedCompetency = competencyRows.slice((competencyPage - 1) * competencyPageSize, competencyPage * competencyPageSize)

  // Handlers for modal / form
  const handleOpenAddModal = () => {
    setEditingId(null)
    setFormData({
      plant_id: selectedPlant !== 'All' ? selectedPlant : (plants[0]?.id ? String(plants[0].id) : ''),
      plot_id: selectedPlot !== 'All' ? selectedPlot : '',
      training_date: new Date().toISOString().split('T')[0],
      topic: '',
      category: 'Mandatory EHS',
      trainer: 'Site EHS Lead',
      regular_attendees: 5,
      contractor_attendees: 15,
      hours: 2.0,
      remarks: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (t) => {
    setEditingId(t.id)
    setFormData({
      plant_id: String(t.plant_id),
      plot_id: t.plot_id ? String(t.plot_id) : '',
      training_date: t.training_date,
      topic: t.topic,
      category: t.category || 'Mandatory EHS',
      trainer: t.trainer || 'Site EHS Lead',
      regular_attendees: t.regular_attendees || 0,
      contractor_attendees: t.contractor_attendees || 0,
      hours: t.hours || 1.0,
      remarks: t.remarks || '',
    })
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.plant_id || !formData.topic) {
      alert('Please select Plant and enter Training Topic')
      return
    }
    setModalSubmitting(true)
    try {
      const payload = {
        ...formData,
        plant_id: Number(formData.plant_id),
        plot_id: formData.plot_id ? Number(formData.plot_id) : null,
        regular_attendees: Number(formData.regular_attendees || 0),
        contractor_attendees: Number(formData.contractor_attendees || 0),
        hours: Number(formData.hours || 1.0),
      }
      payload.participants = payload.regular_attendees + payload.contractor_attendees
      payload.man_hours = Math.round(payload.participants * payload.hours * 10) / 10

      if (editingId) {
        await api.put(`/training/${editingId}`, payload)
        setActionNotice(`Training record #${editingId} updated successfully.`)
      } else {
        await api.post('/training', payload)
        setActionNotice('New safety training session logged successfully.')
      }
      setIsModalOpen(false)
      fetchTrainings()
      if (activeSubTab === 'manual') {
        setActiveSubTab('matrix')
      }
    } catch (err) {
      alert('Error saving training session: ' + (err.response?.data?.detail || err.message))
    } finally {
      setModalSubmitting(false)
    }
  }

  const handleDeleteTraining = async (id) => {
    if (!window.confirm('Are you sure you want to delete this training record?')) return
    try {
      await api.delete(`/training/${id}`)
      setActionNotice('Training record deleted.')
      fetchTrainings()
    } catch (err) {
      alert('Error deleting training: ' + err.message)
    }
  }

  // Bulk Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUploadResult(res.data)
      setActionNotice(`Successfully imported ${res.data.rows_processed} training records from ${res.data.filename}.`)
      fetchTrainings()
    } catch (err) {
      setUploadResult({ errors: [err.response?.data?.detail || 'Training upload failed. Please verify column formats.'] })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Export training matrix
  const handleExportCsv = () => {
    const headers = ['ID', 'Date', 'Plant', 'Plot', 'Topic', 'Category', 'Trainer', 'Regular Attendees', 'Contractor Attendees', 'Total Participants', 'Hours', 'Total Man-Hours', 'Remarks']
    const csvRows = [headers.join(',')]

    filteredTrainings.forEach((t) => {
      const row = [
        t.id,
        t.training_date,
        `"${plantName(t.plant_id)}"`,
        `"${plotName(t.plot_id)}"`,
        `"${t.topic}"`,
        `"${t.category || ''}"`,
        `"${t.trainer || ''}"`,
        t.regular_attendees || 0,
        t.contractor_attendees || 0,
        (t.regular_attendees || 0) + (t.contractor_attendees || 0),
        t.hours || 1,
        t.man_hours || 0,
        `"${t.remarks || ''}"`,
      ]
      csvRows.push(row.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Greenko_Safety_Training_Matrix_${selectedMonth}_${selectedYear}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }

  // Download Comprehensive Excel Report
  const handleDownloadExecutiveExcelReport = () => {
    const params = new URLSearchParams()
    if (selectedPlant !== 'All') params.append('plant_id', selectedPlant)
    if (selectedPlot !== 'All') params.append('plot_id', selectedPlot)
    if (selectedMonth !== 'All') params.append('month', selectedMonth)
    if (selectedYear) params.append('year', selectedYear)
    window.open(`/api/training/report/excel?${params.toString()}`, '_blank')
  }

  const modalPlots = plots.filter((pl) => String(pl.plant_id) === String(formData.plant_id))

  return (
    <div className="space-y-6 pb-12">
      {/* GLOBAL SCOPE FILTER BAR */}
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-purple-800/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-400/30 uppercase tracking-widest flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-300" />
                  EHS Competency &amp; Skill Development
                </span>
                <span className="text-xs text-purple-200/70 font-medium">Monthly Plot Target: ≥15 Training Hours</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
                {isPlantSelected
                  ? selectedPlot !== 'All'
                    ? `${currentPlotName} (${currentPlantName}) — Safety Training Center`
                    : `${currentPlantName} — Safety Trainings & Competency Matrix`
                  : 'Cluster Safety Trainings & Competency Management'}
              </h1>
              <p className="text-xs md:text-sm text-purple-100/70 mt-0.5">
                Detailed training metrics, workforce regular vs. contractor breakdown, interactive logs, and automated templates
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <button
                onClick={handleDownloadExecutiveExcelReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-2xl border border-emerald-400/40 shadow-lg shadow-emerald-950/30 transition-all flex items-center gap-1.5"
                title="Download multi-sheet styled Excel report"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Executive Excel Report</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-2 rounded-2xl border border-white/15 backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-purple-300" />
                <span>Export CSV</span>
              </button>

              {canWrite(selectedPlant) && (
                <button
                  onClick={handleOpenAddModal}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg shadow-purple-950/40 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Training Session</span>
                </button>
              )}
            </div>
          </div>

          {/* 6-CARD SUMMARY STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-300">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-200">
                  Target: 300h
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Total Man-Hours</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalManHours}h</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-300">
                <BookOpen className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200">
                  Sessions
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Completed Sessions</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalSessions}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-300">
                <UserCheck className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200">
                  On-Roll
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Regular Employees</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalRegular}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-300">
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
                  {contractorPercent}% Off-Roll
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Contractor Workers</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalContractor}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-cyan-300">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-200">
                  Daily TBT
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Toolbox Talks</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalTbtSessions}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-300">
                <Award className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-200">
                  Advance
                </span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">OEM / Theme Modules</div>
                <div className="text-2xl font-black text-white mt-0.5">{totalAdvance}</div>
              </div>
            </div>
          </div>

          {/* DEDICATED TRAINING SUB-MENU TABS */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'overview'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>1. Overview &amp; Charts</span>
            </button>

            <button
              onClick={() => setActiveSubTab('matrix')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>2. Training Matrix Log ({totalMatrixRecords})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('competency')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'competency'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>3. Plot Targets &amp; Competency</span>
            </button>

            <button
              onClick={() => setActiveSubTab('reports')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'reports'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>4. Executive Reports &amp; Visual Excel</span>
            </button>

            {!isReadOnly && (
              <>
                <button
                  onClick={() => {
                    handleOpenAddModal()
                    setActiveSubTab('manual')
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeSubTab === 'manual'
                      ? 'bg-white text-purple-950 shadow-md'
                      : 'text-purple-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>5. Log Single Session</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeSubTab === 'upload'
                      ? 'bg-white text-purple-950 shadow-md'
                      : 'text-purple-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>6. Bulk Excel / CSV Upload</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice('')} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ======================= SUB-TAB 1: OVERVIEW & CHARTS ======================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* BAR CHART: REGULAR VS CONTRACTOR MAN-HOURS */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-purple-600" />
                      <span>{isPlantSelected ? `${currentPlantName} Plot Training Man-Hours` : 'Training Man-Hours by Plant'}</span>
                    </h2>
                    <ChartInfoButton
                      title="Training Man-Hours by Unit"
                      whatItShows="Compares training hours given to on-roll company employees versus off-roll contractor workers."
                      howToRead="Purple stacks show regular employee hours; cyan stacks show contractor hours. The dashed line marks the 300-hour monthly target."
                      target="≥ 300 man-hours total (high contractor participation)"
                      whyItMatters="Contractors perform high-risk maintenance and equipment tasks; training them protects everyone from site incidents."
                    />
                  </div>
                  <p className="text-xs text-slate-500">Regular vs Contractor training hours against 300h monthly target line</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-purple-600 inline-block"></span>
                    <span>Regular</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-cyan-500 inline-block"></span>
                    <span>Contractor</span>
                  </div>
                </div>
              </div>

              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} angle={-15} textAnchor="end" />
                    <YAxis fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <div className="font-bold border-b border-slate-700 pb-1 text-purple-300">{label}</div>
                              <div>Regular Man-Hours: <strong className="text-purple-400">{data['Regular Man-Hours']} hrs</strong></div>
                              <div>Contractor Man-Hours: <strong className="text-cyan-400">{data['Contractor Man-Hours']} hrs</strong></div>
                              <div className="pt-1 border-t border-slate-700 font-bold text-emerald-400">Total: {data['Total Man-Hours']} hrs</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine y={300} stroke="#9333ea" strokeDasharray="4 4" label={{ value: 'Target: 300h', fill: '#9333ea', fontSize: 10, position: 'insideTopRight' }} />
                    <Bar dataKey="Regular Man-Hours" stackId="a" fill="#9333ea" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Contractor Man-Hours" stackId="a" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DONUT CHART: TRAINING TOPIC DISTRIBUTION */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <span>Curriculum &amp; Topics</span>
                    </h2>
                    <ChartInfoButton
                      title="Training Curriculum Topics"
                      whatItShows="Shows which safety topics (like Fire Safety, Working at Height, Electrical Safety, or First Aid) the workforce is being trained on."
                      howToRead="The pie slice sizes indicate the share of training sessions dedicated to each subject. Look for a balanced mix covering all critical site hazards."
                      target="Broad coverage across all high-risk plant activities"
                      whyItMatters="Focusing on all major plant hazards ensures workers are competent in diverse emergencies, not just one topic."
                    />
                  </div>
                  <p className="text-xs text-slate-500">Distribution across technical safety modules</p>
                </div>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                  {topicChartData.length} Topics
                </span>
              </div>

              <div className="h-[230px] w-full flex items-center justify-center">
                {topicChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topicChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {topicChartData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs font-semibold shadow-lg">
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
                  <div className="text-xs text-slate-400 italic">No training data available</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {topicChartData.map((t, idx) => (
                  <div key={t.name} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/70 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="font-medium text-slate-800 truncate">{t.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-2">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SUB-TAB 2: TRAINING MATRIX LOG ======================= */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-purple-600" />
                  <span>
                    {isPlantSelected ? `${currentPlantName} Training Sessions Matrix` : 'Comprehensive Cluster Training Log'}
                  </span>
                </h2>
                <ChartInfoButton
                  title="Training Session Log"
                  whatItShows="Complete audit record of every safety training session conducted, who the trainer was, headcount, and hours spent."
                  howToRead="Filter by category or search by topic. Review attendance breakdown between regular employees and contractor workers."
                  target="100% of required sessions conducted and verified"
                  whyItMatters="Provides formal proof of compliance during regulatory audits and ensures no safety training is missed."
                />
              </div>
              <p className="text-xs text-slate-500">
                Verified record of regular and contractor safety training sessions, durations, and competency hours
              </p>
            </div>

            {/* SEARCH & CATEGORY FILTER & PAGE SIZE */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer focus:bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search topic, trainer, plot..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2.5 py-1.5 rounded-xl outline-none cursor-pointer"
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>

          {/* LOG TABLE */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs min-w-[1050px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-left">Date</th>
                  <th className="py-3 px-3 text-left">{isPlantSelected ? 'Plot Name' : 'Plant / Plot'}</th>
                  <th className="py-3 px-3 text-left">Training Module &amp; Topic</th>
                  <th className="py-3 px-3 text-left">Category</th>
                  <th className="py-3 px-3 text-left">Trainer / Faculty</th>
                  <th className="py-3 px-3 text-center">Regular (On-Roll)</th>
                  <th className="py-3 px-3 text-center">Contractor (Off-Roll)</th>
                  <th className="py-3 px-3 text-center">Total Attendees</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-center">Total Man-Hours</th>
                  {canWrite(selectedPlant) && <th className="py-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTrainings.map((t) => {
                  const catClass = CATEGORY_STYLES[t.category] || 'bg-slate-100 text-slate-800'
                  const participantsCount = (t.regular_attendees || 0) + (t.contractor_attendees || 0) || t.participants || 0
                  return (
                    <tr key={t.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 font-semibold">{t.training_date}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{isPlantSelected ? plotName(t.plot_id) : plantName(t.plant_id)}</div>
                        {isPlantSelected && <div className="text-[11px] text-purple-700 font-semibold">{plantName(t.plant_id)}</div>}
                        {!isPlantSelected && t.plot_id && <div className="text-[10px] text-slate-400">{plotName(t.plot_id)}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{t.topic}</div>
                        {t.remarks && <div className="text-[10px] text-slate-400 italic truncate max-w-xs">{t.remarks}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catClass}`}>
                          {t.category || 'Mandatory EHS'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{t.trainer || 'Site EHS Lead'}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">{t.regular_attendees || 0}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700 font-mono">{t.contractor_attendees || 0}</td>
                      <td className="py-3 px-3 text-center font-black text-slate-900 font-mono">{participantsCount}</td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">{t.hours || 1.0}h</td>
                      <td className="py-3 px-3 text-center font-mono font-black text-purple-700 bg-purple-50/60 rounded-lg">
                        {t.man_hours ? `${t.man_hours}h` : `${Math.round(participantsCount * (t.hours || 1))}h`}
                      </td>
                      {canWrite(selectedPlant) && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit Training Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {paginatedTrainings.length === 0 && (
                  <tr>
                    <td colSpan={canWrite(selectedPlant) ? 11 : 10} className="py-8 text-center text-slate-400 italic">
                      No safety training records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DETAILED PAGINATION CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-slate-600 border-t border-slate-100">
            <div>
              Showing <span className="font-bold text-slate-900">{totalMatrixRecords > 0 ? startMatrixIndex + 1 : 0}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(startMatrixIndex + pageSize, totalMatrixRecords)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalMatrixRecords}</span> training records
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Prev</span>
              </button>

              {/* Page number buttons */}
              {Array.from({ length: totalMatrixPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalMatrixPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <div key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                        currentPage === p
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalMatrixPages))}
                disabled={currentPage === totalMatrixPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                title="Next Page"
              >
                <span className="hidden sm:inline text-xs font-semibold">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalMatrixPages)}
                disabled={currentPage === totalMatrixPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SUB-TAB 3: PLOT COMPETENCY & TARGET TRACKER ======================= */}
      {activeSubTab === 'competency' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span>
                    {isPlantSelected ? `${currentPlantName} Plot Training Scorecard` : 'Cluster Plant Competency Benchmark'}
                  </span>
                </h2>
                <ChartInfoButton
                  title="Unit Training Benchmark"
                  whatItShows="Measures each plant or plot against the monthly training threshold of at least 15 hours per plot."
                  howToRead="Check the progress bar and status badge. Units with green badges meet the threshold; amber or red indicate lagging training hours."
                  target="≥ 15 hours per plot every month"
                  whyItMatters="Ensures all units consistently train their teams instead of letting safety training lapse."
                />
              </div>
              <p className="text-xs text-slate-500">
                Evaluation of training hours generated against plot monthly benchmark (Target: ≥15h / month)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Show:</span>
              <select
                value={competencyPageSize}
                onChange={(e) => {
                  setCompetencyPageSize(Number(e.target.value))
                  setCompetencyPage(1)
                }}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-2.5 py-1.5 rounded-xl outline-none"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-left">{isPlantSelected ? 'Plot Name' : 'Plant Name'}</th>
                  <th className="py-3 px-3 text-center">Sessions Held</th>
                  <th className="py-3 px-3 text-center">Regular Trained</th>
                  <th className="py-3 px-3 text-center">Contractor Trained</th>
                  <th className="py-3 px-3 text-center">Total Workforce</th>
                  <th className="py-3 px-3 text-center">Toolbox Talks</th>
                  <th className="py-3 px-3 text-center">Actual Man-Hours</th>
                  <th className="py-3 px-3 text-center">Monthly Target</th>
                  <th className="py-3 px-3 text-center">% Achieved</th>
                  <th className="py-3 px-3 text-right">Target Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCompetency.map((row) => {
                  const pct = Math.round((row.manHours / row.target) * 100)
                  const isExceeded = pct >= 100
                  const isOnTrack = pct >= 75 && pct < 100
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {row.scopeName}
                        {isPlantSelected && <div className="text-[10px] text-purple-700 font-semibold">{row.plantName}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">{row.sessions}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">{row.regular}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700 font-mono">{row.contractor}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">{row.totalParticipants}</td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-700 font-mono">{row.tbtSessions}</td>
                      <td className="py-3 px-3 text-center font-black text-purple-700 font-mono bg-purple-50/50 rounded-lg">
                        {row.manHours}h
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-500 font-mono">300h</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isExceeded ? 'bg-emerald-500' : isOnTrack ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-bold font-mono text-[11px]">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isExceeded
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isOnTrack
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isExceeded ? 'Exceeded' : isOnTrack ? 'On Track' : 'Needs Focus'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Competency Pagination */}
          <div className="flex items-center justify-between pt-3 text-xs text-slate-600 border-t border-slate-100">
            <div>
              Showing <span className="font-bold text-slate-900">{totalCompetencyRecords > 0 ? (competencyPage - 1) * competencyPageSize + 1 : 0}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(competencyPage * competencyPageSize, totalCompetencyRecords)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalCompetencyRecords}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCompetencyPage((p) => Math.max(p - 1, 1))}
                disabled={competencyPage === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold"
              >
                Prev
              </button>
              <span className="text-xs font-bold text-slate-900 px-2">
                Page {competencyPage} of {totalCompetencyPages}
              </span>
              <button
                onClick={() => setCompetencyPage((p) => Math.min(p + 1, totalCompetencyPages))}
                disabled={competencyPage === totalCompetencyPages}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SUB-TAB 4: EXECUTIVE REPORTS & VISUAL EXCEL ======================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* TOP EXECUTIVE BRIEFING CARD */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                    Executive Briefing Document
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Reporting Scope: {isPlantSelected ? currentPlantName : 'Cluster Wide'} ({selectedMonth} {selectedYear})
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                  EHS Safety Training &amp; Competency Intelligence Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-level performance analysis, regular &amp; contractor workforce ratios, and plot target compliance audit.
                </p>
              </div>

              {/* PRIMARY ACTION BUTTON: EXCEL REPORT */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownloadExecutiveExcelReport}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/20 transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
                  <span>Download Multi-Sheet Excel Report (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* EXECUTIVE METRICS HIGHLIGHT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Target Attainment Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 space-y-2">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">Benchmark Attainment</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-950">{totalManHours}h</span>
                  <span className="text-xs text-purple-700 font-bold">/ 300h Target</span>
                </div>
                <div className="w-full bg-purple-200/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pctTarget >= 100 ? 'bg-purple-600' : pctTarget >= 75 ? 'bg-indigo-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(pctTarget, 100)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] font-bold text-purple-800 flex items-center justify-between">
                  <span>{pctTarget}% Goal Achieved</span>
                  <span>{pctTarget >= 100 ? '⭐ Target Met' : 'In Progress'}</span>
                </div>
              </div>

              {/* Workforce Diversity Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 space-y-2">
                <div className="text-xs font-bold text-cyan-900 uppercase tracking-wider">Contractor Engagement</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-cyan-950">{contractorPercent}%</span>
                  <span className="text-xs text-cyan-700 font-bold">Contractor Ratio</span>
                </div>
                <div className="text-xs text-cyan-800 space-y-0.5">
                  <div>• On-Roll Employees: <strong>{totalRegular}</strong></div>
                  <div>• Contractor Workers: <strong>{totalContractor}</strong></div>
                </div>
              </div>

              {/* Daily Briefings Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Toolbox Talks &amp; Drills</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-950">{totalTbtSessions}</span>
                  <span className="text-xs text-emerald-700 font-bold">TBT Briefings</span>
                </div>
                <div className="text-xs text-emerald-800 space-y-0.5">
                  <div>• Advance Modules: <strong>{totalAdvance}</strong></div>
                  <div>• Induction Sessions: <strong>{totalInductions}</strong></div>
                </div>
              </div>

              {/* Total Headcount Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">Workforce Upskilled</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-950">{totalParticipants}</span>
                  <span className="text-xs text-amber-700 font-bold">Total Attendances</span>
                </div>
                <div className="text-xs text-amber-800 space-y-0.5">
                  <div>• Completed Sessions: <strong>{totalSessions}</strong></div>
                  <div>• Topics Covered: <strong>{topicChartData.length} Modules</strong></div>
                </div>
              </div>
            </div>

            {/* SPREADSHEET STRUCTURE OVERVIEW */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">What's Inside the Generated Excel Report:</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Multi-Tab XLSX Workbook
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-purple-300">Sheet 1: Executive Summary</div>
                  <p className="text-slate-400 text-[11px]">
                    Executive scorecard with benchmark evaluation, regular vs. contractor attendance, KPI status, and management highlights.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-teal-300">Sheet 2: Plot Scorecard</div>
                  <p className="text-slate-400 text-[11px]">
                    Plot-by-plot matrix covering all 10 Ghani plots (or plants), target attainment percentages, and compliance status.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-cyan-300">Sheet 3: Training Sessions Log</div>
                  <p className="text-slate-400 text-[11px]">
                    Detailed register with session dates, topics, trainers, headcount breakdown, duration, man-hours, and key remarks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SUB-TAB 5: LOG SINGLE SESSION (MANUAL ENTRY) ======================= */}
      {activeSubTab === 'manual' && !isReadOnly && (
        <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Log New Safety Training Session</span>
              </h2>
              <p className="text-xs text-slate-500">Record regular and contractor training hours, topics, and outcomes</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Plant *</label>
                <select
                  required
                  value={formData.plant_id}
                  onChange={(e) => setFormData({ ...formData, plant_id: e.target.value, plot_id: '' })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Select Plant…</option>
                  {plants.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Plot Area (Optional)</label>
                <select
                  value={formData.plot_id}
                  onChange={(e) => setFormData({ ...formData, plot_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">General Area / All Plots</option>
                  {modalPlots.map((pl) => (
                    <option key={pl.id} value={String(pl.id)}>{pl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Training Date *</label>
                <input
                  type="date"
                  required
                  value={formData.training_date}
                  onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Training Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Training Module &amp; Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Safety, LOTOTO, Working at Height..."
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Trainer / Faculty / Agency</label>
                <input
                  type="text"
                  placeholder="e.g. Site EHS Lead, Schneider OEM Specialist..."
                  value={formData.trainer}
                  onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Numbers: Regular, Contractor, Hours, Calculated Man-Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Regular (On-Roll)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.regular_attendees}
                  onChange={(e) => setFormData({ ...formData, regular_attendees: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contractor (Off-Roll)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.contractor_attendees}
                  onChange={(e) => setFormData({ ...formData, contractor_attendees: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Man-Hours</label>
                <div className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-black text-purple-900 font-mono">
                  {Math.round((Number(formData.regular_attendees || 0) + Number(formData.contractor_attendees || 0)) * Number(formData.hours || 1) * 10) / 10} hrs
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks / Key Outcomes</label>
              <textarea
                rows={2}
                placeholder="Key learnings, certification notes, attendance remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="submit"
              disabled={modalSubmitting}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{modalSubmitting ? 'Saving...' : 'Save Training Record'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================= SUB-TAB 6: BULK EXCEL / CSV UPLOAD & TEMPLATES ======================= */}
      {activeSubTab === 'upload' && !isReadOnly && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-purple-600" />
              <span>Bulk Safety Training Data Ingestion</span>
            </h2>
            <p className="text-xs text-slate-500">
              Download the official Greenko training matrix template, enter sessions across your 10 plots, and upload for automated man-hour computations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TEMPLATE DOWNLOAD BOX */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                  <span>1. Download Official Training Matrix Template</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Pre-configured with Plant, Plot, Date, Topic, Category, Trainer, Regular, Contractor, and Hours columns matching the Ghani 10 plot sheets.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href="/api/upload/template/training?format=excel"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </a>
                <a
                  href="/api/upload/template/training?format=csv"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>

            {/* UPLOAD BOX */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <span>2. Upload Completed Training Matrix</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select your completed spreadsheet. The engine will parse regular and contractor headcounts, total man-hours, and associate them with each plot.
                </p>
              </div>

              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="training-sheet-upload"
                />
                <label
                  htmlFor="training-sheet-upload"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs ${
                    uploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Parsing & Ingesting...' : 'Select File (.xlsx / .csv)'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* UPLOAD RESULT REPORT */}
          {uploadResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                uploadResult.errors?.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
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

      {/* MODAL FOR QUICK EDITING / POPUP LOGGING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span>{editingId ? 'Edit Safety Training Session' : 'Log New Safety Training Session'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Plant *</label>
                  <select
                    required
                    value={formData.plant_id}
                    onChange={(e) => setFormData({ ...formData, plant_id: e.target.value, plot_id: '' })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                  >
                    <option value="">Select Plant…</option>
                    {plants.map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Plot / Area</label>
                  <select
                    value={formData.plot_id}
                    onChange={(e) => setFormData({ ...formData, plot_id: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                  >
                    <option value="">All / General Plant Area</option>
                    {modalPlots.map((pl) => (
                      <option key={pl.id} value={String(pl.id)}>{pl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Training Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.training_date}
                    onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Training Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Training Module &amp; Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Safety, LOTO Procedures, Working at Height..."
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trainer / Faculty / Agency</label>
                <input
                  type="text"
                  placeholder="e.g. Site EHS Lead, OEM Specialist (Schneider)..."
                  value={formData.trainer}
                  onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Regular (On-Roll)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.regular_attendees}
                    onChange={(e) => setFormData({ ...formData, regular_attendees: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-white text-xs font-bold text-emerald-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contractor (Off-Roll)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.contractor_attendees}
                    onChange={(e) => setFormData({ ...formData, contractor_attendees: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-white text-xs font-bold text-amber-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-white text-xs font-bold text-purple-700 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Calculated Total Man-Hours Display */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Calculated Man-Hours for this session:</span>
                <span className="font-extrabold text-purple-700 font-mono text-sm">
                  {Math.round((Number(formData.regular_attendees || 0) + Number(formData.contractor_attendees || 0)) * Number(formData.hours || 1) * 10) / 10} Man-Hours
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Key Outcomes</label>
                <textarea
                  rows={2}
                  placeholder="Key learnings, assessment outcomes, attendance notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving...' : editingId ? 'Update Record' : 'Save Training Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
