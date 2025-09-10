from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth import get_current_user
from app.crud import alerts as crud_alerts
from app.schema.alerts import AlertCreate, AlertResponse, AlertUpdate, AlertFilter
from app.models.alert import Alert
from typing import List, Optional

router = APIRouter(tags=["Alerts"])

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_resolved: Optional[bool] = Query(None),
    chemical_id: Optional[int] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alerts with filters"""
    try:
        filters = AlertFilter(
            is_resolved=is_resolved,
            chemical_id=chemical_id,
            skip=skip,
            limit=limit
        )

        alerts = crud_alerts.get_alerts(db, filters)
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch alerts: {str(e)}"
        )

@router.get("/unresolved", response_model=List[AlertResponse])
def get_unresolved_alerts(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unresolved alerts"""
    try:
        alerts = crud_alerts.get_unresolved_alerts(db)
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unresolved alerts: {str(e)}"
        )

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific alert by ID"""
    alert = crud_alerts.get_alert(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return alert

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an alert"""
    alert = crud_alerts.update_alert(db, alert_id, **alert_update.dict(exclude_unset=True))
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return alert

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve an alert"""
    alert = crud_alerts.resolve_alert(db, alert_id, current_user.uid)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return alert

@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an alert"""
    success = crud_alerts.delete_alert(db, alert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return {"message": "Alert deleted successfully"} 