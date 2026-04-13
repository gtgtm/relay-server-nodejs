module.exports = {
  up: async (sequelize, Sequelize) => {
    // MySQL: ENUM is defined inline in the column definition
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS streaming_sessions (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        camera_device_id CHAR(36) NOT NULL,
        viewer_device_id CHAR(36) NULL,
        status ENUM('active', 'stopped', 'error') DEFAULT 'active',
        frame_count INT DEFAULT 0,
        audio_chunks_count INT DEFAULT 0,
        total_bytes_transferred BIGINT DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (camera_device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (viewer_device_id) REFERENCES devices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`CREATE INDEX idx_sessions_camera_device ON streaming_sessions(camera_device_id)`);
    await sequelize.query(`CREATE INDEX idx_sessions_viewer_device ON streaming_sessions(viewer_device_id)`);
    await sequelize.query(`CREATE INDEX idx_sessions_status ON streaming_sessions(status)`);
  },

  down: async (sequelize, Sequelize) => {
    await sequelize.query('DROP TABLE IF EXISTS streaming_sessions');
  },
};
