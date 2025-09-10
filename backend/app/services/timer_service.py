"""
Timer Service for Chemical Inventory System
Handles real-time timer updates and broadcasting via WebSocket
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, List
from sqlalchemy.orm import Session

from ..models.product_assignment import ProductAssignment
from ..websocket_manager import manager


class TimerService:
    """Service for managing real-time timer updates"""
    
    def __init__(self, db: Session):
        self.db = db
        self.running_timers = {}  # assignment_id -> timer_task
        self.update_interval = 60  # Update every 60 seconds
    
    async def start_timer_for_assignment(self, assignment_id: int):
        """Start a timer for a specific assignment"""
        if assignment_id in self.running_timers:
            return  # Timer already running
        
        # Create timer task
        timer_task = asyncio.create_task(self._timer_loop(assignment_id))
        self.running_timers[assignment_id] = timer_task
        
        print(f"⏰ Started timer for assignment {assignment_id}")
    
    async def stop_timer_for_assignment(self, assignment_id: int):
        """Stop timer for a specific assignment"""
        if assignment_id in self.running_timers:
            timer_task = self.running_timers[assignment_id]
            timer_task.cancel()
            del self.running_timers[assignment_id]
            print(f"⏹️ Stopped timer for assignment {assignment_id}")
    
    async def _timer_loop(self, assignment_id: int):
        """Main timer loop for an assignment"""
        try:
            while True:
                # Get assignment from database
                assignment = self.db.query(ProductAssignment).filter(
                    ProductAssignment.id == assignment_id
                ).first()
                
                if not assignment:
                    print(f"❌ Assignment {assignment_id} not found, stopping timer")
                    break
                
                # Check if assignment is still active
                if assignment.status not in ['IN_PROGRESS']:
                    print(f"⏹️ Assignment {assignment_id} is no longer active, stopping timer")
                    break
                
                # Calculate time remaining
                time_remaining = assignment.time_remaining_minutes
                
                if time_remaining <= 0:
                    # Assignment expired
                    await self._handle_assignment_expired(assignment)
                    break
                
                # Broadcast timer update
                await self._broadcast_timer_update(assignment, time_remaining)
                
                # Wait for next update
                await asyncio.sleep(self.update_interval)
                
        except asyncio.CancelledError:
            print(f"⏹️ Timer for assignment {assignment_id} was cancelled")
        except Exception as e:
            print(f"❌ Error in timer loop for assignment {assignment_id}: {e}")
        finally:
            # Clean up
            if assignment_id in self.running_timers:
                del self.running_timers[assignment_id]
    
    async def _broadcast_timer_update(self, assignment: ProductAssignment, time_remaining: int):
        """Broadcast timer update to relevant teams"""
        try:
            # Determine team type based on assignment
            team_type = assignment.team_type.lower()
            if team_type == 'lab_staff':
                team_type = 'lab'
            elif team_type == 'product_team':
                team_type = 'product'
            
            # Broadcast to the specific team
            await manager.send_team_broadcast({
                "type": "timer_update",
                "assignment_id": assignment.id,
                "time_remaining": time_remaining,
                "status": assignment.status,
                "progress_percentage": assignment.progress_percentage,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, team_type)
            
            # Also broadcast to admin team
            await manager.send_team_broadcast({
                "type": "timer_update",
                "assignment_id": assignment.id,
                "time_remaining": time_remaining,
                "status": assignment.status,
                "progress_percentage": assignment.progress_percentage,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, "admin")
            
        except Exception as e:
            print(f"❌ Error broadcasting timer update: {e}")
    
    async def _handle_assignment_expired(self, assignment: ProductAssignment):
        """Handle assignment expiration"""
        try:
            # Update assignment status
            assignment.status = "EXPIRED"
            self.db.commit()
            
            # Determine team type
            team_type = assignment.team_type.lower()
            if team_type == 'lab_staff':
                team_type = 'lab'
            elif team_type == 'product_team':
                team_type = 'product'
            
            # Broadcast expiration to teams
            await manager.send_team_broadcast({
                "type": "assignment_expired",
                "assignment_id": assignment.id,
                "product_name": assignment.product.name,
                "assigned_to": f"{assignment.assigned_to_user.first_name} {assignment.assigned_to_user.last_name or ''}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, team_type)
            
            # Also broadcast to admin team
            await manager.send_team_broadcast({
                "type": "assignment_expired",
                "assignment_id": assignment.id,
                "product_name": assignment.product.name,
                "assigned_to": f"{assignment.assigned_to_user.first_name} {assignment.assigned_to_user.last_name or ''}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, "admin")
            
            print(f"⏰ Assignment {assignment.id} has expired")
            
        except Exception as e:
            print(f"❌ Error handling assignment expiration: {e}")
    
    async def start_all_active_timers(self):
        """Start timers for all active assignments"""
        try:
            active_assignments = self.db.query(ProductAssignment).filter(
                ProductAssignment.status == "IN_PROGRESS"
            ).all()
            
            for assignment in active_assignments:
                await self.start_timer_for_assignment(assignment.id)
                
            print(f"⏰ Started timers for {len(active_assignments)} active assignments")
            
        except Exception as e:
            print(f"❌ Error starting active timers: {e}")
    
    def get_active_timers(self) -> List[int]:
        """Get list of active timer assignment IDs"""
        return list(self.running_timers.keys())
    
    async def cleanup_expired_timers(self):
        """Clean up timers for expired assignments"""
        try:
            expired_assignments = self.db.query(ProductAssignment).filter(
                ProductAssignment.status.in_(["EXPIRED", "COMPLETED"])
            ).all()
            
            for assignment in expired_assignments:
                await self.stop_timer_for_assignment(assignment.id)
                
            print(f"🧹 Cleaned up timers for {len(expired_assignments)} expired assignments")
            
        except Exception as e:
            print(f"❌ Error cleaning up expired timers: {e}")


# Global timer service instance
timer_service = None

def get_timer_service(db: Session) -> TimerService:
    """Get or create timer service instance"""
    global timer_service
    if timer_service is None:
        timer_service = TimerService(db)
    return timer_service
