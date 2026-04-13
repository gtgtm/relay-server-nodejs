const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define(
  'Device',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Legacy support: camera ID from PHP server (8-char hex)
    cameraId: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
      comment: 'Legacy camera ID for backward compatibility',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'User ID - nullable for legacy camera registration',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Baby Camera',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['camera', 'viewer']],
      },
      comment: 'Device role: camera (streaming) or viewer (receiving)',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    streamActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the device is currently streaming',
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last heartbeat timestamp',
    },
    lastHeartbeatAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last heartbeat timestamp from device',
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Device type (iOS, Android, etc)',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Device metadata (OS version, app version, etc)',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'devices',
    timestamps: true,
  },
);

module.exports = Device;
