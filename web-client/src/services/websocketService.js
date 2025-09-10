import { WS_BASE } from '../config';

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  async connect(teamType, userId, token, onMessage, onError, onClose) {
    const connectionKey = `${teamType}-${userId}`;

    // Close existing connection if any
    if (this.connections.has(connectionKey)) {
      this.disconnect(teamType, userId);
    }

    // Check if token is expired and warn user
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (tokenPayload.exp && tokenPayload.exp < now) {
        console.warn('⚠️ Token is expired, WebSocket connection will fail. Please refresh the page to get a new token.');
        if (onError) {
          onError(new Error('Token expired. Please refresh the page.'));
        }
        return;
      }
    } catch (e) {
      console.warn('⚠️ Could not parse token for expiration check');
    }

    const wsUrl = `${WS_BASE}/ws/team/${teamType}?token=${encodeURIComponent(token)}`;
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`✅ WebSocket connected for ${teamType} team`);
        this.reconnectAttempts.set(connectionKey, 0);
        
        // Send initial ping
        this.sendMessage(teamType, userId, {
          type: 'ping',
          timestamp: Date.now()
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📨 WebSocket message received:`, data);
          
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${teamType} team:`, error);
        if (onError) {
          onError(error);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed for ${teamType} team:`, event.code, event.reason);
        
        if (onClose) {
          onClose(event);
        }

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          this.attemptReconnect(teamType, userId, token, onMessage, onError, onClose);
        }
      };

      this.connections.set(connectionKey, ws);
      
    } catch (error) {
      console.error(`❌ Error creating WebSocket connection:`, error);
      if (onError) {
        onError(error);
      }
    }
  }

  attemptReconnect(teamType, userId, token, onMessage, onError, onClose) {
    const connectionKey = `${teamType}-${userId}`;
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.log(`❌ Max reconnection attempts reached for ${teamType} team`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnectAttempts.set(connectionKey, attempts + 1);
      this.connect(teamType, userId, token, onMessage, onError, onClose);
    }, delay);
  }

  sendMessage(teamType, userId, message) {
    const connectionKey = `${teamType}-${userId}`;
    const ws = this.connections.get(connectionKey);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        console.log(`📤 WebSocket message sent:`, message);
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
      }
    } else {
      console.warn(`⚠️ WebSocket not connected for ${teamType} team`);
    }
  }

  disconnect(teamType, userId) {
    const connectionKey = `${teamType}-${userId}`;
    const ws = this.connections.get(connectionKey);
    
    if (ws) {
      ws.close(1000, 'Client disconnecting');
      this.connections.delete(connectionKey);
      this.reconnectAttempts.delete(connectionKey);
      console.log(`🔌 WebSocket disconnected for ${teamType} team`);
    }
  }

  disconnectAll() {
    for (const [connectionKey, ws] of this.connections) {
      ws.close(1000, 'Client disconnecting all');
    }
    this.connections.clear();
    this.reconnectAttempts.clear();
    console.log('🔌 All WebSocket connections closed');
  }

  isConnected(teamType, userId) {
    const connectionKey = `${teamType}-${userId}`;
    const ws = this.connections.get(connectionKey);
    return ws && ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(teamType, userId) {
    const connectionKey = `${teamType}-${userId}`;
    const ws = this.connections.get(connectionKey);
    
    if (!ws) {
      return 'disconnected';
    }
    
    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Utility methods for common message types
  sendPing(teamType, userId) {
    this.sendMessage(teamType, userId, {
      type: 'ping',
      timestamp: Date.now()
    });
  }

  sendAssignmentUpdate(teamType, userId, assignmentId, status) {
    this.sendMessage(teamType, userId, {
      type: 'assignment_update',
      assignment_id: assignmentId,
      status: status
    });
  }

  sendComponentCompleted(teamType, userId, assignmentId, componentId) {
    this.sendMessage(teamType, userId, {
      type: 'component_completed',
      assignment_id: assignmentId,
      component_id: componentId
    });
  }

  sendHelpRequest(teamType, userId, message) {
    this.sendMessage(teamType, userId, {
      type: 'request_help',
      message: message
    });
  }
}

// Export singleton instance
export default new WebSocketService();
