module.exports = {
  up: async (sequelize, Sequelize) => {
    // MySQL: ENUM is defined inline in the column definition
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        camera_id VARCHAR(8) NOT NULL UNIQUE,
        user_id CHAR(36) NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'Baby Camera',
        role ENUM('camera', 'viewer') NOT NULL,
        is_active BOOLEAN DEFAULT true,
        stream_active BOOLEAN DEFAULT false,
        last_seen_at TIMESTAMP NULL,
        last_heartbeat_at TIMESTAMP NULL,
        device_type VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`CREATE INDEX idx_devices_user_id ON devices(user_id)`);
    await sequelize.query(`CREATE INDEX idx_devices_camera_id ON devices(camera_id)`);
    await sequelize.query(`CREATE INDEX idx_devices_role ON devices(role)`);
  },

  down: async (sequelize, Sequelize) => {
    await sequelize.query('DROP TABLE IF EXISTS devices');
  },
};
