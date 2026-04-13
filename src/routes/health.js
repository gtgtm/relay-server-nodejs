const express = require('express');
const router = express.Router();
const { Device } = require('../models');

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const cameraCount = await Device.count({ where: { role: 'camera' } });
    res.json({
      status: 'ok',
      cameras: cameraCount,
      node_version: process.version,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router;
