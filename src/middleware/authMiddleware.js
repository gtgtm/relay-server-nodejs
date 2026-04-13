const constants = require('../config/constants');
const logger = require('../config/logger');

/**
 * Legacy token authentication (for iOS app compatibility)
 * Checks X-Auth-Token header or token query parameter
 */
function authenticateLegacyToken(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;

  if (!token || token !== constants.AUTH_TOKEN) {
    logger.warn(`Unauthorized request from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}

module.exports = {
  authenticateLegacyToken,
  errorHandler,
  requestLogger,
};
