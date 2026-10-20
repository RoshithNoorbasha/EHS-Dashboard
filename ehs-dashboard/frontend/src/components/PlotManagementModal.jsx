import { useEffect, useState } from 'react'
import { X, MapPin, Plus, Trash2, Edit3, Building2, Check } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function PlotManagementModal({ isOpen, onClose, onPlotUpdated }) {
  const { canWrite } = useAuth()
  const [plants, setPlants] = useState([])
  const [plots, setPlots] = useState([])
  const [selectedPlantId, setSelectedPlantId] = useState('')
  const [plotName, setPlotName] = useState('')
  const [plotDesc, setPlotDesc] = useState('')
  const [editingPlotId, setEditingPlotId] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api.get('/plants'), api.get('/plots')])
      .then(([p, pl]) => {
        setPlants(p.data)
        setPlots(pl.data)
        if (!selectedPlantId && p.data.length > 0) {
          setSelectedPlantId(String(p.data[0].id))
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      setPlotName('')
      setPlotDesc('')
      setEditingPlotId(null)
      setMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSavePlot = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!selectedPlantId || !plotName.trim()) {
      alert('Please select a plant and enter a plot name.')
      return
    }

    try {
      if (editingPlotId) {
        await api.put(`/plots/${editingPlotId}`, {
          plant_id: Number(selectedPlantId),
          name: plotName.trim(),
          description: plotDesc.trim(),
        })
        setMsg('Plot updated successfully!')
      } else {
        await api.post('/plots', {
          plant_id: Number(selectedPlantId),
          name: plotName.trim(),
          description: plotDesc.trim(),
        })
        setMsg('New plot created successfully!')
      }
      setPlotName('')
      setPlotDesc('')
      setEditingPlotId(null)
      loadData()
      if (onPlotUpdated) onPlotUpdated()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed to save plot')
    }
  }

  const handleEditClick = (pl) => {
    setEditingPlotId(pl.id)
    setSelectedPlantId(String(pl.plant_id))
    setPlotName(pl.name)
    setPlotDesc(pl.description || '')
  }

  const handleDeletePlot = async (plotId) => {
    if (!confirm('Are you sure you want to delete this plot?')) return
    try {
      await api.delete(`/plots/${plotId}`)
      loadData()
      if (onPlotUpdated) onPlotUpdated()
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not delete plot')
    }
  }

  const filteredPlots = selectedPlantId
    ? plots.filter((p) => p.plant_id === Number(selectedPlantId))
    : plots

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Plant Plots Configuration</h2>
              <p className="text-xs text-slate-500">Create and manage discrete plots and solar/wind field sections inside plants</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-800">
            {msg}
          </div>
        )}

        {/* Add / Edit Form */}
        <form onSubmit={handleSavePlot} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-600" />
            <span>{editingPlotId ? `Edit Plot #${editingPlotId}` : 'Add New Plot to Plant'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Select Plant *</label>
              <select
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                {plants.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Plot Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Plot 1 - North Sector"
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Description / Location</label>
              <input
                type="text"
                placeholder="e.g. 50MW Tracker array"
                value={plotDesc}
                onChange={(e) => setPlotDesc(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingPlotId && (
              <button
                type="button"
                onClick={() => {
                  setEditingPlotId(null)
                  setPlotName('')
                  setPlotDesc('')
                }}
                className="px-3.5 py-1.5 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              {editingPlotId ? 'Update Plot' : 'Create Plot'}
            </button>
          </div>
        </form>

        {/* Existing Plots list filtered by plant */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Plots in {plants.find((p) => p.id === Number(selectedPlantId))?.name || 'Selected Plant'} ({filteredPlots.length})
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Plot ID</th>
                  <th className="py-2.5 px-4">Plot Name</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlots.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-500">#{pl.id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{pl.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{pl.description || '—'}</td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleEditClick(pl)}
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit Plot"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlot(pl.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Plot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPlots.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                      No plots defined for this plant yet. Use the form above to add plots.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
