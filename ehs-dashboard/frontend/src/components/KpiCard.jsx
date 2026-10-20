export default function KpiCard({ label, value, icon, status = 'default', sub, trend }) {
  const statusColors = {
    good: 'text-emerald-700 bg-emerald-100/80 border-emerald-200',
    warn: 'text-amber-700 bg-amber-100/80 border-amber-200',
    bad: 'text-red-700 bg-red-100/80 border-red-200',
    default: 'text-teal-700 bg-teal-100/80 border-teal-200',
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border flex-shrink-0 group-hover:scale-105 transition-transform ${statusColors[status]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-gray-900 tracking-tight truncate">{value}</span>
          {trend && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{trend}</span>}
        </div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}
