module.exports = {
  up: async (sequelize, Sequelize) => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        device_id CHAR(36) NOT NULL,
        metric_type VARCHAR(255) NOT NULL,
        value FLOAT NOT NULL,
        unit VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`CREATE INDEX idx_metrics_device_id ON metrics(device_id)`);
    await sequelize.query(`CREATE INDEX idx_metrics_timestamp ON metrics(timestamp)`);
    await sequelize.query(`CREATE INDEX idx_metrics_type ON metrics(metric_type)`);
  },

  down: async (sequelize, Sequelize) => {
    await sequelize.query('DROP TABLE IF EXISTS metrics');
  },
};
