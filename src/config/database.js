const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * MySQL/Sequelize Configuration
 * Supports both development and production environments
 * Production uses SSL for Render MySQL deployments
 */
const sequelize = new Sequelize({
  // MySQL dialect with mysql2 driver
  dialect: 'mysql',
  
  // Connection settings from environment variables
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'alfred_relay_dev',
  username: process.env.DB_USER || 'alfred_relay_user',
  password: process.env.DB_PASSWORD || 'Newd@123',
  
  // Logging
  logging: (sql) => logger.debug(sql),
  
  // Connection pool configuration
  // Render free tier limit: max 3 connections
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '3'),      // Maximum connections in pool
    min: 0,                                              // Minimum connections (0 for free tier)
    acquire: 30000,                                      // Timeout acquiring connection (ms)
    idle: 10000,                                         // Connection idle timeout (ms)
  },
  
  // Default model options
  define: {
    timestamps: true,                                    // Add createdAt, updatedAt
    underscored: true,                                   // Use snake_case column names
  },
  
  // MySQL-specific dialect options
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false,                         // For Render/cloud MySQL with self-signed certs
    } : false,
  },
});

module.exports = sequelize;
