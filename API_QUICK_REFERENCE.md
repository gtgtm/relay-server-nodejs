# Phase 1 API Quick Reference

## Base URL
```
http://localhost:3000/api
https://api.example.com/api (production)
```

## Authentication Header
```
Authorization: Bearer <jwt-token>
```

---

## Authentication Endpoints

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}

Response 201:
{
  "status": 201,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "role": "user" },
    "token": "eyJhbGc..."
  },
  "message": "Registration successful"
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response 200:
{
  "status": 200,
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGc..."
  },
  "message": "Login successful"
}
```

### 3. Get Current User
```http
GET /auth/me
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "id": "uuid", "email": "user@example.com", "role": "user" }
}
```

### 4. Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "token": "eyJhbGc..." },
  "message": "Token refreshed"
}
```

### 5. Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": null,
  "message": "Logout successful"
}
```

---

## Device Endpoints

### 1. Register Device
```http
POST /devices/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Living Room Camera",
  "role": "camera",
  "deviceType": "iOS"
}

Response 201:
{
  "status": 201,
  "data": {
    "deviceId": "uuid",
    "userId": "uuid",
    "name": "Living Room Camera",
    "role": "camera",
    "streamActive": false
  },
  "message": "Device registered successfully"
}
```

### 2. List Devices
```http
GET /devices?page=1&limit=10
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": [ { /* device objects */ } ],
  "pagination": { "total": 5, "page": 1, "limit": 10, "pages": 1 }
}
```

### 3. Get Device
```http
GET /devices/{deviceId}
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "deviceId": "uuid", "name": "Camera 1", "role": "camera", "streamActive": false }
}
```

### 4. Update Device
```http
PUT /devices/{deviceId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "streamActive": true
}

Response 200:
{
  "status": 200,
  "data": { /* updated device */ },
  "message": "Device updated successfully"
}
```

### 5. Device Heartbeat
```http
POST /devices/{deviceId}/heartbeat
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "lastHeartbeat": "2026-04-08T12:00:00Z" }
}
```

### 6. Delete Device
```http
DELETE /devices/{deviceId}
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": null,
  "message": "Device deleted successfully"
}
```

---

## Streaming Endpoints

### 1. Upload Frame
```http
POST /stream/{cameraId}/frame
Authorization: Bearer <token>
Content-Type: image/jpeg

[Binary JPEG data]

Response 200:
{
  "status": 200,
  "data": { "cameraId": "id", "frameSize": 65536 }
}
```

### 2. Get MJPEG Stream
```http
GET /stream/{cameraId}
Authorization: Bearer <token>

Response 200 (multipart/x-mixed-replace):
--alfred_relay_boundary
Content-Type: image/jpeg
Content-Length: 65536

[JPEG binary data]
--alfred_relay_boundary
...
```

### 3. Get Snapshot
```http
GET /stream/{cameraId}/snapshot
Authorization: Bearer <token>

Response 200:
[JPEG binary data]
```

### 4. Upload Audio
```http
POST /stream/{cameraId}/audio
Authorization: Bearer <token>
Content-Type: application/octet-stream

[Binary audio data]

Response 200:
{
  "status": 200,
  "data": { "cameraId": "id", "audioSize": 8192 }
}
```

### 5. Poll Audio
```http
GET /stream/{cameraId}/audio?since=-1
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "chunks": [ /* audio chunks */ ], "latestIndex": 5 }
}
```

### 6. Upload Talkback
```http
POST /stream/{cameraId}/talkback
Authorization: Bearer <token>
Content-Type: application/octet-stream

[Binary audio data]

Response 200:
{
  "status": 200,
  "data": { "cameraId": "id", "audioSize": 8192 }
}
```

### 7. Poll Talkback
```http
GET /stream/{cameraId}/talkback/poll?since=-1
Authorization: Bearer <token>

Response 200:
{
  "status": 200,
  "data": { "chunks": [ /* audio chunks */ ], "latestIndex": 3 }
}
```

---

## Admin Endpoints

### 1. Dashboard
```http
GET /admin/dashboard
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": {
    "stats": { "totalUsers": 42, "totalDevices": 156, "activeStreams": 12 },
    "recentActivity": [ /* logs */ ]
  }
}
```

### 2. List Users
```http
GET /admin/users?page=1&limit=10
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [ { "id": "uuid", "email": "user@example.com", "role": "user" } ],
  "pagination": { /* pagination */ }
}
```

### 3. List Devices
```http
GET /admin/devices?page=1&limit=10
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [ { /* device objects with user */ } ],
  "pagination": { /* pagination */ }
}
```

### 4. List Sessions
```http
GET /admin/sessions?page=1&limit=10
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [ { "id": "uuid", "status": "active", "frameCount": 150 } ],
  "pagination": { /* pagination */ }
}
```

### 5. List Logs
```http
GET /admin/logs?page=1&limit=10&action=login
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [ { "id": "uuid", "action": "login", "status": "success" } ],
  "pagination": { /* pagination */ }
}
```

### 6. List Alerts
```http
GET /admin/alerts
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [
    { "id": "inactive_users", "level": "info", "message": "5 users inactive" },
    { "id": "inactive_devices", "level": "warning", "message": "12 devices offline" }
  ]
}
```

### 7. Get User Devices
```http
GET /admin/user/{userId}/devices
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": [ { /* user's devices */ } ]
}
```

### 8. Disable User
```http
POST /admin/user/{userId}/disable
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": { /* updated user */ },
  "message": "User disabled"
}
```

### 9. Enable User
```http
POST /admin/user/{userId}/enable
Authorization: Bearer <admin-token>

Response 200:
{
  "status": 200,
  "data": { /* updated user */ },
  "message": "User enabled"
}
```

---

## HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (register, device register) |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Valid token but insufficient permissions (admin) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (email already registered) |
| 500 | Server Error | Unexpected server error |

---

## Error Handling

All errors follow format:
```json
{
  "status": 400,
  "error": "Error message",
  "message": "Error message",
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

**Common Errors:**

### Validation Error
```json
{
  "status": 400,
  "error": "\"password\" must be at least 8 characters long",
  "message": "\"password\" must be at least 8 characters long"
}
```

### Unauthorized (No Token)
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid JWT token"
}
```

### Unauthorized (Invalid Token)
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or malformed token"
}
```

### Forbidden (Not Admin)
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Admin privileges required"
}
```

### Not Found
```json
{
  "status": 404,
  "error": "Device not found",
  "message": "Device not found"
}
```

### Conflict (Duplicate)
```json
{
  "status": 409,
  "error": "Email already registered",
  "message": "Email already registered"
}
```

---

## Rate Limiting

Default: 100 requests per 15 minutes per IP

**Headers Returned:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

**When Limited (429 Too Many Requests):**
```json
{
  "status": 429,
  "error": "Too many requests from this IP, please try again later."
}
```

---

## CORS

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE

**Allowed Headers:**
- Content-Type
- Authorization

**Credentials:**
- Allowed: true

---

## Pagination

Used in list endpoints with `page` and `limit` query parameters.

**Defaults:**
- Page: 1
- Limit: 10
- Max limit: 100

**Response Format:**
```json
{
  "status": 200,
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

**Query Examples:**
```
GET /devices?page=2&limit=20
GET /admin/users?page=1&limit=50
GET /admin/logs?page=3&limit=25&action=login
```

---

## Backward Compatibility

### Legacy Token Authentication
Old iOS app can use: `X-Auth-Token` header

```http
GET /stream/cameraid123
X-Auth-Token: alfred_baby_monitor_2026

Response: Works (backward compatible)
```

### New JWT Authentication
New code should use: `Authorization: Bearer` header

```http
GET /stream/cameraid123
Authorization: Bearer eyJhbGc...

Response: Works (recommended)
```

Both methods work simultaneously during transition period.

---

## Example Workflows

### Complete User Flow
```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Save token from response
TOKEN="eyJhbGc..."

# 2. Register device
curl -X POST http://localhost:3000/api/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Camera 1","role":"camera"}'

# Save deviceId
DEVICE_ID="uuid"

# 3. Upload frame
curl -X POST http://localhost:3000/api/stream/$DEVICE_ID/frame \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/jpeg" \
  --data-binary @frame.jpg

# 4. Get stream
curl -X GET http://localhost:3000/api/stream/$DEVICE_ID \
  -H "Authorization: Bearer $TOKEN" > stream.mjpeg

# 5. Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Admin Dashboard Access
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepassword123"}'

# Save admin token
ADMIN_TOKEN="eyJhbGc..."

# Get dashboard
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List all users
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List all devices
curl -X GET "http://localhost:3000/api/admin/devices?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Support

For detailed documentation, see:
- `/PHASE1_SECURITY_IMPLEMENTATION.md` - Full endpoint documentation
- `/DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `/API.md` - Legacy API reference

---

**Last Updated:** 2026-04-08
**Version:** 1.0.0
**Status:** Production Ready ✅
