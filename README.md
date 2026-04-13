# Relay Server - Node.js

A real-time video streaming relay server for the Alfred Camera app. Streams video frames and audio between camera devices and viewers over the internet.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev

# Run production server
npm start

# Run tests
npm test
```

## Environment Variables

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/relay_db
JWT_SECRET=your-secret-key
RELAY_AUTH_TOKEN=your-relay-token
```

## Database Configuration (PostgreSQL)

### Local Setup

**1. Install PostgreSQL**
```bash
# macOS
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Verify installation
psql --version
```

**2. Create Database**
```bash
# Login to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE relay_db;
CREATE USER relay_user WITH PASSWORD 'relay_password';
ALTER ROLE relay_user SET client_encoding TO 'utf8';
ALTER ROLE relay_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE relay_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE relay_db TO relay_user;
\c relay_db
GRANT ALL PRIVILEGES ON SCHEMA public TO relay_user;
\q
```

**3. Set Environment Variables**
```bash
# .env file
DATABASE_URL=postgresql://relay_user:relay_password@localhost:5432/relay_db
```

**4. Run Migrations**
```bash
# Create tables
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Production Setup (Cloudflare + Supabase)

**1. Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create new project
- Copy the connection string from Project Settings → Database

**2. Get Connection String**
```
postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**3. Set Environment Variables in Cloudflare**
```bash
# In Cloudflare Workers → Settings → Variables
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**4. Deploy with Wrangler**
```bash
# Install wrangler
npm install -g @cloudflare/wrangler

# Create wrangler.toml
[env.production]
vars = { DATABASE_URL = "your-connection-string" }

# Deploy
wrangler deploy
```

### Alternative PostgreSQL Hosts

**Neon**
- Free tier available
- Get connection string from Neon dashboard
- Set `DATABASE_URL` environment variable

**Railway**
- Deploy PostgreSQL directly
- Copy connection string automatically

**Render**
- PostgreSQL as a service
- Easy integration with Cloudflare Workers

### Verify Connection

```bash
# Test database connection
npm run test:db

# Output should show:
# ✓ Connected to relay_db
# ✓ Tables created
```

### Database Tables

The server creates these tables automatically:

```sql
-- users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- devices table
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_id UUID UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(device_id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- frames table (auto-cleanup after 5 seconds)
CREATE TABLE frames (
  id SERIAL PRIMARY KEY,
  device_id UUID,
  frame_data BYTEA,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- audio_buffer table
CREATE TABLE audio_buffer (
  id SERIAL PRIMARY KEY,
  device_id UUID,
  audio_data BYTEA,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Connection Pooling

Default pool settings (in `src/config.ts`):
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

Adjust `max` based on Cloudflare Workers concurrency limits.

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Camera Operations
- `POST /api/camera/{id}/frame` - Upload video frame
- `POST /api/camera/{id}/audio` - Upload audio chunk
- `POST /api/camera/{id}/register` - Register camera device
- `POST /api/camera/{id}/heartbeat` - Send heartbeat

### Viewer Operations
- `GET /api/stream/{id}` - Stream video frames (MJPEG)
- `GET /api/audio/{id}` - Get audio buffer
- `GET /api/devices` - List available devices

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

## Architecture

```
Camera Device → Relay Server ← Viewer Device
  (upload)        (buffer)      (download)
   frames     →   store    →    stream
   audio      →   buffer   →    polling
```

## Key Features

- **JWT Authentication** - Secure API access with token-based auth
- **Frame Buffering** - Recent frames cached for new viewers
- **Audio Relay** - Real-time audio streaming via HTTP polling
- **Device Heartbeat** - 30-second keepalive for camera connections
- **Database Persistence** - MySQL for device/user metadata
- **CORS Enabled** - Support for cross-origin requests

## Directory Structure

```
src/
├── controllers/    - Route handlers
├── middleware/     - Auth, error handling
├── models/        - Database models
├── routes/        - API routes
├── services/      - Business logic
├── utils/         - Helper functions
└── config.ts      - Configuration
```

## Deployment

### Render.com (Recommended)
```bash
git push render main
```

### Docker
```bash
docker build -t relay-server .
docker run -p 3000:3000 --env-file .env relay-server
```

## Testing

```bash
npm test                  # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Performance

- **Frame rate:** ~30 FPS
- **Latency:** ~50-100ms (HTTP polling)
- **Concurrent viewers:** ~50 per instance
- **Frame buffer size:** Last 5 frames cached

## Future Improvements

- [ ] WebSocket support for lower latency
- [ ] Redis for multi-instance coordination
- [ ] Audio codec compression (Opus/AAC)
- [ ] Automatic reconnection logic
- [ ] Prometheus metrics integration

## License

MIT

## Support

For issues, check logs or contact support.
