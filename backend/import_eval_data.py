"""
Import existing evaluation data from eval-experimental project.
This script copies all evaluation records from the source database to the current database.
"""

import sqlite3
import os

SOURCE_DB = "/Users/aniketmarwadi/Aniket/OnePassEval/eval-experimental/backend/evaluations.db"
TARGET_DB = "evaluations.db"

def import_eval_data():
    """Import evaluation data from eval-experimental database."""
    
    if not os.path.exists(SOURCE_DB):
        print(f"Source database not found: {SOURCE_DB}")
        return
    
    # Connect to both databases
    source_conn = sqlite3.connect(SOURCE_DB)
    target_conn = sqlite3.connect(TARGET_DB)
    
    source_cursor = source_conn.cursor()
    target_cursor = target_conn.cursor()
    
    # Get all records from source database
    source_cursor.execute("""
        SELECT timestamp, result_json, events_json, run_id
        FROM evaluations
        ORDER BY id
    """)
    
    records = source_cursor.fetchall()
    print(f"Found {len(records)} records to import from eval-experimental...")
    
    # Check current count in target database
    target_cursor.execute("SELECT COUNT(*) FROM evaluations")
    current_count = target_cursor.fetchone()[0]
    print(f"Current records in target database: {current_count}")
    
    # Import records
    imported_count = 0
    skipped_count = 0
    
    for record in records:
        try:
            timestamp, result_json, events_json, run_id = record
            
            # Insert into target database
            target_cursor.execute("""
                INSERT INTO evaluations (timestamp, result_json, events_json, run_id)
                VALUES (?, ?, ?, ?)
            """, (timestamp, result_json, events_json, run_id))
            
            imported_count += 1
            
        except sqlite3.IntegrityError as e:
            # Skip duplicates
            skipped_count += 1
            continue
        except Exception as e:
            print(f"Error importing record: {e}")
            skipped_count += 1
            continue
    
    # Commit changes
    target_conn.commit()
    
    # Get final count
    target_cursor.execute("SELECT COUNT(*) FROM evaluations")
    final_count = target_cursor.fetchone()[0]
    
    print(f"\nImport Summary:")
    print(f"  Records imported: {imported_count}")
    print(f"  Records skipped: {skipped_count}")
    print(f"  Total records in database: {final_count}")
    
    # Close connections
    source_conn.close()
    target_conn.close()
    
    print("\nImport complete!")

if __name__ == "__main__":
    import_eval_data()
