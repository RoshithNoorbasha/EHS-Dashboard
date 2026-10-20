"""Scoring, grading and derived-metric calculations for the EHS dashboard."""


def calculate_plant_score(m: dict) -> float:
    """Calculate a 0-100 score from a metrics dict/row based on Plot-wise benchmark targets:
    - Near Miss Reporting: Target = 1 / month (10% weight)
    - Training Hours: Target = 15 hrs / month (10% weight)
    - Training Sessions: Target = 2 sessions / month (10% weight)
    - Audits Executed: Target = 2 / year (~0.167 / month) (15% weight)
    - LOTO Compliance: Target = 100% (15% weight)
    - Safety Walkdowns (WPI): Target = 2 / month (15% weight)
    - Statutory Compliance: Target = 100% (10% weight)
    - Safety Committee Meeting (OHS): Target = 1 / month (10% weight)
    - Mock Drill: Target = 1 / month (5% weight)
    - Toolbox Talks (TBT): No target (0% weight)
    """
    near_miss = m.get("near_miss", 0) or 0
    training_hours = m.get("training_hours", 0) or 0
    training_sessions = m.get("training_sessions", 0) or 0
    audits = m.get("audits", 0) or 0
    loto_compliance = m.get("loto_compliance", 0) or 0
    walkdowns = m.get("walkdowns", 0) or 0
    statutory_compliance = m.get("statutory_compliance", 0) or 0
    ohs_meetings = m.get("ohs_meetings", 0) or 0
    mock_drills = m.get("mock_drills", 0) or 0

    # Sub-component normalization against Plot-wise benchmark targets
    near_miss_score = min(100.0, (near_miss / 1.0) * 100.0)
    training_hours_score = min(100.0, (training_hours / 15.0) * 100.0)
    training_sessions_score = min(100.0, (training_sessions / 2.0) * 100.0)
    audit_score = min(100.0, (audits / (2.0 / 12.0)) * 100.0)
    loto_score = min(100.0, float(loto_compliance))
    walkdowns_score = min(100.0, (walkdowns / 2.0) * 100.0)
    statutory_score = min(100.0, float(statutory_compliance))
    ohs_score = min(100.0, (ohs_meetings / 1.0) * 100.0)
    mock_drill_score = min(100.0, (mock_drills / 1.0) * 100.0)

    total = (
        near_miss_score * 0.10
        + training_hours_score * 0.10
        + training_sessions_score * 0.10
        + audit_score * 0.15
        + loto_score * 0.15
        + walkdowns_score * 0.15
        + statutory_score * 0.10
        + ohs_score * 0.10
        + mock_drill_score * 0.05
    )

    # Negative grading for actual harm events
    total -= (m.get("mtc", 0) or 0) * 5
    total -= (m.get("lti", 0) or 0) * 15
    total -= (m.get("fatality", 0) or 0) * 40

    return round(max(0.0, min(100.0, total)), 2)


def get_grade(score: float) -> dict:
    if score >= 90:
        return {"grade": "Platinum", "color": "#8b5cf6", "label": "Excellent"}
    elif score >= 75:
        return {"grade": "Gold", "color": "#f59e0b", "label": "Very Good"}
    elif score >= 50:
        return {"grade": "Silver", "color": "#64748b", "label": "Average"}
    else:
        return {"grade": "Bronze", "color": "#ef4444", "label": "Not Satisfactory"}


def compute_derived_rates(m: dict) -> dict:
    """Fill in LTIR / TRIFR / NMFR if the caller didn't supply them,
    using the standard OSHA-style per-200,000-man-hours convention."""
    hours = m.get("safe_man_hours", 0) or 0
    out = dict(m)
    if hours > 0:
        if not out.get("ltir"):
            out["ltir"] = round((out.get("lti", 0) or 0) * 200000 / hours, 3)
        if not out.get("trifr"):
            recordables = (out.get("lti", 0) or 0) + (out.get("mtc", 0) or 0) + (out.get("fac", 0) or 0)
            out["trifr"] = round(recordables * 200000 / hours, 3)
        if not out.get("nmfr"):
            out["nmfr"] = round((out.get("near_miss", 0) or 0) * 200000 / hours, 3)
    return out
