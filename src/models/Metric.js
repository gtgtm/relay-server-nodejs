const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Metric = sequelize.define(
  'Metric',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id',
      },
    },
    metricType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of metric: bandwidth, latency, frames_per_sec, etc',
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Unit of measurement (Mbps, ms, fps, etc)',
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'metrics',
    timestamps: false,
  },
);

module.exports = Metric;
