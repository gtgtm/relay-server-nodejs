const express = require('express');
const { User, Device, StreamingSession, ActivityLog } = require('../models');
const logger = require('../config/logger');
const { success, error, paginated } = require('../utils/response');
const { authenticateJWT, requireAdmin } = require('../middleware/jwtMiddleware');
const Sequelize = require('sequelize');

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Admin dashboard with KPIs
 */
router.get('/admin/dashboard', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalDevices, activeStreams, recentLogs] = await Promise.all([
      User.count(),
      Device.count(),
      Device.count({ where: { streamActive: true } }),
      ActivityLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    logger.info(`Dashboard accessed by admin ${req.user.id}`);

    res.json(
      success({
        stats: {
          totalUsers,
          totalDevices,
          activeStreams,
        },
        recentActivity: recentLogs,
      }),
    );
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json(error('Failed to load dashboard', 500));
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      attributes: {
        exclude: ['password'],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Admin accessed users list (${rows.length} items)`);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    logger.error('Get users error:', err);
    res.status(500).json(error('Failed to fetch users', 500));
  }
});

/**
 * GET /api/admin/devices
 * List all devices with pagination
 */
router.get('/admin/devices', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await Device.findAndCountAll({
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'name'],
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Admin accessed devices list (${rows.length} items)`);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    logger.error('Get devices error:', err);
    res.status(500).json(error('Failed to fetch devices', 500));
  }
});

/**
 * GET /api/admin/sessions
 * List active streaming sessions
 */
router.get('/admin/sessions', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await StreamingSession.findAndCountAll({
      include: [
        {
          model: Device,
          as: 'camera',
          attributes: ['id', 'name', 'role'],
        },
      ],
      where: {
        endedAt: null,
      },
      limit,
      offset,
      order: [['startedAt', 'DESC']],
    });

    logger.info(`Admin accessed sessions list (${rows.length} active)`);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    logger.error('Get sessions error:', err);
    res.status(500).json(error('Failed to fetch sessions', 500));
  }
});

/**
 * GET /api/admin/logs
 * List activity logs
 */
router.get('/admin/logs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const offset = (page - 1) * limit;
    const action = req.query.action || null;

    const where = action ? { action } : {};

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Admin accessed logs (${rows.length} entries)`);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    logger.error('Get logs error:', err);
    res.status(500).json(error('Failed to fetch logs', 500));
  }
});

/**
 * GET /api/admin/alerts
 * List system alerts and warnings
 */
router.get('/admin/alerts', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const alerts = [];

    // Check for inactive users
    const inactiveUsers = await User.count({
      where: {
        lastLoginAt: {
          [Sequelize.Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (inactiveUsers > 0) {
      alerts.push({
        id: 'inactive_users',
        level: 'info',
        message: `${inactiveUsers} users have not logged in for 30 days`,
      });
    }

    // Check for inactive devices
    const inactiveDevices = await Device.count({
      where: {
        lastHeartbeatAt: {
          [Sequelize.Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (inactiveDevices > 0) {
      alerts.push({
        id: 'inactive_devices',
        level: 'warning',
        message: `${inactiveDevices} devices have not sent heartbeat in 24 hours`,
      });
    }

    logger.info(`Admin accessed alerts (${alerts.length} alerts)`);

    res.json(success(alerts));
  } catch (err) {
    logger.error('Get alerts error:', err);
    res.status(500).json(error('Failed to fetch alerts', 500));
  }
});

/**
 * GET /api/admin/user/:userId/devices
 * Get devices belonging to specific user
 */
router.get('/admin/user/:userId/devices', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']],
    });

    res.json(success(devices));
  } catch (err) {
    logger.error('Get user devices error:', err);
    res.status(500).json(error('Failed to fetch user devices', 500));
  }
});

/**
 * POST /api/admin/user/:userId/disable
 * Disable user account
 */
router.post('/admin/user/:userId/disable', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json(error('User not found', 404));
    }

    await user.update({ isActive: false });

    logger.warn(`Admin ${req.user.id} disabled user ${user.id}`);

    res.json(success(user.toJSON(), 200, 'User disabled'));
  } catch (err) {
    logger.error('Disable user error:', err);
    res.status(500).json(error('Failed to disable user', 500));
  }
});

/**
 * POST /api/admin/user/:userId/enable
 * Enable user account
 */
router.post('/admin/user/:userId/enable', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json(error('User not found', 404));
    }

    await user.update({ isActive: true });

    logger.info(`Admin ${req.user.id} enabled user ${user.id}`);

    res.json(success(user.toJSON(), 200, 'User enabled'));
  } catch (err) {
    logger.error('Enable user error:', err);
    res.status(500).json(error('Failed to enable user', 500));
  }
});

module.exports = router;
