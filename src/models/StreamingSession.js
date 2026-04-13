const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StreamingSession = sequelize.define(
  'StreamingSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cameraDeviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id',
      },
      comment: 'Camera device sending the stream',
    },
    viewerDeviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'devices',
        key: 'id',
      },
      comment: 'Viewer device receiving stream (optional for broadcast)',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'stopped', 'error']],
      },
    },
    frameCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of frames transmitted',
    },
    audioChunksCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of audio chunks transmitted',
    },
    totalBytesTransferred: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'streaming_sessions',
    timestamps: true,
  },
);

module.exports = StreamingSession;
