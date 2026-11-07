import { useState, useEffect, useRef } from 'react'
import {
  X,
  Server,
  Database,
  Cloud,
  GitBranch,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Play,
  Square,
  FileJson,
  HardDrive,
  Activity,
  Layers,
  Clock,
  Radio,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function SuperAdminSettingsModal({ isOpen, onClose }) {
  const { currentUser, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('backups') // 'backups' | 'tunnel' | 'deployment' | 'health'

  // Data states
  const [status, setStatus] = useState(null)
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [backupNote, setBackupNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [tunnelDuration, setTunnelDuration] = useState(30)
  const [gitSyncData, setGitSyncData] = useState(null)

  // Restore confirmation modal/dialog
  const [confirmRestoreFile, setConfirmRestoreFile] = useState(null)

  // Upload file ref
  const fileInputRef = useRef(null)

  const fetchStatusAndBackups = async () => {
    setLoading(true)
    try {
      const [statusRes, backupsRes, gitSyncRes] = await Promise.all([
        api.get('/system/status'),
        api.get('/system/backups'),
        api.get('/system/git/auto-sync-status').catch(() => ({ data: null })),
      ])
      setStatus(statusRes.data)
      setBackups(backupsRes.data)
      if (gitSyncRes?.data) setGitSyncData(gitSyncRes.data)
    } catch (err) {
      console.error('Error fetching system status', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndBackups()
      setMsg({ type: '', text: '' })
      setBackupNote('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // 1. Create Instant Backup
  const handleCreateBackup = async () => {
    setActionLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await api.post(`/system/backups/create${backupNote ? `?notes=${encodeURIComponent(backupNote)}` : ''}`)
      setMsg({ type: 'success', text: `Verified database backup created: ${res.data.filename}` })
      setBackupNote('')
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create backup' })
    } finally {
      setActionLoading(false)
    }
  }

  // 2. Download Backup
  const handleDownloadBackup = (filename) => {
    const downloadUrl = `${api.defaults.baseURL || ''}/system/backups/download/${filename}`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 3. Export full JSON
  const handleExportJson = () => {
    const exportUrl = `${api.defaults.baseURL || ''}/system/backups/export-json`
    const a = document.createElement('a')
    a.href = exportUrl
    a.download = `EHS_Cluster_Data_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 4. Restore from list
  const handleRestore = async (filename) => {
    setActionLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await api.post(`/system/backups/restore/${filename}`)
      setMsg({
        type: 'success',
        text: `${res.data.message}. A safety rollback point (${res.data.rollback_created}) was created first.`,
      })
      setConfirmRestoreFile(null)
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to restore database' })
    } finally {
      setActionLoading(false)
    }
  }

  // 5. Upload and Restore
  const handleUploadRestore = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.db')) {
      setMsg({ type: 'error', text: 'File must have a .db extension (SQLite binary database).' })
      return
    }

    if (!window.confirm(`Are you sure you want to restore the entire database from "${file.name}"? The system will create an automatic rollback checkpoint first.`)) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setActionLoading(true)
    setMsg({ type: '', text: '' })
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/system/backups/upload-restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg({
        type: 'success',
        text: `${res.data.message}. Safety rollback: ${res.data.rollback_created}`,
      })
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Upload restore failed' })
    } finally {
      setActionLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 6. Delete Backup
  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup file "${filename}"?`)) return
    setActionLoading(true)
    try {
      await api.delete(`/system/backups/${filename}`)
      setMsg({ type: 'success', text: `Backup file ${filename} deleted.` })
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete backup' })
    } finally {
      setActionLoading(false)
    }
  }

  // 7. Start/Stop/Regenerate Cloudflare Tunnel
  const handleToggleTunnel = async (action) => {
    setActionLoading(true)
    setMsg({ type: '', text: '' })
    try {
      if (action === 'start') {
        const res = await api.post('/system/tunnel/start', {
          duration_minutes: tunnelDuration,
          username: currentUser?.username || 'superadmin',
          full_name: currentUser?.full_name || 'Super Administrator',
        })
        if (res.data?.session?.url) {
          setMsg({
            type: 'success',
            text: `Cloudflare Tunnel active for ${tunnelDuration} mins! Public link: ${res.data.session.url}`,
          })
        } else {
          setMsg({
            type: 'info',
            text: res.data?.message || 'Tunnel process initiated. Public URL will populate in a moment.',
          })
        }
      } else {
        await api.post(`/system/tunnel/stop?username=${encodeURIComponent(currentUser?.username || 'superadmin')}`)
        setMsg({ type: 'success', text: 'Cloudflare Tunnel has been stopped.' })
      }
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || `Failed to ${action} tunnel` })
    } finally {
      setActionLoading(false)
    }
  }

  // Delete & Regenerate Tunnel
  const handleRegenerateTunnel = async () => {
    setActionLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await api.post('/system/tunnel/regenerate', {
        duration_minutes: tunnelDuration,
        username: currentUser?.username || 'superadmin',
        full_name: currentUser?.full_name || 'Super Administrator',
      })
      if (res.data?.session?.url) {
        setMsg({ type: 'success', text: `Previous tunnel replaced! New link active: ${res.data.session.url}` })
      }
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to regenerate tunnel' })
    } finally {
      setActionLoading(false)
    }
  }

  // 8. Git Pull & Auto-Sync
  const handleGitPull = async () => {
    setActionLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await api.post('/system/git/sync-now')
      if (res.data?.status === 'updated') {
        setMsg({ type: 'success', text: `Git sync successful: Updated to ${res.data.commit_summary || 'latest commit'}` })
      } else if (res.data?.status === 'up_to_date') {
        setMsg({ type: 'info', text: 'Local server is already up to date with origin/main.' })
      } else {
        setMsg({ type: 'error', text: res.data?.error || 'Git pull failed' })
      }
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Git pull failed' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleAutoSync = async () => {
    try {
      const res = await api.post('/system/git/toggle-auto-sync')
      if (gitSyncData) {
        setGitSyncData({ ...gitSyncData, enabled: res.data.enabled })
      }
      setMsg({
        type: 'success',
        text: `Git Auto-Sync background polling is now ${res.data.enabled ? 'ENABLED (every 30s)' : 'DISABLED'}.`,
      })
      fetchStatusAndBackups()
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to toggle auto-sync' })
    }
  }

  const copyTunnelUrl = () => {
    if (status?.tunnel?.url) {
      navigator.clipboard.writeText(status.tunnel.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const tunnelUrl = status?.tunnel?.url
  const tunnelActive = Boolean(status?.tunnel?.active && tunnelUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-5 md:px-7 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Super Admin System Command</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Full Control
                </span>
              </div>
              <p className="text-xs text-purple-200/70 font-medium">
                Website backups, Cloudflare remote access portal &amp; server deployment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK ALERT */}
        {msg.text && (
          <div
            className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b ${
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
              <span className="whitespace-pre-line">{msg.text}</span>
            </div>
            <button
              onClick={() => setMsg({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 border-b border-slate-200/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'backups'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Backups &amp; Security</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-extrabold">
              {backups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tunnel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'tunnel'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloudflare Remote Access Portal</span>
            <span
              className={`w-2 h-2 rounded-full ${
                tunnelActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveTab('deployment')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'deployment'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Server &amp; Git Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'health'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BACKUPS */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              {/* TOP ACTION CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Instant Snapshot */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span>Create Server Snapshot</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Takes an atomic SQLite backup with zero disruption or locking.
                  </p>
                  <input
                    type="text"
                    placeholder="Optional label / note..."
                    value={backupNote}
                    onChange={(e) => setBackupNote(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleCreateBackup}
                    disabled={actionLoading}
                    className="w-full py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Create Instant Backup</span>
                  </button>
                </div>

                {/* 2. Download / Export */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <FileJson className="w-4 h-4 text-emerald-600" />
                    <span>Export Human-Readable JSON</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Download full dataset (all plants, metrics, incidents, audits) as JSON.
                  </p>
                  <div className="pt-5">
                    <button
                      onClick={handleExportJson}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON Full Export</span>
                    </button>
                  </div>
                </div>

                {/* 3. Upload & Restore */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>Upload &amp; Restore</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Upload a verified <code className="bg-amber-100 text-amber-900 px-1 rounded">.db</code> file from your computer. Automatic rollback copy is created.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".db"
                    onChange={handleUploadRestore}
                    className="hidden"
                  />
                  <div className="pt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose .db File to Restore</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BACKUPS HISTORY TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Available Server Backups &amp; Rollback Points</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Stored locally in <code className="text-slate-600 font-mono">backend/backups/</code> with SHA-256 data integrity.
                    </p>
                  </div>
                  <button
                    onClick={fetchStatusAndBackups}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {backups.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium">
                      No backups found on server. Click "Create Instant Backup" above to generate your first snapshot.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Backup File</th>
                            <th className="py-2.5 px-3">Date &amp; Time</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">Notes / Type</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {backups.map((b) => (
                            <tr key={b.filename} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                <div className="flex items-center gap-1.5">
                                  {b.is_rollback ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      ROLLBACK POINT
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                      SNAPSHOT
                                    </span>
                                  )}
                                  <span className="truncate max-w-[200px]" title={b.filename}>
                                    {b.filename}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-medium">
                                {new Date(b.created_at).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">
                                {b.size_formatted}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 truncate max-w-[180px]">
                                {b.notes}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleDownloadBackup(b.filename)}
                                    title="Download .db file to your PC"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmRestoreFile(b.filename)}
                                    title="Restore database to this point"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBackup(b.filename)}
                                    title="Delete backup file"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 border border-slate-200 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RESTORE CONFIRMATION DIALOG */}
              {confirmRestoreFile && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Confirm Database Restore</span>
                  </div>
                  <p className="text-xs text-amber-900">
                    Are you sure you want to restore the entire database from{' '}
                    <strong className="font-mono bg-white px-1 rounded">{confirmRestoreFile}</strong>?
                    All current records will be replaced. The server will automatically create a safety rollback backup first.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleRestore(confirmRestoreFile)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Yes, Restore Database</span>
                    </button>
                    <button
                      onClick={() => setConfirmRestoreFile(null)}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLOUDFLARE REMOTE ACCESS PORTAL & WI-FI SHARING */}
          {activeTab === 'tunnel' && (
            <div className="space-y-6">
              {/* LOCAL WI-FI NETWORK ACCESS (FOR DEVICES ON SAME WI-FI) */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-50 via-emerald-50 to-white border border-teal-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Same Wi-Fi / Local Network Access
                      </h4>
                      <p className="text-xs text-slate-500">
                        Direct connection for any phone, laptop, or tablet on the same office Wi-Fi.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                    High Speed · No Internet Needed
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Wi-Fi Portal URL (Share with devices on same Wi-Fi):
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-teal-200 shadow-2xs">
                    <input
                      type="text"
                      readOnly
                      value={status?.network?.wifi_url || `http://${window.location.hostname}:5174`}
                      className="flex-1 bg-transparent text-xs font-mono font-bold text-teal-950 outline-none"
                    />
                    <button
                      onClick={() => {
                        const url = status?.network?.wifi_url || `http://${window.location.hostname}:5174`
                        navigator.clipboard.writeText(url)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="p-1.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Wi-Fi Link'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Cannot connect from another device on the same Wi-Fi?</strong> Windows Defender Firewall might be blocking incoming connections. Double-click <strong className="font-mono bg-white px-1 rounded">allow_firewall.bat</strong> in the project folder to open port 5174 with one click.
                  </div>
                </div>
              </div>

              {/* CLOUDFLARE QUICK TUNNEL STATUS BANNER */}
              <div
                className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  tunnelActive
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300'
                    : 'bg-gradient-to-r from-slate-50 via-slate-100 to-white border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        tunnelActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    <h3 className="text-sm font-black text-slate-900">
                      Cloudflare Quick Tunnel Status:{' '}
                      <span className={tunnelActive ? 'text-emerald-700' : 'text-slate-500'}>
                        {tunnelActive ? 'ONLINE & ACCESSIBLE' : 'OFFLINE'}
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">
                    Allows external personnel, plant in-charges, and management to securely access the EHS dashboard remotely from anywhere without public IPs or port forwarding.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {tunnelActive ? (
                    <>
                      <button
                        onClick={handleRegenerateTunnel}
                        disabled={actionLoading}
                        title="Delete present link and generate a fresh one"
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                        <span>Delete &amp; Re-generate</span>
                      </button>
                      <button
                        onClick={() => handleToggleTunnel('stop')}
                        disabled={actionLoading}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop Tunnel</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={tunnelDuration}
                        onChange={(e) => setTunnelDuration(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none shadow-2xs"
                      >
                        <option value="20">20 Mins (Free tier)</option>
                        <option value="25">25 Mins</option>
                        <option value="30">30 Mins (Max)</option>
                      </select>
                      <button
                        onClick={() => handleToggleTunnel('start')}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Generate Remote Link</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE LINK & QR CODE SECTION */}
              {tunnelActive ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
                  {/* Link details */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Tunnel Meta Details */}
                    {status?.tunnel?.details?.session && (
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Generated By</span>
                          <span className="font-bold text-slate-900">
                            {status.tunnel.details.session.created_by_name} (@{status.tunnel.details.session.created_by_username})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Expires At</span>
                          <span className="font-mono font-bold text-rose-700">
                            {new Date(status.tunnel.details.session.expires_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Time Remaining</span>
                          <span className="font-mono font-extrabold text-emerald-800">
                            ~{Math.ceil((status.tunnel.details.session.seconds_remaining || 0) / 60)} mins
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Live Public Remote URL (Share with external users):
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <input
                          type="text"
                          readOnly
                          value={tunnelUrl}
                          className="flex-1 bg-transparent text-xs font-mono font-bold text-purple-900 outline-none"
                        />
                        <button
                          onClick={copyTunnelUrl}
                          className="p-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={tunnelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 px-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Security &amp; Encryption Assurances:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
                        <li>All traffic is encrypted end-to-end with free Cloudflare TLS/HTTPS.</li>
                        <li>External users can only access frontend UI and authenticated API endpoints.</li>
                        <li>Strict 30-min auto-destruction protects free-tier tunnel limits.</li>
                        <li>You can delete &amp; regenerate a fresh link at any moment.</li>
                      </ul>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        tunnelUrl
                      )}`}
                      alt="Remote QR Code"
                      className="w-32 h-32 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs"
                    />
                    <div className="text-[11px] font-bold text-slate-700">Scan to Open on Phone / Tablet</div>
                    <div className="text-[10px] text-slate-400">Fast mobile access for field teams</div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Remote Access is Currently Inactive</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Choose an expiry duration (20-30 mins based on free tier limit) and click below to start Cloudflare Quick Tunnel in the background.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                    {[20, 25, 30].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setTunnelDuration(dur)}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                          tunnelDuration === dur
                            ? 'bg-purple-700 text-white border-purple-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleToggleTunnel('start')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch {tunnelDuration}-Minute Quick Tunnel Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVER & GIT DEPLOYMENT */}
          {activeTab === 'deployment' && (
            <div className="space-y-6">
              {/* GIT BACKGROUND AUTO-SYNC STATUS CARD */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gitSyncData?.enabled ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${gitSyncData?.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>Background Git Auto-Sync Engine</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gitSyncData?.enabled ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                          {gitSyncData?.enabled ? 'ACTIVE (POLLING EVERY 30s)' : 'PAUSED'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Automatically pulls any commit pushed to GitHub and hot-reloads the local server.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleAutoSync}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      {gitSyncData?.enabled ? 'Pause Auto-Sync' : 'Enable Auto-Sync'}
                    </button>
                    <button
                      onClick={handleGitPull}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${actionLoading ? 'animate-spin' : ''}`} />
                      <span>Sync Now</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Repository Branch</span>
                    <span className="font-mono font-bold text-purple-900 block truncate">
                      {gitSyncData?.branch || status?.git?.branch || 'main'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">origin/main synced</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Latest Local Commit</span>
                    <span className="font-mono font-bold text-slate-800 block truncate" title={gitSyncData?.local_commit || status?.git?.commit}>
                      {gitSyncData?.local_commit || status?.git?.commit || 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400">Head of branch</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Check Timestamp</span>
                    <span className="font-mono font-semibold text-slate-700 block truncate">
                      {gitSyncData?.last_checked_at ? new Date(gitSyncData.last_checked_at).toLocaleTimeString() : 'Awaiting check'}
                    </span>
                    <span className="text-[10px] text-slate-400">Status: {gitSyncData?.last_sync_status || 'idle'}</span>
                  </div>
                </div>

                {/* Recent Auto-Sync Event Log */}
                {gitSyncData?.recent_logs && gitSyncData.recent_logs.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Live Sync Activity Log:
                    </span>
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] max-h-28 overflow-y-auto space-y-1">
                      {gitSyncData.recent_logs.slice(-6).map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-slate-500 flex-shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={
                              log.level === 'success'
                                ? 'text-emerald-400 font-bold'
                                : log.level === 'error'
                                ? 'text-rose-400'
                                : log.level === 'warning'
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }
                          >
                            &bull; {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                {/* Workflow explanation */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2 text-xs text-purple-950">
                  <span className="font-bold flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-600" /> Automated Continuous Deployment Workflow:
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-purple-900">
                    <li>
                      <strong>On your development PC:</strong> Make code changes, commit, and push (<code className="bg-purple-100 px-1 rounded">git push origin main</code>).
                    </li>
                    <li>
                      <strong>On this Local Server:</strong> The background auto-sync worker detects the new commit within 30 seconds and pulls it automatically.
                    </li>
                    <li>
                      <strong>Instant Reflection:</strong> Vite and FastAPI hot-reloading apply the changes immediately without restarting terminal windows!
                    </li>
                  </ol>
                </div>
              </div>

              {/* BACKGROUND RUNNER INSTRUCTIONS */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>Silent Background Execution (No Terminal Windows)</span>
                </h4>
                <p className="text-xs text-slate-600">
                  To run everything completely hidden in the background on the Server PC:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                    <strong className="text-slate-800 block font-sans">Start Silently in Background:</strong>
                    <code className="text-emerald-700 block">start.bat silent</code>
                    <span className="text-slate-400 text-[10px] font-sans">or double-click <strong className="font-mono">start_silent.vbs</strong></span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                    <strong className="text-slate-800 block font-sans">Stop All Services:</strong>
                    <code className="text-rose-700 block">start.bat stop</code>
                    <span className="text-slate-400 text-[10px] font-sans">Terminates background uvicorn, vite &amp; cloudflared</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM HEALTH */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Database File Size</div>
                  <div className="text-lg font-black text-slate-800">{status?.database?.size_formatted || '0 KB'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">SQLite 3 (Atomic)</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Saved Backups</div>
                  <div className="text-lg font-black text-purple-700">{status?.database?.backups_count || 0}</div>
                  <div className="text-[10px] text-purple-500 font-semibold">Snapshots Available</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Metric Records</div>
                  <div className="text-lg font-black text-emerald-700">{status?.counts?.metrics || 0}</div>
                  <div className="text-[10px] text-emerald-500 font-semibold">4 Plants / 12 Plots</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Users</div>
                  <div className="text-lg font-black text-indigo-700">{status?.counts?.users || 0}</div>
                  <div className="text-[10px] text-indigo-500 font-semibold">RBAC Configured</div>
                </div>
              </div>

              {/* RECORD COUNTS BREAKDOWN */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Module Record Breakdown</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Plants:</span>
                    <strong className="text-slate-900">{status?.counts?.plants}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Plots:</span>
                    <strong className="text-slate-900">{status?.counts?.plots}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Incidents Logged:</span>
                    <strong className="text-slate-900">{status?.counts?.incidents}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Training Records:</span>
                    <strong className="text-slate-900">{status?.counts?.training}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Safety Issues:</span>
                    <strong className="text-slate-900">{status?.counts?.safety_issues}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Audit Findings:</span>
                    <strong className="text-slate-900">{status?.counts?.audit_findings}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">Server Status:</span>
                    <span className="font-bold text-emerald-600 uppercase text-[10px]">HEALTHY</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="text-slate-600">API Port:</span>
                    <strong className="text-slate-900">8001 / 5174</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 px-6 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Greenko Pinnapuram EHS Command System &bull; Super Admin Level Access</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
