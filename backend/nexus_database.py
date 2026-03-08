from sqlalchemy import create_engine, Column, String, JSON, DateTime, Float, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = "sqlite:///./nexus_evaluations.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EvaluationRecord(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    test_cases = Column(JSON)
    bot_metrics = Column(JSON)
    summaries = Column(JSON)
    leaderboard = Column(JSON)
    winner = Column(String)
    app_id = Column(String, index=True, nullable=True)

class MetricCache(Base):
    __tablename__ = "metric_cache"
    cache_key = Column(String, primary_key=True, index=True)
    metrics = Column(JSON)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

def _migrate_rag_schema():
    """Add app_id column to RAG evaluations table if it doesn't exist."""
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("evaluations")]
    if "app_id" not in columns:
        logger.info("Migrating RAG evaluations table: adding app_id column")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN app_id TEXT"))
            conn.commit()
        logger.info("RAG evaluations migration complete")

try:
    _migrate_rag_schema()
except Exception as e:
    logger.warning("RAG schema migration skipped (table may not exist yet): %s", e)
