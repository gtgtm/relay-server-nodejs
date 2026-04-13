module.exports = {
  up: async (sequelize, Sequelize) => {
    // Add last_heartbeat_at column if it doesn't exist
    // MySQL doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN, so we use IGNORE to suppress errors
    try {
      await sequelize.query(`
        ALTER TABLE devices
        ADD COLUMN last_heartbeat_at TIMESTAMP NULL
      `);
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }
  },

  down: async (sequelize, Sequelize) => {
    try {
      await sequelize.query(`
        ALTER TABLE devices
        DROP COLUMN last_heartbeat_at
      `);
    } catch (error) {
      // Column doesn't exist, ignore error
      if (!error.message.includes("check that column exists")) {
        throw error;
      }
    }
  },
};
