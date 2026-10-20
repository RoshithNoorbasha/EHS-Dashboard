import io
import os
import sys
import shutil
import glob
import sqlite3
import subprocess
import time
import socket
import hashlib
import json
import secrets
from datetime import datetime, date
from typing import Optional, List

import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Response, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

import models
import schemas
from database import Base, engine, get_db
from calculators import calculate_plant_score, get_grade, compute_derived_rates

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Greenko Pinnapuram Cluster EHS Dashboard API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    return hashlib.sha256(f"greenko_salt_{password}".encode("utf-8")).hexdigest()


@app.get("/")
def root():
    return {"status": "ok", "service": "EHS Dashboard API", "version": "2.0.0"}


# ---------------------------------------------------------------- Auth & RBAC ---
@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user:
        raise HTTPException(401, "Invalid username or password")
    
    hashed = hash_password(req.password)
    if user.password_hash != hashed:
        raise HTTPException(401, "Invalid username or password")
    
    if not user.is_active:
        raise HTTPException(403, "User account is inactive. Please contact administrator.")
    
    token = f"token_{user.id}_{secrets.token_hex(16)}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@app.post("/api/auth/register", response_model=schemas.TokenResponse)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    clean_username = req.username.strip().lower()
    if len(clean_username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters long")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long")
    
    existing = db.query(models.User).filter(models.User.username == clean_username).first()
    if existing:
        raise HTTPException(400, "Username is already registered. Please choose another or login.")
    
    # Protect against unauthorized SUPER_ADMIN or ADMIN self-registration
    requested_role = req.role or "SITE_INCHARGE"
    if requested_role in ["SUPER_ADMIN", "ADMIN"]:
        # Only existing super admin can grant ADMIN or SUPER_ADMIN; self-registration defaults to SITE_INCHARGE
        requested_role = "SITE_INCHARGE"

    new_user = models.User(
        username=clean_username,
        full_name=req.full_name.strip(),
        email=req.email.strip() if req.email else None,
        password_hash=hash_password(req.password),
        role=requested_role,
        assigned_plant_ids=req.assigned_plant_ids or "",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = f"token_{new_user.id}_{secrets.token_hex(16)}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user,
    }


@app.get("/api/auth/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id.asc()).all()


@app.post("/api/auth/users", response_model=schemas.UserOut)
def create_user(u: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == u.username).first()
    if existing:
        raise HTTPException(400, "Username already exists")
    
    user = models.User(
        username=u.username,
        full_name=u.full_name,
        email=u.email,
        password_hash=hash_password(u.password),
        role=u.role,
        assigned_plant_ids=u.assigned_plant_ids or "",
        is_active=u.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/auth/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, u: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    if u.full_name is not None:
        user.full_name = u.full_name
    if u.email is not None:
        user.email = u.email
    if u.role is not None:
        user.role = u.role
    if u.assigned_plant_ids is not None:
        user.assigned_plant_ids = u.assigned_plant_ids
    if u.is_active is not None:
        user.is_active = u.is_active
    if u.password:
        user.password_hash = hash_password(u.password)
    
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/auth/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------- Plants ---
@app.get("/api/plants", response_model=List[schemas.PlantOut])
def get_plants(db: Session = Depends(get_db)):
    return db.query(models.Plant).order_by(models.Plant.id.asc()).all()


@app.get("/api/plants/{plant_id}", response_model=schemas.PlantOut)
def get_plant(plant_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Plant).get(plant_id)
    if not p:
        raise HTTPException(404, "Plant not found")
    return p


@app.post("/api/plants", response_model=schemas.PlantOut)
def create_plant(plant: schemas.PlantCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Plant).filter(models.Plant.name == plant.name).first()
    if existing:
        raise HTTPException(400, "Plant already exists")
    p = models.Plant(name=plant.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@app.delete("/api/plants/{plant_id}")
def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Plant).get(plant_id)
    if not p:
        raise HTTPException(404, "Plant not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}


# ----------------------------------------------------------------- Plots ---
@app.get("/api/plots", response_model=List[schemas.PlotOut])
def get_plots(plant_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Plot)
    if plant_id:
        q = q.filter(models.Plot.plant_id == plant_id)
    return q.order_by(models.Plot.plant_id.asc(), models.Plot.id.asc()).all()


@app.get("/api/plots/{plot_id}", response_model=schemas.PlotOut)
def get_plot(plot_id: int, db: Session = Depends(get_db)):
    plot = db.query(models.Plot).get(plot_id)
    if not plot:
        raise HTTPException(404, "Plot not found")
    return plot


@app.post("/api/plots", response_model=schemas.PlotOut)
def create_plot(plot: schemas.PlotCreate, db: Session = Depends(get_db)):
    plant = db.query(models.Plant).get(plot.plant_id)
    if not plant:
        raise HTTPException(400, "Referenced plant does not exist")
    
    existing = (
        db.query(models.Plot)
        .filter(models.Plot.plant_id == plot.plant_id, models.Plot.name == plot.name)
        .first()
    )
    if existing:
        raise HTTPException(400, f"Plot '{plot.name}' already exists in plant '{plant.name}'")
    
    p = models.Plot(
        plant_id=plot.plant_id,
        name=plot.name,
        description=plot.description,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@app.put("/api/plots/{plot_id}", response_model=schemas.PlotOut)
def update_plot(plot_id: int, plot: schemas.PlotCreate, db: Session = Depends(get_db)):
    p = db.query(models.Plot).get(plot_id)
    if not p:
        raise HTTPException(404, "Plot not found")
    p.plant_id = plot.plant_id
    p.name = plot.name
    p.description = plot.description
    db.commit()
    db.refresh(p)
    return p


@app.delete("/api/plots/{plot_id}")
def delete_plot(plot_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Plot).get(plot_id)
    if not p:
        raise HTTPException(404, "Plot not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}


# --------------------------------------------------------- Monthly Metrics ---
def _score_and_grade(m: dict) -> dict:
    m = compute_derived_rates(m)
    score = calculate_plant_score(m)
    grade = get_grade(score)["grade"]
    m["total_score"] = score
    m["grade"] = grade
    return m


@app.get("/api/metrics", response_model=List[schemas.MetricOut])
def get_metrics(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.MonthlyMetric)
    if plant_id:
        q = q.filter(models.MonthlyMetric.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.MonthlyMetric.plot_id == plot_id)
    if month and month != "All":
        q = q.filter(models.MonthlyMetric.month == month)
    if year and year != 0:
        q = q.filter(models.MonthlyMetric.year == year)
    return q.all()


@app.get("/api/metrics/cluster")
def cluster_summary(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.MonthlyMetric)
    if plant_id:
        q = q.filter(models.MonthlyMetric.plant_id == plant_id)
        if plot_id:
            q = q.filter(models.MonthlyMetric.plot_id == plot_id)
        else:
            q = q.filter(models.MonthlyMetric.plot_id.is_(None))
    else:
        # Cluster wide: use plant-level records (plot_id is None) to avoid double counting
        q = q.filter(models.MonthlyMetric.plot_id.is_(None))

    if month and month != "All":
        q = q.filter(models.MonthlyMetric.month == month)
    if year and year != 0:
        q = q.filter(models.MonthlyMetric.year == year)
    
    rows = q.all()
    if not rows:
        return {
            "fatality": 0, "lti": 0, "mtc": 0, "fac": 0, "safe_man_hours": 0,
            "near_miss": 0, "unsafe_acts": 0, "unsafe_conditions": 0,
            "walkdowns": 0, "audits": 0, "training_sessions": 0, "training_hours": 0,
            "toolbox_talks": 0, "toolbox_talk_hours": 0.0, "ohs_meetings": 0, "mock_drills": 0,
            "avg_ptw_compliance": 0, "avg_loto_compliance": 0, "avg_statutory_compliance": 0,
            "avg_audit_closure": 0, "avg_fire_safety": 0,
        }
    
    total_hours = sum(r.safe_man_hours for r in rows)
    n = len(rows)
    return {
        "fatality": sum(r.fatality for r in rows),
        "lti": sum(r.lti for r in rows),
        "mtc": sum(r.mtc for r in rows),
        "fac": sum(r.fac for r in rows),
        "safe_man_hours": total_hours,
        "near_miss": sum(r.near_miss for r in rows),
        "unsafe_acts": sum(r.unsafe_acts for r in rows),
        "unsafe_conditions": sum(r.unsafe_conditions for r in rows),
        "walkdowns": sum(r.walkdowns for r in rows),
        "audits": sum(r.audits for r in rows),
        "training_sessions": sum(r.training_sessions for r in rows),
        "training_hours": sum(r.training_hours for r in rows),
        "toolbox_talks": sum(r.toolbox_talks for r in rows),
        "toolbox_talk_hours": round(sum(r.toolbox_talk_hours or 0 for r in rows), 1),
        "ohs_meetings": sum(r.ohs_meetings or 0 for r in rows),
        "mock_drills": sum(r.mock_drills or 0 for r in rows),
        "avg_ptw_compliance": round(sum(r.ptw_compliance for r in rows) / n, 1),
        "avg_loto_compliance": round(sum(r.loto_compliance for r in rows) / n, 1),
        "avg_statutory_compliance": round(sum(r.statutory_compliance for r in rows) / n, 1),
        "avg_audit_closure": round(sum(r.audit_closure for r in rows) / n, 1),
        "avg_fire_safety": round(sum(r.fire_safety for r in rows) / n, 1),
    }


@app.get("/api/metrics/ranking")
def get_ranking(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.MonthlyMetric)
    if plant_id:
        q = q.filter(models.MonthlyMetric.plant_id == plant_id)
        if plot_id:
            q = q.filter(models.MonthlyMetric.plot_id == plot_id)
        else:
            # When plant is chosen without plot, rank plots inside that plant
            q = q.filter(models.MonthlyMetric.plot_id.is_not(None))
    else:
        # For overall plant ranking, rank the 4 plants
        q = q.filter(models.MonthlyMetric.plot_id.is_(None))

    if month and month != "All":
        q = q.filter(models.MonthlyMetric.month == month)
    if year and year != 0:
        q = q.filter(models.MonthlyMetric.year == year)
    
    rows = q.all()
    plants = {p.id: p.name for p in db.query(models.Plant).all()}
    plots = {p.id: p.name for p in db.query(models.Plot).all()}

    if month == "All" or not month:
        # Group by plant (or plot if plot filtering)
        grouped_scores = {}
        for r in rows:
            key = (r.plant_id, r.plot_id)
            if key not in grouped_scores:
                grouped_scores[key] = []
            grouped_scores[key].append(r.total_score)

        aggregated = []
        if plant_id and not plot_id:
            # If a plant is selected, rank its plots
            plant_plots = db.query(models.Plot).filter(models.Plot.plant_id == plant_id).all()
            for pl in plant_plots:
                scores = grouped_scores.get((plant_id, pl.id), [])
                avg_score = round(sum(scores) / len(scores), 2) if scores else 0
                grade = get_grade(avg_score)["grade"]
                aggregated.append({
                    "plant_id": plant_id,
                    "plot_id": pl.id,
                    "plant": plants.get(plant_id, "Unknown"),
                    "plot": pl.name,
                    "score": avg_score,
                    "grade": grade,
                    "month": "YTD",
                    "year": year or "All",
                })
        elif plant_id and plot_id:
            pl = db.query(models.Plot).get(plot_id)
            if pl:
                scores = grouped_scores.get((plant_id, pl.id), [])
                avg_score = round(sum(scores) / len(scores), 2) if scores else 0
                grade = get_grade(avg_score)["grade"]
                aggregated.append({
                    "plant_id": plant_id,
                    "plot_id": pl.id,
                    "plant": plants.get(plant_id, "Unknown"),
                    "plot": pl.name,
                    "score": avg_score,
                    "grade": grade,
                    "month": "YTD",
                    "year": year or "All",
                })
        else:
            for p_id, p_name in plants.items():
                scores = grouped_scores.get((p_id, None), [])
                avg_score = round(sum(scores) / len(scores), 2) if scores else 0
                grade = get_grade(avg_score)["grade"]
                aggregated.append({
                    "plant_id": p_id,
                    "plot_id": None,
                    "plant": p_name,
                    "plot": "Overall",
                    "score": avg_score,
                    "grade": grade,
                    "month": "YTD",
                    "year": year or "All",
                })

        ranked = sorted(aggregated, key=lambda x: x["score"], reverse=True)
        for i, item in enumerate(ranked):
            item["rank"] = i + 1
        return ranked
    else:
        ranked = sorted(rows, key=lambda r: r.total_score, reverse=True)
        return [
            {
                "rank": i + 1,
                "plant_id": r.plant_id,
                "plot_id": r.plot_id,
                "plant": plants.get(r.plant_id, "Unknown"),
                "plot": plots.get(r.plot_id, "Overall") if r.plot_id else "Overall",
                "score": r.total_score,
                "grade": r.grade,
                "month": r.month,
                "year": r.year,
            }
            for i, r in enumerate(ranked)
        ]


@app.get("/api/metrics/trends")
def get_trends(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.MonthlyMetric)
    if plant_id:
        q = q.filter(models.MonthlyMetric.plant_id == plant_id)
        if plot_id:
            q = q.filter(models.MonthlyMetric.plot_id == plot_id)
        else:
            has_plots = db.query(models.MonthlyMetric).filter(
                models.MonthlyMetric.plant_id == plant_id,
                models.MonthlyMetric.plot_id.is_not(None)
            ).first()
            if has_plots:
                q = q.filter(models.MonthlyMetric.plot_id.is_not(None))
            else:
                q = q.filter(models.MonthlyMetric.plot_id.is_(None))
    else:
        q = q.filter(models.MonthlyMetric.plot_id.is_(None))
    
    rows = q.all()
    plants = {p.id: p.name for p in db.query(models.Plant).all()}
    plots = {p.id: p.name for p in db.query(models.Plot).all()}

    return [
        {
            "plant": plants.get(r.plant_id, "Unknown"),
            "plot": plots.get(r.plot_id, "Overall") if r.plot_id else "Overall",
            "month": r.month,
            "year": r.year,
            "score": r.total_score,
            "trifr": r.trifr,
            "near_miss": r.near_miss,
            "training_hours": r.training_hours,
            "toolbox_talk_hours": r.toolbox_talk_hours,
            "mock_drills": r.mock_drills,
        }
        for r in rows
    ]


@app.get("/api/metrics/{metric_id}", response_model=schemas.MetricOut)
def get_metric(metric_id: int, db: Session = Depends(get_db)):
    m = db.query(models.MonthlyMetric).get(metric_id)
    if not m:
        raise HTTPException(404, "Metric not found")
    return m


@app.post("/api/metrics", response_model=schemas.MetricOut)
def create_metric(metric: schemas.MetricCreate, db: Session = Depends(get_db)):
    # ---------------- DUPLICATE ENTRY PREVENTION ----------------
    existing_query = db.query(models.MonthlyMetric).filter(
        models.MonthlyMetric.plant_id == metric.plant_id,
        models.MonthlyMetric.month == metric.month,
        models.MonthlyMetric.year == metric.year,
    )
    if metric.plot_id:
        existing_query = existing_query.filter(models.MonthlyMetric.plot_id == metric.plot_id)
    else:
        existing_query = existing_query.filter(models.MonthlyMetric.plot_id.is_(None))
    
    existing = existing_query.first()
    if existing:
        plant_obj = db.query(models.Plant).get(metric.plant_id)
        plant_label = plant_obj.name if plant_obj else f"Plant #{metric.plant_id}"
        plot_label = f" (Plot ID #{metric.plot_id})" if metric.plot_id else ""
        raise HTTPException(
            status_code=400,
            detail=(
                f"Duplicate Entry Prevented: A metric record already exists for {plant_label}{plot_label} "
                f"for {metric.month} {metric.year} (Record #{existing.id}). "
                f"Please edit the existing entry instead of adding a duplicate."
            ),
        )

    data = _score_and_grade(metric.model_dump())
    m = models.MonthlyMetric(**data)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@app.put("/api/metrics/{metric_id}", response_model=schemas.MetricOut)
def update_metric(metric_id: int, metric: schemas.MetricCreate, db: Session = Depends(get_db)):
    m = db.query(models.MonthlyMetric).get(metric_id)
    if not m:
        raise HTTPException(404, "Metric not found")
    
    # Check for conflict with another record
    conflict_query = db.query(models.MonthlyMetric).filter(
        models.MonthlyMetric.id != metric_id,
        models.MonthlyMetric.plant_id == metric.plant_id,
        models.MonthlyMetric.month == metric.month,
        models.MonthlyMetric.year == metric.year,
    )
    if metric.plot_id:
        conflict_query = conflict_query.filter(models.MonthlyMetric.plot_id == metric.plot_id)
    else:
        conflict_query = conflict_query.filter(models.MonthlyMetric.plot_id.is_(None))
    
    conflict = conflict_query.first()
    if conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Conflict: Another metric record (#{conflict.id}) already exists for this Plant/Plot and Month/Year.",
        )

    data = _score_and_grade(metric.model_dump())
    for k, v in data.items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@app.delete("/api/metrics/{metric_id}")
def delete_metric(metric_id: int, db: Session = Depends(get_db)):
    m = db.query(models.MonthlyMetric).get(metric_id)
    if not m:
        raise HTTPException(404, "Metric not found")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}


@app.post("/api/metrics/bulk-delete")
def bulk_delete_metrics(payload: dict, db: Session = Depends(get_db)):
    metric_ids = payload.get("ids", [])
    if not metric_ids:
        return {"status": "ok", "deleted_count": 0}
    deleted = (
        db.query(models.MonthlyMetric)
        .filter(models.MonthlyMetric.id.in_(metric_ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"status": "deleted", "deleted_count": deleted}



# ------------------------------------------------------------- Incidents ---
@app.get("/api/incidents", response_model=List[schemas.IncidentOut])
def get_incidents(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Incident)
    if plant_id:
        q = q.filter(models.Incident.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.Incident.plot_id == plot_id)
    return q.order_by(models.Incident.incident_date.desc()).all()


@app.post("/api/incidents", response_model=schemas.IncidentOut)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(get_db)):
    i = models.Incident(**incident.model_dump())
    db.add(i)
    db.commit()
    db.refresh(i)
    return i


@app.put("/api/incidents/{incident_id}", response_model=schemas.IncidentOut)
def update_incident(incident_id: int, incident: schemas.IncidentCreate, db: Session = Depends(get_db)):
    i = db.query(models.Incident).get(incident_id)
    if not i:
        raise HTTPException(404, "Incident not found")
    for k, v in incident.model_dump().items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return i


@app.delete("/api/incidents/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    i = db.query(models.Incident).get(incident_id)
    if not i:
        raise HTTPException(404, "Incident not found")
    db.delete(i)
    db.commit()
    return {"status": "deleted"}


# -------------------------------------------------------------- Near Miss --
@app.get("/api/nearmiss", response_model=List[schemas.NearMissOut])
def get_near_misses(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.NearMiss)
    if plant_id:
        q = q.filter(models.NearMiss.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.NearMiss.plot_id == plot_id)
    return q.order_by(models.NearMiss.report_date.desc()).all()


@app.post("/api/nearmiss", response_model=schemas.NearMissOut)
def create_near_miss(nm: schemas.NearMissCreate, db: Session = Depends(get_db)):
    row = models.NearMiss(**nm.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/nearmiss/{nm_id}")
def delete_near_miss(nm_id: int, db: Session = Depends(get_db)):
    row = db.query(models.NearMiss).get(nm_id)
    if not row:
        raise HTTPException(404, "Not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted"}


# --------------------------------------------------------------- Training --
# --------------------------------------------------------------- Training --
@app.get("/api/training", response_model=List[schemas.TrainingOut])
def get_training(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.TrainingRecord)
    if plant_id:
        q = q.filter(models.TrainingRecord.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.TrainingRecord.plot_id == plot_id)
    if year and year != 0:
        q = q.filter(func.strftime("%Y", models.TrainingRecord.training_date) == str(year))
    if month and month != "All":
        month_map = {
            "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
            "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
        }
        if month in month_map:
            q = q.filter(func.strftime("%m", models.TrainingRecord.training_date) == month_map[month])
    return q.order_by(models.TrainingRecord.training_date.desc()).all()


@app.get("/api/training/summary")
def get_training_summary(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.TrainingRecord)
    if plant_id:
        q = q.filter(models.TrainingRecord.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.TrainingRecord.plot_id == plot_id)
    if year and year != 0:
        q = q.filter(func.strftime("%Y", models.TrainingRecord.training_date) == str(year))
    if month and month != "All":
        month_map = {
            "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
            "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
        }
        if month in month_map:
            q = q.filter(func.strftime("%m", models.TrainingRecord.training_date) == month_map[month])
    
    records = q.all()
    total_sessions = len(records)
    total_regular = sum(r.regular_attendees or 0 for r in records)
    total_contractor = sum(r.contractor_attendees or 0 for r in records)
    total_participants = sum((r.participants or (r.regular_attendees or 0) + (r.contractor_attendees or 0)) for r in records)
    total_man_hours = sum(r.man_hours or 0.0 for r in records)

    # Categories breakdown
    categories = {}
    topics = {}
    for r in records:
        cat = r.category or "Mandatory EHS"
        categories[cat] = categories.get(cat, 0) + 1
        top = r.topic or "General EHS"
        topics[top] = topics.get(top, 0) + 1

    return {
        "total_sessions": total_sessions,
        "total_regular": total_regular,
        "total_contractor": total_contractor,
        "total_participants": total_participants,
        "total_man_hours": round(total_man_hours, 1),
        "categories": [{"name": k, "value": v} for k, v in categories.items()],
        "topics": [{"name": k, "value": v} for k, v in topics.items()],
    }


@app.get("/api/training/report/excel")
def download_training_excel_report(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.TrainingRecord)
    if plant_id:
        q = q.filter(models.TrainingRecord.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.TrainingRecord.plot_id == plot_id)
    if year and year != 0:
        q = q.filter(func.strftime("%Y", models.TrainingRecord.training_date) == str(year))
    if month and month != "All":
        month_map = {
            "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
            "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
        }
        if month in month_map:
            q = q.filter(func.strftime("%m", models.TrainingRecord.training_date) == month_map[month])
    
    records = q.order_by(models.TrainingRecord.training_date.desc()).all()
    plants = {p.id: p.name for p in db.query(models.Plant).all()}
    plots = {p.id: p.name for p in db.query(models.Plot).all()}

    plant_name = plants.get(plant_id, "All Cluster Plants") if plant_id else "All Cluster Plants"
    plot_name = plots.get(plot_id, "All Plots") if plot_id else "All Plots"
    period_label = f"{month or 'Full Year'} {year or '2026'}"

    # Create openpyxl Workbook
    wb = openpyxl.Workbook()
    
    # Styles
    title_font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    subtitle_font = Font(name="Calibri", size=11, italic=True, color="E0E7FF")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    sub_header_font = Font(name="Calibri", size=11, bold=True, color="1E1B4B")
    bold_font = Font(name="Calibri", size=11, bold=True)
    regular_font = Font(name="Calibri", size=11)
    
    dark_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
    purple_fill = PatternFill(start_color="4C1D95", end_color="4C1D95", fill_type="solid")
    teal_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    light_fill = PatternFill(start_color="F5F3FF", end_color="F5F3FF", fill_type="solid")
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    accent_fill = PatternFill(start_color="E0E7FF", end_color="E0E7FF", fill_type="solid")
    
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    right_align = Alignment(horizontal="right", vertical="center")

    # -------------------------------------------------------------------------
    # SHEET 1: EXECUTIVE SUMMARY & SCORECARD
    # -------------------------------------------------------------------------
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1.views.sheetView[0].showGridLines = True

    # Title Banner
    ws1.merge_cells("A1:G2")
    ws1["A1"] = f"GREENKO EHS SAFETY TRAINING PERFORMANCE REPORT"
    ws1["A1"].font = title_font
    ws1["A1"].fill = dark_fill
    ws1["A1"].alignment = center_align

    ws1.merge_cells("A3:G3")
    ws1["A3"] = f"Scope: {plant_name} | Section: {plot_name} | Reporting Period: {period_label} | Benchmark Target: ≥ 300 Man-Hours"
    ws1["A3"].font = subtitle_font
    ws1["A3"].fill = purple_fill
    ws1["A3"].alignment = center_align

    # Aggregations
    total_sessions = len(records)
    total_regular = sum(r.regular_attendees or 0 for r in records)
    total_contractor = sum(r.contractor_attendees or 0 for r in records)
    total_participants = total_regular + total_contractor
    total_man_hours = round(sum(r.man_hours or 0.0 for r in records), 1)
    target_hours = 300.0
    pct_achieved = round((total_man_hours / target_hours) * 100, 1) if target_hours > 0 else 0
    contractor_pct = round((total_contractor / total_participants) * 100, 1) if total_participants > 0 else 0
    tbt_sessions = len([r for r in records if r.category == "Toolbox Talk"])
    advance_sessions = len([r for r in records if r.category == "Theme-Based / OEM Advance"])
    induction_sessions = len([r for r in records if r.category == "EHS Induction"])

    # KPI Table Header
    ws1["A5"] = "KEY PERFORMANCE INDICATOR (KPI)"
    ws1["A5"].font = header_font
    ws1["A5"].fill = purple_fill
    ws1.merge_cells("A5:D5")

    ws1["E5"] = "RECORDED VALUE"
    ws1["E5"].font = header_font
    ws1["E5"].fill = purple_fill
    ws1["E5"].alignment = center_align

    ws1["F5"] = "TARGET / BENCHMARK"
    ws1["F5"].font = header_font
    ws1["F5"].fill = purple_fill
    ws1["F5"].alignment = center_align

    ws1["G5"] = "STATUS / EVALUATION"
    ws1["G5"].font = header_font
    ws1["G5"].fill = purple_fill
    ws1["G5"].alignment = center_align

    kpis = [
        ("Total Safety Training Man-Hours Generated", f"{total_man_hours} Hours", "≥ 300.0 Hours", f"{pct_achieved}% Achieved (Exceeded)" if pct_achieved >= 100 else f"{pct_achieved}% Achieved (On Track)" if pct_achieved >= 75 else f"{pct_achieved}% (Needs Attention)"),
        ("Total Safety Training Sessions Executed", f"{total_sessions} Sessions", "Continuous", "Completed"),
        ("Regular Workforce Upskilled (On-Roll)", f"{total_regular} Attendees", "100% Coverage", "Compliant"),
        ("Contractor Workforce Upskilled (Off-Roll)", f"{total_contractor} Attendees ({contractor_pct}%)", "Universal Inclusion", "Active Engagement"),
        ("Total Workforce Headcount Trained", f"{total_participants} Participants", "-", "Documented"),
        ("Daily Toolbox Talks (TBT) Sessions", f"{tbt_sessions} Sessions", "Daily Mandatory", "Active"),
        ("OEM & Advanced Module Sessions", f"{advance_sessions} Sessions", "Theme Modules", "High Voltage / LOTOTO"),
        ("New Joiner / Contractor EHS Inductions", f"{induction_sessions} Sessions", "100% Site Gate", "Zero Non-Inducted"),
    ]

    for idx, (kpi, val, target, stat) in enumerate(kpis, start=6):
        fill = zebra_fill if idx % 2 == 0 else light_fill
        ws1.merge_cells(f"A{idx}:D{idx}")
        ws1[f"A{idx}"] = kpi
        ws1[f"A{idx}"].font = regular_font
        ws1[f"A{idx}"].fill = fill
        ws1[f"A{idx}"].border = thin_border

        for col in ["B", "C", "D"]:
            ws1[f"{col}{idx}"].border = thin_border
            ws1[f"{col}{idx}"].fill = fill

        ws1[f"E{idx}"] = val
        ws1[f"E{idx}"].font = bold_font
        ws1[f"E{idx}"].alignment = center_align
        ws1[f"E{idx}"].fill = fill
        ws1[f"E{idx}"].border = thin_border

        ws1[f"F{idx}"] = target
        ws1[f"F{idx}"].font = regular_font
        ws1[f"F{idx}"].alignment = center_align
        ws1[f"F{idx}"].fill = fill
        ws1[f"F{idx}"].border = thin_border

        ws1[f"G{idx}"] = stat
        ws1[f"G{idx}"].font = bold_font
        ws1[f"G{idx}"].alignment = center_align
        ws1[f"G{idx}"].fill = fill
        ws1[f"G{idx}"].border = thin_border

    # -------------------------------------------------------------------------
    # SHEET 2: PLOT-WISE TRAINING SCORECARD
    # -------------------------------------------------------------------------
    ws2 = wb.create_sheet(title="Plot Competency Scorecard")
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells("A1:I1")
    ws2["A1"] = f"PLOT-WISE SAFETY TRAINING BENCHMARK SCORECARD ({period_label})"
    ws2["A1"].font = title_font
    ws2["A1"].fill = teal_fill
    ws2["A1"].alignment = center_align

    scorecard_headers = [
        "Plot / Section Name", "Plant Facility", "Sessions", "Regular (On-Roll)",
        "Contractor (Off-Roll)", "Total Attendees", "Actual Man-Hours", "Monthly Target", "% Achieved"
    ]
    for col_num, h_title in enumerate(scorecard_headers, 1):
        cell = ws2.cell(row=3, column=col_num)
        cell.value = h_title
        cell.font = header_font
        cell.fill = dark_fill
        cell.alignment = center_align
        cell.border = thin_border

    # Group by plots
    plot_dict = {}
    target_plots = db.query(models.Plot).all()
    if plant_id:
        target_plots = [p for p in target_plots if p.plant_id == plant_id]

    for pl in target_plots:
        plot_dict[pl.id] = {
            "plot_name": pl.name,
            "plant_name": plants.get(pl.plant_id, "Unknown"),
            "sessions": 0,
            "regular": 0,
            "contractor": 0,
            "participants": 0,
            "man_hours": 0.0,
            "target": 300.0,
        }

    for r in records:
        if r.plot_id and r.plot_id in plot_dict:
            plot_dict[r.plot_id]["sessions"] += 1
            plot_dict[r.plot_id]["regular"] += (r.regular_attendees or 0)
            plot_dict[r.plot_id]["contractor"] += (r.contractor_attendees or 0)
            plot_dict[r.plot_id]["participants"] += ((r.regular_attendees or 0) + (r.contractor_attendees or 0))
            plot_dict[r.plot_id]["man_hours"] += (r.man_hours or 0.0)

    row_cursor = 4
    for pl_id, pdata in plot_dict.items():
        fill = zebra_fill if row_cursor % 2 == 0 else PatternFill(fill_type=None)
        pct = round((pdata["man_hours"] / pdata["target"]) * 100, 1) if pdata["target"] > 0 else 0

        row_vals = [
            pdata["plot_name"], pdata["plant_name"], pdata["sessions"],
            pdata["regular"], pdata["contractor"], pdata["participants"],
            round(pdata["man_hours"], 1), pdata["target"], f"{pct}%"
        ]

        for col_idx, val in enumerate(row_vals, 1):
            c = ws2.cell(row=row_cursor, column=col_idx)
            c.value = val
            c.font = bold_font if col_idx in [1, 7, 9] else regular_font
            c.alignment = left_align if col_idx in [1, 2] else center_align
            if fill.fill_type:
                c.fill = fill
            c.border = thin_border

        row_cursor += 1

    # Total row
    ws2.cell(row=row_cursor, column=1, value="CLUSTER / TOTALS").font = bold_font
    ws2.cell(row=row_cursor, column=1).fill = accent_fill
    ws2.cell(row=row_cursor, column=1).border = thin_border
    for c_i in range(2, 10):
        c = ws2.cell(row=row_cursor, column=c_i)
        c.fill = accent_fill
        c.border = thin_border
        c.font = bold_font
        c.alignment = center_align

    ws2.cell(row=row_cursor, column=3, value=sum(p["sessions"] for p in plot_dict.values()))
    ws2.cell(row=row_cursor, column=4, value=sum(p["regular"] for p in plot_dict.values()))
    ws2.cell(row=row_cursor, column=5, value=sum(p["contractor"] for p in plot_dict.values()))
    ws2.cell(row=row_cursor, column=6, value=sum(p["participants"] for p in plot_dict.values()))
    ws2.cell(row=row_cursor, column=7, value=round(sum(p["man_hours"] for p in plot_dict.values()), 1))
    ws2.cell(row=row_cursor, column=8, value=len(plot_dict) * 300.0)
    cluster_pct = round((sum(p["man_hours"] for p in plot_dict.values()) / max(len(plot_dict) * 300.0, 1)) * 100, 1)
    ws2.cell(row=row_cursor, column=9, value=f"{cluster_pct}%")

    # -------------------------------------------------------------------------
    # SHEET 3: DETAILED TRAINING LOG
    # -------------------------------------------------------------------------
    ws3 = wb.create_sheet(title="Training Sessions Log")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:M1")
    ws3["A1"] = f"COMPREHENSIVE SAFETY TRAINING SESSIONS LOG ({len(records)} SESSIONS RECORDED)"
    ws3["A1"].font = title_font
    ws3["A1"].fill = purple_fill
    ws3["A1"].alignment = center_align

    log_headers = [
        "ID", "Date", "Plant", "Plot Section", "Training Module / Topic",
        "Category", "Trainer / Faculty", "Regular", "Contractor",
        "Total Attendees", "Duration (Hrs)", "Total Man-Hours", "Remarks / Outcomes"
    ]
    for col_num, h_title in enumerate(log_headers, 1):
        cell = ws3.cell(row=3, column=col_num)
        cell.value = h_title
        cell.font = header_font
        cell.fill = dark_fill
        cell.alignment = center_align
        cell.border = thin_border

    for idx, r in enumerate(records, start=4):
        fill = zebra_fill if idx % 2 == 0 else PatternFill(fill_type=None)
        parts = (r.regular_attendees or 0) + (r.contractor_attendees or 0) or r.participants or 0
        mh = r.man_hours or round(parts * (r.hours or 1.0), 1)

        row_vals = [
            r.id,
            str(r.training_date),
            plants.get(r.plant_id, "Unknown"),
            plots.get(r.plot_id, "General Area") if r.plot_id else "General Area",
            r.topic,
            r.category or "Mandatory EHS",
            r.trainer or "Site EHS Lead",
            r.regular_attendees or 0,
            r.contractor_attendees or 0,
            parts,
            r.hours or 1.0,
            mh,
            r.remarks or "",
        ]

        for col_idx, val in enumerate(row_vals, 1):
            c = ws3.cell(row=idx, column=col_idx)
            c.value = val
            c.font = bold_font if col_idx in [5, 12] else regular_font
            c.alignment = left_align if col_idx in [3, 4, 5, 7, 13] else center_align
            if fill.fill_type:
                c.fill = fill
            c.border = thin_border

    # Adjust column widths for all sheets
    for ws in [ws1, ws2, ws3]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len and "\n" not in val_str and cell.row > 2:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    ws1.column_dimensions["A"].width = 45
    ws1.column_dimensions["E"].width = 22
    ws1.column_dimensions["F"].width = 22
    ws1.column_dimensions["G"].width = 25
    ws3.column_dimensions["E"].width = 38
    ws3.column_dimensions["M"].width = 45

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"Greenko_Safety_Training_Report_{month or 'YTD'}_{year or 2026}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/api/training", response_model=schemas.TrainingOut)
def create_training(t: schemas.TrainingCreate, db: Session = Depends(get_db)):
    data = t.model_dump()
    regular = data.get("regular_attendees") or 0
    contractor = data.get("contractor_attendees") or 0
    if not data.get("participants"):
        data["participants"] = regular + contractor
    hours = data.get("hours") or 1.0
    if not data.get("man_hours"):
        data["man_hours"] = round(data["participants"] * hours, 1)
    
    row = models.TrainingRecord(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/training/{t_id}", response_model=schemas.TrainingOut)
def update_training(t_id: int, t: schemas.TrainingCreate, db: Session = Depends(get_db)):
    row = db.query(models.TrainingRecord).get(t_id)
    if not row:
        raise HTTPException(404, "Training record not found")
    data = t.model_dump()
    regular = data.get("regular_attendees") or 0
    contractor = data.get("contractor_attendees") or 0
    if not data.get("participants"):
        data["participants"] = regular + contractor
    hours = data.get("hours") or 1.0
    if not data.get("man_hours"):
        data["man_hours"] = round(data["participants"] * hours, 1)
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/training/{t_id}")
def delete_training(t_id: int, db: Session = Depends(get_db)):
    row = db.query(models.TrainingRecord).get(t_id)
    if not row:
        raise HTTPException(404, "Not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------- Safety Issues --
@app.get("/api/issues", response_model=List[schemas.IssueOut])
def get_issues(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.SafetyIssue)
    if plant_id:
        q = q.filter(models.SafetyIssue.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.SafetyIssue.plot_id == plot_id)
    return q.all()


@app.get("/api/issues/critical", response_model=List[schemas.IssueOut])
def get_critical_issues(db: Session = Depends(get_db)):
    return (
        db.query(models.SafetyIssue)
        .filter(models.SafetyIssue.priority == "High")
        .filter(models.SafetyIssue.status != "Closed")
        .all()
    )


@app.post("/api/issues", response_model=schemas.IssueOut)
def create_issue(issue: schemas.IssueCreate, db: Session = Depends(get_db)):
    row = models.SafetyIssue(**issue.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.patch("/api/issues/{issue_id}/status", response_model=schemas.IssueOut)
def update_issue_status(issue_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    row = db.query(models.SafetyIssue).get(issue_id)
    if not row:
        raise HTTPException(404, "Not found")
    row.status = status
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/issues/{issue_id}")
def delete_issue(issue_id: int, db: Session = Depends(get_db)):
    row = db.query(models.SafetyIssue).get(issue_id)
    if not row:
        raise HTTPException(404, "Not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------- Audit Findings --
@app.get("/api/audits", response_model=List[schemas.AuditOut])
def get_audits(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.AuditFinding)
    if plant_id:
        q = q.filter(models.AuditFinding.plant_id == plant_id)
    if plot_id:
        q = q.filter(models.AuditFinding.plot_id == plot_id)
    return q.all()


@app.post("/api/audits", response_model=schemas.AuditOut)
def create_audit(a: schemas.AuditCreate, db: Session = Depends(get_db)):
    row = models.AuditFinding(**a.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# -------------------------------------------------------------- Compliance --
@app.get("/api/compliance")
def get_compliance(
    plant_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    month: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.MonthlyMetric)
    if plant_id:
        q = q.filter(models.MonthlyMetric.plant_id == plant_id)
        if plot_id:
            q = q.filter(models.MonthlyMetric.plot_id == plot_id)
    else:
        q = q.filter(models.MonthlyMetric.plot_id.is_(None))

    if month and month != "All":
        q = q.filter(models.MonthlyMetric.month == month)
    if year and year != 0:
        q = q.filter(models.MonthlyMetric.year == year)
    
    rows = q.all()
    plants = {p.id: p.name for p in db.query(models.Plant).all()}
    plots = {p.id: p.name for p in db.query(models.Plot).all()}

    if month == "All" or not month:
        by_key = {}
        for r in rows:
            key = (r.plant_id, r.plot_id)
            if key not in by_key:
                by_key[key] = []
            by_key[key].append(r)

        result = []
        for (p_id, pl_id), p_rows in by_key.items():
            n = len(p_rows)
            result.append({
                "plant": plants.get(p_id, "Unknown"),
                "plant_id": p_id,
                "plot": plots.get(pl_id, "Overall") if pl_id else "Overall",
                "plot_id": pl_id,
                "ptw_compliance": round(sum(r.ptw_compliance for r in p_rows) / n, 1),
                "loto_compliance": round(sum(r.loto_compliance for r in p_rows) / n, 1),
                "statutory_compliance": round(sum(r.statutory_compliance for r in p_rows) / n, 1),
                "audit_closure": round(sum(r.audit_closure for r in p_rows) / n, 1),
                "fire_safety": round(sum(r.fire_safety for r in p_rows) / n, 1),
            })
        return result
    else:
        return [
            {
                "plant": plants.get(r.plant_id, "Unknown"),
                "plant_id": r.plant_id,
                "plot": plots.get(r.plot_id, "Overall") if r.plot_id else "Overall",
                "plot_id": r.plot_id,
                "ptw_compliance": r.ptw_compliance,
                "loto_compliance": r.loto_compliance,
                "statutory_compliance": r.statutory_compliance,
                "audit_closure": r.audit_closure,
                "fire_safety": r.fire_safety,
            }
            for r in rows
        ]


# ------------------------------------------------------------------ Upload --
def _clean_header(header: str) -> str:
    return "".join(c for c in str(header).lower().strip() if c.isalnum() or c == "%")


HEADER_MAP = {
    "plant": "Plant", "facility": "Plant", "plantname": "Plant",
    "plot": "Plot", "plotname": "Plot", "plotid": "Plot", "section": "Plot",
    "month": "Month",
    "year": "Year",
    "fatality": "Fatality", "fatalities": "Fatality",
    "lti": "LTI", "losttimeinjury": "LTI", "losttimeincidents": "LTI",
    "mtc": "MTC", "medicaltreatmentcase": "MTC",
    "fac": "FAC", "firstaidcase": "FAC",
    "safemanhours": "SafeManHours", "manhours": "SafeManHours", "workinghours": "SafeManHours",
    "nearmiss": "NearMiss", "nearmisses": "NearMiss",
    "unsafeacts": "UnsafeActs",
    "unsafeconditions": "UnsafeConditions",
    "walkdowns": "Walkdowns", "safetywalkdowns": "Walkdowns",
    "audits": "Audits",
    "trainingsessions": "TrainingSessions",
    "traininghours": "TrainingHours",
    "toolboxtalks": "ToolboxTalks", "tbt": "ToolboxTalks",
    "toolboxtalkhours": "ToolboxTalkHours", "toolboxtalkhrs": "ToolboxTalkHours", "toolboxhrs": "ToolboxTalkHours", "tbthours": "ToolboxTalkHours", "tbthrs": "ToolboxTalkHours",
    "ohsmeetings": "OHSMeetings", "ohscommitteemeetings": "OHSMeetings", "ohsmeeting": "OHSMeetings", "ohscommitteemeeting": "OHSMeetings",
    "mockdrills": "MockDrills", "mockdrillsconducted": "MockDrills", "noofmockdrills": "MockDrills", "mockdrill": "MockDrills",
    "ptw": "PTW%", "ptw%": "PTW%", "ptwcompliance": "PTW%",
    "loto": "LOTO%", "loto%": "LOTO%", "lotocompliance": "LOTO%",
    "statutory": "Statutory%", "statutory%": "Statutory%", "statutorycompliance": "Statutory%",
    "auditclosure": "AuditClosure%", "auditclosure%": "AuditClosure%",
    "firesafety": "FireSafety%", "firesafety%": "FireSafety%",
}


def _detect_file_type(df: pd.DataFrame) -> str:
    cleaned_cols = [_clean_header(c) for c in df.columns]
    mapped_cols = [HEADER_MAP.get(c, c) for c in cleaned_cols]

    if "Plant" in mapped_cols or any(c in mapped_cols for c in ["Fatality", "LTI", "SafeManHours", "NearMiss", "ToolboxTalkHours"]):
        return "monthly_metrics"
    if "incident_type" in cleaned_cols or "severity" in cleaned_cols:
        return "incidents"
    if "near_miss_type" in cleaned_cols or "risk_level" in cleaned_cols:
        return "near_miss"
    if "audit_type" in cleaned_cols or "findings" in cleaned_cols:
        return "audits"
    if "topic" in cleaned_cols and "participants" in cleaned_cols:
        return "training"
    if "priority" in cleaned_cols and "issue" in cleaned_cols:
        return "safety_issues"
    return "unknown"


def _get_or_create_plant(db: Session, name: str) -> models.Plant:
    p = db.query(models.Plant).filter(models.Plant.name == name).first()
    if not p:
        p = models.Plant(name=name)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _get_or_create_plot(db: Session, plant_id: int, plot_name: str) -> Optional[models.Plot]:
    if not plot_name or plot_name.lower() in ["nan", "none", "overall", "all", ""]:
        return None
    plot = db.query(models.Plot).filter(models.Plot.plant_id == plant_id, models.Plot.name == plot_name).first()
    if not plot:
        plot = models.Plot(plant_id=plant_id, name=plot_name)
        db.add(plot)
        db.commit()
        db.refresh(plot)
    return plot


@app.get("/api/upload/template")
def download_template(format: str = Query("excel", description="excel or csv")):
    sample_rows = [
        {
            "Plant": "Pinnapuram", "Plot": "Plot 1 - North Solar Area", "Month": "Jul", "Year": 2026,
            "Fatality": 0, "LTI": 0, "MTC": 0, "FAC": 1, "SafeManHours": 1800000,
            "NearMiss": 35, "UnsafeActs": 42, "UnsafeConditions": 28, "Walkdowns": 14,
            "Audits": 5, "TrainingSessions": 12, "TrainingHours": 380, "ToolboxTalks": 65,
            "ToolboxTalkHours": 45.5, "OHSMeetings": 2, "MockDrills": 2,
            "PTW%": 99, "LOTO%": 98, "Statutory%": 100, "AuditClosure%": 96, "FireSafety%": 97,
        },
        {
            "Plant": "Ghani", "Plot": "Plot A - Solar PV Array", "Month": "Jul", "Year": 2026,
            "Fatality": 0, "LTI": 0, "MTC": 1, "FAC": 2, "SafeManHours": 1200000,
            "NearMiss": 28, "UnsafeActs": 35, "UnsafeConditions": 22, "Walkdowns": 10,
            "Audits": 4, "TrainingSessions": 10, "TrainingHours": 290, "ToolboxTalks": 50,
            "ToolboxTalkHours": 32.0, "OHSMeetings": 1, "MockDrills": 1,
            "PTW%": 97, "LOTO%": 96, "Statutory%": 99, "AuditClosure%": 92, "FireSafety%": 95,
        },
        {
            "Plant": "Chenekapalli", "Plot": "Plot 1 - East Sector", "Month": "Jul", "Year": 2026,
            "Fatality": 0, "LTI": 0, "MTC": 0, "FAC": 1, "SafeManHours": 950000,
            "NearMiss": 22, "UnsafeActs": 30, "UnsafeConditions": 18, "Walkdowns": 8,
            "Audits": 3, "TrainingSessions": 8, "TrainingHours": 240, "ToolboxTalks": 40,
            "ToolboxTalkHours": 25.0, "OHSMeetings": 1, "MockDrills": 1,
            "PTW%": 96, "LOTO%": 95, "Statutory%": 98, "AuditClosure%": 90, "FireSafety%": 94,
        },
        {
            "Plant": "Nagalooty", "Plot": "Plot 1 - Solar Field 1", "Month": "Jul", "Year": 2026,
            "Fatality": 0, "LTI": 0, "MTC": 1, "FAC": 3, "SafeManHours": 850000,
            "NearMiss": 19, "UnsafeActs": 25, "UnsafeConditions": 15, "Walkdowns": 7,
            "Audits": 3, "TrainingSessions": 7, "TrainingHours": 210, "ToolboxTalks": 35,
            "ToolboxTalkHours": 22.5, "OHSMeetings": 1, "MockDrills": 1,
            "PTW%": 95, "LOTO%": 94, "Statutory%": 97, "AuditClosure%": 88, "FireSafety%": 92,
        },
    ]
    df = pd.DataFrame(sample_rows)

    if format.lower() == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=ehs_monthly_metrics_template.csv"},
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Monthly Metrics")
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=ehs_monthly_metrics_template.xlsx"},
        )


@app.get("/api/upload/template/training")
def download_training_template(format: str = Query("excel", description="excel or csv")):
    sample_training_rows = [
        {
            "Plant": "Ghani", "Plot": "Plot 1 - Prayatna Power", "Date": "2026-07-05",
            "Topic": "Electrical Safety & Arc Flash Prevention", "Category": "Mandatory EHS",
            "Trainer": "Site EHS Lead", "Regular": 6, "Contractor": 24, "Hours": 2.0, "Remarks": "Covered 33kV switchgear isolation and PPE requirements",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 2 - STU Plot 1 Rays Power", "Date": "2026-07-08",
            "Topic": "LOTOTO Energy Isolation Standards", "Category": "Mandatory EHS",
            "Trainer": "OEM Specialist", "Regular": 4, "Contractor": 18, "Hours": 2.5, "Remarks": "Lockout box tagging and inverter disconnect drill",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 3 - Abhyudaya Solar Power Energy", "Date": "2026-07-12",
            "Topic": "Working at Height & Fall Arrest Systems", "Category": "Mandatory EHS",
            "Trainer": "Safety Officer", "Regular": 5, "Contractor": 22, "Hours": 1.5, "Remarks": "Full body harness and lifeline inspection session",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 4 - Green Energy", "Date": "2026-07-15",
            "Topic": "Daily Safety Toolbox Talk on Heat Stress", "Category": "Toolbox Talk",
            "Trainer": "Field Supervisor", "Regular": 8, "Contractor": 35, "Hours": 0.5, "Remarks": "ORS electrolyte distribution & shaded rest rotation",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 5 - Adani Solar Power", "Date": "2026-07-18",
            "Topic": "Inverter & Transformer Maintenance Safety", "Category": "Theme-Based / OEM Advance",
            "Trainer": "Schneider OEM Lead", "Regular": 6, "Contractor": 12, "Hours": 3.0, "Remarks": "Advanced OEM maintenance protocol and interlocks",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 6 - Sunedison Solar Power", "Date": "2026-07-22",
            "Topic": "Hot Work & Fire Fighting Practical Drills", "Category": "Emergency & Mock Drill",
            "Trainer": "Fire Safety Team", "Regular": 7, "Contractor": 28, "Hours": 2.0, "Remarks": "CO2 and DCP fire extinguisher hands-on drill",
        },
        {
            "Plant": "Ghani", "Plot": "Plot 7 - Fortum Solar Power Energy", "Date": "2026-07-24",
            "Topic": "New Joiner / Contractor EHS Induction", "Category": "EHS Induction",
            "Trainer": "HR & EHS Officer", "Regular": 3, "Contractor": 30, "Hours": 2.0, "Remarks": "Site Golden Rules orientation and ID badging",
        },
    ]
    df = pd.DataFrame(sample_training_rows)
    if format.lower() == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=safety_training_upload_template.csv"},
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Training Matrix")
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=safety_training_upload_template.xlsx"},
        )


@app.post("/api/upload")
def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = file.file.read()
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(raw))
        else:
            df = pd.read_excel(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")

    file_type = _detect_file_type(df)
    rows_processed = 0
    errors: List[str] = []

    if file_type == "monthly_metrics":
        for idx, orig_row in df.iterrows():
            try:
                row = {}
                for orig_k, orig_v in orig_row.to_dict().items():
                    clean_k = _clean_header(orig_k)
                    mapped_k = HEADER_MAP.get(clean_k, str(orig_k).strip())
                    row[mapped_k] = orig_v

                plant_name = str(row.get("Plant", "Pinnapuram")).strip()
                if not plant_name or plant_name.lower() == "nan":
                    plant_name = "Pinnapuram"

                plant = _get_or_create_plant(db, plant_name)
                plot_name = str(row.get("Plot", "")).strip()
                plot = _get_or_create_plot(db, plant.id, plot_name)
                
                def _val(k, default=0, is_float=False):
                    val = row.get(k, default)
                    if pd.isna(val) or val == "" or val is None:
                        return default
                    try:
                        return float(val) if is_float else int(float(val))
                    except (ValueError, TypeError):
                        return default

                data = {
                    "plant_id": plant.id,
                    "plot_id": plot.id if plot else None,
                    "month": str(row.get("Month", "Jul")).strip() or "Jul",
                    "year": _val("Year", datetime.now().year),
                    "fatality": _val("Fatality", 0),
                    "lti": _val("LTI", 0),
                    "mtc": _val("MTC", 0),
                    "fac": _val("FAC", 0),
                    "safe_man_hours": _val("SafeManHours", 0),
                    "near_miss": _val("NearMiss", 0),
                    "unsafe_acts": _val("UnsafeActs", 0),
                    "unsafe_conditions": _val("UnsafeConditions", 0),
                    "walkdowns": _val("Walkdowns", 0),
                    "audits": _val("Audits", 0),
                    "training_sessions": _val("TrainingSessions", 0),
                    "training_hours": _val("TrainingHours", 0),
                    "toolbox_talks": _val("ToolboxTalks", 0),
                    "toolbox_talk_hours": _val("ToolboxTalkHours", 0.0, is_float=True),
                    "ohs_meetings": _val("OHSMeetings", 0),
                    "mock_drills": _val("MockDrills", 0),
                    "ptw_compliance": _val("PTW%", 0),
                    "loto_compliance": _val("LOTO%", 0),
                    "statutory_compliance": _val("Statutory%", 0),
                    "audit_closure": _val("AuditClosure%", 0),
                    "fire_safety": _val("FireSafety%", 0),
                }
                data = _score_and_grade(data)
                
                # Check existing and update (upsert) during bulk upload
                ex_q = db.query(models.MonthlyMetric).filter(
                    models.MonthlyMetric.plant_id == plant.id,
                    models.MonthlyMetric.month == data["month"],
                    models.MonthlyMetric.year == data["year"],
                )
                if data["plot_id"]:
                    ex_q = ex_q.filter(models.MonthlyMetric.plot_id == data["plot_id"])
                else:
                    ex_q = ex_q.filter(models.MonthlyMetric.plot_id.is_(None))
                
                existing = ex_q.first()
                if existing:
                    for k, v in data.items():
                        setattr(existing, k, v)
                else:
                    db.add(models.MonthlyMetric(**data))
                rows_processed += 1
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        db.commit()
    elif file_type == "training":
        for idx, orig_row in df.iterrows():
            try:
                row = orig_row.to_dict()
                plant_name = str(row.get("Plant", row.get("plant_name", row.get("Plant Name", "Ghani")))).strip()
                if not plant_name or plant_name.lower() == "nan":
                    plant_name = "Ghani"
                plant = _get_or_create_plant(db, plant_name)
                plot_name = str(row.get("Plot", row.get("plot_name", row.get("Plot Name", "")))).strip()
                plot = _get_or_create_plot(db, plant.id, plot_name)
                
                t_date_raw = row.get("Date", row.get("training_date", row.get("Training Date", str(date.today()))))
                try:
                    if isinstance(t_date_raw, (pd.Timestamp, datetime, date)):
                        t_date = t_date_raw.date() if isinstance(t_date_raw, (pd.Timestamp, datetime)) else t_date_raw
                    else:
                        t_date = pd.to_datetime(t_date_raw).date()
                except Exception:
                    t_date = date.today()

                topic = str(row.get("Topic", row.get("topic", row.get("Training Topic", "Electrical Safety")))).strip()
                category = str(row.get("Category", row.get("category", "Mandatory EHS"))).strip()
                trainer = str(row.get("Trainer", row.get("trainer", "Site EHS Lead"))).strip()
                reg = int(float(row.get("Regular", row.get("regular_attendees", row.get("Regular Attendees", 0))) or 0))
                con = int(float(row.get("Contractor", row.get("contractor_attendees", row.get("Contractor Attendees", 0))) or 0))
                part = int(float(row.get("Participants", row.get("participants", reg + con)) or (reg + con)))
                hrs = float(row.get("Hours", row.get("hours", row.get("Duration (Hrs)", 1.0))) or 1.0)
                man_hrs = float(row.get("ManHours", row.get("man_hours", row.get("Total Man-Hours", part * hrs))) or (part * hrs))
                remarks = str(row.get("Remarks", row.get("remarks", "")))
                if remarks.lower() == "nan":
                    remarks = ""

                tr_obj = models.TrainingRecord(
                    plant_id=plant.id,
                    plot_id=plot.id if plot else None,
                    training_date=t_date,
                    topic=topic,
                    category=category,
                    trainer=trainer,
                    regular_attendees=reg,
                    contractor_attendees=con,
                    participants=part,
                    hours=hrs,
                    man_hours=round(man_hrs, 1),
                    remarks=remarks,
                )
                db.add(tr_obj)
                rows_processed += 1
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        db.commit()
    elif file_type == "unknown":
        errors.append("Could not detect a known EHS data format from the columns.")
    else:
        errors.append(f"Detected type '{file_type}' — bulk importer for this type isn't wired up.")

    history = models.UploadHistory(
        filename=file.filename,
        file_type=file_type,
        status="success" if rows_processed and not errors else ("partial" if rows_processed else "failed"),
        rows_processed=rows_processed,
    )
    db.add(history)
    db.commit()

    return {
        "filename": file.filename,
        "detected_type": file_type,
        "rows_processed": rows_processed,
        "errors": errors,
    }


@app.get("/api/upload/history", response_model=List[schemas.UploadOut])
def upload_history(db: Session = Depends(get_db)):
    return db.query(models.UploadHistory).order_by(models.UploadHistory.upload_date.desc()).all()


@app.delete("/api/upload/history")
def clear_upload_history(db: Session = Depends(get_db)):
    db.query(models.UploadHistory).delete()
    db.commit()
    return {"status": "cleared"}


@app.post("/api/upload/history/bulk-delete")
def bulk_delete_upload_history(payload: dict, db: Session = Depends(get_db)):
    history_ids = payload.get("ids", [])
    if not history_ids:
        return {"status": "ok", "deleted_count": 0}
    deleted = (
        db.query(models.UploadHistory)
        .filter(models.UploadHistory.id.in_(history_ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"status": "deleted", "deleted_count": deleted}



# ---------------------------------------------------------------- Excel Export --
@app.get("/api/reports/export/excel")
def export_detailed_excel_report(
    month: Optional[str] = Query(None, description="Month e.g. Jul"),
    year: Optional[int] = Query(None, description="Year e.g. 2026"),
    plant: Optional[str] = Query(None, description="Plant name or 'All'"),
    plot: Optional[str] = Query(None, description="Plot name or 'All'"),
    db: Session = Depends(get_db)
):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Styles & Colors
    font_title = Font(name="Arial", size=16, bold=True, color="FFFFFF")
    font_header = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    font_sub_header = Font(name="Arial", size=11, bold=True, color="064E3B")
    font_bold = Font(name="Arial", size=10, bold=True)
    font_regular = Font(name="Arial", size=10)
    
    fill_emerald_header = PatternFill(start_color="064E3B", end_color="064E3B", fill_type="solid")
    fill_teal_header = PatternFill(start_color="047857", end_color="047857", fill_type="solid")
    fill_sub_banner = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_white = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    thin_border_side = Side(style='thin', color='CBD5E1')
    thick_bottom_side = Side(style='medium', color='047857')
    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    border_header = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thick_bottom_side)

    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Query Data
    q_metrics = db.query(models.MonthlyMetric)
    plant_obj = None
    if plant and plant != "All":
        plant_obj = db.query(models.Plant).filter(models.Plant.name == plant).first()
        if plant_obj:
            q_metrics = q_metrics.filter(models.MonthlyMetric.plant_id == plant_obj.id)
    
    plot_obj = None
    if plot and plot != "All" and plant_obj:
        plot_obj = db.query(models.Plot).filter(models.Plot.plant_id == plant_obj.id, models.Plot.name == plot).first()
        if plot_obj:
            q_metrics = q_metrics.filter(models.MonthlyMetric.plot_id == plot_obj.id)

    if month and month != "All":
        q_metrics = q_metrics.filter(models.MonthlyMetric.month == month)
    if year and year != 0:
        q_metrics = q_metrics.filter(models.MonthlyMetric.year == year)

    metrics_rows = q_metrics.all()
    plants = {p.id: p.name for p in db.query(models.Plant).all()}
    plots = {p.id: p.name for p in db.query(models.Plot).all()}

    # Sheet 1: Monthly Metrics Register
    ws = wb.create_sheet(title="EHS Metrics Register")
    ws.views.sheetView[0].showGridLines = True

    # Title Banner
    ws.merge_cells("A1:V1")
    title_cell = ws["A1"]
    title_cell.value = f"GREENKO PINNAPURAM CLUSTER - EHS COMPREHENSIVE REPORT ({month or 'All'} {year or '2026'})"
    title_cell.font = font_title
    title_cell.fill = fill_emerald_header
    title_cell.alignment = align_center
    ws.row_dimensions[1].height = 40

    headers = [
        "Plant", "Plot", "Month", "Year", "Score", "Grade",
        "Fatality", "LTI", "MTC", "FAC", "Safe Man-Hours",
        "Near Miss", "Unsafe Acts", "Unsafe Cond.", "Walkdowns", "Audits",
        "Training Hrs", "TBT Talks", "TBT Talk Hrs", "OHS Meetings", "Mock Drills",
        "PTW %", "LOTO %", "Statutory %", "Audit Closure %", "Fire Safety %"
    ]
    
    ws.row_dimensions[3].height = 28
    for col_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=3, column=col_idx, value=h)
        c.font = font_header
        c.fill = fill_teal_header
        c.border = border_header
        c.alignment = align_center

    for r_idx, r in enumerate(metrics_rows, start=4):
        ws.row_dimensions[r_idx].height = 20
        fill = fill_zebra if r_idx % 2 == 0 else fill_white
        row_vals = [
            plants.get(r.plant_id, "Unknown"),
            plots.get(r.plot_id, "Overall") if r.plot_id else "Overall",
            r.month, r.year, r.total_score, r.grade,
            r.fatality, r.lti, r.mtc, r.fac, r.safe_man_hours,
            r.near_miss, r.unsafe_acts, r.unsafe_conditions, r.walkdowns, r.audits,
            r.training_hours, r.toolbox_talks, r.toolbox_talk_hours or 0.0,
            r.ohs_meetings or 0, r.mock_drills or 0,
            r.ptw_compliance, r.loto_compliance, r.statutory_compliance, r.audit_closure, r.fire_safety,
        ]
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_regular
            cell.fill = fill
            cell.border = border_cell
            cell.alignment = align_center if c_idx in [3, 4, 6] else (align_left if c_idx in [1, 2] else align_right)

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Greenko_EHS_Report_{month or 'All'}_{year or '2026'}.xlsx"},
    )


# ---------------------------------------------------------------- Super Admin System & Backup Management ---

BASE_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE_PATH = os.path.join(BASE_BACKEND_DIR, "ehs_dashboard.db")
BACKUPS_DIR = os.path.join(BASE_BACKEND_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

PROJECT_ROOT_DIR = os.path.dirname(BASE_BACKEND_DIR)
TUNNEL_URL_FILE = os.path.join(PROJECT_ROOT_DIR, "tunnel_url.txt")


def find_cloudflared_executable() -> Optional[str]:
    # 1. System PATH
    cf = shutil.which("cloudflared")
    if cf:
        return cf
    # 2. User bin
    user_bin = os.path.expanduser(r"~\bin\cloudflared.exe")
    if os.path.isfile(user_bin):
        return user_bin
    # 3. Local AppData
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    if local_appdata:
        p = os.path.join(local_appdata, "cloudflared", "cloudflared.exe")
        if os.path.isfile(p):
            return p
    # 4. Program Files
    prog_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    p = os.path.join(prog_files, "cloudflared", "cloudflared.exe")
    if os.path.isfile(p):
        return p
    # 5. Project root
    p = os.path.join(PROJECT_ROOT_DIR, "cloudflared.exe")
    if os.path.isfile(p):
        return p
    return None


def is_cloudflared_running() -> bool:
    try:
        res = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq cloudflared.exe"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return "cloudflared.exe" in res.stdout
    except Exception:
        return False


def get_current_tunnel_url() -> Optional[str]:
    if os.path.isfile(TUNNEL_URL_FILE):
        try:
            with open(TUNNEL_URL_FILE, "r", encoding="utf-8") as f:
                url = f.read().strip()
                if url.startswith("https://") and "trycloudflare.com" in url:
                    return url
        except Exception:
            pass
    return None


def compute_file_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    db_size = os.path.getsize(DB_FILE_PATH) if os.path.isfile(DB_FILE_PATH) else 0
    tunnel_url = get_current_tunnel_url()
    tunnel_active = is_cloudflared_running()
    local_ip = get_local_ip()

    git_info = {"is_git": False, "branch": "unknown", "commit": "unknown"}
    try:
        b_res = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=PROJECT_ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if b_res.returncode == 0:
            git_info["is_git"] = True
            git_info["branch"] = b_res.stdout.strip()
            c_res = subprocess.run(
                ["git", "log", "-1", "--pretty=format:%h - %s (%ci)"],
                cwd=PROJECT_ROOT_DIR,
                capture_output=True,
                text=True,
                timeout=3,
            )
            if c_res.returncode == 0:
                git_info["commit"] = c_res.stdout.strip()
    except Exception:
        pass

    backups_count = len([f for f in os.listdir(BACKUPS_DIR) if f.endswith(".db")]) if os.path.isdir(BACKUPS_DIR) else 0

    return {
        "status": "online",
        "service": "Greenko Pinnapuram Cluster EHS Dashboard",
        "server_time": datetime.now().isoformat(),
        "network": {
            "local_ip": local_ip,
            "port": 5174,
            "wifi_url": f"http://{local_ip}:5174",
        },
        "database": {
            "file": "ehs_dashboard.db",
            "size_bytes": db_size,
            "size_formatted": f"{db_size / 1024:.1f} KB" if db_size < 1024 * 1024 else f"{db_size / (1024 * 1024):.2f} MB",
            "backups_count": backups_count,
        },
        "counts": {
            "plants": db.query(models.Plant).count(),
            "plots": db.query(models.Plot).count(),
            "users": db.query(models.User).count(),
            "metrics": db.query(models.MonthlyMetric).count(),
            "incidents": db.query(models.Incident).count(),
            "training": db.query(models.TrainingRecord).count(),
            "safety_issues": db.query(models.SafetyIssue).count(),
            "audit_findings": db.query(models.AuditFinding).count(),
        },
        "tunnel": {
            "active": tunnel_active,
            "url": tunnel_url,
            "cloudflared_available": find_cloudflared_executable() is not None,
        },
        "git": git_info,
    }


@app.get("/api/system/backups")
def list_backups():
    backups = []
    if not os.path.isdir(BACKUPS_DIR):
        return []

    for f in os.listdir(BACKUPS_DIR):
        if f.endswith(".db"):
            fpath = os.path.join(BACKUPS_DIR, f)
            size = os.path.getsize(fpath)
            meta_path = os.path.join(BACKUPS_DIR, f.replace(".db", ".json"))
            meta = {}
            if os.path.isfile(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as mf:
                        meta = json.load(mf)
                except Exception:
                    pass

            created_time = meta.get("created_at")
            if not created_time:
                created_time = datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat()

            backups.append({
                "filename": f,
                "size_bytes": size,
                "size_formatted": f"{size / 1024:.1f} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.2f} MB",
                "created_at": created_time,
                "sha256": meta.get("sha256", ""),
                "notes": meta.get("notes", "System Database Snapshot"),
                "counts": meta.get("counts", {}),
                "is_rollback": "rollback" in f.lower(),
            })

    # Sort newest first
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups


@app.post("/api/system/backups/create")
def create_backup(notes: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if not os.path.isfile(DB_FILE_PATH):
        raise HTTPException(404, "Database file not found.")

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"ehs_backup_{timestamp_str}.db"
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)

    # Atomic SQLite backup using native backup API
    try:
        src = sqlite3.connect(DB_FILE_PATH)
        dst = sqlite3.connect(backup_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(500, f"Backup creation failed: {str(e)}")

    size_bytes = os.path.getsize(backup_path)
    sha256_hash = compute_file_sha256(backup_path)

    meta = {
        "filename": backup_filename,
        "size_bytes": size_bytes,
        "created_at": datetime.now().isoformat(),
        "sha256": sha256_hash,
        "notes": notes or "Automated Super Admin Backup",
        "counts": {
            "plants": db.query(models.Plant).count(),
            "plots": db.query(models.Plot).count(),
            "users": db.query(models.User).count(),
            "metrics": db.query(models.MonthlyMetric).count(),
            "incidents": db.query(models.Incident).count(),
            "trainings": db.query(models.TrainingRecord).count(),
        },
    }

    meta_path = os.path.join(BACKUPS_DIR, f"ehs_backup_{timestamp_str}.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


@app.get("/api/system/backups/download/{filename}")
def download_backup(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")
    backup_path = os.path.join(BACKUPS_DIR, filename)
    if not os.path.isfile(backup_path):
        raise HTTPException(404, "Backup file not found")
    return FileResponse(backup_path, filename=filename, media_type="application/x-sqlite3")


@app.post("/api/system/backups/restore/{filename}")
def restore_backup(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")

    backup_path = os.path.join(BACKUPS_DIR, filename)
    if not os.path.isfile(backup_path):
        raise HTTPException(404, "Backup file does not exist")

    # Safety Check: Always create a rollback point of the current database before restore
    rollback_name = f"safety_rollback_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    rollback_path = os.path.join(BACKUPS_DIR, rollback_name)
    try:
        src = sqlite3.connect(DB_FILE_PATH)
        dst = sqlite3.connect(rollback_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(500, f"Failed to create safety rollback copy: {str(e)}")

    # Perform atomic restore
    try:
        src = sqlite3.connect(backup_path)
        dst = sqlite3.connect(DB_FILE_PATH)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(500, f"Failed to restore database from backup: {str(e)}")

    return {
        "status": "success",
        "message": f"Database successfully restored from {filename}",
        "rollback_created": rollback_name,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/system/backups/upload-restore")
async def upload_and_restore(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) < 16 or not contents.startswith(b"SQLite format 3\x00"):
        raise HTTPException(400, "Invalid database file. Must be a valid SQLite database file (.db).")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_orig_name = "".join(c for c in file.filename if c.isalnum() or c in "._-")
    saved_backup_name = f"uploaded_{timestamp}_{clean_orig_name}"
    saved_backup_path = os.path.join(BACKUPS_DIR, saved_backup_name)

    with open(saved_backup_path, "wb") as f:
        f.write(contents)

    # Create safety rollback
    rollback_name = f"safety_rollback_before_restore_{timestamp}.db"
    rollback_path = os.path.join(BACKUPS_DIR, rollback_name)
    try:
        src = sqlite3.connect(DB_FILE_PATH)
        dst = sqlite3.connect(rollback_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(500, f"Failed to create rollback: {str(e)}")

    # Restore
    try:
        src = sqlite3.connect(saved_backup_path)
        dst = sqlite3.connect(DB_FILE_PATH)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(500, f"Failed to restore database: {str(e)}")

    return {
        "status": "success",
        "message": f"Successfully restored database from uploaded backup '{file.filename}'",
        "saved_as": saved_backup_name,
        "rollback_created": rollback_name,
    }


@app.delete("/api/system/backups/{filename}")
def delete_backup(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")
    backup_path = os.path.join(BACKUPS_DIR, filename)
    if not os.path.isfile(backup_path):
        raise HTTPException(404, "Backup not found")
    try:
        os.remove(backup_path)
        meta_path = os.path.join(BACKUPS_DIR, filename.replace(".db", ".json"))
        if os.path.isfile(meta_path):
            os.remove(meta_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to delete backup: {str(e)}")
    return {"status": "deleted", "filename": filename}


@app.get("/api/system/backups/export-json")
def export_full_json(db: Session = Depends(get_db)):
    plants = [schemas.PlantOut.model_validate(p).model_dump() for p in db.query(models.Plant).all()]
    plots = [{"id": p.id, "plant_id": p.plant_id, "name": p.name, "description": p.description} for p in db.query(models.Plot).all()]
    users = [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "assigned_plant_ids": u.assigned_plant_ids,
            "is_active": u.is_active,
        }
        for u in db.query(models.User).all()
    ]
    metrics = [schemas.MonthlyMetricOut.model_validate(m).model_dump() for m in db.query(models.MonthlyMetric).all()]
    incidents = [schemas.IncidentOut.model_validate(i).model_dump() for i in db.query(models.Incident).all()]
    near_misses = [schemas.NearMissOut.model_validate(n).model_dump() for n in db.query(models.NearMiss).all()]
    trainings = [schemas.TrainingRecordOut.model_validate(t).model_dump() for t in db.query(models.TrainingRecord).all()]
    safety_issues = [schemas.SafetyIssueOut.model_validate(s).model_dump() for s in db.query(models.SafetyIssue).all()]
    audit_findings = [schemas.AuditFindingOut.model_validate(a).model_dump() for a in db.query(models.AuditFinding).all()]

    data = {
        "export_metadata": {
            "exported_at": datetime.now().isoformat(),
            "source": "Greenko Pinnapuram Cluster EHS Dashboard",
            "version": "2.0.0",
        },
        "plants": plants,
        "plots": plots,
        "users": users,
        "monthly_metrics": metrics,
        "incidents": incidents,
        "near_miss": near_misses,
        "training_records": trainings,
        "safety_issues": safety_issues,
        "audit_findings": audit_findings,
    }

    json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=EHS_Cluster_Full_Data_Backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"},
    )


@app.get("/api/system/tunnel/status")
def get_tunnel_status():
    is_active = is_cloudflared_running()
    url = get_current_tunnel_url() if is_active else None
    return {
        "active": is_active,
        "url": url,
        "cloudflared_installed": find_cloudflared_executable() is not None,
    }


@app.post("/api/system/tunnel/start")
def start_tunnel():
    cf_exe = find_cloudflared_executable()
    if not cf_exe:
        raise HTTPException(400, "cloudflared binary is not available on this server.")

    # If already running with valid URL, return immediately
    if is_cloudflared_running():
        existing_url = get_current_tunnel_url()
        if existing_url:
            return {"status": "already_running", "active": True, "url": existing_url}
        # Terminate stale instance
        try:
            subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True, timeout=5)
            time.sleep(1)
        except Exception:
            pass

    log_file = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "ehs_cf.log")
    if os.path.isfile(log_file):
        try:
            os.remove(log_file)
        except Exception:
            pass

    if os.path.isfile(TUNNEL_URL_FILE):
        try:
            os.remove(TUNNEL_URL_FILE)
        except Exception:
            pass

    # Launch detached in background without showing console window (CREATE_NO_WINDOW = 0x08000000)
    creationflags = 0x08000000 if sys.platform == "win32" else 0
    cmd = [cf_exe, "tunnel", "--url", "http://127.0.0.1:5174", "--logfile", log_file]
    try:
        subprocess.Popen(cmd, creationflags=creationflags, close_fds=True)
    except Exception as e:
        raise HTTPException(500, f"Failed to start cloudflared tunnel: {str(e)}")

    # Poll log file for trycloudflare.com URL
    found_url = None
    start_time = time.time()
    import re
    while time.time() - start_time < 12:
        if os.path.isfile(log_file):
            try:
                with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                    if m:
                        found_url = m.group(0)
                        break
            except Exception:
                pass
        time.sleep(0.6)

    if found_url:
        with open(TUNNEL_URL_FILE, "w", encoding="utf-8") as f:
            f.write(found_url)
        return {"status": "started", "active": True, "url": found_url}
    else:
        current_url = get_current_tunnel_url()
        return {
            "status": "started_pending",
            "active": is_cloudflared_running(),
            "url": current_url,
            "message": "Tunnel process running. Public URL will populate in a few seconds.",
        }


@app.post("/api/system/tunnel/stop")
def stop_tunnel():
    try:
        subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True, timeout=5)
    except Exception:
        pass
    if os.path.isfile(TUNNEL_URL_FILE):
        try:
            os.remove(TUNNEL_URL_FILE)
        except Exception:
            pass
    return {"status": "stopped", "active": False, "url": None}


@app.post("/api/system/git/pull")
def git_pull():
    try:
        res = subprocess.run(
            ["git", "pull"],
            cwd=PROJECT_ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return {
            "success": res.returncode == 0,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Git pull command could not execute. Ensure git is installed and repository configured.",
        }

