import { useState, useEffect } from 'react'
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Award,
  Flame,
  HelpCircle,
  RefreshCw,
} from 'lucide-react'
import api from '../api'

const METRIC_DEFS = [
  {
    key: 'near_miss',
    name: 'Near Miss Reporting',
    icon: '👁️',
    description: 'Catches hazards proactively before turning into injuries.',
    targetKey: 'near_miss',
    targetUnit: 'reports / month',
    defaultWeight: 10,
    defaultTarget: 1,
  },
  {
    key: 'training_hours',
    name: 'Safety Training Hours',
    icon: '🎓',
    description: 'Total safety training man-hours delivered to workforce.',
    targetKey: 'training_hours',
    targetUnit: 'man-hours / month',
    defaultWeight: 10,
    defaultTarget: 15,
  },
  {
    key: 'training_sessions',
    name: 'Training Sessions Conducted',
    icon: '📚',
    description: 'Number of distinct structured training sessions held.',
    targetKey: 'training_sessions',
    targetUnit: 'sessions / month',
    defaultWeight: 10,
    defaultTarget: 2,
  },
  {
    key: 'audits',
    name: 'Safety Audits Executed',
    icon: '🔍',
    description: 'Comprehensive electrical, mechanical, and fire safety audits.',
    targetKey: 'audits_annual',
    targetUnit: 'audits / year',
    defaultWeight: 15,
    defaultTarget: 2,
  },
  {
    key: 'loto_compliance',
    name: 'LOTO Adherence Compliance',
    icon: '🔒',
    description: 'Strict Lockout / Tagout electrical and mechanical isolation %.',
    targetUnit: '% compliance (Fixed 100%)',
    defaultWeight: 15,
    fixedTarget: 100,
  },
  {
    key: 'walkdowns',
    name: 'Leadership Walkdowns (WPI)',
    icon: '🥾',
    description: 'Formal Workplace Inspection site rounds conducted by leadership.',
    targetKey: 'walkdowns',
    targetUnit: 'walkdowns / month',
    defaultWeight: 15,
    defaultTarget: 2,
  },
  {
    key: 'statutory_compliance',
    name: 'Statutory & Regulatory Adherence',
    icon: '⚖️',
    description: 'Active compliance with PCB, CEA, Factory License & Labor welfare.',
    targetUnit: '% compliance (Fixed 100%)',
    defaultWeight: 10,
    fixedTarget: 100,
  },
  {
    key: 'ohs_meetings',
    name: 'Safety Committee Meeting (OHS)',
    icon: '👥',
    description: 'Monthly Occupational Health & Safety committee review with MOM.',
    targetKey: 'ohs_meetings',
    targetUnit: 'meetings / month',
    defaultWeight: 10,
    defaultTarget: 1,
  },
  {
    key: 'mock_drills',
    name: 'Mock Emergency Drills',
    icon: '🚨',
    description: 'Practical emergency simulations (fire, height rescue, first-aid).',
    targetKey: 'mock_drills',
    targetUnit: 'drills / month',
    defaultWeight: 5,
    defaultTarget: 1,
  },
]

export default function SafetyFormulaEditor({ onFormulaSaved }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [isCustom, setIsCustom] = useState(false)

  const [weights, setWeights] = useState({
    near_miss: 10,
    training_hours: 10,
    training_sessions: 10,
    audits: 15,
    loto_compliance: 15,
    walkdowns: 15,
    statutory_compliance: 10,
    ohs_meetings: 10,
    mock_drills: 5,
  })

  const [targets, setTargets] = useState({
    near_miss: 1,
    training_hours: 15,
    training_sessions: 2,
    audits_annual: 2,
    walkdowns: 2,
    ohs_meetings: 1,
    mock_drills: 1,
  })

  const [penalties, setPenalties] = useState({
    mtc: 5,
    lti: 15,
    fatality: 40,
  })

  const [grades, setGrades] = useState({
    platinum: 90,
    gold: 75,
    silver: 50,
  })

  const fetchFormula = async () => {
    setLoading(true)
    try {
      const res = await api.get('/system/safety-formula')
      if (res.data?.active) {
        if (res.data.active.weights) setWeights(res.data.active.weights)
        if (res.data.active.targets) setTargets(res.data.active.targets)
        if (res.data.active.penalties) setPenalties(res.data.active.penalties)
        if (res.data.active.grades) setGrades(res.data.active.grades)
      }
      setIsCustom(Boolean(res.data?.is_customized))
    } catch (err) {
      console.error('Failed to load safety formula', err)
      setMsg({ type: 'error', text: 'Failed to fetch current calculation formula.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFormula()
  }, [])

  const totalWeight = Object.values(weights).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  )
  const isBalanced = Math.abs(totalWeight - 100.0) < 0.01

  const handleWeightChange = (key, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setWeights((prev) => ({ ...prev, [key]: num }))
  }

  const handleTargetChange = (key, val) => {
    const num = Math.max(0.1, parseFloat(val) || 0.1)
    setTargets((prev) => ({ ...prev, [key]: num }))
  }

  const handlePenaltyChange = (key, val) => {
    const num = Math.max(0, parseFloat(val) || 0)
    setPenalties((prev) => ({ ...prev, [key]: num }))
  }

  const handleGradeChange = (key, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setGrades((prev) => ({ ...prev, [key]: num }))
  }

  const handleSave = async () => {
    if (!isBalanced) {
      setMsg({
        type: 'error',
        text: `Weights must sum to exactly 100.0%. Current total: ${totalWeight.toFixed(1)}% (Difference: ${(100 - totalWeight).toFixed(1)}%).`,
      })
      return
    }

    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const payload = {
        weights,
        targets,
        penalties,
        grades,
      }
      const res = await api.post('/system/safety-formula', payload)
      setMsg({
        type: 'success',
        text: res.data.message || 'Safety calculation formula updated and all plant scores recalculated!',
      })
      setIsCustom(true)
      if (onFormulaSaved) onFormulaSaved(payload)
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update safety formula.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (
      !window.confirm(
        'Reset the Safety Score calculation formula to factory defaults (10% Near Miss, 10% Training, 15% Audits/LOTO/Walkdowns, etc.)? All historical scores will be re-evaluated with default weights.'
      )
    ) {
      return
    }

    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await api.post('/system/safety-formula/reset')
      setMsg({
        type: 'success',
        text: res.data.message || 'Formula reset to factory defaults! All scores re-evaluated.',
      })
      setIsCustom(false)
      fetchFormula()
      if (onFormulaSaved) onFormulaSaved(null)
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to reset formula.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* BANNER / HEADER INFO */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-800/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                How the Safety Score Index is Calculated
              </h3>
              {isCustom ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">
                  Customized Formula Active
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Factory Default Formula
                </span>
              )}
            </div>
            <p className="text-xs text-teal-200/80 mt-1 max-w-2xl leading-relaxed">
              Super Admin &amp; Admin can edit metric weights, monthly targets, incident penalties, and grade cutoffs.
              Saving automatically recalculates the live safety score and grade for all 4 plants and 12 plots.
            </p>
          </div>
        </div>

        {/* REFRESH BUTTON */}
        <button
          onClick={fetchFormula}
          disabled={loading}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* FEEDBACK ALERT */}
      {msg.text && (
        <div
          className={`px-4 py-3 text-xs font-semibold rounded-2xl flex items-center justify-between border ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOTAL WEIGHT MONITOR */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isBalanced
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-amber-50/90 border-amber-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{isBalanced ? '✅' : '⚠️'}</span>
            <div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <span>Total KPI Weight:</span>
                <span
                  className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                    isBalanced
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {totalWeight.toFixed(1)}%
                </span>
                <span className="text-slate-500 font-medium">/ 100.0% Required</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isBalanced
                  ? 'The 9 KPI components are balanced perfectly to 100%. Ready to save.'
                  : `Adjustment needed: ${
                      totalWeight < 100
                        ? `Add ${(100 - totalWeight).toFixed(1)}% to reach 100%`
                        : `Remove ${(totalWeight - 100).toFixed(1)}% to reach 100%`
                    }.`}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-300 ${
                isBalanced
                  ? 'bg-emerald-500'
                  : totalWeight > 100
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, totalWeight)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 1. SCORING WEIGHTS & MONTHLY TARGETS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>1. Nine Proactive Safety Components (Weights &amp; Monthly Targets)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">
            Must sum to 100.0%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {METRIC_DEFS.map((m) => {
            const currentWeight = weights[m.key] ?? m.defaultWeight
            const currentTarget = m.targetKey ? targets[m.targetKey] ?? m.defaultTarget : null

            return (
              <div
                key={m.key}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 transition-all shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                        {m.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                    {currentWeight}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  {/* Weight Input */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Weight (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentWeight}
                        onChange={(e) => handleWeightChange(m.key, e.target.value)}
                        className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Target Input */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Target
                    </label>
                    {m.targetKey ? (
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={currentTarget}
                        onChange={(e) => handleTargetChange(m.targetKey, e.target.value)}
                        className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    ) : (
                      <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                        100%
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium">
                  Rule: <span className="font-semibold text-slate-700">{m.targetUnit}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. INCIDENT PENALTY DEDUCTIONS */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-600" />
          <span>2. Reactive Incident Penalties (Points Deducted Directly per Occurrence)</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 transition-all shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩹</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">MTC Penalty</div>
                  <div className="text-[10px] text-slate-500">Medical Treatment Case</div>
                </div>
              </div>
              <span className="text-xs font-black text-rose-700">-{penalties.mtc} Pts</span>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Points Deducted per Incident
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={penalties.mtc}
                onChange={(e) => handlePenaltyChange('mtc', e.target.value)}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 transition-all shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">LTI Penalty</div>
                  <div className="text-[10px] text-slate-500">Lost Time Injury</div>
                </div>
              </div>
              <span className="text-xs font-black text-amber-700">-{penalties.lti} Pts</span>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Points Deducted per Incident
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={penalties.lti}
                onChange={(e) => handlePenaltyChange('lti', e.target.value)}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-red-100 hover:border-red-300 transition-all shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Fatality Penalty</div>
                  <div className="text-[10px] text-slate-500">Zero Harm Breached</div>
                </div>
              </div>
              <span className="text-xs font-black text-red-700">-{penalties.fatality} Pts</span>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Points Deducted per Incident
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={penalties.fatality}
                onChange={(e) => handlePenaltyChange('fatality', e.target.value)}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. GRADE EVALUATION CUTOFF THRESHOLDS */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          <span>3. Final Grade Thresholds (Score out of 100)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-900">💎 Platinum</span>
              <span className="text-[11px] font-mono font-bold text-purple-700">
                &ge; {grades.platinum}
              </span>
            </div>
            <label className="text-[10px] font-bold text-purple-700 block">Min Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={grades.platinum}
              onChange={(e) => handleGradeChange('platinum', e.target.value)}
              className="w-full text-xs font-bold font-mono px-2.5 py-1.5 bg-white rounded-xl border border-purple-200 outline-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-900">🥇 Gold</span>
              <span className="text-[11px] font-mono font-bold text-amber-700">
                &ge; {grades.gold}
              </span>
            </div>
            <label className="text-[10px] font-bold text-amber-700 block">Min Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={grades.gold}
              onChange={(e) => handleGradeChange('gold', e.target.value)}
              className="w-full text-xs font-bold font-mono px-2.5 py-1.5 bg-white rounded-xl border border-amber-200 outline-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800">🥈 Silver</span>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                &ge; {grades.silver}
              </span>
            </div>
            <label className="text-[10px] font-bold text-slate-600 block">Min Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={grades.silver}
              onChange={(e) => handleGradeChange('silver', e.target.value)}
              className="w-full text-xs font-bold font-mono px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-orange-900">🥉 Bronze</span>
              <span className="text-[11px] font-mono font-bold text-orange-700">
                &lt; {grades.silver}
              </span>
            </div>
            <label className="text-[10px] font-bold text-orange-700 block">Range</label>
            <div className="text-xs font-bold text-orange-800 px-2.5 py-1.5 bg-white rounded-xl border border-orange-200">
              Below Silver
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS BAR */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Factory Defaults</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isBalanced}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Recalculating All Scores...' : 'Save Formula & Recalculate Scores'}</span>
        </button>
      </div>
    </div>
  )
}
