# Greenko Pinnapuram Cluster — EHS Digital Dashboard

Full-stack EHS (Environment, Health & Safety) digital dashboard for the 4-plant cluster (**Pinnapuram, Ghani, Chenekapalli, Nagalooty**).

- **Backend**: FastAPI + SQLAlchemy + SQLite (Port `8001`)
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts (Port `5174`)
- **Remote Access**: Cloudflare Quick Tunnel (20–30 min auto-expiring secure links)
- **Deployment**: Headless silent Windows background launcher + Git auto-sync daemon

---

## Complete Installation Guide (How to Deploy to Other Server PCs)

Follow these steps to set up and run the dashboard on any Windows server PC or workstation:

### Step 1: Install Prerequisites on the Server PC

Make sure the following three software packages are installed on the server PC:

1. **Python 3.11 or newer**  
   - Download from: [python.org/downloads](https://www.python.org/downloads/)  
   - ⚠️ **CRITICAL**: During Python installation, check the box:  
     ☑ **"Add python.exe to PATH"** before clicking Install.

2. **Node.js (v18 or v20 LTS)**  
   - Download from: [nodejs.org](https://nodejs.org/) (LTS version recommended).

3. **Git for Windows**  
   - Download from: [git-scm.com/download/win](https://git-scm.com/download/win).

*(Optional)* **Cloudflared CLI**:
- If not installed, `start.bat` will automatically download `cloudflared.exe` into `%USERPROFILE%\bin\`.
- Or install manually via PowerShell:
  ```powershell
  winget install --id Cloudflare.cloudflared
  ```

---

### Step 2: Clone the Repository

Open Command Prompt or PowerShell on the server PC and clone the repository:

```bash
git clone https://github.com/RoshithNoorbasha/EHS-Dashboard.git
cd EHS-Dashboard
```

---

### Step 3: One-Click Dependency Setup

Run the automated installer:

```batch
start.bat install
```

This single command automatically:
- Creates the Python virtual environment (`backend/venv`).
- Installs all backend packages (`fastapi`, `uvicorn`, `pandas`, `sqlalchemy`, `openpyxl`).
- Seeds the initial database (`ehs_dashboard.db`) with plants, plots, and sample metrics.
- Installs all frontend node packages (`node_modules`).
- Pre-compiles the frontend production bundle.

---

### Step 4: Launch Silently (Zero Terminal Windows)

To run the dashboard completely headless in the background without any command prompt windows remaining open:

- **Simply double-click `start.bat`** (or `start_silent.vbs`)  
  *or run from command line:*
  ```batch
  start.bat silent
  ```

**What happens automatically:**
1. FastAPI backend launches silently in the background on port `8001`.
2. Vite frontend launches silently in the background on port `5174`.
3. Background Git Auto-Sync daemon activates (polls GitHub for commits every 30s).
4. Default web browser opens automatically to `http://localhost:5174`.
5. **No terminal windows remain on your screen.**

---

### Step 5: Setup Automatic Windows Boot / Auto-Start (Recommended)

To ensure the dashboard runs 24/7 even after the server PC reboots or a user signs in:

1. Right-click **`install_autostart_service.bat`** and click **Run as administrator** (or normal user).
2. It registers a task with Windows Task Scheduler (`EHS_Dashboard_Silent_Server`).
3. Whenever the computer starts up or logs in, the dashboard and Git auto-sync start silently in the background automatically.

*(To disable autostart later, simply run `uninstall_autostart_service.bat`)*

---

### Step 6: Enable Same Wi-Fi / Local Office Network Sharing

If team members, plant engineers, or management want to view the dashboard from their laptops, tablets, or phones on the **same office Wi-Fi / LAN**:

1. Right-click **`allow_firewall.bat`** and select **Run as administrator**.
   - This opens inbound port `5174` in Windows Defender Firewall with one click.
2. Find the server's local IP (e.g., `http://192.168.1.50:5174`).
   - The exact Wi-Fi address is displayed inside the dashboard header under the scope banner and inside the **Server & Backups** settings.
3. Any device connected to the same Wi-Fi can now open `http://<SERVER_IP>:5174` with zero configuration!

---

### Step 7: Automated Git Continuous Deployment (Auto-Update)

You can make changes on your development PC, push to GitHub, and have them **automatically reflected on the Server PC**:

1. **On your development machine**:
   ```bash
   git add .
   git commit -m "Update safety charts and report logic"
   git push origin main
   ```
2. **On the Server PC**:
   - The built-in background daemon (`backend/git_sync.py`) checks GitHub every **30 seconds**.
   - As soon as new commits are detected, it pulls changes (`git pull origin main`), upgrades dependencies if `requirements.txt` or `package.json` changed, and updates frontend/backend instantly.
   - **Zero downtime**: Vite HMR and FastAPI hot-reload apply changes without restarting the server!

---

### Step 8: Cloudflare Remote Link Sharing (Time-Limited & Multi-Admin)

When external auditors, regional managers, or headquarters need remote access from outside the office Wi-Fi:

1. Log in as an Admin (`admin` or `superadmin`).
2. Click **"Share Remote Link"** in the top navigation bar.
3. Select an expiry duration: **20 Mins, 25 Mins, or 30 Mins** (strict 30-minute maximum to prevent free-tier tunnel exhaustion).
4. Click **Generate Remote Link**:
   - Creates an encrypted public HTTPS URL (`https://*.trycloudflare.com`) with a live QR code and 1-click Copy button.
   - Live visual countdown timer displays remaining time before auto-expiry.
5. **Multi-Admin Collision Protection**:
   - If another admin already generated an active link, the portal displays **who generated it**, **time created**, and **countdown to expiry**.
   - Admins can either wait for it to expire, click **"Delete & Re-generate"** to replace it immediately with a fresh timer, or click **"Stop Link"**.
   - The moment time runs out, the background watcher terminates the tunnel process automatically.

---

## Default Login Credentials

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `superadmin` | `SuperAdmin@Greenko2026` | Full system control, database backups, server tunnel, user management |
| **Cluster Admin** | `admin` | `Admin@Greenko2026` | All plants & plots (Read & Write), remote tunnel sharing |
| **Manager** | `manager` | `Manager@Greenko2026` | Executive safety review (Read-Only across all plants) |
| **Site Incharge** | `site_pinnapuram` | `Pinna@Greenko2026` | Pinnapuram Plant data entry (Read & Write) |
| **Site Incharge** | `site_ghani` | `Ghani@Greenko2026` | Ghani Plant data entry (Read & Write) |

---

## Handy Management Scripts & Commands

| Script / Command | Purpose |
|---|---|
| `start.bat` | Starts backend and frontend silently in the background (0 terminal windows) |
| `start.bat silent` | Explicit silent background start |
| `start.bat status` | Checks health of ports `8001` (backend), `5174` (frontend), and Cloudflare tunnel |
| `start.bat stop` *(or `stop.bat`)* | Cleanly stops all background services, listeners, and tunnels |
| `start.bat run` | Starts servers with open console windows (for debugging and inspecting logs) |
| `create_desktop_shortcut.vbs` | Creates a 1-click launch icon directly on your Windows Desktop |
| `install_autostart_service.bat` | Registers auto-start on Windows login with Task Scheduler |
| `uninstall_autostart_service.bat` | Removes the Windows Task Scheduler startup job |
| `allow_firewall.bat` | Opens firewall port 5174 for same-network Wi-Fi access |
