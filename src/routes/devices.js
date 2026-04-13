const express = require('express');
const { Device } = require('../models');
const logger = require('../config/logger');
const { success, error, paginated } = require('../utils/response');
const { authenticateJWT } = require('../middleware/jwtMiddleware');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation schemas
const registerDeviceSchema = Joi.object({
  name: Joi.string().required(),
  role: Joi.string().valid('camera', 'viewer').required(),
  deviceType: Joi.string().optional(),
});

const updateDeviceSchema = Joi.object({
  name: Joi.string().optional(),
  streamActive: Joi.boolean().optional(),
});

/**
 * POST /api/devices/register
 * Register new device
 */
router.post('/devices/register', authenticateJWT, async (req, res) => {
  try {
    const { error: validationError, value } = registerDeviceSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json(error(validationError.message, 400));
    }

    const { name, role, deviceType } = value;

    // Generate camera ID (8-char hex)
    const cameraId = uuidv4().substr(0, 8);

    const device = await Device.create({
      cameraId,
      userId: req.user.id,
      name,
      role,
      deviceType: deviceType || 'unknown',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      streamActive: false,
    });

    logger.info(`Device registered: ${cameraId} for user ${req.user.id}`);

    res.status(201).json(success(device.toJSON(), 201, 'Device registered successfully'));
  } catch (err) {
    logger.error('Device registration error:', err);
    res.status(500).json(error('Device registration failed', 500));
  }
});

/**
 * GET /api/devices
 * List user's devices with pagination
 */
router.get('/devices', authenticateJWT, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await Device.findAndCountAll({
      where: { userId: req.user.id },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Retrieved ${rows.length} devices for user ${req.user.id}`);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    logger.error('Get devices error:', err);
    res.status(500).json(error('Failed to fetch devices', 500));
  }
});

/**
 * GET /api/devices/:id
 * Get device details
 */
router.get('/devices/:id', authenticateJWT, async (req, res) => {
  try {
    const device = await Device.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!device) {
      return res.status(404).json(error('Device not found', 404));
    }

    res.json(success(device.toJSON()));
  } catch (err) {
    logger.error('Get device error:', err);
    res.status(500).json(error('Failed to fetch device', 500));
  }
});

/**
 * PUT /api/devices/:id
 * Update device
 */
router.put('/devices/:id', authenticateJWT, async (req, res) => {
  try {
    const { error: validationError, value } = updateDeviceSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json(error(validationError.message, 400));
    }

    const device = await Device.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!device) {
      return res.status(404).json(error('Device not found', 404));
    }

    await device.update(value);

    logger.info(`Device updated: ${req.params.id}`);

    res.json(success(device.toJSON(), 200, 'Device updated successfully'));
  } catch (err) {
    logger.error('Update device error:', err);
    res.status(500).json(error('Failed to update device', 500));
  }
});

/**
 * DELETE /api/devices/:id
 * Delete device
 */
router.delete('/devices/:id', authenticateJWT, async (req, res) => {
  try {
    const device = await Device.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!device) {
      return res.status(404).json(error('Device not found', 404));
    }

    await device.destroy();

    logger.info(`Device deleted: ${req.params.id}`);

    res.json(success(null, 200, 'Device deleted successfully'));
  } catch (err) {
    logger.error('Delete device error:', err);
    res.status(500).json(error('Failed to delete device', 500));
  }
});

/**
 * POST /api/devices/:id/heartbeat
 * Send heartbeat to keep device alive
 */
router.post('/devices/:id/heartbeat', authenticateJWT, async (req, res) => {
  try {
    const device = await Device.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!device) {
      return res.status(404).json(error('Device not found', 404));
    }

    // Update last heartbeat timestamp
    await device.update({
      lastHeartbeatAt: new Date(),
    });

    logger.debug(`Heartbeat received from device ${req.params.id}`);

    res.json(success({ lastHeartbeat: device.lastHeartbeatAt }));
  } catch (err) {
    logger.error('Heartbeat error:', err);
    res.status(500).json(error('Heartbeat failed', 500));
  }
});

module.exports = router;
