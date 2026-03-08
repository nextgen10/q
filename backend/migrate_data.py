"""
Migration script to convert data from old schema to new schema.
Old schema: separate columns (id, name, timestamp, test_cases, bot_metrics, summaries, leaderboard, winner, events_json, run_id)
New schema: consolidated result_json column
"""

import sqlite3
import json
from datetime import datetime

DB_NAME = "evaluations.db"

def migrate_old_data():
    """Migrate data from evaluations_old to evaluations table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check if old table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations_old'")
    if not cursor.fetchone():
        print("No evaluations_old table found. Migration not needed.")
        conn.close()
        return
    
    # Get all records from old table
    cursor.execute("""
        SELECT id, name, timestamp, test_cases, bot_metrics, summaries, 
               leaderboard, winner, events_json, run_id 
        FROM evaluations_old
    """)
    old_records = cursor.fetchall()
    
    print(f"Found {len(old_records)} records to migrate...")
    
    migrated_count = 0
    for record in old_records:
        try:
            old_id, name, timestamp, test_cases, bot_metrics, summaries, leaderboard, winner, events_json, run_id = record
            
            # Parse JSON fields
            test_cases_data = json.loads(test_cases) if test_cases else {}
            bot_metrics_data = json.loads(bot_metrics) if bot_metrics else {}
            summaries_data = json.loads(summaries) if summaries else {}
            leaderboard_data = json.loads(leaderboard) if leaderboard else {}
            
            # Construct the new result_json format
            result_json = {
                "name": name,
                "test_cases": test_cases_data,
                "bot_metrics": bot_metrics_data,
                "summaries": summaries_data,
                "leaderboard": leaderboard_data,
                "winner": winner,
                # Add any aggregate metrics if available
                "aggregate_metrics": bot_metrics_data.get("aggregate_metrics", {})
            }
            
            # Convert to JSON string
            result_json_str = json.dumps(result_json)
            events_json_str = events_json if events_json else "[]"
            
            # Use original timestamp or create one
            if not timestamp:
                timestamp = datetime.now().isoformat()
            
            # Insert into new table
            cursor.execute("""
                INSERT INTO evaluations (timestamp, result_json, events_json, run_id)
                VALUES (?, ?, ?, ?)
            """, (timestamp, result_json_str, events_json_str, run_id))
            
            migrated_count += 1
            
        except Exception as e:
            print(f"Error migrating record {old_id}: {e}")
            continue
    
    conn.commit()
    print(f"Successfully migrated {migrated_count} out of {len(old_records)} records.")
    
    # Optionally, you can drop the old table after successful migration
    # Uncomment the following lines if you want to remove the old table
    # cursor.execute("DROP TABLE evaluations_old")
    # conn.commit()
    # print("Old table dropped.")
    
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate_old_data()
