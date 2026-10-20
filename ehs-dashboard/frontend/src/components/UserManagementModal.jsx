import { useEffect, useState } from 'react'
import { X, Users, UserPlus, Shield, Check, Trash2, Edit3, Building, Key } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin (Full System Control)' },
  { value: 'ADMIN', label: 'Admin (All Plants R&W)' },
  { value: 'MANAGER', label: 'Manager (Read-Only Access - All Plants/Plots)' },
  { value: 'SITE_INCHARGE', label: 'Site Incharge (Assigned Plants Only R&W)' },
]

const ROLE_BADGES = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  ADMIN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MANAGER: 'bg-slate-100 text-slate-700 border-slate-200',
  SITE_INCHARGE: 'bg-amber-100 text-amber-800 border-amber-200',
}

export default function UserManagementModal({ isOpen, onClose }) {
  const { isSuperAdmin, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [msg, setMsg] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'MANAGER',
    assigned_plant_ids: [],
    is_active: true,
  })

  const loadData = () => {
    setLoading(true)
    Promise.all([api.get('/auth/users'), api.get('/plants')])
      .then(([u, p]) => {
        setUsers(u.data)
        setPlants(p.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      setShowAddForm(false)
      setEditingUserId(null)
      setMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      const payload = {
        ...formData,
        assigned_plant_ids: Array.isArray(formData.assigned_plant_ids)
          ? formData.assigned_plant_ids.join(',')
          : formData.assigned_plant_ids || '',
      }

      if (editingUserId) {
        await api.put(`/auth/users/${editingUserId}`, payload)
        setMsg('User updated successfully!')
      } else {
        if (!formData.password) {
          alert('Password is required for new user')
          return
        }
        await api.post('/auth/users', payload)
        setMsg('User created successfully!')
      }

      setShowAddForm(false)
      setEditingUserId(null)
      setFormData({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role: 'MANAGER',
        assigned_plant_ids: [],
        is_active: true,
      })
      loadData()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed to save user')
    }
  }

  const handleEditClick = (u) => {
    setEditingUserId(u.id)
    const plantIds = (u.assigned_plant_ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
    setFormData({
      username: u.username,
      full_name: u.full_name,
      email: u.email || '',
      password: '',
      role: u.role,
      assigned_plant_ids: plantIds,
      is_active: u.is_active,
    })
    setShowAddForm(true)
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api.delete(`/auth/users/${userId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not delete user')
    }
  }

  const togglePlantAssignment = (plantId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.assigned_plant_ids) ? prev.assigned_plant_ids : []
      if (current.includes(plantId)) {
        return { ...prev, assigned_plant_ids: current.filter((id) => id !== plantId) }
      } else {
        return { ...prev, assigned_plant_ids: [...current, plantId] }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Management & Role Assignment (RBAC)</h2>
              <p className="text-xs text-slate-500">Configure roles: Super Admin, Admin, Manager, and Site Incharge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
            {msg}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            System Users ({users.length})
          </span>
          <button
            onClick={() => {
              setEditingUserId(null)
              setFormData({
                username: '',
                full_name: '',
                email: '',
                password: '',
                role: 'MANAGER',
                assigned_plant_ids: [],
                is_active: true,
              })
              setShowAddForm(!showAddForm)
            }}
            className="px-3.5 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            {showAddForm ? 'Close Form' : 'Add New User'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateOrUpdate} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              {editingUserId ? `Edit User #${editingUserId}` : 'Create New System User'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUserId}
                  placeholder="e.g. jdoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. jdoe@greenko.net"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {editingUserId ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  placeholder={editingUserId ? 'Keep existing password' : 'Enter password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Assigned Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                  <span>Active Account</span>
                </label>
              </div>
            </div>

            {/* If Site Incharge, show Plant assignment checkboxes */}
            {formData.role === 'SITE_INCHARGE' && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>Assign Plant(s) for Site Incharge:</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Site Incharge will ONLY be able to view and enter data for the selected plant(s).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {plants.map((p) => {
                    const isAssigned = (formData.assigned_plant_ids || []).includes(p.id)
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePlantAssignment(p.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors ${
                          isAssigned
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{p.name}</span>
                        {isAssigned && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
              >
                {editingUserId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Scope / Assigned Plants</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const assignedNames = (u.assigned_plant_ids || '')
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter(Boolean)
                  .map((id) => plants.find((p) => p.id === id)?.name || `#${id}`)

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{u.username} · {u.email || 'No email'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${ROLE_BADGES[u.role] || 'bg-slate-100'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'SITE_INCHARGE' ? (
                        assignedNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedNames.map((name) => (
                              <span key={name} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No plants assigned</span>
                        )
                      ) : (
                        <span className="text-slate-500 font-medium">All Plants & Plots</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && u.username !== 'superadmin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
