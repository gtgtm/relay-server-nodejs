const express = require('express');
const { Device } = require('../models');
const StreamService = require('../services/StreamService');
const logger = require('../config/logger');
const { success, error } = require('../utils/response');
const { authenticateJWT, authenticateJWTOptional } = require('../middleware/jwtMiddleware');
const { authenticateLegacyToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Combine JWT and legacy token authentication for backward compatibility
 */
function authenticateStream(req, res, next) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwtMiddleware = authenticateJWT;
    return jwtMiddleware(req, res, next);
  }

  // Fall back to legacy token
  authenticateLegacyToken(req, res, next);
}

/**
 * POST /api/stream/:cameraId/frame
 * Upload video frame from camera
 */
router.post('/stream/:cameraId/frame', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;

    // Body is raw JPEG data
    const frameData = req.body;

    if (!frameData || frameData.length === 0) {
      return res.status(400).json(error('Frame data is empty', 400));
    }

    const result = await StreamService.pushFrame(cameraId, frameData);

    logger.info(`Frame pushed for camera ${cameraId}`);

    res.json(success({ cameraId, frameSize: frameData.length }));
  } catch (err) {
    logger.error('Frame push error:', err);

    if (err.message.includes('exceeds')) {
      return res.status(400).json(error(err.message, 400));
    }

    res.status(500).json(error(err.message, 500));
  }
});

/**
 * GET /api/stream/:cameraId
 * MJPEG stream for viewers (HTTP multipart streaming)
 */
router.get('/stream/:cameraId', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;

    // Verify camera exists and is streaming
    const device = await Device.findOne({ where: { cameraId } });

    if (!device || !device.streamActive) {
      return res.status(404).json(error('Camera not streaming', 404));
    }

    // Disable compression for streaming
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

    // Track client disconnection
    req.on('close', () => {
      isConnected = false;
      clearInterval(streamInterval);
    });

    logger.info(`Stream started for camera ${cameraId}`);

    // Stream loop - send frames at ~10 FPS
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

        // Verify camera status periodically
        loopCount++;
        if (loopCount % 30 === 0) {
          const cam = await Device.findOne({ where: { cameraId } });
          if (!cam || !cam.streamActive) {
            isConnected = false;
            clearInterval(streamInterval);
            res.end();
            logger.info(`Stream ended for camera ${cameraId}`);
          }
        }
      } catch (streamErr) {
        logger.error('Stream error:', streamErr);
        clearInterval(streamInterval);
        res.end();
      }
    }, 100);
  } catch (err) {
    logger.error('Stream setup error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * GET /api/stream/:cameraId/snapshot
 * Get single frame snapshot
 */
router.get('/stream/:cameraId/snapshot', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;

    const frame = StreamService.getFrame(cameraId);

    if (!frame) {
      return res.status(404).json(error('No frame available', 404));
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(frame.data);
  } catch (err) {
    logger.error('Snapshot error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * POST /api/stream/:cameraId/audio
 * Upload audio from camera
 */
router.post('/stream/:cameraId/audio', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const audioData = req.body;

    if (!audioData || audioData.length === 0) {
      return res.status(400).json(error('Audio data is empty', 400));
    }

    const result = await StreamService.pushAudio(cameraId, audioData, 'cam');

    logger.info(`Audio chunk pushed for camera ${cameraId}`);

    res.json(success({ cameraId, audioSize: audioData.length }));
  } catch (err) {
    logger.error('Audio push error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * GET /api/stream/:cameraId/audio
 * Poll for camera audio
 */
router.get('/stream/:cameraId/audio', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const sinceIndex = parseInt(req.query.since || '-1');

    const result = StreamService.getAudio(cameraId, sinceIndex, 'cam');

    logger.debug(`Audio polled for camera ${cameraId}`);

    res.json(success(result));
  } catch (err) {
    logger.error('Audio poll error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * POST /api/stream/:cameraId/talkback
 * Upload talkback audio from viewer
 */
router.post('/stream/:cameraId/talkback', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const audioData = req.body;

    if (!audioData || audioData.length === 0) {
      return res.status(400).json(error('Audio data is empty', 400));
    }

    const result = await StreamService.pushAudio(cameraId, audioData, 'talk');

    logger.info(`Talkback audio pushed for camera ${cameraId}`);

    res.json(success({ cameraId, audioSize: audioData.length }));
  } catch (err) {
    logger.error('Talkback push error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * GET /api/stream/:cameraId/talkback/poll
 * Poll for talkback audio
 */
router.get('/stream/:cameraId/talkback/poll', authenticateStream, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const sinceIndex = parseInt(req.query.since || '-1');

    const result = StreamService.getAudio(cameraId, sinceIndex, 'talk');

    logger.debug(`Talkback polled for camera ${cameraId}`);

    res.json(success(result));
  } catch (err) {
    logger.error('Talkback poll error:', err);
    res.status(500).json(error(err.message, 500));
  }
});

module.exports = router;
