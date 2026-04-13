const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const constants = require('../config/constants');
const logger = require('../config/logger');
const { success, error } = require('../utils/response');
const { authenticateJWT } = require('../middleware/jwtMiddleware');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * Generate JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, constants.JWT_SECRET, {
    expiresIn: constants.JWT_EXPIRY,
  });
}

/**
 * POST /api/auth/register
 * Create new user account
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { error: validationError, value } = registerSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json(error(validationError.message, 400));
    }

    const { email, password, name } = value;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json(error('Email already registered', 409));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: 'user',
    });

    logger.info(`User registered: ${user.id}`);

    // Generate token
    const token = generateToken(user);

    res.status(201).json(
      success(
        {
          user: user.toJSON(),
          token,
        },
        201,
        'Registration successful',
      ),
    );
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json(error('Registration failed', 500));
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { error: validationError, value } = loginSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json(error(validationError.message, 400));
    }

    const { email, password } = value;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json(error('Invalid email or password', 401));
    }

    // Check password
    if (!user.comparePassword(password)) {
      return res.status(401).json(error('Invalid email or password', 401));
    }

    // Check if active
    if (!user.isActive) {
      return res.status(403).json(error('Account is disabled', 403));
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    logger.info(`User logged in: ${user.id}`);

    // Generate token
    const token = generateToken(user);

    res.json(
      success(
        {
          user: user.toJSON(),
          token,
        },
        200,
        'Login successful',
      ),
    );
  } catch (err) {
    logger.error('Login error:', err.message);
    logger.error('Stack:', err.stack);
    res.status(500).json(error(`Login failed: ${err.message}`, 500));
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/auth/refresh', authenticateJWT, async (req, res) => {
  try {
    // Get fresh user data
    const user = await User.findByPk(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json(error('User not found or inactive', 401));
    }

    // Generate new token
    const token = generateToken(user);

    logger.info(`Token refreshed for user: ${user.id}`);

    res.json(success({ token }, 200, 'Token refreshed'));
  } catch (err) {
    logger.error('Token refresh error:', err);
    res.status(500).json(error('Token refresh failed', 500));
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/auth/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json(error('User not found', 404));
    }

    res.json(success(user.toJSON()));
  } catch (err) {
    logger.error('Get user error:', err);
    res.status(500).json(error('Failed to fetch user', 500));
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client should discard token)
 */
router.post('/auth/logout', authenticateJWT, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.id}`);
    res.json(success(null, 200, 'Logout successful'));
  } catch (err) {
    logger.error('Logout error:', err);
    res.status(500).json(error('Logout failed', 500));
  }
});

module.exports = router;
