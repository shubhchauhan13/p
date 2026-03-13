import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/prices"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for events...")
            for i in range(5):
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Received event {i+1}: {data}")
            print("Successfully received 5 events. Stream is active.")
    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
