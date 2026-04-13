// Validate required environment variables at startup
const validateRequired = (name, value) => {
  if (!value) {
    console.error(`ERROR: ${name} environment variable is required`);
    console.error(`Set ${name}=<value> and restart the server`);
    process.exit(1);
  }
  return value;
};

module.exports = {
  // Authentication
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'alfred_baby_monitor_2026',
  JWT_SECRET: validateRequired('JWT_SECRET', process.env.JWT_SECRET),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',

  // File Upload Limits
  MAX_FRAME_SIZE: parseInt(process.env.MAX_FRAME_SIZE || '2097152'), // 2MB
  MAX_AUDIO_CHUNK_SIZE: parseInt(process.env.MAX_AUDIO_CHUNK_SIZE || '131072'), // 128KB
  AUDIO_BUFFER_SIZE: parseInt(process.env.AUDIO_BUFFER_SIZE || '20'),

  // Device Management
  CAMERA_TIMEOUT: parseInt(process.env.CAMERA_TIMEOUT || '120'), // seconds
  HEARTBEAT_INTERVAL: 30, // seconds

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // App URL
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  // User Roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
  },

  // Device Roles
  DEVICE_ROLES: {
    CAMERA: 'camera',
    VIEWER: 'viewer',
  },

  // Stream Status
  STREAM_STATUS: {
    ACTIVE: 'active',
    STOPPED: 'stopped',
    ERROR: 'error',
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
};
