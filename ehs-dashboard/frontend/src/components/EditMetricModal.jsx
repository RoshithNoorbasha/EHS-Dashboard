import { useState, useEffect } from 'react'
import { X, Building2, MapPin, Calendar, Layers } from 'lucide-react'
import api from '../api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function EditMetricModal({ isOpen, metric, plants, onClose, onSave }) {
  const [form, setForm] = useState({})
  const [plots, setPlots] = useState([])

  useEffect(() => {
    if (metric) {
      const initialForm = { ...metric }
      numberFields.forEach(([key]) => {
        initialForm[key] = String(metric[key] ?? 0)
      })
      initialForm.year = String(metric.year ?? 2026)
      initialForm.plot_id = metric.plot_id ? String(metric.plot_id) : ''
      setForm(initialForm)
    }
  }, [metric])

  useEffect(() => {
    if (form.plant_id) {
      api.get('/plots', { params: { plant_id: Number(form.plant_id) } }).then((r) => {
        setPlots(r.data)
      })
    } else {
      setPlots([])
    }
  }, [form.plant_id])

  if (!isOpen || !metric) return null

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleNumberChange = (key, rawValue) => {
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      setForm((prev) => ({ ...prev, [key]: rawValue }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      plant_id: Number(form.plant_id),
      plot_id: form.plot_id ? Number(form.plot_id) : null,
      year: Number(form.year) || 2026,
    }
    numberFields.forEach(([key]) => {
      payload[key] = form[key] === '' ? 0 : Number(form[key]) || 0
    })
    onSave(payload)
  }

  const numberFields = [
    // Lagging
    ['fatality', 'Fatality'],
    ['lti', 'LTI'],
    ['mtc', 'MTC'],
    ['fac', 'FAC'],
    ['safe_man_hours', 'Safe Man Hours'],

    // Leading & Operational
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

    // Compliance
    ['ptw_compliance', 'PTW %'],
    ['loto_compliance', 'LOTO %'],
    ['statutory_compliance', 'Statutory %'],
    ['audit_closure', 'Audit Closure %'],
    ['fire_safety', 'Fire Safety %'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Monthly Metric Record #{metric.id}</h2>
            <p className="text-xs text-slate-500">Update safety, leadership, and compliance metrics</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Plant *</label>
              <select
                required
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.plant_id || ''}
                onChange={(e) => {
                  handleChange('plant_id', Number(e.target.value))
                  handleChange('plot_id', '')
                }}
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Plot (Optional)</label>
              <select
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.plot_id || ''}
                onChange={(e) => handleChange('plot_id', e.target.value)}
              >
                <option value="">Overall / Entire Plant</option>
                {plots.map((pl) => (
                  <option key={pl.id} value={String(pl.id)}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Month *</label>
              <select
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.month || 'Jul'}
                onChange={(e) => handleChange('month', e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Year *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.year || '2026'}
                onChange={(e) => handleNumberChange('year', e.target.value)}
                onBlur={() => {
                  if (!form.year) handleNumberChange('year', '2026')
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Metric Quantities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {numberFields.map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-slate-600 block mb-1 font-medium truncate" title={label}>
                    {label}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-mono"
                    value={form[key] ?? ''}
                    placeholder="0"
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00') e.target.select()
                    }}
                    onChange={(e) => handleNumberChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Update Metric
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
