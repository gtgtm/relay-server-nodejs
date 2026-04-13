# Alfred Camera Relay Server - Setup Guide

Complete step-by-step setup for production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Setup](#docker-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Running Migrations](#running-migrations)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 13 or higher
- **npm**: 8.x or higher
- **Git**: 2.x or higher

### Recommended Tools

- **Docker & Docker Compose** (for containerized setup)
- **PM2** (for production process management)
- **nginx** (for reverse proxy)
- **PostgreSQL Client** (`psql` for direct DB management)

## Local Development Setup

### Step 1: Clone and Install

```bash
# Clone or navigate to the relay server directory
cd relay-server-nodejs

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Key environment variables:**

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=alfred_relay_dev
DB_USER=alfred_user
DB_PASSWORD=dev_password

AUTH_TOKEN=alfred_baby_monitor_2026
JWT_SECRET=dev_secret_key
```

### Step 3: Create PostgreSQL Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE USER alfred_user WITH PASSWORD 'dev_password';
CREATE DATABASE alfred_relay_dev OWNER alfred_user;
GRANT ALL PRIVILEGES ON DATABASE alfred_relay_dev TO alfred_user;

# Exit psql
\q
```

### Step 4: Run Migrations

```bash
npm run migrate
```

Expected output:
```
Starting migrations...
Running migration: up
Migrations completed successfully
```

### Step 5: Seed Test Data (Optional)

```bash
npm run seed
```

This creates:
- Admin user: `admin@example.com` / `admin_password_change_me`
- Test user: `test@example.com` / `password123`
- Sample camera device

### Step 6: Start Development Server

```bash
npm run dev
```

Expected output:
```
Alfred Camera Relay Server running on 0.0.0.0:3000
Environment: development
Auth token configured: yes
```

### Step 7: Verify Installation

```bash
# In another terminal
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "cameras": 1,
  "node_version": "v18.x.x",
  "uptime": 3.45
}
```

## Docker Setup

### Quick Start with Docker Compose

```bash
# Start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f relay_server
```

### Database Setup in Docker

The PostgreSQL service automatically initializes on first run. If you need to manually migrate:

```bash
# Run migrations in the container
docker-compose exec relay_server npm run migrate

# Seed the database
docker-compose exec relay_server npm run seed
```

### Access the Server

After `docker-compose up`:
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Database**: localhost:5432 (postgres user: alfred_user)

### Troubleshooting Docker

```bash
# Rebuild images
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# View database connection
docker-compose exec postgres psql -U alfred_user -d alfred_relay

# View relay server logs
docker-compose logs relay_server --tail=100
```

## Database Configuration

### PostgreSQL Connection String

```
postgresql://alfred_user:password@localhost:5432/alfred_relay
```

### Database Tables

Created by migrations:

1. **users** - User accounts
2. **devices** - Camera/viewer devices
3. **streaming_sessions** - Active streams
4. **metrics** - Performance metrics
5. **activity_logs** - Audit trail

### Schema Inspection

```bash
# Connect to database
psql -U alfred_user -d alfred_relay

# List tables
\dt

# View table structure
\d devices

# Exit
\q
```

### Backup and Restore

```bash
# Backup database
pg_dump -U alfred_user -d alfred_relay > backup.sql

# Restore database
psql -U alfred_user -d alfred_relay < backup.sql
```

## Environment Variables

### Required Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database (must match your PostgreSQL setup)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alfred_relay
DB_USER=alfred_user
DB_PASSWORD=secure_password_here

# Auth Token (must match iOS app)
AUTH_TOKEN=alfred_baby_monitor_2026
```

### Optional Variables

```env
# JWT (for future authentication)
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h

# Streaming
MAX_FRAME_SIZE=2097152              # 2MB in bytes
MAX_AUDIO_CHUNK_SIZE=131072         # 128KB
AUDIO_BUFFER_SIZE=20                # Number of chunks to keep

# Device Management
CAMERA_TIMEOUT=120                  # Seconds before marking camera as stale

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000         # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info                      # debug, info, warn, error

# App
APP_URL=http://localhost:3000
```

### Security Notes

- **JWT_SECRET**: Change in production to a random string
- **DB_PASSWORD**: Use a strong, randomly generated password
- **AUTH_TOKEN**: Keep in sync between server and iOS app
- **Never commit .env**: Always use .env.example as template

## Running Migrations

### Automatic Migrations

Migrations run with `npm run migrate`:

```bash
npm run migrate
```

### Creating New Migrations

Create a new file in `src/migrations/NNN-description.js`:

```javascript
module.exports = {
  up: async (sequelize, Sequelize) => {
    await sequelize.query(`
      CREATE TABLE my_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL
      )
    `);
  },
  down: async (sequelize, Sequelize) => {
    await sequelize.query('DROP TABLE IF EXISTS my_table');
  },
};
```

Then update `src/migrations/runMigrations.js` to include it.

## Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm test -- --coverage
```

Coverage report: `coverage/lcov-report/index.html`

### Watch Mode (for development)

```bash
npm run test:watch
```

### Test File Structure

- `src/__tests__/health.test.js` - Health endpoint tests
- `src/__tests__/services.test.js` - StreamService tests

Add more test files following the pattern:
- `src/__tests__/routes.test.js` - Route integration tests
- `src/__tests__/models.test.js` - Model tests

### Coverage Targets

- **Lines**: 80%
- **Statements**: 80%
- **Functions**: 80%
- **Branches**: 80%

## Production Deployment

### Using Docker

```bash
# Build production image
docker build -t alfred-relay:latest .

# Run with environment variables
docker run -d \
  --name alfred-relay \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  -e JWT_SECRET=your-secret \
  -v /data/logs:/app/logs \
  alfred-relay:latest
```

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/index.js --name "alfred-relay" --env production

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs alfred-relay
```

### With nginx Reverse Proxy

```nginx
upstream alfred_relay {
    server localhost:3000;
    server localhost:3001;
}

server {
    listen 443 ssl http2;
    server_name relay.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;

    location / {
        proxy_pass http://alfred_relay;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Health Checks in Production

```bash
# Check server status
curl -X GET http://localhost:3000/api/health

# Expected response
{
  "status": "ok",
  "cameras": 5,
  "node_version": "v18.x.x",
  "uptime": 86400
}
```

### Monitoring

Monitor these metrics:

```bash
# View real-time metrics
pm2 monit

# Check error logs
tail -f logs/error.log

# Check combined logs
tail -f logs/combined.log
```

### Database Backup Strategy

```bash
# Daily backup
0 2 * * * pg_dump -U alfred_user -d alfred_relay | gzip > /backups/relay_$(date +\%Y\%m\%d).sql.gz

# Monthly archival
0 3 1 * * cp /backups/relay_$(date -d '1 day ago' +\%Y\%m\%d).sql.gz /archive/
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Test PostgreSQL connection
psql -h localhost -U alfred_user -d alfred_relay

# Check server can reach database
telnet localhost 5432
```

### Memory Leaks in Production

```bash
# Monitor with PM2
pm2 logs alfred-relay

# Check memory usage
ps aux | grep node

# Increase Node memory if needed
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Stale Processes

```bash
# Kill all node processes
pkill -f node

# Clean PM2
pm2 delete all
pm2 save
```

## Next Steps

1. ✅ Install and configure server
2. ✅ Set up database
3. ✅ Run migrations and tests
4. ✅ Verify API endpoints
5. 📱 Update iOS app with server URL and auth token
6. 🚀 Deploy to production
7. 📊 Set up monitoring and alerting
8. 🔄 Configure automated backups

## Support

For issues or questions:

1. Check logs: `tail -f logs/error.log`
2. Review API endpoint documentation
3. Verify iOS client configuration
4. Test with cURL or Postman
