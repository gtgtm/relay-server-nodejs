# PostgreSQL to MySQL Migration Summary

## Overview
All migrations and models have been converted from PostgreSQL to MySQL syntax.

## Files Modified

### 1. Database Configuration
**File:** `/src/config/database.js`
- Changed dialect from `'postgres'` to `'mysql'`
- Changed default port from `5432` to `3306`

### 2. Package Dependencies
**File:** `package.json`
- Removed: `pg` (^8.11.3), `pg-hstore` (^2.3.4)
- Added: `mysql2` (^3.6.5)
- Install dependencies: `npm install`

### 3. Migration Files

#### `001-create-users.js`
**Changes:**
- Removed PostgreSQL `CREATE TYPE` statement for ENUM
- Changed UUID type from `UUID` to `CHAR(36)` with `DEFAULT (UUID())`
- Changed ENUM from `user_role TYPE` to inline `ENUM('admin', 'user')`
- Added MySQL engine and charset: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
- Added `ON UPDATE CURRENT_TIMESTAMP` to `updated_at`
- Removed `CASCADE` from DROP TABLE (not needed for MySQL)

#### `002-create-devices.js`
**Changes:**
- Removed PostgreSQL `CREATE TYPE` statement
- Changed UUID fields to `CHAR(36)`
- Changed ENUM from `device_role TYPE` to inline `ENUM('camera', 'viewer')`
- Changed JSONB to JSON (MySQL doesn't have JSONB)
- Moved FOREIGN KEY constraint from column to table-level
- Added MySQL engine and charset
- Added `ON UPDATE CURRENT_TIMESTAMP` to `updated_at`

#### `003-create-streaming-sessions.js`
**Changes:**
- Removed PostgreSQL `CREATE TYPE` statement
- Changed UUID fields to `CHAR(36)`
- Changed ENUM from `stream_status TYPE` to inline `ENUM('active', 'stopped', 'error')`
- Changed INTEGER to INT for better MySQL compatibility
- Moved FOREIGN KEY constraints to table-level
- Added MySQL engine and charset
- Added `ON UPDATE CURRENT_TIMESTAMP` to `updated_at`
- Made `ended_at` and `error` explicitly nullable

#### `004-create-metrics.js`
**Changes:**
- Changed UUID to `CHAR(36)`
- Changed JSONB to JSON
- Moved FOREIGN KEY to table-level
- Added MySQL engine and charset

#### `005-create-activity-logs.js`
**Changes:**
- Removed PostgreSQL `CREATE TYPE` statement
- Changed UUID to `CHAR(36)`
- Changed ENUM from `activity_status TYPE` to inline `ENUM('success', 'failure', 'warning')`
- Changed JSONB to JSON
- Moved FOREIGN KEY constraints to table-level
- Added MySQL engine and charset

#### `006-add-last-heartbeat-to-devices.js`
**Changes:**
- Removed PostgreSQL `IF NOT EXISTS` syntax
- Implemented error handling in JavaScript for MySQL compatibility
- Made column explicitly nullable: `TIMESTAMP NULL`

### 4. Model Files

#### `Device.js`
- Changed `metadata` type from `DataTypes.JSONB` to `DataTypes.JSON`

#### `ActivityLog.js`
- Changed `metadata` type from `DataTypes.JSONB` to `DataTypes.JSON`

#### `Metric.js`
- Changed `metadata` type from `DataTypes.JSONB` to `DataTypes.JSON`

#### `User.js`
- No changes needed (already using DataTypes.STRING for role)

#### `StreamingSession.js`
- No changes needed (already using DataTypes.STRING for status)

## Key Differences Between PostgreSQL and MySQL in Migrations

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| ENUM Type | `CREATE TYPE ... AS ENUM` | Inline in column: `ENUM(...)` |
| UUID Type | Native `UUID` | `CHAR(36)` or `VARCHAR(36)` |
| JSON Type | `JSONB` (binary JSON) | `JSON` |
| Foreign Keys | Can be added inline with `REFERENCES` | Better to define as `FOREIGN KEY` constraint |
| Default Timestamp | `DEFAULT CURRENT_TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |
| Auto-update Timestamp | Not automatic | `ON UPDATE CURRENT_TIMESTAMP` |
| BOOLEAN | Native type | `BOOLEAN` (alias for `TINYINT(1)`) |
| Cascade Drops | `CASCADE` keyword | Automatic with `ON DELETE CASCADE` |
| Conditional Column Add | `IF NOT EXISTS` in SQL | Requires error handling in application |
| Engine | Not applicable | Must specify: `ENGINE=InnoDB` |
| Charset | Default to UTF-8 | Should explicitly set: `utf8mb4` with `utf8mb4_unicode_ci` collation |

## Testing the Migrations

```bash
# Install MySQL driver
npm install

# Run migrations
npm run migrate

# Seed database
npm run seed

# Check database
mysql -u alfred_relay_user -p alfred_relay_dev
SHOW TABLES;
DESCRIBE users;
```

## Environment Variables

Update `.env` or configuration:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=alfred_relay_dev
DB_USER=alfred_relay_user
DB_PASSWORD=Newd@123
```

## Compatibility Notes

- **UUID Generation:** Sequelize will automatically use `DataTypes.UUIDV4` to call MySQL's `UUID()` function
- **JSON Handling:** MySQL JSON type is compatible with Sequelize's DataTypes.JSON
- **VARCHAR Length:** MySQL VARCHAR is limited to 65,535 bytes; ensure TEXT is used for large fields
- **Collation:** Using `utf8mb4_unicode_ci` for proper emoji and international character support
- **NULL Values:** All nullable columns must be explicitly marked `NULL` in MySQL

## Rollback to PostgreSQL

If needed, revert these changes:
1. Change dialect back to `'postgres'` in `config/database.js`
2. Change port to `5432`
3. Replace `mysql2` with `pg` and `pg-hstore` in `package.json`
4. Revert migration SQL syntax changes
5. Run migrations again

