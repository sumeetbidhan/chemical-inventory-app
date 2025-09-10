"""
WebSocket Router for Real-time Assignment Tracking
Handles WebSocket connections for live progress monitoring and admin notifications
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Optional
import json
import logging

from ..websocket_manager import manager, WebSocketService
from ..firebase_auth import get_current_user_ws
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/admin/{admin_id}")
async def websocket_admin_endpoint(websocket: WebSocket, admin_id: int):
    """WebSocket endpoint for admin real-time notifications"""
    try:
        # Verify admin user
        user = await get_current_user_ws(websocket)
        if not user or user.role_id != 1:  # Assuming role_id 1 is ADMIN
            await websocket.close(code=4003, reason="Admin access required")
            return
        
        # Connect admin
        await manager.connect_admin(websocket, admin_id)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": f"Admin {admin_id} connected successfully",
            "timestamp": "2024-01-15T10:30:00Z"
        }))
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for any message from admin (ping/pong for keep-alive)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "timestamp": "2024-01-15T10:30:00Z"
                    }))
                elif message.get("type") == "GET_STATUS":
                    # Send current connection status
                    status = manager.get_connection_count()
                    await websocket.send_text(json.dumps({
                        "type": "STATUS_UPDATE",
                        "status": status,
                        "timestamp": "2024-01-15T10:30:00Z"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"Admin {admin_id} WebSocket disconnected")
        except Exception as e:
            logger.error(f"Error in admin WebSocket {admin_id}: {e}")
            
    except Exception as e:
        logger.error(f"Failed to establish admin WebSocket connection: {e}")
        try:
            await websocket.close(code=4000, reason="Connection failed")
        except:
            pass
    finally:
        manager.disconnect(websocket)


@router.websocket("/ws/assignment/{assignment_id}")
async def websocket_assignment_endpoint(websocket: WebSocket, assignment_id: int):
    """WebSocket endpoint for assignment progress tracking"""
    try:
        # Verify user authentication
        user = await get_current_user_ws(websocket)
        if not user:
            await websocket.close(code=4001, reason="Authentication required")
            return
        
        # Connect to assignment
        await manager.connect_assignment(websocket, assignment_id)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": f"Connected to assignment {assignment_id}",
            "assignment_id": assignment_id,
            "timestamp": "2024-01-15T10:30:00Z"
        }))
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for progress updates from team members
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "PROGRESS_UPDATE":
                    # Handle progress update from team member
                    component_code = message.get("component_code")
                    quantity_added = message.get("quantity_added")
                    confirmed = message.get("confirmed", False)
                    
                    if component_code and quantity_added is not None:
                        # Notify all subscribers about progress update
                        await WebSocketService.send_progress_update(assignment_id, {
                            "component_code": component_code,
                            "quantity_added": quantity_added,
                            "confirmed": confirmed,
                            "user_id": user.id,
                            "user_name": f"{user.first_name} {user.last_name or ''}"
                        })
                        
                        # If confirmed, notify component completion
                        if confirmed:
                            await WebSocketService.notify_component_completed(
                                assignment_id, 
                                component_code, 
                                quantity_added, 
                                f"{user.first_name} {user.last_name or ''}"
                            )
                
                elif message.get("type") == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "timestamp": "2024-01-15T10:30:00Z"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"Assignment {assignment_id} WebSocket disconnected")
        except Exception as e:
            logger.error(f"Error in assignment WebSocket {assignment_id}: {e}")
            
    except Exception as e:
        logger.error(f"Failed to establish assignment WebSocket connection: {e}")
        try:
            await websocket.close(code=4000, reason="Connection failed")
        except:
            pass
    finally:
        manager.disconnect(websocket)


@router.websocket("/ws/user/{user_id}")
async def websocket_user_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for user-specific updates"""
    try:
        # Verify user authentication
        user = await get_current_user_ws(websocket)
        if not user or user.id != user_id:
            await websocket.close(code=4001, reason="Authentication required")
            return
        
        # Connect user
        await manager.connect_user(websocket, user_id)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": f"User {user_id} connected successfully",
            "timestamp": "2024-01-15T10:30:00Z"
        }))
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for any message from user
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "timestamp": "2024-01-15T10:30:00Z"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"User {user_id} WebSocket disconnected")
        except Exception as e:
            logger.error(f"Error in user WebSocket {user_id}: {e}")
            
    except Exception as e:
        logger.error(f"Failed to establish user WebSocket connection: {e}")
        try:
            await websocket.close(code=4000, reason="Connection failed")
        except:
            pass
    finally:
        manager.disconnect(websocket)


@router.get("/ws/status")
async def get_websocket_status():
    """Get current WebSocket connection status (for debugging)"""
    return {
        "status": "active",
        "connections": manager.get_connection_count(),
        "admin_connections": list(manager.get_admin_connections()),
        "assignment_connections": list(manager.get_assignment_connections())
    }

