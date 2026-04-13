# Render Backend Deployment Guide

Complete step-by-step guide for deploying Alfred Camera Relay Server on Render.com

## Overview

This guide covers deploying the Node.js Alfred Camera Relay Server to Render with PostgreSQL database. Render handles infrastructure management, letting you focus on your application.

**What you'll deploy:**
- Node.js backend (Express.js) on Render Web Service
- PostgreSQL database on Render Postgres
- Zero-downtime deployments
- Automatic SSL/HTTPS
- Built-in monitoring and logs

**Deployment time:** ~15-20 minutes

---

## Prerequisites

### 1. Render Account Setup

1. Go to [https://render.com](https://render.com)
2. Click "Sign Up"
3. Sign up with GitHub account (recommended for easy deployments)
4. Complete email verification
5. Set up your dashboard

### 2. GitHub Repository Access

1. Fork or clone this repository to your GitHub account
   ```bash
   git clone https://github.com/YOUR-USERNAME/alfred-camera.git
   cd alfred-camera
   git remote set-url origin https://github.com/YOUR-USERNAME/alfred-camera.git
   ```

2. Push to GitHub:
   ```bash
   git push origin master
   ```

3. Verify the repository is accessible at: `https://github.com/YOUR-USERNAME/alfred-camera`

### 3. Required Environment Variables

Before deployment, collect these values:

```
JWT_SECRET           Generate secure random string
AUTH_TOKEN           alfred_baby_monitor_2026 (or custom)
CORS_ORIGIN          Your iOS app URL/domain
NODE_ENV             production (always)
LOG_LEVEL            info (production)
CAMERA_TIMEOUT       120 (seconds)
RATE_LIMIT_WINDOW_MS 900000 (15 minutes)
RATE_LIMIT_MAX_REQUESTS 100
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 1: Create PostgreSQL Database on Render

### 1.1 Navigate to Render Dashboard

1. Log in to [https://dashboard.render.com](https://dashboard.render.com)
2. Click "New +" in top menu
3. Select "PostgreSQL"

### 1.2 Configure Database

Fill in the form with:

| Field | Value |
|-------|-------|
| **Name** | `alfred-camera-db` |
| **Database** | `alfred_relay` |
| **User** | `alfred_user` |
| **Region** | Select closest to your users (us-east-1 recommended) |
| **PostgreSQL Version** | 15 (or latest) |
| **Backup frequency** | Daily (production recommended) |

Screenshot reference: Database creation form shows database name, region, and backup options

### 1.3 Create Database

1. Review settings
2. Click "Create Database"
3. Wait 2-3 minutes for database to be ready
4. Status changes from "Creating" to "Available"

### 1.4 Save Database Connection Info

Once database is ready, copy these from the "Connections" section:

- **Internal Database URL**: `postgresql://...@internal-...render.internal:5432/alfred_relay`
- **External Database URL**: `postgresql://...@...render.internal:5432/alfred_relay`

Save both URLs - you'll use the internal URL for the web service.

---

## Step 2: Create Web Service on Render

### 2.1 Connect GitHub Repository

1. From Render Dashboard, click "New +"
2. Select "Web Service"
3. Click "Connect Repository"
4. Authorize Render to access your GitHub
5. Search for your repository: `alfred-camera`
6. Click "Connect" next to the repository

Screenshot reference: GitHub repository connection form

### 2.2 Configure Web Service

Fill in the deployment form:

| Field | Value |
|-------|-------|
| **Name** | `alfred-camera-relay` |
| **Root Directory** | `relay-server-nodejs` |
| **Environment** | `Node` |
| **Build Command** | `npm ci && npm run migrate` |
| **Start Command** | `npm start` |
| **Region** | Same as database |
| **Plan** | Standard (minimum) or higher |

**CRITICAL: Root Directory must be `relay-server-nodejs`**

Screenshot reference: Web service configuration form

### 2.3 Set Environment Variables

Scroll down to "Environment" section. Click "Add Environment Variable" for each:

1. **NODE_ENV** = `production`
2. **PORT** = `3000` (default, Render sets this)
3. **DB_HOST** = (Internal URL hostname, e.g., `internal-...render.internal`)
4. **DB_PORT** = `5432`
5. **DB_NAME** = `alfred_relay`
6. **DB_USER** = `alfred_user`
7. **DB_PASSWORD** = (From database creation)
8. **JWT_SECRET** = (Your generated secret)
9. **AUTH_TOKEN** = `alfred_baby_monitor_2026`
10. **CORS_ORIGIN** = `*` (for development; restrict in production)
11. **LOG_LEVEL** = `info`
12. **MAX_FRAME_SIZE** = `2097152`
13. **MAX_AUDIO_CHUNK_SIZE** = `131072`
14. **CAMERA_TIMEOUT** = `120`
15. **RATE_LIMIT_WINDOW_MS** = `900000`
16. **RATE_LIMIT_MAX_REQUESTS** = `100`
17. **APP_URL** = (Your Render web service URL, e.g., `https://alfred-camera-relay.onrender.com`)

**Security Note:** Store sensitive values like `DB_PASSWORD` and `JWT_SECRET` securely. Render encrypts these in transit and at rest.

### 2.4 Build Command Details

The build command runs migrations automatically:

```bash
npm ci && npm run migrate
```

This command:
- `npm ci`: Clean install of dependencies (reproducible)
- `npm run migrate`: Creates database schema

### 2.5 Create Web Service

1. Review all settings
2. Click "Create Web Service"
3. Render builds and deploys automatically (takes 3-5 minutes)

Screenshot reference: Web service creation confirmation

---

## Step 3: Verify Deployment

### 3.1 Monitor Deployment Progress

1. On the web service page, you'll see the "Logs" section
2. Watch for build and deploy logs
3. Expected flow:
   - Building image...
   - Fetching dependencies...
   - Running build command...
   - Running migrations...
   - Server starting...

### 3.2 Check Service Health

Once deployment completes:

1. Look for your service URL (e.g., `https://alfred-camera-relay.onrender.com`)
2. Test the health endpoint:

```bash
curl https://alfred-camera-relay.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "cameras": 0,
  "node_version": "v18.x.x",
  "uptime": 45.2
}
```

### 3.3 Test Root Endpoint

```bash
curl https://alfred-camera-relay.onrender.com/
```

Expected response:
```json
{
  "message": "Alfred Camera Relay Server",
  "version": "1.0.0",
  "status": "running"
}
```

### 3.4 Verify Database Connection

Test the database connection by checking logs:

1. Click "Logs" on the web service page
2. Look for lines like:
   ```
   [info] Database connection established
   Migrations completed successfully
   ```

If you see errors, proceed to Troubleshooting section.

---

## Step 4: Configure for Production

### 4.1 Update CORS Settings

Once you have your iOS app deployed, update CORS:

1. Go to web service settings
2. Update `CORS_ORIGIN` environment variable
3. Change from `*` to specific origin:
   ```
   https://yourdomain.com
   ```
4. Or for multiple origins:
   ```
   https://app.yourdomain.com,https://api.yourdomain.com
   ```

### 4.2 Set Up Auto-Deploy

The web service auto-deploys on git push:

1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Update relay server"
   git push origin master
   ```
2. Render automatically detects changes and redeploys
3. Zero-downtime deployments by default

### 4.3 Configure Backup Settings

1. Go to PostgreSQL database settings
2. Click "Backup" tab
3. Set backup frequency (daily recommended)
4. Enable point-in-time recovery if needed

---

## Step 5: iOS App Configuration

Update your iOS app to use the Render backend:

### 5.1 Update Server URL

In your iOS code (e.g., `RelayServerManager.swift` or equivalent):

```swift
let serverURL = "https://alfred-camera-relay.onrender.com"
let authToken = "alfred_baby_monitor_2026"
```

### 5.2 Test Connection

1. Run the iOS app
2. Register a new camera device
3. Verify it appears in the logs:
   ```
   Camera registered: camera_id
   ```

4. Test streaming
5. Check logs for successful connections

---

## Deployment Verification Checklist

Complete this checklist to verify successful deployment:

```
Database
- [ ] PostgreSQL database created and running
- [ ] Database URL accessible
- [ ] Can connect with database client
- [ ] Backup configured

Web Service
- [ ] Web service deployed without errors
- [ ] Health endpoint returns 200
- [ ] Root endpoint returns JSON
- [ ] No errors in deployment logs
- [ ] Service URL accessible via HTTPS

Configuration
- [ ] All environment variables set
- [ ] JWT_SECRET is 32+ characters
- [ ] CORS_ORIGIN configured correctly
- [ ] LOG_LEVEL is 'info'
- [ ] NODE_ENV is 'production'

Database Connection
- [ ] No connection pool errors in logs
- [ ] Database queries executing
- [ ] Migrations completed successfully
- [ ] Database tables created

API Testing
- [ ] GET /api/health returns 200
- [ ] GET / returns 200 with JSON
- [ ] Authentication endpoints working
- [ ] Rate limiting active
- [ ] Error handling working

iOS Integration
- [ ] iOS app points to correct backend URL
- [ ] Auth token matches
- [ ] Can register device
- [ ] Can stream video
- [ ] No SSL/TLS certificate errors

Monitoring
- [ ] Logs visible in Render dashboard
- [ ] No error spam
- [ ] Memory usage stable
- [ ] Response times reasonable (<1s)
```

---

## Monitoring and Logs

### 5.1 View Live Logs

1. Go to your web service on Render
2. Click "Logs" tab
3. View real-time logs from your service
4. Logs auto-scroll as events occur

### 5.2 Filter Logs

Use the search box to filter logs:

| Pattern | Purpose |
|---------|---------|
| `error` | Find errors |
| `database` | Find database events |
| `migration` | Find migration logs |
| `health` | Find health checks |
| `camera` | Find camera events |

### 5.3 Database Monitoring

1. Go to your PostgreSQL database on Render
2. Click "Data Browser" to see tables
3. View: Users, Devices, Streaming Sessions, etc.

### 5.4 Set Up Email Alerts (Optional)

1. Go to Account Settings
2. Enable notifications for:
   - Deployment failures
   - Service crashes
   - Database issues

---

## Common Issues and Troubleshooting

### Issue 1: "Build failed: npm ci failed"

**Error Message:** `npm ERR! code ERESOLVE`

**Cause:** Dependency conflict

**Solution:**
1. Run locally first: `npm ci`
2. Fix any dependency issues
3. Commit and push to GitHub
4. Render will retry automatically

### Issue 2: "Migration failed: Cannot connect to database"

**Error Message:** `Error: getaddrinfo ENOTFOUND host`

**Cause:** Database credentials incorrect or database not ready

**Solution:**
1. Verify database is "Available" (not "Creating")
2. Check database URL copied correctly
3. Verify DB_HOST, DB_USER, DB_PASSWORD in environment variables
4. Copy internal database URL, not external
5. Trigger redeployment: Click "Deploy latest commit"

### Issue 3: "Service unreachable: 502 Bad Gateway"

**Cause:** Service crashed after deployment

**Solution:**
1. Check logs for errors
2. Look for:
   - `JWT_SECRET` not set
   - Database connection failed
   - Port not opening
3. Fix issue
4. Push to GitHub to trigger redeploy
5. Or click "Manual Deploy" in web service

### Issue 4: "Health check failing"

**Error:** Service shows as unhealthy

**Solution:**
1. Check service is actually running:
   ```bash
   curl https://alfred-camera-relay.onrender.com/
   ```
2. If 502 error:
   - Check logs for startup errors
   - Verify JWT_SECRET is set
   - Verify database can connect
3. Render retries health checks automatically
4. Service goes healthy once checks pass

### Issue 5: "Database connection pool exhausted"

**Error:** `Error: Client has encountered a connection error and is not queryable`

**Cause:** Too many simultaneous database connections

**Solution:**
1. Increase database connection pool:
   ```bash
   MAX_POOL_SIZE=10
   ```
2. Reduce `RATE_LIMIT_MAX_REQUESTS` if needed
3. Check for connection leaks in app
4. Restart service

### Issue 6: "CORS error in iOS app"

**Error:** `The operation couldn't be completed. CORS error`

**Cause:** CORS_ORIGIN not matching app URL

**Solution:**
1. Get exact URL iOS app uses:
   ```swift
   print("App URL: \(serverURL)")
   ```
2. Update CORS_ORIGIN to match exactly
3. If using localhost, set: `http://localhost:3000`
4. For production, set to your domain

### Issue 7: "JWT_SECRET environment variable is required"

**Error:** Server won't start with this error

**Cause:** JWT_SECRET not set

**Solution:**
1. Generate secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add to environment variables in Render
3. Trigger redeployment

### Issue 8: "Deployment stuck on 'Creating'"

**Cause:** Build step taking too long or hanging

**Solution:**
1. Wait 10 minutes for initial deploy
2. If still stuck, click "Manual Deploy"
3. Check build logs for issues
4. Verify `npm ci` completes locally first

---

## Advanced Configuration

### 6.1 Custom Domain (Optional)

1. Go to web service settings
2. Scroll to "Custom Domains"
3. Click "Add Custom Domain"
4. Enter your domain: `api.yourdomain.com`
5. Follow DNS configuration steps
6. Update CORS_ORIGIN to match

### 6.2 Scaling

**Increase instances for higher load:**

1. Go to web service settings
2. Click "Plan"
3. Upgrade to:
   - Standard (1 instance)
   - Standard+ (auto-scaling)
   - Pro (guaranteed resources)

**For database:**
1. Go to database settings
2. Click "Plan"
3. Upgrade RAM/disk as needed

### 6.3 Backup and Restore

**Manual backup:**

1. Go to PostgreSQL settings
2. Click "Create Backup"
3. Label it (e.g., "Pre-upgrade")

**Restore from backup:**

1. Go to "Backups" tab
2. Click "Restore" on desired backup
3. Creates new database instance
4. Update connection string

### 6.4 SSL Certificate

Render automatically provides free SSL certificates via Let's Encrypt.

- HTTPS enabled automatically
- Renewed automatically
- No configuration needed

---

## Performance Tuning

### 7.1 Database Query Optimization

Check slow queries in logs:

```
[slow-query] SELECT * FROM devices WHERE user_id=... (125ms)
```

Optimization steps:
1. Add database indexes
2. Use connection pooling (already enabled)
3. Paginate large result sets

### 7.2 Response Time Targets

| Endpoint | Target |
|----------|--------|
| Health check | < 50ms |
| Authentication | < 200ms |
| Device list | < 100ms |
| Frame upload | < 500ms |
| Stream | < 1s startup |

### 7.3 Monitor Resource Usage

1. Go to web service metrics
2. Watch for:
   - Memory increasing over time (memory leak)
   - CPU > 80% sustained (scale up)
   - Disk > 80% (cleanup old logs)

---

## Rollback Procedures

### Rollback to Previous Deployment

1. Go to web service "Deploy" tab
2. View deployment history
3. Click "Redeploy" next to previous version
4. Service rolls back within 30-60 seconds

### Rollback Application Code

1. In your GitHub repository
2. Revert the commit:
   ```bash
   git revert HEAD
   git push origin master
   ```
3. Render automatically redeploys
4. Or click "Manual Deploy" for previous commit

### Database Rollback

If migrations failed:

1. Go to PostgreSQL database
2. Click "Backups"
3. Click "Restore" on previous backup
4. Connection string might change - update in web service
5. Redeploy web service

---

## Security Best Practices

### 8.1 Secrets Management

**DO:**
- Use Render environment variables for all secrets
- Rotate JWT_SECRET every 90 days
- Use strong passwords for DB_PASSWORD
- Never commit secrets to GitHub

**DON'T:**
- Store secrets in code
- Use default passwords
- Share environment variables
- Log sensitive data

### 8.2 Access Control

**Limit database access:**

```sql
-- Disable public access if using external URL
-- Only use internal database URL from web service
```

**Update CORS for production:**

```
CORS_ORIGIN=https://yourappdomain.com
```

NOT:
```
CORS_ORIGIN=*  # Allows anyone to access
```

### 8.3 Monitoring

- Check logs daily for errors
- Monitor failed health checks
- Review deployment history
- Watch for security alerts

---

## Getting Help

### 8.1 Service Status

Check Render status page: [https://status.render.com](https://status.render.com)

### 8.2 Useful Commands

**Test service from local machine:**

```bash
# Test health endpoint
curl https://alfred-camera-relay.onrender.com/api/health

# Test with auth token
curl -H "X-Auth-Token: alfred_baby_monitor_2026" \
  https://alfred-camera-relay.onrender.com/api/cameras

# View logs (if you have SSH access)
ssh your-service.onrender.com "tail -f logs/app.log"
```

### 8.3 Common Questions

**Q: How do I change the database password?**
A: In Render PostgreSQL settings, click "Change Password". Update DB_PASSWORD in web service environment variables.

**Q: Can I downgrade my plan?**
A: Yes, at any time. Go to Plan settings, select lower tier.

**Q: Is my data backed up?**
A: Yes, daily automatic backups. See "Backups" in database settings.

**Q: How do I access the database directly?**
A: Use the connection string from database settings with a PostgreSQL client like pgAdmin.

---

## Monitoring Dashboard

### Create a Status Dashboard (Optional)

Render provides metrics at: `https://dashboard.render.com/services`

Key metrics to monitor:
- **CPU Usage**: Should stay < 50% under normal load
- **Memory Usage**: Should stay < 70% under normal load
- **Replica Status**: Should show "healthy"
- **Error Rate**: Should be < 1%

---

## Next Steps After Deployment

1. **Configure iOS App**
   - Update server URL to your Render endpoint
   - Test camera device registration
   - Test video streaming

2. **Set Up Monitoring**
   - Enable email alerts
   - Monitor logs daily
   - Track error rates

3. **Load Testing** (Optional)
   - Test with multiple concurrent devices
   - Monitor performance
   - Scale if needed

4. **Documentation**
   - Update team with backend URL
   - Document any customizations
   - Create runbook for operations

---

## Summary

You've successfully deployed Alfred Camera Relay Server to Render with:

✅ PostgreSQL database with automatic backups
✅ Node.js web service with auto-scaling
✅ Zero-downtime deployments via GitHub
✅ Automatic SSL/HTTPS certificates
✅ Production monitoring and logs
✅ Health checks and monitoring

**Your backend is now live at:**
```
https://alfred-camera-relay.onrender.com
```

**Next:** Update iOS app to use this URL and test end-to-end functionality.

---

## Emergency Contacts

If you encounter critical issues:

1. Check Render status: [https://status.render.com](https://status.render.com)
2. Review logs: Web service → Logs tab
3. Check this guide's Troubleshooting section
4. Render support: [https://render.com/docs/support](https://render.com/docs/support)

---

**Last Updated:** 2026-04-08
**Deployment Version:** 1.0
**Backend Version:** Node.js 18+
**Database:** PostgreSQL 15+
