# Alfred Camera Relay Server - API Documentation

Complete API reference for the relay server. All endpoints require authentication via the `X-Auth-Token` header or `token` query parameter.

## Authentication

### Token Authentication

All endpoints (except `/api/health`) require authentication:

```bash
# Via Header
curl -H "X-Auth-Token: alfred_baby_monitor_2026" http://localhost:3000/api/health

# Via Query Parameter
curl http://localhost:3000/api/health?token=alfred_baby_monitor_2026
```

## Health & Status

### GET /api/health

Health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "cameras": 5,
  "node_version": "v18.17.0",
  "uptime": 3600.5
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

## Camera Management

### POST /api/camera/register

Register a new camera device.

**Request:**
```bash
curl -X POST http://localhost:3000/api/camera/register \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bedroom Camera"
  }'
```

**Request Body:**
```json
{
  "name": "Bedroom Camera"  // Optional, defaults to "Baby Camera"
}
```

**Response:**
```json
{
  "cameraId": "a1b2c3d4"
}
```

**Status Codes:**
- `200 OK` - Camera registered successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

### GET /api/cameras

List all registered cameras.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/cameras?token=alfred_baby_monitor_2026" \
  -H "X-Auth-Token: alfred_baby_monitor_2026"
```

**Response:**
```json
{
  "cameras": [
    {
      "cameraId": "a1b2c3d4",
      "name": "Bedroom Camera",
      "streamActive": true,
      "lastSeen": 1704067200
    },
    {
      "cameraId": "b2c3d4e5",
      "name": "Living Room Camera",
      "streamActive": false,
      "lastSeen": 1704066900
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Cameras retrieved successfully
- `401 Unauthorized` - Missing or invalid token

---

### DELETE /api/camera/:cameraId

Delete/unregister a camera device.

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/camera/a1b2c3d4 \
  -H "X-Auth-Token: alfred_baby_monitor_2026"
```

**Response:**
```json
{
  "status": "removed"
}
```

**Status Codes:**
- `200 OK` - Camera deleted successfully
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

## Video Streaming

### POST /api/camera/:cameraId/frame

Push a video frame from the camera device.

**Request:**
```bash
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/frame \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: image/jpeg" \
  --data-binary @frame.jpg
```

**Request Body:**
Raw JPEG image data (binary).

**Constraints:**
- Maximum size: 2MB (configurable via `MAX_FRAME_SIZE`)
- Content-Type: `image/jpeg`

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- `200 OK` - Frame accepted
- `400 Bad Request` - Invalid frame or exceeds size limit
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

### GET /api/stream/:cameraId

MJPEG stream endpoint for viewers. Returns a continuous stream of JPEG frames.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/stream/a1b2c3d4?token=alfred_baby_monitor_2026" \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -o stream.mjpeg
```

**Response:**
Multipart MIME stream with boundary `alfred_relay_boundary`. Each part contains:
```
--alfred_relay_boundary
Content-Type: image/jpeg
Content-Length: 12345

<JPEG binary data>

```

**Headers:**
- `Content-Type: multipart/x-mixed-replace; boundary=alfred_relay_boundary`
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Connection: keep-alive`

**Status Codes:**
- `200 OK` - Stream started
- `404 Not Found` - Camera not found or not streaming
- `401 Unauthorized` - Missing or invalid token

**Notes:**
- Stream continues until client disconnects
- New frames sent at ~10 FPS (100ms poll interval)
- Server checks camera status every 3 seconds
- Stream automatically ends if camera stops

---

### GET /api/snapshot/:cameraId

Get a single frame snapshot from the camera.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/snapshot/a1b2c3d4?token=alfred_baby_monitor_2026" \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -o snapshot.jpg
```

**Response:**
Raw JPEG image data (binary).

**Headers:**
- `Content-Type: image/jpeg`
- `Cache-Control: no-cache`

**Status Codes:**
- `200 OK` - Snapshot retrieved
- `404 Not Found` - No frame available
- `401 Unauthorized` - Missing or invalid token

---

### POST /api/camera/:cameraId/status

Update camera streaming status.

**Request:**
```bash
# Start streaming
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/status \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/json" \
  -d '{ "streaming": true }'

# Stop streaming
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/status \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/json" \
  -d '{ "streaming": false }'

# Get current status
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/status \
  -H "X-Auth-Token: alfred_baby_monitor_2026"
```

**Request Body:**
```json
{
  "streaming": true  // Optional: true=start, false=stop, omit=get status
}
```

**Response (Start):**
```json
{
  "status": "streaming"
}
```

**Response (Stop):**
```json
{
  "status": "stopped"
}
```

**Response (Get Status):**
```json
{
  "status": "streaming",
  "lastSeen": 1704067200
}
```

**Status Codes:**
- `200 OK` - Status updated or retrieved
- `404 Not Found` - Camera not found
- `401 Unauthorized` - Missing or invalid token

---

## Audio Streaming

### POST /api/camera/:cameraId/audio

Push audio from camera to viewers.

**Request:**
```bash
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/audio \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio_chunk.raw
```

**Request Body:**
Raw audio data (binary). Typically PCM-encoded audio.

**Constraints:**
- Maximum size: 128KB (configurable via `MAX_AUDIO_CHUNK_SIZE`)
- Content-Type: `application/octet-stream`

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- `200 OK` - Audio accepted
- `400 Bad Request` - Empty or invalid audio
- `401 Unauthorized` - Missing or invalid token

---

### GET /api/stream/:cameraId/audio

Poll for audio chunks from camera (baby sounds).

**Request:**
```bash
# First poll (get latest)
curl -X GET "http://localhost:3000/api/stream/a1b2c3d4/audio?token=alfred_baby_monitor_2026&since=-1"

# Subsequent polls (get new chunks since index 5)
curl -X GET "http://localhost:3000/api/stream/a1b2c3d4/audio?token=alfred_baby_monitor_2026&since=5"
```

**Query Parameters:**
- `since` (optional): Last received index, defaults to `-1`

**Response (New Audio):**
```json
{
  "index": 6,
  "audio": "AQIDBAUG...base64_encoded_audio_data...=="
}
```

**Response (No New Audio):**
```json
{
  "index": 6,
  "audio": null
}
```

**Status Codes:**
- `200 OK` - Poll successful
- `401 Unauthorized` - Missing or invalid token

**Notes:**
- Audio is base64-encoded in response
- Ring buffer keeps last N chunks (default 20)
- Poll interval recommended: 150ms
- Index increments with each new chunk

---

### POST /api/camera/:cameraId/talkback

Push talkback audio from viewer to camera.

**Request:**
```bash
curl -X POST http://localhost:3000/api/camera/a1b2c3d4/talkback \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @talkback_audio.raw
```

**Request Body:**
Raw audio data (binary). Typically PCM-encoded audio.

**Constraints:**
- Maximum size: 128KB
- Content-Type: `application/octet-stream`

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- `200 OK` - Talkback audio accepted
- `400 Bad Request` - Empty or invalid audio
- `401 Unauthorized` - Missing or invalid token

---

### GET /api/camera/:cameraId/talkback/poll

Poll for talkback audio chunks (viewer audio to camera).

**Request:**
```bash
# First poll
curl -X GET "http://localhost:3000/api/camera/a1b2c3d4/talkback/poll?token=alfred_baby_monitor_2026&since=-1"

# Subsequent polls
curl -X GET "http://localhost:3000/api/camera/a1b2c3d4/talkback/poll?token=alfred_baby_monitor_2026&since=3"
```

**Query Parameters:**
- `since` (optional): Last received index, defaults to `-1`

**Response (New Audio):**
```json
{
  "index": 4,
  "audio": "AQIDBAUG...base64_encoded_audio_data...=="
}
```

**Response (No New Audio):**
```json
{
  "index": 4,
  "audio": null
}
```

**Status Codes:**
- `200 OK` - Poll successful
- `401 Unauthorized` - Missing or invalid token

**Notes:**
- Same ring buffer mechanism as camera audio
- Audio is base64-encoded in response
- Poll interval recommended: 150ms
- Used by camera to receive viewer's voice

---

## Legacy Endpoints

### POST /api/camera/:cameraId/start

Legacy heartbeat endpoint (for iOS compatibility).

**Response:**
```json
{
  "status": "streaming"
}
```

---

### POST /api/camera/:cameraId/stop

Legacy stop endpoint (for iOS compatibility).

**Response:**
```json
{
  "status": "stopped"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Common Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Invalid frame | Frame data is malformed or empty |
| 400 | Frame exceeds max size | Frame larger than 2MB |
| 401 | Unauthorized | Missing or invalid auth token |
| 404 | Camera not found | Camera ID doesn't exist |
| 404 | Camera not streaming | Camera exists but isn't streaming |
| 404 | No frame available | No frames received yet |
| 500 | Internal server error | Server-side error |

---

## Rate Limiting

All endpoints are rate-limited:
- **Window**: 15 minutes
- **Limit**: 100 requests per window
- **Response**: 429 Too Many Requests

---

## Performance Notes

### Frame Streaming
- Polling interval: 100ms (~10 FPS)
- Maximum frame size: 2MB
- Recommended compression: JPEG at 40% quality

### Audio Streaming
- Buffer size: 20 chunks (configurable)
- Maximum chunk size: 128KB
- Polling interval: 150ms
- Format: Base64-encoded binary

### Bandwidth Estimates
- Video: ~500KB-2MB per second (depending on compression)
- Audio: ~20-40KB per second (16-bit PCM @ 16kHz)
- Total: ~600KB-2.5MB per second per stream

---

## Testing API Endpoints

### Using cURL

```bash
# Test health
curl http://localhost:3000/api/health

# Register camera
curl -X POST http://localhost:3000/api/camera/register \
  -H "X-Auth-Token: alfred_baby_monitor_2026" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Camera"}'

# List cameras
curl "http://localhost:3000/api/cameras?token=alfred_baby_monitor_2026"
```

### Using Postman

Import the included `Alfred_Camera_API.postman_collection.json` file:

1. Open Postman
2. Click "Import"
3. Select the collection file
4. Set environment variables:
   - `base_url`: http://localhost:3000
   - `token`: alfred_baby_monitor_2026
5. Run requests

### Using Python

```python
import requests

BASE_URL = "http://localhost:3000"
TOKEN = "alfred_baby_monitor_2026"

headers = {"X-Auth-Token": TOKEN}

# Health check
response = requests.get(f"{BASE_URL}/api/health")
print(response.json())

# Register camera
payload = {"name": "Test Camera"}
response = requests.post(
    f"{BASE_URL}/api/camera/register",
    json=payload,
    headers=headers
)
print(response.json())
```

---

## iOS Client Integration

The iOS app (`RelayServerManager`) expects:

1. **Base URL**: Configurable in app settings
2. **Auth Token**: Sent as `X-Auth-Token` header
3. **Frame Format**: Raw JPEG data
4. **Audio Format**: Raw PCM data, base64-encoded in responses
5. **MJPEG Stream**: Standard multipart stream

Example iOS usage:

```swift
let relayManager = RelayServerManager.shared
relayManager.serverURL = "https://your-relay-server.com"
relayManager.authToken = "alfred_baby_monitor_2026"

// Register camera
relayManager.registerCamera(name: "Bedroom") { result in
    switch result {
    case .success(let cameraId):
        print("Camera registered: \(cameraId)")
    case .failure(let error):
        print("Error: \(error)")
    }
}

// Start streaming
relayManager.startRelayStream()

// Push frames (from camera preview)
let frameImage = UIImage(...)
relayManager.didCapturePreviewFrame(frameImage)
```
