# Deployment Checklist

Quick checklist to deploy to Cloudflare Workers.

## Pre-Deployment (5 min)

- [ ] Install Wrangler: `npm install -g @cloudflare/wrangler`
- [ ] Have Cloudflare account ready
- [ ] Have Supabase account ready
- [ ] Node.js 18+ installed (`node --version`)

## Database Setup (5 min)

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Wait for database initialization
- [ ] Copy connection string from Supabase Settings
- [ ] Test connection locally:
  ```bash
  export DATABASE_URL="postgresql://..."
  npm run migrate
  npm run test:db
  ```

## Cloudflare Setup (5 min)

- [ ] Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Go to Workers → Create Service
- [ ] Get your Account ID (right sidebar)
- [ ] Update `wrangler.toml` with Account ID
- [ ] Authenticate Wrangler:
  ```bash
  wrangler auth
  ```

## Configuration (2 min)

- [ ] Update `.env` with DATABASE_URL
- [ ] Verify `wrangler.toml`:
  - [ ] `name = "relay-server"`
  - [ ] `main = "src/index.js"`
  - [ ] `account_id` is set

## Secrets Setup (3 min)

```bash
# Add secrets one by one
wrangler secret put DATABASE_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put RELAY_AUTH_TOKEN --env production

# Verify
wrangler secret list --env production
```

- [ ] DATABASE_URL set ✓
- [ ] JWT_SECRET set ✓
- [ ] RELAY_AUTH_TOKEN set ✓

## Pre-Deployment Tests (2 min)

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build check
npm run lint
```

- [ ] All tests pass
- [ ] No lint errors
- [ ] Build succeeds

## Deploy (1 min)

```bash
# Deploy to production
npm run deploy:prod
```

- [ ] Deployment successful
- [ ] No errors in logs

## Post-Deployment Verification (2 min)

```bash
# Get your worker URL from the deploy output
# Should be something like:
# https://relay-server-production.yourdomain.workers.dev

# Test health endpoint
curl https://relay-server-production.yourdomain.workers.dev/api/health

# Should return:
# {"status":"ok","database":"connected"}
```

- [ ] Health endpoint responds
- [ ] Database connection works
- [ ] No 502 Bad Gateway errors

## Monitoring (1 min)

```bash
# View live logs
wrangler tail --env production
```

- [ ] Logs streaming in
- [ ] No database errors
- [ ] No connection timeouts

## Summary

✅ Total time: ~25 minutes

### What You've Done:
1. Created PostgreSQL database on Supabase
2. Configured Wrangler with Cloudflare credentials
3. Set up environment secrets
4. Deployed to Cloudflare Workers
5. Verified production deployment

### Next Steps:
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/alerting
- [ ] Test camera pairing with production URL
- [ ] Load test with viewers
- [ ] Enable auto-scaling in Cloudflare

### Useful Commands:

```bash
# View logs
wrangler tail --env production

# Deploy again
npm run deploy:prod

# Rollback
wrangler rollback --env production

# Update secret
wrangler secret put JWT_SECRET --env production

# Delete worker
wrangler delete --env production
```

### Support:
- Check logs: `wrangler tail --env production`
- Cloudflare docs: https://developers.cloudflare.com/workers/
- See CLOUDFLARE_DEPLOYMENT.md for detailed guide
