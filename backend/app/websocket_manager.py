from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store connections by team type and user ID
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            "admin": {},
            "product": {},
            "lab": {},
            "account": {}
        }

    async def connect(self, websocket: WebSocket, team_type: str, user_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[team_type][user_id] = websocket
        logger.info(f"User {user_id} connected to {team_type} team WebSocket")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "message": f"Connected to {team_type} team updates",
            "team_type": team_type
        }, team_type, user_id)

    def disconnect(self, team_type: str, user_id: str):
        """Remove a WebSocket connection"""
        if team_type in self.active_connections and user_id in self.active_connections[team_type]:
            del self.active_connections[team_type][user_id]
            logger.info(f"User {user_id} disconnected from {team_type} team WebSocket")

    async def send_personal_message(self, message: dict, team_type: str, user_id: str):
        """Send message to a specific user"""
        if team_type in self.active_connections and user_id in self.active_connections[team_type]:
            try:
                websocket = self.active_connections[team_type][user_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                self.disconnect(team_type, user_id)

    async def send_team_broadcast(self, message: dict, team_type: str):
        """Send message to all users in a team"""
        if team_type in self.active_connections:
            disconnected_users = []
            for user_id, websocket in self.active_connections[team_type].items():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending team message to {user_id}: {e}")
                    disconnected_users.append(user_id)
            
            # Clean up disconnected users
            for user_id in disconnected_users:
                self.disconnect(team_type, user_id)

    async def send_global_broadcast(self, message: dict):
        """Send message to all connected users"""
        for team_type in self.active_connections:
            await self.send_team_broadcast(message, team_type)

    def get_connection_count(self) -> Dict[str, int]:
        """Get count of active connections per team"""
        return {
            team_type: len(connections) 
            for team_type, connections in self.active_connections.items()
        }

# Global connection manager instance
manager = ConnectionManager()