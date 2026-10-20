from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Plant(Base):
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plots = relationship("Plot", cascade="all, delete-orphan", back_populates="plant")


class Plot(Base):
    __tablename__ = "plots"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("plant_id", "name", name="uix_plant_plot_name"),
    )
    plant = relationship("Plant", back_populates="plots")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), nullable=True)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    # Roles: SUPER_ADMIN, ADMIN, MANAGER, SITE_INCHARGE
    role = Column(String(30), nullable=False, default="MANAGER")
    # Comma-separated list of assigned plant IDs for SITE_INCHARGE (e.g. "1,2" or empty for all)
    assigned_plant_ids = Column(String(255), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MonthlyMetric(Base):
    __tablename__ = "monthly_metrics"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    month = Column(String(3), nullable=False)
    year = Column(Integer, nullable=False)

    # Lagging
    fatality = Column(Integer, default=0)
    lti = Column(Integer, default=0)
    mtc = Column(Integer, default=0)
    fac = Column(Integer, default=0)
    ltir = Column(Float, default=0.0)
    trifr = Column(Float, default=0.0)
    safe_man_hours = Column(Integer, default=0)

    # Leading & Proactive Safety
    near_miss = Column(Integer, default=0)
    nmfr = Column(Float, default=0.0)
    unsafe_acts = Column(Integer, default=0)
    unsafe_conditions = Column(Integer, default=0)
    walkdowns = Column(Integer, default=0)
    audits = Column(Integer, default=0)
    training_sessions = Column(Integer, default=0)
    training_hours = Column(Integer, default=0)
    toolbox_talks = Column(Integer, default=0)
    toolbox_talk_hours = Column(Float, default=0.0)
    ohs_meetings = Column(Integer, default=0)
    mock_drills = Column(Integer, default=0)

    # Compliance
    ptw_compliance = Column(Integer, default=0)
    loto_compliance = Column(Integer, default=0)
    statutory_compliance = Column(Integer, default=0)
    audit_closure = Column(Integer, default=0)
    fire_safety = Column(Integer, default=0)

    # Calculated
    total_score = Column(Float, default=0.0)
    grade = Column(String(20), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("plant_id", "plot_id", "month", "year", name="uix_plant_plot_month_year"),
    )
    plant = relationship("Plant")
    plot = relationship("Plot")


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    incident_date = Column(Date)
    incident_type = Column(String(50))
    description = Column(Text)
    severity = Column(String(20))
    status = Column(String(20))
    reported_by = Column(String(100))
    closed_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plant = relationship("Plant")
    plot = relationship("Plot")


class NearMiss(Base):
    __tablename__ = "near_miss"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    report_date = Column(Date)
    reporter = Column(String(100))
    near_miss_type = Column(String(50))
    risk_level = Column(String(20))
    description = Column(Text)
    is_closed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plant = relationship("Plant")
    plot = relationship("Plot")


class TrainingRecord(Base):
    __tablename__ = "training_records"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    training_date = Column(Date)
    topic = Column(String(150))
    category = Column(String(50), default="Mandatory EHS")
    trainer = Column(String(100), default="Site EHS Lead")
    regular_attendees = Column(Integer, default=0)
    contractor_attendees = Column(Integer, default=0)
    participants = Column(Integer, default=0)
    hours = Column(Float, default=1.0)
    man_hours = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plant = relationship("Plant")
    plot = relationship("Plot")


class SafetyIssue(Base):
    __tablename__ = "safety_issues"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    priority = Column(String(10))
    issue = Column(Text)
    status = Column(String(20))
    owner = Column(String(100))
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plant = relationship("Plant")
    plot = relationship("Plot")


class AuditFinding(Base):
    __tablename__ = "audit_findings"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
    audit_type = Column(String(50))
    audit_date = Column(Date)
    findings = Column(Integer)
    open_items = Column(Integer)
    closed_items = Column(Integer)
    score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plant = relationship("Plant")
    plot = relationship("Plot")


class UploadHistory(Base):
    __tablename__ = "upload_history"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    file_type = Column(String(50))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20))
    rows_processed = Column(Integer)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True)
