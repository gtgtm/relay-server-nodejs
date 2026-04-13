# PostgreSQL to MySQL Migration Summary

## Date
April 9, 2026

## Changes Made

### 1. Package Dependencies (`package.json`)

**Removed:**
- `pg` (^8.11.3) - PostgreSQL driver
- `pg-hstore` (^2.3.4) - PostgreSQL JSON type support

**Added:**
- `mysql2` (^3.20.0) - MySQL driver with Promise support

```bash
# Install changes
npm install
```

### 2. Database Configuration (`src/config/database.js`)

**Dialect Change:**
- ✅ Already configured as `dialect: 'mysql'`
- ✅ Port correctly set to 3306 (MySQL default)
- ✅ Connection pooling: max 3 (Render free tier compatible)

**SSL Configuration:**
- ✅ Automatically enabled in production (`NODE_ENV=production`)
- ✅ Uses `rejectUnauthorized: false` for cloud MySQL providers (Render, AWS RDS, etc.)

**Pool Settings:**
```javascript
pool: {
  max: 3,        // Render free tier limit
  min: 0,        // No minimum for free tier
  acquire: 30000,// 30 second timeout
  idle: 10000,   // 10 second idle timeout
}
```

### 3. Environment Configuration

#### `.env` (Development)
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=alfred_relay_user
DB_PASSWORD=Newd@123
DB_NAME=alfred_relay_dev
DB_POOL_MAX=3
```

#### `.env.example` (Template)
- Updated port from 5432 → 3306
- Added `DB_POOL_MAX` configuration

#### `.env.render` (Production)
- Updated for MySQL on Render
- Updated port from 5432 → 3306
- Added setup instructions for MySQL on Render
- Added notes about SSL and pool limits

### 4. Constants (`src/config/constants.js`)

✅ No changes needed - database-specific constants already abstracted into `database.js`

## Compatibility

### Sequelize
- Current version: `^6.35.2`
- ✅ Compatible with mysql2
- ✅ No breaking changes to models or migrations

### Connection String Format
- PostgreSQL: `postgresql://user:password@host:5432/dbname`
- MySQL: `mysql://user:password@host:3306/dbname`

### Differences to Note
| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| SERIAL type | ✅ Native | Sequelize handles auto-increment |
| UUID type | ✅ Native | Converted to CHAR(36) |
| JSON/JSONB | ✅ Native | JSON support available |
| Connection pooling | ✅ Same | ✅ Same implementation |
| SSL | ✅ Supported | ✅ Supported (required on Render) |

## Migration Steps

### Local Development
1. Install MySQL server locally (or use Docker)
2. Create database: `CREATE DATABASE alfred_relay_dev;`
3. Create user:
   ```sql
   CREATE USER 'alfred_relay_user'@'localhost' IDENTIFIED BY 'Newd@123';
   GRANT ALL PRIVILEGES ON alfred_relay_dev.* TO 'alfred_relay_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. Run migrations: `npm run migrate`
5. Seed database: `npm run seed`
6. Start server: `npm run dev`

### Production (Render)
1. Create a MySQL database service on Render
2. Update `.env.render` with connection details from Render
3. Set environment variables in Render dashboard
4. Migrations run automatically: `npm run migrate` (via buildCommand)
5. Deploy the service

## Testing

### Quick Connection Test
```bash
npm run dev
# Look for: "Connected to database"
```

### Full Test Suite
```bash
npm test
```

## Rollback Plan

If needed to revert to PostgreSQL:
1. Reinstall `pg` and `pg-hstore`
2. Change `dialect: 'mysql'` → `dialect: 'postgres'`
3. Update `DB_PORT` to 5432
4. Restore PostgreSQL database

## Notes

- Sequelize Migrations: No changes needed - Sequelize abstracts the dialect
- Model definitions: No changes needed - mysql2 supports same interface as pg
- Connection pooling: Identical configuration works for both
- SSL: Implementation matches both databases

## References

- [Sequelize MySQL Documentation](https://sequelize.org/docs/v6/getting-started/)
- [mysql2 GitHub](https://github.com/sidorares/node-mysql2)
- [Render MySQL Setup](https://render.com/docs/deploy-mysql)
