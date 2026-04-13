require('dotenv').config();

const sequelize = require('../config/database');
const logger = require('../config/logger');
const migrations = [
  require('./001-create-users'),
  require('./002-create-devices'),
  require('./003-create-streaming-sessions'),
  require('./004-create-metrics'),
  require('./005-create-activity-logs'),
  require('./006-add-last-heartbeat-to-devices'),
];

async function runMigrations() {
  try {
    logger.info('Starting migrations...');

    for (const migration of migrations) {
      logger.info(`Running migration: ${migration.up.name}`);
      await migration.up(sequelize, require('sequelize'));
    }

    logger.info('Migrations completed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
