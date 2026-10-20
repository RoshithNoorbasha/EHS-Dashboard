# Greenko Pinnapuram Cluster — EHS Digital Dashboard

Full-stack EHS (Environment, Health & Safety) dashboard for the 4-plant
cluster (Pinnapuram, Ghani, Chenekapalli, Nagalooty).

- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts (`frontend/`)

## Quick start (Windows)

```
start.bat install    # one-time setup: creates the Python venv, installs
                      # backend + frontend dependencies, seeds sample data
start.bat run         # launches backend, frontend, and Cloudflare Quick Tunnel!
start.bat local       # launches backend + frontend only (no tunnel)
start.bat tunnel      # launches Cloudflare Quick Tunnel only
start.bat stop        # stops all background services and tunnels
```

`start.bat install` requires **Python 3.11+** and **Node.js 18+** already
on your PATH. 

`start.bat run` (or simply double-clicking `start.bat`) automatically:
1. Starts the FastAPI backend on `http://localhost:8001`
2. Starts the Vite frontend on `http://localhost:5174`
3. Launches **Cloudflare Quick Tunnel** to auto-generate a public link (`https://*.trycloudflare.com`)
4. Automatically copies the public Cloudflare link to your clipboard so you can immediately share it!
5. Opens `http://localhost:5174` in your default browser.

## Manual setup (Mac/Linux or if you prefer not to use start.bat)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py              # loads 4 plants + 7 months of sample data
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*`
requests to the FastAPI backend on port 8000, so no extra config is needed.

## What's included

- **Dashboard**: cluster KPI cards, plant ranking leaderboard, critical
  safety issues, quick stats
- **Plant Ranking**: score bar chart, radar comparison, grade legend,
  month/year filters
- **Lagging Indicators**: fatality/LTI/MTC/FAC summary table, TRIFR trend,
  incident-type breakdown, safety pyramid, incident log
- **Leading Indicators**: near-miss/unsafe-act/unsafe-condition comparison,
  training hours by plant, training-topic breakdown
- **Compliance**: heat-map table across PTW/LOTO/statutory/audit/fire-safety,
  open compliance issues
- **Data Entry & Upload**: drag-in CSV/XLSX upload with auto-detection for
  monthly metrics, manual entry form, upload history
- **Reports & Target Tracking**: FY target tracker with CSV export

## API

FastAPI auto-generates interactive docs at `http://localhost:8000/docs`
covering plants, monthly metrics, incidents, near-misses, training records,
safety issues, audit findings, compliance, and file upload endpoints.

## Notes on scope

This is a working, runnable build of the full spec's data model and core
workflows — one page (not a Postgres cluster, JWT auth, or PDF report
generation) to keep local setup to a single `start.bat install`. The
database is SQLite (`backend/ehs_dashboard.db`, created on first run) so
there's nothing extra to install or configure. If you outgrow SQLite,
swapping `database.py` to point at Postgres is a small, contained change
since the models and queries are plain SQLAlchemy.

Sample data (4 plants × 7 months, Jan–Jul 2026) is loaded by `seed.py` /
`start.bat install` so the dashboard isn't empty on first run. Upload your
own file (or re-run against real data) via the Data Entry & Upload page —
it matches the same `Plant,Month,Year,Fatality,LTI,MTC,FAC,SafeManHours,...`
column layout as the original spec's sample template.
