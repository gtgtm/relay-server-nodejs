const sequelize = require('../config/database');
const User = require('./User');
const Device = require('./Device');
const StreamingSession = require('./StreamingSession');
const Metric = require('./Metric');
const ActivityLog = require('./ActivityLog');

// Define associations
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

Device.hasMany(StreamingSession, { foreignKey: 'cameraDeviceId', as: 'sessions' });
StreamingSession.belongsTo(Device, { foreignKey: 'cameraDeviceId', as: 'camera' });

Device.hasMany(Metric, { foreignKey: 'deviceId', as: 'metrics' });
Metric.belongsTo(Device, { foreignKey: 'deviceId' });

User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });

Device.hasMany(ActivityLog, { foreignKey: 'deviceId', as: 'logs' });
ActivityLog.belongsTo(Device, { foreignKey: 'deviceId' });

module.exports = {
  sequelize,
  User,
  Device,
  StreamingSession,
  Metric,
  ActivityLog,
};
