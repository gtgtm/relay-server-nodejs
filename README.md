# Alfred Camera Relay Server (Node.js)

Production-ready Node.js relay server for Alfred Camera streaming with PostgreSQL backend, WebSocket support, and 100% API compatibility with the iOS client.

## Features

- **MJPEG Streaming**: Real-time video streaming from camera to viewer via HTTP
- **Audio Relay**: Bidirectional audio (camera → viewer and talkback)
- **Device Management**: Register, list, and manage camera/viewer devices
- **Frame/Audio Buffering**: In-memory ring buffer for efficient streaming
- **Activity Logging**: Track all operations for audit and debugging
- **Metrics Collection**: Performance monitoring and analytics
- **WebSocket Ready**: Socket.IO setup for real-time updates
- **PostgreSQL Backend**: Persistent storage with Sequelize ORM
- **Docker Support**: Production-ready Docker and docker-compose setup
- **100% iOS Compatible**: Backward compatible with existing RelayServerManager

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Configure database connection in .env
# Edit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed

# Start development server
npm run dev
```

The server will start on `http://localhost:3000`

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f relay_server

# Run migrations in container
docker-compose exec relay_server npm run migrate

# Seed database
docker-compose exec relay_server npm run seed
```

## API Endpoints

### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "cameras": 5,
  "node_version": "v18.x.x",
  "uptime": 3600
}
```

### Camera Registration

```
POST /api/camera/register
Header: X-Auth-Token: alfred_baby_monitor_2026
Body: { "name": "Bedroom Camera" }
```

Response:
```json
{
  "cameraId": "a1b2c3d4"
}
```

### List Cameras

```
GET /api/cameras?token=alfred_baby_monitor_2026
Header: X-Auth-Token: alfred_baby_monitor_2026
```

Response:
```json
{
  "cameras": [
    {
      "cameraId": "a1b2c3d4",
      "name": "Bedroom Camera",
      "streamActive": true,
      "lastSeen": 1704067200
    }
  ]
}
```

### Stream Status

```
POST /api/camera/:cameraId/status
Header: X-Auth-Token: alfred_baby_monitor_2026
Body: { "streaming": true }
```

### Push Frame

```
POST /api/camera/:cameraId/frame
Header: X-Auth-Token: alfred_baby_monitor_2026
Header: Content-Type: image/jpeg
Body: (raw JPEG data)
```

### MJPEG Stream

```
GET /api/stream/:cameraId?token=alfred_baby_monitor_2026
```

Returns multipart/x-mixed-replace stream of JPEG frames.

### Push Audio

```
POST /api/camera/:cameraId/audio
Header: X-Auth-Token: alfred_baby_monitor_2026
Header: Content-Type: application/octet-stream
Body: (raw audio data)
```

### Poll Audio

```
GET /api/stream/:cameraId/audio?token=alfred_baby_monitor_2026&since=-1
```

Response:
```json
{
  "index": 5,
  "audio": "base64_encoded_audio_data"
}
```

### Talkback Audio

```
POST /api/camera/:cameraId/talkback
Header: X-Auth-Token: alfred_baby_monitor_2026
Body: (raw audio data)

GET /api/camera/:cameraId/talkback/poll?token=alfred_baby_monitor_2026&since=-1
```

### Delete Camera

```
DELETE /api/camera/:cameraId
Header: X-Auth-Token: alfred_baby_monitor_2026
```

## Configuration

Environment variables in `.env`:

```
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alfred_relay
DB_USER=alfred_user
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
AUTH_TOKEN=alfred_baby_monitor_2026

# Streaming
MAX_FRAME_SIZE=2097152
MAX_AUDIO_CHUNK_SIZE=131072
AUDIO_BUFFER_SIZE=20
CAMERA_TIMEOUT=120

# Logging
LOG_LEVEL=info
```

## Database Schema

### Users
- `id` (UUID)
- `email` (VARCHAR, unique)
- `password` (hashed)
- `name` (VARCHAR)
- `role` (enum: admin, user)
- `isActive` (BOOLEAN)
- `lastLoginAt` (TIMESTAMP)

### Devices
- `id` (UUID)
- `cameraId` (VARCHAR, legacy 8-char hex)
- `userId` (UUID, foreign key)
- `name` (VARCHAR)
- `role` (enum: camera, viewer)
- `isActive` (BOOLEAN)
- `streamActive` (BOOLEAN)
- `lastSeenAt` (TIMESTAMP)
- `ipAddress` (VARCHAR)
- `userAgent` (TEXT)
- `metadata` (JSONB)

### StreamingSessions
- `id` (UUID)
- `cameraDeviceId` (UUID, foreign key)
- `viewerDeviceId` (UUID, foreign key)
- `status` (enum: active, stopped, error)
- `frameCount` (INTEGER)
- `audioChunksCount` (INTEGER)
- `totalBytesTransferred` (BIGINT)

### Metrics
- `id` (UUID)
- `deviceId` (UUID, foreign key)
- `metricType` (VARCHAR)
- `value` (FLOAT)
- `unit` (VARCHAR)
- `timestamp` (TIMESTAMP)

### ActivityLogs
- `id` (UUID)
- `userId` (UUID, foreign key)
- `deviceId` (UUID, foreign key)
- `action` (VARCHAR)
- `status` (enum: success, failure, warning)
- `ipAddress` (VARCHAR)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

Target: **80%+ code coverage**

## Logging

Logs are written to:
- Console (development only)
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs

## Performance Considerations

### Frame Streaming
- 10 FPS polling interval (100ms)
- In-memory frame buffer per camera
- Disk backup for persistence
- 2MB maximum frame size

### Audio Buffering
- Ring buffer with configurable size (default 20 chunks)
- Separate buffers for camera → viewer and talkback
- Base64 encoding for JSON transport
- Automatic cleanup on stale cameras

### Database Indexes
- `users(email)` for quick lookups
- `devices(user_id, camera_id, role)` for filtering
- `streaming_sessions(camera_device_id, status)` for active session tracking
- `metrics(device_id, timestamp)` for analytics

## Deployment

### Using Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

### Manual Deployment

```bash
# Install dependencies
npm ci --production

# Run migrations
npm run migrate

# Start with process manager (PM2 recommended)
npm install -g pm2
pm2 start src/index.js --name "alfred-relay"
```

### Environment Recommendations

**Production:**
- Set `NODE_ENV=production`
- Change `JWT_SECRET` and `AUTH_TOKEN`
- Use strong database password
- Enable HTTPS in reverse proxy (nginx/HAProxy)
- Set up proper monitoring and alerting

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U alfred_user -d alfred_relay
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Frame Not Showing

1. Verify camera is registered: `GET /api/cameras`
2. Check frame is being pushed: Monitor logs for "Frame pushed"
3. Verify camera streaming status: `POST /api/camera/:cameraId/status`

## iOS Client Configuration

Update `RelayServerManager.swift`:

```swift
var serverURL = "https://your-relay-server.com"
var authToken = "alfred_baby_monitor_2026"
```

## Contributing

1. Create feature branch
2. Follow coding standards (ESLint, Prettier)
3. Write tests (80%+ coverage)
4. Submit PR with test results

## License

MIT
