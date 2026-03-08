import sqlite3
import os
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# Database path
# studio/backend/services/roi_service.py -> .../studio/backend/roi.db
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "roi.db")

# Models
class RunRecord(BaseModel):
    test_count: int
    duration_seconds: float
    timestamp: Optional[str] = None

class RoiSettings(BaseModel):
    manual_design_mins: float = 20.0
    auto_design_mins: float = 5.0
    manual_script_mins: float = 120.0
    auto_script_mins: float = 10.0
    manual_exec_mins: float = 10.0
    auto_exec_mins: float = 1.0
    hourly_rate: float = 50.0
    maintenance_percent: float = 15.0
    infra_cost_per_hour: float = 0.5

class RoiStats(BaseModel):
    total_runs: int
    total_tests_executed: int
    total_execution_time_sec: float
    design_savings_hours: float
    script_savings_hours: float
    exec_savings_hours: float
    total_savings_hours: float
    total_hard_savings: float
    projected_manual_cost: float
    maintenance_cost: float
    infra_cost: float
    velocity_multiplier: float
    cost_savings_ratio: float
    roi_percentage: float
    settings: RoiSettings
    history: List[dict]

class ROIService:
    @staticmethod
    def init_db():
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                manual_design_mins REAL,
                auto_design_mins REAL,
                manual_script_mins REAL,
                auto_script_mins REAL,
                manual_exec_mins REAL,
                hourly_rate REAL,
                auto_exec_mins REAL DEFAULT 1.0,
                maintenance_percent REAL DEFAULT 15.0,
                infra_cost_per_hour REAL DEFAULT 0.5
            )
        """)
        
        # Ensure default row exists
        cursor.execute("SELECT count(*) FROM settings")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO settings (id, manual_design_mins, auto_design_mins, manual_script_mins, auto_script_mins, manual_exec_mins, hourly_rate, auto_exec_mins, maintenance_percent, infra_cost_per_hour)
                VALUES (1, 20.0, 5.0, 120.0, 10.0, 10.0, 50.0, 1.0, 15.0, 0.5)
            """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                test_count INTEGER,
                duration_seconds REAL
            )
        """)
        
        conn.commit()
        conn.close()

    @staticmethod
    def get_settings() -> RoiSettings:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM settings WHERE id=1")
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                print("WARNING: No settings found in DB, returning defaults")
                return RoiSettings()
                
            return RoiSettings(
                manual_design_mins=row['manual_design_mins'],
                auto_design_mins=row['auto_design_mins'],
                manual_script_mins=row['manual_script_mins'],
                auto_script_mins=row['auto_script_mins'],
                manual_exec_mins=row['manual_exec_mins'],
                auto_exec_mins=row['auto_exec_mins'] if 'auto_exec_mins' in row.keys() else 1.0,
                hourly_rate=row['hourly_rate'],
                maintenance_percent=row['maintenance_percent'] if 'maintenance_percent' in row.keys() else 15.0,
                infra_cost_per_hour=row['infra_cost_per_hour'] if 'infra_cost_per_hour' in row.keys() else 0.5
            )
        except Exception as e:
            print(f"ERROR in get_settings: {e}")
            import traceback
            traceback.print_exc()
            # Return defaults on error to avoid crash
            return RoiSettings()


    @staticmethod
    def update_settings(settings: RoiSettings):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ensure migration safe columns
        try:
            cursor.execute("UPDATE settings SET manual_design_mins=?, auto_design_mins=?, manual_script_mins=?, auto_script_mins=?, manual_exec_mins=?, auto_exec_mins=?, hourly_rate=?, maintenance_percent=?, infra_cost_per_hour=? WHERE id=1",
                           (settings.manual_design_mins, settings.auto_design_mins, settings.manual_script_mins,
                            settings.auto_script_mins, settings.manual_exec_mins, settings.auto_exec_mins,
                            settings.hourly_rate, settings.maintenance_percent, settings.infra_cost_per_hour))
            conn.commit()
        except Exception as e:
            print(f"Error updating settings: {e}")
        finally:
            conn.close()

    @staticmethod
    def record_run(test_count: int, duration_seconds: float):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        ts = datetime.now().isoformat()
        cursor.execute("INSERT INTO runs (timestamp, test_count, duration_seconds) VALUES (?, ?, ?)", 
                       (ts, test_count, duration_seconds))
        conn.commit()
        conn.close()

    @staticmethod
    def get_stats() -> RoiStats:
        try:
            settings = ROIService.get_settings()
            conn = sqlite3.connect(DB_PATH)
            # Do NOT use row_factory here to keep simple tuples for rows
            cursor = conn.cursor()
            
            cursor.execute("SELECT timestamp, test_count, duration_seconds FROM runs ORDER BY id ASC")
            rows = cursor.fetchall()
            conn.close()
            
            total_runs = len(rows)
            total_tests = sum(r[1] for r in rows)
            total_exec_time = sum(r[2] for r in rows)
            
            # Calculations
            design_diff_mins = settings.manual_design_mins - settings.auto_design_mins
            design_savings_mins = design_diff_mins * total_tests
            
            script_diff_mins = settings.manual_script_mins - settings.auto_script_mins
            script_savings_mins = script_diff_mins * total_tests
            
            manual_exec_total_mins = settings.manual_exec_mins * total_tests
            auto_exec_total_mins = total_exec_time / 60.0 
            exec_savings_mins = manual_exec_total_mins - auto_exec_total_mins
            
            # Totals in Hours
            design_savings_hours = design_savings_mins / 60.0
            script_savings_hours = script_savings_mins / 60.0
            exec_savings_hours = exec_savings_mins / 60.0
            total_savings_hours = design_savings_hours + script_savings_hours + exec_savings_hours
            
            # Financials (Gross)
            gross_hard_savings = total_savings_hours * settings.hourly_rate
            
            # Costs & Deductions
            maintenance_cost = gross_hard_savings * (settings.maintenance_percent / 100.0)
            infra_cost = (total_exec_time / 3600.0) * settings.infra_cost_per_hour
            
            # Net Savings
            total_hard_savings = gross_hard_savings - maintenance_cost - infra_cost
            
            # New Metrics Calculations
            total_manual_hours = (settings.manual_design_mins + settings.manual_script_mins + settings.manual_exec_mins) * total_tests / 60.0
            projected_manual_cost = total_manual_hours * settings.hourly_rate
            
            total_auto_hours = (settings.auto_design_mins + settings.auto_script_mins) * total_tests / 60.0 + (total_exec_time / 3600.0)
            actual_auto_cost = (total_auto_hours * settings.hourly_rate) + infra_cost + maintenance_cost
            
            velocity_multiplier = manual_exec_total_mins / (auto_exec_total_mins if auto_exec_total_mins > 0 else 1)
            cost_savings_ratio = projected_manual_cost / (actual_auto_cost if actual_auto_cost > 0 else 1)
            
            roi_percentage = 0.0
            if actual_auto_cost > 0:
                roi_percentage = ((projected_manual_cost - actual_auto_cost) / actual_auto_cost) * 100.0

            # Build Cumulative History
            history = []
            cumulative_exec_savings_dollars = 0.0
            
            for r in rows:
                timestamp, test_count, duration = r
                manual_run_cost = (test_count * settings.manual_exec_mins / 60.0) * settings.hourly_rate
                auto_run_cost = ((duration / 3600.0) * settings.hourly_rate) + ((duration / 3600.0) * settings.infra_cost_per_hour)
                
                run_savings = manual_run_cost - auto_run_cost
                cumulative_exec_savings_dollars += run_savings
                
                history.append({
                    "timestamp": timestamp,
                    "tests": test_count,
                    "duration": duration,
                    "cumulative_savings": round(cumulative_exec_savings_dollars, 2)
                })
            
            return RoiStats(
                total_runs=total_runs,
                total_tests_executed=total_tests,
                total_execution_time_sec=total_exec_time,
                design_savings_hours=round(design_savings_hours, 2),
                script_savings_hours=round(script_savings_hours, 2),
                exec_savings_hours=round(exec_savings_hours, 2),
                total_savings_hours=round(total_savings_hours, 2),
                total_hard_savings=round(total_hard_savings, 2),
                projected_manual_cost=round(projected_manual_cost, 2),
                maintenance_cost=round(maintenance_cost, 2),
                infra_cost=round(infra_cost, 2),
                velocity_multiplier=round(velocity_multiplier, 1),
                cost_savings_ratio=round(cost_savings_ratio, 1),
                roi_percentage=round(roi_percentage, 0),
                settings=settings,
                history=history
            )
        except Exception as e:
            print(f"ERROR in get_stats: {e}")
            import traceback
            traceback.print_exc()
            raise e

# Initialize on module load
ROIService.init_db()
