from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime


# ---------------------------------------------------------------- Plant Schemas
class PlantBase(BaseModel):
    name: str


class PlantCreate(PlantBase):
    pass


class PlantOut(PlantBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ----------------------------------------------------------------- Plot Schemas
class PlotBase(BaseModel):
    plant_id: int
    name: str
    description: Optional[str] = None


class PlotCreate(PlotBase):
    pass


class PlotOut(PlotBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ----------------------------------------------------------------- User & RBAC Schemas
class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: str = "MANAGER"  # SUPER_ADMIN, ADMIN, MANAGER, SITE_INCHARGE
    assigned_plant_ids: Optional[str] = ""
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class RegisterRequest(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: Optional[str] = "SITE_INCHARGE"
    assigned_plant_ids: Optional[str] = ""


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    assigned_plant_ids: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# -------------------------------------------------------------- Monthly Metrics
class MetricBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    month: str
    year: int

    # Lagging
    fatality: int = 0
    lti: int = 0
    mtc: int = 0
    fac: int = 0
    ltir: float = 0.0
    trifr: float = 0.0
    safe_man_hours: int = 0

    # Leading & Proactive
    near_miss: int = 0
    nmfr: float = 0.0
    unsafe_acts: int = 0
    unsafe_conditions: int = 0
    walkdowns: int = 0
    audits: int = 0
    training_sessions: int = 0
    training_hours: int = 0
    toolbox_talks: int = 0
    toolbox_talk_hours: float = 0.0
    ohs_meetings: int = 0
    mock_drills: int = 0

    # Compliance
    ptw_compliance: int = 0
    loto_compliance: int = 0
    statutory_compliance: int = 0
    audit_closure: int = 0
    fire_safety: int = 0


class MetricCreate(MetricBase):
    pass


class MetricOut(MetricBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    total_score: float = 0.0
    grade: str = ""
    created_at: Optional[datetime] = None


# ------------------------------------------------------------------- Incidents
class IncidentBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    incident_date: date
    incident_type: str
    description: Optional[str] = None
    severity: str
    status: str = "Open"
    reported_by: Optional[str] = None
    closed_date: Optional[date] = None


class IncidentCreate(IncidentBase):
    pass


class IncidentOut(IncidentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ------------------------------------------------------------------ Near Miss
class NearMissBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    report_date: date
    reporter: Optional[str] = None
    near_miss_type: Optional[str] = None
    risk_level: str = "Low"
    description: Optional[str] = None
    is_closed: bool = False


class NearMissCreate(NearMissBase):
    pass


class NearMissOut(NearMissBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ------------------------------------------------------------ Training Records
class TrainingBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    training_date: date
    topic: str
    category: Optional[str] = "Mandatory EHS"
    trainer: Optional[str] = "Site EHS Lead"
    regular_attendees: int = 0
    contractor_attendees: int = 0
    participants: int = 0
    hours: float = 1.0
    man_hours: float = 0.0
    remarks: Optional[str] = None


class TrainingCreate(TrainingBase):
    pass


class TrainingOut(TrainingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------- Safety Issues
class IssueBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    priority: str = "Medium"
    issue: str
    status: str = "Open"
    owner: Optional[str] = None
    deadline: Optional[date] = None


class IssueCreate(IssueBase):
    pass


class IssueOut(IssueBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------- Audit Findings
class AuditBase(BaseModel):
    plant_id: int
    plot_id: Optional[int] = None
    audit_type: str
    audit_date: date
    findings: int = 0
    open_items: int = 0
    closed_items: int = 0
    score: float = 0.0


class AuditCreate(AuditBase):
    pass


class AuditOut(AuditBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------- Upload History
class UploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    file_type: str
    upload_date: Optional[datetime] = None
    status: str
    rows_processed: int
    plant_id: Optional[int] = None
    plot_id: Optional[int] = None


# -------------------------------------------------------------- Remote Cloudflare Tunnel Schemas
class TunnelStartRequest(BaseModel):
    duration_minutes: int = 30  # 20 to 30 mins
    username: str
    full_name: str


class TunnelSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: Optional[str] = None
    created_by_username: str
    created_by_name: str
    created_at: datetime
    duration_minutes: int
    expires_at: datetime
    status: str
    stopped_at: Optional[datetime] = None
    stopped_by_username: Optional[str] = None
    seconds_remaining: Optional[int] = None

