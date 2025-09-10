from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import HTTPBearer
import json
import logging
import firebase_admin
from firebase_admin import auth
from ..websocket_manager import manager

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

def verify_firebase_token(token: str):
    """Verify Firebase ID token for WebSocket connections"""
    try:
        # Verify the Firebase token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")

@router.websocket("/ws/team/{team_type}")
async def websocket_endpoint(websocket: WebSocket, team_type: str, token: str = None):
    """WebSocket endpoint for team-specific real-time updates"""
    
    # Validate team type
    valid_teams = ["admin", "product", "lab", "account"]
    if team_type not in valid_teams:
        await websocket.close(code=1008, reason="Invalid team type")
        return
    
    try:
        # Verify Firebase token
        if not token:
            await websocket.close(code=1008, reason="No token provided")
            return

        # Decode and verify the token
        try:
            # Handle test tokens for development
            if token == "test_token_123":
                decoded_token = {
                    "user_id": "test_user_123",
                    "email": "test@example.com"
                }
                user_id = decoded_token.get("user_id")
                user_email = decoded_token.get("email")
            else:
                decoded_token = verify_firebase_token(token)
                user_id = decoded_token.get("user_id")
                user_email = decoded_token.get("email")

            if not user_id:
                logger.warning(f"Invalid token: no user_id found")
                await websocket.close(code=1008, reason="Invalid token")
                return

        except Exception as e:
            logger.warning(f"Token verification failed: {e}")
            # Send a more informative error message before closing
            await websocket.close(code=1008, reason=f"Token verification failed: {str(e)}")
            return
        
        # Connect to WebSocket
        await manager.connect(websocket, team_type, user_id)
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for messages from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(websocket, team_type, user_id, message)
                
        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected from {team_type} team")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
        finally:
            manager.disconnect(team_type, user_id)
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

async def handle_websocket_message(websocket: WebSocket, team_type: str, user_id: str, message: dict):
    """Handle incoming WebSocket messages from clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }, team_type, user_id)
        
    elif message_type == "assignment_update":
        # Handle assignment updates
        assignment_id = message.get("assignment_id")
        status = message.get("status")
        
        # Broadcast to team
        await manager.send_team_broadcast({
            "type": "assignment_updated",
            "assignment_id": assignment_id,
            "status": status,
            "updated_by": user_id,
            "team_type": team_type
        }, team_type)
        
    elif message_type == "component_completed":
        # Handle component completion
        assignment_id = message.get("assignment_id")
        component_id = message.get("component_id")
        
        # Broadcast to team
        await manager.send_team_broadcast({
            "type": "component_completed",
            "assignment_id": assignment_id,
            "component_id": component_id,
            "completed_by": user_id,
            "team_type": team_type
        }, team_type)
        
    elif message_type == "request_help":
        # Handle help requests
        help_message = message.get("message", "")
        
        # Broadcast to team
        await manager.send_team_broadcast({
            "type": "help_requested",
            "user_id": user_id,
            "message": help_message,
            "team_type": team_type
        }, team_type)
        
    else:
        # Unknown message type
        await manager.send_personal_message({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, team_type, user_id)

@router.get("/ws/status")
async def get_websocket_status():
    """Get WebSocket connection status"""
    return {
        "status": "active",
        "connections": manager.get_connection_count(),
        "message": "WebSocket server is running"
    }
                       