# Cloudflare Workers Deployment Guide

Deploy your Relay Server to Cloudflare Workers with PostgreSQL on Supabase.

## Prerequisites

- [Cloudflare Account](https://dash.cloudflare.com) with Workers enabled
- [Supabase Account](https://supabase.com) with PostgreSQL database
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed locally
- Domain registered with Cloudflare (optional, for custom domain)

## Step 1: Create Supabase Database

1. Go to [supabase.com](https://supabase.com) → Sign in/Create account
2. Click "New Project"
3. Enter project details:
   - Name: `relay-server`
   - Region: Choose closest to your users
   - Password: Generate secure password
4. Wait for database to initialize (~2 minutes)
5. Go to Settings → Database → Connection string
6. Copy the connection string:
   ```
   postgresql://postgres.[project-id]:password@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

## Step 2: Configure Wrangler

1. Update `wrangler.toml`:
```toml
name = "relay-server"
main = "src/index.js"
type = "javascript"
account_id = "your-account-id"  # Get from Cloudflare Dashboard
compatibility_date = "2024-04-13"

[env.production]
name = "relay-server-production"
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[env.development]
name = "relay-server-development"
workers_dev = true

[env.production.vars]
NODE_ENV = "production"

[env.development.vars]
NODE_ENV = "development"
```

2. Get your Cloudflare Account ID:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Right sidebar → Under your account → Copy Account ID
   - Paste into `wrangler.toml`

## Step 3: Add Secrets

Store sensitive data as Wrangler secrets (encrypted on Cloudflare):

```bash
# Add PostgreSQL connection string
wrangler secret put DATABASE_URL --env production

# Paste: postgresql://postgres.[id]:password@...

# Add JWT secret
wrangler secret put JWT_SECRET --env production

# Paste: your-random-jwt-secret (at least 32 characters)

# Add relay auth token
wrangler secret put RELAY_AUTH_TOKEN --env production

# Paste: your-relay-token
```

Verify secrets:
```bash
wrangler secret list --env production
```

## Step 4: Initialize Database

1. Connect to Supabase database locally:
```bash
export DATABASE_URL="postgresql://postgres.[id]:password@..."
npm run migrate
npm run seed
```

2. Verify tables were created:
   - Go to Supabase dashboard
   - Table Editor → Check for users, devices, frames, sessions

## Step 5: Deploy

Deploy to production:
```bash
npm run deploy:prod
```

Expected output:
```
✅ Deployed to https://relay-server-production.yourdomain.workers.dev
```

## Step 6: Verify Deployment

```bash
# Test health endpoint
curl https://relay-server-production.yourdomain.workers.dev/api/health

# Should return:
# {"status":"ok","database":"connected"}
```

## Step 7: Connect Custom Domain (Optional)

1. In Cloudflare Dashboard → Workers → Services
2. Select `relay-server-production`
3. Triggers → Routes → Add route
4. Pattern: `api.yourdomain.com/*`
5. Zone: `yourdomain.com`

## Monitoring & Logs

View real-time logs:
```bash
wrangler tail --env production
```

View historical logs in Cloudflare Dashboard:
- Workers → relay-server-production → Logs

## Troubleshooting

### "Could not detect a directory containing static files"
- Ensure `wrangler.toml` has `main = "src/index.js"`
- Run `npm install` before deploying

### Database Connection Fails
```bash
# Test connection
wrangler secret list
# Check DATABASE_URL is set

# Verify Supabase firewall allows Cloudflare IPs
# In Supabase: Settings → Network → Firewall
# Add: 0.0.0.0/0 (allows all - secure with JWT in production)
```

### 502 Bad Gateway
- Check logs: `wrangler tail --env production`
- Verify DATABASE_URL is correct
- Check Supabase database is running

### Timeout Errors
- Increase Cloudflare Workers timeout (max 30s)
- Optimize database queries
- Use connection pooling (already configured)

## Performance Tips

1. **Enable Supabase Connection Pooling:**
   - In Supabase: Settings → Database → Connection Pooling
   - Mode: Transaction
   - Port: 6543 (use this port in DATABASE_URL)

2. **Cache Frames on Cloudflare:**
   - Add cache headers to `/api/stream/{id}` endpoint
   - TTL: 2-5 seconds

3. **Monitor Costs:**
   - Cloudflare Workers: ~$0.50 per million requests
   - Supabase: Free tier includes 500MB storage + 2M API requests

## Environment Comparison

| Feature | Dev | Production |
|---------|-----|-----------|
| Database | Supabase | Supabase |
| Workers | workers.dev domain | Custom domain |
| SSL | Automatic | Automatic |
| Logs | wrangler tail | Dashboard |
| Updates | Instant | Blue-green deploy |

## Rollback to Previous Version

```bash
# Check deployment history
wrangler deployments list --env production

# Rollback to previous
wrangler rollback --env production
```

## Next Steps

- Set up monitoring: Prometheus + Grafana
- Enable WebSocket support for lower latency
- Add Redis caching layer
- Implement auto-scaling

---

For more info:
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Supabase Docs](https://supabase.com/docs)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
