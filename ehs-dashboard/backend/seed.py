"""Seed the database with sample data for plants, plots, users (RBAC), and metrics."""
import hashlib
import random
from datetime import date, timedelta

from database import Base, engine, SessionLocal
import models
from calculators import calculate_plant_score, get_grade, compute_derived_rates

PLANTS_WITH_PLOTS = {
    "Pinnapuram": [
        ("Plot 1 - North Solar Area", "High-capacity PV solar array section"),
        ("Plot 2 - South Solar Area", "Sub-array with central string inverters"),
        ("Plot 3 - Switchyard & Substation", "400kV GIS switchyard and transformers"),
        ("Plot 4 - Wind Ridge Block", "Wind turbine generators and access road"),
    ],
    "Ghani": [
        ("Plot 1 - Prayatna Power", "Prayatna 50MW Solar Generation Parcel"),
        ("Plot 2 - STU Plot 1 Rays Power", "Rays Power 50MW Inverter Block & Strings"),
        ("Plot 3 - Abhyudaya Solar Power Energy", "Abhyudaya 50MW PV Array & PCUs"),
        ("Plot 4 - Green Energy", "Green Energy 50MW Central Inverter Block"),
        ("Plot 5 - Adani Solar Power", "Adani Solar 50MW High-Yield PV Section"),
        ("Plot 6 - Sunedison Solar Power", "Sunedison 50MW Tracker & Array Section"),
        ("Plot 7 - Fortum Solar Power Energy", "Fortum Solar 50MW Generation Area"),
        ("Plot 8 - Azure Solar Energy", "Azure Solar 50MW Inverter Platform & Yard"),
        ("Plot 9 - SB Solar Energy", "SB Solar 50MW High-Voltage Substation Yard"),
        ("Plot 10 - Rays Solar Power (Local Area)", "Rays Power Local Package 50MW Array"),
    ],
    "Chenekapalli": [
        ("Plot 1 - East Sector", "East solar field and tracking mounts"),
        ("Plot 2 - West Sector", "West solar field and combiner boxes"),
        ("Plot 3 - Substation & Transformer", "Interconnection yard & auxiliary power"),
    ],
    "Nagalooty": [
        ("Plot 1 - Solar Field 1", "Primary photovoltaic generation zone"),
        ("Plot 2 - Solar Field 2", "Secondary solar string field"),
        ("Plot 3 - Control Building", "Field office, muster point, and store"),
    ],
}

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
YEAR = 2026

TRAINING_MODULES = [
    ("Electrical Safety & Arc Flash Prevention", "Mandatory EHS", "Internal EHS Lead"),
    ("LOTOTO Energy Isolation Standards", "Mandatory EHS", "OEM Specialist"),
    ("Working at Height & Fall Arrest Systems", "Mandatory EHS", "Safety Officer"),
    ("Hot Work & Fire Fighting Practical Drills", "Emergency & Mock Drill", "Fire Safety Team"),
    ("PTW Permit Issuer & Receiver Certification", "Mandatory EHS", "Cluster Safety Manager"),
    ("New Joiner / Contractor EHS Induction", "EHS Induction", "HR & EHS Officer"),
    ("Inverter & Transformer Maintenance Safety", "Theme-Based / OEM Advance", "Schneider OEM Lead"),
    ("Solar String Combiner & DC Arc Safety", "Theme-Based / OEM Advance", "SMA Specialist"),
    ("Defensive Driving & Heavy Vehicle Safety", "Mandatory EHS", "Logistics Lead"),
    ("Hazard Identification & Risk Assessment (HIRA)", "Mandatory EHS", "Corporate EHS Auditor"),
    ("Emergency Evacuation & First Aid CPR", "Emergency & Mock Drill", "Medical Officer"),
    ("Daily Safety Toolbox Talk on Heat Stress", "Toolbox Talk", "Site Supervisor"),
]


def hash_password(password: str) -> str:
    return hashlib.sha256(f"greenko_salt_{password}".encode("utf-8")).hexdigest()


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear old data
    db.query(models.MonthlyMetric).delete()
    db.query(models.Incident).delete()
    db.query(models.NearMiss).delete()
    db.query(models.TrainingRecord).delete()
    db.query(models.SafetyIssue).delete()
    db.query(models.AuditFinding).delete()
    db.query(models.UploadHistory).delete()
    db.query(models.Plot).delete()
    db.query(models.Plant).delete()
    db.query(models.User).delete()
    db.commit()

    # 1. Create Plants & Plots
    plant_objs = {}
    plot_objs = {}  # plant_name -> list of Plot objects

    for plant_name, plots_def in PLANTS_WITH_PLOTS.items():
        p = models.Plant(name=plant_name)
        db.add(p)
        db.commit()
        db.refresh(p)
        plant_objs[plant_name] = p
        plot_objs[plant_name] = []

        for plot_name, plot_desc in plots_def:
            plot = models.Plot(plant_id=p.id, name=plot_name, description=plot_desc)
            db.add(plot)
            db.commit()
            db.refresh(plot)
            plot_objs[plant_name].append(plot)

    # 2. Seed Default RBAC Users
    pinnapuram_id = plant_objs["Pinnapuram"].id
    ghani_id = plant_objs["Ghani"].id

    default_users = [
        models.User(
            username="superadmin",
            full_name="Super Administrator",
            email="superadmin@greenko.net",
            password_hash=hash_password("SuperAdmin@Greenko2026"),
            role="SUPER_ADMIN",
            assigned_plant_ids="",
            is_active=True,
        ),
        models.User(
            username="admin",
            full_name="Cluster EHS Admin",
            email="admin.ehs@greenko.net",
            password_hash=hash_password("Admin@Greenko2026"),
            role="ADMIN",
            assigned_plant_ids="",
            is_active=True,
        ),
        models.User(
            username="manager",
            full_name="Executive Safety Manager (Read Only)",
            email="manager.ehs@greenko.net",
            password_hash=hash_password("Manager@Greenko2026"),
            role="MANAGER",
            assigned_plant_ids="",
            is_active=True,
        ),
        models.User(
            username="site_pinnapuram",
            full_name="Pinnapuram Site Incharge",
            email="incharge.pinnapuram@greenko.net",
            password_hash=hash_password("Pinna@Greenko2026"),
            role="SITE_INCHARGE",
            assigned_plant_ids=str(pinnapuram_id),
            is_active=True,
        ),
        models.User(
            username="site_ghani",
            full_name="Ghani Site Incharge",
            email="incharge.ghani@greenko.net",
            password_hash=hash_password("Ghani@Greenko2026"),
            role="SITE_INCHARGE",
            assigned_plant_ids=str(ghani_id),
            is_active=True,
        ),
    ]

    for u in default_users:
        db.add(u)
    db.commit()

    # 3. Seed Monthly Metrics (Plant level + Plot level entries)
    for name, plant in plant_objs.items():
        plots_for_plant = plot_objs[name]

        for month in MONTHS:
            # Overall Plant Entry (plot_id = None)
            data = {
                "plant_id": plant.id,
                "plot_id": None,
                "month": month,
                "year": YEAR,
                "fatality": 0,
                "lti": 0,
                "mtc": random.choices([0, 1], weights=[0.75, 0.25])[0],
                "fac": random.choices([0, 1, 2], weights=[0.3, 0.4, 0.3])[0],
                "safe_man_hours": random.randint(1_500_000, 3_000_000),
                "near_miss": random.randint(15, 35),
                "unsafe_acts": random.randint(12, 28),
                "unsafe_conditions": random.randint(18, 48),
                "walkdowns": random.randint(8, 18),
                "audits": random.randint(3, 5),
                "training_sessions": random.randint(5, 12),
                "training_hours": random.randint(180, 450),
                "toolbox_talks": random.randint(40, 65),
                "toolbox_talk_hours": round(random.uniform(20.0, 55.0), 1),
                "ohs_meetings": random.randint(1, 3),
                "mock_drills": random.randint(1, 4),
                "ptw_compliance": random.randint(88, 98),
                "loto_compliance": random.randint(78, 92),
                "statutory_compliance": random.randint(92, 99),
                "audit_closure": random.randint(68, 85),
                "fire_safety": random.randint(55, 80),
            }
            data = compute_derived_rates(data)
            data["total_score"] = calculate_plant_score(data)
            data["grade"] = get_grade(data["total_score"])["grade"]
            db.add(models.MonthlyMetric(**data))

            # Also seed plot-wise breakdown metrics
            for plot in plots_for_plant:
                plot_data = {
                    "plant_id": plant.id,
                    "plot_id": plot.id,
                    "month": month,
                    "year": YEAR,
                    "fatality": 0,
                    "lti": 0,
                    "mtc": random.choices([0, 1], weights=[0.9, 0.1])[0],
                    "fac": random.choices([0, 1], weights=[0.6, 0.4])[0],
                    "safe_man_hours": random.randint(350_000, 800_000),
                    "near_miss": random.randint(3, 10),
                    "unsafe_acts": random.randint(3, 8),
                    "unsafe_conditions": random.randint(4, 14),
                    "walkdowns": random.randint(2, 6),
                    "audits": random.randint(1, 2),
                    "training_sessions": random.randint(1, 4),
                    "training_hours": random.randint(40, 120),
                    "toolbox_talks": random.randint(10, 20),
                    "toolbox_talk_hours": round(random.uniform(6.0, 18.0), 1),
                    "ohs_meetings": random.choice([0, 1]),
                    "mock_drills": random.choice([0, 1, 2]),
                    "ptw_compliance": random.randint(88, 100),
                    "loto_compliance": random.randint(80, 96),
                    "statutory_compliance": random.randint(90, 100),
                    "audit_closure": random.randint(70, 95),
                    "fire_safety": random.randint(60, 90),
                }
                plot_data = compute_derived_rates(plot_data)
                plot_data["total_score"] = calculate_plant_score(plot_data)
                plot_data["grade"] = get_grade(plot_data["total_score"])["grade"]
                db.add(models.MonthlyMetric(**plot_data))

        db.commit()

        # 4. Incidents with Plot associations
        for _ in range(random.randint(3, 6)):
            d = date(YEAR, random.randint(1, 7), random.randint(1, 28))
            chosen_plot = random.choice(plots_for_plant)
            db.add(models.Incident(
                plant_id=plant.id,
                plot_id=chosen_plot.id,
                incident_date=d,
                incident_type=random.choice(["MTC", "FAC", "Property Damage", "Environmental"]),
                description=f"Incident reported at {chosen_plot.name}. Immediate safety isolation executed.",
                severity=random.choice(["Low", "Medium", "High"]),
                status=random.choice(["Open", "Closed", "Under Investigation"]),
                reported_by="Site EHS Officer",
            ))

        # 5. Near Misses with Plot associations
        for _ in range(random.randint(15, 30)):
            d = date(YEAR, random.randint(1, 7), random.randint(1, 28))
            chosen_plot = random.choice(plots_for_plant)
            db.add(models.NearMiss(
                plant_id=plant.id,
                plot_id=chosen_plot.id,
                report_date=d,
                reporter="Field Safety Officer",
                near_miss_type=random.choice(["Slip/Trip", "Electrical", "Working at Height", "Vehicle", "Housekeeping"]),
                risk_level=random.choice(["Low", "Medium", "High"]),
                description=f"Near-miss observed during routine inspection at {chosen_plot.name}.",
                is_closed=random.choice([True, False]),
            ))

        # 6. Training Records
        for month in MONTHS:
            for _ in range(random.randint(2, 5)):
                d = date(YEAR, MONTHS.index(month) + 1, random.randint(1, 28))
                chosen_plot = random.choice(plots_for_plant)
                mod_topic, mod_cat, mod_trainer = random.choice(TRAINING_MODULES)
                reg_count = random.randint(3, 18)
                contractor_count = random.randint(8, 40)
                tot_p = reg_count + contractor_count
                hrs = round(random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 4.0]), 1)
                db.add(models.TrainingRecord(
                    plant_id=plant.id,
                    plot_id=chosen_plot.id,
                    training_date=d,
                    topic=mod_topic,
                    category=mod_cat,
                    trainer=mod_trainer,
                    regular_attendees=reg_count,
                    contractor_attendees=contractor_count,
                    participants=tot_p,
                    hours=hrs,
                    man_hours=round(tot_p * hrs, 1),
                    remarks=f"Completed at {chosen_plot.name}. Full attendance and safety competency validated.",
                ))

        # 7. Safety Issues
        for _ in range(random.randint(2, 4)):
            chosen_plot = random.choice(plots_for_plant)
            db.add(models.SafetyIssue(
                plant_id=plant.id,
                plot_id=chosen_plot.id,
                priority=random.choice(["High", "Medium", "Low"]),
                issue=random.choice([
                    f"LOTO procedure gap identified during maintenance at {chosen_plot.name}",
                    f"Fire extinguisher inspection tag overdue at {chosen_plot.name}",
                    f"PPE compliance enhancement required during string cabling at {chosen_plot.name}",
                    f"Guardrail repair required on elevated inverter platform in {chosen_plot.name}",
                    f"Emergency assembly point signage refresh scheduled at {chosen_plot.name}",
                ]),
                status=random.choice(["Open", "In Progress", "Closed"]),
                owner="Plant EHS Lead",
                deadline=date(YEAR, random.randint(8, 12), random.randint(1, 28)),
            ))

        # 8. Audit Findings
        for _ in range(random.randint(2, 4)):
            findings = random.randint(4, 16)
            closed = random.randint(1, findings)
            chosen_plot = random.choice(plots_for_plant)
            db.add(models.AuditFinding(
                plant_id=plant.id,
                plot_id=chosen_plot.id,
                audit_type=random.choice(["Internal EHS Audit", "Statutory Audit", "Fire Safety Audit", "PTW Audit", "Mock Drill Evaluation"]),
                audit_date=date(YEAR, random.randint(1, 7), random.randint(1, 28)),
                findings=findings,
                open_items=findings - closed,
                closed_items=closed,
                score=round(random.uniform(70, 99), 1),
            ))

    db.commit()
    db.close()
    print("Seed complete: Plants, Plots, RBAC Users (Super Admin, Admin, Manager, Site Incharges), and Metrics seeded successfully.")


if __name__ == "__main__":
    run()
