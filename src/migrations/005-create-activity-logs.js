module.exports = {
  up: async (sequelize, Sequelize) => {
    // MySQL: ENUM is defined inline in the column definition
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id CHAR(36) NULL,
        device_id CHAR(36) NULL,
        action VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('success', 'failure', 'warning') DEFAULT 'success',
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`CREATE INDEX idx_activity_user ON activity_logs(user_id)`);
    await sequelize.query(`CREATE INDEX idx_activity_device ON activity_logs(device_id)`);
    await sequelize.query(`CREATE INDEX idx_activity_action ON activity_logs(action)`);
    await sequelize.query(`CREATE INDEX idx_activity_created ON activity_logs(created_at)`);
  },

  down: async (sequelize, Sequelize) => {
    await sequelize.query('DROP TABLE IF EXISTS activity_logs');
  },
};
