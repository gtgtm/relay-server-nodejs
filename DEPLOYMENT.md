# Relay Server Deployment & Migration Guide

Complete guide for migrating from PHP relay server to Node.js relay server.

## Overview

This Node.js relay server is a **drop-in replacement** for the PHP relay server with:
- ✅ 100% API compatibility with existing iOS client
- ✅ PostgreSQL backend for persistence
- ✅ WebSocket support (ready for real-time features)
- ✅ Better performance and scalability
- ✅ Comprehensive logging and monitoring
- ✅ Production-ready Docker setup

## Migration Path

### Phase 1: Parallel Deployment (No Downtime)

1. Deploy Node.js server on separate port (3001)
2. Test with sample devices
3. Gradually route traffic to Node.js server
4. Monitor performance and logs

### Phase 2: Cutover

1. Update iOS app server URL to point to Node.js server
2. Monitor for any issues
3. Keep PHP server as backup (can be deactivated later)

### Phase 3: Cleanup

1. Archive PHP server
2. Decommission PHP server after 30 days
3. Full Node.js production mode

## Pre-Deployment Checklist

### Infrastructure
- [ ] PostgreSQL 13+ installed and running
- [ ] Node.js 18+ installed
- [ ] Sufficient disk space for logs and data
- [ ] Firewall rules configured for ports 3000 (or custom)
- [ ] SSL/TLS certificate ready (if using HTTPS)
- [ ] Backup of existing PHP data completed

### Configuration
- [ ] .env file created with production values
- [ ] Database credentials verified
- [ ] AUTH_TOKEN matches iOS app
- [ ] JWT_SECRET set to random value
- [ ] CORS_ORIGIN configured correctly
- [ ] LOG_LEVEL set to 'info'

### Testing
- [ ] All unit tests passing (npm test)
- [ ] Integration tests verified
- [ ] Manual API testing with cURL
- [ ] Load testing completed
- [ ] Database backup/restore tested

### Documentation
- [ ] Team notified of migration
- [ ] Runbook created for operations
- [ ] Monitoring dashboard configured
- [ ] Escalation procedures documented

## Installation Steps

### 1. Prepare System

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib

# Verify installations
node --version    # Should be v18+
npm --version     # Should be 8+
psql --version    # Should be 13+
```

### 2. Setup Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

//psql postgres

# Create database user
CREATE USER alfred_relay_user WITH PASSWORD 'strong_password_here';

# Create database
CREATE DATABASE alfred_relay OWNER alfred_relay_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE alfred_relay TO alfred_relay_user;

# Exit psql
\q
```

### 3. Clone and Install

```bash
# Create app directory
sudo mkdir -p /opt/alfred-relay
sudo chown $USER:$USER /opt/alfred-relay

# Copy relay server files
cp -r relay-server-nodejs/* /opt/alfred-relay/

cd /opt/alfred-relay

# Install dependencies
npm ci --production
```

### 4. Configure Environment

```bash
# Create production .env
cp .env.example .env
nano .env
```

**Production values:**

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=alfred_relay
DB_USER=alfred_relay_user
DB_PASSWORD=strong_password_here

JWT_SECRET=generate_random_string_here
AUTH_TOKEN=alfred_baby_monitor_2026
CORS_ORIGIN=https://your-domain.com

LOG_LEVEL=info
APP_URL=https://your-relay-server.com
```

### 5. Run Migrations

```bash
# Create database schema
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 6. Test Locally

```bash
# Start dev server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:3000/api/health

# Expected response
# {"status":"ok","cameras":0,"node_version":"v18.x.x","uptime":2.3}
```

## Production Deployment Options

### Option A: Docker Compose (Recommended)

```bash
# Navigate to project directory
cd /opt/alfred-relay

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f relay_server

# Run migrations
docker-compose exec relay_server npm run migrate
```

### Option B: PM2 (Standalone)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/index.js --name "alfred-relay" \
  --env production \
  --max-memory-restart 500M \
  --error /var/log/alfred-relay/error.log \
  --out /var/log/alfred-relay/output.log

# Setup auto-startup
pm2 startup
pm2 save

# Monitor
pm2 logs alfred-relay
pm2 monit
```

### Option C: systemd Service

Create `/etc/systemd/system/alfred-relay.service`:

```ini
[Unit]
Description=Alfred Camera Relay Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/alfred-relay
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/alfred-relay/src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alfred-relay
sudo systemctl start alfred-relay
sudo systemctl status alfred-relay
```

## Reverse Proxy Setup

### nginx Configuration

Create `/etc/nginx/sites-available/alfred-relay`:

```nginx
upstream alfred_relay {
    server localhost:3000;
}

server {
    listen 80;
    server_name relay.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name relay.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/alfred-relay-access.log;
    error_log /var/log/nginx/alfred-relay-error.log;

    # Proxy configuration
    location / {
        proxy_pass http://alfred_relay;
        proxy_http_version 1.1;

        # Headers for WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering for MJPEG
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/alfred-relay \
  /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

## Verification Checklist

### Network
- [ ] Server accessible via public URL
- [ ] HTTPS working (if applicable)
- [ ] Health check returns 200: `curl https://relay.yourdomain.com/api/health`
- [ ] Rate limiting working

### Database
- [ ] PostgreSQL running and accessible
- [ ] Database schema created
- [ ] Tables visible in psql
- [ ] Can connect from app server

### Functionality
- [ ] Can register camera: `POST /api/camera/register`
- [ ] Can list cameras: `GET /api/cameras`
- [ ] Can push frames: `POST /api/camera/:id/frame`
- [ ] Can receive MJPEG: `GET /api/stream/:id`
- [ ] Can push/poll audio: All audio endpoints

### Performance
- [ ] Response times < 100ms
- [ ] Memory usage stable
- [ ] CPU usage < 50%
- [ ] Database queries efficient
- [ ] No connection leaks

### Monitoring
- [ ] Logs being written
- [ ] Log rotation configured
- [ ] Monitoring alerts configured
- [ ] Health checks running
- [ ] Error tracking working

## iOS App Configuration

Update in `RelayServerManager.swift`:

```swift
var serverURL = "https://relay.yourdomain.com"
var authToken = "alfred_baby_monitor_2026"
```

Or via app settings screen:
1. Open Alfred Camera app
2. Go to Settings
3. Relay Server Configuration
4. Enter server URL: `https://relay.yourdomain.com`
5. Verify auth token matches

## Monitoring & Maintenance

### Log Monitoring

```bash
# View real-time logs
tail -f /var/log/alfred-relay/error.log
tail -f /var/log/alfred-relay/output.log

# View logs for specific errors
grep "ERROR" /var/log/alfred-relay/error.log | tail -20

# Rotate logs
logrotate /etc/logrotate.d/alfred-relay
```

### Database Maintenance

```bash
# Backup database
pg_dump -U alfred_relay_user -d alfred_relay | gzip > backup_$(date +%Y%m%d).sql.gz

# Analyze query performance
ANALYZE; # in psql

# Vacuum to reclaim space
VACUUM FULL; # in psql

# Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Monitoring

```bash
# Check memory usage
ps aux | grep "node"

# Check open connections
netstat -an | grep ESTABLISHED | wc -l

# Check database connections
psql -U alfred_relay_user -d alfred_relay -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Health Checks

```bash
# Test API
curl -s https://relay.yourdomain.com/api/health | jq .

# Test database connection
psql -h localhost -U alfred_relay_user -d alfred_relay -c "SELECT 1;"

# Test frame endpoint
curl -X GET "https://relay.yourdomain.com/api/cameras" \
  -H "X-Auth-Token: alfred_baby_monitor_2026"
```

## Troubleshooting

### Server Won't Start

```bash
# Check for port conflicts
lsof -i :3000

# Check logs
tail -100 /var/log/alfred-relay/error.log

# Check environment variables
env | grep DB_

# Test database connection
psql -h localhost -U alfred_relay_user -d alfred_relay -c "\dt"
```

### Database Connection Issues

```bash
# Test connection string
psql postgresql://alfred_relay_user:password@localhost:5432/alfred_relay

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Memory Leaks

```bash
# Monitor with PM2
pm2 logs alfred-relay

# Check memory trend
ps aux | grep "node" | awk '{print $6}' # RSS column

# Restart service
pm2 restart alfred-relay
# or
sudo systemctl restart alfred-relay
```

### Frame Not Streaming

1. Verify camera registered: `GET /api/cameras`
2. Check camera is streaming: `POST /api/camera/:id/status` with no body
3. Check logs for frame push errors: `grep "Frame pushed" logs/combined.log`
4. Test with cURL: `curl -X GET https://relay.yourdomain.com/api/stream/:id`

## Rollback Procedure

If issues arise:

```bash
# Stop Node.js server
pm2 stop alfred-relay
# or
sudo systemctl stop alfred-relay
# or
docker-compose down

# Update iOS app to point to PHP server
# Edit RelayServerManager.swift serverURL back to PHP URL

# Restart PHP server
sudo systemctl start alfred-relay-php

# Verify PHP server working
curl https://old-relay.yourdomain.com/api/health
```

## Post-Deployment

### Week 1: Monitoring
- Daily health checks
- Monitor error logs
- Verify all devices working
- Check performance metrics

### Week 2-3: Stabilization
- Address any issues found
- Optimize based on metrics
- Train operations team
- Document any deviations

### Week 4: Cleanup
- Archive PHP server configuration
- Remove PHP server from production
- Update documentation
- Conduct retrospective

## Support

For deployment issues:
1. Check logs: `tail -f logs/error.log`
2. Review API documentation: See API.md
3. Check SETUP.md for configuration help
4. Review this deployment guide
5. Contact support with logs attached

## Production Checklist Summary

```
Infrastructure
- [ ] Server hardware adequate (2+ cores, 4GB+ RAM, 20GB+ disk)
- [ ] PostgreSQL backup running daily
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates valid

Deployment
- [ ] Code deployed to /opt/alfred-relay
- [ ] Dependencies installed (npm ci --production)
- [ ] Migrations completed (npm run migrate)
- [ ] Environment variables set correctly
- [ ] Service started and auto-restart enabled

Monitoring
- [ ] Logs configured and rotating
- [ ] Health checks running every 5 minutes
- [ ] Alerts configured for errors
- [ ] Performance baselines established

Documentation
- [ ] Runbook created
- [ ] Escalation procedures documented
- [ ] Team trained
- [ ] iOS app configuration updated
```

Ready to deploy! 🚀
