# Render Deployment Troubleshooting Guide

Complete troubleshooting reference for Alfred Camera Relay Server on Render.

---

## Quick Diagnosis Flowchart

```
Service shows "unhealthy" or error?
│
├─ Check Render Logs
│  └─ Any startup errors?
│     ├─ YES: See "Service Won't Start" section
│     └─ NO: Continue below
│
├─ Test Health Endpoint
│  ├─ 200 OK: Service healthy, check iOS app config
│  ├─ 502 Bad Gateway: Service crashed, check logs
│  ├─ 503 Service Unavailable: Deployment in progress
│  └─ Connection timeout: Firewall/network issue
│
├─ Database Connected?
│  ├─ Logs show database errors: See "Database Issues" section
│  ├─ Logs show queries: Database working, check app logic
│  └─ No database messages: Check DB_HOST/DB_PASSWORD
│
└─ iOS App Issues?
   └─ See "iOS App Integration" section
```

---

## Error Categories

### Category 1: Deployment Failures

**Symptoms:**
- Service stuck on "Creating" or "Deploying"
- Build fails
- Service won't start after push

**Solution:** Jump to [Deployment Issues](#deployment-issues) section

### Category 2: Runtime Crashes

**Symptoms:**
- 502 Bad Gateway
- Service unhealthy
- Crashes 10-30 seconds after starting

**Solution:** Jump to [Runtime Issues](#runtime-issues) section

### Category 3: Database Problems

**Symptoms:**
- Database connection errors in logs
- Migration failures
- Cannot query data

**Solution:** Jump to [Database Issues](#database-issues) section

### Category 4: Configuration Issues

**Symptoms:**
- "Environment variable is required" errors
- CORS errors from iOS app
- Authentication failures

**Solution:** Jump to [Configuration Issues](#configuration-issues) section

---

## Deployment Issues

### Problem: Build Fails - "npm ci failed"

**Full error message:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Diagnosis:**
1. Go to web service → Logs
2. Search for "npm ERR"
3. Check what package is conflicting

**Solutions:**

**Option A: Fix locally first**
```bash
cd relay-server-nodejs
npm ci --force
npm test
git add package-lock.json
git commit -m "fix: resolve npm dependencies"
git push origin master
```

**Option B: Update dependencies**
```bash
npm update
npm ci
git add package-lock.json
git commit -m "fix: update dependencies"
git push origin master
```

**Option C: Clean rebuild in Render**
1. Go to web service
2. Click "Manual Deploy"
3. Select "Force rebuild"

**Option D: Use npm install instead (less preferred)**
Update build command from:
```
npm ci && npm run migrate
```
To:
```
npm install --production && npm run migrate
```

---

### Problem: Build Succeeds But Service Won't Start

**Error message in logs:**
```
Exit code 127
Command not found
```

**Cause:** Build command or start command path is wrong

**Solutions:**

1. **Verify Root Directory**
   - Go to web service settings
   - Root Directory should be: `relay-server-nodejs`
   - NOT: `/relay-server-nodejs` or `relay-server`

2. **Verify Build Command**
   - Should be: `npm ci && npm run migrate`
   - NOT: `cd relay-server-nodejs && npm ci`

3. **Verify Start Command**
   - Should be: `npm start`
   - NOT: `node src/index.js`

4. **Check npm script exists**
   - Verify package.json has: `"start": "node src/index.js"`

5. **Force redeploy**
   - Go to Deployments tab
   - Click "Manual Deploy"

---

### Problem: Deployment Stuck - "Preparing build"

**Symptoms:**
- Stuck for > 10 minutes
- No progress in logs

**Solution:**

1. Wait 5 more minutes (first deploy takes time)
2. If still stuck:
   - Click web service name to go to details
   - Click "..." menu
   - Select "Cancel Deploy"
3. Then click "Manual Deploy"

---

### Problem: "Cannot find module" error

**Error message:**
```
Error: Cannot find module 'express'
```

**Cause:** Dependencies not installed

**Solutions:**

1. Verify package.json exists in `relay-server-nodejs/` directory
2. Check Root Directory in web service settings is `relay-server-nodejs`
3. Force rebuild: Click "Manual Deploy" → "Force rebuild"

---

## Runtime Issues

### Problem: Service Keeps Crashing (502 Bad Gateway)

**Symptoms:**
- Service starts, then crashes after 10-30 seconds
- Logs show service exiting
- Health checks fail

**Step 1: Check the error in logs**
```
Go to web service → Logs
Look for the error before "Exit code"
```

**Step 2: Identify the issue**

| Error Message | Problem | Solution |
|---------------|---------|----------|
| `JWT_SECRET is required` | Missing env var | See [Missing JWT_SECRET](#missing-jwtsecret) |
| `Cannot connect to database` | DB connection failed | See [Database Connection](#database-connection-failure) |
| `EADDRINUSE` | Port already in use | Restart service |
| `Cannot find module` | Missing dependency | Rebuild: click "Manual Deploy" |
| `SyntaxError` | Code error | Fix code, push to GitHub |

---

### Problem: Missing JWT_SECRET

**Error message:**
```
ERROR: JWT_SECRET environment variable is required
Exit code 1
```

**Solution:**

1. Generate a secure JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Output: `a1b2c3d4...` (64 characters)

2. Go to web service settings
3. Click "Environment"
4. Find `JWT_SECRET`
5. Update value with your generated secret
6. Click "Save"
7. Render auto-redeploys (wait 1-2 minutes)

**Verify:**
```bash
curl https://alfred-camera-relay.onrender.com/api/health
```

---

### Problem: Database Connection Failure

**Error message:**
```
Error: connect ENOTFOUND postgres-...render.internal
```

**Diagnosis:**

1. Is database in "Available" status?
   - Go to PostgreSQL database in Render
   - Check status (not "Creating")

2. Are credentials correct?
   - Check DB_HOST matches database name
   - Check DB_USER is `alfred_user`
   - Check DB_PASSWORD is correct

3. Is internal URL being used?
   - DB_HOST should be: `internal-...render.internal`
   - NOT the external URL

**Solutions:**

**Option 1: Fix Connection String**
1. Go to PostgreSQL database
2. Copy "Internal Database URL"
3. Extract hostname: `internal-...render.internal`
4. Go to web service environment
5. Update `DB_HOST` to extracted hostname
6. Update `DB_PASSWORD` if needed
7. Click "Manual Deploy"

**Option 2: Verify Database is Ready**
1. Go to PostgreSQL database
2. Status should show "Available" (not "Creating")
3. Wait 2-3 minutes if still creating
4. Click "Manual Deploy" on web service

**Option 3: Use External URL (Temporary)**
1. Go to PostgreSQL database
2. Copy "External Database URL"
3. In web service, update DB_HOST to external URL hostname
4. This is slower but works for testing
5. Switch back to internal URL later

**Option 4: Check Port Number**
- DB_PORT should be `5432`
- Render always uses 5432 internally

---

## Database Issues

### Problem: Migration Failed

**Error message:**
```
Error: Migration failed: Cannot connect to database
```

**Cause:** Database not accessible during build

**Solutions:**

1. **Wait for database to finish creating**
   - Go to PostgreSQL database
   - Status must be "Available" (not "Creating")

2. **Use correct internal database URL**
   - Internal URLs work within Render network
   - External URLs are slower
   - Set DB_HOST to: `internal-...render.internal`

3. **Verify database credentials**
   - Go to PostgreSQL database page
   - Check "Connections" section
   - Copy exact credentials
   - Paste into web service environment variables

4. **Re-run migrations manually (if service is up)**
   - This is NOT recommended but possible
   - Better to fix and redeploy

---

### Problem: "Database does not exist"

**Error message:**
```
FATAL: database "alfred_relay" does not exist
```

**Cause:** Database name is wrong or database creation failed

**Solutions:**

1. **Verify database was created**
   - Go to PostgreSQL database in Render
   - Should see database listed
   - If not, database creation failed

2. **Check DB_NAME environment variable**
   - Should be: `alfred_relay` (lowercase)
   - NOT: `Alfred_Relay` or other variations

3. **Recreate database if needed**
   - Delete current database (warning: deletes data)
   - Create new PostgreSQL database
   - Update connection string

---

### Problem: Tables Don't Exist After Migration

**Error message:**
```
Error: SequelizeError: relation "users" does not exist
```

**Cause:** Migrations ran but didn't create tables

**Diagnosis:**

1. Check migration logs:
   ```bash
   Go to web service → Logs
   Search for "migration" or "Migration"
   ```

2. Should see:
   ```
   [info] Starting migrations...
   [info] Running migration: up
   [info] Migrations completed successfully
   ```

3. If not present, migrations didn't run

**Solutions:**

1. **Re-run migrations**
   - Go to web service
   - Click "Manual Deploy"
   - Build command will re-run migrations

2. **Check build command is correct**
   - Should be: `npm ci && npm run migrate`
   - Verify at: web service → Settings

3. **Verify migrations exist**
   - Check files in `relay-server-nodejs/src/migrations/`
   - Should have 5 migration files

4. **Run migrations manually (advanced)**
   - Connect to database with psql
   - Run migration script
   - NOT recommended - redeploy instead

---

### Problem: "Connection pool exhausted"

**Error message:**
```
Error: Client has encountered a connection error and is not queryable
Error: terminating connection due to administrator command
```

**Cause:** Too many simultaneous database connections

**Solutions:**

1. **Lower rate limiting**
   - Go to web service environment
   - Reduce `RATE_LIMIT_MAX_REQUESTS` from 100 to 50
   - Increase `RATE_LIMIT_WINDOW_MS` from 900000 to 1800000
   - Click "Save"

2. **Reduce concurrent devices**
   - Test with fewer simultaneous devices
   - Check if issue is load-related

3. **Increase database resources**
   - Go to PostgreSQL database
   - Click "Plan"
   - Upgrade to higher tier
   - More connections allowed

4. **Look for connection leaks**
   - Check app code for unclosed connections
   - Verify database.close() is called on shutdown

5. **Restart service**
   - Closes all connections
   - Go to web service → Deployments
   - Click "Manual Deploy"

---

## Configuration Issues

### Problem: CORS Error in iOS App

**Error message in iOS app:**
```
URLError(.unknown): The operation couldn't be completed. (NSURLError._ErrorCode error -1.)"
```

Or in browser console:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:** CORS_ORIGIN doesn't match app URL

**Diagnosis:**

1. Identify your app's exact URL:
   ```swift
   // In your iOS code
   let serverURL = "https://alfred-camera-relay.onrender.com"
   // or
   let serverURL = "http://192.168.1.100:3000"
   ```

2. Go to web service → Environment
3. Find `CORS_ORIGIN`
4. Does it match exactly? (case-sensitive!)

**Solutions:**

**Option 1: For public URL (production)**
```bash
CORS_ORIGIN=https://alfred-camera-relay.onrender.com
```

**Option 2: For local development**
```bash
CORS_ORIGIN=http://localhost:3000
```

**Option 3: For multiple origins**
```bash
CORS_ORIGIN=https://app.yourdomain.com,https://api.yourdomain.com
```

**Option 4: For development only (NOT production)**
```bash
CORS_ORIGIN=*
```

**Then:**
1. Update environment variable in Render
2. Click "Save"
3. Wait for auto-redeploy (1-2 minutes)
4. Test iOS app again

---

### Problem: "Invalid JWT Token"

**Error message:**
```
401 Unauthorized: Invalid token
```

**Cause:**
- Token generated with different JWT_SECRET
- Token expired
- Token malformed

**Solutions:**

1. **Regenerate auth token**
   - Log in fresh to iOS app
   - This gets new token

2. **Check token expiry**
   - Tokens valid for time set in `JWT_EXPIRY` env var
   - Default: 24 hours

3. **Verify JWT_SECRET unchanged**
   - If you change JWT_SECRET, old tokens become invalid
   - All users must log in again

4. **Check token format**
   - Should be: `Authorization: Bearer <token>`
   - Token should be 3 parts separated by dots: `xxx.yyy.zzz`

---

### Problem: "AUTH_TOKEN mismatch"

**Error message in logs:**
```
Unauthorized: Invalid auth token
```

**Cause:** iOS app using different AUTH_TOKEN than server

**Solutions:**

1. Check iOS app code:
   ```swift
   let authToken = "alfred_baby_monitor_2026"
   ```

2. Check server AUTH_TOKEN:
   - Go to web service environment
   - Look for `AUTH_TOKEN`
   - Must match iOS app exactly

3. Update either to match:
   - Change iOS code to match server (preferred)
   - Or change server env var to match iOS app
   - Then click "Save" and wait for redeploy

---

### Problem: Missing Environment Variable

**Error message:**
```
ERROR: <VARIABLE_NAME> environment variable is required
```

**Cause:** Variable not set in Render

**Solution:**

1. Go to web service settings
2. Click "Environment"
3. Add missing variable
4. Set appropriate value (see table below)

**Required Variables:**
| Variable | Required | Value |
|----------|----------|-------|
| `JWT_SECRET` | YES | Generate random 32-char string |
| `DB_HOST` | YES | Internal database hostname |
| `DB_PORT` | YES | 5432 |
| `DB_NAME` | YES | alfred_relay |
| `DB_USER` | YES | alfred_user |
| `DB_PASSWORD` | YES | Your database password |
| `NODE_ENV` | YES | production |
| Others | NO | See defaults in .env.example |

---

## iOS App Integration

### Problem: iOS App Can't Connect to Server

**Error message in iOS:**
```
Could not connect to server
Connection refused
Timeout waiting for response
```

**Diagnosis:**

1. **Check server URL in iOS app**
   ```swift
   let serverURL = "https://alfred-camera-relay.onrender.com"
   // Is it the correct URL?
   ```

2. **Test from your computer**
   ```bash
   curl https://alfred-camera-relay.onrender.com/api/health
   # Should return 200 OK with JSON
   ```

3. **If curl works but iOS fails**
   - CORS issue (see CORS section)
   - SSL certificate issue
   - Network configuration

**Solutions:**

**Option 1: Verify server is running**
```bash
curl -v https://alfred-camera-relay.onrender.com/api/health
```

Expected response:
```
> GET /api/health HTTP/2
< HTTP/2 200
< content-type: application/json
```

**Option 2: Check SSL certificate**
- Should auto-install on HTTPS
- If certificate error:
  - Go to web service settings
  - Look for SSL certificate
  - Should be auto-generated by Let's Encrypt

**Option 3: Verify app URL matches exactly**
- Case-sensitive!
- No trailing slash!
- Full URL including https://

**Option 4: Test with localhost (development)**
```swift
// For local testing
let serverURL = "http://localhost:3000"
```

Then create local tunnel:
```bash
# In relay-server-nodejs directory
npm run dev
```

---

### Problem: Camera Registration Fails

**Error in iOS:**
```
Failed to register camera
```

**Error in server logs:**
```
POST /api/devices/register returned 500
```

**Cause:** Could be multiple issues

**Diagnosis:**

1. **Check auth token**
   - iOS app must send correct AUTH_TOKEN
   - Server must have matching AUTH_TOKEN
   - See [AUTH_TOKEN mismatch](#problem-authtoken-mismatch)

2. **Check database is working**
   - View logs for database errors
   - See [Database Connection](#database-connection-failure)

3. **Check endpoint exists**
   - Verify app is calling correct endpoint
   - Check routing in app code

**Solutions:**

1. Verify server health:
   ```bash
   curl https://alfred-camera-relay.onrender.com/api/health
   ```

2. Check logs for specific error:
   ```
   Go to web service → Logs
   Look for "error" or "ERROR"
   ```

3. Verify auth token:
   - Check iOS app code
   - Check server environment variable
   - Both must match exactly

4. Test endpoint manually:
   ```bash
   curl -X POST https://alfred-camera-relay.onrender.com/api/devices/register \
     -H "Content-Type: application/json" \
     -H "X-Auth-Token: alfred_baby_monitor_2026" \
     -d '{"name":"Test Camera","role":"camera"}'
   ```

---

### Problem: Video Streaming Fails

**Error:**
```
Cannot connect to stream
Stream stopped unexpectedly
```

**Cause:** Could be network or app issue

**Diagnosis:**

1. **Check camera registered**
   ```bash
   curl https://alfred-camera-relay.onrender.com/api/cameras
   ```

2. **Check stream endpoint**
   ```bash
   curl https://alfred-camera-relay.onrender.com/api/stream/<camera_id>
   ```

3. **Check logs for connection events**
   ```
   Go to web service → Logs
   Search for "connected" or camera ID
   ```

**Solutions:**

1. Verify both devices connected and healthy
2. Check network connectivity between devices
3. Verify stream endpoint is correct
4. Check for firewall blocking stream
5. Test with different camera device

---

## Log Analysis Guide

### Where to Find Logs

**Render Dashboard:**
1. Go to https://dashboard.render.com
2. Click web service
3. Click "Logs" tab
4. Live logs appear

### Understanding Log Levels

| Level | Meaning | Action |
|-------|---------|--------|
| `info` | Normal operation | None needed |
| `warn` | Potential issue | Monitor |
| `error` | Something failed | Check cause |
| `debug` | Detailed info | Useful for troubleshooting |

### Sample Good Logs

```
[info] Starting Alfred Camera Relay Server...
[info] Server running on 0.0.0.0:3000
[info] Environment: production
[info] Database connected
[info] Server started successfully
[info] Camera registered: cam_abc123
[info] Stream started for viewer
[info] GET /api/health 200 12ms
```

### Sample Bad Logs

```
[error] Cannot connect to database: ENOTFOUND
[error] JWT_SECRET environment variable is required
[error] TypeError: Cannot read property 'id' of undefined
[error] FATAL: remaining connection slots reserved for non-replication superuser connections
[error] SyntaxError in routes/devices.js line 45
```

### How to Find Specific Errors

**Search for errors:**
```
In Render logs, use search box:
- "error" - all errors
- "database" - database-related
- "timeout" - connection timeouts
- "CORS" - CORS issues
- "JWT" - JWT issues
```

---

## Performance Issues

### Problem: Slow Response Times

**Symptoms:**
- Health check takes > 1 second
- API calls slow
- Videos don't stream smoothly

**Diagnosis:**

1. **Check server logs for slow queries**
   - Logs show query duration
   - Anything > 500ms is slow

2. **Check memory usage**
   - Go to web service metrics
   - Memory increasing over time?

3. **Check CPU usage**
   - CPU sustained > 80%?
   - Indicates overload

**Solutions:**

1. **Scale up service**
   - Go to web service settings
   - Click "Plan"
   - Upgrade from "Standard" to "Standard+" or "Pro"

2. **Optimize database queries**
   - Add indexes to frequently queried columns
   - Use EXPLAIN on slow queries

3. **Reduce concurrent connections**
   - Lower RATE_LIMIT_MAX_REQUESTS
   - Reduce active camera streams

---

### Problem: Memory Keeps Increasing

**Symptoms:**
- Memory usage grows over time
- Service becomes slow
- Eventually crashes with OOM

**Cause:** Memory leak in code

**Solutions:**

1. **Identify memory leak**
   - Check logs for patterns
   - Enable garbage collection logs

2. **Restart service**
   - Go to Deployments
   - Click "Manual Deploy"
   - Service restarts, memory resets

3. **Check for connection leaks**
   - Verify database connections are closed
   - Check event listeners are removed

4. **Report to development team**
   - Include logs showing memory growth
   - Include timing (happens after X minutes)

---

## Monitoring and Alerts

### Set Up Email Alerts

1. Go to Render Dashboard
2. Click Account (top right)
3. Click "Notifications"
4. Enable:
   - Service failed to deploy
   - Service instance crashed
   - Low disk space

### Manual Health Checks

Create a cron job to check health:

```bash
# Add to your monitoring system
curl -s https://alfred-camera-relay.onrender.com/api/health | grep '"status":"ok"'
```

If this fails, service needs attention.

---

## Recovery Procedures

### Rollback to Previous Deployment

**If something breaks after deployment:**

1. Go to web service
2. Click "Deployments" tab
3. Find last working deployment
4. Click "..." menu next to it
5. Select "Redeploy"
6. Confirm rollback
7. Service reverts to previous version (< 1 minute)

### Full System Reset

**WARNING: This deletes database! Only for emergency.**

1. Go to PostgreSQL database
2. Click "Delete Database"
3. Confirm deletion
4. Create new PostgreSQL database
5. Update connection string in web service
6. Re-run migrations
7. Service fully reset

---

## Checklists

### Pre-Deployment Checklist

- [ ] GitHub repository is up to date
- [ ] JWT_SECRET generated and saved
- [ ] Database created and ready
- [ ] All env vars prepared
- [ ] CORS_ORIGIN configured
- [ ] Tested locally with `npm start`

### Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] Root endpoint returns JSON
- [ ] Database connected (no errors in logs)
- [ ] Migrations completed
- [ ] iOS app can connect
- [ ] Camera registration works
- [ ] Video streaming works

### Ongoing Monitoring Checklist

- [ ] Check logs daily
- [ ] Monitor error rate (< 1%)
- [ ] Verify health checks passing
- [ ] Check disk space (> 20% free)
- [ ] Monitor memory usage (stable)
- [ ] Review slow queries (< 500ms)

---

## When to Escalate

Contact support if:

1. Service won't start despite following troubleshooting
2. Database is corrupted
3. Can't restore from backup
4. Need infrastructure changes
5. Suspect Render service issue

**Render Support:** https://render.com/docs/support

---

## Additional Resources

- **Render Documentation:** https://render.com/docs
- **Node.js Docs:** https://nodejs.org/en/docs/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Project README:** See relay-server-nodejs/README.md
- **API Documentation:** See relay-server-nodejs/API.md

---

**Last Updated:** 2026-04-08
**Guide Version:** 1.0
