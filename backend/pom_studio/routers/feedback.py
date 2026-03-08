from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
from datetime import datetime
import os

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "feedback.db")

# Pydantic models
class FeedbackCreate(BaseModel):
    category: str
    rating: int
    title: Optional[str] = ""
    message: Optional[str] = ""

class FeedbackResponse(BaseModel):
    id: int
    category: str
    categoryLabel: str
    rating: int
    title: str
    message: str
    timestamp: str

# Initialize database
def init_db():
    """Create the feedback table if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            category_label TEXT NOT NULL,
            rating INTEGER NOT NULL,
            title TEXT,
            message TEXT,
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# Initialize DB on module load
init_db()

# Category mapping
CATEGORIES = {
    'general': 'General',
    'feature': 'Feature Request',
    'bug': 'Bug',
    'improvement': 'Improvement',
    'ai_generation': 'AI Generation'
}

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackCreate):
    """Submit new feedback"""
    try:
        category_label = CATEGORIES.get(feedback.category, 'General')
        timestamp = datetime.now().isoformat()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO feedback (category, category_label, rating, title, message, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (feedback.category, category_label, feedback.rating, feedback.title, feedback.message, timestamp))
        
        feedback_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return FeedbackResponse(
            id=feedback_id,
            category=feedback.category,
            categoryLabel=category_label,
            rating=feedback.rating,
            title=feedback.title or "",
            message=feedback.message or "",
            timestamp=timestamp
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@router.get("/list", response_model=List[FeedbackResponse])
async def list_feedback():
    """Get all feedback entries"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, category, category_label, rating, title, message, timestamp
            FROM feedback
            ORDER BY id DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        feedback_list = [
            FeedbackResponse(
                id=row[0],
                category=row[1],
                categoryLabel=row[2],
                rating=row[3],
                title=row[4] or "",
                message=row[5] or "",
                timestamp=row[6]
            )
            for row in rows
        ]
        
        return feedback_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch feedback: {str(e)}")

@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: int):
    """Delete a feedback entry"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        conn.commit()
        conn.close()
        
        return {"message": "Feedback deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete feedback: {str(e)}")
