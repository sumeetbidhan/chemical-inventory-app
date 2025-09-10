#!/usr/bin/env python3
"""
Test WebSocket connections to verify the server is working correctly
"""
import asyncio
import websockets
import json
import sys

async def test_websocket_connection():
    """Test WebSocket connection to the server"""
    
    # Test token (using a simple test token)
    test_token = "test_token_123"
    
    try:
        # Test connection to admin team
        uri = f"ws://localhost:8000/ws/team/admin?token={test_token}"
        print(f"🔌 Testing connection to: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connection established!")
            
            # Send a ping message
            ping_message = {
                "type": "ping",
                "timestamp": 1234567890
            }
            await websocket.send(json.dumps(ping_message))
            print("📤 Ping message sent")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                print(f"📨 Response received: {data}")
                
                if data.get("type") == "pong":
                    print("✅ Pong received - WebSocket is working!")
                else:
                    print(f"⚠️ Unexpected response type: {data.get('type')}")
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
                
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ Connection closed: {e}")
    except websockets.exceptions.InvalidURI as e:
        print(f"❌ Invalid URI: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing WebSocket Server...")
    asyncio.run(test_websocket_connection())
