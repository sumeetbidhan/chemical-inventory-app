from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.activity_log import ActivityLog
from app.schema.activity_log import ActivityLogFilter
from typing import List, Optional
from datetime import datetime

def create_activity_log(
    db: Session, 
    user_id: Optional[int], 
    action: str, 
    description: str, 
    note: Optional[str] = None
) -> ActivityLog:
    db_log = ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        note=note
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_activity_logs(
    db: Session, 
    filters: ActivityLogFilter
) -> tuple[List[ActivityLog], int]:
    query = db.query(ActivityLog)
    
    # Apply filters
    if filters.user_id:
        query = query.filter(ActivityLog.user_id == filters.user_id)
    
    if filters.action:
        query = query.filter(ActivityLog.action == filters.action)
    
    if filters.start_date:
        query = query.filter(ActivityLog.timestamp >= filters.start_date)
    
    if filters.end_date:
        query = query.filter(ActivityLog.timestamp <= filters.end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    logs = query.order_by(ActivityLog.timestamp.desc()).offset(filters.offset).limit(filters.limit).all()
    
    return logs, total

def get_activity_log_by_id(db: Session, log_id: int) -> Optional[ActivityLog]:
    return db.query(ActivityLog).filter(ActivityLog.id == log_id).first()

def update_activity_log_note(db: Session, log_id: int, note: str) -> Optional[ActivityLog]:
    db_log = get_activity_log_by_id(db, log_id)
    if not db_log:
        return None
    
    db_log.note = note
    db.commit()
    db.refresh(db_log)
    return db_log

def get_user_activity_logs(db: Session, user_id: int, limit: int = 50) -> List[ActivityLog]:
    return db.query(ActivityLog).filter(
        ActivityLog.user_id == user_id
    ).order_by(ActivityLog.timestamp.desc()).limit(limit).all()

def get_recent_activity_logs(db: Session, limit: int = 20) -> List[ActivityLog]:
    return db.query(ActivityLog).order_by(
        ActivityLog.timestamp.desc()
    ).limit(limit).all() 