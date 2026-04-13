const express = require('express');
const router = express.Router();
const StreamService = require('../services/StreamService');
const { Device } = require('../models');
const constants = require('../config/constants');
const logger = require('../config/logger');
const { authenticateLegacyToken } = require('../middleware/authMiddleware');

/**
 * POST /api/camera/register
 * Register a camera device (iOS app)
 */
router.post('/camera/register', authenticateLegacyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { cameraId } = await StreamService.registerCamera(name || 'Baby Camera');

    // Create device record in database
    const device = await Device.create({
      cameraId,
      userId: null, // Legacy - no user auth
      name: name || 'Baby Camera',
      role: 'camera',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ cameraId });
  } catch (error) {
    logger.error('Camera registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/cameras
 * List all cameras
 */
router.get('/cameras', authenticateLegacyToken, async (req, res) => {
  try {
    // Clean stale cameras before listing
    await StreamService.cleanStaleCameras();

    const cameras = await StreamService.getCameras();
    res.json({ cameras });
  } catch (error) {
    logger.error('Get cameras error:', error);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

/**
 * POST /api/camera/:cameraId/status
 * Update camera streaming status
 */
router.post('/camera/:cameraId/status', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { streaming } = req.body;

    const result = await StreamService.updateStreamStatus(cameraId, streaming);
    res.json(result);
  } catch (error) {
    logger.error('Update status error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/camera/:cameraId/frame
 * Push frame from camera (raw JPEG)
 */
router.post('/camera/:cameraId/frame', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;

    // Body is raw JPEG data
    const frameData = req.body;

    const result = await StreamService.pushFrame(cameraId, frameData);
    res.json(result);
  } catch (error) {
    logger.error('Frame push error:', error);

    if (error.message.includes('exceeds')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stream/:cameraId
 * MJPEG stream for viewers (HTTP streaming)
 */
router.get('/stream/:cameraId', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;

    // Verify camera exists and is streaming
    const device = await Device.findOne({ where: { cameraId } });

    if (!device || !device.streamActive) {
      return res.status(404).json({ error: 'Camera not streaming' });
    }

    // Disable compression
    req.connection.setNoDelay(true);

    // Set MJPEG headers
    const boundary = 'alfred_relay_boundary';
    res.setHeader('Content-Type', `multipart/x-mixed-replace; boundary=${boundary}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');

    let lastModTime = 0;
    let loopCount = 0;
    let isConnected = true;

    // Check if client disconnects
    req.on('close', () => {
      isConnected = false;
    });

    const streamInterval = setInterval(async () => {
      if (!isConnected) {
        clearInterval(streamInterval);
        res.end();
        return;
      }

      try {
        const frame = StreamService.getFrame(cameraId);

        if (frame && frame.modTime > lastModTime) {
          const part = `--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.data.length}\r\n\r\n`;
          res.write(part);
          res.write(frame.data);
          res.write('\r\n');
          lastModTime = frame.modTime;
        }

        // Check camera status every 30 loops
        loopCount++;
        if (loopCount % 30 === 0) {
          const cam = await Device.findOne({ where: { cameraId } });
          if (!cam || !cam.streamActive) {
            isConnected = false;
            clearInterval(streamInterval);
            res.end();
          }
        }
      } catch (error) {
        logger.error('Stream error:', error);
        clearInterval(streamInterval);
        res.end();
      }
    }, 100); // 10 FPS poll interval
  } catch (error) {
    logger.error('Stream setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/snapshot/:cameraId
 * Get single frame snapshot
 */
router.get('/snapshot/:cameraId', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;

    const frame = StreamService.getFrame(cameraId);

    if (!frame) {
      return res.status(404).json({ error: 'No frame available' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(frame.data);
  } catch (error) {
    logger.error('Snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/camera/:cameraId
 * Delete/unregister camera
 */
router.delete('/camera/:cameraId', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;

    const result = await StreamService.deleteCamera(cameraId);
    res.json(result);
  } catch (error) {
    logger.error('Delete camera error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/camera/:cameraId/audio
 * Push audio from camera
 */
router.post('/camera/:cameraId/audio', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const audioData = req.body;

    const result = await StreamService.pushAudio(cameraId, audioData, 'cam');
    res.json(result);
  } catch (error) {
    logger.error('Audio push error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stream/:cameraId/audio
 * Poll for camera audio (viewer polls for baby sounds)
 */
router.get('/stream/:cameraId/audio', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const sinceIndex = parseInt(req.query.since || '-1');

    const result = StreamService.getAudio(cameraId, sinceIndex, 'cam');
    res.json(result);
  } catch (error) {
    logger.error('Audio poll error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/camera/:cameraId/talkback
 * Push talkback audio from viewer
 */
router.post('/camera/:cameraId/talkback', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const audioData = req.body;

    const result = await StreamService.pushAudio(cameraId, audioData, 'talk');
    res.json(result);
  } catch (error) {
    logger.error('Talkback push error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/camera/:cameraId/talkback/poll
 * Poll for talkback audio (camera polls for viewer audio)
 */
router.get('/camera/:cameraId/talkback/poll', authenticateLegacyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const sinceIndex = parseInt(req.query.since || '-1');

    const result = StreamService.getAudio(cameraId, sinceIndex, 'talk');
    res.json(result);
  } catch (error) {
    logger.error('Talkback poll error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints for backward compatibility
router.post('/camera/:cameraId/start', authenticateLegacyToken, async (req, res) => {
  res.json({ status: 'streaming' });
});

router.post('/camera/:cameraId/stop', authenticateLegacyToken, async (req, res) => {
  res.json({ status: 'stopped' });
});

module.exports = router;
