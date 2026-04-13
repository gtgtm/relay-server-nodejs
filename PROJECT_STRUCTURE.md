# Project Structure

Complete directory and file organization for the Alfred Camera Relay Server (Node.js).

## Directory Tree

```
relay-server-nodejs/
├── src/
│   ├── __tests__/                    # Test suite
│   │   ├── health.test.js           # Health endpoint tests
│   │   └── services.test.js         # StreamService tests
│   │
│   ├── config/                       # Configuration modules
│   │   ├── database.js              # Sequelize database connection
│   │   ├── logger.js                # Winston logging setup
│   │   └── constants.js             # Application constants
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── authMiddleware.js        # Authentication & error handling
│   │   └── validationMiddleware.js  # Input validation with Joi
│   │
│   ├── models/                       # Sequelize ORM models
│   │   ├── User.js                  # User model with password hashing
│   │   ├── Device.js                # Camera/viewer device model
│   │   ├── StreamingSession.js      # Stream session tracking
│   │   ├── Metric.js                # Performance metrics
│   │   ├── ActivityLog.js           # Audit logging
│   │   └── index.js                 # Model associations
│   │
│   ├── services/                     # Business logic layer
│   │   └── StreamService.js         # Frame/audio buffer & streaming logic
│   │
│   ├── migrations/                   # Database migrations
│   │   ├── 001-create-users.js
│   │   ├── 002-create-devices.js
│   │   ├── 003-create-streaming-sessions.js
│   │   ├── 004-create-metrics.js
│   │   ├── 005-create-activity-logs.js
│   │   └── runMigrations.js         # Migration runner
│   │
│   ├── seeders/                      # Database seeders
│   │   └── seedDatabase.js          # Create test data
│   │
│   ├── routes/                       # Express route handlers
│   │   ├── health.js                # GET /api/health
│   │   └── relay.js                 # All relay endpoints
│   │
│   └── index.js                      # Main application entry point
│
├── data/                             # Runtime data (frames, audio)
│   ├── frames/                       # JPEG frame storage
│   └── audio/                        # Raw audio chunks
│
├── logs/                             # Application logs
│   ├── combined.log                 # All logs
│   └── error.log                    # Error-level logs only
│
├── .env.example                      # Environment variables template
├── .env                              # Production environment (not in git)
├── .gitignore                        # Git ignore rules
├── .dockerignore                     # Docker ignore rules
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc.json                  # Prettier code formatting
│
├── Dockerfile                        # Docker image definition
├── docker-compose.yml                # Docker Compose orchestration
│
├── package.json                      # NPM dependencies & scripts
├── jest.config.js                    # Jest test configuration
│
├── README.md                         # Quick start guide
├── SETUP.md                          # Detailed setup instructions
├── API.md                            # Complete API documentation
├── DEPLOYMENT.md                     # Production deployment guide
├── PROJECT_STRUCTURE.md              # This file
│
└── Alfred_Camera_API.postman_collection.json  # Postman API collection
```

## File Descriptions

### Core Application Files

#### `src/index.js`
Main Express application server. Sets up:
- Express app and HTTP server
- Middleware (CORS, body-parser, rate-limiting)
- Route registration
- Error handling
- Socket.IO (for future real-time features)
- Graceful shutdown handlers

**Key exports:** Express app instance

#### `src/config/database.js`
Sequelize ORM initialization with PostgreSQL connection pool and logging.

**Key exports:** Sequelize instance

#### `src/config/logger.js`
Winston logging setup with console (dev) and file (all) transports.

**Key exports:** Winston logger instance

#### `src/config/constants.js`
Application constants and configuration values from environment.

**Key exports:** Constants object with AUTH_TOKEN, MAX_FRAME_SIZE, etc.

### Models Layer

#### `src/models/index.js`
Central model registry with all associations defined.

**Models:**
- User (admin/user accounts)
- Device (camera/viewer devices)
- StreamingSession (active stream tracking)
- Metric (performance metrics)
- ActivityLog (audit trail)

### Services Layer

#### `src/services/StreamService.js`
Core streaming business logic:
- Frame buffer management (in-memory + disk)
- Audio ring buffer
- Device registration/deletion
- Frame pushing and retrieval
- Audio polling
- Stale camera cleanup

**Key methods:**
- `registerCamera(name)` - Generate camera ID
- `pushFrame(cameraId, data)` - Store frame
- `getFrame(cameraId)` - Retrieve latest frame
- `pushAudio(cameraId, data, type)` - Store audio chunk
- `getAudio(cameraId, sinceIndex, type)` - Retrieve audio chunks
- `cleanStaleCameras()` - Remove inactive cameras

### Routes Layer

#### `src/routes/health.js`
Health check endpoint. No authentication required.

#### `src/routes/relay.js`
All streaming endpoints:
- Camera registration & management
- Frame pushing and MJPEG streaming
- Audio pushing and polling
- Status updates
- Legacy endpoint compatibility

### Middleware

#### `src/middleware/authMiddleware.js`
- `authenticateLegacyToken()` - Check X-Auth-Token or token query param
- `errorHandler()` - Global error handler
- `requestLogger()` - Log all requests

#### `src/middleware/validationMiddleware.js`
- `validate()` - Middleware factory for Joi validation
- `schemas` - Pre-defined validation schemas

### Tests

#### `src/__tests__/health.test.js`
Tests for health check endpoint using supertest.

#### `src/__tests__/services.test.js`
Tests for StreamService frame/audio handling.

### Migrations & Seeders

#### `src/migrations/NNN-*.js`
Each file defines up/down migrations for database schema changes.

#### `src/seeders/seedDatabase.js`
Creates initial test data:
- Admin user
- Test user
- Sample camera device

## Dependencies

### Production (`package.json` dependencies)

**Framework & HTTP:**
- `express` - Web framework
- `cors` - CORS middleware
- `body-parser` - Request parsing
- `express-rate-limit` - Rate limiting
- `socket.io` - WebSocket library

**Database & ORM:**
- `sequelize` - ORM
- `pg` - PostgreSQL driver
- `pg-hstore` - JSONB support

**Security:**
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens (for future auth)

**Utilities:**
- `dotenv` - Environment variables
- `joi` - Input validation
- `uuid` - UUID generation
- `winston` - Logging

**Express Enhancements:**
- `express-async-errors` - Async error handling

### Development (`package.json` devDependencies)

**Testing:**
- `jest` - Test framework
- `supertest` - HTTP testing
- `babel-jest` - Jest integration

**Code Quality:**
- `eslint` - Linting
- `prettier` - Code formatting
- `nodemon` - Auto-restart on changes

**Build:**
- `@babel/core` - JavaScript compiler

## Configuration Files

### `.env.example`
Template for environment variables. Copy to `.env` and fill in:
- Database credentials
- Auth tokens
- Server URLs
- Log levels
- Rate limiting

### `Dockerfile`
Multi-stage Docker build:
1. Builder stage - Install dependencies
2. Runtime stage - Copy app and run

### `docker-compose.yml`
Services:
- PostgreSQL (port 5432)
- Relay Server (port 3000)

Volumes for data persistence.

### `jest.config.js`
Test configuration:
- Test environment: node
- Coverage thresholds: 80% on all metrics
- Test patterns and ignore paths

## Data Flow

### Frame Streaming
```
Camera Device
    ↓
POST /api/camera/:id/frame (JPEG)
    ↓
StreamService.pushFrame()
    ↓
In-Memory Buffer + Disk Storage
    ↓
GET /api/stream/:id (MJPEG)
    ↓
Viewer Device
```

### Audio Streaming
```
Camera Device
    ↓
POST /api/camera/:id/audio (binary)
    ↓
StreamService.pushAudio(type='cam')
    ↓
Ring Buffer (20 chunks)
    ↓
GET /api/stream/:id/audio?since=N
    ↓
Viewer Device polls every 150ms
```

## Database Schema

### Tables
- `users` - User accounts
- `devices` - Camera/viewer devices
- `streaming_sessions` - Stream tracking
- `metrics` - Performance data
- `activity_logs` - Audit trail

### Relationships
```
User (1) ──→ (Many) Device
Device (1) ──→ (Many) StreamingSession
Device (1) ──→ (Many) Metric
Device (1) ──→ (Many) ActivityLog
User (1) ──→ (Many) ActivityLog
```

## Key Files to Edit

### Configuration
- `.env` - Server & database config
- `src/config/constants.js` - Application constants
- `docker-compose.yml` - Docker services

### Business Logic
- `src/services/StreamService.js` - Streaming core logic
- `src/routes/relay.js` - API endpoints

### Database
- `src/models/*.js` - Data models
- `src/migrations/*.js` - Schema changes

### Monitoring
- `src/config/logger.js` - Logging setup
- `src/middleware/authMiddleware.js` - Error handling

## Running Commands

```bash
# Development
npm run dev              # Start with nodemon
npm run lint            # Check code quality
npm test                # Run tests
npm test:watch          # Watch mode

# Production
npm start                # Run production server
npm run migrate          # Database migrations
npm run seed            # Seed test data
npm run format          # Auto-format code

# Database
npm run db:reset        # Migrate + seed

# Docker
docker-compose up -d    # Start services
docker-compose logs -f  # View logs
docker-compose down     # Stop services
```

## Performance Optimization Opportunities

1. **Redis Caching** - Cache frame buffer in Redis
2. **Database Clustering** - PostgreSQL replication
3. **Load Balancing** - nginx or HAProxy
4. **Compression** - Enable gzip for non-binary endpoints
5. **CDN** - Cache static content
6. **WebSocket** - Real-time updates instead of polling
7. **Stream Optimization** - Adaptive bitrate streaming
8. **Database Indexing** - Add more indexes as needed

## Security Considerations

1. **Authentication** - API token (current) + JWT (future)
2. **Input Validation** - Joi schemas on all endpoints
3. **Rate Limiting** - 100 req/15min per IP
4. **SSL/TLS** - HTTPS in production
5. **CORS** - Configurable origin restriction
6. **Logging** - No sensitive data in logs
7. **Error Handling** - Generic messages in production
8. **Dependencies** - Regular npm audit and updates

## Testing Strategy

### Unit Tests
- Model validations
- Service methods
- Utility functions

### Integration Tests
- API endpoints
- Database operations
- Authentication

### E2E Tests (future)
- Full streaming flow
- Multiple concurrent streams
- Audio/video synchronization

## Deployment Checklist

```
✓ Code
- Tests passing
- No linting errors
- Code reviewed

✓ Infrastructure
- Server provisioned
- PostgreSQL running
- Reverse proxy configured

✓ Configuration
- .env set correctly
- Database migrated
- Logs configured

✓ Testing
- Health check passing
- All endpoints tested
- Load test completed

✓ Monitoring
- Logs being collected
- Metrics visible
- Alerts configured
```

## Future Enhancements

1. **JWT Authentication** - User login system
2. **WebSocket Real-time** - Active sessions, device status
3. **Metrics Dashboard** - Performance visualization
4. **Multi-region** - Distributed relay servers
5. **Mobile App** - Android companion app
6. **Cloud Deployment** - AWS/GCP/Azure
7. **API Rate Tiers** - Different limits per user
8. **Device Grouping** - Organize cameras by location
