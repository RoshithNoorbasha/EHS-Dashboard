import { useState } from 'react'
import {
  X,
  ShieldCheck,
  Award,
  AlertTriangle,
  Calculator,
  Flame,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  BookOpen,
  Check,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react'

export const SCORING_COMPONENTS = [
  {
    id: 'near_miss',
    name: 'Near Miss Reporting',
    icon: '👁️',
    weight: 10,
    target: '1 report per month',
    plainWhy: 'Catches hazards before they turn into injuries. Reporting near misses proves the workforce is alert and proactive.',
    plainRule: 'Submit at least 1 verified Near Miss report in the month to earn the full 10 points. If 0 reported, you get 0 points.',
    example: 'Target: 1 | Actual: 1 reported | Result: 100% achieved = 10.0 / 10 points',
  },
  {
    id: 'training_hours',
    name: 'Safety Training Hours',
    icon: '🎓',
    weight: 10,
    target: '15 cumulative hours per month',
    plainWhy: 'Ensures staff and contractors regularly refresh their safety skills and hazard awareness on site.',
    plainRule: 'Target is 15 total man-hours of safety training. Points are proportional: if you complete 12 hours, that is 80% achieved, earning 8.0 points.',
    example: 'Target: 15 hrs | Actual: 12 hrs | Result: 80% achieved = 8.0 / 10 points',
  },
  {
    id: 'training_sessions',
    name: 'Training Sessions Conducted',
    icon: '📚',
    weight: 10,
    target: '2 structured sessions per month',
    plainWhy: 'Measures consistency. Multiple shorter, focused sessions are better than one infrequent training.',
    plainRule: 'Conduct at least 2 distinct training courses or structured workshops during the month to earn the full 10 points.',
    example: 'Target: 2 sessions | Actual: 2 sessions | Result: 100% achieved = 10.0 / 10 points',
  },
  {
    id: 'audits',
    name: 'Safety Audits Executed',
    icon: '🔍',
    weight: 15,
    target: '2 audits per year (~0.17 per month)',
    plainWhy: 'Third-party and internal audits verify electrical, mechanical, and fire compliance across all equipment.',
    plainRule: 'Annual target is 2 full audits per plot per year. In any month where an audit is executed or credited, full 15 points are awarded.',
    example: 'Target: 2 / yr | Actual: Audit completed | Result: 100% achieved = 15.0 / 15 points',
  },
  {
    id: 'loto',
    name: 'LOTO (Lockout / Tagout) Compliance',
    icon: '🔒',
    weight: 15,
    target: '100% strict adherence',
    plainWhy: 'Zero tolerance for working on live high-voltage or pressurized systems without complete physical isolation.',
    plainRule: 'Direct percentage score. If all isolations followed procedure without violation (100%), you get 15.0 points. If 90%, you get 13.5 points.',
    example: 'Target: 100% | Actual: 95% compliance | Result: 95% achieved = 14.25 / 15 points',
  },
  {
    id: 'walkdowns',
    name: 'Leadership Walkdowns (WPI)',
    icon: '🥾',
    weight: 15,
    target: '2 site walkdowns per month',
    plainWhy: 'Ensures plant heads and safety officers physically walk the plot, inspect work-at-height, and talk with technicians.',
    plainRule: 'Complete 2 formal Workplace Inspection (WPI) walkdowns. 1 walkdown earns 7.5 points; 2 or more earns the full 15.0 points.',
    example: 'Target: 2 walkdowns | Actual: 2 completed | Result: 100% achieved = 15.0 / 15 points',
  },
  {
    id: 'statutory',
    name: 'Statutory & Regulatory Compliance',
    icon: '⚖️',
    weight: 10,
    target: '100% legal compliance',
    plainWhy: 'Covers legal permissions: PCB clearances, factory licenses, labor welfare, CEA safety certificates, and fire NOCs.',
    plainRule: 'Direct percentage score. 100% active, valid permits with zero overdue compliance filings earns the full 10.0 points.',
    example: 'Target: 100% | Actual: 100% compliance | Result: 100% achieved = 10.0 / 10 points',
  },
  {
    id: 'ohs',
    name: 'Safety Committee Meeting (OHS)',
    icon: '👥',
    weight: 10,
    target: '1 meeting per month',
    plainWhy: 'Brings together plant engineers, supervisors, and contractor reps to review open hazards and action items.',
    plainRule: 'Hold at least 1 formal monthly Safety Committee meeting with documented minutes of meeting (MOM) to get 10.0 points.',
    example: 'Target: 1 meeting | Actual: 1 held with MOM | Result: 100% achieved = 10.0 / 10 points',
  },
  {
    id: 'mock_drills',
    name: 'Mock Emergency Drills',
    icon: '🚨',
    weight: 5,
    target: '1 drill per month',
    plainWhy: 'Tests emergency readiness for solar fire, inverter flash, chemical spill, snake bite, or height rescue.',
    plainRule: 'Execute 1 practical emergency simulation drill during the month to earn 5.0 points. If skipped, 0 points.',
    example: 'Target: 1 drill | Actual: 1 drill executed | Result: 100% achieved = 5.0 / 5 points',
  },
]

export const INCIDENT_PENALTIES = [
  {
    name: 'Medical Treatment Case (MTC)',
    penalty: 5,
    icon: '🩹',
    plainExplanation: 'An injury on site requiring a visit to a medical practitioner or doctor beyond basic first aid.',
    impact: 'Subtracts 5.0 points directly from your total score for every single case.',
    example: '1 MTC in the month = -5 Points off total score',
  },
  {
    name: 'Lost Time Injury (LTI)',
    penalty: 15,
    icon: '⚠️',
    plainExplanation: 'A serious incident where an injured worker is unable to return to their regular shift on the following day.',
    impact: 'Severe penalty. Subtracts 15.0 points directly from your total score per incident.',
    example: '1 LTI in the month = -15 Points off total score',
  },
  {
    name: 'Fatality Event',
    penalty: 40,
    icon: '🚨',
    plainExplanation: 'A tragic life-loss accident on site. Represents total systemic failure.',
    impact: 'Massive penalty. Subtracts 40.0 points, automatically knocking the plant into Bronze / Unsatisfactory.',
    example: '1 Fatality = -40 Points off total score',
  },
]

const WORKED_EXAMPLES = {
  good: {
    title: 'Plot Solar-01: Strong Proactive Performance',
    tag: 'Gold Grade (86.3 / 100)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'The team completed all walkdowns, meetings, drills, and statutory permits, but was slightly short on training hours and had 1 minor medical case (MTC).',
    rows: [
      { name: 'Near Miss Reporting', target: '1 report', actual: '1 report', achieved: '100%', maxPts: 10, earned: '10.0', note: 'Met benchmark' },
      { name: 'Training Hours', target: '15 hrs', actual: '12 hrs', achieved: '80%', maxPts: 10, earned: '8.0', note: '12 / 15 hrs completed' },
      { name: 'Training Sessions', target: '2 sessions', actual: '2 sessions', achieved: '100%', maxPts: 10, earned: '10.0', note: 'Met benchmark' },
      { name: 'Safety Audits', target: '2 / yr (~0.17)', actual: '0.17 credited', achieved: '100%', maxPts: 15, earned: '15.0', note: 'Audit cycle on track' },
      { name: 'LOTO Adherence', target: '100%', actual: '95% adherence', achieved: '95%', maxPts: 15, earned: '14.25', note: '1 permit procedural defect' },
      { name: 'WPI Walkdowns', target: '2 walkdowns', actual: '2 completed', achieved: '100%', maxPts: 15, earned: '15.0', note: 'Plant head inspected' },
      { name: 'Statutory Compliance', target: '100%', actual: '100% active', achieved: '100%', maxPts: 10, earned: '10.0', note: 'All licenses current' },
      { name: 'OHS Safety Committee', target: '1 meeting', actual: '1 conducted', achieved: '100%', maxPts: 10, earned: '10.0', note: 'MOM signed' },
      { name: 'Mock Emergency Drill', target: '1 drill', actual: '1 drill', achieved: '100%', maxPts: 5, earned: '5.0', note: 'Fire drill completed' },
    ],
    proactiveTotal: '92.25',
    penalties: [
      { name: '1 Medical Treatment Case (MTC)', deduction: '-5.0 pts', reason: 'Finger laceration treated at clinic' },
      { name: 'Lost Time Injuries (LTI)', deduction: '0 pts', reason: 'Zero days lost' },
    ],
    totalDeduction: '-5.0',
    finalScore: '87.25',
    grade: 'Gold',
    takeaway: '92.25 base points earned from proactive activities minus 5.0 points for the MTC incident = 87.25 Final Score (Gold Grade).',
  },
  perfect: {
    title: 'Plot Wind-02: Zero Harm & 100% Targets (Platinum)',
    tag: 'Platinum Grade (99.0 / 100)',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Exemplary performance! Every proactive target was achieved at or above benchmark, and ZERO injuries occurred on site.',
    rows: [
      { name: 'Near Miss Reporting', target: '1 report', actual: '2 reports', achieved: '100% (max)', maxPts: 10, earned: '10.0', note: 'Exceeded target' },
      { name: 'Training Hours', target: '15 hrs', actual: '18 hrs', achieved: '100% (max)', maxPts: 10, earned: '10.0', note: 'Full compliance' },
      { name: 'Training Sessions', target: '2 sessions', actual: '3 sessions', achieved: '100% (max)', maxPts: 10, earned: '10.0', note: 'Weekly safety topics' },
      { name: 'Safety Audits', target: '2 / yr', actual: 'On schedule', achieved: '100%', maxPts: 15, earned: '15.0', note: 'Third-party certified' },
      { name: 'LOTO Adherence', target: '100%', actual: '100%', achieved: '100%', maxPts: 15, earned: '15.0', note: 'Perfect isolation logs' },
      { name: 'WPI Walkdowns', target: '2 walkdowns', actual: '3 walkdowns', achieved: '100% (max)', maxPts: 15, earned: '15.0', note: 'Leadership presence' },
      { name: 'Statutory Compliance', target: '100%', actual: '100%', achieved: '100%', maxPts: 10, earned: '10.0', note: 'Zero non-compliance' },
      { name: 'OHS Safety Committee', target: '1 meeting', actual: '1 meeting', achieved: '100%', maxPts: 10, earned: '10.0', note: 'All actions closed' },
      { name: 'Mock Emergency Drill', target: '1 drill', actual: '1 drill', achieved: '100%', maxPts: 5, earned: '5.0', note: 'Height rescue drill' },
    ],
    proactiveTotal: '100.0',
    penalties: [
      { name: 'Harm Incidents (MTC / LTI / Fatality)', deduction: '0 pts', reason: 'Zero harm maintained' },
    ],
    totalDeduction: '0.0',
    finalScore: '100.0',
    grade: 'Platinum',
    takeaway: '100.0 base points earned with zero incident deductions = 100.0 Final Score (Platinum Grade).',
  },
  incident: {
    title: 'Plot Solar-04: At-Risk Due to an LTI Incident',
    tag: 'Bronze / Needs Improvement (48.5 / 100)',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    description: 'Shows why incident prevention is crucial: even though the plot completed several activities, an LTI and missed walkdown severely reduced the score.',
    rows: [
      { name: 'Near Miss Reporting', target: '1 report', actual: '0 reports', achieved: '0%', maxPts: 10, earned: '0.0', note: 'No hazards caught' },
      { name: 'Training Hours', target: '15 hrs', actual: '10 hrs', achieved: '66.7%', maxPts: 10, earned: '6.67', note: 'Missed training target' },
      { name: 'Training Sessions', target: '2 sessions', actual: '1 session', achieved: '50%', maxPts: 10, earned: '5.0', note: 'Only 1 session held' },
      { name: 'Safety Audits', target: '2 / yr', actual: '0.17 credited', achieved: '100%', maxPts: 15, earned: '15.0', note: 'Audit on track' },
      { name: 'LOTO Adherence', target: '100%', actual: '80%', achieved: '80%', maxPts: 15, earned: '12.0', note: 'Breach observed' },
      { name: 'WPI Walkdowns', target: '2 walkdowns', actual: '1 walkdown', achieved: '50%', maxPts: 15, earned: '7.5', note: 'Only 1 walkdown done' },
      { name: 'Statutory Compliance', target: '100%', actual: '90%', achieved: '90%', maxPts: 10, earned: '9.0', note: '1 consent pending' },
      { name: 'OHS Safety Committee', target: '1 meeting', actual: '1 meeting', achieved: '100%', maxPts: 10, earned: '10.0', note: 'MOM on file' },
      { name: 'Mock Emergency Drill', target: '1 drill', actual: '0 drills', achieved: '0%', maxPts: 5, earned: '0.0', note: 'Drill was skipped' },
    ],
    proactiveTotal: '65.17',
    penalties: [
      { name: '1 Lost Time Injury (LTI)', deduction: '-15.0 pts', reason: 'Technician sprained ankle stepping from transformer' },
      { name: '1 Medical Treatment Case (MTC)', deduction: '-5.0 pts', reason: 'Cut while pulling cable' },
    ],
    totalDeduction: '-20.0',
    finalScore: '45.17',
    grade: 'Bronze',
    takeaway: 'Base score was 65.17. Deducting 20.0 points for 1 LTI and 1 MTC dropped the final score to 45.17 (Bronze Grade). Immediate CAPA required.',
  },
}

export default function SafetyIndexModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('howItWorks') // 'howItWorks' | 'workedExample' | 'metricsList' | 'simulator' | 'grades'
  const [selectedExampleKey, setSelectedExampleKey] = useState('good')

  // Simulator inputs
  const [nearMiss, setNearMiss] = useState(1)
  const [trainingHours, setTrainingHours] = useState(15)
  const [trainingSessions, setTrainingSessions] = useState(2)
  const [audits, setAudits] = useState(1)
  const [loto, setLoto] = useState(100)
  const [walkdowns, setWalkdowns] = useState(2)
  const [statutory, setStatutory] = useState(100)
  const [ohs, setOhs] = useState(1)
  const [mockDrills, setMockDrills] = useState(1)
  const [mtc, setMtc] = useState(0)
  const [lti, setLti] = useState(0)
  const [fatality, setFatality] = useState(0)

  if (!isOpen) return null

  // Calculate simulated score
  const nmScore = Math.min(100, (nearMiss / 1) * 100)
  const thScore = Math.min(100, (trainingHours / 15) * 100)
  const tsScore = Math.min(100, (trainingSessions / 2) * 100)
  const auScore = Math.min(100, (audits / (2 / 12)) * 100)
  const loScore = Math.min(100, Number(loto))
  const wkScore = Math.min(100, (walkdowns / 2) * 100)
  const stScore = Math.min(100, Number(statutory))
  const ohScore = Math.min(100, (ohs / 1) * 100)
  const mdScore = Math.min(100, (mockDrills / 1) * 100)

  const baseScore =
    nmScore * 0.1 +
    thScore * 0.1 +
    tsScore * 0.1 +
    auScore * 0.15 +
    loScore * 0.15 +
    wkScore * 0.15 +
    stScore * 0.1 +
    ohScore * 0.1 +
    mdScore * 0.05

  const penalties = mtc * 5 + lti * 15 + fatality * 40
  const simScore = Math.max(0, Math.min(100, baseScore - penalties)).toFixed(1)

  let simGrade = 'Bronze'
  if (simScore >= 90) simGrade = 'Platinum'
  else if (simScore >= 75) simGrade = 'Gold'
  else if (simScore >= 50) simGrade = 'Silver'

  const currentExample = WORKED_EXAMPLES[selectedExampleKey]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white flex items-center justify-between border-b border-teal-800/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  How the Safety Score Index is Calculated
                </h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                  Plain-Language Guide
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Step-by-step breakdown of how plots earn points, deductions for incidents, and final grade evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex-shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('howItWorks')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'howItWorks'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Simple 3-Step Concept</span>
          </button>

          <button
            onClick={() => setActiveTab('workedExample')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'workedExample'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>2. Real Worked Example (With Numbers)</span>
          </button>

          <button
            onClick={() => setActiveTab('metricsList')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'metricsList'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. All 9 Metrics &amp; Points</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>4. Live Interactive Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'grades'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>5. Performance Grades</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: SIMPLE 3-STEP CONCEPT */}
          {activeTab === 'howItWorks' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Summary Card */}
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>The Core Idea: Think of it like a 100-Point Safety Scorecard</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Every plant or plot starts the month with <strong>0 points</strong>. You earn points by completing proactive safety activities (walkdowns, drills, trainings, audits). If you hit all your monthly targets, you earn <strong>100.0 out of 100 points</strong>.
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  However, if someone gets injured on site (an MTC or LTI), <strong>points are directly subtracted</strong> from your total score as an incident penalty.
                </p>
              </div>

              {/* 3 Step Visual Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* STEP 1 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Earn Points by Hitting Targets</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      There are <strong>9 positive safety activities</strong>. Each has a specific monthly target (e.g., 2 walkdowns, 15 training hours).
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900">
                    Maximum possible base score: <strong className="text-emerald-700 font-black">+100 Points</strong>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 font-black text-sm flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Subtract Penalties for Incidents</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      If an actual injury occurs, points are immediately deducted:
                    </p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                      <span>Medical Treatment (MTC):</span>
                      <span>-5 Points</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                      <span>Lost Time Injury (LTI):</span>
                      <span>-15 Points</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                      <span>Fatality:</span>
                      <span>-40 Points</span>
                    </div>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Get Final Grade &amp; Rank</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      Your remaining score (Base Points − Deductions) gives your grade:
                    </p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg">
                      <span>Platinum (Top Tier):</span>
                      <span>90 to 100</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                      <span>Gold (Very Good):</span>
                      <span>75 to 89.9</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <span>Silver (Average):</span>
                      <span>50 to 74.9</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg">
                      <span>Bronze (Needs Action):</span>
                      <span>Below 50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Questions Callout */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Frequently Asked Questions by Site Teams:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block font-bold">Q: If we do 30 Near Misses, do we get 300 points?</strong>
                    <span className="text-slate-600 block">
                      <strong>No.</strong> Each metric is capped at 100% of its target (e.g. Near Miss is worth 10 points max). Extra near misses won't cover up missing walkdowns or poor LOTO.
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block font-bold">Q: How does YTD (Year-to-Date) score work?</strong>
                    <span className="text-slate-600 block">
                      When viewing "All Months", the dashboard simply averages the monthly scores for that plot across January to December.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REAL WORKED EXAMPLE */}
          {activeTab === 'workedExample' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Scenario Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Choose a Real Plot Scenario to Inspect:
                  </span>
                  <span className="text-xs text-slate-700 font-medium">
                    See exactly how every point is added and subtracted
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedExampleKey('good')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedExampleKey === 'good'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Scenario A: Gold (Good Plot)
                  </button>
                  <button
                    onClick={() => setSelectedExampleKey('perfect')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedExampleKey === 'perfect'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Scenario B: Platinum (Perfect)
                  </button>
                  <button
                    onClick={() => setSelectedExampleKey('incident')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedExampleKey === 'incident'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Scenario C: Bronze (With LTI)
                  </button>
                </div>
              </div>

              {/* Scenario Banner */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">{currentExample.title}</h3>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${currentExample.badgeClass}`}>
                      {currentExample.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{currentExample.description}</p>
                </div>
                <div className="text-right sm:text-right flex-shrink-0">
                  <div className="text-[11px] text-teal-300 font-bold uppercase">Final Evaluated Score:</div>
                  <div className="text-3xl font-black text-emerald-400">{currentExample.finalScore} <span className="text-sm font-normal text-slate-400">/ 100</span></div>
                </div>
              </div>

              {/* Step 1 Table: Proactive Points Earned */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Part 1: Points Earned from Proactive Safety Activities</span>
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    Base Total: {currentExample.proactiveTotal} / 100 Points
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Metric Activity</th>
                        <th className="py-2.5 px-3">Monthly Target</th>
                        <th className="py-2.5 px-3">Actual Done</th>
                        <th className="py-2.5 px-3">Target Achieved</th>
                        <th className="py-2.5 px-3">Max Pts</th>
                        <th className="py-2.5 px-3 text-right">Points Earned</th>
                        <th className="py-2.5 px-3">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {currentExample.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{r.target}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.actual}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {r.achieved}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{r.maxPts}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                            {r.earned}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">{r.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 2: Penalties Deducted */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>Part 2: Deductions for Actual Harm Incidents</span>
                </h4>
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-2">
                  {currentExample.penalties.map((pen, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-semibold text-rose-950 bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs">
                      <div>
                        <strong>{pen.name}</strong>
                        <span className="text-slate-500 font-normal ml-2">— {pen.reason}</span>
                      </div>
                      <span className="font-black text-rose-600 text-sm">{pen.deduction}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center text-xs font-bold text-rose-900">
                    <span>Total Incident Penalties:</span>
                    <span className="text-sm font-black text-rose-700">{currentExample.totalDeduction} Points</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Final Math Calculation Box */}
              <div className="p-4 rounded-2xl bg-emerald-950 text-white border border-emerald-800 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Step 3: Calculating Final Score
                </div>
                <div className="text-sm sm:text-base font-mono font-bold flex items-center gap-3 flex-wrap">
                  <span className="text-emerald-300">Base Points ({currentExample.proactiveTotal})</span>
                  <span>−</span>
                  <span className="text-rose-400">Penalties ({Math.abs(parseFloat(currentExample.totalDeduction))})</span>
                  <span>=</span>
                  <span className="text-white text-xl font-black bg-emerald-800/80 px-3 py-1 rounded-xl border border-emerald-600">
                    {currentExample.finalScore} / 100 ({currentExample.grade} Grade)
                  </span>
                </div>
                <p className="text-xs text-teal-200/90 pt-1 leading-normal italic">
                  Takeaway: {currentExample.takeaway}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ALL 9 METRICS EXPLAINED */}
          {activeTab === 'metricsList' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-slate-600 leading-relaxed">
                Here is why each of the 9 leading activities is tracked, what the monthly plot target is, and how points are awarded:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCORING_COMPONENTS.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{comp.icon}</span>
                        <h4 className="font-extrabold text-sm text-slate-900">{comp.name}</h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {comp.weight} Points Max
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Why it matters:</span>
                        <p className="text-slate-700 leading-relaxed">{comp.plainWhy}</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-500 uppercase">Monthly Benchmark Target:</span>
                          <span className="font-extrabold text-slate-900">{comp.target}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed pt-1">
                          <strong>How you earn points:</strong> {comp.plainRule}
                        </p>
                      </div>

                      <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                        <strong>Example:</strong> {comp.example}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE INTERACTIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Outcome Banner */}
              <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 border border-teal-800/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
                <div>
                  <div className="text-xs font-bold text-teal-300 uppercase tracking-widest">
                    Live Score Simulator Output
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl sm:text-5xl font-black text-white">{simScore}</span>
                    <span className="text-base text-teal-300">/ 100</span>
                  </div>
                  <div className="text-xs text-teal-200/90 mt-1 font-mono">
                    Proactive Base: {baseScore.toFixed(1)} pts − Deductions: {penalties} pts
                  </div>
                </div>

                <div className="text-center sm:text-right space-y-1.5">
                  <div className="text-xs text-teal-200 font-medium">Resulting Performance Grade:</div>
                  <span
                    className={`inline-block px-5 py-2 rounded-2xl text-xs font-extrabold border ${
                      simGrade === 'Platinum'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : simGrade === 'Gold'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : simGrade === 'Silver'
                        ? 'bg-slate-100 text-slate-900 border-slate-300'
                        : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}
                  >
                    {simGrade} Tier
                  </span>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Move sliders to see how each activity or incident directly changes the score:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Near Miss */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Near Miss Reports:</span>
                      <span className="text-emerald-700 font-mono">{nearMiss} / 1 tgt ({nmScore.toFixed(0)}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={nearMiss}
                      onChange={(e) => setNearMiss(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">10 Pts max (Target: 1 report)</div>
                  </div>

                  {/* Training Hours */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Training Hours:</span>
                      <span className="text-emerald-700 font-mono">{trainingHours} / 15 hrs ({thScore.toFixed(0)}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={trainingHours}
                      onChange={(e) => setTrainingHours(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">10 Pts max (Target: 15 hrs)</div>
                  </div>

                  {/* Walkdowns */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>WPI Walkdowns:</span>
                      <span className="text-emerald-700 font-mono">{walkdowns} / 2 done ({wkScore.toFixed(0)}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={walkdowns}
                      onChange={(e) => setWalkdowns(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">15 Pts max (Target: 2 walkdowns)</div>
                  </div>

                  {/* LOTO */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>LOTO Adherence:</span>
                      <span className="text-emerald-700 font-mono">{loto}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={loto}
                      onChange={(e) => setLoto(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">15 Pts max (Target: 100%)</div>
                  </div>

                  {/* Statutory */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Statutory Compliance:</span>
                      <span className="text-emerald-700 font-mono">{statutory}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={statutory}
                      onChange={(e) => setStatutory(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">10 Pts max (Target: 100%)</div>
                  </div>

                  {/* Harm Incident LTI */}
                  <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-rose-950">
                      <span>Lost Time Injuries (LTI):</span>
                      <span className="text-rose-600 font-black">{lti} (−{lti * 15} pts)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      value={lti}
                      onChange={(e) => setLti(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-rose-600 font-medium">-15 Points per LTI case!</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GRADE PERFORMANCE TIERS */}
          {activeTab === 'grades' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-slate-600 leading-relaxed">
                What do these grades mean for plant operations and management reviews?
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                      Platinum Grade (90.0 – 100.0)
                    </span>
                    <span className="text-xs font-bold text-purple-900 font-mono">World-Class</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Zero recordable harm events, full LOTO and statutory adherence, active leadership presence in the field. Eligible for cluster safety recognition awards.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Gold Grade (75.0 – 89.9)
                    </span>
                    <span className="text-xs font-bold text-amber-900 font-mono">Very Good Proactive Safety</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Strong ongoing proactive culture. All core inspections completed. May have had slight training hour shortfalls or an isolated minor first aid/MTC case.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                      Silver Grade (50.0 – 74.9)
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-mono">Average / Needs Focus</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Legal compliance is maintained, but proactive metrics like walkdowns, drills, or near miss reporting are falling behind schedule.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                      Bronze Grade (&lt; 50.0)
                    </span>
                    <span className="text-xs font-bold text-rose-800 font-mono">Not Satisfactory / Urgent CAPA</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Severe warning. Triggered either by an LTI / Fatality incident or gross neglect of leading safety indicators. Requires an immediate Corrective &amp; Preventive Action (CAPA) review with Corporate EHS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Greenko Kurnool Cluster Standard EHS Metric Guidelines</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}
