const jwt = require('jsonwebtoken');
const constants = require('../config/constants');
const logger = require('../config/logger');

/**
 * JWT Authentication Middleware
 * Validates Bearer token in Authorization header
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Unauthorized request (missing JWT) from ${req.ip}`);
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid JWT token',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, constants.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Invalid JWT from ${req.ip}: ${error.message}`);
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or malformed token',
    });
  }
}

/**
 * Optional JWT Authentication (allows both JWT and legacy tokens)
 * Used for backward compatibility with legacy token authentication
 */
function authenticateJWTOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, constants.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      logger.warn(`Invalid JWT from ${req.ip}: ${error.message}`);
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  }

  // Continue without user context
  next();
}

/**
 * Admin Role Check (requires authenticateJWT first)
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    logger.warn(`Admin access denied: no user context from ${req.ip}`);
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Admin access denied for user ${req.user.id} from ${req.ip}`);
    return res.status(403).json({
      status: 403,
      error: 'Forbidden',
      message: 'Admin privileges required',
    });
  }

  next();
}

module.exports = {
  authenticateJWT,
  authenticateJWTOptional,
  requireAdmin,
};
